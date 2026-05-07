import { authModal, badge, escapeHtml, progressBar, toast } from "./components.js";

const protectedRoutes = new Set(["dashboard", "new", "report", "history", "watchlist", "account"]);
const publicRoutes = new Set(["landing", "service", "agreement", "pricing"]);
let mobileMenuKeydownBound = false;

function wordmark() {
  return `<a class="brand-wordmark" href="#/">Due<span>Scope</span></a>`;
}

function navLink(route, href, label, state) {
  const active = state.route.name === route ? "active" : "";
  const action = route === "new" ? ` data-action="new-check-nav"` : "";
  return `<a class="nav-link ${active}" href="${href}"${action}><span>${escapeHtml(label)}</span></a>`;
}

function accountUsage(state) {
  const plan = state.entitlement?.plan;
  const used = Number(state.usage?.checks_used || 0);
  const payg = Number(state.usage?.payg_checks || 0);
  const included = Number(plan?.included_checks || 0);
  const total = included + payg;
  return progressBar("Checks used", used, Math.max(total, 1), state.checksLeft <= 1 ? "danger" : state.checksLeft <= 3 ? "warning" : "");
}

function publicNav(state) {
  return `
    <header class="public-nav">
      <div class="public-nav-inner">
        ${wordmark()}
        <button class="mobile-nav-toggle" type="button" data-action="toggle-mobile-menu" data-menu-target="public-mobile-menu" aria-controls="public-mobile-menu" aria-expanded="false">
          <span class="mobile-nav-icon" aria-hidden="true"></span>
          <span>Menu</span>
        </button>
        <nav class="public-nav-links" id="public-mobile-menu" data-mobile-menu aria-label="Public navigation">
          <a class="button button-ghost" href="#/service">Service</a>
          <a class="button button-ghost" href="#/pricing">Pricing</a>
          <a class="button button-ghost" href="#/agreement">Terms</a>
          ${state.session
            ? state.profile
              ? `<a class="button button-primary" href="#/dashboard">Open dashboard</a>`
              : `<a class="button button-primary" href="#/dashboard">Complete signup</a>`
            : `<button class="button button-secondary" type="button" data-action="open-auth" data-mode="signin">Sign in</button>
               <button class="button button-primary" type="button" data-action="open-auth" data-mode="signup">Start free</button>`}
        </nav>
      </div>
    </header>
  `;
}

function authGate(state) {
  return `
    <main class="auth-gate">
      <div class="eyebrow">Secure owner workspace</div>
      <h1>Sign in to run and review due diligence checks.</h1>
      <p>DueScope keeps reports, payment state, and workspace activity scoped to the authenticated owner account.</p>
      <div class="hero-actions">
        <button class="button button-primary" type="button" data-action="open-auth" data-mode="signin">Sign in</button>
        <button class="button button-secondary" type="button" data-action="open-auth" data-mode="signup">Create account</button>
      </div>
      ${authModal(state)}
      ${toast(state.toast)}
    </main>
  `;
}

function appRegistrationGate(state) {
  const metadata = state.user?.user_metadata || {};
  return `
    <main class="auth-gate">
      <div class="eyebrow">App signup required</div>
      <h1>Create your DueScope app profile.</h1>
      <p>${escapeHtml(state.user?.email || "This Supabase account")} is signed in, but it has not signed up for DueScope yet. Create an app-local profile to open this workspace.</p>
      <form class="form-grid card card-pad" data-app-registration-form>
        <div class="field">
          <label for="app-signup-full-name">Full name</label>
          <input class="input" id="app-signup-full-name" name="fullName" autocomplete="name" value="${escapeHtml(metadata.full_name || metadata.name || "")}">
        </div>
        <div class="field">
          <label for="app-signup-company">Company</label>
          <input class="input" id="app-signup-company" name="companyName" autocomplete="organization" value="${escapeHtml(metadata.company_name || "")}">
        </div>
        <label class="check-field auth-agreement">
          <input type="checkbox" name="agreementAccepted" required>
          <span>I agree to the <a href="#/agreement">DueScope Service Agreement</a>.</span>
        </label>
        <button class="button button-primary button-full" type="submit" ${state.loading.auth ? "disabled" : ""}>
          ${state.loading.auth ? "Creating profile..." : "Complete DueScope signup"}
        </button>
        <button class="button button-ghost button-full" type="button" data-action="sign-out">Use another account</button>
      </form>
      ${toast(state.toast)}
    </main>
  `;
}

