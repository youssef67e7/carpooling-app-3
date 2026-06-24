import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  throw new Error("Firebase is not configured");
}