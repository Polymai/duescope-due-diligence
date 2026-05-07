import { escapeHtml, setupState } from "../components.js";

const analysisSections = [
  {
    title: "Identity profile",
    detail: "Matching target name, aliases, website, and entity or person context."
  },
  {
    title: "Jurisdiction context",
    detail: "Checking country, sector, public-role, and operating footprint signals."
  },
  {
    title: "Sanctions and watchlists",
    detail: "Screening OFAC, UN, EU, UK, SECO, DFAT, World Bank, and local watchlist exposure."
  },
  {
    title: "PEP and state exposure",
    detail: "Reviewing public office, state ownership, associates, and family exposure."
  },
  {
    title: "Adverse media and legal",
    detail: "Scanning reputational, litigation, regulatory, and adverse news signals."
  },
  {
    title: "Scorecard and citations",
    detail: "Compiling risk score, confidence, findings, limitations, and sources."
  }
];

function sectionStatus(state, index) {
  if (!state.loading.analysis) {
    if (state.analysisStep >= analysisSections.length) {
      return { label: "Checked", className: "complete" };
    }
    return { label: "Ready", className: "ready" };
  }
  if (index < state.analysisStep) {
    return { label: "Checked", className: "complete" };
  }
  if (index === state.analysisStep) {
    const label = index === analysisSections.length - 1 && state.analysisElapsedSeconds > 20 ? "Waiting" : "Checking";
    return { label, className: "active" };
  }
  return { label: "Queued", className: "queued" };
}

