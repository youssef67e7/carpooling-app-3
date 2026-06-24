import { createModel } from "../mongo/odm.js";

export const User = createModel("users", {
  modelName: "User",
  uniqueFields: ["email", "googleSub", "firebaseUid"],
  toJSON(obj) {
    const out = { ...obj };
    delete out.password;
    return out;
  },
});
