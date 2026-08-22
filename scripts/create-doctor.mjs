import bcrypt from "bcryptjs";
import pg from "pg";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const [, , email, password, ...nameParts] = process.argv;
const fullName = nameParts.join(" ") || "Dr. Neha Mehta";

if (!email || !password) {
  console.error("Usage: npm run create-doctor -- <email> <password> [full name]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked .env / .env.local / the shell environment).");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const normalizedEmail = email.trim().toLowerCase();
const passwordHash = bcrypt.hashSync(password, 12);

try {
  await pool.query(
    `insert into doctors (email, full_name, password_hash)
     values ($1, $2, $3)
     on conflict (email) do update set full_name = excluded.full_name, password_hash = excluded.password_hash`,
    [normalizedEmail, fullName, passwordHash]
  );
  console.log(`Doctor account ready: ${normalizedEmail}`);
} finally {
  await pool.end();
}
