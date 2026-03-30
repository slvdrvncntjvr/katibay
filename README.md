# Katibay

> Community-vouched on-chain identity for urban poor Filipinos — your community
> knows who you are. Now the blockchain does too.

---

## Deployed Contract Information

**Network:** Stellar Testnet
**WASM Hash:** `9055cb59f25c1fa7dc24f6b37890d960a4d4da512ed7f9f16c91bcde72dc3764`
**Katibay Contract ID:** `CDU4D5OFN2KKAPXZE6BA2W5CT2GIFFQELKMXB534W4EGZZGM32PD3KGN`

You can verify this contract on the [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet/contract/CDU4D5OFN2KKAPXZE6BA2W5CT2GIFFQELKMXB534W4EGZZGM32PD3KGN).

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

## Stellar Features Used

- **Soroban smart contracts** — multi-sig vouching logic, threshold enforcement, credential issuance, scholarship slot matching
- **Custom tokens** (`KTBY`) — on-chain credential token issued to verified students
- **Trustlines** — student establishes trustline to receive the `KTBY` token
- **XLM transfers** — scholarship disbursement to verified student wallets

---

## Prerequisites

- Rust toolchain (stable): https://rustup.rs
  ```bash
  rustup target add wasm32v1-none
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

Output: `target/wasm32v1-none/release/katibay.wasm`

---

## Test

```bash
cargo test
```

Current suite covers core contract flow and key safety checks:

- happy path (3 vouches -> verify -> issue -> apply)
- double-vouch rejection
- storage state correctness before threshold
- duplicate credential issuance rejection
- name hash mismatch rejection

---

## Deploy to Testnet

```bash
# 1. Generate and fund a test keypair
stellar keys generate --global alice --network testnet --fund

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/katibay.wasm \
  --source alice \
  --network testnet
```

Initialize after deployment:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --admin <ADMIN_G_ADDRESS>
```

---

## Frontend Usage (No Build Tools)

Katibay includes a single-file frontend in `index.html`.

Run locally:

```bash
python -m http.server 8080
```

Then open:

- http://localhost:8080/index.html

In the app:

1. Set RPC URL to `https://soroban-testnet.stellar.org`
2. Set network passphrase to `Test SDF Network ; September 2015`
3. Paste the deployed contract ID
4. Connect Freighter (Testnet account)
5. Submit vouches from 3 unique wallets
6. Check verified status and read identity record

---

## Project Structure

```
katibay/
├── Cargo.toml
├── README.md
├── index.html  ← Vanilla HTML frontend
└── src/
    ├── lib.rs      ← smart contract
  └── test.rs     ← contract tests
```

---

## License

MIT License

Copyright (c) 2026 Salvador Vincent Javier
