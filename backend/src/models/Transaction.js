import { createModel } from "../mongo/odm.js";

export const Transaction = createModel("transactions", {
  modelName: "Transaction",
  refFields: {
    userId: "User",
    walletAccountId: "WalletAccount",
    rideId: "Ride",
  },
});
