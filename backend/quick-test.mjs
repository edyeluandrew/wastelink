import pkg from 'pg';
const { Client } = pkg;

async function test() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_dAYXIsZ4O5Ch@ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });
  
  try {
    console.log('🔌 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database time:', result.rows[0].now);
    
    console.log('\n========================================');
    console.log('   ✅ CONNECTION TEST PASSED');
    console.log('========================================');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', e.message);
    console.error('Code:', e.code);
    process.exit(1);
  } finally {
    try { await client.end(); } catch(e) {}
  }
}

test();
