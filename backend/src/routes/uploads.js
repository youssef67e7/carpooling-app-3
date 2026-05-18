import path from "path";
import { Router } from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.use(authRequired, blockCheck);

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
mkdirSync(UPLOAD_ROOT, { recursive: true });

function normVisibility(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return v === "private" ? "private" : "public";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const vis = normVisibility(req.body?.visibility);
      const userDir = path.join(UPLOAD_ROOT, vis, String(req.userId));
      mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname || "") || "").slice(0, 12).toLowerCase();
      const safeExt = ext && ext.length <= 12 ? ext : "";
      const name = `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = typeof file.mimetype === "string" && file.mimetype.startsWith("image/");
    cb(ok ? null : new AppError("Only image uploads are allowed", 400), ok);
  },
});

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("Missing image", 400);
    const vis = normVisibility(req.body?.visibility);
    const rel = `/uploads/${vis}/${encodeURIComponent(String(req.userId))}/${encodeURIComponent(req.file.filename)}`;
    return res.status(201).json({
      url: rel,
      visibility: vis,
      mime: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
