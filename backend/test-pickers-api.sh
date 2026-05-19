#!/bin/bash

BASE_URL="http://localhost:5000/api"

echo "========== WASTELINK PICKERS API TEST =========="
echo ""

# Test 1: Health check
echo "1. Testing GET /api/health"
curl -X GET $BASE_URL/health 2>/dev/null | jq .
echo ""

# Test 2: Create picker
echo "2. Testing POST /api/pickers"
PICKER=$(curl -X POST $BASE_URL/pickers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juma Katongole",
    "phone": "+256701234567",
    "gender": "Male",
    "age_group": "25-35",
    "division": "Kawempe",
    "main_waste_type": "PLASTIC"
  }' 2>/dev/null)
echo $PICKER | jq .
PICKER_ID=$(echo $PICKER | jq -r '.data.id // empty')
echo "Created Picker ID: $PICKER_ID"
echo ""

# Test 3: List all pickers
echo "3. Testing GET /api/pickers"
curl -X GET $BASE_URL/pickers 2>/dev/null | jq .
echo ""

# Test 4: Get picker by ID (if ID was created)
if [ ! -z "$PICKER_ID" ]; then
  echo "4. Testing GET /api/pickers/$PICKER_ID"
  curl -X GET $BASE_URL/pickers/$PICKER_ID 2>/dev/null | jq .
  echo ""
  
  # Test 5: Update picker
  echo "5. Testing PATCH /api/pickers/$PICKER_ID"
  curl -X PATCH $BASE_URL/pickers/$PICKER_ID \
    -H "Content-Type: application/json" \
    -d '{
      "division": "Makindye",
      "main_waste_type": "MIXED_RECYCLABLES"
    }' 2>/dev/null | jq .
  echo ""
fi

# Test 6: Filter pickers by division
echo "6. Testing GET /api/pickers?division=Kawempe"
curl -X GET "$BASE_URL/pickers?division=Kawempe" 2>/dev/null | jq .
echo ""

echo "========== TEST COMPLETE =========="
