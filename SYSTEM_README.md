# 🚀 Stellar Hack - Trustless Freelance Escrow Platform

## Overview

**Stellar Hack** is a decentralized, trustless freelance escrow platform built on the Stellar blockchain using Soroban smart contracts.

- **No intermediary** holds funds
- **Automatic enforcement** via smart contracts
- **HTTP 402 Payment Required** enforces payment before work
- **Penalty system** (5% per day) incentivizes on-time delivery
- **Permissionless refund** if deadlines are missed

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      STELLAR BLOCKCHAIN                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Soroban Smart Contract (Rust WASM)           │   │
│  │                                                      │   │
│  │  create_escrow() → generates job_id                │   │
│  │  complete_job() → pays freelancer                  │   │
│  │  client_cancel_within_6h() → refund                │   │
│  │  claim_refund_after_hard_deadline() → refund       │   │
│  │  get_job() → query state                           │   │
│  │                                                      │   │
│  │  State: Funded | Completed | Cancelled | Refunded  │   │
│  │  Storage: Job data, payment amounts, deadlines      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ▲                                   │
│                          │ (Contract calls, state queries)  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                ┌──────────┴────────────┐
                │                       │
         ┌──────▼────────┐      ┌─────▼──────────┐
         │    FRONTEND   │      │    BACKEND     │
         │   React/Vite  │      │  Express/Node  │
         │               │      │                │
         │ - UI Pages    │      │ - API Routes   │
         │ - Wallet Conn │      │ - HTTP 402     │
         │ - Freighter   │      │ - Job Storage  │
         │ - Contract    │      │ - RPC Client   │
         │   Wrappers    │      │ - Hashing      │
         │               │      │ - Verification │
         └───────┬───────┘      └────────┬───────┘
                 │                       │
            localhost:5173         localhost:5000
                 │                       │
                 └───────────┬───────────┘
                             │
                      ┌──────▼──────┐
                      │ PostgreSQL  │
                      │ (Optional)  │
                      └─────────────┘
                      Project Metadata
                      (No funds stored!)
```

---

## 📦 What's In The Box

### `/frontend` - React Web Application
- Connected to **Stellar** blockchain via **Freighter** wallet
- Create projects, apply as freelancer, view status
- Invoke smart contract functions for payments
- Responsive UI with Tailwind CSS

**Key Files**:
- `src/App.tsx` - Main application
- `src/contract.ts` - Smart contract wrapper ✅ **FIXED**
- `src/api.ts` - Backend API client
- `src/wallet.ts` - Freighter integration

### `/backend` - Node.js REST API
- Metadata storage (projects, applications, job tracking)
- HTTP 402 Payment Required enforcement
- Soroban RPC client for contract queries
- Optional PostgreSQL support

**Key Files**:
- `src/routes.ts` - API endpoints (11 total)
- `src/soroban.ts` - Contract read helpers
- `src/store.ts` - Project storage
- `src/crypto.ts` - Signature verification, hashing

### `/stellar-contract` - Soroban Smart Contract
Rust WebAssembly contract that holds all funds and enforces the payment logic.

**Key Files**:
- `contracts/hello-world/src/lib.rs` - Contract implementation (209 lines)
- Functions: `create_escrow`, `complete_job`, `client_cancel_within_6h`, `claim_refund_after_hard_deadline`, `get_job`

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Node.js 18+** installed
- **Rust** installed with `wasm32-unknown-unknown` target
- **Stellar CLI** installed
- **Freighter** wallet extension
- **Stellar Testnet account** with XLM balance

### 1. Build Contract
```bash
cd stellar-contract/soroban-hello-world
cargo build --release --target wasm32-unknown-unknown
```

### 2. Deploy Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source YOUR_PUBLIC_KEY \
  --network testnet
# Save the Contract ID (starts with C...)
```

### 3. Start Backend
```bash
cd backend
echo "ESCROW_CONTRACT_ID=CAQNR..." > .env
echo "SOROBAN_RPC_URL=https://soroban-testnet.stellar.org" >> .env
# ... (see DEPLOYMENT_GUIDE.md for full .env)
npm install && npm run dev
```

### 4. Start Frontend
```bash
cd frontend
echo "VITE_API_URL=http://localhost:5000" > .env.local
# ... (see DEPLOYMENT_GUIDE.md for full .env.local)
npm install && npm run dev
```

