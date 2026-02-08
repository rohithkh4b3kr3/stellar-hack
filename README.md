# gigX – Freelance Escrow on Stellar Soroban

**Team No:** 20  
**Team Name:** BlockSmiths  
**Escrow Contract ID:** `CDWW6BIHV22FMK5TH3GJZCFRIBLX7CARUWBFGYDL62KJN7HYPHBANCUE`

Smart contract escrow for clients and freelancers on Stellar Soroban. Funds are locked on-chain and released only after client approval. Clients are protected from non-delivery; freelancers are protected from non-payment.

---

## Repo Structure

- `frontend/` – React + Vite client (Freighter wallet, project list/detail, escrow actions)
- `backend/` – Express API (project lifecycle, preflight, job status)
- `soroban-contract/` – Soroban escrow contract (`contracts/hello-world/`)

---

## Prerequisites

- Node.js 18+
- npm
- Freighter wallet (testnet)
- Optional: PostgreSQL (if `DATABASE_URL` is set)

---

## Environment Setup

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and set:

- `VITE_API_URL` – backend base URL
- `VITE_SOROBAN_RPC_URL` – Soroban RPC endpoint
- `VITE_NETWORK_PASSPHRASE` – network passphrase
- `VITE_XLM_TOKEN_ID` – native XLM token contract id (recommended)

### Backend

Set in `backend/.env`:

- `PORT` – server port (default 5000)
- `SOROBAN_RPC_URL` – Soroban RPC endpoint
- `SOROBAN_NETWORK_PASSPHRASE` – network passphrase
- `ESCROW_CONTRACT_ID` – deployed escrow contract id
- `XLM_TOKEN_ID` – native XLM token contract id
- `DATABASE_URL` – optional PostgreSQL connection string

---

## Install

```bash
cd frontend && npm install
cd backend && npm install
```

---

## Run (Local)

**Backend:**

```bash
cd backend
npm run dev
```

**Frontend:**

```bash
cd frontend
npm run dev
```

Open the app in your browser using the Vite dev URL.

---

## Build

**Frontend:**

```bash
cd frontend
npm run build
```

**Backend:**

```bash
cd backend
npm run build
npm start
```

---

## Project Workflow (Full Details)

### 1. System Overview

Three layers:

1. **Frontend (React + Vite)** – UI, Freighter wallet, project list/detail, apply/accept, fund escrow, complete/cancel/refund. Calls backend over HTTP; talks to Stellar/Soroban only when the user signs transactions (via Freighter).
2. **Backend (Express)** – REST API, project storage (in-memory or PostgreSQL), and read-only Soroban calls (simulate tx, get job state). It never holds keys; it only orchestrates and stores off-chain project data.
3. **Soroban contract** – Holds funds and enforces rules. All real money movement (lock, pay freelancer, refund) happens here.

- **Off-chain:** project creation, applicants, “who is client/freelancer,” “has escrow been funded” (via backend + contract reads).
- **On-chain:** locking funds, releasing to freelancer, client cancel within 6h, client refund after hard deadline.

---

### 2. Data Structures

#### Backend: ProjectRecord (off-chain)

| Field | Meaning |
|-------|---------|
| `id` | Unique project id (random). |
| `contractId` | Escrow contract id (from env or set via API). |
| `jobId` | On-chain job id after client funds escrow. |
| `businessAddress` | Client’s Stellar public key. |
| `freelancerAddress` | Set when client accepts an applicant. |
| `tokenId` | Token contract id (e.g. native XLM). |
| `title`, `description` | Project metadata. |
| `totalAmount` | Escrow amount in token’s smallest unit (stroops for XLM). |
| `deliveryDeadlineTs` | Unix timestamp: “deliver by” (used as contract soft_deadline). |
| `verificationWindowSecs` | Optional; default 259200 (3 days). |
| `applicants` | List of freelancer addresses who applied. |
| `createdAt` | Unix ms. |

Persistence: if `DATABASE_URL` is set, projects are in PostgreSQL; otherwise an in-memory store is used.

#### Contract: Job and JobState (on-chain)

**JobState:** `Funded (0)` = active; `Completed (1)` = paid out; `Cancelled (2)` = client cancelled early; `Refunded (3)` = client claimed after hard deadline.

