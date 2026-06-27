import { createModel } from "../mongo/odm.js";

export const SavedPlace = createModel("savedPlaces", {
  modelName: "SavedPlace",
  refFields: {
    userId: { model: "User", required: true, index: true },
  },
});
