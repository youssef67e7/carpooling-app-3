#!/usr/bin/env node
/**
 * Forwards HTTP from the LAN (phone) to the API on loopback — does not touch Metro.
 * Run: npm run api-proxy (from /mobile) while backend listens on 127.0.0.1:3000.
 *
 * Env:
 *   EXPO_PUBLIC_API_PROXY_PORT | DEV_API_PROXY_LISTEN  — listen port (default 8090)
 *   DEV_API_PROXY_TARGET_HOST — default 127.0.0.1
 *   DEV_API_PROXY_TARGET_PORT — default from PORT or 3000
 */
const http = require("http");

const LISTEN_PORT = Number(
  process.env.EXPO_PUBLIC_API_PROXY_PORT || process.env.DEV_API_PROXY_LISTEN || 8090
);
const TARGET_HOST = process.env.DEV_API_PROXY_TARGET_HOST || "127.0.0.1";
const TARGET_PORT = Number(
  process.env.DEV_API_PROXY_TARGET_PORT || process.env.PORT || 3000
);

const server = http.createServer((clientReq, clientRes) => {
  const headers = { ...clientReq.headers };
  headers.host = `${TARGET_HOST}:${TARGET_PORT}`;

  const proxyReq = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    }
  );

  proxyReq.on("error", (err) => {
    if (clientRes.headersSent) return;
    clientRes.statusCode = 502;
    clientRes.setHeader("Content-Type", "application/json; charset=utf-8");
    clientRes.end(
      JSON.stringify({
        message: `Dev API proxy → http://${TARGET_HOST}:${TARGET_PORT}: ${err.message}. Is npm run backend running?`,
      })
    );
  });

  clientReq.pipe(proxyReq);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`Dev API proxy  http://0.0.0.0:${LISTEN_PORT}  →  http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`Set mobile/.env: EXPO_PUBLIC_USE_API_PROXY=1  (restart Expo).`);
  console.log(`Firewall (Windows): allow inbound TCP ${LISTEN_PORT} or run backend/scripts/allow-api-port-windows.ps1 -Port ${LISTEN_PORT}`);
});
