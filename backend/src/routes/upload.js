import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { saveProfileImageSchema } from "../schemas/misc.schemas.js";
import { updateById } from "../mongo/queries/users.js";

const router = Router();

router.post("/profile-image", validate(saveProfileImageSchema), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith("https://res.cloudinary.com")) {
      return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "A valid Cloudinary URL is required" } });
    }
    const user = await updateById(req.user.sub, { avatar: url });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: "UPLOAD_ERROR", message: "User not found" } });
    }
    return res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
  }
});

export default router;
