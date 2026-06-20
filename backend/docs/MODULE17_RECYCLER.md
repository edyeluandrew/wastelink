# Module 17 — Recycler Dashboard

This module lets approved recyclers (recovery buyers) purchase verified waste batches from WasteLink inventory.

## Flow

1. **Picker** logs waste.
2. **Agent** verifies waste type and actual kg.
3. Verified waste becomes inventory (not yet sold).
4. **Admin** creates a **waste sale batch** with recycler sale price per kg.
5. **Recycler** browses available batches and submits a **purchase request**.
6. **Admin** approves or rejects the request.
7. **Admin** schedules pickup, confirms final kg, records payment (cash / mobile money / bank reference — manual MVP).
8. **Admin** marks batch **SOLD** — revenue recorded for settlement / picker float replenishment.

## Pricing

- **Picker price/kg** — snapshot used for margin calculation (from city waste type at batch creation).
- **Recycler sale price/kg** — must be ≥ picker price unless admin provides an override reason.
- **Gross margin/kg** = recycler sale price − picker price.

Example: picker UGX 700/kg, recycler UGX 850/kg → margin UGX 150/kg.

## Roles

- `RECYCLER` — dashboard, inventory, purchase requests, own history only.
- `CITY_ADMIN` / `SUPER_ADMIN` — recycler accounts, sale batches, request approval, payment recording.

Recyclers **cannot**: verify waste, see pending/rejected logs, see picker phone numbers, or access other recyclers' records.

## Database

Run migration:

```bash
cd backend
npm run migrate:module17
```

Tables: `recyclers`, `waste_sale_batches`, `waste_batch_items`, `recycler_purchase_requests`, `recycler_payments`, `recycler_audit_logs`. Users gain `recycler_id`.

## API

Recycler (auth + `RECYCLER` role):

- `GET /api/recycler/dashboard`
- `GET /api/recycler/inventory`
- `GET /api/recycler/inventory/:batchId`
- `POST /api/recycler/purchase-requests`
- `GET /api/recycler/purchase-requests`
- `GET /api/recycler/purchases`
- `GET /api/recycler/purchases/:requestId/receipt`
- `GET /api/recycler/profile`

Admin (auth + admin role):

- `GET/POST/PATCH /api/admin/recyclers`
- `GET/POST/PATCH /api/admin/waste-sale-batches`
- `GET /api/admin/verified-inventory-summary`
- `GET /api/admin/verified-waste-logs`
- `GET /api/admin/recycler-purchase-requests`
- `POST /api/admin/recycler-purchase-requests/:id/approve|reject|schedule-pickup|confirm-pickup|record-payment|mark-sold`
- `GET /api/admin/recycler-revenue-summary`

Aliases under `/api/v1/...` mirror the same routes.

## Frontend

**Recycler portal** (`/recycler/*`): Overview, Available Waste, Purchase Requests, History, Profile.

**Admin**: Recyclers, Waste Sale Batches, Recycler Requests (nav added to admin sidebar).

## Tests

```bash
cd backend
npm run migrate:module17
npm run smoke:module17
```

Requires admin credentials in `.env`: `SUPER_ADMIN_IDENTIFIER`, `SUPER_ADMIN_PASSWORD` (or city admin equivalents).

## Creating a recycler

1. Admin → **Recyclers** → Add recycler (optionally create login with `RECYCLER` role).
2. Admin → **Waste Sale Batches** → Create batch from verified inventory.
3. Recycler logs in → requests purchase → admin completes pickup/payment flow.
