import { APP_CONFIG } from "../config.js";
import { ensureSupabase } from "../supabaseClient.js";
import { getState, setState } from "../state.js";

export async function loadChecks(limit = 100) {
  const { user } = getState();
  if (!user) {
    setState({ checks: [] });
    return [];
  }

  const client = ensureSupabase();
  const { data: checks, error: checksError } = await client
    .from(APP_CONFIG.tables.checks)
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (checksError) {
    throw checksError;
  }

  const checkIds = (checks || []).map((check) => check.id);
  let reportsByCheck = {};
  if (checkIds.length) {
    const { data: reports, error: reportsError } = await client
      .from(APP_CONFIG.tables.reports)
      .select("*")
      .in("check_id", checkIds);
    if (reportsError) {
      throw reportsError;
    }
    reportsByCheck = Object.fromEntries((reports || []).map((report) => [report.check_id, report]));
  }

  const merged = (checks || []).map((check) => ({
    ...check,
    report: reportsByCheck[check.id] || null
  }));
  setState({ checks: merged });
  return merged;
}

export async function loadReport(reportId) {
  const { user } = getState();
  if (!user || !reportId) {
    setState({ selectedReport: null, selectedCheck: null });
    return null;
  }

  const client = ensureSupabase();
  const { data: report, error } = await client
    .from(APP_CONFIG.tables.reports)
    .select("*")
    .eq("user_id", user.id)
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!report) {
    setState({ selectedReport: null, selectedCheck: null });
    return null;
  }

  const { data: check, error: checkError } = await client
    .from(APP_CONFIG.tables.checks)
    .select("*")
    .eq("user_id", user.id)
    .eq("id", report.check_id)
    .maybeSingle();

  if (checkError) {
    throw checkError;
  }

  setState({ selectedReport: report, selectedCheck: check || null });
  return { report, check };
}

