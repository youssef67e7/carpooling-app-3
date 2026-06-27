import crypto from "crypto";
import { getCollection, getMongoClient } from "../mongo/client.js";
import { WalletAccount } from "../models/WalletAccount.js";
import { Transaction } from "../models/Transaction.js";

/**
 * Find or create the default cash wallet for a user.
 * Uses atomic findOneAndUpdate with upsert to prevent duplicate creation races.
 */
async function getOrCreateCashWallet(userId) {
  let account = await WalletAccount.findOne({ userId, walletType: "cash" }).sort({ createdAt: 1 });
  if (!account) {
    const created = await WalletAccount.findOneAndUpdate(
      { userId, walletType: "cash" },
      { $setOnInsert: { userId, walletType: "cash", phoneNumber: "", balance: 0, label: "Ride earnings", isDefault: true } },
      { upsert: true, new: true },
    );
    account = created ?? (await WalletAccount.findOne({ userId, walletType: "cash" }).sort({ createdAt: 1 }));
  }
  return account;
}

/**
 * Check whether a ride_payment transaction already exists for this ride.
 * This prevents double-credit when the same ride ID is processed twice.
 */
async function rideAlreadyPaid(rideId) {
  const existing = await Transaction.findOne({ rideId, type: "ride_payment" });
  return !!existing;
}

/**
 * Credit driver wallet when a ride completes (mock settlement — no real PSP).
 * Idempotent: skips if a ride_payment transaction already exists for this rideId.
 * Uses atomic $inc to prevent lost updates from concurrent requests.
 */
export async function creditDriverForRide(driverId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!driverId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;
  if (await rideAlreadyPaid(rideId)) return null;

  const account = await getOrCreateCashWallet(driverId);
  await getCollection("wallet_accounts").updateOne({ _id: account._id }, { $inc: { balance: amt } });

  const tx = await Transaction.create({
    userId: driverId,
    walletAccountId: account._id,
    amount: amt,
    type: "ride_payment",
    status: "success",
    rideId,
    note: "Ride fare credit",
  });
  return tx;
}

/**
 * Debit passenger wallet when a ride completes with wallet as the payment method.
 * Returns the transaction or null if insufficient funds / already debited.
 * Uses atomic findOneAndUpdate with { balance: { $gte: amt } } guard to prevent negative balance.
 */
export async function debitPassengerForRide(passengerId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!passengerId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const already = await Transaction.findOne({ rideId, type: "ride_debit" });
  if (already) return null;

  const account = await getOrCreateCashWallet(passengerId);
  const updated = await WalletAccount.findOneAndUpdate(
    { _id: account._id, balance: { $gte: amt } },
    { $inc: { balance: -amt } },
    { new: true },
  );

  if (!updated) {
    await Transaction.create({
      userId: passengerId,
      walletAccountId: account._id,
      amount: amt,
      type: "ride_debit",
      status: "failed",
      rideId,
      note: "Insufficient wallet balance",
    });
    return null;
  }

  const tx = await Transaction.create({
    userId: passengerId,
    walletAccountId: account._id,
    amount: amt,
    type: "ride_debit",
    status: "success",
    rideId,
    note: "Ride fare debit (wallet)",
  });
  return tx;
}

/**
 * Atomic ride payment: debit passenger, credit driver, create both ledger entries,
 * and mark ride as paid — all within a single MongoDB transaction.
 *
 * If the server crashes mid-transaction, MongoDB automatically rolls back all changes.
 * If transactions are not available (standalone MongoDB), falls back to non-atomic
 * sequential operations with a warning.
 *
 * Idempotent: safe to call multiple times for the same rideId.
 *
 * @returns {Promise<boolean>} true if payment was processed successfully
 */
