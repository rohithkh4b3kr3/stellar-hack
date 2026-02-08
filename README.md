# gigX Freelance Escrow

Smart contract escrow workflow for clients and freelancers on Stellar Soroban. Funds are locked on-chain and released only after client approval.

## Repo Structure

- `frontend/` React + Vite client
- `backend/` Express API + Socket.IO
- `stellar-contract/` Soroban escrow contract

## Prerequisites

- Node.js 18+
- npm
- Freighter wallet (testnet)
- Optional: PostgreSQL (if `DATABASE_URL` is set)

## Environment Setup

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and set values:

- `VITE_API_URL` backend base URL
- `VITE_SOROBAN_RPC_URL` Soroban RPC endpoint
- `VITE_NETWORK_PASSPHRASE` network passphrase
- `VITE_XLM_TOKEN_ID` native XLM token contract id (recommended)

### Backend

Set values in `backend/.env`:

- `PORT` server port (default 5000)
- `SOROBAN_RPC_URL` Soroban RPC endpoint
- `SOROBAN_NETWORK_PASSPHRASE` network passphrase
- `ESCROW_CONTRACT_ID` deployed contract id
- `XLM_TOKEN_ID` native XLM token contract id
- `DATABASE_URL` optional PostgreSQL connection string

## Install

Frontend:

```
cd frontend
npm install
```

Backend:

```
cd backend
npm install
```

## Run (Local)

Backend:

```
cd backend
npm run dev
```

Frontend:

```
cd frontend
npm run dev
```

Open the app in your browser using the Vite dev URL.

## Workflow

1. Client posts a job with budget and timeline.
2. Client selects a freelancer from applicants.
3. Client funds escrow on-chain.
4. Freelancer delivers work.
5. Client approves and releases funds.

Cancel window: client can cancel within 6 hours of funding if the freelancer has not accepted.

## API Overview

Backend endpoints:

- `POST /project/create`
- `GET /projects`
- `GET /project/:id`
- `POST /project/:id/apply`
- `POST /project/:id/accept`
- `POST /project/:id/set-contract`
- `POST /project/:id/set-job`
- `POST /preflight/escrow`
- `GET /project/:id/start`

## Contract Notes

The Soroban contract lives in `stellar-contract/`. Deploy it and set `ESCROW_CONTRACT_ID` in the backend. The frontend reads contract id and state through the backend.

## Build

Frontend:

```
cd frontend
npm run build
```

Backend:

```
cd backend
npm run build
npm start
```

