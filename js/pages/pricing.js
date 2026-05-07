import { escapeHtml, planPrice } from "../components.js";
import { PLAN_FALLBACKS } from "../config.js";

function sortedPlans(state) {
  const plans = state.plans?.length ? state.plans : Object.values(PLAN_FALLBACKS);
  return [...plans].sort((a, b) => (a.sort_order || 100) - (b.sort_order || 100));
}

function planDescription(plan) {
  if (plan.plan_key === "pro") {
    return "Portfolio-scale diligence with advanced review controls.";
  }
  if (plan.plan_key === "enterprise") {
    return "Custom controls, team governance, and procurement support.";
  }
  return plan.description || "";
}

export function renderPricing(state) {
  const current = state.entitlement?.plan_key || state.entitlement?.plan?.plan_key || "free";
  return `
    <div class="pricing-page">
      <section class="page-heading pricing-heading">
        <div class="page-heading-copy">
          <h1>Plans for every diligence cadence</h1>
          <p>Usage, export, checkout, and plan controls are enforced by backend plan state. Paid prices exclude 25% VAT, which is added at checkout and shown on the Stripe invoice.</p>
        </div>
        ${state.session ? `<a class="button button-secondary" href="#/account">Billing account</a>` : `<button class="button button-primary" type="button" data-action="open-auth" data-mode="signup">Start free</button>`}
      </section>
      <section class="pricing-grid">
        ${sortedPlans(state).map((plan) => `
          <article class="card card-pad plan-card ${plan.plan_key === "growth" ? "featured" : ""}">
            <div class="card-stack">
              <div class="card-title">
                <div>
                  <h3>${escapeHtml(plan.name)}</h3>
                  <p>${escapeHtml(planDescription(plan))}</p>
                </div>
                ${current === plan.plan_key ? `<span class="badge badge-success">Current</span>` : ""}
              </div>
              <div class="plan-price">
                <strong>${escapeHtml(planPrice(plan))}</strong>
                ${plan.billing_interval === "month" ? `<span class="muted">billed monthly</span>` : ""}
              </div>
              ${plan.plan_key !== "free" && plan.plan_key !== "enterprise" ? `<p class="plan-tax-note">+ 25% VAT at checkout</p>` : ""}
              <ul class="plan-list">
                <li>${Number(plan.included_checks || 0)} checks included</li>
                <li>${plan.pdf_export ? "PDF export enabled" : "In-app reports only"}</li>
                <li>${plan.human_review ? "Human review flagging" : "Automated triage"}</li>
                <li>${plan.plan_key === "enterprise" ? "Procurement support" : plan.plan_key === "pro" ? "Advanced review controls" : "Workspace history"}</li>
              </ul>
            </div>
            ${plan.plan_key === "enterprise"
              ? `<a class="button button-secondary button-full" href="mailto:sales@example.com?subject=DueScope%20Enterprise">Contact sales</a>`
              : plan.plan_key === "free"
                ? `<button class="button button-secondary button-full" type="button" data-plan-free>${state.session ? "Use free" : "Start free"}</button>`
                : `<button class="button button-primary button-full" type="button" data-checkout-plan="${escapeHtml(plan.plan_key)}" ${state.loading.checkout ? "disabled" : ""}>${state.loading.checkout ? "Opening..." : plan.plan_key === "payg" ? "Buy pack" : "Upgrade"}</button>`}
          </article>
        `).join("")}
      </section>
    </div>
  `;
}

export function bindPricing({ onCheckout, onFree }) {
  document.querySelectorAll("[data-checkout-plan]").forEach((button) => {
    button.addEventListener("click", () => onCheckout(button.dataset.checkoutPlan));
  });
  document.querySelectorAll("[data-plan-free]").forEach((button) => {
    button.addEventListener("click", onFree);
  });
}
