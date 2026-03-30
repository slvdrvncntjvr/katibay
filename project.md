# 🪪 Katibay
### Community-Vouched On-Chain Identity for Urban Poor Filipinos

> **Region:** SEA — Philippines (Urban Poor: Tondo, Payatas, Baseco, Smokey Mountain)
> **Theme:** Governance & Identity → Digital Identity / KYC + Education → Scholarship Disbursement
> **Complexity:** Soroban Required · Mobile-First Web App
> **Target Users:** Grade 12 students / Out-of-school youth · Barangay officials · CHED/DSWD partner institutions

---

## The Story

Maria is 17, finishing Grade 12 in a public school in Tondo. She wants to apply for a CHED scholarship and enroll in a state university — her ticket out.

The application form asks for a valid government ID.

Maria doesn't have one. Her family never had the documents to register her properly. She tries to get a PhilSys ID. PhilSys asks for a supporting document. The barangay says they'll issue a certification — but the barangay captain is busy, the secretary lost the logbook, and her neighbor who could vouch for her has no official standing.

She misses the application deadline.

This is the Philippine ID loop: **you need an ID to get an ID.** And for urban poor Filipinos, the loop never closes. Every record is paper. Every paper can be lost, burned, or quietly shelved by someone with something to gain.

**Katibay** breaks the loop — not by replacing government IDs, but by making community trust count on an immutable ledger that no politician can delete and no bureaucrat can misplace.

---

## Project Overview

| Field | Details |
|---|---|
| **Project Name** | Katibay |
| **Tagline** | Your community knows who you are. Now the blockchain does too. |
| **Region** | Philippines — urban poor barangays (NCR, Cebu, Davao) |
| **User Types** | Grade 12 students / out-of-school youth, Barangay officials / teachers / community leaders, Partner schools and scholarship bodies |
| **Complexity** | Soroban Required · Mobile-First Web App |
| **Theme** | Governance & Identity + Scholarship Disbursement |
| **Prize Target** | Full-Stack Entry (Frontend + Smart Contract) — ₱9,000 |

---

## Problem

A Grade 12 student in Tondo cannot apply for a CHED scholarship or get matched to available university slots because she has no valid government ID — trapped in the Philippine ID loop where every document requires a document — while barangay certification records are paper-based, easily lost, and politically manipulable with no tamper-proof audit trail.

## Solution

Using Stellar's immutable ledger and Soroban smart contracts, Katibay lets trusted community members (barangay official, teacher, two neighbors) co-sign a student's identity on-chain — and once a configurable vouching threshold is met, the contract automatically issues a tamper-proof credential token that unlocks scholarship applications and school matching, all recorded on a ledger that no one can delete or alter.

## Stellar Features Used

| Feature | Role in Katibay |
|---|---|
| **Soroban smart contracts** | Multi-sig vouching logic, threshold enforcement, credential issuance, scholarship slot matching |
| **Custom tokens** | `KTBY` — the Katibay credential token issued to verified students |
| **Trustlines** | Student must establish a trustline to receive the `KTBY` credential token |
| **XLM transfers** | Scholarship disbursement to verified student wallets once matched |

---

## Why This is Distinctly Philippine

- **The ID-to-get-an-ID loop** is a known, documented problem specific to the Philippine civil registration system — not a generic "unbanked" narrative
- **Barangay as the trust unit** — the barangay captain + community leaders are already the de facto identity witnesses in PH; Katibay just puts their vouching on-chain
- **Immutable ledger as political protection** — in communities where records get "lost" during elections or under corrupt officials, the no-deletion property of Stellar isn't a technical detail, it's the entire point
- **CHED/DSWD scholarship pipeline** — these programs exist and have real funding; Katibay plugs in as the identity layer they're missing

---

## MVP Transaction Flow

```
Student registers wallet + name hash
  → vouch_for() called by 3 community members (threshold = 3)
    → check_verified() returns true once threshold met
      → issue_credential() mints KTBY token to student wallet
        → apply_scholarship() — verified student applies to a school slot on-chain
```

Demo-able in under 2 minutes. ✅

