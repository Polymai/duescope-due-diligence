import { emptyState, escapeHtml, formatDate, progressBar } from "../components.js";

function formatPaymentAmount(payment) {
  if (!payment.amount_cents) {
    return "-";
  }
  const currency = String(payment.currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency
    }).format(Number(payment.amount_cents) / 100);
  } catch (_error) {
    return `${(Number(payment.amount_cents) / 100).toFixed(2)} ${currency}`;
  }
}

export function renderAccount(state) {
  const plan = state.entitlement?.plan;
  const usageTotal = Number(plan?.included_checks || 0) + Number(state.usage?.payg_checks || 0);
  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>Account and billing</h1>
        <p>Manage profile details, billing state, payment history, and plan usage.</p>
      </div>
      <button class="button button-secondary" type="button" data-action="billing-portal" ${state.billing?.customerId ? "" : "disabled"}>Billing portal</button>
    </section>
    <section class="account-grid">
      <div class="card card-pad card-stack">
        <div class="card-title">
          <div>
            <h3>Profile</h3>
            <p>App-local profile data tied to your Supabase auth account.</p>
          </div>
        </div>
        <form class="form-grid" data-profile-form>
          <div class="form-row">
            <div class="field">
              <label for="profile-name">Full name</label>
              <input class="input" id="profile-name" name="full_name" value="${escapeHtml(state.profile?.full_name || "")}">
            </div>
            <div class="field">
              <label for="profile-company">Company</label>
              <input class="input" id="profile-company" name="company_name" value="${escapeHtml(state.profile?.company_name || "")}">
            </div>
          </div>
          <div class="field">
            <label>Email</label>
            <input class="input" value="${escapeHtml(state.user?.email || "")}" disabled>
          </div>
          <button class="button button-primary" type="submit">Save profile</button>
        </form>
      </div>
      <aside class="card card-pad card-stack">
        <div class="card-title">
          <div>
            <h3>${escapeHtml(plan?.name || "Free")} plan</h3>
            <p>Status: ${escapeHtml(state.billing?.status || "active")}</p>
          </div>
          <span class="status-pill"><span class="status-dot ${state.billing?.status === "past_due" ? "danger" : ""}"></span>${escapeHtml(state.billing?.status || "active")}</span>
        </div>
        ${progressBar("Period usage", state.usage?.checks_used || 0, Math.max(usageTotal, 1), state.checksLeft <= 1 ? "danger" : "")}
        <div class="account-line">
          <span class="muted">Checks left</span>
          <strong>${state.checksLeft ?? 0}</strong>
        </div>
        <div class="account-line">
          <span class="muted">Period ends</span>
          <strong>${state.billing?.currentPeriodEnd ? formatDate(state.billing.currentPeriodEnd) : "Monthly"}</strong>
        </div>
        <a class="button button-secondary" href="#/pricing">Change plan</a>
      </aside>
    </section>
    <section class="account-grid account-grid-single">
      <div class="card card-pad card-stack">
        <div class="card-title">
          <div>
            <h3>Payment history</h3>
            <p>Fulfillment is driven by verified Stripe webhooks. Paid totals include VAT after Stripe confirms the invoice.</p>
          </div>
        </div>
        ${state.payments?.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${state.payments.map((payment) => `
                  <tr>
                    <td>${formatDate(payment.created_at)}</td>
                    <td>${escapeHtml(payment.plan_key)}</td>
                    <td>${escapeHtml(formatPaymentAmount(payment))}</td>
                    <td><span class="badge badge-neutral">${escapeHtml(payment.status)}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : emptyState("No payments yet", "Stripe checkout sessions and webhook-confirmed payments will appear here.")}
      </div>
    </section>
  `;
}

export function bindAccount({ onProfile, onBillingPortal }) {
  const profileForm = document.querySelector("[data-profile-form]");
  if (profileForm) {
    profileForm.addEventListener("submit", onProfile);
  }
  const portal = document.querySelector("[data-action='billing-portal']");
  if (portal) {
    portal.addEventListener("click", onBillingPortal);
  }
}
