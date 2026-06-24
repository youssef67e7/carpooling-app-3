import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { DriverDocuments } from "../models/DriverDocuments.js";
import { Ride } from "../models/Ride.js";
import { Transaction } from "../models/Transaction.js";
import { WalletAccount } from "../models/WalletAccount.js";
import { verificationProgress } from "./driverVerification.js";
import { MAX_DRIVER_CONCURRENT_RIDES } from "./driverRideCapacity.js";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Unified driver home data — all from MongoDB Atlas collections. */
export async function getDriverDashboard(userId) {
  const uid = String(userId);
  const user = await User.findById(uid).lean();
  if (!user) return null;

  const [profile, documents, accounts, sessionTxs, completedRides, activeRides] = await Promise.all([
    DriverProfile.findOne({ userId: uid }).lean(),
    DriverDocuments.findOne({ userId: uid }).lean(),
    WalletAccount.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
    Transaction.find({ userId: uid, type: "ride_payment", createdAt: { $gte: startOfToday() } }).lean(),
    Ride.find({ driverId: uid, status: "completed" }).sort({ completedAt: -1, updatedAt: -1 }).limit(500).lean(),
    Ride.find({ driverId: uid, status: { $in: ["accepted", "ongoing"] } }).lean(),
  ]);

  const sessionEarnings = sessionTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  let totalEarnings = 0;
  let rated = 0;
  let ratingSum = 0;
  for (const r of completedRides) {
    totalEarnings += Number(r.agreedFare ?? r.estimatedFare ?? r.fare ?? 0) || 0;
    if (r.passengerRating != null) {
      rated += 1;
      ratingSum += Number(r.passengerRating) || 0;
    }
  }

  const walletBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const assignedCount = activeRides.length;
  const verification = verificationProgress(user, profile);
  const approved = user.driver_application_status === "approved" && profile?.status === "approved";

  return {
    user: {
      id: uid,
      name: user.name,
      email: user.email,
      isOnline: !!user.isOnline,
      vehicleType: user.vehicleType || "",
      driverApplicationStatus: user.driver_application_status || "none",
      activeRole: user.active_role || user.role,
    },
    profile: profile || null,
    documents: documents || null,
    verification,
    stats: {
      sessionEarnings: Math.round(sessionEarnings * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averageRating: profile?.rating ?? (rated ? Math.round((ratingSum / rated) * 10) / 10 : null),
      ratedTrips: profile?.ratingCount ?? rated,
      completedTrips: completedRides.length,
      activeTrips: assignedCount,
      assignedCount,
      maxConcurrent: MAX_DRIVER_CONCURRENT_RIDES,
      canTakeMore: assignedCount < MAX_DRIVER_CONCURRENT_RIDES,
      walletBalance: Math.round(walletBalance * 100) / 100,
    },
    wallet: { accounts, totalBalance: Math.round(walletBalance * 100) / 100 },
    approved,
  };
}
