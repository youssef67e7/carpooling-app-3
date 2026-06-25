import { sendPushToUser, sendPushToMany } from "./fcmService.js";

export async function notifyRideAccepted(ride) {
  await sendPushToUser(
    ride.passengerId,
    { title: "Driver found!", body: "Your ride has been accepted" },
    { type: "ride_update", rideId: String(ride._id), status: "accepted" },
    { highPriority: true }
  );
}

export async function notifyDriverArrived(ride) {
  await sendPushToUser(
    ride.passengerId,
    { title: "Driver has arrived", body: "Your driver is waiting at the pickup point" },
    { type: "ride_update", rideId: String(ride._id), status: "driver_arriving" },
    { highPriority: true }
  );
}

export async function notifyPassengerOnboard(ride) {
  await sendPushToUser(
    ride.passengerId,
    { title: "You're on board", body: "Your driver is now starting the trip" },
    { type: "ride_update", rideId: String(ride._id), status: "onboard" },
    { highPriority: true }
  );
}

export async function notifyTripStarted(ride) {
  await sendPushToUser(
    ride.passengerId,
    { title: "Trip started", body: "You are on your way" },
    { type: "ride_update", rideId: String(ride._id), status: "ongoing" },
    { highPriority: true }
  );
}

export async function notifyTripCompleted(ride) {
  const targets = [ride.passengerId];
  if (ride.driverId) targets.push(ride.driverId);

  await sendPushToMany(
    targets,
    { title: "Trip completed", body: "Please rate your experience" },
    {
      type: "ride_update",
      rideId: String(ride._id),
      status: "completed",
      fare: String(ride.fare || 0),
    }
  );
}

export async function notifyRideCancelled(ride, cancelledBy, reason) {
  const targetId =
    String(cancelledBy) === String(ride.passengerId) ? ride.driverId : ride.passengerId;
  if (!targetId) return;

  await sendPushToUser(
    targetId,
    { title: "Ride cancelled", body: reason || "The ride has been cancelled" },
    {
      type: "ride_update",
      rideId: String(ride._id),
      status: "cancelled",
      cancelledBy: String(cancelledBy),
    }
  );
}

export async function notifyNewMessage(rideId, senderId, senderName, content, recipientId) {
  const preview = content.length > 100 ? content.substring(0, 100) + "..." : content;
  await sendPushToUser(
    recipientId,
    { title: senderName || "New message", body: preview },
    { type: "chat_message", rideId: String(rideId), senderId: String(senderId) }
  );
}

export async function notifyDriverVerified(driverUserId) {
  await sendPushToUser(
    driverUserId,
    { title: "Account verified!", body: "You can now go online and start accepting rides" },
    { type: "driver_update", event: "verified" }
  );
}

export async function notifyDriverRejected(driverUserId, reason) {
  await sendPushToUser(
    driverUserId,
    { title: "Application update", body: reason || "Your driver application was not approved" },
    { type: "driver_update", event: "rejected" }
  );
}

export async function notifyPaymentReceived(driverUserId, rideId, amount) {
  await sendPushToUser(
    driverUserId,
    { title: "Payment received", body: `EGP ${amount} has been added to your wallet` },
    { type: "payment", rideId: String(rideId), amount: String(amount) }
  );
}

export async function notifyWalletDeposit(userId, amount, newBalance) {
  await sendPushToUser(
    userId,
    { title: "Deposit successful", body: `EGP ${amount} added to your wallet` },
    { type: "wallet", event: "deposit", amount: String(amount), newBalance: String(newBalance) }
  );
}

export async function notifyWalletWithdrawal(userId, amount, newBalance) {
  await sendPushToUser(
    userId,
    { title: "Withdrawal processed", body: `EGP ${amount} withdrawn from your wallet` },
    { type: "wallet", event: "withdrawal", amount: String(amount), newBalance: String(newBalance) }
  );
}
