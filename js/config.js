const supabaseRuntime = window.__POLYMAI_SUPABASE_CONFIG__ || {};
const stripeRuntime = window.__POLYMAI_STRIPE_CONFIG__ || {};

export const APP_CONFIG = Object.freeze({
  appName: "DueScope Due Diligence",
  brandName: "DueScope",
  schema: "app668_duescope",
  supabaseUrl: supabaseRuntime.url || "",
  supabaseAnonKey: supabaseRuntime.anonKey || "",
  functionsBaseUrl: supabaseRuntime.functionsBaseUrl || stripeRuntime.functionsBaseUrl || "",
  publicSiteUrl: supabaseRuntime.siteUrl || supabaseRuntime.publicSiteUrl || "",
  stripe: {
    mode: stripeRuntime.mode || "test",
    publishableKey: stripeRuntime.publishableKey || "",
    functionsBaseUrl: stripeRuntime.functionsBaseUrl || supabaseRuntime.functionsBaseUrl || "",
    defaultSuccessUrl: stripeRuntime.defaultSuccessUrl || "",
    defaultCancelUrl: stripeRuntime.defaultCancelUrl || "",
    defaultPriceIds: stripeRuntime.defaultPriceIds || []
  },
  edgeFunctions: {
    riskAnalysis: "app668-duescope-due-diligence-incoming-webhook",
    checkout: "app668-duescope-due-diligence-create-checkout-session",
    billingPortal: "app668-duescope-due-diligence-create-checkout-session",
    incomingWebhook: "app668-duescope-due-diligence-incoming-webhook",
    stripeWebhook: "app668-duescope-due-diligence-stripe-webhook"
  },
  map: {
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors"
  },
  tables: {
    plans: "plans",
    profiles: "profiles",
    entitlements: "entitlements",
    usagePeriods: "usage_periods",
    checks: "due_diligence_checks",
    reports: "risk_reports",
    watchlistItems: "watchlist_items",
    payments: "payments"
  }
});

export const PLAN_FALLBACKS = Object.freeze({
  free: {
    plan_key: "free",
    name: "Free",
    description: "For a first pass on early vendor or target screening.",
    monthly_price_cents: 0,
    billing_interval: "month",
    included_checks: 3,
    pdf_export: false,
    api_access: false,
    human_review: false
  },
  starter: {
    plan_key: "starter",
    name: "Starter",
    description: "Recurring diligence for small teams and vendor intake.",
    monthly_price_cents: 4900,
    billing_interval: "month",
    included_checks: 25,
    pdf_export: true,
    api_access: false,
    human_review: false
  },
  growth: {
    plan_key: "growth",
    name: "Growth",
    description: "Higher-volume checks with full report exports and stronger source coverage.",
    monthly_price_cents: 14900,
    billing_interval: "month",
    included_checks: 100,
    pdf_export: true,
    api_access: false,
    human_review: true
  },
  pro: {
    plan_key: "pro",
    name: "Pro",
    description: "Portfolio-scale diligence with advanced review controls.",
    monthly_price_cents: 39900,
    billing_interval: "month",
    included_checks: 350,
    pdf_export: true,
    api_access: false,
    human_review: true
  },
  enterprise: {
    plan_key: "enterprise",
    name: "Enterprise",
    description: "Custom controls, team governance, and procurement support.",
    monthly_price_cents: null,
    billing_interval: "custom",
    included_checks: 1000,
    pdf_export: true,
    api_access: false,
    human_review: true
  },
  payg: {
    plan_key: "payg",
    name: "Pay-as-you-go",
    description: "One-time pack for overflow checks without changing plans.",
    monthly_price_cents: 2900,
    billing_interval: "one_time",
    included_checks: 5,
    pdf_export: true,
    api_access: false,
    human_review: false
  }
});

export const RISK_LEVELS = Object.freeze({
  low: { label: "Low", className: "low" },
  medium: { label: "Medium", className: "medium" },
  high: { label: "High", className: "high" },
  critical: { label: "Critical", className: "critical" }
});

export function formatMoney(cents, interval = "month") {
  if (cents === null || cents === undefined) {
    return "Custom";
  }
  if (Number(cents) === 0) {
    return "$0";
  }
  const dollars = Math.round(Number(cents) / 100);
  return interval === "one_time" ? `$${dollars}` : `$${dollars}/mo`;
}

export function normalizePlan(planKey, plans = []) {
  return plans.find((plan) => plan.plan_key === planKey) || PLAN_FALLBACKS[planKey] || PLAN_FALLBACKS.free;
}