### 5. Test It
- Open http://localhost:5173
- Connect Freighter wallet
- Create a project
- Accept a freelancer
- Fund via escrow
- 🎉 Done!

---

## 📚 Documentation

### For Deployment
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions

### For Testing
👉 **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete testing scenarios (4 flows)

### For Reference
👉 **[QUICKSTART.md](./QUICKSTART.md)** - Commands, APIs, troubleshooting

### For Understanding
👉 **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Architecture, flows, details

---

## ✅ What Was Fixed

### Frontend Contract Integration
The `contract.ts` file was calling non-existent functions. Fixed to call the actual contract functions:

**Before** ❌:
```typescript
invokeContract(..., "init_project", [...])    // Doesn't exist in contract!
invokeContract(..., "deposit_advance", [...]) // Doesn't exist!
```

**After** ✅:
```typescript
invokeContract(..., "create_escrow", [...])   // Correct!
invokeContract(..., "complete_job", [...])    // Correct!
invokeContract(..., "client_cancel_within_6h", [...]) // Correct!
```

### Build Status
- ✅ Frontend: TypeScript compiles (0 errors)
- ✅ Backend: TypeScript compiles (0 errors)
- ✅ Contract: Rust compiles to WASM (19KB artifact)

---

## 🎯 How It Works

### 1. Create Project (Hiring Person)
```
UI: Fill in project details (title, amount, deadline)
↓
API: POST /project/create
↓
Backend: Save to database
↓
Frontend: Show project ID
```

### 2. Apply & Accept (Freelancer + Hiring Person)
```
Freelancer: Click "Apply"
↓
API: POST /project/:id/apply
↓
Hiring Person: Click "Accept"
↓
API: POST /project/:id/accept
↓
Backend: Set freelancerAddress
```

### 3. Fund Escrow (Hiring Person)
```
UI: Click "Create Escrow"
↓
Frontend: Call contract.create_escrow()
↓
Freighter: Request signature
↓
Blockchain: Transfer funds to contract, return job_id
↓
Backend: Save job_id (HTTP 402 now satisfied)
```

### 4. Deliver & Complete (Freelancer + Hiring Person)
```
Freelancer: Click "Submit Delivery" (optional UI tracking)
↓
Hiring Person: Click "Complete Job"
↓
Frontend: Call contract.complete_job()
↓
Freighter: Request signature
↓
Blockchain: Calculate payout (minus penalty if late), transfer to freelancer
↓
Frontend: Show completion
```

### Alternative: Cancel or Refund
```
Within 6h: client_cancel_within_6h() → full refund
After deadline: claim_refund_after_hard_deadline() → full refund
```

---

## 💰 Payment Flow

### Example Scenario
```
Total Amount: 100 XLM
Soft Deadline: 7 days from now
Hard Deadline: 7 days + 7 days = 14 days from now

Timeline:
Day 1  → Funding: 100 XLM locked in contract
Day 3  → Freelancer delivers (ON TIME ✓)
Day 3  → Hiring person approves
         → Freelancer receives: 100 XLM (100% = 0 penalty)

Alternative - LATE:
Day 8  → Freelancer delivers (1 day LATE ✗)
Day 8  → Hiring person approves
         → Penalty: 5% per day × 1 day = 5%
         → Freelancer receives: 95 XLM
         → Hiring person receives: 5 XLM (refund)

Alternative - MISSED:
Day 15 → Freelancer never delivered
         → Anyone can call claim_refund_after_hard_deadline()
         → Hiring person receives: 100 XLM (full refund)
```

---

## 🔐 Security Features

### Contract Level
✅ **No admin functions** - Can't change behavior after deployment
✅ **No upgrade capability** - Code is immutable
✅ **Signature enforcement** - require_auth() on sensitive operations
✅ **State machine** - Only valid state transitions allowed
✅ **TTL management** - Automatic cleanup of old data

### Integration Level
✅ **Backend never holds funds** - All money in contract
✅ **User controls authorization** - Every transaction signed by user via Freighter
✅ **HTTP 402 enforcement** - Can't start work until paid
✅ **Cryptographic proof** - All state changes on-chain

### Testnet Security Note
⚠️ Testnet is public and can be reset; production deployment needs mainnet

---

## 🌍 Network Information

