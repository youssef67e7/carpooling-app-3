import { createModel, newDocId } from "../mongo/odm.js";

export const DriverProfile = createModel("driverProfiles", {
  modelName: "DriverProfile",
  uniqueFields: ["userId"],
  refFields: { userId: "User" },
  beforeSave(doc) {
    if (Array.isArray(doc.cars)) {
      doc.cars = doc.cars.map((c) => ({
        ...c,
        _id: c._id || newDocId(),
      }));
    }
  },
});
