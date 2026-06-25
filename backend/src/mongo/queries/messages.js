import { ObjectId } from "mongodb";
import { getCollection } from "../client.js";

export async function getMessagesByRideId(rideId, { before, limit = 30 } = {}) {
  const filter = { ride_id: String(rideId) };
  if (before) {
    filter.created_at = { $lt: new Date(before) };
  }
  const rows = await getCollection("messages")
    .find(filter)
    .sort({ created_at: -1 })
    .limit(Math.min(limit, 300))
    .toArray();
  const userIds = [...new Set(rows.map((r) => String(r.sender_id)).filter(Boolean))];
  const users = userIds.length > 0
    ? await getCollection("users")
        .find({ _id: { $in: userIds } }, { projection: { name: 1, role: 1 } })
        .toArray()
    : [];
  const userMap = Object.fromEntries(users.map((u) => [String(u._id), { _id: String(u._id), name: u.name, role: u.role }]));
  const messages = rows.reverse().map((r) => ({
    _id: String(r._id),
    rideId: String(r.ride_id),
    senderId: userMap[String(r.sender_id)] || { _id: String(r.sender_id) },
    text: r.text,
    type: r.type || "text",
    createdAt: r.created_at,
  }));
  return messages;
}

export async function createMessage(rideId, senderId, text, idempotencyKey) {
  if (idempotencyKey) {
    const existing = await getCollection("messages").findOne({ idempotency_key: idempotencyKey });
    if (existing) {
      return { _id: String(existing._id), deduplicated: true };
    }
  }
  const doc = {
    ride_id: String(rideId),
    sender_id: String(senderId),
    text: String(text).trim(),
    type: "text",
    created_at: new Date(),
  };
  if (idempotencyKey) doc.idempotency_key = idempotencyKey;
  const result = await getCollection("messages").insertOne(doc);
  return { _id: String(result.insertedId), deduplicated: false };
}
