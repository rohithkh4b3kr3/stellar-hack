# How to run gigX (StellarHack)

## Prerequisites

- **Node.js** 18+
- **Freighter** browser extension (Stellar wallet)
- Optional: **Rust** + **Stellar CLI** (only if you build/deploy the contract yourself)

---

## 1. Backend

```bash
cd backend
npm install
npm run dev
```

- Runs at **http://localhost:5000**
- Optional: copy `.env.example` to `.env` and set `PORT`, `SOROBAN_RPC_URL`, `SOROBAN_NETWORK_PASSPHRASE` if you need to change them.

---

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- Runs at **http://localhost:5173**
- Optional: create `frontend/.env` with `VITE_API_URL=http://localhost:5000` (and Soroban URLs if not using defaults).

---

## 3. Use the app

1. Install **Freighter** and create/import a **Stellar testnet** account.
2. Open **http://localhost:5173**.
3. Click **Connect Wallet**, then choose **Hiring** or **Freelancer**.
4. **Hiring:** Create project → wait for applicants → Accept freelancer → set contract ID → Pay full amount (Actions tab) → later: Approve & pay or Cancel & refund.
5. **Freelancer:** Search/Home → open project → **Apply to this project** → wait for payment → work and deliver.

---

## How to check the application (end-to-end)

1. **Start backend and frontend** (two terminals):
   ```bash
   # Terminal 1
   cd backend && npm install && npm run dev

   # Terminal 2
   cd frontend && npm install && npm run dev
   ```
2. **Open** http://localhost:5173 and install **Freighter** with a **testnet** account if needed.
3. **Connect** → choose **Hiring** (or **Freelancer** for the other role).
4. **As Hiring:**
   - **Create Project** → fill title, description. Under token: enter **Asset code** (e.g. USDC) and **Issuer** (your wallet address), click **Generate token contract ID** → then **Token ID** is filled. Set amount and deadline → **Create Project**.
   - Open the project → **Applicants** tab (or wait for an applicant). **Accept** a freelancer (use a second wallet as freelancer to apply first if testing alone).
   - Open the project again → **Actions** tab. If backend has `ESCROW_CONTRACT_ID` set, it's auto-injected. Otherwise paste your deployed contract ID (e.g. `CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A`) → **Set contract ID**.
   - **Step 3a:** **Approve $X** (sign in Freighter). **Step 3b:** **Pay $X to escrow** (sign). After that you should see “Delivery & payouts” with **Approve delivery**, and (within 6h) **Cancel within 6h**.
   - Use **Refresh Status** to reload; after funding, **Cancel within 6h** or **Approve delivery** or (after hard deadline) **Claim refund** as needed.
5. **As Freelancer:** Connect with another wallet → **Search** or **Home** → open project → **Apply to this project**. After client funds escrow, the project shows “Ready to Work” with the deadline rules.
6. **Quick sanity checks:** Backend health: http://localhost:5000 → JSON with endpoints. Frontend: no console errors; wallet connects; projects list loads; opening a project shows Overview and Actions.

---

## 4. Contract (stellar-contract) – optional

If you want to **build and deploy** the escrow contract yourself:

### Rust + Stellar CLI

- Install Rust: https://rustup.rs  
- Install Stellar CLI: https://developers.stellar.org/docs/tools/developer-tools

### Build (required before deploy)

Run from the **contract** directory so the WASM is created:

```bash
cd stellar-contract/soroban-hello-world/contracts/hello-world
stellar contract build
```

The WASM is written to: `target/wasm32v1-none/release/hello_world.wasm` (note **wasm32v1-none**, not wasm32-unknown-unknown).

### Test

```bash
cd stellar-contract/soroban-hello-world/contracts/hello-world
cargo test
```

### Deploy (testnet)

From the **same** directory (contracts/hello-world) after building:

```bash
cd stellar-contract/soroban-hello-world/contracts/hello-world
stellar contract deploy --wasm target/wasm32v1-none/release/hello_world.wasm --source-account YOUR_ACCOUNT --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015"
```

Or from the workspace root, use the full path to the WASM:

```bash
cd stellar-contract/soroban-hello-world
stellar contract deploy --wasm contracts/hello-world/target/wasm32v1-none/release/hello_world.wasm --source-account YOUR_ACCOUNT --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015"
```

Replace `YOUR_ACCOUNT` with your Stellar CLI identity (e.g. a key name from `stellar keys list` or a secret key).

**Example deployed contract ID (testnet):**  
`CAQNRCALOAYJ7QDDSZXKW5GKMJLIQ24OAOWG7FNEY2G77OVGXV6JGA4A`  
Use this in `ESCROW_CONTRACT_ID` in backend `.env` (or Set contract ID per project in Actions tab).

---

## After you deploy the contract

1. **Copy the contract ID** – The deploy command prints it (starts with `C...`). Copy it.
2. **Open the app** – Backend and frontend running, Freighter connected as **Hiring**.
3. **Open your project** – One where you’ve already **accepted a freelancer**.
4. **Actions tab** – You’ll see **Step 2: Set deployed contract ID**. Paste the contract ID and click **Set contract ID**.
5. **Step 3** – **Approve token** first, then **Pay full amount** to escrow (client escrows full amount, not advance).
6. **After funding:** Client can **Cancel within 6h** for full refund. Or **Approve delivery** to pay freelancer (full if on time; 5% per day deducted after soft deadline). After **hard deadline** (soft + 7 days), client can **Claim refund** if freelancer did not deliver.

Use the returned **contract ID** in the app when you “set contract” on a project (Step 2).

---

## Quick reference

| What        | Command              | URL                      |
|------------|----------------------|--------------------------|
| Backend    | `cd backend && npm run dev`  | http://localhost:5000   |
| Frontend   | `cd frontend && npm run dev` | http://localhost:5173  |
| Contract   | `cd stellar-contract/soroban-hello-world && stellar contract build` | — |

Data is stored **in memory** in the backend (resets on restart). For production you’d add a database.
