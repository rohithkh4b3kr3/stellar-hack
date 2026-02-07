# Integration Checklist & Testing Guide

## ✅ Code Quality Status

### Build Status
- ✅ **Frontend**: TypeScript compilation - **PASS** (no errors)
- ✅ **Backend**: TypeScript compilation - **PASS** (no errors)
- ✅ **Contract**: Rust WASM build - **PASS** (19KB artifact created)
  - File: `stellar-contract/soroban-hello-world/target/wasm32-unknown-unknown/release/hello_world.wasm`

### Code Integration Verification
- ✅ **Contract API**: 
  - `create_escrow(client, freelancer, token, amount, soft_deadline) -> job_id` ✓
  - `complete_job(job_id)` ✓
  - `client_cancel_within_6h(job_id)` ✓
  - `claim_refund_after_hard_deadline(job_id)` ✓
  - `get_job(job_id) -> Job` ✓

- ✅ **Frontend Wrapper Functions** (in `frontend/src/contract.ts`):
  - `createEscrow()` → calls `create_escrow` ✓
  - `completeJob()` → calls `complete_job` ✓
  - `clientCancelWithin6h()` → calls `client_cancel_within_6h` ✓
  - `claimRefundAfterHardDeadline()` → calls `claim_refund_after_hard_deadline` ✓

- ✅ **Backend API Endpoints**:
  - `POST /project/create` ✓
  - `GET /projects` ✓
  - `GET /project/:id` ✓
  - `POST /project/:id/apply` ✓
  - `POST /project/:id/accept` ✓
  - `POST /project/:id/set-contract` ✓
  - `POST /project/:id/set-job` ✓
  - `GET /project/:id/start` ✓ (enforces HTTP 402 until escrow funded)
  - `POST /project/:id/submit` ✓
  - `POST /project/:id/approve` ✓
  - `POST /project/:id/refund` ✓

---

## 📋 Pre-Deployment Checklist

### System Requirements
- [ ] Node.js 18+ installed
- [ ] Rust 1.75+ installed with `wasm32-unknown-unknown` target
- [ ] Stellar CLI installed (`stellar`)
- [ ] Freighter wallet browser extension installed
- [ ] Testnet Stellar account with XLM balance

### Testnet Account Setup
- [ ] Create/import Stellar account into Freighter
- [ ] Access Testnet faucet: https://stellar.org/developers/enabled-tooling/testnet-details/
- [ ] Fund account with test XLM (at least 100 XLM)
- [ ] Verify account balance: https://stellar.expert/explorer/testnet/account/{YOUR_PUBLIC_KEY}

### Network Configuration
- [ ] Set Freighter to **Testnet**
- [ ] Document your public key
- [ ] Document your secret key (keep secure)

---

## 🚀 Deployment Steps

### Step 1: Deploy Smart Contract (5 mins)

```bash
cd "stellar-contract/soroban-hello-world"

# Verify WASM file exists
ls -lh target/wasm32-unknown-unknown/release/hello_world.wasm

# Set environment
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export SOROBAN_SOURCE_ACCOUNT="YOUR_TESTNET_PUBLIC_KEY"

# Deploy
stellar contract deploy \
  --wasm "target/wasm32-unknown-unknown/release/hello_world.wasm" \
  --source $SOROBAN_SOURCE_ACCOUNT \
  --network testnet

# Output: Contract ID (save this! looks like CAQNR...)
```

✅ **Expected Output**:
```
Contract ID: CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A
```

### Step 2: Setup Backend (5 mins)

```bash
cd backend

# Create .env
cat > .env << 'EOF'
PORT=5000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ESCROW_CONTRACT_ID=CAQNR...  # <-- Your contract ID from Step 1
XLM_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
EOF

# Install dependencies
npm install

# Build
npm run build

# Start
npm run dev
```

✅ **Expected Output**:
```
Server running on http://localhost:5000
```

Test it:
```bash
curl http://localhost:5000/
# Should return API endpoints list
```

### Step 3: Setup Frontend (5 mins)

```bash
cd frontend

# Create .env.local
cat > .env.local << 'EOF'
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_API_URL=http://localhost:5000
EOF

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ **Expected Output**:
```
  VITE v... ready in ... ms

  ➜  Local:   http://localhost:5173/
```

Open browser to `http://localhost:5173`

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Workflow (Happy Path)

**Actors**: Alice (Hiring) + Bob (Freelancer)

**Steps**:

1. **Alice creates project**
   - [ ] Open app → click "Create Project"
   - [ ] Fill form (title, description, amount, deadline)
   - [ ] Submit → backend creates record
   - [ ] Verify project appears in "Home"

2. **Bob applies**
   - [ ] Switch to Bob's wallet (use different Freighter account or browser)
   - [ ] Navigate to Alice's project
   - [ ] Click "Apply"
   - [ ] Verify application appears

3. **Alice accepts Bob**
   - [ ] Switch back to Alice's account
   - [ ] Go to applicants list
   - [ ] Click "Accept" next to Bob
   - [ ] Verify Bob is now assigned

