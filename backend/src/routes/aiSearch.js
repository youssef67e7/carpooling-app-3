import { Router } from "express";
import { body } from "express-validator";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

// Optional auth: we keep it authenticated to prevent abuse / cost spikes.
router.use(authRequired, blockCheck);

function envKey() {
  const k = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
  return String(k || "").trim();
}

function normalizeSuggestions(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((s) => {
      const label = String(s?.label || "").trim().slice(0, 200);
      const latitude = Number(s?.latitude);
      const longitude = Number(s?.longitude);
      if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        id: String(s?.id || `${latitude},${longitude}`).slice(0, 120),
        label,
        latitude,
        longitude,
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

async function openaiRerank({ query, lang, proximity, suggestions }) {
  const key = envKey();
  if (!key) return { ok: true, usedAI: false, suggestions };

  // Cheap/fast approach: ask model to return indices sorted by relevance.
  const sys = `You rerank place autocomplete suggestions.
Return JSON ONLY: {"order":[0,1,2,...]}.
order must include each index exactly once.`;

  const payload = {
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      {
        role: "user",
        content: JSON.stringify({
          query,
          lang,
          proximity,
          suggestions,
          instructions:
            "Prefer closer matches to proximity when ambiguous. Prefer well-known places/POIs for short queries. Prefer exact text match when present.",
        }),
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `OpenAI HTTP ${res.status}`;
    throw new AppError(msg, 502);
  }

  const content = data?.choices?.[0]?.message?.content;
  let parsed = null;
  try {
    parsed = JSON.parse(content || "{}");
  } catch {
    parsed = null;
  }
  const order = Array.isArray(parsed?.order) ? parsed.order : null;
  if (!order) return { ok: true, usedAI: false, suggestions };

  const seen = new Set();
  const out = [];
  for (const idx of order) {
    const i = Number(idx);
    if (!Number.isInteger(i) || i < 0 || i >= suggestions.length) continue;
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(suggestions[i]);
  }
  // Append any missing items (safety)
  for (let i = 0; i < suggestions.length; i++) {
    if (!seen.has(i)) out.push(suggestions[i]);
  }
  return { ok: true, usedAI: true, suggestions: out };
}

router.post(
  "/places/rerank",
  body("query").isString().trim().isLength({ min: 1, max: 120 }),
  body("lang").optional({ checkFalsy: true }).isString().trim().isLength({ max: 12 }),
  body("proximity").optional().isObject(),
  body("proximity.latitude").optional().isFloat({ min: -90, max: 90 }),
  body("proximity.longitude").optional().isFloat({ min: -180, max: 180 }),
  body("suggestions").isArray({ min: 1, max: 10 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const query = String(req.body.query || "").trim().slice(0, 120);
      const lang = String(req.body.lang || "en").trim().slice(0, 12);
      const proximity =
        req.body.proximity && req.body.proximity.latitude != null && req.body.proximity.longitude != null
          ? { latitude: Number(req.body.proximity.latitude), longitude: Number(req.body.proximity.longitude) }
          : null;
      const suggestions = normalizeSuggestions(req.body.suggestions);
      if (!suggestions.length) throw new AppError("No suggestions", 400);

      const out = await openaiRerank({ query, lang, proximity, suggestions });
      return res.json(out);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/fare/suggest",
  body("distanceKm").isFloat({ min: 0.1, max: 500 }).toFloat(),
  body("vehicleType").isString().trim().isLength({ min: 1, max: 32 }),
  body("lang").optional({ checkFalsy: true }).isString().trim().isLength({ max: 12 }),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  validateRequest,
  async (req, res, next) => {
    try {
      const distanceKm = Number(req.body.distanceKm);
      const vehicleType = String(req.body.vehicleType).toLowerCase().trim();
      const lang = String(req.body.lang || "en").trim().slice(0, 12);
      const passengerCount = req.body.passengerCount != null ? Number(req.body.passengerCount) : 1;

      // Deterministic baseline (no AI needed)
      const { Vehicle } = await import("../models/Vehicle.js");
      const { fareFromVehiclePricing } = await import("../utils/geo.js");
      const v = await Vehicle.findOne({ typeKey: vehicleType, active: true }).lean();
      if (!v) throw new AppError("Invalid vehicle type", 400);

      const suggested = fareFromVehiclePricing(v.baseFare, v.pricePerKm, distanceKm);
      // Simple band; AI can refine, but we keep safe defaults.
      const min = Math.round(suggested * 100) / 100;
      const max = Math.round((suggested * (passengerCount >= 4 ? 1.35 : 1.25)) * 100) / 100;

      // Optional AI refinement (fallback safe)
      const key = envKey();
      if (!key) {
        return res.json({ ok: true, usedAI: false, suggested, min, max, currencyHint: "local" });
      }

      const sys = `You suggest fair ride pricing ranges.
Return JSON ONLY: {"suggested":number,"min":number,"max":number}.
Constraints: suggested>=min, max>=suggested, numbers must be positive.`;
      const payload = {
        model: process.env.OPENAI_MODEL_FARE || process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: JSON.stringify({
              distanceKm,
              vehicleType,
              passengerCount,
              lang,
              baseline: { suggested, min, max, baseFare: v.baseFare, pricePerKm: v.pricePerKm },
              instructions:
                "Keep values close to baseline. Prefer rounding to 0 or 0.5. Do not exceed baseline max by more than 10%.",
            }),
          },
        ],
      };
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await aiRes.json().catch(() => null);
      if (!aiRes.ok) {
        return res.json({ ok: true, usedAI: false, suggested, min, max, currencyHint: "local" });
      }
      const content = data?.choices?.[0]?.message?.content;
      let parsed = null;
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
        parsed = null;
      }
      const s2 = Number(parsed?.suggested);
      const min2 = Number(parsed?.min);
      const max2 = Number(parsed?.max);
      const okNums = [s2, min2, max2].every((n) => Number.isFinite(n) && n > 0);
      if (!okNums) return res.json({ ok: true, usedAI: false, suggested, min, max, currencyHint: "local" });
      const out = {
        ok: true,
        usedAI: true,
        suggested: Math.round(s2 * 100) / 100,
        min: Math.round(min2 * 100) / 100,
        max: Math.round(max2 * 100) / 100,
        currencyHint: "local",
      };
      // Enforce constraints
      if (out.min > out.suggested) out.min = out.suggested;
      if (out.max < out.suggested) out.max = out.suggested;
      // clamp max
      const hardMax = Math.round(max * 1.1 * 100) / 100;
      if (out.max > hardMax) out.max = hardMax;
      return res.json(out);
    } catch (e) {
      next(e);
    }
  }
);

export default router;