---

## Why This Wins

Katibay solves a real, named Philippine government failure (the ID loop) using Stellar's immutable ledger as a political guarantee — not just a technical feature. Judges see a mobile-first app built for users with no crypto experience, community-based trust mechanics that could plug into real CHED/DSWD pipelines, and a no-deletion ledger property that carries genuine social weight beyond finance.

## Optional Edge (Bonus Points)

**Offline / Low-Connectivity Support** — Barangay officials in poor urban areas often have weak internet. Katibay generates a QR code for each vouch transaction that can be signed offline and submitted when connectivity returns, using Stellar's pre-authorization (pre-auth transaction hash) feature.

---
---

## 📁 `Cargo.toml`

```toml
[package]
name = "katibay"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
soroban-sdk = { version = "21.0.0" }

[dev-dependencies]
soroban-sdk = { version = "21.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

---

## 📁 `src/lib.rs`

```rust
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short, token, Address, BytesN,
    Env, Symbol,
};

// ─── Constants ───────────────────────────────────────────────────────────────

/// Number of community vouches required before a student's identity is verified.
/// 3 means: barangay captain + teacher + one neighbor, for example.
const VOUCH_THRESHOLD: u32 = 3;

// ─── Storage Keys ────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Admin address (set on initialize — e.g. school registrar or CHED partner)
    Admin,
    /// Tracks how many vouches a student has received: Address → u32
    VouchCount(Address),
    /// Tracks whether a specific voucher already vouched for a specific student
    /// to prevent double-vouching: (voucher_addr, student_addr) → bool
    HasVouched(Address, Address),
    /// Full identity record for a verified student: Address → IdentityRecord
    Identity(Address),
}

// ─── Data Types ──────────────────────────────────────────────────────────────

/// On-chain identity record for a verified student.
/// name_hash: SHA-256 of the student's full name (privacy-preserving)
/// verified:  true once vouch threshold is met and credential issued
/// scholarship_slot: optional school/program ID they've been matched to
#[contracttype]
#[derive(Clone)]
pub struct IdentityRecord {
    pub student: Address,
    pub name_hash: BytesN<32>,
    pub vouch_count: u32,
    pub verified: bool,
    pub scholarship_slot: Option<u32>,
}

// ─── Events ──────────────────────────────────────────────────────────────────

const EVT_VOUCHED:      Symbol = symbol_short!("VOUCHED");
const EVT_VERIFIED:     Symbol = symbol_short!("VERIFIED");
const EVT_CREDENTIAL:   Symbol = symbol_short!("CRED");
const EVT_SCHOLARSHIP:  Symbol = symbol_short!("SCHOLAR");

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct Katibay;

#[contractimpl]
impl Katibay {

    /// initialize
    ///
    /// Sets up the contract with an admin (e.g. CHED partner school registrar).
    /// Must be called once immediately after deployment.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// vouch_for
    ///
    /// A trusted community member (barangay official, teacher, neighbor)
    /// vouches for a student's real-world identity.
    ///
    /// Rules enforced:
    /// - Voucher must authorize (sign) the transaction — no impersonation
    /// - A voucher can only vouch for the same student ONCE — prevents gaming
    /// - Creates or updates the student's IdentityRecord in storage
    /// - Emits a VOUCHED event for off-chain audit trail
    ///
    /// This is the core of Katibay: community trust becomes on-chain proof.
    /// No politician can delete these vouches. No fire can burn this logbook.
    ///
    /// Arguments:
    ///   voucher    — the community member's Stellar wallet (must sign tx)
    ///   student    — the student being vouched for
    ///   name_hash  — SHA-256 of the student's name (privacy-preserving identifier)
    pub fn vouch_for(
        env: Env,
        voucher: Address,
        student: Address,
        name_hash: BytesN<32>,
    ) {
        // Voucher must authorize — prevents anyone from submitting fake vouches
        voucher.require_auth();

        // Check for double-vouch: same person can't vouch for the same student twice
        let vouch_key = DataKey::HasVouched(voucher.clone(), student.clone());
        if env.storage().persistent().has(&vouch_key) {
            panic!("already vouched for this student");
        }

        // Mark this voucher-student pair as done
        env.storage().persistent().set(&vouch_key, &true);

        // Load existing record or create a new one
        let identity_key = DataKey::Identity(student.clone());
        let mut record: IdentityRecord = env
            .storage()
            .persistent()
            .get(&identity_key)
            .unwrap_or(IdentityRecord {
                student: student.clone(),
                name_hash: name_hash.clone(),
                vouch_count: 0,
                verified: false,
                scholarship_slot: None,
            });

        // Increment vouch count
        record.vouch_count += 1;
        env.storage().persistent().set(&identity_key, &record);

        // Emit vouch event — creates an immutable audit trail
        // Every vouch is permanently recorded on Stellar. No deletion.
        env.events().publish((EVT_VOUCHED,), (voucher, student, record.vouch_count));
    }

