import pg from "pg";

console.log("Testing without SSL...\n");

const client = new pg.Client({
  host: "ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech",
  port: 5432,
  user: "neondb_owner",
  password: "npg_QxasYM8FH9BI",
  database: "neondb",
  ssl: false,
  connectionTimeoutMillis: 10000,
});

client.connect((err) => {
  if (err) {
    console.error("❌ Connection failed:", err.message);
    console.error("Code:", err.code);
  } else {
    console.log("✅ Connected!");
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
