# Quick Reference & Command Guide

## 🚀 Quick Start (5 mins)

**Terminal 1 - Deploy Contract**:
```bash
cd stellar-contract/soroban-hello-world
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source YOUR_KEY \
  --network testnet
# Save the Contract ID output
```

**Terminal 2 - Start Backend**:
```bash
cd backend
echo 'ESCROW_CONTRACT_ID=YOUR_CONTRACT_ID' >> .env
npm run dev
```

**Terminal 3 - Start Frontend**:
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## 📦 Installation & Setup

### Initialize All Services

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install

# Contract (Rust/cargo handles dependencies)
cd stellar-contract/soroban-hello-world
cargo build --release --target wasm32-unknown-unknown
```

### Environment Files

**`backend/.env`**:
```env
PORT=5000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ESCROW_CONTRACT_ID=CAQNR... # Get from contract deployment
XLM_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

**`frontend/.env.local`**:
```env
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_API_URL=http://localhost:5000
```

---

## 🔧 Build Commands

### Frontend

```bash
cd frontend

# Development
npm run dev              # Start dev server (localhost:5173)

# Production
npm run build            # Build to dist/
npm run preview          # Preview production build
```

### Backend

```bash
cd backend

# Development
npm run dev              # Start with hot reload

# Production
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled JS
```

### Contract

```bash
cd stellar-contract/soroban-hello-world

# Check (no build)
cargo check --target wasm32-unknown-unknown

# Build
cargo build --release --target wasm32-unknown-unknown
# Output: target/wasm32-unknown-unknown/release/hello_world.wasm

# Clean build artifacts
cargo clean

# Test
cargo test
```

---

## 📡 Contract Deployment

### Deploy to Testnet

```bash
# Requires: Stellar account on testnet with XLM balance
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

stellar contract deploy \
  --wasm path/to/hello_world.wasm \
  --source YOUR_PUBLIC_KEY \
  --network testnet \
  --sign-with-keyfile path/to/secret.txt
```

### Verify Deployment

```bash
# Check contract info
stellar contract info \
  --id CAQNR... \
  --rpc-url https://soroban-testnet.stellar.org

# View on explorer
# https://stellar.expert/explorer/testnet/contract/CAQNR...
```

### Invoke Contract Functions (via CLI)

```bash
# Get job details
stellar contract invoke \
  --id CAQNR... \
  --source YOUR_KEY \
  --rpc-url https://soroban-testnet.stellar.org \
  -- get_job --job-id 1

# Note: Frontend does this via Freighter signing
```

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:5000
```

### Project Management

```bash
# Create project
curl -X POST http://localhost:5000/project/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessAddress": "GBTMK5...",
    "tokenId": "CDLZFC3...",
    "title": "Logo Design",
    "description": "Design our logo",
    "totalAmount": "100",
    "deliveryDeadlineTs": 1707955200
  }'

# List projects
curl http://localhost:5000/projects

# Get project
curl http://localhost:5000/project/proj_123

# Apply to project
curl -X POST http://localhost:5000/project/proj_123/apply \
  -H "Content-Type: application/json" \
  -d '{"freelancerAddress": "GDTQZP..."}'

# Accept freelancer
curl -X POST http://localhost:5000/project/proj_123/accept \
  -H "Content-Type: application/json" \
  -d '{"freelancerAddress": "GDTQZP..."}'

# Get project status (checks contract state)
curl http://localhost:5000/project/proj_123/start

# Submit deliverable
curl -X POST http://localhost:5000/project/proj_123/submit \
  -F "deliverable=@my_design.png"
  # OR
curl -X POST http://localhost:5000/project/proj_123/submit \
  -H "Content-Type: application/json" \
  -d '{"deliverableHashHex": "abc123..."}'
```

---

## 🔐 Freighter Wallet Integration

### Test Accounts

**Create test accounts**:
1. Add new account in Freighter extension
2. Switch to Testnet network
3. Note the public key (starts with `G...`)
4. Fund via: https://stellar.org/developers/enabled-tooling/testnet-details/

### Approve Token Spending

Frontend will prompt to approve when needed:
1. Click "Approve" in Freighter
2. Confirm transaction
3. Proceed with escrow creation

### Sign Contract Transactions

When calling contract functions:
1. Freighter shows transaction details
2. Review contract + operation
3. Click "Sign"
4. Wait for blockchain confirmation

---

## 🧪 Testing & Debugging

### Backend Logs

```bash
# Development mode shows console logs
npm run dev

# Check specific endpoint
curl -v http://localhost:5000/projects
```

### Frontend Console Errors

1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for API calls
4. Check Application → Local Storage for wallet data

### Contract Testing

```bash
cd stellar-contract/soroban-hello-world

