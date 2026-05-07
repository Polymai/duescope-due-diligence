import { setRoute } from "./state.js";

const protectedRoutes = new Set(["dashboard", "new", "report", "history", "watchlist", "account"]);

export function parseHash(hash = window.location.hash) {
  const clean = hash.replace(/^#/, "") || "/";
  const [pathPart, queryString = ""] = clean.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryString));

  if (!parts.length) {
    return { name: "landing", path: "/", params: query };
  }
  if (parts[0] === "dashboard") {
    return { name: "dashboard", path: "/dashboard", params: query };
  }
  if (parts[0] === "new") {
    return { name: "new", path: "/new", params: query };
  }
  if (parts[0] === "report" && parts[1]) {
    return { name: "report", path: `/report/${parts[1]}`, params: { ...query, id: parts[1] } };
  }
  if (parts[0] === "history") {
    return { name: "history", path: "/history", params: query };
  }
  if (parts[0] === "watchlist") {
    return { name: "watchlist", path: "/watchlist", params: query };
  }
  if (parts[0] === "service") {
    return { name: "service", path: "/service", params: query };
  }
  if (parts[0] === "agreement") {
    return { name: "agreement", path: "/agreement", params: query };
  }
  if (parts[0] === "pricing") {
    return { name: "pricing", path: "/pricing", params: query };
  }
  if (parts[0] === "account") {
    return { name: "account", path: "/account", params: query };
  }
  return { name: "landing", path: "/", params: query };
}

export function isProtectedRoute(route) {
  return protectedRoutes.has(route.name);
}

export function navigate(path) {
  window.location.hash = path;
}

export function startRouter(onRouteChange) {
  const sync = () => {
    const route = parseHash();
    setRoute(route);
    onRouteChange(route);
  };
  window.addEventListener("hashchange", sync);
  sync();
  return () => window.removeEventListener("hashchange", sync);
}
