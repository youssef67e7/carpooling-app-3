import { createModel } from "../mongo/odm.js";

export const FavoriteDriver = createModel("favoriteDrivers", {
  modelName: "FavoriteDriver",
  refFields: {
    userId: "User",
    driverId: "User",
  },
});
