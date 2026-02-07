# Trustless Freelance Escrow Platform

A decentralized freelance marketplace where payments are enforced by smart contracts, not trust.

- **Hiring persons** cannot delay payment
- **Freelancers** cannot ghost
- **Funds** are held in a Soroban contract, never by the backend
- **HTTP 402** forces advance payment before work starts

## 🎯 Core Concept

```
Hiring Person → Creates Project → Freelancer Applies
     ↓
  Accepts Freelancer
     ↓
  Deploys Escrow Contract (Soroban)
     ↓
  Pays 30% Advance (via HTTP 402)
     ↓
  Contract Locks Funds ← Freelancer Can Now Work
     ↓
  Freelancer Delivers Work (Hash)
     ↓
  Hiring Person Approves OR Timeout Auto-Releases
     ↓
  Freelancer Receives Full Payment
```

## 📋 Prerequisites

### System Requirements
- **Node.js** 18+ (backend & frontend)
- **Rust & Cargo** (for contract)
- **Freighter Wallet** browser extension (for blockchain)

### Setup Rust for Soroban
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend
```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:5000
```

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### Step 3: Connect Wallet & Test
1. Install **Freighter** browser extension
2. Create or import a Stellar testnet account
3. Open `http://localhost:5173`
4. Click "Connect Wallet"
5. Choose "Login as Hiring Person" or "Login as Freelancer"

## 📦 Backend API

**Base URL**: `http://localhost:5000`

### Projects
- `POST /project/create` - Create new project
- `GET /projects` - List all projects
- `GET /project/:id` - Get project details

### Freelancer Operations
- `POST /project/:id/apply` - Apply to project
- `GET /project/:id/start` - **Returns 402 if advance needed**
- `POST /project/:id/submit` - Hash deliverable

### Hiring Person Operations
- `POST /project/:id/accept` - Accept freelancer
- `POST /project/:id/set-contract` - Set contract ID post-deployment
- `POST /project/:id/approve` - Instructions for approval
- `POST /project/:id/refund` - Instructions for refund

### Example: Create Project
```bash
curl -X POST http://localhost:5000/project/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessAddress": "GXXXXXX...",
    "tokenId": "CXXXXXX...",
    "title": "Logo Design",
    "description": "Design a company logo",
    "totalAmount": "1000000",
    "deliveryDeadlineTs": 1730000000,
    "verificationWindowSecs": 259200
  }'
```

## 🔗 Smart Contract (Soroban)

### Build Contract
```bash
cd contracts
cargo build --package hello-world --target wasm32-unknown-unknown --release
```

### Deployment & Initialization
```bash
# 1. Deploy WASM
soroban contract deploy \
  --source-account YOUR_ACCOUNT \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm

# 2. Initialize project (call init_project)
soroban contract invoke \
  --id C... \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  --source-account YOUR_ACCOUNT \
  -- init_project \
  --business GXXXXXX \
  --freelancer GYYYYYY \
  --token CZZZZZ \
  --total-amount 1000000 \
  --advance-amount 300000 \
  --delivery-deadline 1730000000 \
  --verification-window-secs 259200
```

### Contract Functions

| Function | Caller | Purpose |
|----------|--------|---------|
| `init_project(...)` | Business | Initialize escrow |
| `deposit_advance(business)` | Business | Lock 30% advance |
| `deposit_remaining(business)` | Business | Add 70% before approval |
| `submit_delivery(freelancer, hash)` | Freelancer | Submit deliverable hash |
| `approve_delivery(business)` | Business | Approve & release full payment |
| `auto_release_if_timeout()` | Anyone | Auto-release after timeout |
| `refund_if_deadline_missed()` | Anyone | Refund if no delivery |
| `get_project()` | Anyone | Get project state |
| `get_escrow_balance()` | Anyone | Get contract balance |

## 🖥️ Frontend UI

**Routes:**
- `/` - Landing page (wallet connection)
- `/hiring` - Hiring person dashboard
- `/freelancer` - Freelancer dashboard
- `/project/:id` - Project detail

