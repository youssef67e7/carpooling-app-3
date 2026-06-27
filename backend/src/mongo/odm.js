import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getCollection } from "./client.js";
import { camelToSnake, collectionToTable, docToRow, rowToDoc, readField, snakeToCamel, syncFieldAliases } from "./fieldMap.js";
import {
  nativeFind,
  nativeFindOne,
  nativeCount,
  nativeUpdateOne,
  nativeUpdateMany,
  nativeDeleteOne,
  nativeDeleteMany,
  nativeAggregate,
} from "./nativeQuery.js";

/** @type {Map<string, object>} */
const MODEL_REGISTRY = new Map();

export function registerModel(name, model) {
  MODEL_REGISTRY.set(name, model);
}

export function getModel(name) {
  return MODEL_REGISTRY.get(name);
}

export function newDocId() {
  return crypto.randomUUID();
}

export function toDate(v) {
  if (v == null) return v;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  return new Date(v);
}

function toComparable(v) {
  if (v == null) return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (typeof v === "number") return v;
  return String(v);
}

export function getNested(obj, path) {
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function setNested(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export function serializeForDb(obj) {
  return docToRow(obj);
}

function hydrateData(data) {
  return rowToDoc(data);
}

function rowFromDoc(row) {
  if (!row) return null;
  const hydrated = hydrateData(row);
  return { id: hydrated._id, ...hydrated };
}

export class MongoDoc {
  constructor(model, data) {
    const hydrated = hydrateData(data);
    Object.assign(this, hydrated);
    this._id = String(hydrated._id);
    this._model = model;
    this._isNew = Boolean(hydrated._isNew);
  }

  toObject() {
    const obj = { ...this };
    delete obj._model;
    delete obj._isNew;
    delete obj.isNew;
    delete obj.IsNew;
    return syncFieldAliases(obj);
  }

  toJSON() {
    let obj = this.toObject();
    if (typeof this._model.toJSONHook === "function") {
      obj = this._model.toJSONHook(obj);
    }
    return obj;
  }

  async save() {
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    this.updatedAt = now;

    if (this._model.beforeSave) {
      await this._model.beforeSave(this);
    }

    const toObj = this.toObject();
    const plain = syncFieldAliases({ ...toObj, _id: this._id });
    const payload = serializeForDb(plain);
    const id = String(payload.id || this._id);
    delete payload.id;
    const table = this._model.tableName;
    const queryId = /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : id;
    await getCollection(table).replaceOne({ _id: queryId }, { _id: queryId, ...payload }, { upsert: true });
    this._isNew = false;
    return this;
  }
}

export function docFromRow(row, model) {
  if (!row) return null;
  return new MongoDoc(model, row);
}

export function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  const plain = doc instanceof MongoDoc ? doc.toObject() : doc;

  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or") {
      if (!Array.isArray(val) || !val.some((sub) => matchesFilter(plain, sub))) return false;
      continue;
    }
    if (key === "$and") {
      if (!Array.isArray(val) || !val.every((sub) => matchesFilter(plain, sub))) return false;
      continue;
    }

    const docVal = readField(plain, key);

    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date)) {
      if ("$in" in val) {
        const set = val.$in.map(String);
        if (!set.includes(String(docVal))) return false;
        continue;
      }
      if ("$nin" in val) {
        const set = val.$nin.map(String);
        if (set.includes(String(docVal))) return false;
        continue;
      }
      if ("$gte" in val) {
        if (toComparable(docVal) < toComparable(val.$gte)) return false;
        continue;
      }
      if ("$gt" in val) {
        if (toComparable(docVal) <= toComparable(val.$gt)) return false;
        continue;
      }
      if ("$lte" in val) {
        if (toComparable(docVal) > toComparable(val.$lte)) return false;
        continue;
      }
      if ("$lt" in val) {
        if (toComparable(docVal) >= toComparable(val.$lt)) return false;
        continue;
      }
      if ("$ne" in val) {
        if (String(docVal) === String(val.$ne)) return false;
        continue;
      }
    }

    if (val instanceof RegExp) {
      if (!val.test(String(docVal ?? ""))) return false;
      continue;
    }

    if (String(docVal) !== String(val)) return false;
  }
  return true;
}