function nextScreenAt(intervalDays = 30) {
  const days = Math.max(1, Number(intervalDays) || 30);
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function normalizeWatchlistPart(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

function usableJurisdiction(value) {
  const text = String(value || "").trim();
  return text && !/^(unknown|not identified|not available|n\/a|none|null)$/i.test(text) ? text : "";
}

function jurisdictionFromReport(report) {
  const countryRisk = parseObject(report?.country_risk);
  return usableJurisdiction(countryRisk.country) || usableJurisdiction(countryRisk.location_label);
}

function watchlistKey(item) {
  return [
    normalizeWatchlistPart(item.target_name || item.targetName),
    normalizeWatchlistPart(item.jurisdiction),
    normalizeWatchlistPart(item.check_type || item.checkType || "vendor")
  ].join("|");
}

function watchlistLooseKey(item) {
  return [
    normalizeWatchlistPart(item.target_name || item.targetName),
    normalizeWatchlistPart(item.check_type || item.checkType || "vendor")
  ].join("|");
}

function isDuplicateWatchlistTarget(a, b) {
  if (watchlistKey(a) === watchlistKey(b)) {
    return true;
  }
  const aJurisdiction = normalizeWatchlistPart(a.jurisdiction);
  const bJurisdiction = normalizeWatchlistPart(b.jurisdiction);
  return watchlistLooseKey(a) === watchlistLooseKey(b) && (!aJurisdiction || !bJurisdiction);
}

function watchlistRank(item) {
  const lastDate = item.last_screened_at || item.updated_at || item.created_at || "";
  return [
    item.jurisdiction ? 8 : 0,
    item.last_report_id ? 4 : 0,
    item.last_risk_score !== null && item.last_risk_score !== undefined ? 2 : 0,
    Date.parse(lastDate) || 0
  ].reduce((total, value) => total + value, 0);
}

function dedupeWatchlistItems(items = []) {
  const byKey = new Map();
  items.forEach((item) => {
    const key = item.jurisdiction ? watchlistKey(item) : watchlistLooseKey(item);
    const existing = byKey.get(key);
    if (!existing || watchlistRank(item) >= watchlistRank(existing)) {
      byKey.set(key, item);
    }
  });
  return [...byKey.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function loadWatchlist() {
  const { user } = getState();
  if (!user) {
    setState({ watchlistItems: [] });
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from(APP_CONFIG.tables.watchlistItems)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const reportIds = [...new Set((data || []).map((item) => item.last_report_id).filter(Boolean))];
  let reportsById = {};
  if (reportIds.length) {
    const { data: reports, error: reportsError } = await client
      .from(APP_CONFIG.tables.reports)
      .select("id,country_risk")
      .in("id", reportIds);
    if (reportsError) {
      throw reportsError;
    }
    reportsById = Object.fromEntries((reports || []).map((report) => [report.id, report]));
  }

  const enriched = (data || []).map((item) => {
    const derivedJurisdiction = jurisdictionFromReport(reportsById[item.last_report_id]);
    return {
      ...item,
      display_jurisdiction: usableJurisdiction(item.jurisdiction) || derivedJurisdiction || ""
    };
  });

  const deduped = dedupeWatchlistItems(enriched);
  setState({ watchlistItems: deduped });
  return deduped;
}

export async function createWatchlistItem(payload) {
  const { user } = getState();
  if (!user) {
    throw new Error("Sign in before adding a watchlist item.");
  }

  const intervalDays = Math.max(1, Number(payload.screening_interval_days || payload.screeningIntervalDays || 30));
  const record = {
    user_id: user.id,
    target_name: String(payload.target_name || payload.targetName || "").trim(),
    target_url: payload.target_url || payload.targetUrl ? String(payload.target_url || payload.targetUrl).trim() : null,
    jurisdiction: payload.jurisdiction ? String(payload.jurisdiction).trim() : null,
    check_type: payload.check_type || payload.checkType || "vendor",
    context: payload.context ? String(payload.context).trim() : null,
    auto_screen_enabled: Boolean(payload.auto_screen_enabled ?? payload.autoScreenEnabled ?? true),
    screening_interval_days: intervalDays,
    next_screen_at: payload.auto_screen_enabled === false || payload.autoScreenEnabled === false ? null : nextScreenAt(intervalDays),
    last_status: "active"
  };

  if (!record.target_name) {
    throw new Error("Target name is required for watchlist items.");
  }

  const client = ensureSupabase();
  const { data: existingItems, error: existingError } = await client
    .from(APP_CONFIG.tables.watchlistItems)
    .select("*")
    .eq("user_id", user.id);

  if (existingError) {
    throw existingError;
  }

  const duplicate = (existingItems || []).find((item) => isDuplicateWatchlistTarget(item, record));
  if (duplicate?.id) {
    const { data, error } = await client
      .from(APP_CONFIG.tables.watchlistItems)
      .update({
        target_name: record.target_name,
        target_url: record.target_url,
        jurisdiction: record.jurisdiction,
        check_type: record.check_type,
        context: record.context,
        auto_screen_enabled: record.auto_screen_enabled,
        screening_interval_days: record.screening_interval_days,
        next_screen_at: record.next_screen_at,
        last_status: duplicate.last_status || record.last_status
      })
      .eq("user_id", user.id)
      .eq("id", duplicate.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await loadWatchlist();
    return data;
  }

  const { data, error } = await client
    .from(APP_CONFIG.tables.watchlistItems)
    .insert(record)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await loadWatchlist();
  return data;
}

export async function updateWatchlistItem(id, patch) {
  const { user } = getState();
  if (!user || !id) {
    throw new Error("Watchlist item is unavailable.");
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from(APP_CONFIG.tables.watchlistItems)
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await loadWatchlist();
  return data;
}

export async function deleteWatchlistItem(id) {
  const { user } = getState();
  if (!user || !id) {
    return;
  }

  const client = ensureSupabase();
  const { error } = await client
    .from(APP_CONFIG.tables.watchlistItems)
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) {
    throw error;
  }

  await loadWatchlist();
}

export async function markWatchlistScreened(id, result, status = "completed") {
  const item = getState().watchlistItems.find((entry) => entry.id === id);
  const report = result?.report || {};
  const check = result?.check || {};
  const intervalDays = Number(item?.screening_interval_days || 30);
  return updateWatchlistItem(id, {
    last_screened_at: new Date().toISOString(),
    last_check_id: check.id || null,
    last_report_id: report.id || null,
    last_risk_score: report.risk_score ?? check.risk_score ?? null,
    last_risk_level: report.risk_level || check.risk_level || null,
    last_status: status,
    next_screen_at: item?.auto_screen_enabled ? nextScreenAt(intervalDays) : null
  });
}
