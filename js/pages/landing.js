import { badge, progressBar } from "../components.js";

export function renderLanding(state) {
  return `
    <main>
      <section class="landing-hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">Live source-backed diligence</div>
            <h1>DueScope Due Diligence</h1>
            <p>Screen vendors, acquisition targets, partners, customers, and PEP exposure with AI research, structured risk scoring, citations, and owner-scoped report history.</p>
            <div class="hero-actions">
              ${state.session
                ? `<a class="button button-primary" href="#/new">Run a check</a>`
                : `<button class="button button-primary" type="button" data-action="open-auth" data-mode="signup">Start free</button>`}
              <a class="button button-secondary" href="#/pricing">View plans</a>
            </div>
            <div class="hero-proof" aria-label="DueScope operating metrics">
              <div class="proof-item"><strong>3 min</strong><span>structured first-pass brief</span></div>
              <div class="proof-item"><strong>8 areas</strong><span>legal, sanctions, PEP, data protection, human rights, environment, finance, media</span></div>
              <div class="proof-item"><strong>100%</strong><span>owner-scoped report history</span></div>
            </div>
          </div>
          <aside class="risk-preview" aria-label="Sample risk report preview">
            <div class="preview-header">
              <div class="preview-title">
                <strong>Northbridge Components</strong>
                <span>Supplier risk brief</span>
              </div>
              ${badge("Human review advised", "warning")}
            </div>
            <div class="preview-row">
              <div class="score-orbit">
                <div><strong>68</strong><span>risk</span></div>
              </div>
              <div class="preview-bars">
                ${progressBar("Sanctions and watchlists", 78, 100, "danger")}
                ${progressBar("PEP and state exposure", 58, 100, "warning")}
                ${progressBar("Cyber/data protection", 34, 100)}
              </div>
            </div>
            <div class="card card-pad">
              <div class="card-title">
                <div>
                  <h3>Recommendation</h3>
                  <p>Proceed only with enhanced supplier controls, contract protections, and a focused legal review.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section class="section-band">
        <div class="section-inner">
          <div class="section-heading">
            <h2>Built for teams that need an answer before the meeting.</h2>
            <p>DueScope turns open-source research and account-owned history into repeatable decision support.</p>
          </div>
          <div class="feature-grid">
            <article class="card card-pad card-stack">
              <div class="eyebrow">Risk map</div>
              <h3>Category-level scoring</h3>
              <p class="muted">Legal, sanctions, PEP exposure, finance, cyber/data protection, human rights, environmental/sector, and reputation signals are scored separately before rolling into the overall rating.</p>
            </article>
            <article class="card card-pad card-stack">
              <div class="eyebrow">Sources</div>
              <h3>Reviewable citations</h3>
              <p class="muted">Reports retain source URLs and coverage quality so a human reviewer can see what the model relied on.</p>
            </article>
            <article class="card card-pad card-stack">
              <div class="eyebrow">Controls</div>
              <h3>Entitlements and billing</h3>
              <p class="muted">Usage, PDF export, and review controls are driven by backend plan state instead of client-side assumptions.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  `;
}
