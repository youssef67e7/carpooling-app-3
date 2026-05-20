/**
 * HTTP smoke tests against a running API (default http://127.0.0.1:3000).
 * Run: npm run test:smoke --prefix backend
 */
const BASE = (process.env.SMOKE_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function post(path, json) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(json),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function ok(name, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
    return true;
  }
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  return false;
}

async function main() {
  console.log(`\nSmoke API @ ${BASE}\n`);
  let passed = 0;
  let failed = 0;

  const health = await get("/health");
  if (ok("GET /health → 200", health.status === 200, JSON.stringify(health.body))) passed++;
  else failed++;

  if (ok("health.ok === true", health.body?.ok === true)) passed++;
  else failed++;

  if (ok("database connected", health.body?.database === true, `mongoState=${health.body?.mongoState}`)) passed++;
  else failed++;

  const google = await get("/auth/google-config");
  if (ok("GET /auth/google-config → 200", google.status === 200)) passed++;
  else failed++;

  if (ok("google-config has enabled flag", typeof google.body?.enabled === "boolean")) passed++;
  else failed++;

  const badPhone = await post("/auth/phone/otp", { phone: "12" });
  if (ok("POST /auth/phone/otp invalid → 400", badPhone.status === 400)) passed++;
  else failed++;

  const goodPhone = await post("/auth/phone/otp", { phone: "01012345678" });
  if (ok("POST /auth/phone/otp valid → 200", goodPhone.status === 200)) passed++;
  else failed++;

  if (ok("phone OTP returns phone", goodPhone.body?.phone === "+201012345678")) passed++;
  else failed++;

  const vehicles = await get("/vehicles");
  if (ok("GET /vehicles without auth → 401", vehicles.status === 401)) passed++;
  else failed++;

  const adminUi = await fetch(`${BASE}/admin-ui/`);
  if (ok("GET /admin-ui/ → 200", adminUi.status === 200)) passed++;
  else failed++;

  const badLogin = await post("/auth/login", { email: "not-an-email", password: "x" });
  if (ok("POST /auth/login invalid email → 400", badLogin.status === 400)) passed++;
  else failed++;

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\nSmoke failed:", e.message);
  console.error("Is the API running? npm run backend  (or npm run dev)\n");
  process.exit(1);
});
