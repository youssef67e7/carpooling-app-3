import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
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
import { errorHandler } from "./middleware/errorHandler.js";
import { globalApiLimiter } from "./middleware/rateLimiters.js";
import { getUploadRoot } from "./uploadPaths.js";

const __dirnameSrc = path.dirname(fileURLToPath(import.meta.url));
const adminWebPath = path.resolve(__dirnameSrc, "../admin-web");
const adminIndex = path.join(adminWebPath, "index.html");

/** Shared Express app (local server + Vercel serverless). */
export function createApp() {
  const app = express();
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({
      ok: true,
      database: dbConnected,
      mongoState: mongoose.connection.readyState,
      vercel: Boolean(process.env.VERCEL),
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

  const uploadRoot = getUploadRoot();
  app.use(
    "/uploads/public",
    express.static(path.join(uploadRoot, "public"), { index: false, redirect: false })
  );

  app.get("/uploads/private/:userId/:file", authRequired, blockCheck, async (req, res, next) => {
    try {
      const uid = String(req.params.userId);
      const f = String(req.params.file);
      const me = String(req.userId);
      if (uid !== me) {
        const u = await User.findById(req.userId).select("role").lean();
        if (!u || u.role !== "admin") throw new AppError("Forbidden", 403);
      }
      const privateRoot = path.resolve(uploadRoot, "private");
      const abs = path.resolve(privateRoot, uid, f);
      if (!abs.startsWith(privateRoot)) throw new AppError("Forbidden", 403);
      return res.sendFile(abs);
    } catch (e) {
      return next(e);
    }
  });

  app.use("/upload", uploadsRoutes);
  app.use("/ai", aiSearchRoutes);
  app.use("/driver-application", driverApplicationRoutes);

  app.get("/admin-ui/", (_req, res) => {
    if (!existsSync(adminIndex)) {
      return res.status(500).type("text").send("admin-web not found on server");
    }
    res.type("html");
    res.sendFile(adminIndex);
  });
  app.get("/admin-ui", (_req, res) => res.redirect(302, "/admin-ui/"));
  app.use(
    "/admin-ui",
    express.static(adminWebPath, { index: false, redirect: false, extensions: ["html"] })
  );

  app.use("/", roleSwitchRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use(errorHandler);

  return app;
}
