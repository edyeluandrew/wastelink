# USSD Module Documentation

## Module 12A: USSD Backend Main Menu + Collection Points Lookup

### Overview
This module provides USSD support for WasteLink Uganda, enabling feature phone users to access key functionality via text-based USSD menu navigation. Currently, this module is backend-only and provides:
- Main menu navigation
- Collection point lookup by division
- Framework for future features (registration, waste logging, job status, earnings)

### Endpoint

```
POST /api/ussd
```

### Request Format

The endpoint accepts both JSON and form-encoded requests:

#### Content-Type: `application/json`
```json
{
  "sessionId": "unique-session-id",
  "serviceCode": "*123#",
  "phoneNumber": "+256700000001",
  "text": ""
}
```

#### Content-Type: `application/x-www-form-urlencoded`
```
sessionId=unique-session-id&serviceCode=%2A123%23&phoneNumber=%2B256700000001&text=
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Unique session identifier |
| `serviceCode` | string | Yes | USSD service code (e.g., `*123#`) |
| `phoneNumber` | string | Yes | User's phone number |
| `text` | string | No | Menu navigation text, path separated by `*` |

### Response Format

The endpoint returns **plain text** (not JSON) with USSD protocol format:

- **CON** prefix: Session continues, show menu and wait for input
- **END** prefix: Session ends, show message and close connection

### Payload Fields Explanation

- **sessionId**: Used to track conversation state across multiple USSD requests. Same session should receive the same ID if continuing a flow.
- **serviceCode**: The USSD code dialed (e.g., `*123#`). Used by provider to identify which service is being accessed.
- **phoneNumber**: Picker's phone number. Used for future lookups and verification.
- **text**: The user's menu navigation. Empty for main menu. Uses `*` as separator for multi-level navigation.

---

## Currently Implemented Flows

### Main Menu (text = "")
```
CON WasteLink Uganda
1. Register as Picker
2. Log Waste
3. Check Job Status
4. Check Earnings
5. Collection Points
```

### Option 1: Register as Picker
```
Request: text = "1"
Response:
CON Register as Picker
Enter your full name
```
**Status**: Framework ready, implementation pending

### Option 2: Log Waste
```
Request: text = "2"
Response:
CON Log Waste
Enter your PIN
```
**Status**: Framework ready, implementation pending

### Option 3: Check Job Status
```
Request: text = "3"
Response:
CON Check Job Status
1. Latest Job
2. Enter Job Code
```
**Status**: Framework ready, implementation pending

### Option 4: Check Earnings
```
Request: text = "4"
Response:
CON Check Earnings
Enter your PIN
```
**Status**: Framework ready, implementation pending

### Option 5: Collection Points (Implemented)

#### Step 1: Division Selection
```
Request: text = "5"
Response:
CON Select Division
1. Kawempe
2. Makindye
3. Nakawa
4. Rubaga
5. Central
```

#### Step 2: View Collection Points
```
Request: text = "5*1"
Response:
END Collection Points in Kawempe:
1. Kawempe Main Collection Center
Agent: 0...3456
2. Kalerwe Collection Point
Agent: 0...7890

Response (if no active points):
END No active collection points found in Kawempe.
```

**Status**: Fully implemented with real database queries

### Invalid Option
```
Request: text = "9"
Response:
END Invalid option. Please try again.
```

---

## Database Queries

### Collection Points Lookup
The USSD module queries the `collection_points` table:

```sql
SELECT id, point_code, name, division, agent_name, agent_phone, status
FROM collection_points
WHERE division = $1 AND status = 'ACTIVE'
ORDER BY name ASC
LIMIT 10
```

**Filters**:
- Division matching the selected region
- Status = 'ACTIVE' only
- Limited to 10 results to fit USSD screen size limits

---

## Sample Requests & Responses

### Sample 1: Main Menu

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "serviceCode": "*123#",
    "phoneNumber": "+256700000001",
    "text": ""
  }'
```

**Response** (plain text):
```
CON WasteLink Uganda
1. Register as Picker
2. Log Waste
3. Check Job Status
4. Check Earnings
5. Collection Points
```

---

### Sample 2: View Collection Points - Division Selection

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "serviceCode": "*123#",
    "phoneNumber": "+256700000001",
    "text": "5"
  }'
```

**Response** (plain text):
```
CON Select Division
1. Kawempe
2. Makindye
3. Nakawa
4. Rubaga
5. Central
```

---

### Sample 3: View Collection Points - Kawempe

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "serviceCode": "*123#",
    "phoneNumber": "+256700000001",
    "text": "5*1"
  }'
```

**Response** (plain text, example with real data):
```
END Collection Points in Kawempe:
1. Kawempe Main Collection Center
Agent: 0...3456
2. Kalerwe Collection Point
Agent: 0...7890
```

---

### Sample 4: No Collection Points Found

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "serviceCode": "*123#",
    "phoneNumber": "+256700000001",
    "text": "5*2"
  }'
```

**Response** (plain text):
```
END No active collection points found in Makindye.
```

---

