import { Router } from "express";
import { Vehicle } from "../models/Vehicle.js";
import { authRequired, blockCheck } from "../middleware/auth.js";

const router = Router();

router.use(authRequired, blockCheck);

/** Active vehicle tiers for booking UI */
router.get("/", async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ active: true }).sort({ sortOrder: 1 }).lean();
    return res.json({ vehicles });
  } catch (e) {
    next(e);
  }
});

export default router;
