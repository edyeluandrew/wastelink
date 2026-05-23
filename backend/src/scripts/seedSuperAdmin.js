import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

dotenv.config();

const requiredEnv = ["SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD"];

const ensureUsersTableShape = async () => {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS division VARCHAR(100),
      ADD COLUMN IF NOT EXISTS collection_point_id INT,
      ADD COLUMN IF NOT EXISTS picker_id INT
  `);

  const constraintResult = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.contype = 'c'
  `);

  const roleConstraint = constraintResult.rows.find((row) => row.definition.includes('role'));

  if (roleConstraint) {
    if (
      !roleConstraint.definition.includes('SUPER_ADMIN') ||
      !roleConstraint.definition.includes('CITY_ADMIN') ||
      !roleConstraint.definition.includes('AGENT') ||
      !roleConstraint.definition.includes('PICKER')
    ) {
      await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${roleConstraint.conname}`);
      await pool.query(`
        ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('SUPER_ADMIN', 'CITY_ADMIN', 'AGENT', 'PICKER'))
      `);
    }
  } else {
    await pool.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('SUPER_ADMIN', 'CITY_ADMIN', 'AGENT', 'PICKER'))
    `);
  }
};

const seedSuperAdmin = async () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const email = process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const resetPassword = String(process.env.RESET_SUPER_ADMIN_PASSWORD || "false").toLowerCase() === "true";

  await ensureUsersTableShape();

  const existing = await pool.query(
    "SELECT id, role, status FROM users WHERE email = $1 LIMIT 1",
    [email]
  );

  const hashedPassword = await bcrypt.hash(password, 12);

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)`,
      ["Super Admin", email, hashedPassword, "SUPER_ADMIN", "ACTIVE"]
    );
    console.log(`[seedSuperAdmin] Super Admin created for ${email}`);
    return;
  }

  const user = existing.rows[0];
  const updates = ["role = 'SUPER_ADMIN'", "status = 'ACTIVE'", "updated_at = NOW()"];
  const values = [];

  if (resetPassword) {
    updates.unshift(`password_hash = $${values.length + 1}`);
    values.push(hashedPassword);
  }

  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length + 1}`,
    [...values, user.id]
  );

  console.log(`[seedSuperAdmin] Super Admin ensured for ${email}`);
};

seedSuperAdmin()
  .then(() => {
    console.log("[seedSuperAdmin] Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[seedSuperAdmin] Error:", error.message);
    process.exit(1);
  });