function authenticatedShell(pageHtml, state) {
  const planName = state.entitlement?.plan?.name || "Free";
  const profileName = state.profile?.full_name || state.user?.email || "Account";
  return `
    <div class="app-shell">
      <aside class="sidebar" id="workspace-mobile-menu" data-mobile-menu>
        <div class="sidebar-brand">
          ${wordmark()}
          <small>AI diligence command center</small>
        </div>
        <nav class="sidebar-nav" aria-label="Workspace navigation">
          ${navLink("dashboard", "#/dashboard", "Dashboard", state)}
          ${navLink("new", "#/new", "New check", state)}
          ${navLink("history", "#/history", "History", state)}
          ${navLink("watchlist", "#/watchlist", "Watchlist", state)}
          ${navLink("pricing", "#/pricing", "Pricing", state)}
          ${navLink("account", "#/account", "Account", state)}
        </nav>
        <div class="sidebar-footer">
          <div class="card sidebar-usage-card">
            <div class="metric-inline">
              <strong>${escapeHtml(planName)}</strong>
              ${badge(`${state.checksLeft || 0} left`, state.checksLeft <= 1 ? "danger" : "success")}
            </div>
            ${accountUsage(state)}
          </div>
          <div class="sidebar-profile">
            <div>
              <strong>${escapeHtml(profileName)}</strong>
              <div class="muted">${escapeHtml(state.user?.email || "")}</div>
            </div>
            <button class="button button-ghost" type="button" data-action="sign-out">Sign out</button>
          </div>
        </div>
      </aside>
      <button class="mobile-menu-scrim" type="button" data-action="close-mobile-menu" aria-label="Close navigation"></button>
      <div class="main-panel">
        <header class="topbar">
          <button class="mobile-nav-toggle" type="button" data-action="toggle-mobile-menu" data-menu-target="workspace-mobile-menu" aria-controls="workspace-mobile-menu" aria-expanded="false">
            <span class="mobile-nav-icon" aria-hidden="true"></span>
            <span>Menu</span>
          </button>
          <div class="topbar-title">
            <strong>${escapeHtml(pageTitle(state.route.name))}</strong>
            <span>${escapeHtml(pageSubtitle(state.route.name))}</span>
          </div>
          <div class="topbar-actions">
            ${badge(`${escapeHtml(planName)} plan`, "neutral")}
            <a class="button button-primary" href="#/new" data-action="new-check-nav">New check</a>
          </div>
        </header>
        <main class="page-content">${pageHtml}</main>
      </div>
      ${authModal(state)}
      ${toast(state.toast)}
    </div>
  `;
}

function publicShell(pageHtml, state) {
  return `
    <div class="public-shell">
      ${publicNav(state)}
      ${pageHtml}
      ${authModal(state)}
      ${toast(state.toast)}
    </div>
  `;
}

function pageTitle(routeName) {
  const titles = {
    dashboard: "Dashboard",
    new: "New diligence check",
    report: "Risk report",
    history: "Report history",
    watchlist: "Watchlist",
    service: "Service overview",
    agreement: "Service agreement",
    pricing: "Plans and usage",
    account: "Account"
  };
  return titles[routeName] || "DueScope";
}

