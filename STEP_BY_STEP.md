# 📋 DEPLOYMENT CHECKLIST & STEP-BY-STEP GUIDE

## Getting Started

Before you start, you need:
- ✅ Node.js 18+
- ✅ Rust + wasm32-unknown-unknown
- ✅ Stellar CLI
- ✅ Freighter wallet browser extension
- ✅ Stellar Testnet account with 20+ XLM
- ✅ A terminal/command line

---

## PHASE 1: PREPARATION (5 mins)

### Step 1.1: Setup Stellar Account
- [ ] Open https://stellar.org/developers/enabled-tooling/testnet-details/
- [ ] Click "Fund your account" 
- [ ] Enter your Stellar public key (get from Freighter)
- [ ] Copy your public key somewhere safe

**Example public key**: `GBTMK5QPBUUKUVRNCWAX2NNMVEXFTJXQQZN6WQ53AOQK6Z2PCVMY6G3X`

### Step 1.2: Setup Freighter
- [ ] Open Freighter extension (top right of browser)
- [ ] Click "Settings" (gear icon)
- [ ] Set Network to **"Testnet"** (IMPORTANT!)
- [ ] Verify you have 20+ XLM balance

### Step 1.3: Clone & Navigate
```bash
# Navigate to project folder
cd "path/to/StellarHack"

# Verify structure
ls -la frontend backend stellar-contract
```

---

## PHASE 2: CONTRACT DEPLOYMENT (10 mins)

### Step 2.1: Build Contract WASM
```bash
cd stellar-contract/soroban-hello-world

# Build release version
cargo build --release --target wasm32-unknown-unknown

# Verify WASM exists (should be 19KB)
ls -lh target/wasm32-unknown-unknown/release/hello_world.wasm
```

**Expected Output**:
```
-rwxr-xr-x 1 user group 19K Feb 7 19:19 hello_world.wasm
```

### Step 2.2: Deploy to Testnet
```bash
# Set your public key
export YOUR_KEY="GBTMK5..."  # Replace with your actual key

# Navigate to contract directory
cd stellar-contract/soroban-hello-world

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source $YOUR_KEY \
  --network testnet
```

**Expected Output**:
```
Contract ID: CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A
```

### Step 2.3: Save Contract ID
```bash
# Save for next steps
CONTRACT_ID="CAQNR..."  # Your contract ID from above
echo $CONTRACT_ID  # Verify it's saved
```

✅ **Phase 2 Complete**: Contract is now live on testnet!

---

## PHASE 3: BACKEND SETUP (5 mins)

### Step 3.1: Navigate & Create .env
```bash
cd backend

# Create .env file (replace CONTRACT_ID with yours!)
cat > .env << 'EOF'
PORT=5000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ESCROW_CONTRACT_ID=CAQNR...PASTE_YOUR_CONTRACT_ID_HERE...
XLM_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
EOF

# Verify it was created
cat .env
```

### Step 3.2: Install & Build
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify no errors (should print "No errors found")
npx tsc --noEmit
```

### Step 3.3: Start Backend
```bash
# Start development server
npm run dev

# Should print:
# Server running on http://localhost:5000
```

**Keep this terminal running!**

### Step 3.4: Test Backend
In **NEW TERMINAL**:
```bash
# Test the API
curl http://localhost:5000/

# Should return endpoints list
```

✅ **Phase 3 Complete**: Backend is running!

---

## PHASE 4: FRONTEND SETUP (5 mins)

### Step 4.1: Navigate & Create .env.local
```bash
# In NEW TERMINAL (don't close the backend one!)
cd frontend

# Create .env.local
cat > .env.local << 'EOF'
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_API_URL=http://localhost:5000
EOF

# Verify
cat .env.local
```

### Step 4.2: Install & Verify
```bash
# Install dependencies
npm install

