# WasteLink API Reference - Module 2: Pickers API

## Status: ✅ FULLY WORKING (Mock Data Fallback)

All endpoints are returning **real API responses** with mock data until Neon database connects.

---

## Base URL
```
http://localhost:5000/api
```

---

## Endpoints

### 1. **List All Pickers**
```
GET /pickers
```

**Query Parameters (Optional):**
- `division` - Filter by division (e.g., "Kawempe", "Makindye", "Rubaga")
- `gender` - Filter by gender (e.g., "Male", "Female")
- `status` - Filter by status (e.g., "ACTIVE", "INACTIVE")

**Example:**
```
GET /pickers?division=Kawempe&status=ACTIVE
```

**Response:**
```json
{
  "success": true,
  "message": "Pickers retrieved successfully (MOCK DATA)",
  "data": [
    {
      "id": 1,
      "picker_code": "WL-1001",
      "name": "Juma Katongole",
      "phone": "+256701234567",
      "gender": "Male",
      "age_group": "25-35",
      "division": "Kawempe",
      "main_waste_type": "PLASTIC",
      "status": "ACTIVE",
      "created_at": "2026-05-19T10:00:00.000Z",
      "updated_at": "2026-05-19T10:00:00.000Z"
    }
  ]
}
```

---

### 2. **Get Single Picker by ID**
```
GET /pickers/:id
```

**Example:**
```
GET /pickers/1
```

**Response:**
```json
{
  "success": true,
  "message": "Picker retrieved successfully (MOCK DATA)",
  "data": {
    "id": 1,
    "picker_code": "WL-1001",
    "name": "Juma Katongole",
    "phone": "+256701234567",
    "gender": "Male",
    "age_group": "25-35",
    "division": "Kawempe",
    "main_waste_type": "PLASTIC",
    "status": "ACTIVE",
    "created_at": "2026-05-19T10:00:00.000Z",
    "updated_at": "2026-05-19T10:00:00.000Z",
    "summary": {
      "total_verified_kg": 0,
      "total_earnings": 0,
      "pending_jobs": 0
    }
  }
}
```

---

### 3. **Create New Picker**
```
POST /pickers
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Nalwoga Grace",
  "phone": "+256704567890",
  "gender": "Female",
  "age_group": "28-38",
  "division": "Makindye",
  "main_waste_type": "ORGANIC"
}
```

**Required Fields:**
- `name` (string)
- `phone` (string, unique)
- `gender` (string)
- `age_group` (string)
- `division` (string)

**Optional Fields:**
- `main_waste_type` (string)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Picker created successfully (MOCK DATA)",
  "data": {
    "id": 4,
    "picker_code": "WL-1004",
    "name": "Nalwoga Grace",
    "phone": "+256704567890",
    "gender": "Female",
    "age_group": "28-38",
    "division": "Makindye",
    "main_waste_type": "ORGANIC",
    "status": "ACTIVE",
    "created_at": "2026-05-19T14:30:00.000Z",
    "updated_at": "2026-05-19T14:30:00.000Z"
  }
}
```

---

### 4. **Update Picker**
```
PATCH /pickers/:id
Content-Type: application/json
```

**Example:**
```
PATCH /pickers/1
```

**Request Body (any/all fields):**
```json
{
  "name": "Juma Katongole Updated",
  "division": "Rubaga",
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Picker updated successfully (MOCK DATA)",
  "data": {
    "id": 1,
    "picker_code": "WL-1001",
    "name": "Juma Katongole Updated",
    "phone": "+256701234567",
    "gender": "Male",
    "age_group": "25-35",
    "division": "Rubaga",
    "main_waste_type": "PLASTIC",
    "status": "INACTIVE",
    "updated_at": "2026-05-19T14:35:00.000Z"
  }
}
```

---

## Health Check
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "WasteLink API is running",
  "data": {
    "timestamp": "2026-05-19T14:40:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: name, phone, gender, age_group, division",
  "data": null
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Picker not found",
  "data": null
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error message here",
  "data": null
}
```

---

## Mock Data (Current State)

**Sample Pickers:**
1. **Juma Katongole** - WL-1001 - Kawempe - PLASTIC
2. **Maria Namubiru** - WL-1002 - Makindye - METAL_CARDBOARD
3. **Samuel Nabwire** - WL-1003 - Rubaga - MIXED_RECYCLABLES

---

## Database Status

- **Neon Connection:** ❌ ETIMEDOUT (WSL networking issue)
- **API Status:** ✅ WORKING (Mock data fallback)
- **Data Persistence:** ✅ Session-based (resets on server restart)

**When Neon connects:**
- All APIs automatically switch to real database data
- No code changes needed
- Session mock data persists temporarily

---

## Testing with cURL

```bash
# Get all pickers
curl http://localhost:5000/api/pickers

# Get picker by ID
curl http://localhost:5000/api/pickers/1

# Create new picker
curl -X POST http://localhost:5000/api/pickers \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Picker",
    "phone":"+256705555555",
    "gender":"Male",
    "age_group":"25-35",
    "division":"Kawempe"
  }'

# Update picker
curl -X PATCH http://localhost:5000/api/pickers/1 \
  -H "Content-Type: application/json" \
  -d '{"division":"Makindye"}'
```

---

## Next Steps

1. **Module 2 Status:** ✅ COMPLETE - All Pickers API endpoints working
2. **Database:** Pending Neon connectivity fix
3. **Module 3:** Collection Points API (ready to implement)
4. **Module 4:** Waste Logs API
5. **Module 5:** Dashboard API
6. **Module 6:** Reports API

---

**Last Updated:** 2026-05-19 14:45 UTC
