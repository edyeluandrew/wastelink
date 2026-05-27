#!/bin/bash

echo "=== Test 1: Main Menu (text = '') ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":""}' \
  -s

echo ""
echo ""
echo "=== Test 2: Option 1 - Register as Picker ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"1"}' \
  -s

echo ""
echo ""
echo "=== Test 3: Option 2 - Log Waste ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"2"}' \
  -s

echo ""
echo ""
echo "=== Test 4: Option 3 - Check Job Status ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"3"}' \
  -s

echo ""
echo ""
echo "=== Test 5: Option 4 - Check Earnings ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"4"}' \
  -s

echo ""
echo ""
echo "=== Test 6: Option 5 - Collection Points Menu ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"5"}' \
  -s

echo ""
echo ""
echo "=== Test 7: Option 5.1 - Kawempe Collection Points ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"5*1"}' \
  -s

echo ""
echo ""
echo "=== Test 8: Invalid Option (9) ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"9"}' \
  -s

echo ""
echo ""
echo "=== Test 9: Form-encoded Collection Points ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'sessionId=s1&serviceCode=*123%23&phoneNumber=%2B256700000001&text=5%2A1' \
  -s

echo ""
echo ""
echo "=== Test 10: Missing Required Field ==="
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"serviceCode":"*123#","phoneNumber":"+256700000001","text":""}' \
  -s

echo ""