# Check for TypeScript errors
npx tsc --noEmit
# Should print nothing (no errors)
```

### Step 4.3: Start Frontend
```bash
# Start dev server
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
```

**Keep this terminal running!**

✅ **Phase 4 Complete**: Frontend is running!

---

## PHASE 5: MANUAL TESTING (10 mins)

### Step 5.1: Open the Application
- [ ] Open browser to **http://localhost:5173**
- [ ] Should see landing page with "Connect Wallet" button

### Step 5.2: Connect Wallet
- [ ] Click "Connect Wallet"
- [ ] Freighter popup appears
- [ ] Click "Approve"
- [ ] Should see your public key at top
- [ ] Should show your XLM balance

### Step 5.3: Create a Project
- [ ] Click "Create Project"
- [ ] Verify Contract Deployed section shows your CONTRACT_ID
- [ ] If not, click "Set Contract ID" and paste it
- [ ] Fill form:
  - [ ] Title: "Logo Design"
  - [ ] Description: "Design our logo"
  - [ ] Total Amount: "100"
  - [ ] Deadline: (select 7 days from now)
- [ ] Click "Create"
- [ ] Should see new project in the list

### Step 5.4: Switch to Freelancer Account (Optional)
- [ ] In Freighter, create a new test account OR
- [ ] Open incognito browser tab with different wallet

### Step 5.5: Apply to Project (as Freelancer)
- [ ] Navigate to your project
- [ ] Click "Apply"
- [ ] Should be added to applicants

### Step 5.6: Accept Freelancer
- [ ] Switch back to main account
- [ ] Go to project
- [ ] Click "Accept" on freelancer
- [ ] "Create Escrow" button should appear

### Step 5.7: Fund via Create Escrow ⭐ **CRITICAL**
- [ ] Click "Create Escrow"
- [ ] Modal shows transaction details:
  - Client: (your address)
  - Freelancer: (freelancer address)
  - Amount: 100 XLM
  - Deadline: (your deadline)
- [ ] Click "Pay"
- [ ] Freighter popup: "Approve transfer from your account"
- [ ] Click "Approve" (if prompted)
- [ ] Freighter popup: "Sign transaction"
- [ ] Click "Sign"
- [ ] **WAIT 10-30 seconds** for blockchain confirmation
- [ ] Modal should close
- [ ] Status should show "Ready" ✅

### Step 5.8: Complete Job (as Hiring Person)
- [ ] Scroll to "Actions" section
- [ ] Click "Complete Job"
- [ ] Freighter: "Sign transaction"
- [ ] Click "Sign"
- [ ] **WAIT 10-30 seconds**
- [ ] Status should show "Completed" ✅

### Step 5.9: Verify Payment (as Freelancer)
- [ ] Check Freighter account balance
- [ ] Should have increased by ~100 XLM (minus gas fee)
- [ ] ✅ Payment received!

---

## ✅ SUCCESS CHECKLIST

If you got here, everything works! Verify:

- [x] Backend running on localhost:5000
- [x] Frontend running on localhost:5173
- [x] Contract deployed to testnet
- [x] Project created
- [x] Freelancer applied & accepted
- [x] Escrow funded (payment transferred)
- [x] Job completed
- [x] Freelancer received payment

**🎉 CONGRATULATIONS! The system is fully functional!**

---

## 🧪 Optional: Test Other Scenarios

### Test Scenario: Cancel Within 6h
1. Create new project
2. Fund escrow
3. Within 6 hours:
   - [ ] Click "Cancel Job"
   - [ ] Freighter: Sign
   - [ ] Status: Should show "Cancelled"
   - [ ] Your XLM should be refunded

### Test Scenario: Late Delivery Penalty
1. Create project with deadline 1 hour from now
2. Fund escrow
3. Wait past deadline
4. Then complete job
5. Freelancer should receive ~95% (5% penalty)

### Test Scenario: Missed Deadline Refund
1. Create project with deadline 1 hour from now
2. Fund escrow
3. Wait past deadline
4. Freelancer doesn't deliver
5. After hard deadline (7 days later in contract):
   - Anyone can call "claim refund"
   - Hiring person gets 100% refund

---

## 🐛 TROUBLESHOOTING

### Issue: "Contract ID not found"
**Solution**:
1. Verify CONTRACT_ID in `backend/.env`
2. Verify it matches what you deployed
3. Verify it starts with "C..."
4. Restart backend: `npm run dev`

### Issue: "Network Passphrase mismatch"
**Solution**:
1. Check Freighter is on **Testnet** (not Mainnet!)
2. Verify `.env` and `.env.local` files have correct passphrase
3. Refresh frontend page

### Issue: "Insufficient balance" when funding
**Solution**:
1. Check Freighter shows 20+ XLM
2. Go to https://stellar.expert/explorer/testnet/account/{YOUR_KEY}
3. Click "Fund" button if needed
4. Wait 10 seconds and refresh

### Issue: "Transaction timeout"
**Solution**:
1. Wait a minute and try again
2. Check network status: `curl https://soroban-testnet.stellar.org`
3. Testnet might be busy or reset

### Issue: Frontend shows 404
**Solution**:
1. Verify backend is running: `curl http://localhost:5000/`
2. Check frontend `.env.local` has `VITE_API_URL=http://localhost:5000`
3. Refresh frontend page

---

## 📱 TERMINAL SUMMARY

You should have **3 terminals running**:

**Terminal 1 - Backend**:
```
/StellarHack/backend$ npm run dev
Server running on http://localhost:5000
```

**Terminal 2 - Frontend**:
```
/StellarHack/frontend$ npm run dev
➜  Local: http://localhost:5173/
```

**Terminal 3 - Commands** (for troubleshooting/checking):
```
/StellarHack$ curl http://localhost:5000/projects
```

---

## 📊 SUMMARY STATISTICS

After successful deployment:

```
Components Running:
├── ✅ Smart Contract (Soroban) on Testnet
├── ✅ Backend API (Node.js) on localhost:5000
├── ✅ Frontend (React) on localhost:5173
└── ✅ Freighter Wallet (Browser Extension)

Transactions Processed:
├── 1x create_escrow() - Funded job
├── 1x complete_job() - Paid freelancer
└── (Optional) client_cancel_within_6h() or claim_refund_after_hard_deadline()

Total XLM Moved:
├── Escrow creation: ~100 XLM transferred
├── Gas fees: ~1-5 XLM (stroops)
└── Freelancer received: ~95-99 XLM
```

---

## 🎯 NEXT STEPS

After successful testing:

1. **Review Code**
   - Read `frontend/src/contract.ts` - How frontend calls contract
   - Read `backend/src/routes.ts` - How backend APIs work
   - Read `stellar-contract/contracts/hello-world/src/lib.rs` - Smart contract logic

2. **Run More Scenarios**
   - Test with multiple projects
   - Test penalty calculation
   - Test early cancellation

3. **Deploy to Mainnet** (When Ready)
   - Change network in all configs
   - Use mainnet XLM
   - Go live!

4. **Enhance Features**
   - Add more token options
   - Implement dispute resolution
   - Add webhook notifications
   - Query historical data

---

## 📞 SUPPORT

If stuck:
1. Check **QUICKSTART.md** for commands reference
2. Check **INTEGRATION_SUMMARY.md** for architecture
3. Check browser console (F12) for frontend errors
4. Check terminal output for backend errors
5. Verify all 3 services are running

---

**Ready? Start at [PHASE 1](#phase-1-preparation-5-mins)!** 🚀