export function applyUpdate(target, update) {
  const $set = update.$set || {};
  const $inc = update.$inc || {};

  for (const [k, v] of Object.entries(update)) {
    if (k.startsWith("$")) continue;
    if (k.includes(".")) setNested(target, k, v);
    else target[k] = v;
  }
  for (const [k, v] of Object.entries($set)) {
    if (k.includes(".")) setNested(target, k, v);
    else target[k] = v;
  }
  for (const [k, delta] of Object.entries($inc)) {
    const cur = Number(getNested(target, k) || 0);
    setNested(target, k, cur + Number(delta));
  }
}

function sortDocs(docs, sortSpec) {
  const entries = Object.entries(sortSpec);
  return [...docs].sort((a, b) => {
    const ao = a instanceof MongoDoc ? a.toObject() : a;
    const bo = b instanceof MongoDoc ? b.toObject() : b;
    for (const [field, dir] of entries) {
      const av = toComparable(getNested(ao, field));
      const bv = toComparable(getNested(bo, field));
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return dir === -1 ? -cmp : cmp;
    }
    return 0;
  });
}

function projectFields(docs, selectStr) {
  const fields = String(selectStr).split(/\s+/).filter(Boolean);
  const include = new Set(["_id", ...fields]);
  return docs.map((d) => {
    const src = d instanceof MongoDoc ? d.toObject() : { ...d };
    const out = {};
    for (const f of include) {
      if (f.includes(".")) setNested(out, f, readField(src, f));
      else {
        const val = readField(src, f);
        if (val !== undefined) out[f] = val;
        const alt = f.includes("_") ? snakeToCamel(f) : null;
        if (alt && out[alt] === undefined && src[alt] !== undefined) out[alt] = src[alt];
      }
    }
    return d instanceof MongoDoc ? new MongoDoc(d._model, out) : out;
  });
}

async function loadCollectionDocs(model) {
  const rows = await getCollection(model.tableName).find({}).toArray();
  return rows.map((row) => docFromRow(rowFromDoc(row), model));
}

async function runPopulate(docs, populates, parentModel) {
  if (!docs.length || !populates.length) return docs;

  let out = docs.map((d) => (d instanceof MongoDoc ? d.toObject() : { ...d }));

  for (const spec of populates) {
    if (Array.isArray(spec)) {
      for (const s of spec) out = await runPopulateOne(out, s, parentModel);
    } else {
      out = await runPopulateOne(out, spec, parentModel);
    }
  }

  return out.map((o) => new MongoDoc(parentModel, o));
}

async function fetchDocByPath(modelName, id, select) {
  if (!id) return null;
  const model = MODEL_REGISTRY.get(modelName);
  if (!model) return null;
  const queryId = /^[0-9a-f]{24}$/i.test(String(id)) ? new ObjectId(String(id)) : String(id);
  const row = await getCollection(model.tableName).findOne({ _id: queryId });
  let doc = docFromRow(rowFromDoc(row), model);
  if (select) {
    const projected = projectFields([doc], select);
    doc = projected[0];
  }
  return doc instanceof MongoDoc ? doc.toObject() : doc;
}

async function runPopulateOne(docs, spec, parentModel) {
  const path = spec.path;
  const select = spec.select;

  if (path === "bookings") {
    const Booking = MODEL_REGISTRY.get("Booking");
    if (!Booking) return docs;
    const allBookings = await loadCollectionDocs(Booking);
    return Promise.all(
      docs.map(async (doc) => {
        const rideId = String(doc._id);
        let bookings = allBookings.filter((b) => {
          const o = b.toObject();
          return String(o.rideId) === rideId && matchesFilter(o, spec.match || {});
        });
        if (spec.options?.sort) bookings = sortDocs(bookings, spec.options.sort);
        if (spec.populate) {
          const nested = await runPopulate(
            bookings.map((b) => b.toObject()),
            [spec.populate],
            Booking,
          );
          bookings = nested.map((b) => (b instanceof MongoDoc ? b.toObject() : b));
        }
        return { ...doc, bookings };
      }),
    );
  }

  const refModelName = parentModel.refFields?.[path] || guessRefModel(path);
  return Promise.all(
    docs.map(async (doc) => {
      const copy = { ...doc };
      if (path.includes(".")) {
        const parentKey = path.split(".").slice(0, -1).join(".");
        const leaf = path.split(".").pop();
        const parent = getNested(copy, parentKey);
        if (parent && parent[leaf]) {
          const populated = await fetchDocByPath(refModelName, parent[leaf], select);
          parent[leaf] = populated;
          setNested(copy, parentKey, parent);
        }
      } else if (copy[path]) {
        copy[path] = await fetchDocByPath(refModelName, copy[path], select);
      }
      return copy;
    }),
  );
}