**Features:**
- Black & white minimal design
- Real-time countdown timers
- Escrow status display
- File upload for deliverables
- Wallet connection via Freighter

**Design:**
- Font: Space Grotesk (Google Fonts)
- Colors: Black background (#000), white text, minimal borders
- Responsive: Works on desktop

## 🔐 Security Model

### What the Backend Does
✅ Hash deliverables
✅ Track project metadata
✅ Return HTTP 402 for payment
❌ **Never holds funds**

### What the Contract Does
✅ Holds all funds in escrow
✅ Validates state transitions
✅ Enforces permissions
✅ Refunds on timeout

### Threat Model
- **Backend compromise**: Only loses metadata; no funds at risk
- **Private key compromise**: User's other contracts affected, not escrow
- **Network latency**: Timeout auto-release protects freelancer
- **Hiring person refusal**: Timeout auto-release pays freelancer

## 🧪 Testing

### Run Contract Tests
```bash
cd contracts/contracts/hello-world
cargo test
```

### Manual End-to-End Test
1. Start backend: `npm run dev` in `backend/`
2. Start frontend: `npm run dev` in `frontend/`
3. Connect wallet (Freighter testnet account)
4. As hiring person:
   - Create project with testnet token & amounts
   - Accept a freelancer
5. As freelancer:
   - Apply to project
   - Wait for advance
6. Deploy contract manually (see above)
7. Set contract ID in UI
8. Complete workflow via UI

## 📚 File Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── routes.ts         # API endpoints
│   │   ├── store.ts          # In-memory project store
│   │   ├── crypto.ts         # SHA256 hashing
│   │   ├── soroban.ts        # Contract state reading
│   │   └── types.ts          # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── api.ts            # API client
│   │   ├── wallet.ts         # Freighter integration
│   │   ├── contract.ts       # Soroban invocations
│   │   ├── index.css         # Black & white styling
│   │   ├── main.tsx
│   └── index.html
│   ├── package.json
│   └── .env.example
├── contracts/
│   ├── Cargo.toml
│   └── contracts/hello-world/
│       ├── src/
│       │   ├── lib.rs        # Main contract
│       │   ├── storage.rs    # State & enums
│       │   └── test.rs       # Unit tests
│       └── Cargo.toml
└── README.md
```

## 🔧 Configuration

### Backend `.env`
```
PORT=5000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

## 🌐 Network Choices

| Network | RPC | Passphrase |
|---------|-----|-----------|
| **Testnet** (testing) | https://soroban-testnet.stellar.org | Test SDF Network ; September 2015 |
| **Futurenet** (staging) | https://soroban-futurenet.stellar.org | Test SDF Future Network ; September 2015 |
| **Public** (production) | https://mainnet.stellar.org | Public Global Stellar Network ; September 2015 |

## 📖 Development Workflow

1. **Design**: Backend enforces rules, contract holds funds
2. **Build**: Cargo for contract, Node for backend, Vite for frontend
3. **Test**: Run `cargo test`, manually test workflow
4. **Deploy**: Upload WASM to Soroban, deploy backend, deploy frontend
5. **Monitor**: Watch contract state via RPC, backend logs

## 🚨 Known Limitations

- **No admin functions**: Contract cannot be paused or upgraded
- **No slashing**: Misbehavior not penalized on-chain
- **No ratings**: No reputation system yet
- **Single delivery**: Only one deliverable per project
- **No milestones**: Full payment for full delivery only

## 🎉 Next Steps

- [ ] Add Postgres for persistent storage
- [ ] Implement project milestones
- [ ] Add freelancer reputation/ratings
- [ ] Multi-delivery projects
- [ ] Dispute resolution (voting)
- [ ] Support multiple tokens
- [ ] Production deployment guide

## 📄 License

MIT

## 👋 Support

For issues or questions, check:
- Stellar docs: https://developers.stellar.org/soroban
- Freighter issues: https://github.com/stellar/freighter
- This repo issues

---

**Built with** ❤️ **using Soroban, React, and Node.js**
