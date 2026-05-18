/**
 * Run Expo with cwd = /mobile (npm --prefix does not chdir; without this,
 * `expo start` treats the repo root as the app and breaks).
 * Skips remote dependency validation when EXPO_NO_DEPENDENCY_VALIDATION=1.
 * Note: `expo start` does not allow --offline together with --lan (CLI error).
 * Picks a free Metro port when the default is taken (avoids interactive prompt in CI/IDE).
 */
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const mobileDir = path.join(__dirname, "..", "mobile");

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
  for (let p = preferred; p < preferred + 50; p += 1) {
    if (await isLocalPortInUse(p)) continue;
    const ok = await tryListenPort(p);
    if (ok !== null) return ok;
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
  const port = await pickMetroPort();
  const cmd = useOfflineOnly
    ? `npx expo start --offline -p ${port}`
    : `npx expo start --lan -p ${port}`;

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
