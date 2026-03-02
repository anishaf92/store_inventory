## ARTHAQ Store Inventory – Overview

ARTHAQ is a role-based store and project inventory system.

- **Backend**: Node.js, Express, Sequelize, PostgreSQL (`backend/`)
- **Frontend**: React + Vite (`client/`)
- **Auth**: JWT, roles embedded in token
- **Core roles**:
  - `ADMIN`: system admin, can manage users and reset data.
  - `OWNER`: business owner, full oversight, approves PRs.
  - `STORE_MANAGER`: purchase/stock manager, approves PR/PR_STORE, manages inventory.
  - `STORE_KEEPER`: operates a single store, issues stock, raises PR_STORE, executes transfers.
  - `PROJECT_MANAGER`: creates project sites, raises MR, acknowledges material receipt and utilization.

The system is **project‑centric**: each project has its own dedicated store and locations (sites).

---

## Data model (high level)

- `User`
  - `role`: one of `ADMIN`, `OWNER`, `STORE_MANAGER`, `STORE_KEEPER`, `PROJECT_MANAGER`
  - `store_node_id` (for keeper/manager store assignment)

- `Project`
  - `reference_number`, `location`, `summary`
  - `project_manager_id` (linked `PROJECT_MANAGER`)
  - `store_keeper_id` (linked `STORE_KEEPER`)
  - `store_node_id` (backing legacy store row, linked to `StoreNode`)

- `ProjectStore`
  - 1‑to‑1 with `Project` – human name/code/location for the dedicated store.

- `ProjectLocation`
  - Project‑specific logical locations (future‑use; current UI uses `SiteLocation`).

- `StoreNode` (legacy physical store)
  - Backing store record used by inventory and requests.

- `SiteLocation`
  - Site under a project & store (`project_id`, `store_node_id`).

- `Category`
  - Optional `specification_schema` (fields for item specs).

- `Item`
  - Belongs to `Category`.
  - Has optional `specifications` JSON.

- `Inventory`
  - `item_id`, `store_node_id`, optional `site_location_id`
  - `current_stock`, `reserved_stock`

- `Request`
  - Types: `MR`, `PR`, `PR_STORE`, `TRANSFER_REQUEST`
  - `project_id`, `store_node_id`, `site_location_id`
  - Status: `PENDING`, `REQUESTED`, `APPROVED`, `IN_PROGRESS`, `REJECTED`,
    `PARTIALLY_FULFILLED`, `FULFILLED`, `COMPLETED` (shown as **Utilized** in UI).

- `RequestItem`
  - `item_id` or `custom_item_name`
  - Status: `PENDING`, `ISSUED`, `NEEDS_PROCUREMENT`, `PARTIALLY_ISSUED`,
    plus `RECEIVED`, `COMPLETED` for PM acknowledgements.

- `Transfer`
  - Moves stock from `StoreNode` to `SiteLocation`.

- `InventoryTransaction` + `AuditLog`
  - Track GRN / ISSUE events with invoice numbers and deltas.

---

## Role flows

### Admin

- Signs in as `ADMIN`.
- Uses **Manage Users** screen:
  - Create users with roles and assign `store_node_id` where needed.
  - See which project and store each user is associated with.
- Can perform **System Reset**:
  - Clears inventory, transfers, requests, audits, sites, stores, projects, items, categories.
  - Removes all non‑admin users.

### Project Manager

Per project:

- Is assigned as `project_manager_id` on that `Project`.
- Can:
  - Add **sites** for their assigned project only.
  - Raise **MR (Material Requisition)** for a project + site.
  - Cannot raise PR or issue stock.
  - In **Requests**:
    - When STORE issues material: items become `ISSUED`.
    - PM can click **Mark Received** → item becomes `RECEIVED`.
    - PM can click **Mark Completed** → item becomes `COMPLETED` (Utilized).
    - Once all items are `COMPLETED`, the request status becomes `COMPLETED` (Utilized).

### Store Keeper

