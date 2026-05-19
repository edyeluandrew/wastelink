import pg from 'pg';

const url = 'postgresql://neondb_owner:npg_QxasYM8FH9BI@ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('Testing connection to Neon...');
console.log('Host: ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech:5432');

const client = new pg.Client({
  connectionString: url,
  statement_timeout: 3000,
});

client.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  }
  
  console.log('✓ Connected!');
  
  client.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
      process.exit(1);
    }
    
    console.log('✓ Time from database:', result.rows[0]);
    client.end();
    process.exit(0);
  });
});

setTimeout(() => {
  console.error('❌ Timeout - connection took too long');
  process.exit(1);
}, 5000);
