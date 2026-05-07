import { RISK_LEVELS, formatMoney } from "./config.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatCheckType(value) {
  const labels = {
    vendor: "Vendor",
    investment: "Investment target",
    partner: "Partner",
    customer: "Customer",
    portfolio: "Portfolio company",
    pep: "PEP screening",
    country: "Country risk score"
  };
  return labels[String(value || "").toLowerCase()] || String(value || "Diligence");
}

export function riskLevelFromScore(score) {
  const numeric = Number(score || 0);
  if (numeric >= 85) return "critical";
  if (numeric >= 65) return "high";
  if (numeric >= 40) return "medium";
  return "low";
}

export function badge(label, variant = "neutral") {
  return `<span class="badge badge-${escapeHtml(variant)}">${escapeHtml(label)}</span>`;
}

export function riskBadge(level, score) {
  const key = String(level || riskLevelFromScore(score)).toLowerCase();
  const risk = RISK_LEVELS[key] || RISK_LEVELS.low;
  return badge(risk.label, risk.className);
}

export function progressBar(label, value, max = 100, variant = "") {
  const pct = Math.max(0, Math.min(100, max ? (Number(value) / Number(max)) * 100 : 0));
  return `
    <div class="progress">
      <div class="progress-label">
        <span>${escapeHtml(label)}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${escapeHtml(variant)}" style="width: ${pct}%"></div></div>
    </div>
  `;
}

export function metricCard(label, value, detail = "") {
  return `
    <article class="card card-pad metric-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      ${detail ? `<p class="muted">${escapeHtml(detail)}</p>` : ""}
    </article>
  `;
}

export function emptyState(title, message, action = "") {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${action}
    </div>
  `;
}

export function loadingState(title = "Loading", message = "Fetching the latest workspace data.") {
  return `
    <div class="loading-state">
      <h3>${escapeHtml(title)}</h3>
      <div class="loader-line"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function errorState(title, message) {
  return `
    <div class="error-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function setupState(message) {
  return `
    <div class="setup-state">
      <h3>Provider setup required</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function planPrice(plan) {
  return formatMoney(plan.monthly_price_cents, plan.billing_interval);
}

export function authModal(state) {
  if (!state.authModalOpen) {
    return "";
  }
  const isSignup = state.authMode === "signup";
  const authEmail = state.authPrefillEmail || "";
  return `
    <div class="modal-backdrop" data-action="close-auth">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" data-modal-stop>
        <div class="modal-header">
          <div>
            <h2 id="auth-title">${isSignup ? "Create your DueScope account" : "Sign in to DueScope"}</h2>
            <p>${isSignup ? "Start with free checks and upgrade when volume grows." : "Continue to your diligence workspace."}</p>
          </div>
          <button class="button button-ghost" type="button" data-action="close-auth" aria-label="Close">Close</button>
        </div>
        <div class="segmented" role="tablist">
          <button class="segment ${!isSignup ? "active" : ""}" type="button" data-action="auth-mode" data-mode="signin">Sign in</button>
          <button class="segment ${isSignup ? "active" : ""}" type="button" data-action="auth-mode" data-mode="signup">Sign up</button>
        </div>
        ${state.authNotice ? `<div class="auth-notice">${escapeHtml(state.authNotice)}</div>` : ""}
        <form class="form-grid" id="auth-form" data-auth-form>
          <div class="field">
            <label for="auth-email">Email</label>
            <input class="input" id="auth-email" name="email" type="email" autocomplete="email" value="${escapeHtml(authEmail)}" required>
          </div>
          <div class="field">
            <label for="auth-password">Password</label>
            <input class="input" id="auth-password" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" ${isSignup ? 'minlength="8"' : ""} required>
          </div>
          ${isSignup ? `
            <div class="field">
              <label for="auth-full-name">Full name</label>
              <input class="input" id="auth-full-name" name="fullName" autocomplete="name">
            </div>
            <div class="field">
              <label for="auth-company">Company</label>
              <input class="input" id="auth-company" name="companyName" autocomplete="organization">
            </div>
            <label class="check-field auth-agreement">
              <input type="checkbox" name="agreementAccepted" required>
              <span>I agree to the <a href="#/agreement" data-action="close-auth">DueScope Service Agreement</a>.</span>
            </label>
          ` : ""}
          <button class="button button-primary button-full" type="submit" ${state.loading.auth ? "disabled" : ""}>
            ${state.loading.auth ? "Working..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  `;
}

export function toast(toastState) {
  if (!toastState) {
    return "";
  }
  return `
    <div class="toast">
      <strong>${escapeHtml(toastState.title)}</strong>
      <p>${escapeHtml(toastState.message)}</p>
    </div>
  `;
}
