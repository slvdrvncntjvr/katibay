#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short, token, Address, BytesN,
    Env, String, Symbol, Vec,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const VOUCH_THRESHOLD: u32 = 3;

// ─── Storage Keys ────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    VouchCount(Address),
    HasVouched(Address, Address),
    Identity(Address),
    Attestations(Address),
}

// ─── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct IdentityRecord {
    pub student: Address,
    pub name_hash: BytesN<32>,
    pub vouch_count: u32,
    pub verified: bool,
    pub scholarship_slot: Option<u32>,
}

/// A single community attestation — who vouched and what they said.
#[contracttype]
#[derive(Clone)]
pub struct Attestation {
    pub voucher: Address,
    pub message: String,
}

// ─── Events ──────────────────────────────────────────────────────────────────

const EVT_VOUCHED:     Symbol = symbol_short!("VOUCHED");
const EVT_CREDENTIAL:  Symbol = symbol_short!("CRED");
const EVT_SCHOLARSHIP: Symbol = symbol_short!("SCHOLAR");

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct Katibay;

#[contractimpl]
impl Katibay {

    /// Sets up the contract with an admin. Must be called once after deployment.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// A trusted community member vouches for a student.
    ///
    /// - Voucher must sign the transaction (no impersonation)
    /// - A voucher can only vouch once per student (prevents gaming)
    /// - Stores an on-chain attestation message from the voucher
    /// - Emits a VOUCHED event for permanent audit trail
    pub fn vouch_for(
        env: Env,
        voucher: Address,
        student: Address,
        name_hash: BytesN<32>,
        message: String,
    ) {
        voucher.require_auth();

        // Prevent double-vouch
        let vouch_key = DataKey::HasVouched(voucher.clone(), student.clone());
        if env.storage().persistent().has(&vouch_key) {
            panic!("already vouched for this student");
        }
        env.storage().persistent().set(&vouch_key, &true);

        // Increment vouch counter
        let count_key = DataKey::VouchCount(student.clone());
        let vouch_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_vouch_count = vouch_count + 1;
        env.storage().persistent().set(&count_key, &new_vouch_count);

        // Load or create IdentityRecord
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

        record.vouch_count = new_vouch_count;
        env.storage().persistent().set(&identity_key, &record);

        // Append attestation message to persistent storage
        let att_key = DataKey::Attestations(student.clone());
        let mut attestations: Vec<Attestation> = env
            .storage()
            .persistent()
            .get(&att_key)
            .unwrap_or(Vec::new(&env));
        attestations.push_back(Attestation {
            voucher: voucher.clone(),
            message: message.clone(),
        });
        env.storage().persistent().set(&att_key, &attestations);

        // Emit immutable on-chain event
        env.events().publish(
            (EVT_VOUCHED,),
            (voucher, student, new_vouch_count, message),
        );
    }

    /// Returns true if the student has met the vouch threshold. Read-only.
    pub fn check_verified(env: Env, student: Address) -> bool {
        let count_key = DataKey::VouchCount(student);
        let vouch_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        vouch_count >= VOUCH_THRESHOLD
    }

    /// Admin mints 1 KTBY credential token to a verified student.
    pub fn issue_credential(env: Env, student: Address, token_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Identity(student.clone());
        let mut record: IdentityRecord = env
            .storage()
            .persistent()
            .get(&key)
            .expect("student record not found");

        if record.vouch_count < VOUCH_THRESHOLD {
            panic!("insufficient vouches — threshold not met");
        }
        if record.verified {
            panic!("credential already issued");
        }

        record.verified = true;
        env.storage().persistent().set(&key, &record);

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &student, &1_i128);

        env.events().publish((EVT_CREDENTIAL,), (student,));
    }

    /// A verified student applies for a scholarship slot.
    pub fn apply_scholarship(env: Env, student: Address, school_id: u32) {
        student.require_auth();

        let key = DataKey::Identity(student.clone());
        let mut record: IdentityRecord = env
            .storage()
            .persistent()
            .get(&key)
            .expect("student record not found");

        if !record.verified {
            panic!("student identity not yet verified");
        }

        record.scholarship_slot = Some(school_id);
        env.storage().persistent().set(&key, &record);

        env.events().publish((EVT_SCHOLARSHIP,), (student, school_id));
    }

    /// Returns the full IdentityRecord for a student. Read-only.
    pub fn get_identity(env: Env, student: Address) -> Option<IdentityRecord> {
        let key = DataKey::Identity(student);
        env.storage().persistent().get(&key)
    }

    /// Returns all attestation messages left by vouchers for a student. Read-only.
    pub fn get_attestations(env: Env, student: Address) -> Vec<Attestation> {
        let key = DataKey::Attestations(student);
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
}

mod test;