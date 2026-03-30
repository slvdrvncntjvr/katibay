# Katibay Deployment Runbook

This guide deploys Katibay to Stellar testnet and runs the frontend locally.

## 1) Prerequisites

- Rust stable
- wasm target:

```powershell
rustup target add wasm32v1-none
```

- Stellar CLI (already installed on this machine):

```powershell
stellar --version
```

- Freighter browser extension in Testnet mode

## 2) Verify contract tests and build

From project root:

```powershell
cargo test
stellar contract build
```

Expected build artifact:

- target/wasm32v1-none/release/katibay.wasm

## 3) Create and fund deployer key

```powershell
stellar keys generate --global katibay-admin --network testnet --fund
```

Optional check:

```powershell
stellar keys ls
```

## 4) Deploy Katibay contract

```powershell
stellar contract deploy `
  --wasm target/wasm32v1-none/release/katibay.wasm `
  --source katibay-admin `
  --network testnet
```

Copy the returned Contract ID (starts with C...).

## 5) Initialize contract

Use a Stellar account address as admin (G...):

```powershell
stellar contract invoke `
  --id <KATIBAY_CONTRACT_ID> `
  --source katibay-admin `
  --network testnet `
  -- initialize `
  --admin <ADMIN_G_ADDRESS>
```

## 6) Quick smoke test (CLI)

Vouch once:

```powershell
stellar contract invoke `
  --id <KATIBAY_CONTRACT_ID> `
  --source katibay-admin `
  --network testnet `
  -- vouch_for `
  --voucher <VOUCHER_G_ADDRESS> `
  --student <STUDENT_G_ADDRESS> `
  --name_hash <64_HEX_CHARS>
```

Check verification:

```powershell
stellar contract invoke `
  --id <KATIBAY_CONTRACT_ID> `
  --source katibay-admin `
  --network testnet `
  -- check_verified `
  --student <STUDENT_G_ADDRESS>
```

Read full identity:

```powershell
stellar contract invoke `
  --id <KATIBAY_CONTRACT_ID> `
  --source katibay-admin `
  --network testnet `
  -- get_identity `
  --student <STUDENT_G_ADDRESS>
```

## 7) Run frontend locally

From project root:

```powershell
python -m http.server 8080
```

Open:

- http://localhost:8080/index.html

In UI:

1. Connect Freighter.
2. Paste your Contract ID.
3. Use Vouch For Student.
4. Use Check Verified.
5. Use Get Identity Record.

## 8) Shareable frontend hosting (no build)

Because frontend is a single static file, you can deploy with:

- GitHub Pages
- Netlify Drag and Drop
- Vercel static project

Upload at least:

- index.html

Then use your deployed testnet Contract ID in the app.

## 9) Operational notes

- Students must have funded testnet accounts.
- issue_credential requires admin auth and requires at least 3 vouches.
- Re-issuing credential to same student is rejected.
- A different name hash for the same student is rejected.
