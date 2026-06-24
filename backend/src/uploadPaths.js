import path from "path";
import { mkdirSync } from "fs";

/** Writable upload root — persistent local disk by default. */
export function getUploadRoot() {
  const custom = String(process.env.UPLOAD_ROOT || "").trim();
  if (custom) {
    return path.resolve(custom);
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "weret-uploads");
  }
  return path.resolve(process.cwd(), "uploads");
}

export function ensureUploadRoot() {
  const root = getUploadRoot();
  mkdirSync(root, { recursive: true });
  return root;
}

export function userUploadDir(visibility, userId) {
  const root = ensureUploadRoot();
  const dir = path.join(root, visibility === "private" ? "private" : "public", String(userId));
  mkdirSync(dir, { recursive: true });
  return dir;
}
