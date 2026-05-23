CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT,
  role VARCHAR(30) NOT NULL CHECK (role IN (
    'ADMIN',
    'MUNICIPAL_OFFICER',
    'AGENT',
    'PICKER'
  )),
  status VARCHAR(30) DEFAULT 'ACTIVE',
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
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'PAID'
  )),
  notes TEXT,
  rejection_reason TEXT,
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
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'PENDING',
    'APPROVED',
    'PAID',
    'FAILED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
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
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'INITIATED',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'CANCELLED'
  )),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