- Assigned a single `StoreNode` (`store_node_id` on User).
- Can:
  - Raise **PR_STORE** (store restock) and **TRANSFER_REQUEST**.
  - See **MR** for:
    - Their store, or
    - Projects where they are the assigned `store_keeper_id`.
  - For MR:
    - **Issue Stock** when enough inventory exists.
    - If insufficient stock, **Raise PR** (system creates a linked PR).
    - For custom items, **Raise PR & Add to Inventory** (system creates an `Item` and PR).
  - For PR / PR_STORE:
    - When goods arrive, Keeper must **enter supplier invoice number** and confirm:
      - `PR`: “Confirm Receipt & Issue” – GRN + issue to the site.
      - `PR_STORE`: “Confirm Receipt & Add to Stock” – GRN only.
    - Invoice number is stored on `InventoryTransaction` and `AuditLog`.
  - **Check Other Sites**:
    - For an MR item, Keeper can open **Stock Distribution**.
    - For rows with stock at a site, Keeper can click **Allot**:
      - Enters quantity.
      - System creates a `Transfer` from store to that site, linked to the request.

### Store Manager / Owner

- **Owner** and **Store Manager**:
  - Approve/Reject PR / PR_STORE.
  - Can add inventory categories and items.
  - For PR / PR_STORE items without a catalog item:
    - **Add to Inventory** (creates Item in a Category) before receiving.
  - Do **not** see MR (Store Manager’s Requests view hides MR), only purchase‑related flows.

---

## Local development

### 1. Backend

```bash
cd backend
npm install
```

Configure `backend/.env` (example):

```env
NODE_ENV=development
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgres://user:password@localhost:5432/arthaq_inventory
```

Run migrations/auto‑sync (project currently relies on Sequelize model sync; ensure your DB schema matches the models, including added enums/columns).

Start backend:

```bash
npm run dev
```

Default script runs `src/app.js` (Express).

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

By default:

- Vite dev server: `http://localhost:5173`
- API base URL: `/api` (configured via dev proxy or reverse proxy in your setup).

To point the frontend at a different backend URL, set:

```bash
VITE_API_BASE_URL=https://your-backend.example.com/api
```

in a `.env` file in `client/` for local or as an environment variable in Vercel.

---

## Deployment (Vercel + external backend)

1. **Deploy backend** (Express + Postgres) to your preferred host.
   - Ensure it is served under `/api` (e.g. `https://backend.example.com/api`).
2. **Set `VITE_API_BASE_URL` on Vercel**:
   - Vercel Project → Settings → Environment Variables:
   - `VITE_API_BASE_URL = https://backend.example.com/api`
3. **Vercel build**:
   - Uses `client/package.json` with `npm run build` (Vite) and serves `client/dist`.

---

## Key endpoints (backend)

- `POST /api/auth/signin` – login, returns JWT with role + store.
- `GET /api/projects` – list projects (PM sees only their projects).
- `POST /api/projects` – create project + dedicated store (Admin/Owner).
- `GET /api/requests` – list requests (scoped by role).
- `POST /api/requests` – create MR / PR_STORE / TRANSFER_REQUEST (role‑based rules).
- `PUT /api/requests/:id/status` – approve/Reject (Owner/Store Manager/Admin).
- `PUT /api/requests/items/:id/fulfill` – ISSUE / PROCUREMENT / PM_RECEIVE / PM_COMPLETE, etc.
- `GET /api/inventory/items/:id/distribution` – stock distribution per store/site.
- `POST /api/transfers` – create transfer from store to site (Keeper).

---

## Notes and conventions

- **Do not raise PR directly:** Users never manually create `PR` requests; they are generated from `MR` by Keeper actions.
- **Enum migrations:** If you add new `RequestItem.status` or `Request.status` values, you must update the corresponding Postgres enums with `ALTER TYPE ... ADD VALUE ...`.
- **Audit + GRN:** Always pass `invoice_number` when Keeper receives PR/PR_STORE so GRN and AuditLog carry the external document reference.

