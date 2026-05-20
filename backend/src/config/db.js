import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("[DB ERROR] DATABASE_URL not set in .env file");
  process.exit(1);
}

// Extract hostname from connection string for safe logging (no password)
const extractHostname = (url) => {
  try {
    const match = url.match(/@([^:/?]+)/);
    return match ? match[1] : "unknown";
  } catch (e) {
    return "unknown";
  }
};

const dbHostname = extractHostname(process.env.DATABASE_URL);
const sslEnabled = process.env.DATABASE_SSL === "true";

console.log("[DB] Connection Configuration:");
console.log("[DB]   - Hostname:", dbHostname);
console.log("[DB]   - SSL Enabled:", sslEnabled);
console.log("[DB]   - Connection Timeout: 30000ms");
console.log("[DB]   - Idle Timeout: 60000ms");
console.log("[DB]   - Max Pool Connections: 20");

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
  max: 20,
};

const pool = new Pool(poolConfig);

// Handle connection errors
pool.on("error", (err) => {
  console.error("[DB ERROR - Pool Event]", {
    code: err.code,
    message: err.message,
    errno: err.errno,
  });
});

pool.on("connect", () => {
  console.log("[DB] Connection acquired from pool");
});

// Test connection on startup
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("[DB ERROR - Startup Test]", {
      code: err.code,
      message: err.message,
      hint: err.code === "ETIMEDOUT" ? "Network timeout - check WSL connectivity, firewall, DNS" : "Check credentials and database name",
    });
  } else {
    console.log("[DB] ✅ Startup connection test successful");
  }
});

export default pool;