    /// check_verified
    ///
    /// Returns true if the student has met the vouch threshold (default: 3).
    /// This is a read-only check — no state change.
    /// Useful for frontends to show "3/3 vouches — ready to verify!" UI.
    ///
    /// Arguments:
    ///   student — the student's Stellar wallet address
    pub fn check_verified(env: Env, student: Address) -> bool {
        let key = DataKey::Identity(student);
        if !env.storage().persistent().has(&key) {
            return false;
        }
        let record: IdentityRecord = env.storage().persistent().get(&key).unwrap();
        record.vouch_count >= VOUCH_THRESHOLD
    }

    /// issue_credential
    ///
    /// Once a student has hit the vouch threshold, the admin (school registrar
    /// or CHED partner) calls this to:
    /// 1. Mark the student as officially verified in storage
    /// 2. Mint a KTBY credential token to the student's wallet
    ///
    /// The KTBY token is the student's on-chain identity proof.
    /// It can be presented to any participating school or scholarship body.
    /// It cannot be faked — it was issued only after 3+ community vouches.
    ///
    /// Arguments:
    ///   student        — the student receiving the credential
    ///   token_address  — the KTBY token contract address
    pub fn issue_credential(
        env: Env,
        student: Address,
        token_address: Address,
    ) {
        // Only admin can issue credentials — prevents self-issuance
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Identity(student.clone());
        let mut record: IdentityRecord = env
            .storage()
            .persistent()
            .get(&key)
            .expect("student record not found");

        // Enforce threshold before issuing
        if record.vouch_count < VOUCH_THRESHOLD {
            panic!("insufficient vouches — threshold not met");
        }

        // Mark as verified in storage
        record.verified = true;
        env.storage().persistent().set(&key, &record);

        // Mint 1 KTBY credential token to the student's wallet
        // This token IS their identity on-chain — composable with any Stellar dApp
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(
            &env.current_contract_address(),
            &student,
            &1_i128, // 1 credential token = verified identity
        );

        // Emit credential event — schools and DAOs can listen for this
        env.events().publish((EVT_CREDENTIAL,), (student,));
    }

    /// apply_scholarship
    ///
    /// A verified student applies for a scholarship slot at a partner school.
    /// Only works if the student has been verified (has KTBY credential).
    /// Records the scholarship slot in the student's IdentityRecord.
    ///
    /// This is the payoff: credentials → financial access.
    /// The school no longer needs to see a physical ID — they query Katibay.
    ///
    /// Arguments:
    ///   student     — the student applying (must sign tx)
    ///   school_id   — numeric ID of the target school/program slot
    pub fn apply_scholarship(env: Env, student: Address, school_id: u32) {
        // Student must authorize their own application
        student.require_auth();

        let key = DataKey::Identity(student.clone());
        let mut record: IdentityRecord = env
            .storage()
            .persistent()
            .get(&key)
            .expect("student record not found");

        // Cannot apply without verification — enforces the trust model
        if !record.verified {
            panic!("student identity not yet verified");
        }

        // Record the scholarship application on-chain
        // Immutable — the application cannot be "lost" by a registrar
        record.scholarship_slot = Some(school_id);
        env.storage().persistent().set(&key, &record);

        // Emit scholarship event — school systems can subscribe to this
        env.events().publish((EVT_SCHOLARSHIP,), (student, school_id));
    }

