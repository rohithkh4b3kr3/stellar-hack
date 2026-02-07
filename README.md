# B2B Freelance Escrow MVP

Decentralized escrow platform: advance and milestone payments are locked in a Soroban smart contract. The backend enforces **HTTP 402 (Payment Required)** until the advance is deposited; it never holds funds.

## System overview

- **Business** creates a project, pays advance to the contract, approves milestones (or lets them auto-release).
- **Freelancer** starts work only after advance is locked, submits deliverable hashes per milestone, receives pay on approval or timeout.
- **Contract** holds all funds; refunds to business automatically if deadlines are missed.

## Prerequisites

- **Rust** + **Soroban toolchain** (for contract): [Stellar setup](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- **Node.js** 18+
- **Freighter** browser extension (Stellar wallet)

## 1. Soroban contract (Rust)

```bash
cd contracts
cargo build --package hello-world --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/hello_world.wasm`

Deploy and instantiate on Testnet (e.g. via [Stellar Laboratory](https://laboratory.stellar.org/) or `stellar contract deploy`). Then call `init_project` once with:

- `business`, `freelancer` (account addresses)
- `token` (token contract ID, e.g. USDC or native asset wrapper)
- `total_amount`, `advance_amount`
- `milestone_amounts`, `milestone_deadlines_ts` (Vec)
- `final_deadline_ts`, `verification_window_secs`

Contract functions:

- `init_project(...)` — initialize (call once per deployment)
- `deposit_advance(business)` — business deposits advance (after approving the contract for the token)
- `submit_milestone(freelancer, index, deliverable_hash)` — freelancer submits milestone hash
- `approve_milestone(business, index)` — business approves; releases funds to freelancer
- `dispute_milestone(business, index)` — business disputes; funds frozen
- `auto_release_if_timeout(index)` — anyone can call after approval window; releases to freelancer
- `submit_final(freelancer, deliverable_hash)` — freelancer submits final delivery
- `approve_final(business)` / `auto_release_final()` — release remaining to freelancer
- `refund_if_deadline_missed()` — anyone can call after final deadline; refunds advance to business
- `finalize_project()` — release remainder to freelancer when all milestones approved (no final step)
- `get_project()`, `get_escrow_balance()` — read state

## 2. Backend (Node + TypeScript)

```bash
cd backend
npm install
npm run build
npm start
```

Or for development:

```bash
npm run dev
```

Env (optional, in `.env`):

- `PORT` — default 5000
- `SOROBAN_RPC_URL` — default Testnet RPC
- `SOROBAN_NETWORK_PASSPHRASE` — default Testnet

Endpoints:

- `POST /project/create` — register project (body: contractId, businessAddress, freelancerAddress, tokenId, amounts, deadlines, etc.)
- `GET /project/:id` — get project metadata
- `GET /project/:id/start` — **402** until advance is in contract; returns advance amount and contract address; 200 when ready
- `POST /milestone/submit` — upload deliverable (file or base64) or send `deliverableHashHex`; returns hash for on-chain submit
- `POST /milestone/approve` — returns instructions (actual approval is on-chain)
- `POST /project/refund` — returns instructions (actual refund is on-chain)

Backend never holds funds; it only stores project metadata and enforces 402.

## 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Env (optional, `.env` or `.env.local`):

- `VITE_API_URL` — backend URL (default `http://localhost:5000`)
- `VITE_SOROBAN_RPC_URL`, `VITE_NETWORK_PASSPHRASE` — for future contract calls from UI

1. Install **Freighter** and connect.
2. **Create project**: deploy and init the contract first, then register with contract ID, freelancer address, token, amounts, deadlines.
3. **Freelancer**: open project by ID; `GET /project/:id/start` returns 402 with advance amount and contract address until business deposits.
4. **Business**: deposit advance to the contract (token `transfer` or `transfer_from` to contract), then call `deposit_advance(business)`.
5. **Milestones**: freelancer uploads deliverable → backend returns hash; submit hash on-chain via `submit_milestone`. Business approves on-chain or wait for auto-release; dispute freezes funds.
6. **Refund**: after final deadline, anyone can call `refund_if_deadline_missed()` to refund advance to business.

## Security notes

- Funds are only in the Soroban contract; backend has no custody.
- Freelancer cannot withdraw advance without delivering (milestones/final) and approval or timeout.
- Refunds are time-based and deterministic in the contract.
- Wallet = identity; optional signature verification on `POST /project/create` (send `signature` and `publicKey`).

## Project layout

```
contracts/contracts/hello-world/   # Soroban escrow (Rust)
backend/src/                      # Node + TS API (x402, Soroban read, hashing)
frontend/src/                     # React + Freighter UI
```
