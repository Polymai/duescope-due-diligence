const initialState = {
  booted: false,
  session: null,
  user: null,
  profile: null,
  appAccess: "unknown",
  route: { name: "landing", params: {}, path: "/" },
  authModalOpen: false,
  authMode: "signin",
  authPrefillEmail: "",
  authNotice: null,
  plans: [],
  entitlement: null,
  usage: null,
  billing: null,
  checksLeft: 0,
  checks: [],
  watchlistItems: [],
  selectedReport: null,
  selectedCheck: null,
  newCheckDraft: null,
  payments: [],
  analysisStep: 0,
  analysisElapsedSeconds: 0,
  analysisLog: [],
  loading: {
    boot: true,
    account: false,
    route: false,
    auth: false,
    analysis: false,
    checkout: false,
    watchlist: false
  },
  error: null,
  toast: null
};

let state = structuredClone(initialState);
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(state));
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(patch) {
  state = {
    ...state,
    ...patch,
    loading: patch.loading ? { ...state.loading, ...patch.loading } : state.loading
  };
  emit();
}

export function updateState(updater) {
  const nextPatch = updater(state);
  if (nextPatch) {
    setState(nextPatch);
  }
}

export function setRoute(route) {
  setState({ route, error: null });
}

export function setSession(session) {
  setState({
    session,
    user: session?.user || null,
    appAccess: session ? state.appAccess : "none"
  });
}

export function setToast(toast) {
  setState({ toast });
  if (toast) {
    window.setTimeout(() => {
      if (state.toast === toast) {
        setState({ toast: null });
      }
    }, 4200);
  }
}

export function openAuth(mode = "signin") {
  setState({ authModalOpen: true, authMode: mode, authPrefillEmail: "", authNotice: null, error: null });
}

export function closeAuth() {
  setState({ authModalOpen: false, authPrefillEmail: "", authNotice: null });
}

export function resetAccountState(appAccess = "unknown") {
  setState({
    profile: null,
    appAccess,
    entitlement: null,
    usage: null,
    billing: null,
    checksLeft: 0,
    checks: [],
    watchlistItems: [],
    selectedReport: null,
    selectedCheck: null,
    newCheckDraft: null,
    payments: []
  });
}
