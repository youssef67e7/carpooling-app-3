process.env.MONGODB_URI = "memory";
process.env.JWT_SECRET = "test-jwt";
process.env.NODE_ENV = "test";
process.env.EMAIL_OTP_SECRET = "test-email-otp-secret";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.ADMIN_PASSWORD_YOUSSEF = "test-admin-pass";
process.env.ADMIN_PASSWORD_YOUSSEF1 = "test-admin-pass-1";
process.env.VERCEL = "1";

const { connectMongo, getDb } = await import("./src/mongo/client.js");
const { ensureMongoIndexes } = await import("./src/mongo/schema.js");
const { seedVehicles } = await import("./src/seed/seedVehicles.js");
const { User } = await import("./src/models/User.js");
const { DriverProfile } = await import("./src/models/DriverProfile.js");
const { PassengerProfile } = await import("./src/models/PassengerProfile.js");
const { WalletAccount } = await import("./src/models/WalletAccount.js");

await connectMongo();
const db = getDb();
console.log("connected");
await ensureMongoIndexes(() => db);
console.log("indexes done");
await seedVehicles();
console.log("vehicles done");

console.log("creating admin user...");
const u = await User.create({
  name: "Admin Youssef",
  email: "youssef@gmail.com",
  password: "$2a$10$test",
  role: "admin",
  active_role: "admin",
  is_verified: true,
  isOnline: false,
});
console.log("admin created:", u._id);

console.log("creating driver...");
const driver = await User.create({
  name: "Test Driver",
  email: "driver_test_1@test.local",
  password: "$2a$10$test",
  role: "driver",
  active_role: "driver",
  isOnline: true,
  is_verified: true,
  driver_application_status: "approved",
  vehicleType: "car_standard",
  location: { lat: 24.7136, lng: 46.6753 },
});
console.log("driver created:", driver._id);

console.log("creating driver profile...");
const profile = await DriverProfile.create({
  userId: driver._id,
  status: "approved",
  vehicleType: "car_standard",
  licenseNumber: "LIC123456",
  licenseImageUrl: "/uploads/public/test/license.jpg",
  licenseExpiry: new Date("2030-01-01"),
  cars: [{ imageUrl: "/uploads/public/test/car.jpg", brand: "Toyota", model: "Corolla", color: "White", plateNumber: "TEST-0001", seats: 4, carCategory: "sedan" }],
});
console.log("profile created:", profile._id);

console.log("creating passenger...");
const pass = await User.create({
  name: "Test Passenger",
  email: "pass_test_1@test.local",
  password: "$2a$10$test",
  role: "passenger",
  active_role: "passenger",
  isOnline: false,
  is_verified: true,
});
console.log("passenger created:", pass._id);

await PassengerProfile.create({ userId: pass._id, rating: 4.5 });
const wallet = await WalletAccount.create({
  userId: pass._id,
  walletType: "cash",
  label: "Main wallet",
  balance: 0,
  isDefault: true,
});
console.log("wallet created:", wallet._id);

process.exit(0);