### Testnet (Development)
```
Network Passphrase: Test SDF Network ; September 2015
RPC Endpoint: https://soroban-testnet.stellar.org
Explorer: https://stellar.expert/explorer/testnet/
Faucet: https://stellar.org/developers/enabled-tooling/testnet-details/
XLM Token: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### Mainnet (Production)
```
Network Passphrase: Public Global Stellar Network ; September 2015
RPC Endpoint: https://soroban-mainnet.stellar.org
Explorer: https://stellar.expert/explorer/public/
XLM Token: CAQWEG3DOXCG7YDOA3ZCOFUWQ3HYPPUEPZ7BJUQDDL2ABUQ7PBVLQSZ
```

---

## 📊 API Endpoints

### Projects
```
POST   /project/create           Create new project
GET    /projects                 List all projects
GET    /project/:id              Get project details
POST   /project/:id/apply        Freelancer applies
POST   /project/:id/accept       Hiring person accepts freelancer
POST   /project/:id/set-contract Register deployed contract
```

### Job Management
```
POST   /project/:id/set-job      Store job ID (set by frontend after create_escrow)
GET    /project/:id/start        Get project status (enforces HTTP 402)
POST   /project/:id/submit       Submit deliverable hash
POST   /project/:id/approve      Approval instructions
POST   /project/:id/refund       Refund instructions
```

See **QUICKSTART.md** for curl examples.

---

## 🧪 Testing

All 4 scenarios documented in **TESTING_GUIDE.md**:

1. **Happy Path** - Create → Fund → Deliver → Complete
2. **Late Delivery** - Penalty calculation (5% per day)
3. **Early Cancel** - Within 6h (full refund)
4. **Missed Deadline** - After hard_deadline (full refund)

---

## 🚨 Troubleshooting

### Contract Not Found
**Error**: `Error(WasmVm, MissingValue)`
- Verify ESCROW_CONTRACT_ID in backend .env
- Contract must be deployed to the correct network

### Network Mismatch
**Error**: `Network Passphrase mismatch`
- Freighter must be on Testnet
- All .env files must have matching network info

### Transaction Timeout
**Error**: `Transaction timeout`
- Check RPC endpoint: `curl https://soroban-testnet.stellar.org`
- Wait and retry (network might be busy)

See **QUICKSTART.md** → "🐛 Common Issues & Fixes" for more.

---

## 📋 Checklist

### Before Deployment
- [ ] Contract WASM built
- [ ] Testnet account funded
- [ ] Freighter wallet installed & configured for Testnet

### After Deployment
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] Contract deployed to Testnet
- [ ] backend/.env has ESCROW_CONTRACT_ID
- [ ] All environment variables set

### After Testing
- [ ] Create project works
- [ ] Apply/Accept works
- [ ] Create-escrow works
- [ ] Complete-job works
- [ ] Refund works
- [ ] Job states update correctly

---

## 🎓 Learning Path

1. **Understand the Architecture** → Read this README + INTEGRATION_SUMMARY.md
2. **Follow Deployment** → Read DEPLOYMENT_GUIDE.md step-by-step
3. **Run Tests** → Follow TESTING_GUIDE.md scenarios
4. **Troubleshoot** → Refer to QUICKSTART.md reference
5. **Explore Code** → Read inline comments in:
   - `frontend/src/contract.ts` - Contract wrapper
   - `backend/src/routes.ts` - API logic
   - `stellar-contract/**/*.rs` - Smart contract

---

## 🤝 Contributing

This is a demonstration project for the Stellar Hack hackathon. Fork and modify as needed!

Potential enhancements:
- [ ] Add unit tests for contract
- [ ] Implement PostgreSQL for production
- [ ] Add more token options (not just XLM)
- [ ] Multi-job escrow contract
- [ ] Dispute resolution system
- [ ] Frontend improvements (UI/UX)
- [ ] Backend contract deployment automation

---

## 📝 License

[Your License Here]

---

## 🔗 Links

- **Stellar Docs**: https://developers.stellar.org/
- **Soroban Guide**: https://soroban.stellar.org/
- **Freighter**: https://www.freighter.app/
- **Stellar Expert**: https://stellar.expert/
- **JavaScript SDK**: https://js.stellar.org/

---

## 🎯 What's Next?

1. **Deploy to Testnet** - Follow DEPLOYMENT_GUIDE.md
2. **Test the system** - Follow TESTING_GUIDE.md
3. **Deploy to Mainnet** - Change network config (when ready)
4. **Enhance features** - Add dispute resolution, more tokens, etc.

---

**Ready to get started? → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** 🚀