function pageSubtitle(routeName) {
  const subtitles = {
    dashboard: "Live account usage and latest risk signals",
    new: "Run source-backed due diligence with structured output",
    report: "Score, findings, sources, and recommendation",
    history: "Search prior checks and open full reports",
    watchlist: "Recurring re-screening for entities and countries",
    service: "Full service scope and customer functions",
    agreement: "Terms, data protection, cybersecurity, AI usage, and billing",
    pricing: "Upgrade volume, exports, and review controls",
    account: "Billing state, usage, and profile controls"
  };
  return subtitles[routeName] || "AI due diligence for risk-aware teams";
}

export function renderShell(pageHtml, state) {
  if (state.loading.boot) {
    return publicShell(pageHtml, state);
  }
  if (!state.session && protectedRoutes.has(state.route.name)) {
    return authGate(state);
  }
  if (state.session && !state.profile && protectedRoutes.has(state.route.name)) {
    return appRegistrationGate(state);
  }
  if (state.session && state.profile && !publicRoutes.has(state.route.name)) {
    return authenticatedShell(pageHtml, state);
  }
  return publicShell(pageHtml, state);
}

function closeMobileMenus() {
  document.querySelectorAll("[data-mobile-menu].is-open").forEach((menu) => {
    menu.classList.remove("is-open");
  });
  document.querySelectorAll("[data-action='toggle-mobile-menu']").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
  document.querySelector(".app-shell")?.classList.remove("menu-open");
}

function bindMobileMenus() {
  document.querySelectorAll("[data-action='toggle-mobile-menu']").forEach((button) => {
    button.addEventListener("click", () => {
      const menu = document.getElementById(button.dataset.menuTarget || "");
      if (!menu) {
        return;
      }
      const nextOpen = !menu.classList.contains("is-open");
      closeMobileMenus();
      menu.classList.toggle("is-open", nextOpen);
      button.setAttribute("aria-expanded", String(nextOpen));
      if (menu.id === "workspace-mobile-menu") {
        document.querySelector(".app-shell")?.classList.toggle("menu-open", nextOpen);
      }
    });
  });

  document.querySelectorAll("[data-action='close-mobile-menu']").forEach((button) => {
    button.addEventListener("click", closeMobileMenus);
  });

  document.querySelectorAll("[data-mobile-menu] a, [data-mobile-menu] button").forEach((item) => {
    if (item.dataset.action === "toggle-mobile-menu") {
      return;
    }
    item.addEventListener("click", closeMobileMenus);
  });

  if (!mobileMenuKeydownBound) {
    mobileMenuKeydownBound = true;
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMobileMenus();
      }
    });
  }
}

export function bindShellEvents({ openAuth, closeAuth, signOut, authMode, submitAuth, registerApp, newCheck }) {
  document.querySelectorAll("[data-action='open-auth']").forEach((button) => {
    button.addEventListener("click", () => openAuth(button.dataset.mode || "signin"));
  });
  document.querySelectorAll("[data-action='close-auth']").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (element.classList.contains("modal-backdrop") && event.target.closest("[data-modal-stop]")) {
        return;
      }
      closeAuth();
    });
  });
  document.querySelectorAll("[data-action='auth-mode']").forEach((button) => {
    button.addEventListener("click", () => authMode(button.dataset.mode || "signin"));
  });
  document.querySelectorAll("[data-action='sign-out']").forEach((button) => {
    button.addEventListener("click", signOut);
  });
  document.querySelectorAll("[data-action='new-check-nav']").forEach((link) => {
    link.addEventListener("click", () => {
      if (newCheck) {
        newCheck();
      }
    });
  });
  const form = document.querySelector("[data-auth-form]");
  if (form) {
    form.addEventListener("submit", submitAuth);
  }
  const appRegistrationForm = document.querySelector("[data-app-registration-form]");
  if (appRegistrationForm && registerApp) {
    appRegistrationForm.addEventListener("submit", registerApp);
  }
  bindMobileMenus();
}