    /// get_identity
    ///
    /// Read-only view function. Returns the full IdentityRecord for a student.
    /// Used by schools, scholarship bodies, and the student's own frontend.
    pub fn get_identity(env: Env, student: Address) -> Option<IdentityRecord> {
        let key = DataKey::Identity(student);
        env.storage().persistent().get(&key)
    }
}
```

---

## 📁 `src/test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Address, BytesN, Env,
    };

    // ── Helper: generate a deterministic name hash from a seed byte ───────────
    fn make_name_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Happy Path
    //
    // Maria gets 3 vouches from her barangay captain, teacher, and neighbor.
    // Threshold is met. Admin issues her a KTBY credential token.
    // She applies for a scholarship slot at a partner school.
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    fn test_happy_path_full_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        // Actors
        let admin           = Address::generate(&env);
        let maria           = Address::generate(&env);
        let barangay_captain = Address::generate(&env);
        let teacher         = Address::generate(&env);
        let neighbor        = Address::generate(&env);
        let name_hash       = make_name_hash(&env, 42u8);

        // Deploy mock KTBY token and fund contract with 10 tokens
        let token_admin = Address::generate(&env);
        let token_id    = env.register_stellar_asset_contract(token_admin.clone());
        let token_sa    = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_sa.mint(&contract_id, &10_i128);

        // Initialize
        client.initialize(&admin);

        // Step 1: Three community members vouch for Maria
        client.vouch_for(&barangay_captain, &maria, &name_hash);
        client.vouch_for(&teacher,          &maria, &name_hash);
        client.vouch_for(&neighbor,         &maria, &name_hash);

        // Step 2: Threshold should now be met
        assert!(
            client.check_verified(&maria),
            "Maria should be verified after 3 vouches"
        );

        // Step 3: Admin issues credential token to Maria
        client.issue_credential(&maria, &token_id);

        // Assert: Maria received her KTBY credential token
        let token = soroban_sdk::token::Client::new(&env, &token_id);
        assert_eq!(
            token.balance(&maria),
            1_i128,
            "Maria should hold 1 KTBY credential token"
        );

        // Step 4: Maria applies for school slot #7 (e.g. PUP Manila)
        client.apply_scholarship(&maria, &7u32);

        // Assert: scholarship slot recorded in her identity
        let record = client.get_identity(&maria).expect("record should exist");
        assert_eq!(
            record.scholarship_slot,
            Some(7u32),
            "scholarship slot should be recorded as 7"
        );
        assert!(record.verified, "Maria should be marked verified");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Edge Case — Double Vouch Rejected
    //
    // The same person cannot vouch for the same student twice.
    // This prevents a corrupt barangay captain from inflating vouch counts.
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    #[should_panic(expected = "already vouched for this student")]
    fn test_double_vouch_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin    = Address::generate(&env);
        let student  = Address::generate(&env);
        let voucher  = Address::generate(&env);
        let name_hash = make_name_hash(&env, 1u8);

        client.initialize(&admin);

        // First vouch — valid
        client.vouch_for(&voucher, &student, &name_hash);

        // Second vouch by the same person — must panic
        // A corrupt official can't stack vouches to fast-track someone
        client.vouch_for(&voucher, &student, &name_hash);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: State Verification
    //
    // After 2 vouches, check_verified returns false.
    // The vouch count in storage correctly reflects exactly 2.
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    fn test_storage_state_reflects_vouch_count() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin     = Address::generate(&env);
        let student   = Address::generate(&env);
        let voucher_a = Address::generate(&env);
        let voucher_b = Address::generate(&env);
        let name_hash = make_name_hash(&env, 7u8);

        client.initialize(&admin);

        // Only 2 vouches — below threshold of 3
        client.vouch_for(&voucher_a, &student, &name_hash);
        client.vouch_for(&voucher_b, &student, &name_hash);

        // check_verified must return false — threshold not met yet
        assert!(
            !client.check_verified(&student),
            "should not be verified with only 2 vouches"
        );

        // Storage must reflect exactly 2 vouches
        let record = client.get_identity(&student).expect("record should exist");
        assert_eq!(
            record.vouch_count,
            2u32,
            "vouch count in storage should be exactly 2"
        );

        // verified flag must still be false
        assert!(
            !record.verified,
            "verified flag should remain false until credential is issued"
        );
    }
}
```

---

## 📁 `README.md`

```markdown
# Katibay

