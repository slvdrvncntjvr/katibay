# 🪪 Katibay — Community-Vouched On-Chain Identity

> **Your community knows who you are. Now the blockchain does too.**

**Katibay** is a full-stack decentralized application (dApp) built on the Stellar blockchain using Soroban smart contracts. It solves a real, documented problem in the Philippines: urban poor students who cannot access CHED scholarships because they are trapped in the **Philippine ID loop** — where every document requires another document.

---

## 🌐 Live Deployment

| | Link |
|---|---|
| **Frontend (Vercel)** | https://katibay.vercel.app |
| **Smart Contract (Testnet)** | `CATFHPL7726YSPR24CDWGEPFF2L6TR4IX4BDTPIGOBUS7O35LTM2X56P` |
| **Stellar Expert Explorer** | [View Contract on Testnet](https://stellar.expert/explorer/testnet/contract/CATFHPL7726YSPR24CDWGEPFF2L6TR4IX4BDTPIGOBUS7O35LTM2X56P) |

---

## ✅ Try It Live — Verified & Registered Test Student

A real student identity has been **registered on-chain** with **3 on-chain community attestations** from 3 separately registered vouchers (Barangay Official, Teacher, Neighbor).

**Student Address:** `GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT`

> 🔗 **[View this student's live profile →](https://katibay.vercel.app/student/GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT)**

On the profile page you will see:
- ✅ **VERIFIED** badge — threshold of 3 vouches met
- 🔗 **Registered** badge — identity committed on-chain before any vouch accepted
- 🔵 Full vouch progress ring (3/3)
- 📜 All 3 attestations with **role badges** (🏛️ Barangay Official, 📚 Teacher, 🏠 Neighbor)
- 🔗 Links to Stellar Expert and the live contract

---

## 📸 Screenshots

### Landing Page
![Katibay Landing Page — navy/gold glassmorphism design with hero headline](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/landing.png)

### Student Profile Page (VERIFIED — 3/3 Vouches)
![Student profile showing VERIFIED badge, 3/3 vouch ring, and on-chain attestation messages](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/profile.png)

### Smart Contract on Stellar Expert (Testnet)
![Stellar Expert showing contract transaction history with vouch_for calls and attestation message strings visible on-chain](https://raw.githubusercontent.com/slvdrvncntjvr/katibay/main/docs/screenshots/explorer.png)

---

## 🇵🇭 The Problem

Maria is 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship — but the application requires a valid government ID.

She doesn't have one. Her family never had the documents to register her properly. She tries to get a PhilSys card. PhilSys asks for a supporting document. The barangay says they'll issue a certification — but the captain is busy, the secretary lost the logbook, and her neighbor who could vouch for her has no official standing.

**She misses the deadline.**

This is the Philippine ID loop: **you need an ID to get an ID.** Every record is paper. Every paper can be lost, burned, or quietly shelved by someone with something to gain.

---

## 💡 The Solution

Katibay puts community trust on Stellar's immutable ledger. Both students and vouchers must **register their identity on-chain** (committing their name hash to their wallet address) before any vouching can happen. Once registered, trusted members — a barangay captain, a teacher, a neighbor — digitally co-sign a student's identity with a **written attestation message and their role**. Once **3 vouches** are recorded, the Soroban contract marks the student as verified.

That verification unlocks scholarship applications. Permanently. On a ledger no politician can delete and no fire can burn.

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

**Contract ID:** `CATFHPL7726YSPR24CDWGEPFF2L6TR4IX4BDTPIGOBUS7O35LTM2X56P`  
**Network:** Stellar Testnet  
**Admin:** `GDLCNF5BQAV43DNA6N6U6FHU5T6ONI7DPL4U4LHJBKDEQVATBTR3HMTW`

### Contract Functions

| Function | Description |
|---|---|
| `initialize(admin)` | Sets up the contract with an admin address. Can only be called once. |
| `register(registrant, name_hash)` | **NEW** — Permanently commits a SHA-256 name hash to a wallet. Required before vouching. Immutable. |
| `is_registered(address)` | **NEW** — Returns `true` if an address has registered. Read-only. |
| `get_registration(address)` | **NEW** — Returns the `RegistrationRecord` for an address. Read-only. |
| `vouch_for(voucher, student, name_hash, message)` | Community member vouches on-chain. **Requires both voucher and student to be registered.** Prevents double-vouching. Role-prefixed messages. |
| `get_attestations(student)` | Returns all `Attestation { voucher, message }` records. Read-only. |
| `check_verified(student)` | Returns `true` if the student has received ≥ 3 vouches. Read-only. |
| `get_identity(student)` | Returns the full `IdentityRecord`. Read-only. |
| `issue_credential(student, token_address)` | Admin mints 1 KTBY credential token to a verified student's wallet. |
| `apply_scholarship(student, school_id)` | Verified student applies for a scholarship slot on-chain. |

### Anti-Gaming System (On-Chain Enforced)

The `vouch_for()` function enforces all 4 guards at the **contract level** — not just the UI:

```
1. Voucher must be registered    → panic!("vouchers must register their identity first")
2. Student must be registered    → panic!("student must register their identity first")
3. Name hash must match          → panic!("name hash does not match student's registered identity")
4. No double-vouching            → panic!("already vouched for this student")
```

### Data Stored On-Chain

```rust
struct RegistrationRecord {
    address: Address,
    name_hash: BytesN<32>,   // SHA-256 of name, permanently bound to wallet
}

struct IdentityRecord {
    student: Address,
    name_hash: BytesN<32>,
    vouch_count: u32,
    verified: bool,
    scholarship_slot: Option<u32>,
}

struct Attestation {
    voucher: Address,        // Who vouched
    message: String,         // "[Role] Written statement" — permanently on ledger
}
```

---

## 🧪 Tests

All 9 tests pass:

```bash
cargo test
```

```
test test::tests::test_happy_path_with_registration              ... ok
test test::tests::test_unregistered_voucher_rejected             ... ok (should panic)
test test::tests::test_unregistered_student_rejected             ... ok (should panic)
test test::tests::test_wrong_name_hash_rejected                  ... ok (should panic)
test test::tests::test_double_vouch_rejected                     ... ok (should panic)
test test::tests::test_duplicate_registration_rejected           ... ok (should panic)
test test::tests::test_is_registered_returns_false_for_unknown   ... ok
test test::tests::test_get_registration_returns_correct_record   ... ok
test test::tests::test_check_verified_returns_false_below_threshold ... ok

test result: ok. 9 passed; 0 failed
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

### Registering as a Student

1. Open [katibay.vercel.app/register](https://katibay.vercel.app/register)
2. Enter your full name → SHA-256 hash generated instantly in-browser
3. Connect Freighter (Testnet mode)
4. Click **"⛓️ Commit My Identity On-Chain"** — signs a `register()` transaction
5. Download your **KatibayID card** with your wallet address and name hash
6. Share these with your trusted community members

### Submitting a Vouch (Voucher Flow)

Vouchers must also be registered. Then:

1. Open [katibay.vercel.app](https://katibay.vercel.app) → **Submit Vouch** tab
2. Enter the student's Stellar address
3. Use the **"Calculate from name"** hash helper OR paste the student's hash
4. Select your **role** (Barangay Official, Teacher, Social Worker, Neighbor, Family Friend)
5. Write your attestation message
6. Click **Submit** — message is prefixed with your role and stored permanently on-chain

### Looking Up a Student

1. Go to **Student Lookup** tab
2. Enter any student address
3. See their vouch progress and **View Full Profile** for attestations with role badges

### View the Test Student (Pre-Verified)

```
Student Address: GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT
Student Name: Maria Santos
Name Hash: e0c862f7b73c55146f2a054566dbe7844b27a4d4903f7489904c044a1a1ab5af
```

👉 [katibay.vercel.app/student/GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT](https://katibay.vercel.app/student/GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT)

---

## 🚀 Deploy Your Own Contract (Optional)

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

# Register and vouch (both parties must register first)
stellar contract invoke --id <CONTRACT_ID> --source student-key --network testnet -- register \
  --registrant <STUDENT_ADDRESS> --name_hash <SHA256_HEX>

stellar contract invoke --id <CONTRACT_ID> --source voucher-key --network testnet -- vouch_for \
  --voucher <VOUCHER_ADDRESS> --student <STUDENT_ADDRESS> \
  --name_hash <SHA256_HEX> \
  --message "[Barangay Official] I have known this student for 5 years..."
```

---

## 📁 Repository Structure

```
katibay/
├── Cargo.toml              ← Soroban smart contract config
├── src/
│   ├── lib.rs              ← Contract logic (Rust): register, vouch_for, get_attestations, etc.
│   └── test.rs             ← 9 tests (all passing)
├── frontend/               ← Next.js React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              ← Landing page + vouch/lookup UI with role selector
│   │   │   ├── register/page.tsx     ← Student registration + on-chain identity commitment
│   │   │   ├── student/[address]/    ← Student profile (role badges, attestation feed)
│   │   │   ├── layout.tsx            ← Root layout with Toaster
│   │   │   └── globals.css           ← Design system (navy/gold glassmorphism)
│   │   └── hooks/
│   │       └── KatibayContext.tsx    ← Stellar SDK + Freighter + registerIdentity, isRegistered
│   ├── .env.local          ← Testnet config (NEXT_PUBLIC_ vars)
│   └── vercel.json         ← Vercel deployment config
├── docs/screenshots/       ← UI screenshots for README
└── README.md               ← This file
```

---

## ⛓ Stellar Features Used

| Feature | Role in Katibay |
|---|---|
| **Soroban Smart Contracts** | Registration system, anti-gaming guards, attestation storage, credential issuance |
| **Persistent Storage** | `RegistrationRecord`, `IdentityRecord`, `Attestation` structs per address |
| **Stellar Events** | `REGD` (registration), `VOUCHED`, `CRED` (credential issued), `SCHOLAR` |
| **Freighter Wallet** | Browser-native signing for `register()` and `vouch_for()` transactions |
| **Web Crypto API** | SHA-256 name hashing in-browser — no terminal needed |

---

## 🏆 Why Katibay

1. **Real problem, real population** — 4.6M out-of-school youth in PH trapped by the ID loop
2. **On-chain registration** — both students and vouchers commit their identity; prevents anonymous fake vouching
3. **Contract-enforced anti-gaming** — 4 guards enforced at the Soroban level, not just the UI
4. **On-chain attestation messages** — vouchers leave role-prefixed written statements permanently on the ledger
5. **Full-stack** — deployed Soroban contract + production Next.js on Vercel
6. **Distinctly Filipino** — barangay as the trust unit, CHED pipeline as the use case

---

## 📄 License

MIT License — Copyright © 2026 Salvador Vincent Javier
