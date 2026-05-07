import { openAuth, closeAuth, getState, setState, setToast, subscribe } from "./state.js";
import { loadSession, onAuthChanged, registerAppAccess, signIn, signOut as doSignOut, signUp } from "./auth.js";
import { loadAccountState, updateProfile } from "./api/entitlements.js";
import {
  createWatchlistItem,
  deleteWatchlistItem,
  loadChecks,
  loadReport,
  loadWatchlist,
  markWatchlistScreened,
  updateWatchlistItem
} from "./api/reports.js";
import { createCheckoutSession, openBillingPortal, reconcileCheckoutSession, runRiskAnalysis } from "./api/edge.js";
import { renderShell, bindShellEvents } from "./shell.js";
import { renderLanding } from "./pages/landing.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderNewCheck, bindNewCheck } from "./pages/newCheck.js";
import { renderReportDetail, bindReportDetail } from "./pages/reportDetail.js";
import { renderHistory, bindHistory } from "./pages/history.js";
import { renderWatchlist, bindWatchlist } from "./pages/watchlist.js";
import { renderPricing, bindPricing } from "./pages/pricing.js";
import { renderAccount, bindAccount } from "./pages/account.js";
import { renderService } from "./pages/service.js";
import { renderAgreement } from "./pages/agreement.js";
import { startRouter, isProtectedRoute, navigate } from "./router.js";
import { errorState, loadingState } from "./components.js";

const app = document.getElementById("app");
const toastRoot = document.getElementById("toast-root");
const ROUTE_LOAD_TIMEOUT_MS = 18000;
let currentRouteKey = "";
let routeLoadId = 0;
let analysisTimer = null;
const reconciledCheckoutSessions = new Set();
let analysisLogId = 0;

function activityTemplates(input) {
  const target = input.targetName || "target";
  const jurisdiction = input.jurisdiction || "the selected jurisdiction";
  const checkType = input.checkType === "pep"
    ? "PEP screening"
    : input.checkType === "country"
      ? "country risk score"
      : `${input.checkType || "vendor"} diligence`;
  return [
    {
      phase: "Request prepared",
      detail: `Starting ${checkType} analysis for ${target}.`
    },
    {
      phase: "Identity context",
      detail: `Building a public-source profile from target name, URL, aliases, and supplied context.`
    },
    {
      phase: "Jurisdiction pass",
      detail: `Checking country, address, jurisdiction, and operating footprint signals for ${jurisdiction}.`
    },
    {
      phase: "Sanctions pass",
      detail: "Checking public sanctions, watchlist, and country-level restriction signals."
    },
    {
      phase: "PEP/state pass",
      detail: "Reviewing public office, state ownership, associates, and family exposure signals."
    },
    {
      phase: "Adverse media pass",
      detail: "Scanning adverse media, litigation, reputation, and source coverage quality."
    },
    {
      phase: "Scorecard assembly",
      detail: "Compiling risk score, category scores, confidence, citations, and recommendation."
    }
  ];
}