function formatElapsed(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function analysisRuntime(state) {
  if (!state.loading.analysis) {
    return "Ready for the next source-backed check.";
  }
  const elapsed = formatElapsed(state.analysisElapsedSeconds || 0);
  if (state.analysisStep >= analysisSections.length - 1) {
    return `Waiting for analysis results - ${elapsed} elapsed.`;
  }
  return `Running source checks - ${elapsed} elapsed.`;
}

function renderActivityFeed(state) {
  const log = state.loading.analysis ? state.analysisLog || [] : [];
  return `
    <section class="card card-pad activity-card">
      <div class="card-title">
        <div>
          <h3>Live activity</h3>
          <p>High-level progress from the due diligence workflow.</p>
        </div>
      </div>
      ${log.length ? `
        <ol class="activity-feed">
          ${log.map((entry) => `
            <li class="activity-item">
              <time>${escapeHtml(entry.time)}</time>
              <div>
                <strong>${escapeHtml(entry.phase)}</strong>
                <p>${escapeHtml(entry.detail)}</p>
              </div>
            </li>
          `).join("")}
        </ol>
      ` : `
        <div class="activity-empty">
          <p>Run a check to see the live activity stream here.</p>
          <small>This shows operational progress and request phases, not private model reasoning.</small>
        </div>
      `}
    </section>
  `;
}

function selectedCheckDraft(state) {
  if (state.newCheckDraft) {
    return state.newCheckDraft;
  }
  const editId = state.route?.params?.edit;
  if (!editId) {
    return null;
  }
  const check = (state.checks || []).find((entry) => String(entry.id) === String(editId));
  if (!check) {
    return null;
  }
  return {
    targetName: check.target_name || "",
    targetUrl: check.target_url || "",
    jurisdiction: check.jurisdiction || "",
    checkType: check.check_type || "vendor",
    context: check.context || ""
  };
}

function selected(value, current) {
  return String(value) === String(current || "") ? "selected" : "";
}

const checkTypeConfig = {
  vendor: {
    targetLabel: "Vendor name",
    targetPlaceholder: "Acme Logistics GmbH",
    urlLabel: "Website or public URL",
    urlPlaceholder: "https://example.com",
    jurisdictionLabel: "Country, address, or primary jurisdiction",
    jurisdictionPlaceholder: "United States, Stockholm address, EU, Singapore",
    advancedLabel: "Advanced details",
    advancedHelp: "Add aliases, supplier scope, known concerns, beneficial ownership, sector exposure, or transaction context.",
    button: "Run vendor check"
  },
  investment: {
    targetLabel: "Investment target",
    targetPlaceholder: "Target company name",
    urlLabel: "Website or public URL",
    urlPlaceholder: "https://example.com",
    jurisdictionLabel: "Country, headquarters, or main operating jurisdiction",
    jurisdictionPlaceholder: "Germany, Brazil, Singapore",
    advancedLabel: "Advanced investment details",
    advancedHelp: "Add deal scope, ownership notes, sector exposure, known litigation, governance concerns, or commercial context.",
    button: "Run investment check"
  },
  partner: {
    targetLabel: "Partner name",
    targetPlaceholder: "Strategic partner or distributor",
    urlLabel: "Website or public URL",
    urlPlaceholder: "https://example.com",
    jurisdictionLabel: "Country, address, or operating jurisdiction",
    jurisdictionPlaceholder: "United Kingdom, Dubai, EU",
    advancedLabel: "Advanced partner details",
    advancedHelp: "Add partnership scope, aliases, expected activity, known concerns, market exposure, or ownership context.",
    button: "Run partner check"
  },
  customer: {
    targetLabel: "Customer name",
    targetPlaceholder: "Customer or account name",
    urlLabel: "Website or public URL",
    urlPlaceholder: "https://example.com",
    jurisdictionLabel: "Country, billing address, or primary jurisdiction",
    jurisdictionPlaceholder: "United States, UAE, Hong Kong",
    advancedLabel: "Advanced customer details",
    advancedHelp: "Add KYC scope, aliases, payment concerns, sector exposure, known adverse media, or onboarding context.",
    button: "Run customer check"
  },
  pep: {
    targetLabel: "Person name",
    targetPlaceholder: "Full name of public official or related person",
    hideUrl: true,
    jurisdictionLabel: "Country, residence, or public role",
    jurisdictionPlaceholder: "Country, ministry, role, or known public office",
    advancedLabel: "Roles, aliases, associates, and known concerns",
    advancedHelp: "Add public roles, former offices, close associates, family exposure, aliases, dates, or known allegations.",
    button: "Run PEP screening"
  },
  country: {
    targetLabel: "Country or jurisdiction",
    targetPlaceholder: "Brazil, United States, EU, Hong Kong",
    hideUrl: true,
    jurisdictionLabel: "Specific region, city, or scope",
    jurisdictionPlaceholder: "Optional: state, city, sector, or operating footprint",
    advancedLabel: "Country risk scope and known concerns",
    advancedHelp: "Add sector, supply chain, human rights, deforestation, corruption, security, or regulatory focus areas.",
    button: "Run country risk score"
  }
};

function currentCheckTypeConfig(checkType) {
  if (checkType === "portfolio") {
    return checkTypeConfig.investment;
  }
  return checkTypeConfig[checkType] || checkTypeConfig.vendor;
}

function renderUrlField(config, draft, blocked) {
  if (config.hideUrl) {
    return "";
  }
  return `
    <div class="field" data-check-url-field>
      <label for="target-url">${escapeHtml(config.urlLabel)}</label>
      <input class="input" id="target-url" name="targetUrl" type="url" placeholder="${escapeHtml(config.urlPlaceholder)}" value="${escapeHtml(draft?.targetUrl || "")}" ${blocked ? "disabled" : ""}>
    </div>
  `;
}

export function renderNewCheck(state) {
  const plan = state.entitlement?.plan;
  const blocked = state.checksLeft <= 0;
  const draft = selectedCheckDraft(state);
  const isEditing = Boolean(draft);
  const checkType = draft?.checkType || "vendor";
  const config = currentCheckTypeConfig(checkType);
  const hasContext = Boolean(String(draft?.context || "").trim());
  const advancedOpen = isEditing && hasContext;
  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>${isEditing ? "Edit search" : "New due diligence check"}</h1>
        <p>${isEditing ? "Add more context, aliases, locations, or known concerns and run a new analysis. The original report stays unchanged." : "Submit a target and context. DueScope runs source-backed research and writes the report."}</p>
      </div>
      <a class="button button-secondary" href="#/pricing">Manage plan</a>
    </section>
    ${blocked ? setupState(`Your ${plan?.name || "current"} plan has no checks left in this period. Upgrade or add a pay-as-you-go pack before running another check.`) : ""}
    <section class="report-grid new-check-grid">
      <div class="new-check-main">
        ${state.loading.analysis ? `
          <div class="card card-pad new-check-running-card" aria-live="polite">
            <button class="button button-primary button-full" type="button" disabled>Running analysis...</button>
          </div>
        ` : `
        <form class="card card-pad form-grid new-check-form" data-new-check-form>
          <div class="form-row">
            <div class="field">
              <label for="target-name">${escapeHtml(config.targetLabel)}</label>
              <input class="input" id="target-name" name="targetName" placeholder="${escapeHtml(config.targetPlaceholder)}" value="${escapeHtml(draft?.targetName || "")}" required ${blocked ? "disabled" : ""}>
            </div>
            ${renderUrlField(config, draft, blocked)}
          </div>
          <div class="form-row">
            <div class="field">
              <label for="jurisdiction">${escapeHtml(config.jurisdictionLabel)}</label>
              <input class="input" id="jurisdiction" name="jurisdiction" placeholder="${escapeHtml(config.jurisdictionPlaceholder)}" value="${escapeHtml(draft?.jurisdiction || "")}">
            </div>
            <div class="field">
              <label for="check-type">Check type</label>
              <select class="select" id="check-type" name="checkType" data-check-type-select>
                <option value="vendor" ${selected("vendor", checkType)}>Vendor</option>
                <option value="investment" ${selected("investment", checkType)}>Investment target</option>
                <option value="partner" ${selected("partner", checkType)}>Partner</option>
                <option value="customer" ${selected("customer", checkType)}>Customer</option>
                <option value="pep" ${selected("pep", checkType)}>PEP screening</option>
                <option value="country" ${selected("country", checkType)}>Country risk score</option>
              </select>
            </div>
          </div>
          <details class="advanced-details" ${advancedOpen ? "open" : ""}>
            <summary>
              <span>${escapeHtml(config.advancedLabel)}</span>
              <small>Optional</small>
            </summary>
            <div class="field">
              <label for="context">Details to include</label>
              <textarea class="textarea" id="context" name="context" placeholder="${escapeHtml(config.advancedHelp)}">${escapeHtml(draft?.context || "")}</textarea>
              <small>${escapeHtml(config.advancedHelp)} Do not paste confidential personal data.</small>
            </div>
          </details>
          <button class="button button-primary" type="submit" ${blocked ? "disabled" : ""}>
            ${isEditing ? "Run updated analysis" : escapeHtml(config.button)}
          </button>
        </form>
        `}
        ${renderActivityFeed(state)}
      </div>
      <aside class="card card-pad card-stack analysis-card">
        <div class="card-title">
          <div>
            <h3>Analysis path</h3>
            <p>Source-backed checks, identity review, risk scoring, and citations.</p>
            <span class="analysis-runtime">${escapeHtml(analysisRuntime(state))}</span>
          </div>
        </div>
        <div class="analysis-steps">
          ${analysisSections.map((section, index) => {
            const status = sectionStatus(state, index);
            return `
            <div class="analysis-step analysis-step-${status.className}">
              <div>
                <h3>Step ${index + 1}: ${section.title}</h3>
                <p>${section.detail}</p>
              </div>
              <span class="analysis-status">${status.label}</span>
            </div>
          `;
          }).join("")}
        </div>
      </aside>
    </section>
  `;
}

export function bindNewCheck({ onSubmit, onTypeChange }) {
  const form = document.querySelector("[data-new-check-form]");
  if (!form) {
    return;
  }
  form.addEventListener("submit", onSubmit);
  const typeSelect = form.querySelector("[data-check-type-select]");
  if (typeSelect && onTypeChange) {
    typeSelect.addEventListener("change", () => onTypeChange(typeSelect.value));
  }
}
