import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { FavoriteDriver } from "../models/FavoriteDriver.js";
import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";

export const router = Router();

router.post("/drivers/:driverId", authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const userId = req.user._id;
    const driver = await User.findById(driverId).select("_id role").lean();
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    if (driver.role !== "driver") {
      return res.status(400).json({ error: "User is not a driver" });
    }
    const existing = await FavoriteDriver.findOne({ userId, driverId }).lean();
    if (existing) return res.json({ message: "Already favorite", favorite: existing });
    const favorite = await FavoriteDriver.create({ userId, driverId });
    res.status(201).json({ message: "Driver favorited", favorite });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/drivers/:driverId", authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const userId = req.user._id;
    const result = await FavoriteDriver.deleteOne({ userId, driverId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    res.json({ message: "Driver unfavorited" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/drivers", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await FavoriteDriver.countDocuments({ userId });
    const favorites = await FavoriteDriver.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("driverId", "name email profileImageUrl location vehicleType")
      .lean();
    const driverIds = favorites.map((f) => f.driverId._id);
    const profiles = await DriverProfile.find({ userId: { $in: driverIds } })
      .select("rating ratingCount selectedCarId cars")
      .lean();
    const profileMap = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));
    const drivers = favorites.map((f) => {
      const driver = f.driverId;
      const profile = profileMap[String(driver._id)];
      const car = profile?.cars?.find((c) => c._id.toString() === String(profile.selectedCarId)) || profile?.cars?.[0];
      return {
        favoriteId: f._id,
        createdAt: f.createdAt,
        driver: {
          _id: driver._id,
          name: driver.name,
          email: driver.email,
          profileImageUrl: driver.profileImageUrl,
          vehicleType: driver.vehicleType,
          rating: profile?.rating ?? 0,
          ratingCount: profile?.ratingCount ?? 0,
          carModel: car?.model ?? "",
          carColor: car?.color ?? "",
          plateNumber: car?.plateNumber ?? "",
        },
      };
    });
    const pages = Math.ceil(total / limit);
    res.json({ drivers, page, pages, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/drivers/:driverId/check", authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const userId = req.user._id;
    const existing = await FavoriteDriver.findOne({ userId, driverId }).lean();
    res.json({ isFavorite: !!existing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
