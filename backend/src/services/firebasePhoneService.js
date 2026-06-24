import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  let payload;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?idToken=${encodeURIComponent(firebaseIdToken)}`);
    if (!res.ok) throw new Error("Invalid Firebase token");
    payload = await res.json();
  } catch {
    throw new Error("Invalid Firebase token");
  }

  const phoneNumber = payload.phone_number;
  if (!phoneNumber) {
    throw new Error("Firebase token does not contain a phone number");
  }

  let user = await findByPhone(phoneNumber);
  let isNewUser = false;

  if (!user) {
    const userData = { phone: phoneNumber, role: "user", created_at: new Date() };
    if (name && typeof name === "string" && name.trim()) userData.name = name.trim();
    await create(userData);
    user = await findByPhone(phoneNumber);
    isNewUser = true;
  }

  const token = signUserToken(user);
  return { token, user, isNewUser };
}