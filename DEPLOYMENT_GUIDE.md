# Complete Deployment Guide

## System Overview

```
┌─────────────┐
│   Frontend  │ (React + Vite + Freighter wallet)
│   (Port 5173)│
└──────┬──────┘
       │ API + Contract calls
       ▼
┌──────────────┐           ┌─────────────────┐
│   Backend    │◄────────►│  Soroban Smart  │
│   (Port 5000)│           │  Contract       │
└──────────────┘           │  (Testnet)      │
                           └─────────────────┘
```

## Architecture

### Contract (Soroban/Rust)
- **Location**: `stellar-contract/soroban-hello-world/contracts/hello-world/`
- **Functions**:
  - `create_escrow(client, freelancer, token, amount, soft_deadline) -> job_id`
  - `complete_job(job_id)` - pays freelancer (with penalty if past soft deadline)
  - `client_cancel_within_6h(job_id)` - refund within 6 hours
  - `claim_refund_after_hard_deadline(job_id)` - refund after hard deadline
  - `get_job(job_id) -> Job` - read state

### Backend (Node.js/Express)
- **Location**: `backend/`
- **Role**: Metadata management, never holds funds
- **API Endpoints**:
  - `POST /project/create` - Create project
  - `GET /projects` - List projects
  - `POST /project/:id/apply` - Freelancer applies
  - `POST /project/:id/accept` - Accept freelancer
  - `POST /project/:id/set-contract` - Register deployed contract
  - `GET /project/:id/start` - Get project status (enforces HTTP 402)
  - `POST /project/:id/set-job` - Store job ID
  - `POST /project/:id/submit` - Hash deliverable
  - `POST /project/:id/approve` - Instructions for approval
  - `POST /project/:id/refund` - Instructions for refund

### Frontend (React)
- **Location**: `frontend/`
- **Role**: UI, wallet connection, contract invocation
- **Flow**: User connects → creates/applies to project → funds via create_escrow → completes job

---

## Step 1: Build the Smart Contract

### Prerequisites
- Rust installed with `wasm32-unknown-unknown` target
- Stellar CLI installed

### Build

```bash
cd "stellar-contract/soroban-hello-world"
cargo build --release --target wasm32-unknown-unknown
```

**Output WASM file:**
```
target/wasm32-unknown-unknown/release/hello_world.wasm
```

Verify it exists:
```bash
ls -lh target/wasm32-unknown-unknown/release/hello_world.wasm
```

---

## Step 2: Deploy Contract to Stellar Testnet

### Set Environment Variables

```bash
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export SOROBAN_SOURCE_ACCOUNT="YOUR_TESTNET_PUBLIC_KEY"
```

### Deploy

```bash
stellar contract deploy \
  --wasm "stellar-contract/soroban-hello-world/target/wasm32-unknown-unknown/release/hello_world.wasm" \
  --source $SOROBAN_SOURCE_ACCOUNT \
  --network testnet
```

**Save the output contract ID** (starts with `C...`). Example:
```
Contract ID: CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A
```

---

## Step 3: Configure Backend

### Create `.env` file in `backend/`

```bash
cd backend
cat > .env << 'EOF'
# Port
PORT=5000

# Stellar/Soroban
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract (from Step 2)
ESCROW_CONTRACT_ID=CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A

# Optional: XLM token contract (Testnet)
XLM_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# Database (optional; uses in-memory if not set)
# DATABASE_URL=postgresql://user:password@localhost/freelance_db
EOF
```

### Install & Start Backend

```bash
npm install
npm run build
npm run dev  # For development with live reload
# OR
npm start    # For production
```

Server runs on `http://localhost:5000`

---

## Step 4: Configure Frontend

### Create `.env.local` in `frontend/`

```bash
cd frontend
cat > .env.local << 'EOF'
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_API_URL=http://localhost:5000
EOF
```

### Install & Start Frontend

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Step 5: Test the Full Flow

### 1. Connect Wallet
- Open `http://localhost:5173`
- Click "Connect Wallet"
- Approve connection in Freighter
- Add some Testnet XLM to your account

### 2. Create Project (as Hiring Person)
- Click "Create Project"
- Fill in:
  - **Token ID**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (Testnet XLM)
  - **Title**: "Logo Design"
  - **Description**: "Design our company logo"
  - **Total Amount**: "100" (stroops)
  - **Deadline**: 7 days from now
- Submit

### 3. Accept Freelancer
- Freelancer address applies
- You (hiring person) accept them
- Click "Create Escrow"

### 4. Fund via Contract
- Modal shows contract ID and required parameters
- Approve token spending in Freighter
- Click "Pay"
- Wait for transaction confirmation

### 5. Freelancer Delivers
- Switch to freelancer account
- Click "Submit Delivery"
- Upload or provide hash
- Click "Submit"

### 6. Complete Job (as Hiring Person)
- Click "Complete Job"
- Sign transaction in Freighter
- Freelancer receives payment (minus penalty if late)

---

## Troubleshooting

### Contract Not Found
**Error**: `Contract ID not found`

**Fix**: 
1. Verify contract ID in backend `.env` matches your deployed contract
2. Check contract is deployed to correct network
3. Run: `stellar contract info --id CAQNR... --network testnet`

### Token Not Approved
**Error**: `insufficient_balance` or `transfer denied`

**Fix**:
1. Approve token spending from frontend
2. Use correct token ID from network

### Network Mismatch
**Error**: `Network Passphrase mismatch`

**Fix**:
- Verify Freighter network setting (should be "Testnet")
- Check `.env` has correct passphrase
- All three (Freighter, frontend, backend) must use same network

### Timeout on Contract Calls
**Error**: `Transaction timeout`

**Fix**:
1. Check RPC endpoint is reachable: `curl https://soroban-testnet.stellar.org`
2. Network might be congested; retry after waiting
3. Increase timeout in `contract.ts` if needed

---

## Configuration References

### Networks

**Testnet**:
```
RPC: https://soroban-testnet.stellar.org
Passphrase: Test SDF Network ; September 2015
XLM Token: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Horizon: https://horizon-testnet.stellar.org
```

**Mainnet** (when ready):
```
RPC: https://soroban-mainnet.stellar.org
Passphrase: Public Global Stellar Network ; September 2015
XLM Token: CAQWEG3DOXCG7YDOA3ZCOFUWQ3HYPPUEPZ7BJUQDDL2ABUQ7PBVLQSZ
Horizon: https://horizon.stellar.org
```

---

## Environment Variables Summary

| Service | Variable | Value |
|---------|----------|-------|
| All | `SOROBAN_RPC_URL` | https://soroban-testnet.stellar.org |
| All | `SOROBAN_NETWORK_PASSPHRASE` | Test SDF Network ; September 2015 |
| Backend | `PORT` | 5000 |
| Backend | `ESCROW_CONTRACT_ID` | Your deployed contract ID |
| Frontend | `VITE_API_URL` | http://localhost:5000 |

