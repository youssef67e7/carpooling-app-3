import { MongoClient, ServerApiVersion } from "mongodb";

let client = null;
let db = null;
let initPromise = null;
let memoryServer = null;
/** @type {"atlas"|"local"|"memory"|"off"} */
let connectionMode = "off";
let lastConnectError = null;

export function resolveMongoUri() {
  return String(process.env.MONGODB_URI || "").trim();
}

export function resolveMongoLocalUri() {
  return String(process.env.MONGODB_LOCAL_URI || "").trim();
}

export function resolveMongoDbName() {
  return String(process.env.MONGODB_DB_NAME || "weret").trim();
}

export function isUsingMemoryMongo() {
  return connectionMode === "memory";
}

export function getMongoConnectionMode() {
  return connectionMode;
}

export function getMongoConnectionInfo() {
  return {
    mode: connectionMode,
    dbName: resolveMongoDbName(),
    atlasUriConfigured: Boolean(resolveMongoUri()) && !useMemoryOnly(),
    localUriConfigured: Boolean(resolveMongoLocalUri()),
    persistsInAtlasUi: connectionMode === "atlas",
    persistsOnDisk: connectionMode === "atlas" || connectionMode === "local",
    note:
      connectionMode === "memory"
        ? "In-memory dev DB — changes are real in MongoDB but reset on server restart and do NOT appear in Atlas UI."
        : connectionMode === "local"
          ? "Local MongoDB — changes persist on disk and appear in Compass / mongosh."
          : connectionMode === "atlas"
            ? "MongoDB Atlas — changes appear in Atlas Data Explorer."
            : "Not connected",
    lastError: lastConnectError ? lastConnectError.replace(/mongodb\+srv:\/\/[^@]+@/, "mongodb+srv://***:***@") : null,
  };
}

export function getMongoSetupHelp() {
  return [
    "MongoDB connection options (backend/.env):",
    "",
    "1) Atlas (production):",
    "   MONGODB_URI=mongodb+srv://user:pass@cluster....mongodb.net/",
    "   MONGODB_DB_NAME=weret",
    "",
    "2) Local MongoDB (persistent dev — install MongoDB Community or Docker):",
    "   MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/weret",
    "",
    "3) If Atlas blocked by WARP/VPN (SSL alert 80):",
    "   MONGODB_FALLBACK_MEMORY=1   (temporary — data resets on restart)",
  ].join("\n");
}

export function isMongoConfigured() {
  const uri = resolveMongoUri();
  const local = resolveMongoLocalUri();
  if (local) return true;
  if (!uri) return false;
  if (uri === "memory" || uri === "mongodb://memory") return true;
  return true;
}

function shouldFallbackToMemory() {
  if (String(process.env.MONGODB_ATLAS_REQUIRED || "").trim() === "1") return false;
  return String(process.env.MONGODB_FALLBACK_MEMORY || "").trim() === "1";
}

function atlasRequired() {
  return String(process.env.MONGODB_ATLAS_REQUIRED || "").trim() === "1";
}

function useMemoryOnly() {
  const uri = resolveMongoUri();
  return uri === "memory" || uri === "mongodb://memory" || String(process.env.MONGODB_USE_MEMORY || "").trim() === "1";
}

function isTlsOrNetworkError(err) {
  const msg = String(err?.message || err);
  return /ETIMEDOUT|ECONNREFUSED|SSL|TLS|tlsv1|alert internal error|MongoServerSelectionError/i.test(msg);
}

function normalizeAtlasUri(raw) {
  const uri = String(raw || "").trim();
  if (!uri || !uri.startsWith("mongodb+srv://")) return uri;
  const dbName = resolveMongoDbName();
  try {
    const u = new URL(uri);
    if (!u.pathname || u.pathname === "/" || u.pathname === "") {
      u.pathname = `/${dbName}`;
    }
    if (!u.searchParams.has("retryWrites")) u.searchParams.set("retryWrites", "true");
    if (!u.searchParams.has("w")) u.searchParams.set("w", "majority");
    return u.toString();
  } catch {
    return uri;
  }
}

function atlasClientOptions() {
  const opts = {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    /** Fixes TLS handshake failures on some Windows / dual-stack networks. */
    autoSelectFamily: false,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
  };
  return opts;
}

async function resetClient() {
  if (client) {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    client = null;
  }
}

async function connectToMemory() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create();
  }
  await resetClient();
  client = new MongoClient(memoryServer.getUri());
  await client.connect();
  db = client.db(resolveMongoDbName());
  connectionMode = "memory";
  console.log("[mongo] Using in-memory MongoDB (local dev — data resets on restart, not visible in Atlas UI)");
  return db;
}

async function connectToUri(uri, mode) {
  await resetClient();
  client = new MongoClient(uri, mode === "atlas" ? atlasClientOptions() : { serverSelectionTimeoutMS: 12000 });
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  db = client.db(resolveMongoDbName());
  connectionMode = mode;
  console.log(mode === "atlas" ? "[mongo] Connected to MongoDB Atlas" : `[mongo] Connected to local MongoDB (${uri})`);
  return db;
}

async function connectToAtlas() {
  const uri = normalizeAtlasUri(resolveMongoUri());
  return connectToUri(uri, "atlas");
}

async function connectToLocal() {
  return connectToUri(resolveMongoLocalUri(), "local");
}

export async function connectMongo() {
  if (db) return db;

  if (!isMongoConfigured()) {
    throw new Error(getMongoSetupHelp());
  }

  if (!initPromise) {
    initPromise = (async () => {
      if (useMemoryOnly()) {
        return connectToMemory();
      }

      const atlasUri = resolveMongoUri();
      if (atlasUri) {
        try {
          return await connectToAtlas();
        } catch (err) {
          const msg = String(err?.message || err);
          lastConnectError = msg.slice(0, 300);
          console.warn("[mongo] Atlas unreachable (", msg.slice(0, 120), ")");
        }
      }

      const localUri = resolveMongoLocalUri();
      if (localUri) {
        try {
          return await connectToLocal();
        } catch (err) {
          console.warn("[mongo] Local MongoDB unreachable:", String(err?.message || err).slice(0, 120));
        }
      }

      if (shouldFallbackToMemory()) {
        console.warn("[mongo] Falling back to in-memory DB — changes will NOT appear in Atlas UI");
        return connectToMemory();
      }

      const hint = atlasRequired()
        ? "MONGODB_ATLAS_REQUIRED=1 — fix Atlas network access / disable WARP, then restart."
        : "Set MONGODB_FALLBACK_MEMORY=1 only for temporary offline dev.";
      throw new Error(`Could not connect to MongoDB Atlas. ${hint}`);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}

export function getDb() {
  if (!db) throw new Error("MongoDB not connected — call connectMongo() first");
  return db;
}

export function getMongoClient() {
  return client;
}

export function getCollection(name) {
  return getDb().collection(name);
}

export function isMongoReady() {
  return Boolean(db);
}

export async function closeMongo() {
  await resetClient();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  db = null;
  initPromise = null;
  connectionMode = "off";
}
