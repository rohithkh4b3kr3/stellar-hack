# Setup & Deployment Guide

## Local Development (Mac/Linux/WSL)

### Prerequisites
```bash
# 1. Install Rust & Soroban
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add wasm32-unknown-unknown

# 2. Install Node.js 18+ (if not present)
node --version  # Should be v18+

# 3. Install Freighter extension (Chrome/Firefox)
# https://www.freighter.app/
```

### Step 1: Backend Server (Terminal 1)
```bash
cd backend
cp .env.example .env          # Create config
npm install                    # Install dependencies
npm run build                  # Build TypeScript
npm start                      # Start server on :5000
```

**Output:** Server running on `http://localhost:5000`

### Step 2: Frontend Dev Server (Terminal 2)
```bash
cd frontend
cp .env.example .env          # Create config
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server
```

**Output:** App running on `http://localhost:5173`

### Step 3: Open Browser
1. Go to `http://localhost:5173`
2. Install & open Freighter wallet extension
3. Create/import a testnet account (visit https://lab.stellar.org for testnet tokens)
4. Click "Connect Wallet"
5. Choose "Login as Hiring Person" or "Login as Freelancer"

## Testing the Workflow

### As Hiring Person:
1. **Create Project**
   - Click "Post Project"
   - Fill in: Title, Description, Token ID, Total Payment, Deadline
   - Example token: `CAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4` (testnet USDC wrapped)
   - Submit

2. **Accept Freelancer**
   - Choose a freelancer from the list
   - Click "Accept"
   - You'll get instructions to deploy contract

3. **Deploy Contract** (requires Soroban CLI)
   ```bash
   # Build contract
   cd contracts
   cargo build --package hello-world --target wasm32-unknown-unknown --release
   
   # Deploy (requires your account to have testnet Lumens)
   soroban contract deploy \
     --source-account YOUR_TESTNET_ACCOUNT \
     --rpc-url https://soroban-testnet.stellar.org \
     --network-passphrase "Test SDF Network ; September 2015" \
     --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
   
   # Copy the returned Contract ID (C...)
   ```

4. **Set Contract ID**
   - Paste the Contract ID in the UI form
   - Click "Set Contract"

5. **Initialize Contract** (call init_project)
   ```bash
   soroban contract invoke \
     --id CXXXXXX... \
     --rpc-url https://soroban-testnet.stellar.org \
     --network-passphrase "Test SDF Network ; September 2015" \
     --source-account YOUR_ACCOUNT \
     -- init_project \
     --business GXXXXXX... \
     --freelancer GYYYYYY... \
     --token CZZZZZ... \
     --total-amount 1000000 \
     --advance-amount 300000 \
     --delivery-deadline 1730000000 \
     --verification-window-secs 259200
   ```

6. **Pay Advance**
   - Freelancer switches role and starts work
   - You see the 402 payment required message
   - Use Freighter: Send 300000 to the contract
   - Call: `contract.deposit_advance(business)` via Soroban CLI

7. **Approve Delivery**
   - Freelancer submits work
   - Call: `contract.approve_delivery(business)` via Soroban CLI

### As Freelancer:
1. **Apply to Project**
   - See available projects
   - Click "Apply"

2. **Work & Submit**
   - Wait for hiring person to pay advance
   - When "Ready to Work" appears, upload deliverable
   - Click "Submit"
   - Copy the hash

3. **Submit to Contract**
   ```bash
   soroban contract invoke \
     --id CXXXXXX... \
     --rpc-url https://soroban-testnet.stellar.org \
     --network-passphrase "Test SDF Network ; September 2015" \
     --source-account YOUR_ACCOUNT \
     -- submit_delivery \
     --freelancer GYYYYYY... \
     --deliverable-hash XXXXXXXX...
   ```

4. **Get Paid**
   - Wait for approval or 3-day timeout
   - Payment auto-released to your wallet

## Production Deployment

### Backend (Node.js Hosting)
```bash
# Build
npm run build

# Deploy to your server
# Environment variables:
# - PORT: Server port
# - SOROBAN_RPC_URL: Production RPC endpoint
# - SOROBAN_NETWORK_PASSPHRASE: Public network passphrase

# For Vercel / Railway / Render:
npm start
```

### Frontend (Static Hosting)
```bash
# Build
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify  
# - Google Cloud Storage
# - AWS S3 + CloudFront
# - Your web server
```

### Contract (Mainnet)
```bash
# Change network to Public Stellar Network
cargo build --package hello-world --target wasm32-unknown-unknown --release

soroban contract deploy \
  --source-account YOUR_MAINNET_ACCOUNT \
  --rpc-url https://mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

## Troubleshooting

### "Freighter not available"
- Install Freighter extension
- Reload page
- Check if extension is enabled

### 402 not appearing
- Refresh page
- Check contract ID is set
- Verify contract is initialized with init_project

### Contract calls fail
- Check account has testnet lumens (lab.stellar.org)
- Verify token ID is correct
- Ensure amounts match (30% for advance)

### Backend not connecting
- Check SOROBAN_RPC_URL in .env
- Verify network passphrase matches

### File hash mismatch
- Use same file for upload & contract
- Hash is SHA-256 of file contents

## Architecture Overview

```
Frontend (React)
  └─ API calls → Backend → Response (402 or JSON)
  └─ Contract calls → Soroban RPC → Tx signed by Freighter

Backend (Node.js)
  └─ Metadata store (in-memory for demo, use DB for prod)
  └─ Route handlers for project CRUD
  └─ HTTP 402 enforcement
  └─ Deliverable hashing

Soroban Contract (Rust)
  └─ Escrow state machine
  └─ Token transfers
  └─ Timeout-based auto-release
  └─ Refund logic
```

## Security Checklist

- [ ] Backend never holds funds in production
- [ ] Contract is immutable after deployment
- [ ] Use environment-specific configs (.env files)
- [ ] Verify contract is deployed on correct network
- [ ] Test with small amounts first
- [ ] Audit contract before mainnet deployment
- [ ] Use testnet for development/staging

---

**Ready to launch?** 🚀

1. ✅ Backend running on :5000
2. ✅ Frontend running on :5173  
3. ✅ Freighter connected
4. ✅ Contract deployed (testnet)
5. ✅ Create a test project
6. ✅ Complete one workflow end-to-end

Then deploy to production!
