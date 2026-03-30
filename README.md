# 🪪 Katibay — Community-Vouched On-Chain Identity

> **Your community knows who you are. Now the blockchain does too.**

**Katibay** is a full-stack decentralized application (dApp) built on the Stellar blockchain using Soroban smart contracts. It solves a real, documented problem in the Philippines: urban poor students who cannot access CHED scholarships because they are trapped in the **Philippine ID loop** — where every document requires another document.

---

## 🌐 Live Deployment

| | Link |
|---|---|
| **Frontend (Vercel)** | https://katibay.vercel.app |
| **Smart Contract (Testnet)** | `CCOHJDMEKNJPMMPMXZH7B2IYCWDZSHBB4WYBEN3VAHK67CJWBUN5GQT3` |
| **Stellar Expert Explorer** | [View Contract on Testnet](https://stellar.expert/explorer/testnet/contract/CCOHJDMEKNJPMMPMXZH7B2IYCWDZSHBB4WYBEN3VAHK67CJWBUN5GQT3) |

---

## 🇵🇭 The Problem

Maria is 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship — but the application requires a valid government ID.

She doesn't have one. Her family never had the documents to register her properly. She tries to get a PhilSys card. PhilSys asks for a supporting document. The barangay says they'll issue a certification — but the captain is busy, the secretary lost the logbook, and her neighbor who could vouch for her has no official standing.

**She misses the deadline.**

This is the Philippine ID loop: **you need an ID to get an ID.** Every record is paper. Every paper can be lost, burned, or quietly shelved by someone with something to gain.

---

## 💡 The Solution

Katibay puts community trust on Stellar's immutable ledger. Trusted members — a barangay captain, a teacher, a neighbor — digitally co-sign a student's identity on-chain. Once **3 vouches** are recorded, the Soroban contract automatically issues a tamper-proof **KTBY credential token** to the student's Stellar wallet.

That token unlocks scholarship applications. Permanently. On a ledger no politician can delete and no fire can burn.

---

## ✅ Full-Stack Overview

This project qualifies as a **full-stack dApp** with both a deployed smart contract and a production frontend:

| Layer | Technology | Status |
|---|---|---|
| **Smart Contract** | Rust · Soroban SDK v21.7.7 · WASM | ✅ Deployed on Stellar Testnet |
| **Frontend** | Next.js 16 · React · TypeScript | ✅ Deployed on Vercel |
| **Wallet Integration** | Freighter · `@stellar/freighter-api` | ✅ Live |
| **Blockchain SDK** | `@stellar/stellar-sdk` | ✅ Live |

---

## 📋 Smart Contract — Deployed on Testnet

**Contract ID:** `CCOHJDMEKNJPMMPMXZH7B2IYCWDZSHBB4WYBEN3VAHK67CJWBUN5GQT3`
**Network:** Stellar Testnet
**WASM Hash:** `9055cb59f25c1fa7dc24f6b37890d960aa4d4da512ed7f9f16c91bcde72dc3764`

### Contract Functions

| Function | Description |
|---|---|
| `initialize(admin)` | Sets up the contract with an admin address. Can only be called once. |
| `vouch_for(voucher, student, name_hash)` | A community member vouches for a student on-chain. Prevents double-vouching. Emits an immutable event. |
| `check_verified(student)` | Returns `true` if the student has received ≥ 3 vouches. Read-only. |
| `issue_credential(student, token_address)` | Admin mints 1 KTBY credential token to a verified student's wallet. |
| `apply_scholarship(student, school_id)` | Verified student applies for a scholarship slot on-chain. |
| `get_identity(student)` | Returns the full `IdentityRecord` for a student. Read-only. |

### Data Stored On-Chain

```rust
struct IdentityRecord {
    student: Address,
    name_hash: BytesN<32>,   // SHA-256 of student's full name (privacy-preserving)
    vouch_count: u32,
    verified: bool,
    scholarship_slot: Option<u32>,
}
```

---

## 🧪 Tests

All 5 tests pass:

```bash
cargo test
```

```
test tests::test_happy_path_full_flow             ... ok
test tests::test_double_vouch_rejected            ... ok
test tests::test_storage_state_reflects_vouch_count ... ok
test tests::test_issue_credential_twice_rejected  ... ok
test tests::test_name_hash_mismatch_rejected      ... ok

test result: ok. 5 passed; 0 failed
```

**Test coverage:**
- ✅ Full happy-path: 3 vouches → verified → credential issued → scholarship applied
- ✅ Double-vouch rejected (same voucher cannot vouch twice for the same student)
- ✅ Insufficient vouch count returns `false` from `check_verified`
- ✅ Duplicate credential issuance rejected
- ✅ Name hash mismatch rejected

---

## 🛠 Setup & Local Development

### Prerequisites

- [Rust + Cargo](https://rustup.rs/)
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli)
- [Node.js 18+](https://nodejs.org/)
- [Freighter Wallet](https://www.freighter.app/) browser extension (set to **Testnet**)

### Clone the Repository

```bash
git clone https://github.com/slvdrvncntjvr/katibay.git
cd katibay
```

### Run the Smart Contract Tests

```bash
cargo test
```

### Build the Smart Contract

```bash
stellar contract build
# Output: target/wasm32-unknown-unknown/release/katibay.wasm
```

### Run the Frontend Locally

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🚀 Deploy Your Own Contract (Optional)

The contract is already live on testnet, but you can re-deploy your own instance:

```bash
# 1. Generate and fund a keypair
stellar keys generate --global my-key --network testnet --fund

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/katibay.wasm \
  --source my-key \
  --network testnet

# 3. Initialize with your admin address
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source my-key \
  --network testnet \
  -- initialize \
  --admin <YOUR_G_ADDRESS>
```

---

## 📖 Usage Guide

### Using the Live App

1. **Install Freighter** — [freighter.app](https://www.freighter.app/) browser extension
2. **Switch Freighter to Testnet** — Settings → Network → Testnet
3. **Fund a test account** — [Stellar Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS)
4. **Open the app** — [katibay.vercel.app](https://katibay.vercel.app)
5. **Connect Freighter** — click "Connect Freighter" in the navbar

### Submitting a Vouch

1. Go to the **Submit Vouch** tab
2. Enter the student's Stellar address (`G...`)
3. Enter the SHA-256 hash of the student's full name as 64-character hex
   - Generate: `echo -n "Maria Santos" | sha256sum`
4. Click **Submit Vouch** — sign the transaction in Freighter

### Checking Verification Status

1. Go to the **Check Status** tab
2. Enter the student's Stellar address
3. Click **Check Verification Status** — returns `VERIFIED` or `NOT VERIFIED`

### Viewing an Identity Record

1. Go to the **View Identity** tab
2. Enter the student's Stellar address
3. Click **Fetch Identity Record** — displays full on-chain `IdentityRecord`

---

## 📁 Repository Structure

```
katibay/
├── Cargo.toml              ← Soroban smart contract config
├── src/
│   ├── lib.rs              ← Smart contract logic (Rust)
│   └── test.rs             ← 5 tests
├── frontend/               ← Next.js React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx    ← Landing page + dApp UI
│   │   │   ├── layout.tsx  ← Root layout with Toaster
│   │   │   └── globals.css ← Design system (navy/gold)
│   │   └── hooks/
│   │       └── KatibayContext.tsx ← Stellar SDK + Freighter integration
│   ├── .env.local          ← Testnet config (NEXT_PUBLIC_ vars)
│   └── vercel.json         ← Vercel deployment config
├── DEPLOY.md               ← Step-by-step deployment runbook
└── README.md               ← This file
```

---

## ⛓ Stellar Features Used

| Feature | Role in Katibay |
|---|---|
| **Soroban Smart Contracts** | Multi-sig vouching logic, threshold enforcement, double-vouch prevention, credential issuance, scholarship slot matching |
| **Custom Token (KTBY)** | On-chain credential token minted to verified students — composable with any Stellar dApp |
| **Trustlines** | Students establish a trustline to receive the KTBY credential token |
| **Stellar Events** | Every vouch emits an immutable on-chain event (`VOUCHED`, `CRED`, `SCHOLAR`) for audit trail |
| **Freighter Wallet** | Browser-native transaction signing — no private keys exposed |


---

## 📄 License

MIT License — Copyright © 2026 Salvador Vincent Javier
