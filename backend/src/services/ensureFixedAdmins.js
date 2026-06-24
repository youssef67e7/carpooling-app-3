import bcrypt from "bcryptjs";
import { AdminAccount } from "../models/AdminAccount.js";
import { User } from "../models/User.js";
import { FIXED_ADMIN_EMAILS, FIXED_ADMIN_ENV, normalizeAdminEmail } from "../config/fixedAdmins.js";

/**
 * Keeps at most the two fixed admin credentials in AdminAccount (bcrypt only in DB).
 * Optionally reads ADMIN_BCRYPT_* or ADMIN_PASSWORD_* from env to create/update hashes.
 * Demotes any User with role admin whose email is not in the allowlist.
 */
export async function ensureFixedAdminAccounts() {
  await AdminAccount.deleteMany({ email: { $nin: FIXED_ADMIN_EMAILS } });

  for (const cfg of FIXED_ADMIN_ENV) {
    const email = normalizeAdminEmail(cfg.email);
    const hashFromEnv = process.env[cfg.hashEnv]?.trim();
    const plainFromEnv = process.env[cfg.passEnv]?.trim();
    let passwordHash = hashFromEnv || null;
    if (!passwordHash && plainFromEnv) {
      passwordHash = await bcrypt.hash(plainFromEnv, 12);
    }

    const existing = await AdminAccount.findOne({ email });
    if (!passwordHash) {
      if (!existing) {
        console.warn(
          `[admin] No ${cfg.hashEnv} or ${cfg.passEnv} — AdminAccount for ${email} not created. Admins cannot log in until set.`
        );
      }
      continue;
    }

    if (!existing) {
      await AdminAccount.create({ email, passwordHash });
      console.log(`[admin] Created AdminAccount for ${email}`);
    } else if (hashFromEnv || plainFromEnv) {
      existing.passwordHash = passwordHash;
      await existing.save();
      console.log(`[admin] Updated AdminAccount credentials for ${email}`);
    }
  }

  const n = await AdminAccount.countDocuments();
  if (n > 2) {
    console.warn(`[admin] Unexpected AdminAccount count ${n}; expected at most 2.`);
  }

  const demoted = await User.updateMany(
    { role: "admin", email: { $nin: FIXED_ADMIN_EMAILS } },
    { $set: { role: "passenger" } }
  );
  if (demoted.modifiedCount > 0) {
    console.log(`[admin] Demoted ${demoted.modifiedCount} non-allowlisted admin user(s) to passenger.`);
  }
}
