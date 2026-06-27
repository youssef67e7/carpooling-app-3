import { createModel } from "../mongo/odm.js";

export const Promotion = createModel("promotions", {
  modelName: "Promotion",
  refFields: {
    createdBy: { model: "User", required: true },
  },
});
