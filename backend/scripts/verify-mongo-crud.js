/**
 * Verifies that create/delete from the API updates MongoDB collection counts.
 * Run: npm run mongo:verify --prefix backend
 * Requires API running on SMOKE_API_URL (default http://127.0.0.1:3000).
 */
import "../src/loadEnv.js";

const BASE = (process.env.SMOKE_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function post(path, json, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(json) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function del(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function ok(name, cond, detail = "") {
  console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  return cond;
}

async function main() {
  console.log(`\nMongo CRUD sync verify @ ${BASE}\n`);

  const health = await get("/health");
  if (!ok("GET /health → 200", health.status === 200)) process.exit(1);
  if (!ok("database connected", health.body?.database === true)) process.exit(1);

  const mode = health.body?.mongoInfo?.mode || health.body?.mongoMode || "?";
  const usersBefore = health.body?.collectionCounts?.users ?? 0;
  console.log(`  mode: ${mode}, users before: ${usersBefore}`);

  const email = `sync_test_${Date.now()}@test.local`;
  const reg = await post("/auth/register", {
    name: "Sync Test",
    email,
    password: "syncpass1",
  });
  if (!ok("POST /auth/register → 201", reg.status === 201, JSON.stringify(reg.body))) process.exit(1);

  const healthAfterReg = await get("/health");
  const usersAfterReg = healthAfterReg.body?.collectionCounts?.users ?? 0;
  if (!ok("users count increased after register", usersAfterReg === usersBefore + 1, `${usersBefore} → ${usersAfterReg}`)) {
    process.exit(1);
  }

  const adminEmail = "youssef@gmail.com";
  const adminPass = process.env.ADMIN_PASSWORD_YOUSSEF || "";
  if (!adminPass) {
    console.warn("  ⚠ ADMIN_PASSWORD_YOUSSEF not set — skipping delete verify");
    process.exit(0);
  }

  const login = await post("/auth/login", { email: adminEmail, password: adminPass });
  if (!ok("admin login → 200", login.status === 200)) process.exit(1);
  const token = login.body?.token;
  const userId = reg.body?.user?._id || reg.body?.user?.id;
  if (!userId) {
    console.error("  ✗ missing registered user id");
    process.exit(1);
  }

  const removed = await del(`/admin/users/${userId}`, token);
  if (!ok("DELETE /admin/users/:id → 200", removed.status === 200, JSON.stringify(removed.body))) process.exit(1);

  const healthAfterDel = await get("/health");
  const usersAfterDel = healthAfterDel.body?.collectionCounts?.users ?? 0;
  if (!ok("users count decreased after delete", usersAfterDel === usersBefore, `${usersAfterReg} → ${usersAfterDel}`)) {
    process.exit(1);
  }

  console.log("\nMongo CRUD sync OK — add/delete from API updates the database.\n");
  if (mode !== "atlas") {
    console.error("ERROR: Not connected to Atlas — data will NOT appear in MongoDB Atlas UI.");
    console.error("Run: npm run mongo:test-atlas --prefix backend\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nVerify failed:", e.message);
  console.error("Start API first: npm run backend\n");
  process.exit(1);
});
