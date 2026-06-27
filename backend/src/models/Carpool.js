import { createModel } from "../mongo/odm.js";

export const Carpool = createModel("carpools", {
  modelName: "Carpool",
  refFields: {
    driverId: "User",
  },
});
