import { APP_CONFIG } from "./config.js";
import { ensureSupabase, supabase } from "./supabaseClient.js";
import { closeAuth, resetAccountState, setSession, setState, setToast } from "./state.js";

const PENDING_APP_SIGNUP_KEY = "duescope.pendingAppSignup";
const PENDING_APP_SIGNUP_MAX_AGE_MS = 60 * 60 * 1000;
const SIGNUP_VERIFICATION_SENT_NOTICE = "We need to verify this email before continuing. Check your inbox for a secure link to finish creating your DueScope account.";
const SIGNUP_VERIFICATION_FAILED_NOTICE = "We couldn't verify this email right now. Please try again in a moment or contact support if this should work.";

function authRedirectUrl() {
  const configured = String(APP_CONFIG.publicSiteUrl || "").trim();
  const fallback = `${window.location.origin}${window.location.pathname}`;
  const base = (configured || fallback)
    .replace(/[#?].*$/, "")
    .replace(/\/index\.html$/i, "/")
    .replace(/\/?$/, "/");
  return base;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function storePendingAppSignup({ email, fullName, companyName, agreementAcceptedAt }) {
  try {
    window.localStorage.setItem(PENDING_APP_SIGNUP_KEY, JSON.stringify({
      email: normalizeEmail(email),
      fullName: String(fullName || ""),
      companyName: String(companyName || ""),
      agreementAcceptedAt,
      createdAt: Date.now()
    }));
  } catch (_error) {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
}

function clearPendingAppSignup() {
  try {
    window.localStorage.removeItem(PENDING_APP_SIGNUP_KEY);
  } catch (_error) {
    // Best effort only.
  }
}

function readPendingAppSignup(user) {
  let pending;
  try {
    pending = JSON.parse(window.localStorage.getItem(PENDING_APP_SIGNUP_KEY) || "null");
  } catch (_error) {
    clearPendingAppSignup();
    return null;
  }

  if (!pending || !pending.email || !pending.agreementAcceptedAt || !pending.createdAt) {
    return null;
  }
  if (Date.now() - Number(pending.createdAt) > PENDING_APP_SIGNUP_MAX_AGE_MS) {
    clearPendingAppSignup();
    return null;
  }
  if (normalizeEmail(user.email) !== normalizeEmail(pending.email)) {
    return null;
  }

  return {
    fullName: pending.fullName,
    companyName: pending.companyName,
    agreementAcceptedAt: pending.agreementAcceptedAt
  };
}

async function sendSignupVerificationLink(client, { email, fullName, companyName, agreementAcceptedAt }) {
  storePendingAppSignup({ email, fullName, companyName, agreementAcceptedAt });
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: authRedirectUrl()
    }
  });

  if (error) {
    setState({
      authModalOpen: true,
      authMode: "signup",
      authPrefillEmail: email,
      authNotice: SIGNUP_VERIFICATION_FAILED_NOTICE,
      error: null
    });
    return;
  }

  setState({
    authModalOpen: true,
    authMode: "signup",
    authPrefillEmail: email,
    authNotice: SIGNUP_VERIFICATION_SENT_NOTICE,
    error: null
  });
  setToast({ title: "Check your email", message: "Open the secure link to finish DueScope signup." });
}

function authChangeError(error) {
  const message = error?.details?.message || error?.message || "Unable to refresh the signed-in workspace.";
  setState({
    error: message,
    loading: { boot: false, route: false, account: false, auth: false }
  });
}

function looksLikeExistingGlobalUser(error, data) {
  const message = String(error?.message || error?.details?.message || "").toLowerCase();
  return (
    /already.*registered|already.*exists|user.*registered/.test(message) ||
    (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
  );
}

function isActiveAppProfile(profile) {
  return profile?.app_access_status === "active" && Boolean(profile?.agreement_accepted_at);
}

export async function loadSession() {
  const client = ensureSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  setSession(data.session || null);
  if (data.session) {
    await bootstrapProfile(data.session.user);
  }
  return data.session || null;
}

export function onAuthChanged(callback) {
  if (!supabase) {
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") {
      return;
    }
    setSession(session || null);
    window.setTimeout(async () => {
      try {
        if (session?.user) {
          await bootstrapProfile(session.user);
        } else {
          resetAccountState("none");
        }
        await callback(session || null);
      } catch (error) {
        authChangeError(error);
      }
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn({ email, password }) {
  const client = ensureSupabase();
  setState({ loading: { auth: true }, error: null, authNotice: null });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  setState({ loading: { auth: false } });
  if (error) {
    throw error;
  }
  setSession(data.session || null);
  let profile = null;
  if (data.session?.user) {
    profile = await bootstrapProfile(data.session.user);
  }
  closeAuth();
  setToast(profile
    ? { title: "Signed in", message: "Your diligence workspace is ready." }
    : { title: "Signed in", message: "Complete DueScope signup to open this app." });
  return data.session;
}

export async function signUp({ email, password, fullName, companyName, agreementAccepted }) {
  const client = ensureSupabase();
  if (!agreementAccepted) {
    throw new Error("You need to accept the DueScope Service Agreement before creating an account.");
  }
  const normalizedEmail = normalizeEmail(email);
  setState({ loading: { auth: true }, error: null, authNotice: null });
  const acceptedAt = new Date().toISOString();
  storePendingAppSignup({
    email: normalizedEmail,
    fullName,
    companyName,
    agreementAcceptedAt: acceptedAt
  });
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName || "",
        company_name: companyName || "",
        duescope_app_signup_requested: true,
        duescope_service_agreement_accepted: true,
        duescope_service_agreement_accepted_at: acceptedAt
      },
      emailRedirectTo: authRedirectUrl()
    }
  });
  setState({ loading: { auth: false } });
  if (looksLikeExistingGlobalUser(error, data)) {
    setState({ loading: { auth: true }, error: null });
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
    setState({ loading: { auth: false } });
    if (signInError) {
      await sendSignupVerificationLink(client, {
        email: normalizedEmail,
        fullName,
        companyName,
        agreementAcceptedAt: acceptedAt
      });
      return null;
    }
    setSession(signInData.session || null);
    if (signInData.session?.user) {
      await createAppProfile(signInData.session.user, { fullName, companyName, agreementAcceptedAt: acceptedAt });
      closeAuth();
      setToast({ title: "DueScope signup complete", message: "Your app workspace is ready." });
    }
    return signInData.session;
  }
  if (error) {
    clearPendingAppSignup();
    throw error;
  }
  setSession(data.session || null);
  if (data.session?.user) {
    await bootstrapProfile(data.session.user, { createIfMissing: true, fullName, companyName, agreementAcceptedAt: acceptedAt });
    closeAuth();
    setToast({ title: "Account created", message: "Your free DueScope plan is active." });
  } else {
    closeAuth();
    setToast({ title: "Check your email", message: "Confirm your account to finish setup." });
  }
  return data.session;
}

export async function signOut() {
  const client = ensureSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
  resetAccountState("none");
  setSession(null);
  setToast({ title: "Signed out", message: "You can return to DueScope any time." });
}

function buildProfile(user, overrides = {}) {
  const metadata = user.user_metadata || {};
  const acceptedAt = String(overrides.agreementAcceptedAt || metadata.duescope_service_agreement_accepted_at || new Date().toISOString());
  return {
    user_id: user.id,
    email: user.email || "",
    full_name: String(overrides.fullName ?? metadata.full_name ?? metadata.name ?? "").trim(),
    company_name: String(overrides.companyName ?? metadata.company_name ?? "").trim(),
    role: "owner",
    app_access_status: "active",
    agreement_accepted_at: acceptedAt,
    registered_at: acceptedAt
  };
}

async function ensureFreeEntitlement(client, user) {
  const { data: entitlement, error } = await client
    .from(APP_CONFIG.tables.entitlements)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!entitlement) {
    const { error: insertError } = await client.from(APP_CONFIG.tables.entitlements).insert({
      user_id: user.id,
      plan_key: "free",
      status: "active"
    });
    if (insertError) {
      throw insertError;
    }
  }
}

