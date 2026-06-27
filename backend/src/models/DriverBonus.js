import { createModel } from "../mongo/odm.js";

export const DriverBonus = createModel("driverBonuses", {
  modelName: "DriverBonus",
  refFields: { driverId: "User" },
});
