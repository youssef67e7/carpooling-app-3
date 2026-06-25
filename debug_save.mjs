import "./backend/src/loadEnv.js";
import { connectMongo, closeMongo, getCollection } from "./backend/src/mongo/client.js";
import { DriverProfile } from "./backend/src/models/DriverProfile.js";
import { newDocId } from "./backend/src/mongo/odm.js";

(async () => {
  await connectMongo();

  // Create profile via ODM (like /become-driver does)
  await DriverProfile.updateOne(
    { userId: "debug-test-user" },
    { $set: { userId: "debug-test-user", status: "approved", cars: [] } },
    { upsert: true }
  );

  let prof = await DriverProfile.findOne({ userId: "debug-test-user" });

  console.log("Before save:");
  console.log("  _id:", prof._id);
  console.log("  selectedCarId on doc:", prof.selectedCarId);
  console.log("  own keys:", Object.keys(prof).filter(k => !k.startsWith("_")));

  const carId = newDocId();
  prof.cars = [{ _id: carId, brand: "Test" }];
  prof.selectedCarId = carId;

  console.log("After setting:");
  console.log("  selectedCarId on doc:", prof.selectedCarId);
  console.log("  toObject.selectedCarId:", prof.toObject().selectedCarId);
  console.log("  toObject.selected_car_id:", prof.toObject().selected_car_id);

  await prof.save();

  console.log("After save:");
  const raw = await getCollection("driver_profiles").findOne({ userId: "debug-test-user" });
  console.log("  stored selected_car_id:", raw?.selected_car_id);
  console.log("  stored cars:", JSON.stringify(raw?.cars));

  const reread = await DriverProfile.findOne({ userId: "debug-test-user" }).lean();
  console.log("  ODM selectedCarId:", reread?.selectedCarId);

  // Cleanup
  await DriverProfile.deleteOne({ userId: "debug-test-user" });
  await closeMongo();
})();
