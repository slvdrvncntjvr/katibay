# Katibay

> Community-vouched on-chain identity for urban poor Filipinos — your community
> knows who you are. Now the blockchain does too.

## Live Demo

🌐 **Frontend**: Deploy via Vercel (see below)
📋 **Contract ID**: `CCOHJDMEKNJPMMPMXZH7B2IYCWDZSHBB4WYBEN3VAHK67CJWBUN5GQT3`
🔍 **Explorer**: [View on Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet/contract/CCOHJDMEKNJPMMPMXZH7B2IYCWDZSHBB4WYBEN3VAHK67CJWBUN5GQT3)

---

## Problem

A Grade 12 student in Tondo cannot apply for a CHED scholarship because she has no valid government ID —
trapped in the Philippine ID loop where every document requires another document.

## Solution

Katibay uses Stellar Soroban smart contracts to let trusted community members (barangay official, teacher,
neighbors) co-sign a student's identity on-chain. Once 3 vouches are recorded, the contract mints a KTBY
credential token — permanently recorded on a ledger no one can delete.

---

## Repository Structure

```
katibay/
├── Cargo.toml          ← Soroban smart contract (Rust)
├── src/
│   ├── lib.rs          ← Contract logic
│   └── test.rs         ← 5 tests (all passing)
├── frontend/           ← Next.js React frontend
│   ├── src/
│   │   ├── app/        ← Next.js App Router pages
│   │   └── hooks/      ← KatibayContext (Stellar SDK + Freighter)
│   └── .env.local      ← Testnet config (NEXT_PUBLIC_ vars, safe to commit)
├── vercel.json         ← Vercel deployment config
├── DEPLOY.md           ← Step-by-step deployment runbook
└── README.md
```

---

## Smart Contract

**Language**: Rust (`no_std`) · **Framework**: `soroban-sdk v21.7.7` · **Target**: `wasm32-unknown-unknown`

### Contract Functions

| Function | Description |
|---|---|
| `initialize(admin)` | Sets admin, prevents re-init |
| `vouch_for(voucher, student, name_hash)` | Community member vouches — emits event |
| `check_verified(student)` | Returns `true` if vouch_count ≥ 3 |
| `issue_credential(student, token_address)` | Admin mints 1 KTBY token to verified student |
| `apply_scholarship(student, school_id)` | Verified student applies for a school slot on-chain |
| `get_identity(student)` | Read-only view of full IdentityRecord |

### Run Tests

```bash
cargo test
```

Expected output:
```
test tests::test_happy_path_full_flow ... ok
test tests::test_double_vouch_rejected ... ok
test tests::test_storage_state_reflects_vouch_count ... ok
test tests::test_issue_credential_twice_rejected ... ok
test tests::test_name_hash_mismatch_rejected ... ok
```

### Build & Deploy Contract

```bash
# Build
stellar contract build

# Deploy
stellar keys generate --global my-key --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/katibay.wasm \
  --source my-key \
  --network testnet
```

---

## Frontend (Next.js)

### Local Development

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Vercel Deployment

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Repository**
3. Vercel will auto-detect `vercel.json` and set Root Directory to `frontend/`
4. Click **Deploy** — no additional environment variable setup needed
   - All config is in `frontend/.env.local` (already tracked in git)

> **Requirements**: Install the [Freighter browser extension](https://www.freighter.app/) and set it to **Testnet** mode.

---

## Stellar Features Used

| Feature | Role |
|---|---|
| **Soroban smart contracts** | Multi-sig vouching, threshold enforcement, credential issuance |
| **Custom tokens** | KTBY — credential token minted to verified students |
| **Trustlines** | Student establishes trustline to receive KTBY |
| **XLM transfers** | Scholarship disbursement to verified wallets |

---

## License

MIT License — Copyright (c) 2026 Salvador Vincent Javier
