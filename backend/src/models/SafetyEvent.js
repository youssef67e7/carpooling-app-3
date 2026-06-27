import { createModel } from "../mongo/odm.js";

export const SafetyEvent = createModel("safetyEvents", {
  modelName: "SafetyEvent",
});
