import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";
import { generateRefreshToken, storeRefreshToken } from "./refreshTokenService.js";

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  let payload;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: firebaseIdToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.users || json.users.length === 0) throw new Error("Invalid Firebase token");
    payload = json.users[0];
  } catch {
    throw new Error("Invalid Firebase token");
  }

  const phoneNumber = payload.phoneNumber;
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

  const accessToken = signUserToken(user);
  const rawRefreshToken = generateRefreshToken();
  await storeRefreshToken(user._id, rawRefreshToken);
  return { accessToken, refreshToken: rawRefreshToken, user, isNewUser };
}