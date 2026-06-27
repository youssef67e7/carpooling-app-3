import { createModel } from "../mongo/odm.js";

export const WALLET_TYPES = ["cash", "instapay", "vodafone", "etisalat", "orange", "wepay", "card"];
export const CARD_BRANDS = ["visa", "mastercard", "amex", "mada", "other"];

export const WalletAccount = createModel("walletAccounts", {
  modelName: "WalletAccount",
  refFields: { userId: "User" },
});
