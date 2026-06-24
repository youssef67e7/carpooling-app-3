import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/** Always load backend/.env even when npm is run from repo root. */
export const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(backendRoot, ".env"), override: true });
