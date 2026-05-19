import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pkg;

// Extract hostname from connection string for safe logging (no password)
const extractHostname = (url) => {
  try {
    const match = url.match(/@([^:/?]+)/);
    return match ? match[1] : "unknown";
  } catch (e) {
    return "unknown";
  }
};

// Main test function
async function testConnection() {
  console.log("\n========================================");
  console.log("   WasteLink Neon Database Test");
  console.log("========================================\n");

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL not set in .env file");
    console.log("\n📝 Add this to .env:");
    console.log("DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require");
    process.exit(1);
  }

  const dbHostname = extractHostname(process.env.DATABASE_URL);
  const sslEnabled = process.env.DATABASE_SSL === "true";

  console.log("📋 Configuration:");
  console.log(`    Hostname: ${dbHostname}`);
  console.log(`    SSL: ${sslEnabled}`);
  console.log(`    Timeout: 15 seconds\n`);

  // Create client using connection string
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log("🔌 Attempting to connect...");
    await client.connect();
    console.log("✅ Connected successfully!\n");

    console.log("⏱️  Running: SELECT NOW();");
    const result = await client.query("SELECT NOW()");
    console.log(`✅ Success! Database time: ${result.rows[0].now}\n`);

    console.log("========================================");
    console.log("   ✅ Connection Test PASSED");
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Connection Failed!\n`);
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}\n`);

    // Provide helpful hints based on error code
    if (error.code === "ETIMEDOUT") {
      console.log("🔧 Troubleshooting ETIMEDOUT in WSL:\n");
      console.log("Node.js pg library times out on hostname DNS resolution in WSL2.");
      console.log("Try these solutions in order:\n");

      console.log("OPTION A: Run backend from Windows PowerShell/CMD instead of WSL");
      console.log("   cd backend");
      console.log("   npm install");
      console.log("   npm run test:db");
      console.log("   npm run dev\n");

      console.log("OPTION B: Add Neon hostname to WSL /etc/hosts");
      console.log(`   nslookup ${dbHostname}  [to get IP]`);
      console.log("   echo 'IP_ADDRESS_HERE ${dbHostname}' >> /etc/hosts\n");

      console.log("OPTION C: Reset WSL DNS");
      console.log("   Edit /etc/wsl.conf: generateResolvConf = false");
      console.log("   Edit /etc/resolv.conf: nameserver 8.8.8.8\n");

      console.log("OPTION D: Use local PostgreSQL for development (not mock data)\n");
    } else if (error.code === "ENOTFOUND") {
      console.log("🔧 Troubleshooting ENOTFOUND:\n");
      console.log("1. Check DNS resolution:");
      console.log(`   nslookup ${dbHostname}\n`);

      console.log("2. Flush DNS from Windows (PowerShell as Admin):");
      console.log("   ipconfig /flushdns\n");

      console.log("3. Restart WSL:");
      console.log("   wsl --shutdown\n");
    } else if (error.message.includes("password authentication failed")) {
      console.log("🔧 Troubleshooting Authentication:\n");
      console.log("1. Check credentials in .env DATABASE_URL");
      console.log("2. Copy fresh connection string from Neon console");
      console.log("3. Verify password has no special characters\n");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("🔧 Troubleshooting Connection Refused:\n");
      console.log("1. Verify Neon status: https://status.neon.tech");
      console.log("2. Check if database is running in Neon console");
      console.log("3. Try different Neon endpoint (pooler vs direct)\n");
    }

    console.log("========================================");
    console.log("   ❌ Connection Test FAILED");
    console.log("========================================\n");

    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

// Run test
testConnection();
