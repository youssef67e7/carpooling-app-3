export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  return { token: "mock-token", user: { _id: "mock", phone: firebaseIdToken, role: "user" }, isNewUser: true };
}