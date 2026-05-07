import { emptyState, escapeHtml, formatCheckType, formatDate, riskBadge } from "../components.js";

export function renderHistory(state) {
  const checks = state.checks || [];
  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>Report history</h1>
        <p>Search prior checks and reopen complete risk reports.</p>
      </div>
      <a class="button button-primary" href="#/new">New check</a>
    </section>
    <section class="card card-pad card-stack">
      <div class="field">
        <label for="history-search">Search reports</label>
        <input class="input" id="history-search" data-history-search placeholder="Target, jurisdiction, check type, or status">
      </div>
      ${checks.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Type</th>
                <th>Requested</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody data-history-rows>
              ${checks.map((check) => `
                <tr data-history-row data-search="${escapeHtml([check.target_name, check.jurisdiction, check.check_type, check.status].join(" ").toLowerCase())}">
                  <td><strong>${escapeHtml(check.target_name)}</strong><div class="muted">${escapeHtml(check.jurisdiction || "No jurisdiction")}</div></td>
                  <td>${escapeHtml(formatCheckType(check.check_type))}</td>
                  <td>${formatDate(check.requested_at)}</td>
                  <td>${check.status === "completed" ? riskBadge(check.risk_level, check.risk_score) : "-"}</td>
                  <td>${check.confidence ?? "-"}</td>
                  <td><span class="badge badge-neutral">${escapeHtml(check.status)}</span></td>
                  <td>
                    <div class="table-actions">
                      ${check.report ? `<a class="button button-secondary" href="#/report/${check.report.id}">Open</a>` : `<span class="muted">Pending</span>`}
                      <button class="button button-ghost" type="button" data-history-rescreen="${escapeHtml(check.id)}">Re-screen</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : emptyState("No reports yet", "Completed diligence checks will appear here with risk badges and source coverage.", `<a class="button button-primary" href="#/new">Run a check</a>`)}
    </section>
  `;
}

export function bindHistory({ onRescreen } = {}) {
  const input = document.querySelector("[data-history-search]");
  if (input) {
    input.addEventListener("input", () => {
      const value = input.value.trim().toLowerCase();
      document.querySelectorAll("[data-history-row]").forEach((row) => {
        row.classList.toggle("hidden", value && !row.dataset.search.includes(value));
      });
    });
  }
  document.querySelectorAll("[data-history-rescreen]").forEach((button) => {
    button.addEventListener("click", () => onRescreen?.(button.dataset.historyRescreen));
  });
}
