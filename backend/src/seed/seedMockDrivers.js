import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const base = [
  { name: "Mock Driver 1", email: "driver1@demo.local", lat: 24.714, lng: 46.676, vehicleType: "shipping" },
  { name: "Mock Driver 2", email: "driver2@demo.local", lat: 24.715, lng: 46.674, vehicleType: "delivery" },
  { name: "Mock Driver 3", email: "driver3@demo.local", lat: 24.712, lng: 46.677, vehicleType: "travel" },
  { name: "Mock Driver 4", email: "driver4@demo.local", lat: 24.716, lng: 46.672, vehicleType: "motorcycle" },
  { name: "Mock Driver 5", email: "driver5@demo.local", lat: 24.7135, lng: 46.6735, vehicleType: "car_standard" },
  { name: "Mock Driver 6", email: "driver6@demo.local", lat: 24.7145, lng: 46.6785, vehicleType: "car_comfort" },
];

export async function seedMockDrivers() {
  const hash = await bcrypt.hash("driver123", 10);
  for (const d of base) {
    const exists = await User.findOne({ email: d.email });
    if (!exists) {
      await User.create({
        name: d.name,
        email: d.email,
        password: hash,
        role: "passenger",
        active_role: "driver",
        isOnline: true,
        location: { lat: d.lat, lng: d.lng },
        vehicleType: d.vehicleType,
      });
      console.log(`Seeded driver: ${d.email} / driver123 (${d.vehicleType})`);
    } else {
      await User.updateOne(
        { email: d.email },
        { $set: { location: { lat: d.lat, lng: d.lng }, vehicleType: d.vehicleType, isOnline: true } }
      );
    }
  }
}
