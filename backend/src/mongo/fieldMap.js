/** Map JS camelCase ↔ MongoDB snake_case field names in documents. */

const DATE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "blockedUntil",
  "cancelledAt",
  "expiresAt",
  "licenseExpiry",
  "deliverBy",
  "acceptedAt",
  "startedAt",
  "completedAt",
  "proposedAt",
]);

export function camelToSnake(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

export function snakeToCamel(key) {
  return String(key).replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Keep snake_case + camelCase in sync (backend routes use both styles). */
export function syncFieldAliases(obj) {
  if (!obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (key === "_id") continue;
    const val = obj[key];
    if (val === undefined) continue;
    if (key.includes("_")) {
      const camel = snakeToCamel(key);
      obj[camel] = val;
    } else if (/[A-Z]/.test(key)) {
      const snake = camelToSnake(key);
      obj[snake] = val;
    }
  }
  return obj;
}

export function readField(obj, key) {
  if (!obj || key == null) return undefined;
  if (String(key).includes(".")) {
    const v = getNested(obj, key);
    if (v !== undefined) return v;
    const parts = String(key).split(".");
    const alt = parts.map((p) => (p.includes("_") ? snakeToCamel(p) : camelToSnake(p))).join(".");
    return getNested(obj, alt);
  }
  if (obj[key] !== undefined) return obj[key];
  if (String(key).includes("_")) return obj[snakeToCamel(key)];
  return obj[camelToSnake(key)];
}

function getNested(obj, path) {
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function collectionToTable(collectionName) {
  /** MongoDB collection / document field prefix (snake_case). */
  return camelToSnake(String(collectionName));
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

export function docToRow(doc) {
  const out = {};
  for (const [key, val] of Object.entries(doc)) {
    if (key === "_model" || key === "_isNew" || key === "isNew" || key === "IsNew") continue;
    if (val === undefined) continue;
    const col = key === "_id" ? "id" : camelToSnake(key);
    if (val instanceof Date) {
      out[col] = val.toISOString();
    } else if (Array.isArray(val)) {
      out[col] = val.map((item) => (item instanceof Date ? item.toISOString() : item));
    } else if (isPlainObject(val)) {
      out[col] = val;
    } else {
      out[col] = val;
    }
  }
  return out;
}

export function rowToDoc(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    if (key === "_isNew" || key === "_model" || key === "isNew") continue;
    const jsKey = key === "id" || key === "_id" ? "_id" : snakeToCamel(key);
    if (val == null) {
      out[jsKey] = val;
      continue;
    }
    if (DATE_KEYS.has(jsKey) || jsKey.endsWith("At") || jsKey.endsWith("Until")) {
      out[jsKey] = new Date(val);
      continue;
    }
    if (jsKey === "driverProposal" && val && typeof val === "object") {
      out[jsKey] = {
        ...val,
        expiresAt: val.expiresAt ? new Date(val.expiresAt) : val.expiresAt,
        proposedAt: val.proposedAt ? new Date(val.proposedAt) : val.proposedAt,
      };
      continue;
    }
    if (jsKey === "parcel" && val && typeof val === "object" && val.deliverBy) {
      out[jsKey] = { ...val, deliverBy: new Date(val.deliverBy) };
      continue;
    }
    out[jsKey] = val;
  }
  out._id = String(out._id);
  return syncFieldAliases(out);
}
