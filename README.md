# 🪪 Katibay — Community-Vouched On-Chain Identity

> **Your community knows who you are. Now the blockchain does too.**

**Katibay** is a full-stack decentralized application (dApp) built on the Stellar blockchain using Soroban smart contracts. It solves a real, documented problem in the Philippines: urban poor students who cannot access CHED scholarships because they are trapped in the **Philippine ID loop** — where every document requires another document.

---

## 🌐 Live Deployment

| | Link |
|---|---|
| **Frontend (Vercel)** | https://katibay.vercel.app |
| **Smart Contract (Testnet)** | `CCCGDVFH7JNVVBFO563MRFK4V2KX4NYJ6ZCUDIPCPOG3HLKRIRZUBXEZ` |
| **Stellar Expert Explorer** | [View Contract on Testnet](https://stellar.expert/explorer/testnet/contract/CCCGDVFH7JNVVBFO563MRFK4V2KX4NYJ6ZCUDIPCPOG3HLKRIRZUBXEZ) |

---

## ✅ Try It Live — Verified Test Student

A real student identity has been registered on the contract with **3 on-chain community attestations**.

**Student Address:** `GBWDC266PYWCVDCRJXLKEEUTBHFLSPSH7FYIPVRWCSVSIZRBGOAKJ6T4`

> 🔗 **[View this student's live profile →](https://katibay.vercel.app/student/GBWDC266PYWCVDCRJXLKEEUTBHFLSPSH7FYIPVRWCSVSIZRBGOAKJ6T4)**

On the profile page you will see:
- ✅ **VERIFIED** badge — threshold of 3 vouches met
- 🔵 Full vouch progress ring (3/3)
- 📜 All 3 community attestation messages stored permanently on-chain
- 🔗 Links to Stellar Expert and the live contract

---

## 📸 Screenshots

### Landing Page
![Katibay Landing Page — navy/gold glassmorphism design with hero headline](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/landing.png)

### Student Profile Page (VERIFIED — 3/3 Vouches)
![Student profile showing VERIFIED badge, 3/3 vouch ring, and on-chain attestation messages](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/profile.png)

### Smart Contract on Stellar Expert (Testnet)
![Stellar Expert showing contract transaction history with vouch_for calls and attestation message strings visible on-chain](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/explorer.png)

> The Stellar Expert screenshot shows the actual attestation messages (e.g. *"I have known this child for 5 years"*) stored as string parameters in the `vouch_for()` transactions — permanently on the Stellar ledger.

---

## 🇵🇭 The Problem

Maria is 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship — but the application requires a valid government ID.

She doesn't have one. Her family never had the documents to register her properly. She tries to get a PhilSys card. PhilSys asks for a supporting document. The barangay says they'll issue a certification — but the captain is busy, the secretary lost the logbook, and her neighbor who could vouch for her has no official standing.

**She misses the deadline.**

This is the Philippine ID loop: **you need an ID to get an ID.** Every record is paper. Every paper can be lost, burned, or quietly shelved by someone with something to gain.

---

## 💡 The Solution

Katibay puts community trust on Stellar's immutable ledger. Trusted members — a barangay captain, a teacher, a neighbor — digitally co-sign a student's identity on-chain **with a written attestation message**. Once **3 vouches** are recorded, the Soroban contract automatically issues a tamper-proof **KTBY credential token** to the student's Stellar wallet.

That token unlocks scholarship applications. Permanently. On a ledger no politician can delete and no fire can burn.

---

## ✅ Full-Stack Overview

| Layer | Technology | Status |
|---|---|---|
| **Smart Contract** | Rust · Soroban SDK v21.7.7 · WASM | ✅ Deployed on Stellar Testnet |
| **Frontend** | Next.js 16 · React · TypeScript | ✅ Deployed on Vercel |
| **Wallet Integration** | Freighter · `@stellar/freighter-api` | ✅ Live |
| **Blockchain SDK** | `@stellar/stellar-sdk` | ✅ Live |

---

## 📋 Smart Contract

**Contract ID:** `CCCGDVFH7JNVVBFO563MRFK4V2KX4NYJ6ZCUDIPCPOG3HLKRIRZUBXEZ`
**Network:** Stellar Testnet
**Admin:** `GDLCNF5BQAV43DNA6N6U6FHU5T6ONI7DPL4U4LHJBKDEQVATBTR3HMTW`

### Contract Functions

| Function | Description |
|---|---|
| `initialize(admin)` | Sets up the contract with an admin address. Can only be called once. |
| `vouch_for(voucher, student, name_hash, message)` | Community member vouches on-chain with a written attestation message. Prevents double-vouching. Immutable. |
| `get_attestations(student)` | Returns all `Attestation { voucher, message }` records for a student. Read-only. |
| `check_verified(student)` | Returns `true` if the student has received ≥ 3 vouches. Read-only. |
| `get_identity(student)` | Returns the full `IdentityRecord` for a student. Read-only. |
| `issue_credential(student, token_address)` | Admin mints 1 KTBY credential token to a verified student's wallet. |
| `apply_scholarship(student, school_id)` | Verified student applies for a scholarship slot on-chain. |

### Data Stored On-Chain

```rust
struct IdentityRecord {
    student: Address,
    name_hash: BytesN<32>,   // SHA-256 of student's full name (privacy-preserving)
    vouch_count: u32,
    verified: bool,
    scholarship_slot: Option<u32>,
}

struct Attestation {
    voucher: Address,        // Who vouched
    message: String,         // Their written statement — permanently on ledger
}
```

---

## 🧪 Tests

All 5 tests pass:

```bash
cargo test
```

```
test tests::test_happy_path_full_flow                ... ok
test tests::test_double_vouch_rejected               ... ok
test tests::test_storage_state_reflects_vouch_count  ... ok
test tests::test_issue_credential_twice_rejected     ... ok
test tests::test_name_hash_mismatch_rejected         ... ok

test result: ok. 5 passed; 0 failed
```

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

### Run Tests

```bash
cargo test
```

### Run the Frontend Locally

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 📖 Usage Guide

### Using the Live App

1. Install [Freighter](https://www.freighter.app/) and switch it to **Testnet**
2. Open [katibay.vercel.app](https://katibay.vercel.app)
3. Click **Connect Freighter**

### Submitting a Vouch

1. Go to the **Submit Vouch** tab
2. Enter the student's Stellar address (`G...`)
3. Enter the SHA-256 hash of the student's full name (64-char hex)
   - Generate: `echo -n "Maria Santos" | sha256sum`
4. Write a community attestation message (e.g. *"I am the barangay captain of Brgy. 105, Tondo..."*)
5. Click **Submit Attestation on Stellar** — sign in Freighter

### Looking Up a Student

1. Go to **Student Lookup**
2. Enter a student address and click search
3. See their vouch progress and click **View Full Profile** for the complete identity card with all attestations

### View the Test Student

The student `GBWDC266PYWCVDCRJXLKEEUTBHFLSPSH7FYIPVRWCSVSIZRBGOAKJ6T4` has 3 on-chain vouches and is **VERIFIED**.

👉 [katibay.vercel.app/student/GBWDC266PYWCVDCRJXLKEEUTBHFLSPSH7FYIPVRWCSVSIZRBGOAKJ6T4](https://katibay.vercel.app/student/GBWDC266PYWCVDCRJXLKEEUTBHFLSPSH7FYIPVRWCSVSIZRBGOAKJ6T4)

---

## 🚀 Deploy Your Own Contract (Optional)

The contract is already live on testnet. To redeploy your own:

```bash
# Build
stellar contract build

# Deploy
stellar keys generate --global my-key --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/katibay.wasm \
  --source my-key \
  --network testnet

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source my-key \
  --network testnet \
  -- initialize \
  --admin <YOUR_G_ADDRESS>
```

---

## 📁 Repository Structure

```
katibay/
├── Cargo.toml              ← Soroban smart contract config
├── src/
│   ├── lib.rs              ← Contract logic (Rust): vouch_for, get_attestations, etc.
│   └── test.rs             ← 5 tests (all passing)
├── frontend/               ← Next.js React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              ← Landing page + vouch/lookup UI
│   │   │   ├── student/[address]/    ← Student profile page (dynamic route)
│   │   │   ├── layout.tsx            ← Root layout with Toaster
│   │   │   └── globals.css           ← Design system (navy/gold glassmorphism)
│   │   └── hooks/
│   │       └── KatibayContext.tsx    ← Stellar SDK + Freighter integration
│   ├── .env.local          ← Testnet config (NEXT_PUBLIC_ vars)
│   └── vercel.json         ← Vercel deployment config
├── DEPLOY.md               ← Deployment runbook
└── README.md               ← This file
```

---

## ⛓ Stellar Features Used

| Feature | Role in Katibay |
|---|---|
| **Soroban Smart Contracts** | Multi-sig vouching, on-chain attestation storage, threshold enforcement, credential issuance |
| **Custom Token (KTBY)** | On-chain credential token minted to verified students — composable with any Stellar dApp |
| **Persistent Storage** | `Attestation { voucher, message }` structs stored permanently per student |
| **Stellar Events** | Every vouch emits `VOUCHED`, credential emits `CRED`, scholarship emits `SCHOLAR` |
| **Freighter Wallet** | Browser-native transaction signing — no private keys exposed |

---

## 🏆 Why Katibay

1. **Real problem, real population** — 4.6M out-of-school youth in PH trapped by the ID loop
2. **On-chain attestations** — vouchers leave written statements permanently on the ledger, readable by anyone
3. **Full-stack** — deployed Soroban contract + production Next.js on Vercel
4. **Live & verifiable** — test student with 3 vouches publicly accessible on Stellar testnet
5. **Distinctly Filipino** — barangay as the trust unit, CHED pipeline as the use case

---

## 📄 License

MIT License — Copyright © 2026 Salvador Vincent Javier
