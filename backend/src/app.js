import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import pickerRoutes from "./routes/pickerRoutes.js";
import collectionPointRoutes from "./routes/collectionPointRoutes.js";
import wasteLogRoutes from "./routes/wasteLogRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import ussdRoutes from "./routes/ussdRoutes.js";
import { sendSuccess, sendError } from "./utils/apiResponse.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  sendSuccess(res, "WasteLink API is running", {
    timestamp: new Date().toISOString(),
  });
});

// Database health check endpoint
app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    sendSuccess(res, "Database connected successfully", {
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("[Health Check Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
});

// Database initialization endpoint
app.post("/api/admin/init-db", async (req, res, next) => {
  try {
    const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT,
  role VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN','CITY_ADMIN','AGENT','PICKER')),
  status VARCHAR(30) DEFAULT 'ACTIVE',
  city VARCHAR(100),
  division VARCHAR(100),
  collection_point_id INT,
  picker_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickers (
  id SERIAL PRIMARY KEY,
  picker_code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  gender VARCHAR(20),
  age_group VARCHAR(30),
  division VARCHAR(100),
  main_waste_type VARCHAR(50),
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_points (
  id SERIAL PRIMARY KEY,
  point_code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  division VARCHAR(100),
  agent_name VARCHAR(150),
  agent_phone VARCHAR(30),
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_logs (
  id SERIAL PRIMARY KEY,
  job_code VARCHAR(30) UNIQUE NOT NULL,
  picker_id INT NOT NULL REFERENCES pickers(id),
  collection_point_id INT NOT NULL REFERENCES collection_points(id),
  waste_type VARCHAR(50) NOT NULL,
  estimated_kg NUMERIC(10, 2),
  verified_kg NUMERIC(10, 2),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','VERIFIED','REJECTED','PAID')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earnings (
  id SERIAL PRIMARY KEY,
  picker_id INT NOT NULL REFERENCES pickers(id),
  waste_log_id INT NOT NULL REFERENCES waste_logs(id),
  rate_per_kg INT NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','PAYOUT_INITIATED','PAID','FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_status_history (
  id SERIAL PRIMARY KEY,
  earning_id INT NOT NULL REFERENCES earnings(id),
  waste_log_id INT NOT NULL REFERENCES waste_logs(id),
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  payment_reference VARCHAR(120),
  amount INT,
  changed_by INT,
  notes TEXT,
  is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payout_transactions (
  id SERIAL PRIMARY KEY,
  earning_id INT NOT NULL UNIQUE REFERENCES earnings(id),
  waste_log_id INT NOT NULL UNIQUE REFERENCES waste_logs(id),
  picker_id INT NOT NULL REFERENCES pickers(id),
  provider VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  phone VARCHAR(30),
  amount INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'UGX',
  provider_transaction_id VARCHAR(120),
  status VARCHAR(20) NOT NULL CHECK (status IN ('INITIATED','PROCESSING','SUCCESS','FAILED','CANCELLED')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
    `;

    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let count = 0;
    for (const stmt of statements) {
      await pool.query(stmt);
      count++;
    }

    sendSuccess(res, "Database schema initialized successfully", {
      tables_created: count,
    }, 200);
  } catch (error) {
    console.error("Schema error:", error.message);
    sendError(res, "Schema initialization failed: " + error.message, 500);
  }
});

app.use("/api/pickers", pickerRoutes);
app.use("/api/collection-points", collectionPointRoutes);
app.use("/api/waste-logs", wasteLogRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ussd", ussdRoutes);

app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.status = 404;
  next(error);
});

app.use(errorHandler);

export default app;

