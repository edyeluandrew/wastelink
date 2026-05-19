import pkg from "pg";

console.log("Testing with IP address instead of hostname...\n");

const client = new pkg.Client({
  host: "34.196.24.162",  // Direct IP
  port: 5432,
  user: "neondb_owner",
  password: "npg_QxasYM8FH9BI",
  database: "neondb",
  connectionTimeoutMillis: 10000,
});

client.connect((err) => {
  if (err) {
    console.error("❌ Connection failed:", err.code, err.message);
  } else {
    console.log("✅ Connected with IP!");
    client.query("SELECT NOW()", (err, result) => {
      if (err) {
        console.error("❌ Query failed:", err.message);
      } else {
        console.log("✅ Query successful:", result.rows[0]);
      }
      client.end();
    });
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error("⏱️ Timeout after 15 seconds");
  process.exit(1);
}, 15000);
