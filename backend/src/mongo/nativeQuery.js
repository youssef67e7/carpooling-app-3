import { ObjectId } from "mongodb";
import { getCollection, getDb } from "./client.js";
import { camelToSnake, rowToDoc, syncFieldAliases } from "./fieldMap.js";

function toNativeId(id) {
  if (!id) return id;
  return /^[0-9a-f]{24}$/i.test(String(id)) ? ObjectId(String(id)) : String(id);
}

function convertFilterKeys(filter) {
  if (!filter || typeof filter !== "object" || Array.isArray(filter) || filter instanceof RegExp || filter instanceof Date)
    return filter;
  const out = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key === "_id") {
      out._id = toNativeId(val);
      continue;
    }
    if (key.startsWith("$")) {
      out[key] = Array.isArray(val) ? val.map(convertFilterKeys) : convertFilterKeys(val);
      continue;
    }
    const snakeKey = camelToSnake(key);
    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      out[snakeKey] = convertFilterKeys(val);
    } else {
      out[snakeKey] = val;
    }
  }
  return out;
}

function convertSortKeys(sort) {
  if (!sort) return sort;
  const out = {};
  for (const [key, val] of Object.entries(sort)) {
    out[camelToSnake(key)] = val;
  }
  return out;
}

function convertProjection(select) {
  if (!select) return undefined;
  if (typeof select === "string") {
    return select.split(/\s+/).reduce((acc, f) => {
      const v = f.startsWith("-") ? 0 : 1;
      acc[camelToSnake(f.replace(/^-/, ""))] = v;
      return acc;
    }, {});
  }
  const out = {};
  for (const [key, val] of Object.entries(select)) {
    out[camelToSnake(key)] = val;
  }
  return out;
}

export async function nativeFind(tableName, filter, opts = {}) {
  const col = getCollection(tableName);
  const nativeFilter = convertFilterKeys(filter);
  let cursor = col.find(nativeFilter);
  if (opts.sort) cursor = cursor.sort(convertSortKeys(opts.sort));
  if (opts.skip) cursor = cursor.skip(opts.skip);
  if (opts.limit) cursor = cursor.limit(opts.limit);
  if (opts.projection) cursor = cursor.project(convertProjection(opts.projection));
  const rows = await cursor.toArray();
  if (opts.raw) return rows;
  return rows.map((r) => rowToDoc(r));
}

export async function nativeFindOne(tableName, filter, opts = {}) {
  const col = getCollection(tableName);
  const nativeFilter = convertFilterKeys(filter);
  let cursor = col.find(nativeFilter).limit(1);
  if (opts.sort) cursor = cursor.sort(convertSortKeys(opts.sort));
  if (opts.projection) cursor = cursor.project(convertProjection(opts.projection));
  const rows = await cursor.toArray();
  if (!rows.length) return null;
  return opts.raw ? rows[0] : rowToDoc(rows[0]);
}

export async function nativeCount(tableName, filter = {}) {
  const col = getCollection(tableName);
  return col.countDocuments(convertFilterKeys(filter));
}

export async function nativeAggregate(tableName, pipeline, opts = {}) {
  const col = getCollection(tableName);
  const nativePipeline = pipeline.map((stage) => {
    const out = {};
    for (const [key, val] of Object.entries(stage)) {
      if (key === "$match") out[key] = convertFilterKeys(val);
      else out[key] = val;
    }
    return out;
  });
  const cursor = await col.aggregate(nativePipeline);
  const rows = await cursor.toArray();
  return opts.raw ? rows : rows.map((r) => rowToDoc(r));
}

export async function nativeUpdateOne(tableName, filter, update, opts = {}) {
  const col = getCollection(tableName);
  const nativeFilter = convertFilterKeys(filter);
  const nativeUpdate = {};
  for (const [op, fields] of Object.entries(update)) {
    if (op === "$set" || op === "$inc" || op === "$unset") {
      nativeUpdate[op] = convertFilterKeys(fields);
    } else {
      nativeUpdate[op] = fields;
    }
  }
  return col.updateOne(nativeFilter, nativeUpdate, opts);
}

export async function nativeFindOneAndUpdate(tableName, filter, update, opts = {}) {
  const col = getCollection(tableName);
  const nativeFilter = convertFilterKeys(filter);
  const nativeUpdate = {};
  for (const [op, fields] of Object.entries(update)) {
    if (op === "$set" || op === "$inc" || op === "$unset") {
      nativeUpdate[op] = convertFilterKeys(fields);
    } else {
      nativeUpdate[op] = fields;
    }
  }
  const row = await col.findOneAndUpdate(nativeFilter, nativeUpdate, { ...opts, returnDocument: "after" });
  if (!row) return null;
  return rowToDoc(row);
}

export async function nativeDeleteOne(tableName, filter) {
  const col = getCollection(tableName);
  const result = await col.deleteOne(convertFilterKeys(filter));
  return { deletedCount: result.deletedCount };
}

export async function nativeDeleteMany(tableName, filter) {
  const col = getCollection(tableName);
  const result = await col.deleteMany(convertFilterKeys(filter));
  return { deletedCount: result.deletedCount };
}

export async function nativeUpdateMany(tableName, filter, update) {
  const col = getCollection(tableName);
  const nativeFilter = convertFilterKeys(filter);
  const nativeUpdate = {};
  for (const [op, fields] of Object.entries(update)) {
    if (op === "$set" || op === "$inc" || op === "$unset") {
      nativeUpdate[op] = convertFilterKeys(fields);
    } else {
      nativeUpdate[op] = fields;
    }
  }
  const result = await col.updateMany(nativeFilter, nativeUpdate);
  return { acknowledged: result.acknowledged, modifiedCount: result.modifiedCount, upsertedCount: result.upsertedCount ?? 0 };
}
