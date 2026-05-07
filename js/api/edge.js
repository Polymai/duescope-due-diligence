import { APP_CONFIG } from "../config.js";
import { getAccessToken } from "../supabaseClient.js";

function timeoutMessage(functionName, timeoutMs) {
  const seconds = Math.round(timeoutMs / 1000);
  if (functionName === APP_CONFIG.edgeFunctions.riskAnalysis) {
    return `DueScope timed out after ${seconds} seconds waiting for the research response. The analysis service may still finish in the background; check History in a minute or try again with a narrower target and jurisdiction.`;
  }
  return `Timed out after ${seconds} seconds waiting for ${functionName}.`;
}

async function callFunction(functionName, payload, options = {}) {
  if (!APP_CONFIG.functionsBaseUrl) {
    throw new Error("The secure analysis service is not configured.");
  }

  const token = await getAccessToken();
  const timeoutMs = options.timeoutMs || 60000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(`${APP_CONFIG.functionsBaseUrl}/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(options.timeoutMessage || timeoutMessage(functionName, timeoutMs));
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.message || json.error || `Analysis service failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.details = json;
    error.status = response.status;
    throw error;
  }
  return json;
}

export function runRiskAnalysis(input) {
  return callFunction(APP_CONFIG.edgeFunctions.riskAnalysis, {
    action: "analyze_due_diligence",
    input
  }, {
    timeoutMs: 120000
  });
}

export function createCheckoutSession(planKey) {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return callFunction(APP_CONFIG.edgeFunctions.checkout, {
    action: "create_checkout_session",
    planKey,
    successUrl: `${origin}${path}#/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}${path}#/pricing?checkout=cancelled`
  });
}

export function reconcileCheckoutSession(sessionId) {
  return callFunction(APP_CONFIG.edgeFunctions.checkout, {
    action: "reconcile_checkout_session",
    sessionId
  }, {
    timeoutMs: 30000
  });
}

export function openBillingPortal() {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return callFunction(APP_CONFIG.edgeFunctions.billingPortal, {
    action: "create_billing_portal",
    returnUrl: `${origin}${path}#/account`
  });
}
