/**
 * Run Expo with cwd = /mobile (npm --prefix does not chdir; without this,
 * `expo start` treats the repo root as the app and breaks).
 * Skips remote dependency validation when EXPO_NO_DEPENDENCY_VALIDATION=1.
 * Note: `expo start` does not allow --offline together with --lan (CLI error).
 * Picks a free Metro port when the default is taken (avoids interactive prompt in CI/IDE).
 */
const { spawn } = require("child_process");
const net = require("net");
const os = require("os");
const path = require("path");

const mobileDir = path.join(__dirname, "..", "mobile");

if (process.argv.includes("--tunnel")) {
  process.env.EXPO_USE_TUNNEL = "1";
}

/** Prefer Wi‑Fi/Ethernet IPv4 for instructions (physical iPhone on same LAN). */
function getLanIPv4() {
  const prefer = String(process.env.EXPO_PUBLIC_LAN_HOST || "").trim();
  if (prefer) return prefer;
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (/loopback|vmware|virtual|vethernet|wsl/i.test(name)) continue;
    for (const addr of nets[name] || []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return "127.0.0.1";
}

function printIosExpoGoHelp(lanHost, port, { tunnel, portWasBusy }) {
  const expUrl = tunnel
    ? "(shown below after tunnel starts — scan that QR)"
    : `exp://${lanHost}:${port}`;
  const iosLoading = `http://${lanHost}:${port}/_expo/loading?platform=ios`;
  console.log("\n────────────────────────────────────────────────────────");
  console.log("  iPhone → Expo Go (iOS)");
  console.log("────────────────────────────────────────────────────────");
  if (portWasBusy) {
    console.log(`  ⚠ Port 8081 is busy — using ${port}. Close other Expo windows if confused.`);
  }
  if (!tunnel) {
    console.log("  1. Open Expo Go (App Store) — NOT Safari / NOT iPhone Camera.");
    console.log("  2. Expo Go → Scan QR code (scanner inside the app).");
    console.log(`  3. Or paste: ${expUrl}`);
    console.log("  If only Safari opens, paste in Expo Go → Enter URL manually.");
    console.log(`     Safari fallback: ${iosLoading}`);
    console.log("  Settings → Privacy → Local Network → Expo Go ON.");
    console.log("  Same Wi‑Fi on phone and PC (no mobile data).");
    console.log("");
    console.log("  Windows firewall (run once as Administrator):");
    console.log(`    .\\scripts\\allow-metro-port-windows.ps1 -Port ${port}`);
    console.log("  University / guest Wi‑Fi? Phones often cannot reach the PC.");
    console.log("  Use tunnel instead:  npm run expo:tunnel");
  } else {
    console.log("  Tunnel mode: scan the QR below with Expo Go (works on strict Wi‑Fi).");
  }
  console.log("────────────────────────────────────────────────────────\n");
}

function tryListenPort(port) {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", (err) => {
      s.close();
      if (err.code === "EADDRINUSE") resolve(null);
      else reject(err);
    });
    s.listen(port, "127.0.0.1", () => {
      s.close(() => resolve(port));
    });
  });
}

/** Metro usually listens on localhost; connect succeeds if something already bound there. */
function isLocalPortInUse(port) {
  return new Promise((resolve) => {
    const c = net.createConnection({ port, host: "127.0.0.1" });
    c.setTimeout(800);
    c.once("connect", () => {
      c.destroy();
      resolve(true);
    });
    c.once("timeout", () => {
      c.destroy();
      resolve(false);
    });
    c.once("error", () => resolve(false));
  });
}

async function pickMetroPort() {
  const preferred = Number(process.env.EXPO_METRO_PORT) || 8081;
  const preferredBusy = await isLocalPortInUse(preferred);
  for (let p = preferred; p < preferred + 50; p += 1) {
    if (await isLocalPortInUse(p)) continue;
    const ok = await tryListenPort(p);
    if (ok !== null) return { port: ok, preferredBusy };
  }
  throw new Error(`No free Metro port found in range ${preferred}-${preferred + 49}`);
}

(async () => {
  const env = {
    ...process.env,
    EXPO_NO_DEPENDENCY_VALIDATION: "1",
  };

  const useOfflineOnly =
    String(process.env.EXPO_START_OFFLINE_ONLY || "").trim() === "1";
  /** Dev-client QR (exp+slug://…) fails in Expo Go / phone Camera → "no usable data found". */
  const useDevClient =
    String(process.env.EXPO_USE_DEV_CLIENT || "").trim() === "1";
  const useTunnel =
    String(process.env.EXPO_USE_TUNNEL || "").trim() === "1";
  const clientFlag = useDevClient ? "--dev-client" : "--go";
  const hostFlag = useTunnel ? "--tunnel" : "--lan";
  const { port, preferredBusy } = await pickMetroPort();
  const lanHost = getLanIPv4();
  printIosExpoGoHelp(lanHost, port, { tunnel: useTunnel, portWasBusy: preferredBusy });

  const cmd = useOfflineOnly
    ? `npx expo start --offline ${clientFlag} ${hostFlag} -p ${port}`
    : `npx expo start ${hostFlag} ${clientFlag} -p ${port}`;

  const child = spawn(cmd, {
    cwd: mobileDir,
    env,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
