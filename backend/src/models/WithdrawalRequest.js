import { createModel } from "../mongo/odm.js";

export const WithdrawalRequest = createModel("withdrawalRequests", {
  modelName: "WithdrawalRequest",
  refFields: {
    userId: "User",
    walletAccountId: "WalletAccount",
  },
});