### Sample 5: Form-Encoded Request

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'sessionId=s1&serviceCode=%2A123%23&phoneNumber=%2B256700000001&text=5%2A1'
```

**Response** (plain text):
```
END Collection Points in Kawempe:
1. Kawempe Main Collection Center
Agent: 0...3456
```

---

### Sample 6: Invalid Option

**Request**:
```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "serviceCode": "*123#",
    "phoneNumber": "+256700000001",
    "text": "9"
  }'
```

**Response** (plain text):
```
END Invalid option. Please try again.
```

---

## Architecture

### Files Created

1. **`backend/src/controllers/ussdController.js`**
   - Main USSD request handler
   - Menu routing logic
   - Collection points database queries
   - Plain text response formatting

2. **`backend/src/routes/ussdRoutes.js`**
   - Express route definition
   - POST /api/ussd endpoint

3. **`backend/src/utils/phone.js`**
   - Phone number normalization utility
   - Handles Uganda phone formats (0700..., +256..., 256...)
   - Display formatting for USSD screens

### Integration Points

- **app.js**: USSD routes registered after other API routes
- **Middleware**: Uses `express.json()` and `express.urlencoded()` for request parsing
- **Database**: Real connection to collection_points table via existing pool

---

## Limitations & Future Enhancements

### Current Limitations

1. **No Authentication**: USSD flows do not validate picker identity yet. To be implemented in future modules.
2. **Framework-Only Features**: Options 1, 2, 3, 4 show menu screens but don't implement actual functionality yet.
3. **No State Management**: Session tracking relies on client-provided `sessionId`. Advanced state management can be added.
4. **Limited Response Length**: USSD screens are limited to ~180 characters. Long lists truncated to 10 items.
5. **No Africa's Talking Integration**: This is backend-only scaffolding. USSD provider integration is a separate module.
6. **Phone Number Format Assumed Valid**: No deep validation of phone number format.

### Planned Enhancements

#### Module 12B: Phone-Like USSD Simulator Page
- Web-based USSD simulator for testing
- Simulates USSD flow with visual menu navigation
- Helps develop and test flows without real USSD provider
- Frontend component in React/Vite

#### Module 12C: Picker Registration via USSD
- Implement option 1: Register as Picker
- Validate picker details entered via USSD
- Store picker data in database
- Generate picker code on successful registration

#### Module 12D: Waste Logging via USSD
- Implement option 2: Log Waste
- Support entering waste type and quantity
- Multi-step form validation
- Store waste log data

#### Module 12E: Job Status via USSD
- Implement option 3: Check Job Status
- Display latest job with status
- Allow searching by job code
- Show earnings linked to jobs

#### Module 12F: Earnings Lookup via USSD
- Implement option 4: Check Earnings
- Verify picker PIN for security
- Display total earnings and recent payouts
- Show pending vs. paid status

#### Module 12G: Africa's Talking Integration
- Connect to Africa's Talking USSD API
- Handle real incoming USSD requests
- Manage session lifecycle
- Handle errors and timeouts

#### Module 12H: Advanced Flows
- Multi-step registration validation
- Error recovery flows
- Rate limiting and abuse prevention
- Analytics and usage tracking

---

## Technical Details

### Phone Number Normalization

The `phone.js` utility handles Uganda phone formats:

```javascript
// All normalize to +256700000000
normalizePhoneNumber('0700000000')    // +256700000000
normalizePhoneNumber('+256700000000') // +256700000000
normalizePhoneNumber('256700000000')  // +256700000000
```

Display format for USSD (short):
```javascript
getShortPhoneFormat('+256700123456') // "0...3456"
```

### Response Content-Type

All USSD responses set:
```
Content-Type: text/plain; charset=utf-8
```

This ensures correct rendering on feature phones.

### Error Handling

- **Missing Required Fields**: Returns 400 with plain text error
- **Database Errors**: Returns 500 with generic error message (no sensitive details)
- **Invalid Menu Options**: Returns END message without failing the request

---

## Testing

### Local Testing

1. **Start Backend**:
   ```bash
   npm run dev
   ```

2. **Test Main Menu**:
   ```bash
   curl -X POST http://localhost:5000/api/ussd \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":""}'
   ```

3. **Test Collection Points**:
   ```bash
   curl -X POST http://localhost:5000/api/ussd \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"s1","serviceCode":"*123#","phoneNumber":"+256700000001","text":"5*1"}'
   ```

### Database Setup Required

Ensure collection_points table has active records:

```sql
INSERT INTO collection_points (point_code, name, division, agent_name, agent_phone, status)
VALUES ('CP001', 'Kawempe Main Collection Center', 'Kawempe', 'Agent John', '0700123456', 'ACTIVE');

INSERT INTO collection_points (point_code, name, division, agent_name, agent_phone, status)
VALUES ('CP002', 'Kalerwe Collection Point', 'Kawempe', 'Agent Mary', '0700789012', 'ACTIVE');
```

---

## Notes

- USSD is designed for low-bandwidth feature phones in Uganda
- Plain text format ensures compatibility across all USSD providers
- Collection point lookup uses real database (no mock data)
- Phone number format is normalized for consistency
- Future authentication will use picker phone as identifier
- PIN verification will be implemented in earnings/waste logging modules