function guessRefModel(path) {
  const base = path.includes(".") ? path.split(".").pop() : path;
  if (base === "senderId" || (base.endsWith("Id") && base.includes("passenger")) || base === "passengerId") return "User";
  if (base.endsWith("Id")) {
    const name = base.replace(/Id$/, "");
    const map = {
      user: "User",
      ride: "Ride",
      driver: "User",
      passenger: "User",
      reporter: "User",
      reportedUser: "User",
      walletAccount: "WalletAccount",
      actorAdmin: "User",
      target: "User",
    };
    return map[name] || "User";
  }
  return "User";
}

export class MongoQuery {
  constructor(model, filter = {}, { singleId = null, findOne = false } = {}) {
    this._model = model;
    this._filter = filter;
    this._singleId = singleId;
    this._findOne = findOne;
    this._select = null;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._populates = [];
    this._lean = false;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  populate(spec, select) {
    if (typeof spec === "string") {
      this._populates.push({ path: spec, select });
      return this;
    }
    this._populates.push(spec);
    return this;
  }

  sort(spec) {
    this._sort = spec;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  then(onF, onR) {
    return this.exec().then(onF, onR);
  }

  async exec() {
    let docs;

    const makeProjection = () => {
      if (!this._select) return undefined;
      const fields = String(this._select).split(/\s+/).filter(Boolean);
      const proj = { _id: 1 };
      for (const f of fields) proj[f] = f.startsWith("-") ? 0 : 1;
      return proj;
    };

    if (this._singleId) {
      const rawId = String(this._singleId);
      const queryId = /^[0-9a-f]{24}$/i.test(rawId) ? new ObjectId(rawId) : rawId;
      if (this._populates.length) {
        const row = await getCollection(this._model.tableName).findOne({ _id: queryId });
        docs = row ? [docFromRow(rowFromDoc(row), this._model)] : [];
      } else {
        const proj = makeProjection();
        const row = await nativeFindOne(this._model.tableName, { _id: rawId }, { raw: true, projection: proj });
        docs = row ? [docFromRow(row, this._model)] : [];
      }
    } else if (!this._populates.length) {
      const isSingle = this._singleId || this._findOne;
      if (isSingle) {
        const proj = makeProjection();
        const row = await nativeFindOne(this._model.tableName, this._filter, {
          raw: true,
          projection: proj,
          sort: this._sort || undefined,
        });
        docs = row ? [docFromRow(row, this._model)] : [];
      } else {
        const opts = {};
        if (this._sort) opts.sort = this._sort;
        if (this._skip) opts.skip = this._skip;
        if (this._limit != null) opts.limit = this._limit;
        opts.projection = makeProjection();
        docs = await nativeFind(this._model.tableName, this._filter, { ...opts, raw: true });
        docs = docs.map((row) => docFromRow(row, this._model));
      }
    } else {
      docs = await loadCollectionDocs(this._model);
      docs = docs.filter((d) => matchesFilter(d.toObject(), this._filter));
      if (this._sort) docs = sortDocs(docs, this._sort);
      if (this._skip) docs = docs.slice(this._skip);
      if (this._limit != null) docs = docs.slice(0, this._limit);
    }

    if (this._populates.length) {
      const plain = docs.map((d) => d.toObject());
      const populated = await runPopulate(plain, this._populates, this._model);
      docs = populated.map((p) => (p instanceof MongoDoc ? p : new MongoDoc(this._model, p)));
    }

    if (this._select && this._populates.length) docs = projectFields(docs, this._select);

    if (this._lean) {
      const plain = docs.map((d) => (d instanceof MongoDoc ? d.toObject() : d));
      if (this._singleId || this._findOne) return plain[0] ?? null;
      return plain;
    }

    if (this._singleId || this._findOne) return docs[0] ?? null;
    return docs;
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function checkUniqueFields(model, data, excludeId = null) {
  for (const field of model.uniqueFields || []) {
    const val = data[field];
    if (val == null || val === "") continue;
    const filter = { [field]: { $regex: new RegExp("^" + escapeRegex(val) + "$", "i") } };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await nativeFindOne(model.tableName, filter, { projection: { _id: 1 } });
    if (existing) {
      const err = new Error(`Duplicate ${field}`);
      err.code = 11000;
      err.keyValue = { [field]: val };
      throw err;
    }
  }
}

export function createModel(collectionName, options = {}) {
  const model = {
    collectionName,
    tableName: options.tableName || collectionToTable(collectionName),
    modelName: options.modelName || collectionName,
    toJSONHook: options.toJSON,
    uniqueFields: options.uniqueFields || [],
    refFields: options.refFields || {},
    virtualPopulates: options.virtualPopulates || {},
    beforeSave: options.beforeSave || null,
  };

  registerModel(model.modelName, model);

  model.findById = (id) => {
    if (!id) {
      const empty = new MongoQuery(model, {}, { findOne: true });
      empty.exec = async () => null;
      return empty;
    }
    return new MongoQuery(model, {}, { singleId: String(id) });
  };

  model.findOne = (filter) => new MongoQuery(model, filter, { findOne: true });

  model.find = (filter) => new MongoQuery(model, filter);

  model.create = async (data) => {
    await checkUniqueFields(model, data);
    const id = data._id ? String(data._id) : newDocId();
    const now = new Date();
    const doc = new MongoDoc(model, { ...data, _id: id, createdAt: now, updatedAt: now, _isNew: true });
    await doc.save();
    return doc;
  };

  model.countDocuments = async (filter = {}) => nativeCount(model.tableName, filter);

  model.updateOne = async (filter, update, opts = {}) => {
    const id = filter._id ? String(filter._id) : null;
    if (id) {
      const result = await nativeUpdateOne(model.tableName, filter, update, opts);
      return { acknowledged: result.acknowledged, modifiedCount: result.modifiedCount, upsertedCount: result.upsertedCount ?? 0 };
    }
    const existing = await nativeFindOne(model.tableName, filter, { projection: { _id: 1 } });
    if (!existing) {
      if (opts.upsert) {
        const base = filter.userId ? { userId: filter.userId } : { ...filter };
        applyUpdate(base, update);
        await model.create(base);
        return { acknowledged: true, modifiedCount: 1, upsertedCount: 1 };
      }
      return { acknowledged: true, modifiedCount: 0 };
    }
    await nativeUpdateOne(model.tableName, filter, update);
    return { acknowledged: true, modifiedCount: 1 };
  };

  model.updateMany = async (filter, update) => {
    const result = await nativeUpdateMany(model.tableName, filter, update);
    return { acknowledged: result.acknowledged, modifiedCount: result.modifiedCount ?? 0 };
  };

  model.deleteOne = async (filter) => nativeDeleteOne(model.tableName, filter);

  model.deleteMany = async (filter) => nativeDeleteMany(model.tableName, filter);

  model.findOneAndUpdate = async (filter, update, opts = {}) => {
    const toSnakeKeys = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[camelToSnake(k)] = v;
      }
      return out;
    };

    const id = filter._id ? String(filter._id) : null;
    const nativeFilter = toSnakeKeys(filter);
    if (id) nativeFilter._id = /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : id;

    const nativeUpdate = {};
    for (const [op, fields] of Object.entries(update)) {
      if (op === "$set" || op === "$inc" || op === "$unset") {
        nativeUpdate[op] = toSnakeKeys(fields);
      } else {
        nativeUpdate[op] = fields;
      }
    }

    if (id) {
      const row = await getCollection(model.tableName).findOneAndUpdate(nativeFilter, nativeUpdate, {
        returnDocument: opts.new === false ? "before" : "after",
      });
      if (row) return new MongoDoc(model, rowFromDoc(row));
      return null;
    }

    const existing = await nativeFindOne(model.tableName, filter, { projection: { _id: 1 } });
    if (!existing) {
      if (opts.upsert) {
        const base = { ...filter };
        syncFieldAliases(base);
        applyUpdate(base, update);
        return model.create(base);
      }
      return null;
    }
    await nativeUpdateOne(model.tableName, filter, update);
    return model.findOne(filter);
  };

  model.findByIdAndUpdate = (id, update, opts) => model.findOneAndUpdate({ _id: id }, update, opts);

  model.aggregate = async (pipeline) => {
    const convertStage = (stage) => {
      if (stage.$group) {
        const g = { _id: stage.$group._id };
        for (const [key, val] of Object.entries(stage.$group)) {
          if (key !== "_id") g[camelToSnake(key)] = val;
        }
        return { $group: g };
      }
      if (stage.$match)
        return {
          $match: (() => {
            const m = {};
            for (const [k, v] of Object.entries(stage.$match)) m[camelToSnake(k)] = v;
            return m;
          })(),
        };
      return stage;
    };
    return nativeAggregate(model.tableName, pipeline.map(convertStage), { raw: true });
  };

  return model;
}
