import { APP_CONFIG, PLAN_FALLBACKS, normalizePlan } from "../config.js";
import { ensureSupabase } from "../supabaseClient.js";
import { getState, setState } from "../state.js";

export function getCurrentPeriod(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export async function loadAccountState() {
  const { user, profile } = getState();
  if (!user) {
    return null;
  }
  if (!profile) {
    setState({ loading: { account: false } });
    return null;
  }

  const client = ensureSupabase();
  const period = getCurrentPeriod();
  setState({ loading: { account: true } });

  const [
    plansResult,
    entitlementResult,
    usageResult,
    paymentsResult
  ] = await Promise.all([
    client.from(APP_CONFIG.tables.plans).select("*").eq("active", true).order("sort_order"),
    client.from(APP_CONFIG.tables.entitlements).select("*").eq("user_id", user.id).maybeSingle(),
    client.from(APP_CONFIG.tables.usagePeriods).select("*").eq("user_id", user.id).eq("period_start", period.start).maybeSingle(),
    client.from(APP_CONFIG.tables.payments).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8)
  ]);

  setState({ loading: { account: false } });

  const error = plansResult.error || entitlementResult.error || usageResult.error || paymentsResult.error;
  if (error) {
    throw error;
  }

  let entitlement = entitlementResult.data;
  if (!entitlement) {
    const { data, error: insertError } = await client
      .from(APP_CONFIG.tables.entitlements)
      .insert({ user_id: user.id, plan_key: "free", status: "active" })
      .select()
      .single();
    if (insertError) {
      throw insertError;
    }
    entitlement = data;
  }

  const plans = plansResult.data?.length ? plansResult.data : Object.values(PLAN_FALLBACKS);
  const plan = normalizePlan(entitlement?.plan_key || "free", plans);
  const usage = usageResult.data || {
    user_id: user.id,
    plan_key: plan.plan_key,
    period_start: period.start,
    period_end: period.end,
    checks_used: 0,
    payg_checks: 0
  };
  const included = Number(plan.included_checks || 0);
  const used = Number(usage.checks_used || 0);
  const payg = Number(usage.payg_checks || 0);
  const checksLeft = Math.max(0, included + payg - used);

  const accountState = {
    plans,
    entitlement: { ...entitlement, plan },
    usage,
    checksLeft,
    billing: {
      status: entitlement?.status || "active",
      customerId: entitlement?.stripe_customer_id || "",
      subscriptionId: entitlement?.stripe_subscription_id || "",
      currentPeriodEnd: entitlement?.current_period_end || null,
      cancelAtPeriodEnd: Boolean(entitlement?.cancel_at_period_end)
    },
    payments: paymentsResult.data || []
  };

  setState(accountState);
  return accountState;
}

export async function updateProfile(patch) {
  const { user } = getState();
  if (!user) {
    throw new Error("Sign in to update account details.");
  }
  const client = ensureSupabase();
  const { data, error } = await client
    .from(APP_CONFIG.tables.profiles)
    .update(patch)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  setState({ profile: data });
  return data;
}
