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

        // Track vouches in the dedicated counter key for cheap verification checks.
        let count_key = DataKey::VouchCount(student.clone());
        let vouch_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_vouch_count = vouch_count + 1;
        env.storage().persistent().set(&count_key, &new_vouch_count);

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

        if record.name_hash != name_hash {
            panic!("name hash mismatch for student");
        }

        // Keep identity snapshot aligned with the dedicated vouch counter.
        record.vouch_count = new_vouch_count;
        env.storage().persistent().set(&identity_key, &record);

        // Emit vouch event — creates an immutable audit trail
        // Every vouch is permanently recorded on Stellar. No deletion.
        env.events().publish((EVT_VOUCHED,), (voucher, student, new_vouch_count));
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
        let count_key = DataKey::VouchCount(student);
        let vouch_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        vouch_count >= VOUCH_THRESHOLD
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

        if record.verified {
            panic!("credential already issued");
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
mod test;