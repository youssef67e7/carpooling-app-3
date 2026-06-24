import "./loadEnv.js";
import os from "os";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { ensureDb, getMongoSetupHelp } from "./db.js";
import { createApp } from "./createApp.js";
import { simulateDriverMovement } from "./jobs/simulateMovement.js";
import { setIo, roomUser, roomDrivers, roomRide } from "./realtime/io.js";

const app = createApp();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set. Using insecure default for local dev only.");
  process.env.JWT_SECRET = "dev-only-insecure-secret-change-me";
}

function logLanApiUrls(port) {
  const nets = os.networkInterfaces();
  const v4 = (f) => f === "IPv4" || f === 4;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (v4(net.family) && !net.internal) {
        console.log(`  LAN API (phone on same Wi‑Fi): http://${net.address}:${port}`);
      }
    }
  }
}

async function main() {
  const dbOk = await ensureDb().catch((err) => {
    console.error("[db] MongoDB init failed:", err?.message || err);
    return false;
  });
  if (!dbOk) {
    const atlasRequired = String(process.env.MONGODB_ATLAS_REQUIRED || "").trim() === "1";
    if (atlasRequired) {
      console.error("\nCannot start: MONGODB_ATLAS_REQUIRED=1 but Atlas is unreachable.");
      console.error("→ Atlas Network Access: allow 0.0.0.0/0 (or your IP)");
      console.error("→ Disable Cloudflare WARP / VPN, then: npm run mongo:test-atlas\n");
      process.exit(1);
    }
    console.warn("API running WITHOUT MongoDB — fix WARP/Atlas then restart. Auth/rides will fail.");
  }

  const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] },
  });

  io.use((socket, next) => {
    try {
      const header = socket.handshake.auth?.token || socket.handshake.headers?.authorization || "";
      const token = String(header).startsWith("Bearer ") ? String(header).slice(7) : String(header);
      if (!token) return next(new Error("Missing token"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    if (uid) socket.join(roomUser(uid));

    socket.on("subscribeRide", (rideId) => {
      if (rideId) socket.join(`ride:${String(rideId)}`);
    });
    socket.on("unsubscribeRide", (rideId) => {
      if (rideId) socket.leave(`ride:${String(rideId)}`);
    });

    socket.on("subscribeDriverFeed", (vehicleType) => {
      socket.join(roomDrivers(vehicleType));
    });
    socket.on("unsubscribeDriverFeed", (vehicleType) => {
      socket.leave(roomDrivers(vehicleType));
    });

    socket.on("webrtc:join", ({ rideId }) => {
      if (!rideId) return;
      socket.join(`webrtc:${String(rideId)}`);
    });
    socket.on("webrtc:leave", ({ rideId }) => {
      if (!rideId) return;
      socket.leave(`webrtc:${String(rideId)}`);
    });
    socket.on("webrtc:signal", ({ rideId, data }) => {
      if (!rideId || !data) return;
      socket.to(`webrtc:${String(rideId)}`).emit("webrtc:signal", {
        fromUserId: socket.data.userId,
        rideId: String(rideId),
        data,
      });
    });

    socket.on("ride:typing", ({ rideId, isTyping }) => {
      if (!rideId) return;
      socket.to(roomRide(rideId)).emit("ride:typing", {
        rideId: String(rideId),
        fromUserId: socket.data.userId,
        isTyping: Boolean(isTyping),
        ts: Date.now(),
      });
    });
  });

  setIo(io);

  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other process or run: npm run dev (auto-frees stale ports)`);
    } else {
      console.error("Server error:", err?.message || err);
    }
    process.exit(1);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`API http://localhost:${PORT}`);
    logLanApiUrls(PORT);
    console.log(`Admin web UI http://localhost:${PORT}/admin-ui/`);
  });

  const simulationEnabled = String(process.env.SIMULATION_ENABLED || "0").trim() === "1";
  const intervalMs = Number(process.env.SIMULATION_INTERVAL_MS) || 4000;
  if (simulationEnabled) {
    setInterval(() => {
      simulateDriverMovement().catch((err) => {
        console.error("simulation", err);
      });
    }, intervalMs);
  } else {
    console.log("Driver simulation off (set SIMULATION_ENABLED=1 to enable)");
  }
}

main().catch((err) => {
  console.error("Failed to start:", err?.message || err);
  console.error(`Fix: set MONGODB_URI in backend/.env\n${getMongoSetupHelp()}`);
  process.exit(1);
});
