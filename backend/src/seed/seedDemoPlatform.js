import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { PassengerProfile } from "../models/PassengerProfile.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { WalletAccount } from "../models/WalletAccount.js";
import { Transaction } from "../models/Transaction.js";
import { getDb } from "../mongo/client.js";

const DEMO_PASSENGERS = [
  { name: "Demo Passenger 1", email: "passenger1@demo.local", phone: "01011111111", lat: 24.7136, lng: 46.6753 },
  { name: "Demo Passenger 2", email: "passenger2@demo.local", phone: "01022222222", lat: 24.72, lng: 46.68 },
];

const DEMO_PASSWORD = "demo123";

async function ensureDemoPassenger(p) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let user = await User.findOne({ email: p.email });
  if (!user) {
    user = await User.create({
      name: p.name,
      email: p.email,
      password: hash,
      role: "passenger",
      active_role: "passenger",
      phone: p.phone,
      is_verified: true,
      isOnline: false,
      location: { lat: p.lat, lng: p.lng },
    });
    console.log(`[seed] Passenger: ${p.email} / ${DEMO_PASSWORD}`);
  } else {
    await User.updateOne(
      { email: p.email },
      {
        $set: {
          is_verified: true,
          phone: p.phone,
          location: { lat: p.lat, lng: p.lng },
        },
      },
    );
  }

  await PassengerProfile.updateOne({ userId: user._id }, { $set: { userId: user._id, rating: 4.8 } }, { upsert: true });
  return user;
}

async function ensureWallet(user, { balance = 250, label = "Main wallet" } = {}) {
  let account = await WalletAccount.findOne({ userId: user._id, walletType: "cash" });
  if (!account) {
    account = await WalletAccount.create({
      userId: user._id,
      walletType: "cash",
      phoneNumber: user.phone || "",
      label,
      balance: 0,
      isDefault: true,
    });
  }

  const current = Number(account.balance) || 0;
  if (current < balance) {
    const delta = Math.round((balance - current) * 100) / 100;
    account.balance = Math.round((current + delta) * 100) / 100;
    await account.save();
    await Transaction.create({
      userId: user._id,
      walletAccountId: account._id,
      amount: delta,
      type: "deposit",
      status: "success",
      note: "Platform seed — demo balance",
    });
  }
  return account;
}

async function ensureDriverProfiles() {
  const driverEmails = [
    "driver1@demo.local",
    "driver2@demo.local",
    "driver3@demo.local",
    "driver4@demo.local",
    "driver5@demo.local",
    "driver6@demo.local",
  ];
  for (const email of driverEmails) {
    const d = await User.findOne({ email });
    if (!d) continue;
    await User.updateOne(
      { _id: d._id },
      {
        $set: {
          is_verified: true,
          driver_application_status: "approved",
          active_role: "driver",
        },
      },
    );
    await DriverProfile.updateOne(
      { userId: d._id },
      {
        $set: {
          userId: d._id,
          status: "approved",
          reviewNote: "",
          vehicleType: d.vehicleType || "delivery",
          cars: [
            {
              brand: "Toyota",
              model: "Corolla",
              color: "White",
              plate: `DEMO-${String(d.email).replace(/\D/g, "").slice(-4) || "0001"}`,
              seats: 4,
              isActive: true,
            },
          ],
        },
      },
      { upsert: true },
    );
    await ensureWallet(d, { balance: 120, label: "Driver earnings" });
  }
}

/** Demo passengers, profiles, wallets, driver profiles — idempotent MongoDB seed. */
export async function seedDemoPlatform() {
  for (const p of DEMO_PASSENGERS) {
    const user = await ensureDemoPassenger(p);
    await ensureWallet(user, { balance: 500 });
  }
  await ensureDriverProfiles();

  const db = getDb();
  await db.collection("_meta").replaceOne(
    { _id: "demo_accounts" },
    {
      _id: "demo_accounts",
      updatedAt: new Date().toISOString(),
      passwordHint: DEMO_PASSWORD,
      accounts: [
        { role: "admin", email: "youssef@gmail.com", password: "from ADMIN_PASSWORD_YOUSSEF in .env" },
        { role: "admin", email: "youssef1@gmail.com", password: "from ADMIN_PASSWORD_YOUSSEF1 in .env" },
        { role: "passenger", email: "passenger1@demo.local", password: DEMO_PASSWORD },
        { role: "passenger", email: "passenger2@demo.local", password: DEMO_PASSWORD },
        { role: "driver", email: "driver1@demo.local", password: "driver123" },
        { role: "driver", email: "driver2@demo.local", password: "driver123" },
        { role: "driver", email: "driver3@demo.local", password: "driver123" },
        { role: "driver", email: "driver4@demo.local", password: "driver123" },
        { role: "driver", email: "driver5@demo.local", password: "driver123" },
        { role: "driver", email: "driver6@demo.local", password: "driver123" },
      ],
      note: "All data lives in MongoDB via backend API.",
    },
    { upsert: true },
  );

  console.log("[seed] Demo platform data (passengers, wallets, driver profiles) applied");
}
