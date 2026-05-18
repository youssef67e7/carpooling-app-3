import dotenv from "dotenv";
import { ensureDb } from "../src/db.js";
import { createApp } from "../src/createApp.js";

dotenv.config({ override: true });

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set — using dev default (set in Vercel env).");
  process.env.JWT_SECRET = "dev-only-insecure-secret-change-me";
}

let app;

/** Vercel serverless entry — lazy init so Mongo failures return JSON instead of crashing the bundle. */
export default async function handler(req, res) {
  try {
    if (!app) {
      await ensureDb();
      app = createApp();
    }
    return app(req, res);
  } catch (err) {
    console.error("Vercel handler init error:", err);
    if (!res.headersSent) {
      res.status(503).json({
        message: "API unavailable — check MONGODB_URI and JWT_SECRET on Vercel",
        error: err?.message || String(err),
      });
    }
  }
}
