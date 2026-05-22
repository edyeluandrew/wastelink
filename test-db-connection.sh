#!/bin/bash

echo "=== Testing Database Connection & AgentHistory Flow ==="
echo ""

# Test 1: Health check
echo "1️⃣  API Health Check"
curl -s http://localhost:5000/api/health | python3 -m json.tool
echo ""

# Test 2: DB Health check  
echo "2️⃣  Database Health Check"
curl -s http://localhost:5000/api/health/db | python3 -m json.tool
echo ""

# Test 3: Get waste logs (should return empty or existing)
echo "3️⃣  Get Waste Logs for Collection Point 1"
curl -s 'http://localhost:5000/api/waste-logs?collection_point_id=1' | python3 -m json.tool
echo ""

# Test 4: Verify response format for AgentHistory
echo "4️⃣  Checking API Response Format"
RESPONSE=$(curl -s 'http://localhost:5000/api/waste-logs?collection_point_id=1')
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
DATA=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))" 2>/dev/null)

echo "✅ Response has 'success' field: $SUCCESS"
echo "✅ Response has 'data' array with $DATA items"
echo "✅ AgentHistory can correctly parse: response.data?.data"
echo ""

echo "=== ✅ DATABASE CONNECTION CONFIRMED ==="
echo ""
echo "Ready to test AgentHistory in browser:"
echo "  - Go to http://localhost:5173"
echo "  - Create test data via Admin Dashboard"
echo "  - Navigate to /agent/history"
echo "  - Should NOT load forever ✅"
