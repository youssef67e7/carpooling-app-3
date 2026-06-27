import { createModel } from "../mongo/odm.js";

export const Referral = createModel("referrals", {
  modelName: "Referral",
  refFields: {
    userId: { model: "User", required: true },
    referredUserId: { model: "User", required: false },
  },
  uniqueFields: ["code"],
});
