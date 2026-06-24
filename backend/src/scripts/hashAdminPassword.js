/**
 * Usage: npm run hash-admin-password -- "your-plain-password"
 * Prints a bcrypt hash suitable for ADMIN_BCRYPT_YOUSSEF / ADMIN_BCRYPT_YOUSSEF1.
 */
import bcrypt from "bcryptjs";

const plain = process.argv.slice(2).join(" ").trim();
if (!plain) {
  console.error('Usage: npm run hash-admin-password -- "your-password"');
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 12);
console.log(hash);
