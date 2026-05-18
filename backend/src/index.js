import dotenv from "dotenv";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import rideRoutes from "./routes/rides.js";
import driverRoutes from "./routes/driver.js";
import passengerRoutes from "./routes/passenger.js";
import adminRoutes from "./routes/admin.js";
import vehicleRoutes from "./routes/vehicles.js";
import reportRoutes from "./routes/reports.js";
import walletRoutes from "./routes/wallet.js";
import uploadsRoutes from "./routes/uploads.js";
import driverApplicationRoutes from "./routes/driverApplication.js";
import roleSwitchRoutes from "./routes/roleSwitch.js";
import aiSearchRoutes from "./routes/aiSearch.js";
import { authRequired, blockCheck } from "./middleware/auth.js";
import { AppError } from "./errors/AppError.js";
import { User } from "./models/User.js";
import { seedMockDrivers } from "./seed/seedMockDrivers.js";
import { seedVehicles } from "./seed/seedVehicles.js";
import { ensureFixedAdminAccounts } from "./services/ensureFixedAdmins.js";
import { simulateDriverMovement } from "./jobs/simulateMovement.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { globalApiLimiter } from "./middleware/rateLimiters.js";
import { setIo, roomUser, roomDrivers } from "./realtime/io.js";

// Ensure backend/.env wins over any global OS env vars (common on Windows).
dotenv.config({ override: true });

const app = express();
const server = http.createServer(app);
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors());
app.use(express.json());

/** App talks to this API only; API talks to MongoDB — use this to verify the full chain. */
app.get("/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    database: dbConnected,
    mongoState: mongoose.connection.readyState,
  });
});

app.use(globalApiLimiter);

app.use("/auth", authRoutes);
app.use("/rides", rideRoutes);
app.use("/driver", driverRoutes);
app.use("/passenger", passengerRoutes);
app.use("/admin", adminRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/reports", reportRoutes);
app.use("/wallet", walletRoutes);
// Public uploads: safe to share (profile/car images)
app.use("/uploads/public", express.static(path.resolve(process.cwd(), "uploads/public"), { index: false, redirect: false }));
// Private uploads: must be fetched via auth-checked route (documents)
app.get("/uploads/private/:userId/:file", authRequired, blockCheck, async (req, res, next) => {
  try {
    const uid = String(req.params.userId);
    const f = String(req.params.file);
    const me = String(req.userId);
    if (uid !== me) {
      const u = await User.findById(req.userId).select("role").lean();
      if (!u || u.role !== "admin") throw new AppError("Forbidden", 403);
    }
    const abs = path.resolve(process.cwd(), "uploads/private", uid, f);
    if (!abs.startsWith(path.resolve(process.cwd(), "uploads/private"))) throw new AppError("Forbidden", 403);
    return res.sendFile(abs);
  } catch (e) {
    return next(e);
  }
});
app.use("/upload", uploadsRoutes);
app.use("/ai", aiSearchRoutes);
app.use("/driver-application", driverApplicationRoutes);

const __dirnameSrc = path.dirname(fileURLToPath(import.meta.url));
const adminWebPath = path.resolve(__dirnameSrc, "../admin-web");
const adminIndex = path.join(adminWebPath, "index.html");

// Register "/admin-ui/" before "/admin-ui": Express treats these as the same path when strict routing is off,
// so the first matcher wins — redirect-first caused an infinite 302 loop for "/admin-ui/".
app.get("/admin-ui/", (_req, res) => {
  if (!existsSync(adminIndex)) {
    return res.status(500).type("text").send("admin-web not found on server");
  }
  res.type("html");
  res.sendFile(adminIndex);
});
app.get("/admin-ui", (_req, res) => res.redirect(302, "/admin-ui/"));
// index: false + redirect: false avoids a 302 loop on "/admin-ui/" (serve-static + mount path)
app.use(
  "/admin-ui",
  express.static(adminWebPath, { index: false, redirect: false, extensions: ["html"] })
);

// Mount role switching routes AFTER admin-ui to keep admin web public.
app.use("/", roleSwitchRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ridehail";

function safeMongoUriForLogs(uri) {
  return String(uri).replace(/:[^:@/]+@/, ":****@");
}

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
  console.log(`Connecting MongoDB → ${safeMongoUriForLogs(MONGODB_URI)}`);
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15_000,
  });
  console.log("MongoDB connected (API ↔ database OK)");
  await ensureFixedAdminAccounts();
  await seedVehicles();
  await seedMockDrivers();

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

    /**
     * Simple in-app call signaling (WebRTC) via Socket.IO rooms.
     * Media itself is P2P; server only relays offer/answer/ice.
     */
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

    // Simple chat typing indicator (relay-only).
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`API http://localhost:${PORT}`);
    logLanApiUrls(PORT);
    console.log(`Admin web UI http://localhost:${PORT}/admin-ui/`);
  });

  const intervalMs = Number(process.env.SIMULATION_INTERVAL_MS) || 4000;
  setInterval(() => {
    simulateDriverMovement().catch((err) => console.error("simulation", err));
  }, intervalMs);
}

main().catch((err) => {
  console.error("Failed to start:", err?.message || err);
  console.error(
    "Fix: install/start MongoDB locally, or set MONGODB_URI in backend/.env (e.g. MongoDB Atlas connection string)."
  );
  process.exit(1);
});