4. **Alice funds via create_escrow**
   - [ ] Click "Create Escrow" button
   - [ ] Freighter shows transaction details
   - [ ] Approve token spending (if prompted)
   - [ ] Sign transaction
   - [ ] Wait for blockchain confirmation (~10-30 seconds)
   - [ ] Verify job status shows "ready" (state=Funded)

5. **Bob submits delivery**
   - [ ] Switch to Bob's account
   - [ ] Click "Submit Delivery"
   - [ ] Upload file or enter hash
   - [ ] Sign transaction
   - [ ] Verify deliverable is recorded

6. **Alice completes job**
   - [ ] Switch to Alice's account
   - [ ] Click "Complete Job"
   - [ ] Sign transaction (within soft_deadline for 100% payment)
   - [ ] Verify payment is released to Bob

7. **Verify payment**
   - [ ] Check Bob's XLM balance has increased
   - [ ] Check project status shows "completed" (state=Completed)

---

### Scenario 2: Late Delivery (Penalty)

**Steps**:
1. Create project with soft_deadline 1 hour from now
2. Fund escrow (create_escrow)
3. Wait past soft_deadline
4. Bob submits delivery
5. Alice calls complete_job → payment reduced by 5% per day late

**Expected**: Bob receives ~95% of amount (5% penalty)

---

### Scenario 3: Client Cancel Within 6h

**Steps**:
1. Fund escrow (create_escrow)
2. Within 6 hours, call client_cancel_within_6h
3. Full refund to Alice

**Expected**: Job state changes to "Cancelled" (state=Cancelled)

---

### Scenario 4: Refund After Hard Deadline

**Steps**:
1. Fund escrow
2. Wait past hard_deadline (soft_deadline + 7 days)
3. Bob does NOT submit delivery
4. Alice calls claim_refund_after_hard_deadline

**Expected**: Full refund to Alice, job state = "Refunded" (state=Refunded)

---

## 🔍 Verification Commands

### Check Contract Deployment
```bash
stellar contract info \
  --id CAQNR... \
  --rpc-url https://soroban-testnet.stellar.org

# Shows: address, current_contract_id, ledger entry size
```

### Check Account Balance
```bash
stellar account info \
  --public-key YOUR_PUBLIC_KEY \
  --rpc-url https://soroban-testnet.stellar.org
```

### Check Transaction Status
```bash
curl https://horizon-testnet.stellar.org/transactions/{HASH}
```

### View Contract State on Testnet
```
https://stellar.expert/explorer/testnet/contract/CAQNR...
```

---

## ❌ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `MissingValue` | Contract not deployed or wrong contract ID | Deploy contract from Step 1, update ESCROW_CONTRACT_ID |
| `Network Passphrase mismatch` | Using wrong network | Verify Freighter = Testnet, backend/frontend .env correct |
| `insufficient_balance` | Account low on XLM | Fund via faucet or existing account |
| `Can't transfer: no approval` | Token allowance not set | Freighter should prompt auto-approval; if not, check token contract |
| `Job is not active` | Trying to complete already-completed job | Check job state via `get_job()` |
| `Past hard deadline` | Calling complete_job after hard_deadline | Use `claim_refund_after_hard_deadline` instead |
| `Backend returns 402` | No job funded yet | Call create_escrow to fund escrow |

---

## 📊 Expected API Responses

### GET /project/:id

```json
{
  "id": "proj_123",
  "businessAddress": "GBTMK5...",
  "freelancerAddress": "GDTQZP...",
  "tokenId": "CDLZFC3...",
  "title": "Logo Design",
  "totalAmount": "100",
  "advanceAmount": "100",
  "deliveryDeadlineTs": 1707868800,
  "verificationWindowSecs": 259200,
  "contractId": "CAQNR...",
  "jobId": 1,
  "applicants": ["GDTQZP..."],
  "createdAt": 1707782400000
}
```

### GET /project/:id/start (When funded)

```json
{
  "status": "ready",
  "message": "Full amount in escrow; freelancer can deliver...",
  "contractId": "CAQNR...",
  "projectId": "proj_123",
  "jobId": 1,
  "contractState": 0,
  "jobFundedAt": 1707868800,
  "jobSoftDeadline": 1707955200,
  "jobHardDeadline": 1708560000
}
```

---

## 🎯 Success Criteria

All tests pass when:

- ✅ Frontend builds without TypeScript errors
- ✅ Backend starts without errors
- ✅ Contract deploys to testnet
- ✅ Create project endpoint works
- ✅ Create escrow transaction succeeds
- ✅ Payment is transferred to contract
- ✅ Job status updates correctly
- ✅ Freelancer receives payment after completion
- ✅ All 4 scenarios execute successfully

---

## 📝 Notes

- **Token**: Using XLM (CDLZFC3...) on Testnet for testing
- **Gas Fee**: Contract calls cost ~1-10K stroops of XLM
- **Delays**: Testnet may have 5-30 second transaction confirmation times
- **Resets**: Testnet data can be cleared; save contract ID when deployed
- **Freighter**: Must approve spending for token transfers