async function createAppProfile(user, overrides = {}) {
  const client = ensureSupabase();
  const profile = buildProfile(user, overrides);

  const { data: savedProfile, error: profileError } = await client
    .from(APP_CONFIG.tables.profiles)
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single();

  if (profileError) {
    throw profileError;
  }

  await ensureFreeEntitlement(client, user);
  clearPendingAppSignup();
  setState({ profile: savedProfile, appAccess: "active" });
  return savedProfile;
}

export async function bootstrapProfile(user, options = {}) {
  const client = ensureSupabase();
  const { data: existingProfile, error: profileError } = await client
    .from(APP_CONFIG.tables.profiles)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (isActiveAppProfile(existingProfile)) {
    await ensureFreeEntitlement(client, user);
    clearPendingAppSignup();
    setState({ profile: existingProfile, appAccess: "active" });
    return existingProfile;
  }

  const pendingSignup = readPendingAppSignup(user);
  if (pendingSignup && existingProfile?.app_access_status !== "revoked") {
    const profile = await createAppProfile(user, pendingSignup);
    setToast({ title: "DueScope signup complete", message: "Your app workspace is ready." });
    return profile;
  }

  if (options.createIfMissing) {
    return createAppProfile(user, options);
  }

  resetAccountState("missing");
  return null;
}

export async function registerAppAccess({ fullName, companyName, agreementAccepted }) {
  if (!agreementAccepted) {
    throw new Error("You need to accept the DueScope Service Agreement before creating app access.");
  }
  const client = ensureSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  const user = data.session?.user;
  if (!user) {
    throw new Error("Sign in before creating app access.");
  }
  setState({ loading: { auth: true }, error: null });
  try {
    return await createAppProfile(user, { fullName, companyName, agreementAcceptedAt: new Date().toISOString() });
  } finally {
    setState({ loading: { auth: false } });
  }
}
