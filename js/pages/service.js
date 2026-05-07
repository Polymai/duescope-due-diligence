import { badge } from "../components.js";

const serviceAreas = [
  {
    label: "Identity profile",
    title: "Understand who or what is being screened",
    copy: "DueScope builds a concise profile from the supplied name, website, jurisdiction, public identifiers, sector context, aliases, and known concerns."
  },
  {
    label: "Watchlists",
    title: "Surface possible sanctions and restriction signals",
    copy: "Reports separate possible public-watchlist matches from confirmed findings, so reviewers can inspect source context before making a decision."
  },
  {
    label: "Country context",
    title: "Map jurisdiction and operating footprint risk",
    copy: "The jurisdiction view combines sanctions context, governance, corruption, human rights, conflict, criminality, poverty, and environmental pressure signals."
  },
  {
    label: "Scorecard",
    title: "Explain category-level risk",
    copy: "Legal, sanctions, PEP/state exposure, adverse media, financial durability, cyber/data protection, human rights, and environmental/sector exposure are scored separately with rationale."
  },
  {
    label: "Workflow",
    title: "Keep diligence repeatable",
    copy: "Teams can re-screen, edit search inputs, add targets to a watchlist, open history, export reports on eligible plans, and manage usage from one workspace."
  },
  {
    label: "Governance",
    title: "Preserve human review",
    copy: "DueScope is designed as decision support. High-risk, low-confidence, or identity-sensitive results should be reviewed by a qualified human before action."
  }
];

const checkTypes = [
  "Vendor and supplier intake",
  "Investment target review",
  "Partner and customer screening",
  "PEP and public-role exposure",
  "Country and operating-footprint checks",
  "Recurring watchlist re-screening"
];

export function renderService(state = {}) {
  return `
    <main class="service-page">
      <section class="service-hero">
        <div class="service-hero-copy">
          <div class="eyebrow">DueScope service overview</div>
          <h1>Source-backed diligence for teams that need a clear first-pass risk view.</h1>
          <p>DueScope helps commercial, compliance, procurement, and investment teams screen counterparties, understand key risk drivers, and document the basis for follow-up review.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#/pricing">View plans</a>
            ${state.session
              ? `<a class="button button-secondary" href="#/new">Run a check</a>`
              : `<button class="button button-secondary" type="button" data-action="open-auth" data-mode="signup">Start free</button>`}
          </div>
        </div>
        <aside class="service-hero-panel" aria-label="DueScope workflow summary">
          <div class="service-panel-top">
            <span>Report flow</span>
            ${badge("Human review ready", "success")}
          </div>
          <ol class="service-flow">
            <li><strong>1</strong><span>Submit target, URL, jurisdiction, and optional concerns.</span></li>
            <li><strong>2</strong><span>Review profile, sources, watchlist signals, and country context.</span></li>
            <li><strong>3</strong><span>Open the score rationale, recommendation, and follow-up actions.</span></li>
          </ol>
        </aside>
      </section>

      <section class="section-band service-band">
        <div class="section-inner">
          <div class="section-heading">
            <h2>What DueScope includes</h2>
            <p>A practical diligence workspace with structured reports, source review, scoring rationale, and plan-based controls.</p>
          </div>
          <div class="service-feature-grid">
            ${serviceAreas.map((area) => `
              <article class="card card-pad card-stack service-feature-card">
                <span>${area.label}</span>
                <h3>${area.title}</h3>
                <p>${area.copy}</p>
              </article>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="section-band">
        <div class="section-inner service-split">
          <div class="service-copy-block">
            <div class="eyebrow">Functions</div>
            <h2>Built around the checks customers actually run.</h2>
            <p>DueScope supports one-off screening, recurring review, internal history, report exports, and plan-based review controls. It is useful for early triage before deeper legal, compliance, or procurement work.</p>
          </div>
          <div class="card card-pad service-check-card">
            <h3>Supported checks</h3>
            <ul class="service-check-list">
              ${checkTypes.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
        </div>
      </section>

      <section class="section-band service-trust-band">
        <div class="section-inner service-trust">
          <div>
            <h2>Designed for accountable decisions</h2>
            <p>DueScope can reduce manual research time, but it does not replace legal advice, sanctions counsel, anti-bribery controls, privacy assessments, or final business approval. Reports should be treated as structured decision support.</p>
          </div>
          <a class="button button-secondary" href="#/agreement">Read service agreement</a>
        </div>
      </section>
    </main>
  `;
}
