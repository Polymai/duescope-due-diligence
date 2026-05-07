import { emptyState, formatCheckType, formatDate, metricCard, riskBadge } from "../components.js";

export function renderDashboard(state) {
  const checks = state.checks || [];
  const completed = checks.filter((check) => check.status === "completed").length;
  const latest = checks.slice(0, 5);
  const avgRisk = completed
    ? Math.round(checks.filter((check) => check.risk_score !== null && check.risk_score !== undefined).reduce((sum, check) => sum + Number(check.risk_score || 0), 0) / completed)
    : 0;

  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>Diligence dashboard</h1>
        <p>Track checks, plan usage, and the latest target risk posture.</p>
      </div>
      <a class="button button-primary" href="#/new">Run new check</a>
    </section>
    <section class="stats-grid">
      ${metricCard("Checks left", state.checksLeft ?? 0, "Current billing period")}
      ${metricCard("Checks run", state.usage?.checks_used || 0, "Successful reports consume usage")}
      ${metricCard("Average risk", completed ? avgRisk : "n/a", completed ? "Across completed reports" : "No completed reports yet")}
      ${metricCard("Plan", state.entitlement?.plan?.name || "Free", state.billing?.status || "active")}
    </section>
    <section class="card card-pad card-stack">
      <div class="card-title">
        <div>
          <h3>Latest reports</h3>
          <p>Recent due diligence runs with risk score, confidence, and source coverage.</p>
        </div>
        <a class="button button-secondary" href="#/history">View history</a>
      </div>
      ${latest.length ? `
        <div class="list-stack">
          ${latest.map((check) => `
            <a class="report-list-item" href="${check.report ? `#/report/${check.report.id}` : "#/history"}">
              <div>
                <h3>${check.target_name}</h3>
                <p>${formatCheckType(check.check_type)} ${check.jurisdiction ? `in ${check.jurisdiction}` : ""} - ${formatDate(check.requested_at)}</p>
              </div>
              <div class="table-actions">
                ${check.status === "completed" ? riskBadge(check.risk_level, check.risk_score) : `<span class="badge badge-neutral">${check.status}</span>`}
              </div>
            </a>
          `).join("")}
        </div>
      ` : emptyState("No checks yet", "Run your first DueScope check to create a persistent, source-backed risk report.", `<a class="button button-primary" href="#/new">Start first check</a>`)}
    </section>
  `;
}
