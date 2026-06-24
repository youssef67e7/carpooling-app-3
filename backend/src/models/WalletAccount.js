import { createModel } from "../mongo/odm.js";

export const WALLET_TYPES = ["cash", "instapay", "vodafone", "etisalat", "orange", "wepay"];

export const WalletAccount = createModel("walletAccounts", {
  modelName: "WalletAccount",
  refFields: { userId: "User" },
});
