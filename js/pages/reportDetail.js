import { APP_CONFIG } from "../config.js";
import { badge, emptyState, escapeHtml, formatCheckType, formatDate, progressBar, riskBadge, setupState } from "../components.js";

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => {
      if (entry && typeof entry === "object") {
        return { category: key, ...entry };
      }
      return { category: key, score: entry };
    });
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function parseObject(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function parseStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function parseJsonObject(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      // Try the next candidate.
    }
  }
  return null;
}

function extractJsonStringField(text, key) {
  if (!text || typeof text !== "string") {
    return "";
  }
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s");
  const match = text.match(pattern);
  if (!match) {
    return "";
  }
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch (_error) {
    return match[1];
  }
}

function extractJsonNumberField(text, key) {
  if (!text || typeof text !== "string") {
    return null;
  }
  const pattern = new RegExp(`"${key}"\\s*:\\s*(\\d+)`, "s");
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function recoverEmbeddedReport(report) {
  const embedded = parseJsonObject(report.summary);
  if (embedded?.summary) {
    return {
      ...report,
      ...embedded,
      id: report.id,
      check_id: report.check_id,
      user_id: report.user_id,
      created_at: report.created_at,
      updated_at: report.updated_at,
      full_report: report.full_report
    };
  }

  const recoveredSummary = extractJsonStringField(report.summary, "summary");
  if (!recoveredSummary) {
    return report;
  }

  const recovered = {
    summary: recoveredSummary,
    recommendation: extractJsonStringField(report.summary, "recommendation") || report.recommendation,
    risk_score: extractJsonNumberField(report.summary, "risk_score") ?? report.risk_score,
    risk_level: extractJsonStringField(report.summary, "risk_level") || report.risk_level,
    confidence: extractJsonNumberField(report.summary, "confidence") ?? report.confidence,
    source_coverage: extractJsonStringField(report.summary, "source_coverage") || report.source_coverage
  };
  return { ...report, ...recovered };
}

function isInternalRecoveryLimitation(item) {
  const text = String(item || "").toLowerCase();
  return text.includes("json-like text")
    || text.includes("required recovery before storage")
    || text.includes("could not be parsed into the expected duescope schema");
}

function sourceMeta(source) {
  const parts = [
    source.publisher,
    source.type,
    source.category,
    source.published_at || source.date
  ].filter(Boolean);
  return parts.length ? `<div class="source-meta">${parts.map(escapeHtml).join(" - ")}</div>` : "";
}

function displayLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileConfidenceVariant(confidence) {
  const key = String(confidence || "").toLowerCase();
  if (key === "high") return "success";
  if (key === "moderate") return "warning";
  return "neutral";
}

function targetProfileFromReport(report, check) {
  const profile = parseObject(report.target_profile) || parseObject(report.targetProfile) || {};
  const products = parseStringArray(profile.products_services || profile.productsServices || profile.products || profile.services);
  const footprint = parseStringArray(profile.operating_footprint || profile.operatingFootprint || profile.footprint || profile.countries);
  const aliases = parseStringArray(profile.aliases || profile.names || profile.known_as || profile.knownAs);
  const hasStructuredProfile = Boolean(
    profile.description ||
    profile.industry ||
    profile.line_of_business ||
    profile.lineOfBusiness ||
    profile.company_type ||
    profile.companyType ||
    products.length ||
    footprint.length ||
    aliases.length
  );
  return {
    targetName: profile.target_name || profile.targetName || check?.target_name || "Target",
    entityType: profile.entity_type || profile.entityType || (hasStructuredProfile ? "company" : "unknown"),
    description: profile.description || profile.summary || "",
    industry: profile.industry || profile.sector || "",
    lineOfBusiness: profile.line_of_business || profile.lineOfBusiness || profile.business || "",
    products,
    footprint,
    companyType: profile.company_type || profile.companyType || profile.ownership_type || profile.ownershipType || "",
    aliases,
    website: profile.website || profile.url || check?.target_url || "",
    confidence: profile.confidence || (hasStructuredProfile ? "moderate" : "low"),
    sourceNote: profile.source_note || profile.sourceNote || profile.rationale || (hasStructuredProfile
      ? "Profile derived from public-source research returned for this report."
      : "Structured target profile was not generated for this older report. Use Edit search or Re-screen to generate company profile details.")
  };
}

function renderProfileField(label, value) {
  if (!value) {
    return "";
  }
  return `
    <div class="target-profile-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderProfileChips(label, values) {
  if (!values.length) {
    return "";
  }
  return `
    <div class="target-profile-chip-group">
      <span>${escapeHtml(label)}</span>
      <div>
        ${values.slice(0, 8).map((value) => `<small>${escapeHtml(value)}</small>`).join("")}
      </div>
    </div>
  `;
}

function renderTargetProfile(report, check) {
  const profile = targetProfileFromReport(report, check);
  const description = profile.description || "Profile not confidently identified from this report.";
  const websiteUrl = profile.website && /^https?:\/\//i.test(profile.website) ? profile.website : "";
  return `
    <article class="card card-pad card-stack target-profile-card">
      <div class="card-title">
        <div>
          <h3>Target profile</h3>
          <p>What the target appears to do, based on available public-source context.</p>
        </div>
        ${badge(`Profile ${displayLabel(profile.confidence || "low")}`, profileConfidenceVariant(profile.confidence))}
      </div>
      <div class="target-profile-body">
        <div class="target-profile-summary">
          <strong>${escapeHtml(profile.targetName)}</strong>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="target-profile-grid">
          ${renderProfileField("Entity type", displayLabel(profile.entityType))}
          ${renderProfileField("Industry", profile.industry)}
          ${renderProfileField("Line of business", profile.lineOfBusiness)}
          ${renderProfileField("Company type", profile.companyType)}
          ${websiteUrl ? `
            <div class="target-profile-field">
              <span>Website</span>
              <strong><a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noreferrer">${escapeHtml(websiteUrl)}</a></strong>
            </div>
          ` : ""}
        </div>
        ${renderProfileChips("Products/services", profile.products)}
        ${renderProfileChips("Operating footprint", profile.footprint)}
        ${renderProfileChips("Known aliases", profile.aliases)}
        <div class="target-profile-source-note">
          <strong>Source note</strong>
          <span>${escapeHtml(profile.sourceNote)}</span>
        </div>
      </div>
    </article>
  `;
}

function sourceKey(source) {
  return String(source?.url || source?.title || "").trim().toLowerCase().replace(/\/$/, "");
}

function dedupeSources(sources) {
  const byKey = new Map();
  sources.filter((source) => source?.url || source?.title).forEach((source) => {
    const key = sourceKey(source);
    if (key && !byKey.has(key)) {
      byKey.set(key, source);
    }
  });
  return Array.from(byKey.values());
}

const entitySuffixTokens = new Set(["ab", "ag", "as", "bv", "co", "company", "corp", "corporation", "gmbh", "group", "holding", "holdings", "inc", "incorporated", "international", "limited", "llc", "ltd", "plc", "sa", "spa", "the"]);

function normalizeIdentityText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityTokens(value) {
  return normalizeIdentityText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !entitySuffixTokens.has(token));
}

function sanctionsItemText(item) {
  const evidenceText = Array.isArray(item?.evidence)
    ? item.evidence.map((entry) => [entry?.term, entry?.snippet].filter(Boolean).join(" ")).join(" ")
    : "";
  const matchText = Array.isArray(item?.matches)
    ? item.matches.map((match) => Array.isArray(match?.names) ? match.names.join(" ") : "").join(" ")
    : "";
  return [item?.list_name, item?.authority, item?.jurisdiction, item?.notes, evidenceText, matchText].filter(Boolean).join(" ");
}

function sanctionsItemLooksLikeMismatch(item) {
  const text = normalizeIdentityText(sanctionsItemText(item));
  return [
    "false positive",
    "identity mismatch",
    "not a match",
    "not related",
    "not the same",
    "different entity",
    "different person",
    "unrelated to",
    "unrelated entity",
    "unrelated person",
    "does not match"
  ].some((phrase) => text.includes(phrase));
}

function sanctionsItemMentionsSingleTokenTarget(item, targetName) {
  const targetTokens = identityTokens(targetName);
  if (targetTokens.length !== 1) {
    return true;
  }
  const evidenceText = Array.isArray(item?.evidence)
    ? item.evidence.map((entry) => [entry?.term, entry?.snippet].filter(Boolean).join(" ")).join(" ")
    : "";
  const matchText = Array.isArray(item?.matches)
    ? item.matches.map((match) => Array.isArray(match?.names) ? match.names.join(" ") : "").join(" ")
    : "";
  const textForMatching = item?.method === "sanctions_network_api"
    ? [evidenceText, matchText].join(" ")
    : sanctionsItemText(item);
  return new Set(identityTokens(textForMatching)).has(targetTokens[0]);
}

function hasSanctionsSignal(item, targetName = "") {
  if (sanctionsItemLooksLikeMismatch(item) || !sanctionsItemMentionsSingleTokenTarget(item, targetName)) {
    return false;
  }
  const result = String(item?.result || "").toLowerCase();
  const matchCount = Number(item?.match_count ?? (Array.isArray(item?.matches) ? item.matches.length : item?.matches) ?? 0);
  return result.includes("confirm")
    || result.includes("possible")
    || matchCount > 0
    || item?.provider_status === "unavailable"
    || (Array.isArray(item?.evidence) && item.evidence.length > 0);
}

function fallbackSources(report, sanctionsScreening, findings, targetName = "") {
  const findingSources = findings
    .filter((finding) => finding?.source_url)
    .map((finding) => ({
      title: finding.title || "Finding source",
      url: finding.source_url,
      publisher: finding.category || "",
      type: "Finding evidence",
      category: finding.category || "Risk finding",
      relevance: finding.detail || finding.recommendation || "Referenced by the model finding."
    }));
  const sanctionsSources = sanctionsScreening
    .filter((item) => item?.url && hasSanctionsSignal(item, targetName))
    .map((item) => ({
      title: item.list_name || item.name || "Sanctions screening source",
      url: item.url,
      publisher: item.authority || "",
      type: "Sanctions/watchlist",
      category: item.jurisdiction || "Sanctions screening",
      relevance: item.notes || "Official list used for list-level screening."
    }));
  return dedupeSources([...findingSources, ...sanctionsSources]).map((source) => ({
    ...source,
    relevance: source.relevance || `Fallback source shown because the report did not store a source list for ${report.source_coverage || "this"} coverage.`
  }));
}

function categoryName(category) {
  return category.name || category.category || category.label || "Category";
}

function categoryScore(category) {
  const raw = category.score ?? category.value ?? category.risk_score ?? category.percentage ?? 0;
  const numeric = typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace("%", ""));
  return Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0));
}

const categoryHelp = {
  "legal/regulatory": "Exposure from lawsuits, regulatory actions, licensing issues, compliance breaches, or public enforcement records.",
  "sanctions/watchlists": "Signals from sanctions, restricted-party, terrorism, export-control, or other official/watchlist screening.",
  "pep/state exposure": "Connections to politically exposed persons, state ownership/control, government contracting, or public-sector influence.",
  "adverse media/reputation": "Negative news, allegations, controversies, stakeholder complaints, or reputational concerns from public sources.",
  "financial/commercial durability": "Business viability, solvency, payment reliability, market concentration, ownership opacity, or financial stress indicators.",
  "cyber/data protection": "Cyber incidents, data breaches, privacy/GDPR exposure, weak security controls, or sensitive-data handling risks.",
  "cyber/operational exposure": "Cyber incidents, data protection weaknesses, operational disruption, fraud controls, or resilience gaps.",
  "human rights": "Forced labor, labor rights, conflict exposure, modern slavery, community harm, or other human-rights concerns.",
  "environmental/sector exposure": "Environmental impact and sensitive-sector exposure such as mining, gold, cobalt, lithium, rare earths, batteries, oil/gas, defense, surveillance, or dual-use technology."
};

function normalizeCategoryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

function categoryDescription(category) {
  const name = categoryName(category);
  return category.description || category.explanation || categoryHelp[normalizeCategoryKey(name)] || "Risk contribution for this diligence category.";
}

function categoryRowId(category) {
  return `category-${normalizeCategoryKey(categoryName(category)).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "score"}`;
}

function categoryProgressBar(category) {
  const label = categoryName(category);
  const value = categoryScore(category);
  const max = 100;
  const pct = Math.max(0, Math.min(100, max ? (Number(value) / Number(max)) * 100 : 0));
  const description = categoryDescription(category);
  const rationale = category.evidence || category.rationale || "No category-specific rationale was returned. Treat this score as limited and review the underlying findings and sources.";
  const rowId = categoryRowId(category);
  return `
    <div class="scorecard-category">
      <button class="scorecard-category-toggle" type="button" data-category-toggle="${escapeHtml(rowId)}" aria-expanded="false" aria-controls="${escapeHtml(rowId)}">
        <div class="progress category-progress">
          <div class="progress-label">
            <span class="category-label">
              <span>${escapeHtml(label)}</span>
              <span class="info-dot" aria-hidden="true" data-tooltip="${escapeHtml(description)}">?</span>
            </span>
            <span class="category-score">${Math.round(pct)}%</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${escapeHtml(riskTone(value))}" style="width: ${pct}%"></div></div>
        </div>
        <span class="category-expand-label">View rationale</span>
      </button>
      <div class="scorecard-category-detail" id="${escapeHtml(rowId)}" hidden>
        <div>
          <strong>What this measures</strong>
          <p>${escapeHtml(description)}</p>
        </div>
        <div>
          <strong>Why this score</strong>
          <p>${escapeHtml(rationale)}</p>
        </div>
      </div>
    </div>
  `;
}

function riskTone(score) {
  const numeric = Number(score || 0);
  if (numeric >= 65) return "danger";
  if (numeric >= 40) return "warning";
  return "";
}

function scoreClass(score) {
  const numeric = Number(score || 0);
  if (numeric >= 85) return "critical";
  if (numeric >= 65) return "high";
  if (numeric >= 40) return "medium";
  return "low";
}

const UNKNOWN_COUNTRY_PATTERN = /^(unknown|not identified|not available|n\/a|none)$/i;

const countryCentroids = {
  afghanistan: { label: "Afghanistan", lat: 33.9, lng: 67.7, zoom: 5 },
  albania: { label: "Albania", lat: 41.2, lng: 20.2, zoom: 6 },
  algeria: { label: "Algeria", lat: 28.0, lng: 1.7, zoom: 4 },
  angola: { label: "Angola", lat: -11.2, lng: 17.9, zoom: 5 },
  argentina: { label: "Argentina", lat: -38.4, lng: -63.6, zoom: 3 },
  australia: { label: "Australia", lat: -25.3, lng: 133.8, zoom: 3 },
  austria: { label: "Austria", lat: 47.6, lng: 14.1, zoom: 5 },
  belarus: { label: "Belarus", lat: 53.7, lng: 27.9, zoom: 5 },
  belgium: { label: "Belgium", lat: 50.6, lng: 4.7, zoom: 6 },
  brazil: { label: "Brazil", lat: -14.2, lng: -51.9, zoom: 3 },
  bangladesh: { label: "Bangladesh", lat: 23.7, lng: 90.4, zoom: 6 },
  cambodia: { label: "Cambodia", lat: 12.6, lng: 104.9, zoom: 6 },
  cameroon: { label: "Cameroon", lat: 7.4, lng: 12.4, zoom: 5 },
  canada: { label: "Canada", lat: 56.1, lng: -106.3, zoom: 3 },
  chile: { label: "Chile", lat: -35.7, lng: -71.5, zoom: 3 },
  china: { label: "China", lat: 35.9, lng: 104.2, zoom: 4 },
  colombia: { label: "Colombia", lat: 4.6, lng: -74.1, zoom: 5 },
  cuba: { label: "Cuba", lat: 21.5, lng: -79.4, zoom: 5 },
  "cote d ivoire": { label: "Cote d'Ivoire", lat: 7.5, lng: -5.5, zoom: 6 },
  denmark: { label: "Denmark", lat: 56.2, lng: 9.5, zoom: 6 },
  egypt: { label: "Egypt", lat: 26.8, lng: 30.8, zoom: 5 },
  estonia: { label: "Estonia", lat: 58.6, lng: 25.0, zoom: 6 },
  ethiopia: { label: "Ethiopia", lat: 9.1, lng: 40.5, zoom: 5 },
  finland: { label: "Finland", lat: 61.9, lng: 25.7, zoom: 5 },
  france: { label: "France", lat: 46.2, lng: 2.2, zoom: 5 },
  germany: { label: "Germany", lat: 51.2, lng: 10.4, zoom: 5 },
  ghana: { label: "Ghana", lat: 7.9, lng: -1.0, zoom: 6 },
  "hong kong": { label: "Hong Kong", lat: 22.3, lng: 114.2, zoom: 10 },
  india: { label: "India", lat: 20.6, lng: 78.9, zoom: 4 },
  indonesia: { label: "Indonesia", lat: -2.5, lng: 118.0, zoom: 4 },
  iran: { label: "Iran", lat: 32.4, lng: 53.7, zoom: 5 },
  iraq: { label: "Iraq", lat: 33.2, lng: 43.7, zoom: 5 },
  ireland: { label: "Ireland", lat: 53.4, lng: -8.2, zoom: 6 },
  italy: { label: "Italy", lat: 41.9, lng: 12.6, zoom: 5 },
  japan: { label: "Japan", lat: 36.2, lng: 138.3, zoom: 5 },
  kenya: { label: "Kenya", lat: 0.0, lng: 37.9, zoom: 5 },
  latvia: { label: "Latvia", lat: 56.9, lng: 24.6, zoom: 6 },
  lithuania: { label: "Lithuania", lat: 55.2, lng: 23.9, zoom: 6 },
  malaysia: { label: "Malaysia", lat: 4.2, lng: 101.9, zoom: 5 },
  mexico: { label: "Mexico", lat: 23.6, lng: -102.5, zoom: 4 },
  morocco: { label: "Morocco", lat: 31.8, lng: -7.1, zoom: 5 },
  myanmar: { label: "Myanmar", lat: 21.9, lng: 96.0, zoom: 5 },
  netherlands: { label: "Netherlands", lat: 52.1, lng: 5.3, zoom: 6 },
  nigeria: { label: "Nigeria", lat: 9.1, lng: 8.7, zoom: 5 },
  "north korea": { label: "North Korea", lat: 40.3, lng: 127.5, zoom: 6 },
  norway: { label: "Norway", lat: 60.5, lng: 8.5, zoom: 5 },
  pakistan: { label: "Pakistan", lat: 30.4, lng: 69.3, zoom: 5 },
  philippines: { label: "Philippines", lat: 12.9, lng: 122.8, zoom: 5 },
  poland: { label: "Poland", lat: 51.9, lng: 19.1, zoom: 5 },
  portugal: { label: "Portugal", lat: 39.4, lng: -8.2, zoom: 6 },
  russia: { label: "Russia", lat: 61.5, lng: 105.3, zoom: 3 },
  "saudi arabia": { label: "Saudi Arabia", lat: 23.9, lng: 45.1, zoom: 5 },
  serbia: { label: "Serbia", lat: 44.0, lng: 20.8, zoom: 6 },
  singapore: { label: "Singapore", lat: 1.35, lng: 103.82, zoom: 10 },
  "south korea": { label: "South Korea", lat: 36.5, lng: 127.8, zoom: 6 },
  "south africa": { label: "South Africa", lat: -30.6, lng: 22.9, zoom: 5 },
  spain: { label: "Spain", lat: 40.5, lng: -3.7, zoom: 5 },
  sweden: { label: "Sweden", lat: 60.1, lng: 18.6, zoom: 5 },
  switzerland: { label: "Switzerland", lat: 46.8, lng: 8.2, zoom: 6 },
  syria: { label: "Syria", lat: 34.8, lng: 38.9, zoom: 6 },
  thailand: { label: "Thailand", lat: 15.9, lng: 100.9, zoom: 5 },
  turkey: { label: "Turkey", lat: 39.0, lng: 35.2, zoom: 5 },
  ukraine: { label: "Ukraine", lat: 48.4, lng: 31.2, zoom: 5 },
  "united arab emirates": { label: "United Arab Emirates", lat: 23.4, lng: 53.8, zoom: 6 },
  "united kingdom": { label: "United Kingdom", lat: 55.4, lng: -3.4, zoom: 5 },
  "united states": { label: "United States", lat: 39.8, lng: -98.6, zoom: 3 },
  venezuela: { label: "Venezuela", lat: 6.4, lng: -66.6, zoom: 5 },
  vietnam: { label: "Vietnam", lat: 14.1, lng: 108.3, zoom: 5 },
  zimbabwe: { label: "Zimbabwe", lat: -19.0, lng: 29.2, zoom: 6 },
  "european union": { label: "European Union", lat: 50.1, lng: 9.2, zoom: 4 }
};

const countryAliases = {
  america: "united states",
  brasil: "brazil",
  britain: "united kingdom",
  deutschland: "germany",
  eu: "european union",
  europeanunion: "european union",
  "ivory coast": "cote d ivoire",
  "great britain": "united kingdom",
  nederland: "netherlands",
  "north america": "united states",
  "people s republic of china": "china",
  "prc": "china",
  schweiz: "switzerland",
  sverige: "sweden",
  uae: "united arab emirates",
  uk: "united kingdom",
  usa: "united states",
  us: "united states",
  "u s": "united states",
  "u s a": "united states",
  "united states of america": "united states"
};

function normalizeCountryKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(the|republic of|federation|kingdom of|state of)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const countryLookupEntries = Object.entries({
  ...Object.fromEntries(Object.keys(countryCentroids).map((key) => [key, key])),
  ...countryAliases
}).sort((a, b) => b[0].length - a[0].length);

function canonicalCountryKey(value) {
  const key = normalizeCountryKey(value);
  return countryAliases[key] || key;
}

function countryKeyFromText(value) {
  const normalized = normalizeCountryKey(value);
  if (!normalized) {
    return "";
  }
  const direct = canonicalCountryKey(normalized);
  if (countryCentroids[direct]) {
    return direct;
  }
  const padded = ` ${normalized} `;
  const match = countryLookupEntries.find(([alias]) => padded.includes(` ${alias} `));
  return match ? match[1] : "";
}

function resolveCountryLocation(countryRisk, check) {
  const country = String(countryRisk.country || countryRisk.location_label || "").trim();
  const values = [
    country,
    countryRisk.location_label,
    check?.jurisdiction,
    check?.check_type === "country" ? check?.target_name : "",
    check?.context
  ].filter(Boolean);

  for (const value of values) {
    const parts = String(value)
      .split(/[,;/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .reverse();
    for (const part of [String(value), ...parts]) {
      const key = countryKeyFromText(part);
      if (key && countryCentroids[key]) {
        return { ...countryCentroids[key], key, hasLocation: true };
      }
    }
  }

  return {
    label: country && !UNKNOWN_COUNTRY_PATTERN.test(country) ? country : "Country not identified",
    lat: 20,
    lng: 0,
    zoom: 1,
    hasLocation: false
  };
}

function countryRiskScore(countryRisk, report, location) {
  if (!location.hasLocation && UNKNOWN_COUNTRY_PATTERN.test(String(countryRisk.country || ""))) {
    return null;
  }
  const raw = countryRisk.score ?? countryRisk.risk_score ?? report.risk_score;
  const score = Number(raw);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

const jurisdictionFactorLabels = [
  "Sanctions/export controls",
  "Corruption/bribery",
  "Crime/security",
  "Human rights/labor",
  "Environmental/deforestation",
  "Poverty/social stability",
  "Rule of law/regulatory predictability"
];

function normalizeJurisdictionFactorKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ");
}

function countryRiskFactors(countryRisk) {
  const rawFactors = parseArray(countryRisk.risk_factors || countryRisk.riskFactors || countryRisk.factors);
  const hasRawFactors = rawFactors.length > 0;
  return jurisdictionFactorLabels.map((label) => {
    const key = normalizeJurisdictionFactorKey(label);
    const raw = rawFactors.find((item) => {
      const name = normalizeJurisdictionFactorKey(item.factor || item.name || item.category);
      return name && (name === key || name.includes(key) || key.includes(name));
    });
    if (!raw) {
      return {
        factor: label,
        score: null,
        rationale: hasRawFactors
          ? "No separate rationale was returned for this factor."
          : "Re-screen this report to generate a separate score for this factor."
      };
    }
    const numeric = Number(raw.score ?? raw.value ?? raw.risk_score);
    return {
      factor: label,
      score: Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : null,
      rationale: raw.rationale || raw.evidence || raw.reason || "No separate rationale was returned for this factor."
    };
  });
}

function jurisdictionFactorRow(factor) {
  const score = factor.score;
  const hasScore = Number.isFinite(score);
  const pct = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  return `
    <div class="jurisdiction-factor-row">
      <div class="jurisdiction-factor-top">
        <strong>${escapeHtml(factor.factor)}</strong>
        <span>${hasScore ? `${Math.round(pct)}%` : "Needs re-screen"}</span>
      </div>
      <div class="jurisdiction-factor-track" aria-hidden="true">
        <div class="jurisdiction-factor-fill ${hasScore ? escapeHtml(riskTone(pct)) : "neutral"}" style="width: ${hasScore ? pct : 0}%"></div>
      </div>
      <p>${escapeHtml(factor.rationale)}</p>
    </div>
  `;
}

function markerTone(level, score, sanctioned) {
  if (sanctioned || String(level || "").toLowerCase() === "critical" || Number(score) >= 85) {
    return "critical";
  }
  if (String(level || "").toLowerCase() === "high" || Number(score) >= 65) {
    return "high";
  }
  if (String(level || "").toLowerCase() === "medium" || Number(score) >= 40) {
    return "medium";
  }
  return "low";
}

function renderCountryMap(countryRisk, location, score, level) {
  const sanctioned = Boolean(countryRisk.sanctioned);
  const tone = markerTone(level, score, sanctioned);
  const markerLabel = score === null ? "" : String(Math.round(score));
  return `
    <div class="osm-map-shell">
      <div
        class="osm-country-map"
        data-country-map
        data-has-location="${location.hasLocation ? "true" : "false"}"
        data-country="${escapeHtml(location.label)}"
        data-lat="${location.lat}"
        data-lng="${location.lng}"
        data-zoom="${location.zoom}"
        data-score="${markerLabel}"
        data-tone="${escapeHtml(tone)}"
        aria-label="OpenStreetMap country risk location for ${escapeHtml(location.label)}"
      >
        <div class="map-fallback">
          <strong>${escapeHtml(location.hasLocation ? location.label : "Country not identified")}</strong>
          <span>${location.hasLocation ? "Loading OpenStreetMap tiles..." : "Add a country, jurisdiction, or address to place the marker."}</span>
          <small>Tiles: OpenStreetMap contributors</small>
        </div>
      </div>
      <div class="map-caption">
        <strong>${escapeHtml(location.label)}</strong>
        <span>${sanctioned ? "Sanctioned jurisdiction signal" : "Country, address, or operating footprint"}</span>
      </div>
    </div>
  `;
}

function renderCountryRisk(report, check, countryRisk) {
  const location = resolveCountryLocation(countryRisk, check);
  const country = location.hasLocation ? location.label : "Not identified";
  const score = countryRiskScore(countryRisk, report, location);
  const level = countryRisk.risk_level || scoreClass(score);
  const sanctioned = Boolean(countryRisk.sanctioned);
  const confidence = Math.max(0, Math.min(100, Number(countryRisk.residence_confidence || 0)));
  const sanctionsSummary = countryRisk.sanctions_summary || "No country sanctions summary was returned.";
  const derivedFrom = countryRisk.derived_from || "Supplied address, jurisdiction, operating footprint, and sanctions context.";
  const rationale = countryRisk.rationale || "Country risk was inferred from the target jurisdiction and public-source coverage.";
  const factors = countryRiskFactors(countryRisk);
  return `
    <article class="card card-pad card-stack country-risk-card">
      <div class="card-title">
        <div>
          <h3>Jurisdiction risk</h3>
          <p>Composite country-level risk across sanctions, governance, security, rights, environment, and stability.</p>
        </div>
        ${score === null ? badge("Country not identified", "neutral") : riskBadge(level, score)}
      </div>
      ${renderCountryMap({ ...countryRisk, country }, location, score, level)}
      <div class="country-risk-grid">
        ${score === null
          ? `<div class="map-risk-empty"><strong>Country score unavailable</strong><span>Run a country risk score check or add a country/address to improve this section.</span></div>`
          : progressBar("Composite jurisdiction score", score, 100, riskTone(score))}
        <div class="country-risk-facts">
          ${sanctioned ? badge("Sanctioned country signal", "danger") : ""}
          <span><strong>Sanctions:</strong> ${escapeHtml(sanctionsSummary)}</span>
          <span><strong>Location confidence:</strong> ${confidence}%</span>
          <span><strong>Basis:</strong> ${escapeHtml(derivedFrom)}</span>
        </div>
        <div class="country-risk-rationale">
          <strong>Rationale</strong>
          <span>${escapeHtml(rationale)}</span>
        </div>
        <div class="jurisdiction-factors">
          <div class="jurisdiction-factors-heading">
            <strong>Factor breakdown</strong>
            <span>Inputs behind the composite score</span>
          </div>
          ${factors.map(jurisdictionFactorRow).join("")}
        </div>
      </div>
    </article>
  `;
}

function derivedFindings(report, countryRisk, sanctionsScreening, categories, targetName = "") {
  const score = Number(report.risk_score || 0);
  const findings = [];
  const sanctionsSignals = sanctionsScreening.filter((item) => hasSanctionsSignal(item, targetName));
  sanctionsSignals.slice(0, 3).forEach((item) => {
    findings.push({
      title: item.result === "confirmed_match" ? "Confirmed sanctions screening signal" : "Sanctions screening signal requires review",
      category: "Sanctions/watchlists",
      severity: item.result === "confirmed_match" ? "critical" : "high",
      detail: `${item.list_name || "Sanctions list"} returned ${item.result || "a screening signal"} with ${Number(item.match_count || 0)} reported match${Number(item.match_count || 0) === 1 ? "" : "es"}. ${item.notes || ""}`.trim(),
      recommendation: "Verify identity match quality and list status manually before making a regulated decision.",
      source_url: item.url || ""
    });
  });

  const countryScore = Number(countryRisk.score ?? countryRisk.risk_score ?? 0);
  if (Boolean(countryRisk.sanctioned) || countryScore >= 40) {
    findings.push({
      title: "Elevated country risk context",
      category: "Country risk",
      severity: scoreClass(countryScore),
      detail: countryRisk.rationale || countryRisk.sanctions_summary || "The model identified elevated jurisdiction or operating-footprint risk.",
      recommendation: "Review jurisdiction-specific sanctions, export controls, and operating restrictions before engagement.",
      source_url: ""
    });
  }

  categories
    .filter((category) => categoryScore(category) >= 65)
    .slice(0, 3)
    .forEach((category) => {
      findings.push({
        title: `${categoryName(category)} risk signal`,
        category: categoryName(category),
        severity: scoreClass(categoryScore(category)),
        detail: category.evidence || "The model assigned an elevated category score but did not return a separate finding.",
        recommendation: "Validate the category evidence against primary sources before relying on the score.",
        source_url: ""
      });
    });

  if (score >= 65) {
    findings.push({
      title: "High overall risk returned without itemized findings",
      category: "Model output quality",
      severity: scoreClass(score),
      detail: `The model assigned an overall risk score of ${score} with ${report.source_coverage || "unspecified"} source coverage, but did not store discrete findings.`,
      recommendation: "Treat this report as incomplete and re-screen or route it for human review before relying on the recommendation.",
      source_url: ""
    });
  }

  return findings;
}

let leafletLoadPromise = null;

function ensureLeaflet() {
  if (window.L) {
    return Promise.resolve(window.L);
  }
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  if (!leafletLoadPromise) {
    leafletLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("leaflet-js");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.L), { once: true });
        existing.addEventListener("error", () => reject(new Error("Leaflet failed to load.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.addEventListener("load", () => resolve(window.L), { once: true });
      script.addEventListener("error", () => reject(new Error("Leaflet failed to load.")), { once: true });
      document.head.appendChild(script);
    });
  }
  return leafletLoadPromise;
}

function mountCountryMap(container, Leaflet) {
  if (!container.isConnected || container.dataset.mapReady === "true") {
    return;
  }
  const lat = Number(container.dataset.lat || 20);
  const lng = Number(container.dataset.lng || 0);
  const zoom = Number(container.dataset.zoom || 1);
  const hasLocation = container.dataset.hasLocation === "true";
  const score = container.dataset.score || "";
  const country = container.dataset.country || "Country not identified";
  const tone = container.dataset.tone || "low";

  container.dataset.mapReady = "true";
  container.classList.add("osm-map-ready");
  const map = Leaflet.map(container, {
    attributionControl: true,
    boxZoom: false,
    doubleClickZoom: false,
    keyboard: false,
    scrollWheelZoom: false,
    tap: false,
    zoomControl: true
  }).setView([lat, lng], zoom);

  Leaflet.tileLayer(APP_CONFIG.map.tileUrl, {
    attribution: APP_CONFIG.map.attribution,
    maxZoom: 18
  }).addTo(map);

  if (hasLocation) {
    const radiusColor = {
      low: "#0f7c66",
      medium: "#d98310",
      high: "#bb3e3e",
      critical: "#812a45"
    }[tone] || "#0f7c66";
    const icon = Leaflet.divIcon({
      className: `leaflet-risk-marker leaflet-risk-marker-${tone}`,
      html: score ? `<span>${escapeHtml(score)}</span>` : "<span></span>",
      iconAnchor: [18, 18],
      iconSize: [36, 36]
    });
    Leaflet.circle([lat, lng], {
      className: `leaflet-risk-radius leaflet-risk-radius-${tone}`,
      fillColor: radiusColor,
      fillOpacity: 0.1,
      radius: zoom >= 8 ? 16000 : 360000,
      stroke: false
    }).addTo(map);
    Leaflet.marker([lat, lng], { icon, title: country }).addTo(map);
  }

  window.requestAnimationFrame(() => map.invalidateSize());
}

function initializeCountryMaps() {
  document.querySelectorAll("[data-country-map]").forEach((container) => {
    if (container.dataset.mapReady === "true") {
      return;
    }
    ensureLeaflet()
      .then((Leaflet) => {
        if (Leaflet) {
          mountCountryMap(container, Leaflet);
        } else {
          container.classList.add("osm-map-unavailable");
        }
      })
      .catch(() => {
        container.classList.add("osm-map-unavailable");
      });
  });
}

function sanctionsVariant(result) {
  const key = String(result || "").toLowerCase();
  if (key.includes("confirmed")) return "danger";
  if (key.includes("possible")) return "warning";
  if (key.includes("clear")) return "success";
  return "neutral";
}

function sanctionsResultLabel(result) {
  return String(result || "not_checked").replaceAll("_", " ");
}

function sanctionsMethodLabel(item) {
  if (item.method === "sanctions_network_api") {
    return "Live sanctions API";
  }
  if (item.method === "official_download_search") {
    return "Official download searched";
  }
  if (item.method === "cached_official_search") {
    return "Official/public source searched";
  }
  if (item.method === "custom_upload_search") {
    return "Uploaded list searched";
  }
  if (item.method === "manual_source_review") {
    return "Manual source review";
  }
  return "AI/web-search reported";
}

function renderSanctionsScreening(items, targetName = "") {
  const visibleItems = items.filter((item) => hasSanctionsSignal(item, targetName));
  if (!visibleItems.length) {
    return "";
  }
  return `
    <article class="card card-pad card-stack sanctions-card">
      <div class="card-title">
        <div>
          <h3>Sanctions screening</h3>
          <p>Potential identity-matched sanctions results from live public watchlists, with AI context where available.</p>
        </div>
      </div>
      <div class="sanctions-list">
        ${visibleItems.map((item) => `
          <div class="sanctions-item">
            <div>
              <strong>${escapeHtml(item.list_name || item.name || "Sanctions list")}</strong>
              <p>${escapeHtml([item.authority, item.jurisdiction].filter(Boolean).join(" - ") || "Authority not returned")}</p>
              ${item.notes ? `<span>${escapeHtml(item.notes)}</span>` : ""}
              <small class="sanctions-method">${escapeHtml(sanctionsMethodLabel(item))}</small>
              ${Array.isArray(item.evidence) && item.evidence.length ? `
                <ul class="sanctions-evidence">
                  ${item.evidence.slice(0, 3).map((evidence) => `<li>${escapeHtml(evidence.snippet || evidence.term || "")}</li>`).join("")}
                </ul>
              ` : ""}
            </div>
            <div class="sanctions-result">
              ${badge(sanctionsResultLabel(item.result), sanctionsVariant(item.result))}
              <small>${Number(item.match_count || 0)} match${Number(item.match_count || 0) === 1 ? "" : "es"}</small>
              ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Source</a>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderPrimaryScorecard(report, check, categories) {
  const score = Math.max(0, Math.min(100, Number(report.risk_score || 0)));
  const visibleCategories = categories.slice(0, 8);
  return `
    <section class="card card-pad report-scorecard">
      <div class="scorecard-heading">
        <div>
          <h2>${escapeHtml(check?.target_name || "Risk scorecard")}</h2>
          <p>${escapeHtml(formatCheckType(check?.check_type))} - ${escapeHtml(report.source_coverage || "Source coverage not set")}</p>
        </div>
        ${riskBadge(report.risk_level, score)}
      </div>
      <div class="scorecard-layout">
        <div class="scorecard-main">
          <div class="score-ring score-ring-${scoreClass(score)}" style="--score: ${score}">
            <strong>${score}</strong>
            <span>Risk</span>
          </div>
          <div class="scorecard-bars">
            ${visibleCategories.length ? visibleCategories.map((category) => {
              return categoryProgressBar(category);
            }).join("") : `
              <div class="empty-state scorecard-empty">
                <h3>No category scores</h3>
                <p>The report returned an overall score but no category score breakdown.</p>
              </div>
            `}
          </div>
        </div>
        <div class="scorecard-analysis">
          <div>
            <h3>Analysis summary</h3>
            <p>${escapeHtml(report.summary)}</p>
          </div>
          ${progressBar("Model confidence", report.confidence, 100, Number(report.confidence) < 60 ? "warning" : "")}
          <div class="scorecard-recommendation">
            <h3>Recommendation</h3>
            <p>${escapeHtml(report.recommendation)}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderReportDetail(state) {
  const report = state.selectedReport ? recoverEmbeddedReport(state.selectedReport) : null;
  const check = state.selectedCheck;
  if (!report) {
    return emptyState("Report not found", "The selected report is unavailable or still being generated.", `<a class="button button-secondary" href="#/history">Back to history</a>`);
  }

  const categories = parseArray(report.category_scores);
  let findings = parseArray(report.findings);
  let sources = parseArray(report.sources);
  const limitations = parseArray(report.limitations).filter((item) => !isInternalRecoveryLimitation(item));
  const countryRisk = parseObject(report.country_risk) || {};
  const sanctionsScreening = parseArray(report.sanctions_screening);
  const targetName = check?.target_name || "";
  findings = findings.filter((finding) => {
    const category = String(finding?.category || finding?.title || "").toLowerCase();
    if (!category.includes("sanction")) {
      return true;
    }
    return !sanctionsItemLooksLikeMismatch({
      list_name: finding?.title || finding?.category,
      notes: [finding?.detail, finding?.description, finding?.recommendation].filter(Boolean).join(" ")
    });
  });
  sources = sources.filter((source) => !sanctionsItemLooksLikeMismatch({
    list_name: source?.title || source?.publisher,
    authority: source?.publisher || "",
    jurisdiction: source?.category || source?.type || "",
    notes: source?.relevance || ""
  }));
  if (!findings.length) {
    findings = derivedFindings(report, countryRisk, sanctionsScreening, categories, targetName);
  }
  if (!sources.length) {
    sources = fallbackSources(report, sanctionsScreening, findings, targetName);
  }
  const canExport = Boolean(state.entitlement?.plan?.pdf_export);
  const needsReview = Number(report.confidence || 0) < 60 || String(report.source_coverage || "").toLowerCase().includes("limited");

  return `
    <section class="page-heading">
      <div class="page-heading-copy">
        <h1>${escapeHtml(check?.target_name || "Risk report")}</h1>
        <p>${escapeHtml(formatCheckType(check?.check_type))} - ${formatDate(report.created_at)} - ${escapeHtml(report.source_coverage)}</p>
      </div>
      <div class="hero-actions">
        <a class="button button-secondary" href="#/history">Back</a>
        <button class="button button-secondary" type="button" data-action="edit-search">Edit search</button>
        <button class="button button-secondary" type="button" data-action="rescreen-report">Re-screen</button>
        <button class="button button-secondary" type="button" data-action="watchlist-report">Add to watchlist</button>
        ${canExport
          ? `<button class="button button-primary" type="button" data-action="print-report">Export PDF</button>`
          : `<a class="button button-secondary" href="#/pricing">Unlock PDF export</a>`}
      </div>
    </section>
    ${needsReview ? setupState("This report has low confidence or limited source coverage. Treat it as a triage brief and route it for human review before relying on the recommendation.") : ""}
    ${renderPrimaryScorecard(report, check, categories)}
    ${renderTargetProfile(report, check)}
    <section class="report-detail-grid">
      <div class="report-main-column">
        ${renderCountryRisk(report, check, countryRisk)}
        <section class="card card-pad card-stack">
          <div class="card-title">
            <div>
              <h3>Findings</h3>
              <p>Material risk indicators and suggested follow-up.</p>
            </div>
          </div>
          <div class="list-stack">
            ${findings.length ? findings.map((finding) => `
              <div class="finding ${escapeHtml(String(finding.severity || "medium").toLowerCase())}">
                <div class="preview-header">
                  <strong>${escapeHtml(finding.title || finding.category || "Finding")}</strong>
                  ${badge(finding.severity || "Medium", String(finding.severity || "medium").toLowerCase())}
                </div>
                <p>${escapeHtml(finding.detail || finding.description || "")}</p>
                ${finding.recommendation ? `<p class="muted"><strong>Follow-up:</strong> ${escapeHtml(finding.recommendation)}</p>` : ""}
              </div>
            `).join("") : `<p class="muted">No discrete findings were returned.</p>`}
          </div>
        </section>
        <article class="card card-pad card-stack">
          <div class="card-title">
            <div>
              <h3>Sources</h3>
              <p>${sources.length ? `${sources.length} sources listed - ${escapeHtml(report.source_coverage)}` : "No source list returned."}</p>
            </div>
          </div>
          ${sources.length ? `
            <ol class="source-list">
              ${sources.map((source) => `
                <li>
                  <a href="${escapeHtml(source.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.url || "Source")}</a>
                  ${sourceMeta(source)}
                  ${source.relevance ? `<div class="muted">${escapeHtml(source.relevance)}</div>` : ""}
                </li>
              `).join("")}
            </ol>
          ` : `<p class="muted">No sources were returned. Run again after provider setup if this was a setup-required response.</p>`}
        </article>
      </div>
      <aside class="report-side-column">
        ${renderSanctionsScreening(sanctionsScreening, targetName)}
        <article class="card card-pad card-stack">
          <h3>Limitations</h3>
          ${limitations.length ? `<ul class="source-list">${limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="muted">No limitations were recorded.</p>`}
        </article>
      </aside>
    </section>
  `;
}

export function bindReportDetail({ onEditSearch, onRescreen, onWatchlist } = {}) {
  initializeCountryMaps();
  document.querySelectorAll("[data-category-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const detail = document.getElementById(button.dataset.categoryToggle || "");
      if (!detail) {
        return;
      }
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      detail.hidden = expanded;
    });
  });
  const printButton = document.querySelector("[data-action='print-report']");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }
  const rescreenButton = document.querySelector("[data-action='rescreen-report']");
  if (rescreenButton && onRescreen) {
    rescreenButton.addEventListener("click", onRescreen);
  }
  const editSearchButton = document.querySelector("[data-action='edit-search']");
  if (editSearchButton && onEditSearch) {
    editSearchButton.addEventListener("click", onEditSearch);
  }
  const watchlistButton = document.querySelector("[data-action='watchlist-report']");
  if (watchlistButton && onWatchlist) {
    watchlistButton.addEventListener("click", onWatchlist);
  }
}
