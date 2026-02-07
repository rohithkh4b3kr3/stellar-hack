# FreelanceContract Migration

The app now uses the **FreelanceContract** smart contract with this flow:

## Contract Flow

1. **create_escrow(client, freelancer, token, amount, soft_deadline)** → `u64 job_id`
   - Client pays full amount in one tx
   - Returns job_id (used for all later calls)

2. **complete_job(job_id)** – Client approves delivery
   - On time: freelancer gets 100%
   - Late: 5% per day penalty (client gets that back)
   - Hard deadline: must complete before soft_deadline + 7 days

3. **client_cancel_within_6h(job_id)** – Client cancels within 6h of funding

4. **claim_refund_after_hard_deadline(job_id)** – Client claims refund if freelancer didn't deliver

---

## Next Steps

### 1. Rebuild & Redeploy Contract

```bash
cd stellar-contract/soroban-hello-world
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --source-account testnet-deployer \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 2. Update Backend `.env`

Set the new contract ID:

```
ESCROW_CONTRACT_ID=<deployed_contract_id>
```

### 3. PostgreSQL Migration (if using DATABASE_URL)

Add the `job_id` column:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS job_id BIGINT;
```

### 4. Restart Backend & Frontend

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### 5. Create New Projects

Create a new project and accept a freelancer. Use **Pay Full Amount (create escrow)** – funds transfer in one tx, and the returned `job_id` is stored.

---

## Flow Summary

| Step | Client | Freelancer |
|------|--------|------------|
| 1 | Create project | Apply |
| 2 | Accept freelancer | — |
| 3 | **Pay Full Amount** (create_escrow) | — |
| 4 | Complete Job (when delivered) OR Cancel within 6h OR Claim Refund (after hard deadline) | Deliver work |
