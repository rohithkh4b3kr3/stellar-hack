# Native XLM Handling

## Why Native XLM Is Special

Stellar requires a **minimum reserve** on every account. Native XLM transfers can **trap** (UnreachableCodeReached) if:

1. Balance would drop below reserve (1 XLM)
2. Amount is too small (below ~2 XLM can cause precision/reserve issues)

## Rules Enforced

| Rule | Value | Reason |
|------|-------|--------|
| Reserve | 1 XLM (10,000,000 stroops) | Stellar base reserve × 2 for minimal account |
| Min escrow | 2 XLM (20,000,000 stroops) | Avoids traps; keeps balance above reserve after transfer |
| Contract MIN_AMOUNT | 1,000 stroops | Contract validation |

## Frontend Logic

1. **Detect native XLM** – Compare `tokenId` with `VITE_XLM_TOKEN_ID` (testnet: CDLZFC3...).

2. **Fetch spendable balance** – Call token contract `balance(address)` via simulate, then:
   - `maxSpendable = balance - 10_000_000` (reserve)

3. **Validate before Pay**:
   - `amount <= maxSpendable`
   - `amount >= 20_000_000` (for native XLM)

4. **Disable Pay button** when:
   - Insufficient spendable balance
   - Amount below 2 XLM
   - Transaction pending

5. **Preflight** – `preflightCreateEscrow()` validates amount, deadline, and spendable balance before signing.

## Error Mapping

| Source | UI Message |
|--------|------------|
| UnreachableCodeReached + native | Insufficient spendable XLM (reserve rule). Keep at least 1 XLM reserve and escrow at least 2 XLM. |
| AmountTooSmall (1) | Amount below minimum escrow value |
| DeadlineInPast (2) | Deadline must be in the future |
| Auth failure | Wallet authorization required |

## Non-Native Tokens

For custom tokens: skip reserve logic. `maxSpendable = balance`. Min amount = contract MIN_AMOUNT (1,000).

## Backend Preflight

`POST /preflight/escrow` – Simulates `create_escrow` (no signing). Returns `{ ok, error? }` for failure reasons.
