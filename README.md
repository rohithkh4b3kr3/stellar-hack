# Trustless Freelance Escrow Protocol

Decentralized freelance platform with protocol-enforced payments. Businesses cannot delay payment; freelancers cannot ghost. HTTP 402 (x402) forces advance payment; Soroban contract holds all funds.

## System Overview

- **Hiring Person**: Posts projects, accepts freelancers, pays 30% advance via x402, approves delivery.
- **Freelancer**: Browses projects, applies, starts work only after advance is locked, submits delivery, gets paid automatically.
- **Contract**: Sole escrow holder. Refunds advance to business if freelancer misses deadline.

## Prerequisites

- **Rust** + **wasm32 target**: `rustup target add wasm32-unknown-unknown`
- **Node.js** 18+
- **Freighter** browser extension

## 1. Soroban Contract (Rust)

```bash
cd contracts
cargo build --package hello-world --target wasm32-unknown-unknown --release
```

Deploy the WASM, then call `init_project` with:

- `business`, `freelancer` (addresses)
- `token` (token contract ID)
- `total_amount`, `advance_amount` (30% of total)
- `delivery_deadline` (unix timestamp)
- `verification_window_secs` (e.g. 259200 = 3 days)

**Contract functions:**

- `init_project(...)` — initialize
- `deposit_advance(business)` — business deposits 30% advance
- `deposit_remaining(business)` — business deposits 70% (after delivery submitted)
- `submit_delivery(freelancer, hash)` — freelancer submits deliverable hash
- `approve_delivery(business)` — business approves; releases full payment
- `auto_release_if_timeout()` — anyone can call after verification window
- `refund_if_deadline_missed()` — refund advance if no delivery by deadline
- `get_project()`, `get_escrow_balance()` — read state

## 2. Backend (Node + TypeScript)

```bash
cd backend
npm install
npm run build
npm start
```

**Endpoints:**

- `POST /project/create` — create project (no contract yet)
- `GET /projects` — list all
- `GET /project/:id` — get one
- `POST /project/:id/apply` — freelancer applies
- `POST /project/:id/accept` — hiring person accepts freelancer
- `POST /project/:id/set-contract` — set contract ID after deploy
- `GET /project/:id/start` — **402** until advance deposited
- `POST /project/:id/submit` — hash deliverable, return hash
- `POST /project/:id/approve` — instructions for on-chain approve
- `POST /project/:id/refund` — instructions for on-chain refund

## 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

- **Landing**: Connect wallet → "Login as Hiring Person" or "Login as Freelancer"
- **Hiring**: Post project, see applicants, accept, deploy contract, set contract ID, pay advance
- **Freelancer**: Browse projects, apply, open project, submit delivery (after advance locked)

Black & white UI, Space Grotesk font. Escrow status and countdown timers shown.

## Workflow

1. Hiring person creates project (backend only).
2. Freelancer applies.
3. Hiring person accepts.
4. Hiring person deploys escrow contract with `init_project(business, accepted_freelancer, ...)`, sets contract ID.
5. Freelancer requests start → backend returns **402** with advance amount and contract address.
6. Hiring person deposits 30% advance to contract, calls `deposit_advance`.
7. Freelancer delivers: uploads file → backend returns hash → freelancer calls `submit_delivery(hash)`.
8. Hiring person approves → `approve_delivery`; or wait for timeout → anyone calls `auto_release_if_timeout`.
9. Before approve, hiring person calls `deposit_remaining` to add 70%, then `approve_delivery` releases full amount.
10. If freelancer misses deadline → anyone calls `refund_if_deadline_missed` → advance refunded to business.

## Security

- Backend never holds funds.
- Contract is sole escrow holder.
- Wallet = identity.
- Refunds are time-based and permissionless.
