import { WalletAccount } from "../models/WalletAccount.js";
import { Transaction } from "../models/Transaction.js";

/**
 * Credit driver wallet when a ride completes (mock settlement — no real PSP).
 */
export async function creditDriverForRide(driverId, rideId, amount) {
  const amt = Number(amount);
  if (!driverId || !rideId || !amt || Number.isNaN(amt) || amt <= 0) return null;

  let account = await WalletAccount.findOne({ userId: driverId, walletType: "cash" }).sort({ createdAt: 1 });
  if (!account) {
    account = await WalletAccount.create({
      userId: driverId,
      walletType: "cash",
      phoneNumber: "",
      balance: 0,
      label: "Ride earnings",
      isDefault: true,
    });
  }

  account.balance = Math.round((Number(account.balance) + amt) * 100) / 100;
  await account.save();

  const tx = await Transaction.create({
    userId: driverId,
    walletAccountId: account._id,
    amount: amt,
    type: "ride_payment",
    status: "success",
    rideId,
    note: "Ride fare credit (simulated)",
  });
  return tx;
}
