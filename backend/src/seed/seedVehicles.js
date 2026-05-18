import { Vehicle } from "../models/Vehicle.js";

const DEFAULTS = [
  {
    typeKey: "shipping",
    name: "Shipping",
    nameKey: "shipping",
    capacity: 1,
    baseFare: 22,
    pricePerKm: 3.2,
    image: "https://picsum.photos/seed/ameen-ship/320/200",
    icon: "truck",
    sortOrder: 0,
  },
  {
    typeKey: "delivery",
    name: "Delivery",
    nameKey: "delivery",
    capacity: 4,
    baseFare: 10,
    pricePerKm: 2.2,
    image: "https://picsum.photos/seed/ameen-deliver/320/200",
    icon: "package",
    sortOrder: 1,
  },
  {
    typeKey: "travel",
    name: "Travel",
    nameKey: "travel",
    capacity: 4,
    baseFare: 38,
    pricePerKm: 4.8,
    image: "https://picsum.photos/seed/ameen-travel/320/200",
    icon: "car",
    sortOrder: 2,
  },
  {
    typeKey: "motorcycle",
    name: "Motorcycle",
    nameKey: "motorcycle",
    capacity: 1,
    baseFare: 8,
    pricePerKm: 1.6,
    image: "https://picsum.photos/seed/ameen-bike/320/200",
    icon: "bike",
    sortOrder: 3,
  },
  {
    typeKey: "car_standard",
    name: "Standard sedan 4 seats",
    nameKey: "car_standard",
    capacity: 4,
    baseFare: 9,
    pricePerKm: 2.0,
    image: "https://picsum.photos/seed/ameen-car4/320/200",
    icon: "car",
    sortOrder: 4,
  },
  {
    typeKey: "car_comfort",
    name: "Comfort sedan 4 seats",
    nameKey: "car_comfort",
    capacity: 4,
    baseFare: 15,
    pricePerKm: 3.0,
    image: "https://picsum.photos/seed/ameen-comfort/320/200",
    icon: "car_comfort",
    sortOrder: 5,
  },
];

export async function seedVehicles() {
  const keys = DEFAULTS.map((v) => v.typeKey);
  await Vehicle.updateMany({ typeKey: { $nin: keys } }, { $set: { active: false } });

  for (const v of DEFAULTS) {
    await Vehicle.findOneAndUpdate(
      { typeKey: v.typeKey },
      { $set: { ...v, active: true } },
      { upsert: true, new: true }
    );
  }
  console.log("Vehicle types seeded (shipping, delivery, travel, motorcycle, car_standard, car_comfort)");
}
