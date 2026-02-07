# Quick Reference Card

## 🚀 Quick Start (Copy & Paste)

### Terminal 1: Backend
```bash
cd backend && npm install && npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend && npm install && npm run dev
```

### Then
1. Open http://localhost:5173
2. Install Freighter wallet
3. Create account on Stellar testnet
4. Connect wallet in app
5. Start creating/applying to projects

## 🔗 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Stellar Testnet | https://stellar.expert/explorer/testnet |
| Soroban RPC | https://soroban-testnet.stellar.org |
| Testnet Faucet | https://lab.stellar.org |

## 📡 API Endpoints

```bash
# List projects
curl http://localhost:5000/projects

# Create project
curl -X POST http://localhost:5000/project/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessAddress": "GXXXXXX",
    "tokenId": "CXXXXXX",
    "title": "Logo Design",
    "description": "...",
    "totalAmount": "1000000",
    "deliveryDeadlineTs": 1730000000
  }'

# Get project
curl http://localhost:5000/project/PROJECT_ID

# Apply
curl -X POST http://localhost:5000/project/PROJECT_ID/apply \
  -H "Content-Type: application/json" \
  -d '{"freelancerAddress": "GYYYYYY"}'

# Accept freelancer
curl -X POST http://localhost:5000/project/PROJECT_ID/accept \
  -H "Content-Type: application/json" \
  -d '{"freelancerAddress": "GYYYYYY"}'

# Set contract
curl -X POST http://localhost:5000/project/PROJECT_ID/set-contract \
  -H "Content-Type: application/json" \
  -d '{"contractId": "CZZZZZ"}'

# Check if advance paid (returns 402 if not)
curl http://localhost:5000/project/PROJECT_ID/start

# Hash deliverable
curl -X POST http://localhost:5000/project/PROJECT_ID/submit \
  -F "deliverable=@file.pdf"
```

## 🔨 Build Commands

```bash
# Backend
cd backend
npm install          # Install deps
npm run build        # Build TypeScript
npm start            # Run built version
npm run dev          # Run with hot reload

# Frontend  
cd frontend
npm install          # Install deps
npm run build        # Build for production
npm run dev          # Dev server (Vite)
npm run preview      # Preview production build
npm run lint         # Check code

# Contract
cd contracts
cargo build --release --package hello-world
cargo test --package hello-world
```

## 🌐 Soroban Commands

```bash
# Build contract
cd contracts
cargo build --package hello-world --target wasm32-unknown-unknown --release

# Deploy contract
soroban contract deploy \
  --source-account YOUR_ACCOUNT \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm

# Initialize project
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_ACCOUNT \
  -- init_project \
  --business GBUS... \
  --freelancer GFREE... \
  --token CTOKEN... \
  --total-amount 1000000 \
  --advance-amount 300000 \
  --delivery-deadline 1730000000 \
  --verification-window-secs 259200

# Deposit advance
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_ACCOUNT \
  -- deposit_advance \
  --business GBUS...

# Submit delivery
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_ACCOUNT \
  -- submit_delivery \
  --freelancer GFREE... \
  --deliverable-hash 0x...

# Approve delivery
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_ACCOUNT \
  -- approve_delivery \
  --business GBUS...

# Read project state
soroban contract invoke \
  --id CONTRACT_ID \
  -- get_project | jq

# Read escrow balance
soroban contract invoke \
  --id CONTRACT_ID \
  -- get_escrow_balance | jq
```

## 🔑 Key Concepts

| Term | Meaning |
|------|---------|
| **x402** | HTTP 402 Payment Required status code |
| **Escrow** | Contract holds funds; releases on conditions |
| **Advance** | 30% upfront payment (locked when deposited) |
| **Delivery Hash** | SHA-256 hash of deliverable file |
| **Timeout** | 3-day auto-release if not approved by business |
| **Refund** | Advance returned if freelancer misses deadline |

## 📊 State Machine

```
Created → AdvanceDeposited → DeliverySubmitted → Completed
                                  ↓
                            (3-day timeout)
                                  ↓
                       auto_release_if_timeout()

Created → AdvanceDeposited → (deadline passes)
                                  ↓
                      refund_if_deadline_missed()
                                  ↓
                               Refunded
```

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Freighter not available" | Install extension, reload page |
| Port 5000 in use | Change PORT in backend/.env |
| 402 not showing | Refresh page, check contract ID |
| Contract calls fail | Verify testnet Lumens balance → lab.stellar.org |
| Hash mismatch | Use same file, check SHA-256 tool online |
| RPC timeout | Check network, try different RPC endpoint |

## 🔐 Environment Variables

### Backend
```
PORT=5000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Frontend
```
VITE_API_URL=http://localhost:5000
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `backend/src/routes.ts` | All API endpoints |
| `backend/src/soroban.ts` | Contract interaction |
| `frontend/src/App.tsx` | Main app component |
| `frontend/src/contract.ts` | Contract helpers |
| `contracts/*/src/lib.rs` | Smart contract |

## 🧪 Test URLs

```bash
# Get all projects
curl http://localhost:5000/projects | jq

# Create dummy project
curl -X POST http://localhost:5000/project/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessAddress":"GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "tokenId":"CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "title":"Test Project",
    "description":"Test Description",
    "totalAmount":"100000",
    "deliveryDeadlineTs":1800000000
  }' | jq .id -r

# Save ID as variable
PID=$(curl -s http://localhost:5000/projects | jq -r '.[0].id')

# Get project details
curl http://localhost:5000/project/$PID | jq
```

## 🎯 Workflow (Step-by-Step)

### Hiring Person
1. Create project (title, description, amount, deadline)
2. Share project ID with freelancer
3. Accept freelancer when they apply
4. Deploy Soroban contract with freelancer address
5. Set contract ID in UI
6. Transfer 30% to contract + call `deposit_advance()`
7. Wait for delivery submission
8. Approve delivery → funds released OR wait 3 days

### Freelancer
1. Browse projects
2. Apply to project
3. Wait for acceptance notification
4. Check project → see "Request start" button
5. Start work when advance is locked
6. Upload deliverable
7. Copy hash → call `submit_delivery(hash)`
8. Wait for approval or 3-day timeout
9. Check wallet for payment

## 📞 Support Resources

- **Stellar Docs**: https://developers.stellar.org
- **Soroban Docs**: https://developers.stellar.org/soroban
- **Freighter**: https://www.freighter.app
- **Testnet**: https://stellar.expert/explorer/testnet
- **Lab**: https://lab.stellar.org

---

**Pro Tip:** Keep this card handy when developing! 🚀