export async function atomicRidePayment(passengerId, driverId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!passengerId || !driverId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return false;

  // Check idempotency upfront — if both debit and credit already exist, skip
  const existingCredit = await Transaction.findOne({ rideId, type: "ride_payment", status: "success" });
  const existingDebit = await Transaction.findOne({ rideId, type: "ride_debit", status: "success" });
  if (existingCredit && existingDebit) return true;
  if (existingDebit && !existingCredit) {
    // Incomplete state: debit exists but no credit — reprocess credit only (non-atomic fallback)
    await creditDriverForRide(driverId, rideId, amt);
    return true;
  }

  const mongoClient = getMongoClient();
  if (!mongoClient) {
    console.warn("[wallet] No MongoClient available — falling back to non-atomic payment");
    const debit = await debitPassengerForRide(passengerId, rideId, amt);
    if (debit) await creditDriverForRide(driverId, rideId, amt);
    return !!debit;
  }

  const session = mongoClient.startSession();
  try {
    let result = false;
    await session.withTransaction(async () => {
      // 1. Find or create passenger wallet
      let pWallet = await getCollection("wallet_accounts").findOne(
        { userId: passengerId, walletType: "cash" },
        { session },
      );
      if (!pWallet) {
        const id = crypto.randomUUID();
        const now = new Date();
        await getCollection("wallet_accounts").insertOne(
          { _id: id, userId: passengerId, walletType: "cash", phoneNumber: "", balance: 0, label: "Ride earnings", isDefault: true, createdAt: now, updatedAt: now },
          { session },
        );
        pWallet = { _id: id, balance: 0 };
      }

      // 2. Debit passenger with atomic balance guard
      const debitResult = await getCollection("wallet_accounts").findOneAndUpdate(
        { _id: pWallet._id, balance: { $gte: amt } },
        { $inc: { balance: -amt } },
        { session, returnDocument: "after" },
      );
      if (!debitResult) {
        await getCollection("transactions").insertOne(
          { _id: crypto.randomUUID(), userId: passengerId, walletAccountId: pWallet._id, amount: amt, type: "ride_debit", status: "failed", rideId, note: "Insufficient wallet balance", createdAt: new Date(), updatedAt: new Date() },
          { session },
        );
        throw new Error("Insufficient balance");
      }

      // 3. Create debit ledger entry
      await getCollection("transactions").insertOne(
        { _id: crypto.randomUUID(), userId: passengerId, walletAccountId: pWallet._id, amount: amt, type: "ride_debit", status: "success", rideId, note: "Ride fare debit (wallet)", createdAt: new Date(), updatedAt: new Date() },
        { session },
      );

      // 4. Find or create driver wallet
      let dWallet = await getCollection("wallet_accounts").findOne(
        { userId: driverId, walletType: "cash" },
        { session },
      );
      if (!dWallet) {
        const id = crypto.randomUUID();
        const now = new Date();
        await getCollection("wallet_accounts").insertOne(
          { _id: id, userId: driverId, walletType: "cash", phoneNumber: "", balance: 0, label: "Ride earnings", isDefault: true, createdAt: now, updatedAt: now },
          { session },
        );
        dWallet = { _id: id };
      }

      // 5. Credit driver
      await getCollection("wallet_accounts").updateOne(
        { _id: dWallet._id },
        { $inc: { balance: amt } },
        { session },
      );

      // 6. Create credit ledger entry
      await getCollection("transactions").insertOne(
        { _id: crypto.randomUUID(), userId: driverId, walletAccountId: dWallet._id, amount: amt, type: "ride_payment", status: "success", rideId, note: "Ride fare credit", createdAt: new Date(), updatedAt: new Date() },
        { session },
      );

      // 7. Mark ride as paid
      await getCollection("rides").updateOne(
        { _id: rideId },
        { $set: { paymentProcessed: true, paymentProcessedAt: new Date() } },
        { session },
      );

      result = true;
    });

    return result;
  } catch (err) {
    console.error("[wallet] Atomic ride payment failed:", err.message, err.code);
    return false;
  } finally {
    await session.endSession();
  }
}

/**
 * Refund passenger wallet when a ride is cancelled and the passenger paid via wallet.
 * Only refunds if a ride_debit transaction exists (passenger actually paid).
 * Idempotent: skips if a ride_refund transaction already exists for this rideId.
 * Uses atomic $inc to prevent lost updates from concurrent requests.
 */
export async function refundPassengerForRide(passengerId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!passengerId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const already = await Transaction.findOne({ rideId, type: "ride_refund" });
  if (already) return null;

  // Only refund if the passenger actually paid via wallet debit
  const debit = await Transaction.findOne({ rideId, type: "ride_debit", status: "success" });
  if (!debit) return null;

  const account = await getOrCreateCashWallet(passengerId);
  await getCollection("wallet_accounts").updateOne({ _id: account._id }, { $inc: { balance: amt } });

  const tx = await Transaction.create({
    userId: passengerId,
    walletAccountId: account._id,
    amount: amt,
    type: "ride_refund",
    status: "success",
    rideId,
    note: "Ride cancellation refund",
  });
  return tx;
}

/**
 * Admin-ledger: credit a user's wallet (used for manual cash refunds).
 * Uses atomic $inc to prevent lost updates from concurrent requests.
 */
export async function adminCreditUser(userId, rideId, amount, note) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!userId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const account = await getOrCreateCashWallet(userId);
  await getCollection("wallet_accounts").updateOne({ _id: account._id }, { $inc: { balance: amt } });

  const tx = await Transaction.create({
    userId,
    walletAccountId: account._id,
    amount: amt,
    type: "ride_refund",
    status: "success",
    rideId: rideId || null,
    note: note || "Admin manual refund",
  });
  return tx;
}
