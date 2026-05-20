import path from "path";
import { mkdirSync } from "fs";

/** Writable upload root — `/tmp` on Vercel (read-only project FS). */
export function getUploadRoot() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "ridehail-uploads");
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
