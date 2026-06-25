import { WalletAccount } from "../models/WalletAccount.js";
import { Transaction } from "../models/Transaction.js";

/**
 * Find or create the default cash wallet for a user.
 */
async function getOrCreateCashWallet(userId) {
  let account = await WalletAccount.findOne({ userId, walletType: "cash" }).sort({ createdAt: 1 });
  if (!account) {
    account = await WalletAccount.create({
      userId,
      walletType: "cash",
      phoneNumber: "",
      balance: 0,
      label: "Ride earnings",
      isDefault: true,
    });
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
 */
export async function creditDriverForRide(driverId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!driverId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;
  if (await rideAlreadyPaid(rideId)) return null;

  const account = await getOrCreateCashWallet(driverId);
  account.balance = Math.round((Number(account.balance) + amt) * 100) / 100;
  await account.save();

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
 */
export async function debitPassengerForRide(passengerId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!passengerId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const already = await Transaction.findOne({ rideId, type: "ride_debit" });
  if (already) return null;

  const account = await getOrCreateCashWallet(passengerId);
  const balance = Number(account.balance) || 0;
  if (balance < amt) {
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

  account.balance = Math.round((balance - amt) * 100) / 100;
  await account.save();

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
 * Refund passenger wallet when a ride is cancelled and the passenger paid via wallet.
 * Idempotent: skips if a ride_refund transaction already exists for this rideId.
 */
export async function refundPassengerForRide(passengerId, rideId, amount) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!passengerId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const already = await Transaction.findOne({ rideId, type: "ride_refund" });
  if (already) return null;

  const account = await getOrCreateCashWallet(passengerId);
  account.balance = Math.round((Number(account.balance) + amt) * 100) / 100;
  await account.save();

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
 */
export async function adminCreditUser(userId, rideId, amount, note) {
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!userId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  const account = await getOrCreateCashWallet(userId);
  account.balance = Math.round((Number(account.balance) + amt) * 100) / 100;
  await account.save();

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
