import fetch from 'node-fetch';

// Test POST - Create collection point
async function testCreate() {
  try {
    console.log('\n📝 TEST 1: POST /api/collection-points - Create Collection Point\n');
    const res = await fetch('http://localhost:5000/api/collection-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kalerwe Market Collection Point',
        division: 'Kawempe',
        agent_name: 'Moses Kato',
        agent_phone: '+256701234567'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data.data?.id;
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Test GET all
async function testGetAll() {
  try {
    console.log('\n📋 TEST 2: GET /api/collection-points - List All\n');
    const res = await fetch('http://localhost:5000/api/collection-points');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Test GET by ID
async function testGetById(id) {
  try {
    console.log(`\n🔍 TEST 3: GET /api/collection-points/${id} - Get by ID\n`);
    const res = await fetch(`http://localhost:5000/api/collection-points/${id}`);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Test PATCH - Update
async function testUpdate(id) {
  try {
    console.log(`\n✏️  TEST 4: PATCH /api/collection-points/${id} - Update\n`);
    const res = await fetch(`http://localhost:5000/api/collection-points/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: 'Moses Kato Updated',
        division: 'Lubaga'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Test GET with filters
async function testGetWithFilters() {
  try {
    console.log('\n🔎 TEST 5: GET /api/collection-points?division=Kawempe&status=ACTIVE - With Filters\n');
    const res = await fetch('http://localhost:5000/api/collection-points?division=Kawempe&status=ACTIVE');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Run all tests
async function runTests() {
  const id = await testCreate();
  await testGetAll();
  if (id) {
    await testGetById(id);
    await testUpdate(id);
  }
  await testGetWithFilters();
}

runTests();