# Run Rust tests
cargo test

# See output
cargo test -- --nocapture
```

### Check Balances

```bash
# View account details
curl https://stellar.expert/api/account/YOUR_PUBLIC_KEY

# Check token balance
curl 'https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY'
# Look for 'balances' array
```

---

## 🔍 Monitoring & Status

### Contract State

**On-chain verification**:
```bash
# Check if contract exists
stellar contract info --id CAQNR... --rpc-url https://soroban-testnet.stellar.org

# Verify network
stellar network info --network testnet
```

**Via Web**:
- Testnet explorer: https://stellar.expert/explorer/testnet/
- Search for contract ID (CAQNR...)
- View: State, recent transactions, balance

### Transaction Status

```bash
# Get transaction by hash
curl https://horizon-testnet.stellar.org/transactions/{HASH}

# Look for: "successful" field (true/false)
```

### Gas/Fee Estimation

Contract calls use:
- **Network fee**: ~100-1000 stroops (usually covered by SDK)
- **Per-operation**: ~1100-10000 stroops depending on complexity
- **Total typical transaction**: 10-100K stroops (0.00001-0.0001 XLM)

---

## 📊 Network References

### Testnet

```
Network Passphrase: Test SDF Network ; September 2015
RPC Endpoint: https://soroban-testnet.stellar.org
Horizon URL: https://horizon-testnet.stellar.org
Explorer: https://stellar.expert/explorer/testnet/

XLM Token Contract: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Faucet: https://stellar.org/developers/enabled-tooling/testnet-details/

Explorer Template:
- Account: https://stellar.expert/explorer/testnet/account/{PUBKEY}
- Contract: https://stellar.expert/explorer/testnet/contract/{CONTRACT_ID}
- Transaction: https://stellar.expert/explorer/testnet/tx/{HASH}
```

### Mainnet (Production)

```
Network Passphrase: Public Global Stellar Network ; September 2015
RPC Endpoint: https://soroban-mainnet.stellar.org
Horizon URL: https://horizon.stellar.org
Explorer: https://stellar.expert/explorer/public/

XLM Token Contract: CAQWEG3DOXCG7YDOA3ZCOFUWQ3HYPPUEPZ7BJUQDDL2ABUQ7PBVLQSZ
```

---

## 🐛 Common Issues & Fixes

### Issue: Contract function not found
```
Error: Error(WasmVm, MissingValue)
```
**Fix**:
- Verify `ESCROW_CONTRACT_ID` in backend `.env`
- Contract must be deployed to same network
- Check function name matches contract (e.g., `create_escrow` vs `init_project`)

### Issue: Invalid network passphrase
```
Error: Network Passphrase mismatch
```
**Fix**:
- Freighter network must be "Testnet"
- Backend `.env` SOROBAN_NETWORK_PASSPHRASE must match
- Frontend `.env.local` VITE_NETWORK_PASSPHRASE must match

### Issue: Transaction timeout
```
Error: Transaction timeout (60 retries)
```
**Fix**:
- RPC endpoint might be slow
- Network might be congested
- Increase timeout threshold in code
- Check RPC health: `curl https://soroban-testnet.stellar.org`

### Issue: Insufficient balance
```
Error: insufficient_balance
```
**Fix**:
- Fund account via faucet
- Check XLM balance: `stellar account info --source-account YOUR_KEY`
- Need at least 2 XLM for account + operations

### Issue: Token approval fails
```
Error: Transfer from contract denied
```
**Fix**:
- Freighter should auto-prompt for approval
- Manually approve in Freighter token menu
- Verify token contract ID matches

---

## 🚨 Emergency/Recovery

### Reset Contract (Deploy New)

```bash
# Build latest
cd stellar-contract/soroban-hello-world
cargo build --release --target wasm32-unknown-unknown

# Deploy new version
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source YOUR_KEY \
  --network testnet

# Update backend .env with new CONTRACT_ID
```

### Clear Local State (Frontend)

```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
// Refresh page
```

### Reset Backend Database

```bash
# If using PostgreSQL, drop and recreate
# If in-memory, just restart the server

npm run dev
```

---

## 📝 Environment Variable Checklist

- [ ] `SOROBAN_RPC_URL` set to `https://soroban-testnet.stellar.org`
- [ ] `SOROBAN_NETWORK_PASSPHRASE` set to `Test SDF Network ; September 2015`
- [ ] `ESCROW_CONTRACT_ID` set (from contract deployment)
- [ ] `XLM_TOKEN_ID` set to `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- [ ] `VITE_API_URL` set to `http://localhost:5000`
- [ ] Freighter wallet on **Testnet** network
- [ ] Testnet account has >1 XLM balance

