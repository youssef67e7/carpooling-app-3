import axios from "axios";
import Constants from "expo-constants";
import * as ReactNative from "react-native";

const extraCfg = Constants.expoConfig?.extra ?? {};

/** Namespace import avoids rare Hermes/Metro issues with named `Platform` export. */
function platformOS() {
  return ReactNative.Platform?.OS ?? "web";
}

/** Map localhost to host machine when running on Android emulator. */
function normalizeDevHost(host) {
  if (!host || typeof host !== "string") return null;
  const h = host.trim();
  if (!h) return null;
  const lower = h.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1") {
    return platformOS() === "android" ? "10.0.2.2" : "localhost";
  }
  return h;
}

/** Parse host from `192.168.x.x:8082`, `exp://192.168.x.x:8082`, etc. */
function parseHostFromDevConnectionString(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.replace(/^exp:\/\//i, "").replace(/^https?:\/\//i, "");
  const hostPort = s.split("/")[0];
  if (!hostPort) return null;
  const colon = hostPort.lastIndexOf(":");
  const hostOnly = colon > 0 ? hostPort.slice(0, colon) : hostPort;
  return normalizeDevHost(hostOnly);
}

/** Metro / Hermes bundle URL — reliable when `hostUri` is missing in Expo Go. */
function hostFromScriptUrl() {
  const url = ReactNative.NativeModules?.SourceCode?.scriptURL;
  if (!url || typeof url !== "string") return null;
  try {
    return normalizeDevHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/**
 * Optional in mobile/.env when auto-detection fails (physical phone + Expo Go):
 * EXPO_PUBLIC_LAN_HOST=192.168.1.6   (your PC Wi‑Fi IPv4, same network as the phone)
 */
function explicitLanHost() {
  const raw =
    process.env.EXPO_PUBLIC_LAN_HOST || process.env.EXPO_PUBLIC_DEV_HOST || extraCfg.lanHost;
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().replace(/^https?:\/\//i, "");
  const hostOnly = s.split(":")[0]?.trim();
  if (!hostOnly) return null;
  return normalizeDevHost(hostOnly);
}

/**
 * Dev machine LAN hostname for replacing localhost (phones cannot use your PC's "localhost").
 */
function inferLanHostnameFromExpo() {
  const manual = explicitLanHost();
  if (manual) return manual;

  const rawCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.__unsafeNoWarnManifest?.debuggerHost,
  ].filter(Boolean);

  for (const raw of rawCandidates) {
    const host = parseHostFromDevConnectionString(raw);
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }

  const fromScript = hostFromScriptUrl();
  if (fromScript && fromScript !== "localhost" && fromScript !== "127.0.0.1") return fromScript;

  return null;
}

function truthyEnv(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function falsyEnv(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "0" || s === "false" || s === "no";
}

/** Dev-only: separate Node proxy on LAN (see mobile/scripts/dev-api-proxy.js) — avoids firewall on :3000. */
function useDevApiProxy() {
  if (!__DEV__) return false;
  const fromManifest = extraCfg.useApiProxy;
  if (fromManifest === true || fromManifest === 1) return true;
  if (truthyEnv(fromManifest)) return true;
  return truthyEnv(process.env.EXPO_PUBLIC_USE_API_PROXY);
}

/** For UI hints (e.g. ConnectionStatusBanner). */
export function isDevApiProxyActive() {
  const full = process.env.EXPO_PUBLIC_API_FULL_URL || extraCfg.apiFullUrl;
  if (full && String(full).trim()) return false;
  return useDevApiProxy();
}

function devApiListenPort() {
  return String(extraCfg.apiProxyPort || process.env.EXPO_PUBLIC_API_PROXY_PORT || "8090");
}

function apiPortForDev() {
  return useDevApiProxy() ? devApiListenPort() : "3000";
}

function isLanHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)
  );
}

function inferDevApiBase() {
  const port = apiPortForDev();
  const host = inferLanHostnameFromExpo();
  if (host) return `http://${host}:${port}`;
  return null;
}

/**
 * `localhost` / `127.0.0.1` in EXPO_PUBLIC_API_URL do not reach the dev PC from a
 * real device or from the Android emulator. Prefer the Metro/bundler host (LAN IP),
 * else on Android emulator fall back to 10.0.2.2. Skipped on web.
 */
function rewriteLoopbackApiUrl(baseUrl) {
  const raw = String(baseUrl || "").trim();
  if (!raw || platformOS() === "web") return raw.replace(/\/$/, "");
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch {
    return raw.replace(/\/$/, "");
  }
  const h = u.hostname.toLowerCase();
  if (h !== "localhost" && h !== "127.0.0.1") {
    if (useDevApiProxy() && platformOS() !== "web" && isLanHostname(h)) {
      u.port = devApiListenPort();
    }
    return u.toString().replace(/\/$/, "");
  }

  const inferred = inferLanHostnameFromExpo();
  if (inferred) {
    u.hostname = inferred;
    if (useDevApiProxy()) {
      u.port = devApiListenPort();
    }
    return u.toString().replace(/\/$/, "");
  }

  /** Android emulator: "localhost" on the host is reachable as 10.0.2.2 from the VM. */
  if (platformOS() === "android") {
    u.hostname = "10.0.2.2";
    if (useDevApiProxy()) {
      u.port = devApiListenPort();
    }
    return u.toString().replace(/\/$/, "");
  }

  if (__DEV__ && platformOS() !== "web") {
    console.warn(
      "[api] Could not infer your PC LAN IP; requests may fail on a physical device. Set EXPO_PUBLIC_LAN_HOST in mobile/.env to your computer Wi‑Fi IP (see backend console: LAN API …)."
    );
  }
  return u.toString().replace(/\/$/, "");
}

/**
 * Full override — skips localhost rewrite & proxy logic. Use when Expo Go cannot reach :8090 proxy:
 * EXPO_PUBLIC_API_FULL_URL=http://192.168.1.6:3000
 * (Same Wi‑Fi IP as Metro; open Windows Firewall TCP 3000 or run allow-api-port-windows.ps1 -Port 3000)
 */
function computeApiBaseURL() {
  const rawFull = process.env.EXPO_PUBLIC_API_FULL_URL || extraCfg.apiFullUrl;
  if (rawFull && String(rawFull).trim()) {
    const trimmed = String(rawFull).trim().replace(/\/$/, "");
    /**
     * Dev ergonomics: PCs often change Wi‑Fi IPs (.6 today, .7 tomorrow).
     * If EXPO_PUBLIC_API_FULL_URL points to a stale private LAN IP but Expo/Metro reports
     * a different LAN host for THIS machine, prefer the inferred host (same port).
     *
     * Opt-out: EXPO_PUBLIC_API_DISABLE_LAN_HOST_AUTOFIX=1
     */
    if (
      __DEV__ &&
      platformOS() !== "web" &&
      !truthyEnv(process.env.EXPO_PUBLIC_API_DISABLE_LAN_HOST_AUTOFIX) &&
      !falsyEnv(extraCfg.disableLanHostAutofix)
    ) {
      try {
        const inferred = inferLanHostnameFromExpo();
        if (!inferred) return trimmed;

        const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
        const h = u.hostname.toLowerCase();
        if (h === inferred.toLowerCase()) return trimmed;
        if (!isLanHostname(h)) return trimmed;

        const fixed = new URL(u.toString());
        fixed.hostname = inferred;
        const out = fixed.toString().replace(/\/$/, "");
        console.warn(
          `[api] EXPO_PUBLIC_API_FULL_URL host (${h}) != Expo LAN host (${inferred}). Using ${out} (set EXPO_PUBLIC_API_DISABLE_LAN_HOST_AUTOFIX=1 to disable).`
        );
        return out;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ||
    extraCfg.apiUrl ||
    (__DEV__ ? inferDevApiBase() : null) ||
    "http://localhost:3000";

  const normalized = String(fromEnv).replace(/\/$/, "");
  return __DEV__ ? rewriteLoopbackApiUrl(normalized) : normalized;
}

export const apiBaseURL = computeApiBaseURL();

if (__DEV__) {
  console.log(
    `[api] baseURL=${apiBaseURL} proxy=${useDevApiProxy()} proxyPort=${devApiListenPort()} | Set EXPO_PUBLIC_API_FULL_URL for direct :3000 without proxy`
  );
}

/** Same host/port as the API — admin static UI is served by the backend at `/admin-ui/`. */
export const adminWebURL = `${apiBaseURL}/admin-ui/`;

export const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/** Retry transient failures (timeout / 5xx) for idempotent GETs */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (!config || config.method?.toLowerCase() !== "get") {
      return Promise.reject(error);
    }
    const status = error.response?.status;
    const retriable = !status || status >= 500 || error.code === "ECONNABORTED" || error.code === "ERR_NETWORK";
    if (!retriable) return Promise.reject(error);
    const count = config.__retryCount || 0;
    if (count >= 2) return Promise.reject(error);
    config.__retryCount = count + 1;
    const delay = 350 * config.__retryCount;
    await new Promise((r) => setTimeout(r, delay));
    return api(config);
  }
);

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