**Job:** `id`, `client`, `freelancer`, `token`, `amount`, `soft_deadline`, `hard_deadline` (soft + 7 days), `funded_at`, `state`.

Constants: 6h cancel window, 7-day hard-deadline extension, 5% penalty per day for late completion (in `complete_job`).

---

### 3. Backend API (Detailed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/project/create` | Create project (client, token, amount, deadlines). |
| GET | `/projects` | List all projects. |
| GET | `/project/:id` | Get one project. |
| POST | `/project/:id/apply` | Freelancer applies (`freelancerAddress`). |
| POST | `/project/:id/accept` | Client accepts a freelancer. |
| POST | `/project/:id/set-contract` | Set contract id (if not in env). |
| POST | `/project/:id/set-job` | Store on-chain job id after create_escrow. |
| POST | `/preflight/escrow` | Simulate create_escrow (client, freelancer, tokenId, amount, softDeadline). |
| GET | `/project/:id/start` | Get escrow status or `payment_required` + contract params. |

**GET /project/:id/start** drives the workflow:

- No `jobId` → `status: "payment_required"` (client must fund).
- `jobId` + contract state 0 → `status: "ready"` (escrow active; can complete, cancel within 6h, or claim refund after hard deadline).
- `jobId` + state 1/2/3 → `completed` / `cancelled` / `refunded`.

---

### 4. Soroban Contract (Detailed)

Contract: `soroban-contract/contracts/hello-world/`. Deploy and set `ESCROW_CONTRACT_ID` in backend.

- **create_escrow(client, freelancer, token, amount, soft_deadline) -> u64**  
  Client must sign. Transfers `amount` from client to contract; creates job in state Funded; returns job id. Frontend sends this id to backend via `POST /project/:id/set-job`.

- **complete_job(env, job_id)**  
  Only client. Job must be Funded and before hard deadline. Pays freelancer; if after soft deadline, applies late penalty (5% per day) and refunds penalty to client. Sets state Completed.

- **client_cancel_within_6h(env, job_id)**  
  Only client. Job Funded and within 6h of funded_at. Full refund to client; state Cancelled.

- **claim_refund_after_hard_deadline(env, job_id)**  
  Only client. Job Funded and current time >= hard_deadline. Full refund to client; state Refunded.

---

### 5. Frontend Flow

- **Create project:** Form → `POST /project/create`. Off-chain.
- **Apply:** “Apply” → `POST /project/:id/apply`. Off-chain.
- **Accept freelancer:** Client selects applicant → `POST /project/:id/accept`. Off-chain.
- **Fund escrow:** Optional preflight → sign `create_escrow` via Freighter → parse job id → `POST /project/:id/set-job`. On-chain lock.
- **Deliver:** Off-chain (message/link). No contract call.
- **Approve & release:** “Approve & Release” → sign `complete_job`. On-chain payout (with possible late penalty).
- **Cancel within 6h:** “Cancel Now” → sign `client_cancel_within_6h`. On-chain refund.
- **Claim refund after deadline:** “Claim Refund (Expired)” → sign `claim_refund_after_hard_deadline`. On-chain refund.

Frontend uses `GET /project/:id/start` to decide which actions to show (fund, ready, complete, cancel, refund).

---

### 6. State Machine Summary

**Project (off-chain):** Created → applicants apply → client accepts → client funds (create_escrow + set-job) → ready.

**Job (on-chain):** Funded (0) → client can complete_job, client_cancel_within_6h, or claim_refund_after_hard_deadline. Then terminal: Completed (1), Cancelled (2), or Refunded (3).

---

### 7. Important Details

- **Native XLM:** Frontend uses a fixed native token id; no approve step; reserve/balance checks in UI.
- **Amounts:** Stored in token’s smallest unit (stroops for XLM); display conversion in frontend.
- **Contract method names:** Rust exposes `client_cancel_within_6h` and `claim_refund_after_hard_deadline`. Ensure frontend `contract.ts` calls the same names as the deployed contract.
- **Backend “start”:** Single source of truth that combines project data and on-chain job state for the UI.

---

## Team

**Team No:** 20  
**Team Name:** BlockSmiths
