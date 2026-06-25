import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { saveProfileImageSchema } from "../schemas/misc.schemas.js";
import { updateById } from "../mongo/queries/users.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dixvj7zzs",
  api_key: process.env.CLOUDINARY_API_KEY || "299489452134333",
  api_secret: process.env.CLOUDINARY_API_SECRET || "V_ChDYZxZZJlzAvkeIgIPamljr4",
  secure: true,
});

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "No image data provided" } });
    }
    if (typeof image !== "string" || !image.startsWith("data:")) {
      return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "Image must be a data URL (base64)" } });
    }
    if (image.length > 15 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "Image exceeds 15MB limit" } });
    }
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: folder || "driver_uploads",
      public_id: `${req.user?.sub || "anon"}_${Date.now()}`,
      transformation: [{ width: 1000, height: 1000, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }],
    });
    return res.status(200).json({
      success: true,
      data: {
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
        format: uploadResponse.format,
        width: uploadResponse.width,
        height: uploadResponse.height,
        size: uploadResponse.bytes,
      },
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
  }
});

router.post("/profile-image", validate(saveProfileImageSchema), async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl || !imageUrl.startsWith("https://res.cloudinary.com")) {
      return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "A valid Cloudinary URL is required" } });
    }
    const user = await updateById(req.user.sub, { avatar: imageUrl });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: "UPLOAD_ERROR", message: "User not found" } });
    }
    return res.status(200).json({ success: true, data: { url: imageUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
  }
});

export default router;
