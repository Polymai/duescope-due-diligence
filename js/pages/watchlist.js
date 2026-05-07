import { badge, emptyState, escapeHtml, formatCheckType, formatDate, riskBadge } from "../components.js";

function watchlistStatus(item) {
  if (!item.auto_screen_enabled) {
    return badge("Paused", "neutral");
  }
  if (item.last_status === "screening") {
    return badge("Screening", "warning");
  }
  if (item.last_status === "failed") {
    return badge("Failed", "danger");
  }
  return badge("Active", "success");
}

function nextRunText(item) {
  if (!item.auto_screen_enabled) {
    return "Paused";
  }
  return item.next_screen_at ? formatDate(item.next_screen_at) : "Not scheduled";
}

function renderWatchlistItem(item, loading) {
  const lastRisk = item.last_risk_score === null || item.last_risk_score === undefined
    ? badge("No run yet", "neutral")
    : riskBadge(item.last_risk_level, item.last_risk_score);
  const jurisdiction = item.display_jurisdiction || item.jurisdiction || "Jurisdiction not identified";
  return `
    <article class="watchlist-item">
      <div class="watchlist-header">
        <div class="watchlist-title">
          <h3>${escapeHtml(item.target_name)}</h3>
          <p>${escapeHtml(jurisdiction)} - ${escapeHtml(formatCheckType(item.check_type))}</p>
        </div>
        <div class="watchlist-badges">
          ${watchlistStatus(item)}
          ${lastRisk}
        </div>
      </div>
      <div class="watchlist-main">
        <div class="watchlist-meta">
          <span>Every ${Number(item.screening_interval_days || 30)} days</span>
          <span>Next: ${escapeHtml(nextRunText(item))}</span>
          <span>Last: ${item.last_screened_at ? formatDate(item.last_screened_at) : "Never"}</span>
        </div>
      </div>
      <div class="watchlist-actions">
        <button class="button button-primary" type="button" data-watchlist-screen="${escapeHtml(item.id)}" ${loading ? "disabled" : ""}>Screen now</button>
        ${item.last_report_id ? `<a class="button button-secondary" href="#/report/${escapeHtml(item.last_report_id)}">Open report</a>` : ""}
        <button class="button button-secondary" type="button" data-watchlist-toggle="${escapeHtml(item.id)}">${item.auto_screen_enabled ? "Pause" : "Resume"}</button>
        <button class="button button-ghost" type="button" data-watchlist-remove="${escapeHtml(item.id)}">Remove</button>
      </div>
    </article>
  `;
}

export function renderWatchlist(state) {
  const items = state.watchlistItems || [];
  const loading = state.loading.watchlist;
  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>Watchlist</h1>
        <p>Monitor entities or countries from completed risk reports and re-screen them from the same workspace.</p>
      </div>
      <a class="button button-primary" href="#/new">New check</a>
    </section>
    <section class="card card-pad card-stack">
      <div class="card-title">
        <div>
          <h3>Add from a risk report</h3>
          <p>Watchlist entries are created from completed reports so each monitored item starts with a reviewed target, jurisdiction, and baseline score.</p>
        </div>
        <div class="watchlist-help-actions">
          <a class="button button-secondary" href="#/history">Open history</a>
          <a class="button button-primary" href="#/new">Run a check</a>
        </div>
      </div>
    </section>
    <section class="card card-pad card-stack">
      <div class="card-title">
        <div>
          <h3>Monitored targets</h3>
          <p>${items.length ? `${items.length} active workspace item${items.length === 1 ? "" : "s"}.` : "No recurring screens yet."}</p>
        </div>
        ${loading ? badge("Working", "warning") : ""}
      </div>
      ${items.length ? `
        <div class="watchlist-list">
          ${items.map((item) => renderWatchlistItem(item, loading)).join("")}
        </div>
      ` : emptyState(
        "No watchlist items",
        "Open a completed risk report and use Add to watchlist to start recurring monitoring.",
        `<a class="button button-secondary" href="#/history">Open history</a>`
      )}
    </section>
  `;
}

export function bindWatchlist({ onScreen, onToggle, onRemove }) {
  document.querySelectorAll("[data-watchlist-screen]").forEach((button) => {
    button.addEventListener("click", () => onScreen(button.dataset.watchlistScreen));
  });
  document.querySelectorAll("[data-watchlist-toggle]").forEach((button) => {
    button.addEventListener("click", () => onToggle(button.dataset.watchlistToggle));
  });
  document.querySelectorAll("[data-watchlist-remove]").forEach((button) => {
    button.addEventListener("click", () => onRemove(button.dataset.watchlistRemove));
  });
}
