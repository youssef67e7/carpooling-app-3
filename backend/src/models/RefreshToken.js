import { createModel } from "../mongo/odm.js";

export const RefreshToken = createModel("refreshTokens", {
  modelName: "RefreshToken",
  uniqueFields: ["tokenHash"],
  refFields: { userId: "User" },
});