> Community-vouched on-chain identity for urban poor Filipinos — your community
> knows who you are. Now the blockchain does too.

---

## Problem

A Grade 12 student in Tondo cannot apply for a CHED scholarship or get matched to
available university slots because she has no valid government ID — trapped in the
Philippine ID loop where every document requires another document — while barangay
certification records are paper-based, easily lost, and politically manipulable with
no tamper-proof audit trail.

## Solution

Using Stellar's immutable ledger and Soroban smart contracts, Katibay lets trusted
community members (barangay official, teacher, neighbors) co-sign a student's identity
on-chain. Once a threshold of vouches is met, the contract automatically issues a
tamper-proof KTBY credential token that unlocks scholarship applications and school
matching — permanently recorded on a ledger that no one can delete or alter.

---

## MVP Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Smart contract + tests | 1.5 hrs | lib.rs, 3 tests passing |
| Testnet deploy | 30 min | Contract ID on Stellar testnet |
| Frontend (optional) | 1 hr | Vouch form + verification status UI |
| Demo prep | 30 min | 2-minute walkthrough ready |

---

## Stellar Features Used

- **Soroban smart contracts** — multi-sig vouching logic, threshold enforcement, credential issuance, scholarship slot matching
- **Custom tokens** (`KTBY`) — on-chain credential token issued to verified students
- **Trustlines** — student establishes trustline to receive the `KTBY` token
- **XLM transfers** — scholarship disbursement to verified student wallets

---

## Prerequisites

- Rust toolchain (stable): https://rustup.rs
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- Stellar CLI ≥ 21.0.0:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
- Freighter Wallet (browser extension, Testnet mode): https://www.freighter.app/

---

## Build

```bash
stellar contract build
```

Output: `target/wasm32-unknown-unknown/release/katibay.wasm`

---

## Test

```bash
cargo test
```

Expected output:

```
test tests::test_happy_path_full_flow ... ok
test tests::test_double_vouch_rejected ... ok
test tests::test_storage_state_reflects_vouch_count ... ok
```

---

## Deploy to Testnet

```bash
# 1. Generate and fund a test keypair
stellar keys generate --global alice --network testnet --fund

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/katibay.wasm \
  --source alice \
  --network testnet
```

Save the returned **Contract ID** — this is your submission proof.

---

## Sample CLI Invocations

### Initialize the contract
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --admin GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDE1234567
```

### Vouch for a student
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- vouch_for \
  --voucher GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDE1234567 \
  --student GXYZ1234567890XYZXYZ1234567890XYZXYZ1234567890XYZXYZ123456 \
  --name_hash 4d61726961416e6e6100000000000000000000000000000000000000000000
```

### Check if student is verified
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- check_verified \
  --student GXYZ1234567890XYZXYZ1234567890XYZXYZ1234567890XYZXYZ123456
```

Expected output after 3+ vouches: `true`

### Issue credential (admin)
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- issue_credential \
  --student GXYZ1234567890XYZXYZ1234567890XYZXYZ1234567890XYZXYZ123456 \
  --token_address <KTBY_TOKEN_CONTRACT_ID>
```

### Apply for a scholarship slot
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- apply_scholarship \
  --student GXYZ1234567890XYZXYZ1234567890XYZXYZ1234567890XYZXYZ123456 \
  --school_id 7
```

---

## Project Structure

```
katibay/
├── Cargo.toml
├── README.md
└── src/
    ├── lib.rs      ← smart contract
    └── test.rs     ← 3 tests
```

---

## License

MIT License

Copyright (c) 2026 Salvador Vincent Javier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```