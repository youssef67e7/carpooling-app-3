import { User } from "../models/User.js";
import { Ride } from "../models/Ride.js";

function stepToward(fromLat, fromLng, toLat, toLng, t = 0.12) {
  return {
    lat: fromLat + (toLat - fromLat) * t,
    lng: fromLng + (toLng - fromLng) * t,
  };
}

function distSq(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/** Move online drivers: toward pickup if accepted, toward destination if ongoing, else small jitter */
export async function simulateDriverMovement() {
  const drivers = await User.find({ active_role: "driver", isOnline: true });
  for (const driver of drivers) {
    const ride = await Ride.findOne({
      driverId: driver._id,
      status: { $in: ["accepted", "ongoing"] },
    });
    let next = { ...driver.location };
    if (ride) {
      const target =
        ride.status === "ongoing" ? ride.destinationLocation : ride.pickupLocation;
      next = stepToward(driver.location.lat, driver.location.lng, target.lat, target.lng, 0.15);
      if (distSq(next, target) < 1e-8) {
        next = { lat: target.lat, lng: target.lng };
      }
    } else {
      next = {
        lat: driver.location.lat + (Math.random() - 0.5) * 0.0003,
        lng: driver.location.lng + (Math.random() - 0.5) * 0.0003,
      };
    }
    await User.updateOne({ _id: driver._id }, { $set: { location: next } });
  }
}