function timeLabel() {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function formatElapsed(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function makeActivity(phase, detail) {
  analysisLogId += 1;
  return {
    id: `activity-${analysisLogId}`,
    time: timeLabel(),
    phase,
    detail
  };
}

function appendAnalysisLog(entry) {
  const state = getState();
  setState({ analysisLog: [...(state.analysisLog || []), entry].slice(-12) });
}

function routeKey(route) {
  return `${route.name}:${route.params?.id || ""}`;
}

function routeTimeoutMessage(route) {
  const seconds = Math.round(ROUTE_LOAD_TIMEOUT_MS / 1000);
  const noun = route.name === "report" ? "report" : "workspace data";
  return `Loading ${noun} took longer than ${seconds} seconds. This is usually a slow or interrupted data request; the page is no longer locked, so try the navigation item again or refresh if your connection just recovered.`;
}

async function withTimeout(task, timeoutMs, message) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(task), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

function renderPage(state) {
  if (state.loading.boot) {
    return loadingState("Loading workspace", "Preparing account state.");
  }
  if (state.error) {
    return errorState("Something needs attention", state.error);
  }
  if (state.loading.route) {
    return loadingState("Loading page", "Fetching the latest report data.");
  }

  switch (state.route.name) {
    case "landing":
      return renderLanding(state);
    case "dashboard":
      return renderDashboard(state);
    case "new":
      return renderNewCheck(state);
    case "report":
      return renderReportDetail(state);
    case "history":
      return renderHistory(state);
    case "watchlist":
      return renderWatchlist(state);
    case "service":
      return renderService(state);
    case "agreement":
      return renderAgreement(state);
    case "pricing":
      return renderPricing(state);
    case "account":
      return renderAccount(state);
    default:
      return renderLanding(state);
  }
}

function render() {
  const state = getState();
  app.className = "page-shell";
  app.innerHTML = renderShell(renderPage(state), state);
  toastRoot.innerHTML = "";
  bindShellEvents({
    openAuth,
    closeAuth,
    signOut: handleSignOut,
    authMode: (mode) => setState({ authMode: mode, authNotice: null }),
    submitAuth: handleAuthSubmit,
    registerApp: handleAppRegistrationSubmit,
    newCheck: resetNewCheckWorkspace
  });
  bindPage(state);
}

function bindPage(state) {
  if (state.route.name === "new") {
    bindNewCheck({ onSubmit: handleNewCheck, onTypeChange: handleNewCheckTypeChange });
  }
  if (state.route.name === "report") {
    bindReportDetail({
      onEditSearch: handleReportEditSearch,
      onRescreen: handleReportRescreen,
      onWatchlist: handleReportWatchlist
    });
  }
  if (state.route.name === "history") {
    bindHistory({ onRescreen: handleHistoryRescreen });
  }
  if (state.route.name === "watchlist") {
    bindWatchlist({
      onScreen: handleWatchlistScreen,
      onToggle: handleWatchlistToggle,
      onRemove: handleWatchlistRemove
    });
  }
  if (state.route.name === "pricing") {
    bindPricing({ onCheckout: handleCheckout, onFree: handleFreePlan });
  }
  if (state.route.name === "account") {
    bindAccount({
      onProfile: handleProfileSubmit,
      onBillingPortal: handleBillingPortal
    });
  }
}

async function safeRun(task) {
  try {
    await task();
  } catch (error) {
    const message = error?.details?.message || error?.message || "Unexpected error";
    stopAnalysisWalk();
    setState({ error: message, analysisStep: 0, analysisElapsedSeconds: 0, loading: { boot: false, route: false, account: false, analysis: false, checkout: false, auth: false, watchlist: false } });
  }
}

function startAnalysisWalk(input) {
  stopAnalysisWalk();
  const activities = activityTemplates(input);
  const startedAt = Date.now();
  let waitLogBucket = 0;
  setState({
    analysisStep: 0,
    analysisElapsedSeconds: 0,
    analysisLog: [
      makeActivity(activities[0].phase, activities[0].detail),
      makeActivity(activities[1].phase, activities[1].detail)
    ]
  });
  analysisTimer = window.setInterval(() => {
    const state = getState();
    if (!state.loading.analysis) {
      stopAnalysisWalk();
      return;
    }
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const nextStep = Math.min((state.analysisStep || 0) + 1, 5);
    if (nextStep !== state.analysisStep) {
      const activity = activities[nextStep + 1] || activities[activities.length - 1];
      setState({ analysisStep: nextStep, analysisElapsedSeconds: elapsedSeconds });
      appendAnalysisLog(makeActivity(activity.phase, activity.detail));
      return;
    }

    setState({ analysisElapsedSeconds: elapsedSeconds });
    if (nextStep === 5) {
      const bucket = Math.floor(elapsedSeconds / 12);
      if (bucket > waitLogBucket) {
        waitLogBucket = bucket;
        appendAnalysisLog(makeActivity(
          "Waiting for response",
          `Still waiting for source research and structured scoring to finish (${formatElapsed(elapsedSeconds)} elapsed).`
        ));
      }
    }
  }, 1700);
}

function stopAnalysisWalk() {
  if (analysisTimer) {
    window.clearInterval(analysisTimer);
    analysisTimer = null;
  }
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resetNewCheckWorkspace() {
  stopAnalysisWalk();
  setState({
    newCheckDraft: null,
    analysisStep: 0,
    analysisElapsedSeconds: 0,
    analysisLog: [],
    loading: { analysis: false },
    error: null
  });
}

async function refreshWorkspace() {
  const state = getState();
  if (!state.user || !state.profile) {
    return;
  }
  await Promise.all([
    loadAccountState(),
    loadChecks(state.route.name === "dashboard" ? 8 : 100),
    loadWatchlist()
  ]);
}

async function reconcilePendingCheckoutPayments() {
  const pending = (getState().payments || [])
    .filter((payment) => {
      const status = String(payment.status || "").toLowerCase();
      return payment.stripe_checkout_session_id && (status === "pending" || status === "open");
    })
    .slice(0, 3);
  if (!pending.length) {
    return false;
  }

  let fulfilled = false;
  setState({ loading: { checkout: true } });
  try {
    for (const payment of pending) {
      const sessionId = String(payment.stripe_checkout_session_id);
      if (reconciledCheckoutSessions.has(sessionId)) {
        continue;
      }
      reconciledCheckoutSessions.add(sessionId);
      const result = await reconcileCheckoutSession(sessionId);
      fulfilled = fulfilled || Boolean(result.fulfilled);
    }
  } finally {
    setState({ loading: { checkout: false } });
  }

  if (fulfilled) {
    setToast({ title: "Payment confirmed", message: "Your DueScope billing state has been refreshed." });
  }
  return true;
}

async function handleRoute(route) {
  const state = getState();
  const key = routeKey(route);
  if (key === currentRouteKey && state.booted && !state.error && !state.loading.route) {
    return;
  }
  const loadId = ++routeLoadId;
  if (route.name === "new" && !route.params?.edit && !state.loading.analysis) {
    resetNewCheckWorkspace();
  }

  if (isProtectedRoute(route) && !state.session) {
    currentRouteKey = key;
    setState({ loading: { route: false }, selectedReport: null, selectedCheck: null });
    return;
  }
  if (isProtectedRoute(route) && state.session && !state.profile) {
    currentRouteKey = key;
    setState({ loading: { route: false }, selectedReport: null, selectedCheck: null });
    return;
  }

  await safeRun(async () => {
    setState({ loading: { route: true }, error: null });
    await withTimeout(async () => {
      if (state.user && route.name === "account" && route.params?.checkout === "success" && route.params?.session_id) {
        const sessionId = String(route.params.session_id);
        if (!reconciledCheckoutSessions.has(sessionId)) {
          reconciledCheckoutSessions.add(sessionId);
          setState({ loading: { checkout: true } });
          let result;
          try {
            result = await reconcileCheckoutSession(sessionId);
          } finally {
            setState({ loading: { checkout: false } });
          }
          setToast(result.fulfilled
            ? { title: "Payment confirmed", message: "Your DueScope plan is now active." }
            : { title: "Payment processing", message: "Stripe has not marked this checkout as paid yet. Refresh billing in a moment." });
          window.history.replaceState(null, "", `${window.location.pathname}#/account`);
        }
      }
      if (state.user && ["dashboard", "history", "watchlist", "new", "account"].includes(route.name)) {
        await refreshWorkspace();
        if (route.name === "account" && await reconcilePendingCheckoutPayments()) {
          await loadAccountState();
        }
      }
      if (state.user && route.name === "report") {
        await loadReport(route.params.id);
      }
      if (route.name === "pricing" && state.user) {
        await loadAccountState();
      }
    }, ROUTE_LOAD_TIMEOUT_MS, routeTimeoutMessage(route));
    if (loadId === routeLoadId) {
      currentRouteKey = key;
      setState({ loading: { route: false } });
    }
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const state = getState();
  const form = new FormData(event.currentTarget);
  try {
    if (state.authMode === "signup") {
      await signUp({
        email: form.get("email"),
        password: form.get("password"),
        fullName: form.get("fullName"),
        companyName: form.get("companyName"),
        agreementAccepted: form.get("agreementAccepted") === "on"
      });
    } else {
      await signIn({
        email: form.get("email"),
        password: form.get("password")
      });
    }
  } catch (error) {
    const message = error?.details?.message || error?.message || "Unable to complete authentication.";
    setState({ authModalOpen: true, authNotice: message, error: null, loading: { auth: false } });
    return;
  }
  if (!getState().session) {
    return;
  }
  await safeRun(async () => {
    await refreshWorkspace();
    const nextState = getState();
    if (nextState.session && !nextState.profile) {
      navigate("/dashboard");
    } else if (nextState.route.name === "landing") {
      navigate("/dashboard");
    }
  });
}

async function handleAppRegistrationSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await safeRun(async () => {
    await registerAppAccess({
      fullName: form.get("fullName"),
      companyName: form.get("companyName"),
      agreementAccepted: form.get("agreementAccepted") === "on"
    });
    await refreshWorkspace();
    setToast({ title: "DueScope signup complete", message: "Your app workspace is ready." });
    navigate("/dashboard");
  });
}

async function handleSignOut() {
  await safeRun(async () => {
    await doSignOut();
    navigate("/");
  });
}

async function handleNewCheck(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const input = {
    targetName: form.get("targetName"),
    targetUrl: form.get("targetUrl"),
    jurisdiction: form.get("jurisdiction"),
    checkType: form.get("checkType"),
    context: form.get("context")
  };
  await safeRun(async () => {
    setState({ loading: { analysis: true }, analysisStep: 0, analysisElapsedSeconds: 0, analysisLog: [], error: null });
    startAnalysisWalk(input);
    try {
      const result = await runRiskAnalysis(input);
      stopAnalysisWalk();
      appendAnalysisLog(makeActivity("Response received", "DueScope received the structured report and is refreshing account history."));
      setState({ loading: { analysis: false }, analysisStep: 6, analysisElapsedSeconds: 0 });
      await delay(450);
      await refreshWorkspace();
      if (result.report?.id) {
        setState({ newCheckDraft: null });
        navigate(`/report/${result.report.id}`);
        setState({ analysisStep: 0, analysisElapsedSeconds: 0 });
      } else {
        setToast({ title: "Analysis accepted", message: "The check was queued for processing." });
      }
    } finally {
      stopAnalysisWalk();
    }
  });
}

function handleNewCheckTypeChange(checkType) {
  const form = document.querySelector("[data-new-check-form]");
  if (!form) {
    return;
  }
  const formData = new FormData(form);
  setState({
    newCheckDraft: {
      targetName: formData.get("targetName") || "",
      targetUrl: formData.get("targetUrl") || "",
      jurisdiction: formData.get("jurisdiction") || "",
      checkType,
      context: formData.get("context") || ""
    }
  });
}

function checkToAnalysisInput(check) {
  return {
    targetName: check?.target_name || "",
    targetUrl: check?.target_url || "",
    jurisdiction: check?.jurisdiction || "",
    checkType: check?.check_type || "vendor",
    context: check?.context || ""
  };
}

function handleReportEditSearch() {
  const { selectedCheck } = getState();
  if (!selectedCheck) {
    return;
  }
  setState({
    newCheckDraft: checkToAnalysisInput(selectedCheck),
    error: null
  });
  navigate(`/new?edit=${encodeURIComponent(selectedCheck.id)}`);
}

function nextWatchlistDate(item) {
  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, Number(item?.screening_interval_days || 30)));
  return next.toISOString();
}

function parseReportObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

function reportDerivedJurisdiction(report) {
  const countryRisk = parseReportObject(report?.country_risk);
  const candidates = [countryRisk.country, countryRisk.location_label];
  return candidates
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^(unknown|not identified|not available|n\/a|none|null)$/i.test(value)) || "";
}

async function handleReportRescreen() {
  const { selectedCheck } = getState();
  if (!selectedCheck) {
    return;
  }
  const input = checkToAnalysisInput(selectedCheck);
  await safeRun(async () => {
    setState({ loading: { analysis: true }, error: null });
    setToast({ title: "Re-screening started", message: "DueScope is running a fresh source-backed check." });
    const result = await runRiskAnalysis(input);
    setState({ loading: { analysis: false } });
    await refreshWorkspace();
    if (result.report?.id) {
      navigate(`/report/${result.report.id}`);
    }
  });
}

async function handleHistoryRescreen(checkId) {
  const check = getState().checks.find((entry) => entry.id === checkId);
  if (!check) {
    return;
  }
  const input = checkToAnalysisInput(check);
  await safeRun(async () => {
    setState({ loading: { analysis: true }, error: null });
    setToast({ title: "Re-screening started", message: `Running a fresh check for ${check.target_name}.` });
    const result = await runRiskAnalysis(input);
    setState({ loading: { analysis: false } });
    await refreshWorkspace();
    if (result.report?.id) {
      navigate(`/report/${result.report.id}`);
    }
  });
}

async function handleReportWatchlist() {
  const { selectedCheck, selectedReport } = getState();
  if (!selectedCheck) {
    return;
  }
  await safeRun(async () => {
    setState({ loading: { watchlist: true }, error: null });
    const item = await createWatchlistItem({
      target_name: selectedCheck.target_name,
      target_url: selectedCheck.target_url,
      jurisdiction: selectedCheck.jurisdiction || reportDerivedJurisdiction(selectedReport),
      check_type: selectedCheck.check_type,
      context: selectedCheck.context,
      auto_screen_enabled: true,
      screening_interval_days: 30
    });
    if (selectedReport?.id) {
      await updateWatchlistItem(item.id, {
        last_screened_at: selectedReport.created_at || new Date().toISOString(),
        last_check_id: selectedCheck.id,
        last_report_id: selectedReport.id,
        last_risk_score: selectedReport.risk_score,
        last_risk_level: selectedReport.risk_level,
        last_status: "completed"
      });
    }
    setState({ loading: { watchlist: false } });
    setToast({ title: "Added to watchlist", message: "This target is now ready for recurring re-screening." });
  });
}

async function handleWatchlistScreen(id) {
  const item = getState().watchlistItems.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  const input = {
    targetName: item.target_name,
    targetUrl: item.target_url,
    jurisdiction: item.jurisdiction,
    checkType: item.check_type,
    context: item.context
  };
  await safeRun(async () => {
    setState({ loading: { watchlist: true }, error: null });
    await updateWatchlistItem(id, { last_status: "screening" });
    try {
      const result = await runRiskAnalysis(input);
      await markWatchlistScreened(id, result, "completed");
      setState({ loading: { watchlist: false } });
      await refreshWorkspace();
      if (result.report?.id) {
        navigate(`/report/${result.report.id}`);
      }
    } catch (error) {
      await updateWatchlistItem(id, { last_status: "failed" });
      throw error;
    }
  });
}

async function handleWatchlistToggle(id) {
  const item = getState().watchlistItems.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  const enabled = !item.auto_screen_enabled;
  await safeRun(async () => {
    setState({ loading: { watchlist: true }, error: null });
    await updateWatchlistItem(id, {
      auto_screen_enabled: enabled,
      last_status: enabled ? "active" : "paused",
      next_screen_at: enabled ? nextWatchlistDate(item) : null
    });
    setState({ loading: { watchlist: false } });
  });
}

async function handleWatchlistRemove(id) {
  await safeRun(async () => {
    setState({ loading: { watchlist: true }, error: null });
    await deleteWatchlistItem(id);
    setState({ loading: { watchlist: false } });
  });
}

async function handleCheckout(planKey) {
  const state = getState();
  if (!state.session) {
    openAuth("signup");
    return;
  }
  if (!state.profile) {
    setToast({ title: "Complete signup", message: "Create your DueScope app profile before checkout." });
    navigate("/dashboard");
    return;
  }
  await safeRun(async () => {
    setState({ loading: { checkout: true }, error: null });
    const session = await createCheckoutSession(planKey);
    setState({ loading: { checkout: false } });
    if (session.url) {
      window.location.assign(session.url);
    }
  });
}

function handleFreePlan() {
  if (!getState().session) {
    openAuth("signup");
    return;
  }
  if (!getState().profile) {
    setToast({ title: "Complete signup", message: "Create your DueScope app profile to activate the free plan." });
    navigate("/dashboard");
    return;
  }
  navigate("/dashboard");
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await safeRun(async () => {
    await updateProfile({
      full_name: form.get("full_name"),
      company_name: form.get("company_name")
    });
    setToast({ title: "Profile saved", message: "Account details are up to date." });
  });
}

async function handleBillingPortal() {
  await safeRun(async () => {
    const portal = await openBillingPortal();
    if (portal.url) {
      window.location.assign(portal.url);
    }
  });
}

async function init() {
  subscribe(render);
  render();
  await safeRun(async () => {
    await loadSession();
    if (/^#(?:access_token|error|type=|refresh_token)/i.test(window.location.hash || "")) {
      window.history.replaceState(null, "", `${window.location.pathname}#/dashboard`);
    }
    setState({ booted: true, loading: { boot: false } });
  });
  startRouter(handleRoute);
  onAuthChanged(async (session) => {
    if (session) {
      await safeRun(refreshWorkspace);
    }
  });
}

init();
