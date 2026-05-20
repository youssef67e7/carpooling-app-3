import { Router } from "express";
import { body } from "express-validator";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { DriverDocuments } from "../models/DriverDocuments.js";
import { signUserToken } from "../utils/signUserToken.js";

const router = Router();
router.use(authRequired, blockCheck);

function isOwnedUploadUrl(userId, raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (s.startsWith("http://") || s.startsWith("https://")) return true; // allow external CDN/URLs
  // Our upload URLs are returned as `/uploads/public/<userId>/<file>` or `/uploads/private/<userId>/<file>`
  return s.startsWith(`/uploads/public/${String(userId)}/`) || s.startsWith(`/uploads/private/${String(userId)}/`);
}

function assertOwnedUploadUrls(userId, urls) {
  for (const u of urls) {
    if (u == null || u === "") continue;
    if (!isOwnedUploadUrl(userId, u)) throw new AppError("Invalid image URL", 400);
  }
}

function isValidIdNumber(raw) {
  const s = String(raw || "").trim();
  return /^[0-9]{10,20}$/.test(s);
}

function parseDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampSeats(n) {
  return Math.min(20, Math.max(2, Math.floor(Number(n) || 0)));
}

router.get("/me", async (req, res, next) => {
  try {
    const [profile, docs] = await Promise.all([
      DriverProfile.findOne({ userId: req.userId }).lean(),
      DriverDocuments.findOne({ userId: req.userId }).lean(),
    ]);
    return res.json({ profile, documents: docs });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/submit",
  body("fullName").trim().notEmpty().isLength({ max: 80 }),
  body("phone").trim().notEmpty().isLength({ max: 32 }),
  body("email").isEmail().normalizeEmail(),
  body("profileImageUrl").isString().trim().isLength({ min: 4, max: 1000 }),

  body("criminalRecordFrontUrl").isString().trim().isLength({ min: 4, max: 1000 }),
  body("criminalRecordBackUrl").isString().trim().isLength({ min: 4, max: 1000 }),
  body("nationalIdNumber").custom((v) => isValidIdNumber(v)).withMessage("Invalid national id number"),

  body("licenseImageUrl").isString().trim().isLength({ min: 4, max: 1000 }),
  body("licenseNumber").trim().notEmpty().isLength({ max: 64 }),
  body("licenseExpiry").custom((v) => !!parseDateOrNull(v)).withMessage("Invalid expiry date"),

  // Car (single) OR cars[] (multi)
  body("carImageUrl").optional({ values: "falsy" }).isString().trim().isLength({ min: 4, max: 1000 }),
  body("carBrand").optional({ values: "falsy" }).trim().isLength({ min: 1, max: 80 }),
  body("carModel").optional({ values: "falsy" }).trim().isLength({ min: 1, max: 80 }),
  body("carColor").optional({ values: "falsy" }).trim().isLength({ min: 1, max: 40 }),
  body("carPlateNumber").optional({ values: "falsy" }).trim().isLength({ min: 1, max: 24 }),
  body("numberOfSeats").optional({ values: "falsy" }).toInt().isInt({ min: 2, max: 20 }),
  body("cars").isArray({ min: 1, max: 6 }),
  body("cars.*.imageUrl").isString().trim().isLength({ min: 4, max: 1000 }),
  body("cars.*.brand").trim().notEmpty().isLength({ max: 80 }),
  body("cars.*.model").trim().notEmpty().isLength({ max: 80 }),
  body("cars.*.color").trim().notEmpty().isLength({ max: 40 }),
  body("cars.*.plateNumber").trim().notEmpty().isLength({ max: 24 }),
  body("cars.*.seats").toInt().isInt({ min: 2, max: 20 }),
  body("cars.*.carCategory").optional({ values: "falsy" }).isIn(["sedan", "suv", "van"]),

  validateRequest,
  async (req, res, next) => {
    try {
      const uid = req.userId;
      const u = await User.findById(uid);
      if (!u) throw new AppError("User not found", 404);
      if (u.role === "admin") throw new AppError("Admins cannot apply as drivers", 403);

      // Prevent attaching someone else's uploads to this profile.
      assertOwnedUploadUrls(uid, [
        req.body.profileImageUrl,
        req.body.criminalRecordFrontUrl,
        req.body.criminalRecordBackUrl,
        req.body.licenseImageUrl,
        req.body.carImageUrl,
      ]);
      if (Array.isArray(req.body.cars)) {
        assertOwnedUploadUrls(
          uid,
          req.body.cars.map((c) => c?.imageUrl).filter(Boolean)
        );
      }

      u.name = String(req.body.fullName).trim().slice(0, 80);
      // Security: driver application must NOT change the account email (prevents duplicates & identity confusion).
      const submittedEmail = String(req.body.email).trim().toLowerCase();
      if (submittedEmail && String(u.email || "").toLowerCase() !== submittedEmail) {
        throw new AppError("Email mismatch. Update email from profile settings first.", 409);
      }
      u.phone = String(req.body.phone).trim().slice(0, 32);
      u.profileImageUrl = String(req.body.profileImageUrl).trim().slice(0, 500);
      /** UX: after applying, user enters Driver mode (still gated from going online until approved). */
      if (u.role !== "admin") {
        u.active_role = "driver";
      }
      u.driver_application_status = "pending";
      if (!u.vehicleType || String(u.vehicleType).trim() === "") u.vehicleType = "car_standard";
      await u.save();

      await DriverDocuments.updateOne(
        { userId: uid },
        {
          $set: {
            userId: uid,
            criminalRecordFrontUrl: String(req.body.criminalRecordFrontUrl).trim().slice(0, 500),
            criminalRecordBackUrl: String(req.body.criminalRecordBackUrl).trim().slice(0, 500),
            nationalIdNumber: String(req.body.nationalIdNumber).trim().slice(0, 32),
          },
        },
        { upsert: true }
      );

      const exp = parseDateOrNull(req.body.licenseExpiry);
      const now = new Date();
      if (!exp || exp <= now) throw new AppError("License expiry must be in the future", 400);

      // Normalize cars
      let cars = Array.isArray(req.body.cars) ? req.body.cars : null;
      if (!cars || cars.length === 0) {
        const seats = clampSeats(req.body.numberOfSeats);
        if (!seats) throw new AppError("Invalid seats", 400);
        cars = [
          {
            imageUrl: String(req.body.carImageUrl || "").trim().slice(0, 500),
            brand: String(req.body.carBrand || "").trim().slice(0, 80),
            model: String(req.body.carModel || "").trim().slice(0, 80),
            color: String(req.body.carColor || "").trim().slice(0, 40),
            plateNumber: String(req.body.carPlateNumber || "").trim().slice(0, 24),
            seats,
            carCategory: "sedan",
          },
        ];
      }
      // Validate cars
      for (const c of cars) {
        if (!c?.imageUrl || !c?.brand || !c?.model || !c?.color || !c?.plateNumber) {
          throw new AppError("Car details missing", 400);
        }
        const seats = clampSeats(c.seats);
        if (!seats) throw new AppError("Invalid seats", 400);
        c.seats = seats;
        c.carCategory = ["sedan", "suv", "van"].includes(String(c.carCategory || "").toLowerCase())
          ? String(c.carCategory).toLowerCase()
          : "sedan";
      }

      const profSet = {
        userId: uid,
        status: "pending",
        reviewNote: "",
        licenseNumber: String(req.body.licenseNumber).trim().slice(0, 64),
        licenseImageUrl: String(req.body.licenseImageUrl).trim().slice(0, 500),
        licenseExpiry: exp,
        cars,
      };

      // Keep backwards fields in sync with first car
      const first = cars[0];
      profSet.carImageUrl = first.imageUrl;
      profSet.carBrand = first.brand;
      profSet.carModel = first.model;
      profSet.carColor = first.color;
      profSet.carPlateNumber = first.plateNumber;
      profSet.numberOfSeats = first.seats;

      await DriverProfile.updateOne({ userId: uid }, { $set: profSet }, { upsert: true });
      // Ensure an active car is selected (required before going online).
      const created = await DriverProfile.findOne({ userId: uid });
      if (created && !created.selectedCarId && Array.isArray(created.cars) && created.cars[0]?._id) {
        created.selectedCarId = created.cars[0]._id;
        await created.save();
      }
      const outProfile = created ? created.toObject() : await DriverProfile.findOne({ userId: uid }).lean();
      const freshUser = await User.findById(uid);
      const token = signUserToken(freshUser);
      return res.status(201).json({
        ok: true,
        status: "pending",
        token,
        user: freshUser.toJSON(),
        profile: outProfile,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
