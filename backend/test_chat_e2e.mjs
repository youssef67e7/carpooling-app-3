// Chat E2E smoke test: starts server, tests GET/POST messages endpoints, stops server
import { spawn } from "child_process";
import { createServer } from "http";

const BASE = "http://localhost:3000/api";
const server = spawn("node", ["src/index.js"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, PORT: "3000" },
});

function waitForServer(maxMs = 25000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (Date.now() - start > maxMs) return reject(new Error("Server did not start"));
      fetch(`${BASE}/health`)
        .then((r) => (r.ok ? resolve() : setTimeout(poll, 500)))
        .catch(() => setTimeout(poll, 500));
    };
    poll();
  });
}

async function main() {
  server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[server-err] ${d}`));

  try {
    await waitForServer();
    console.log("\n=== Server started ===\n");

    // 1. Health check
    const health = await fetch(`${BASE}/health`);
    console.log(`Health: ${health.status} ${health.statusText}`);

    // 2. Try GET messages for a non-existent ride (should 404)
    const getBad = await fetch(`${BASE}/rides/nonexistent/messages`);
    console.log(`GET bad ride messages: ${getBad.status}`);

    // 3. Login as existing user to get a token
    const login = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "youssef@gmail.com", password: "test123456" }),
    });
    const loginData = await login.json();
    const token = loginData?.data?.accessToken || loginData?.data?.token || loginData?.token;
    if (token) {
      console.log("Login OK, got token:", token.slice(0, 20) + "...");

      // 4. Check auth/me
      const me = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await me.json();
      console.log(`Auth/me: ${me.status}, user: ${meData?.user?.name || meData?.user?.email || "unknown"}`);

      // 5. Try GET messages for a ride (no auth — should 401)
      const getNoAuth = await fetch(`${BASE}/rides/fakeid/messages`);
      console.log(`GET no auth: ${getNoAuth.status}`);

      // 6. Try GET messages with auth (likely no rides exist for this user, but should 404 or 200 with [])
      const getWithAuth = await fetch(`${BASE}/rides/fakeid/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`GET with auth: ${getWithAuth.status}`);

      // 7. Try POST message with auth (should 404 — ride not found)
      const postMsg = await fetch(`${BASE}/rides/fakeid/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello from smoke test", idempotencyKey: "test-001" }),
      });
      const postData = await postMsg.json();
      console.log(`POST message: ${postMsg.status}, response:`, JSON.stringify(postData).slice(0, 200));

      // 8. Try admin message endpoints
      const adminGet = await fetch(`${BASE}/admin/rides/fakeid/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Admin GET messages: ${adminGet.status}`);

      const adminDel = await fetch(`${BASE}/admin/messages/fakeid`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Admin DELETE message: ${adminDel.status}`);

    } else {
      console.log("Login failed:", loginData);
    }

    console.log("\n=== Smoke test complete ===\n");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.kill();
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
