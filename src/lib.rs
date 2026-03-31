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
    Registration(Address),       // NEW: locks name_hash to a wallet address
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

/// On-chain identity registration — permanently locks a name_hash to a wallet.
#[contracttype]
#[derive(Clone)]
pub struct RegistrationRecord {
    pub address: Address,
    pub name_hash: BytesN<32>,
}

// ─── Events ──────────────────────────────────────────────────────────────────

const EVT_REGISTERED:  Symbol = symbol_short!("REGD");
const EVT_VOUCHED:     Symbol = symbol_short!("VOUCHED");
const EVT_CREDENTIAL:  Symbol = symbol_short!("CRED");
const EVT_SCHOLARSHIP: Symbol = symbol_short!("SCHOLAR");

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct Katibay;

#[contractimpl]
impl Katibay {

    // ─── Setup ───────────────────────────────────────────────────────────────

    /// Sets up the contract with an admin. Must be called once after deployment.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    // ─── Registration ────────────────────────────────────────────────────────

    /// Commit your identity to the blockchain.
    ///
    /// Permanently locks your name_hash (SHA-256 of your full name)
    /// to your wallet address. Cannot be changed or repeated — your
    /// identity commitment is immutable once made.
    ///
    /// Both students AND vouchers must register before any vouch can happen.
    pub fn register(env: Env, registrant: Address, name_hash: BytesN<32>) {
        registrant.require_auth();

        let key = DataKey::Registration(registrant.clone());
        if env.storage().persistent().has(&key) {
            panic!("address already registered — identity is immutable");
        }

        env.storage().persistent().set(
            &key,
            &RegistrationRecord {
                address: registrant.clone(),
                name_hash: name_hash.clone(),
            },
        );

        env.events()
            .publish((EVT_REGISTERED,), (registrant, name_hash));
    }

    /// Returns true if an address has registered their identity on-chain.
    pub fn is_registered(env: Env, address: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Registration(address))
    }

    /// Returns the RegistrationRecord for an address, if it exists.
    pub fn get_registration(env: Env, address: Address) -> Option<RegistrationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Registration(address))
    }

    // ─── Vouching ────────────────────────────────────────────────────────────

    /// A trusted community member vouches for a student.
    ///
    /// Anti-gaming requirements (all enforced on-chain):
    ///   1. Voucher must be registered — their identity is committed on-chain
    ///   2. Student must be registered — prevents vouching for ghost identities
    ///   3. name_hash must match student's registration — no substitution attacks
    ///   4. One vouch per voucher per student — prevents ballot-stuffing
    pub fn vouch_for(
        env: Env,
        voucher: Address,
        student: Address,
        name_hash: BytesN<32>,
        message: String,
    ) {
        voucher.require_auth();

        // ── Guard 1: Voucher must be registered ───────────────────────────────
        if !env
            .storage()
            .persistent()
            .has(&DataKey::Registration(voucher.clone()))
        {
            panic!("vouchers must register their identity first");
        }

        // ── Guard 2: Student must be registered ───────────────────────────────
        let student_reg_key = DataKey::Registration(student.clone());
        if !env.storage().persistent().has(&student_reg_key) {
            panic!("student must register their identity first");
        }

        // ── Guard 3: name_hash must match student's registration ──────────────
        let student_reg: RegistrationRecord = env
            .storage()
            .persistent()
            .get(&student_reg_key)
            .unwrap();
        if student_reg.name_hash != name_hash {
            panic!("name hash does not match student's registered identity");
        }

        // ── Guard 4: Prevent double-vouch ─────────────────────────────────────
        let vouch_key = DataKey::HasVouched(voucher.clone(), student.clone());
        if env.storage().persistent().has(&vouch_key) {
            panic!("already vouched for this student");
        }
        env.storage().persistent().set(&vouch_key, &true);

        // ── Increment vouch counter ───────────────────────────────────────────
        let count_key = DataKey::VouchCount(student.clone());
        let vouch_count: u32 = env
            .storage()
            .persistent()
            .get(&count_key)
            .unwrap_or(0);
        let new_vouch_count = vouch_count + 1;
        env.storage()
            .persistent()
            .set(&count_key, &new_vouch_count);

        // ── Update or create IdentityRecord ───────────────────────────────────
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

        record.vouch_count = new_vouch_count;
        env.storage().persistent().set(&identity_key, &record);

        // ── Append attestation ────────────────────────────────────────────────
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

        // ── Emit immutable audit event ────────────────────────────────────────
        env.events().publish(
            (EVT_VOUCHED,),
            (voucher, student, new_vouch_count, message),
        );
    }

    // ─── Read-only ────────────────────────────────────────────────────────────

    /// Returns true if the student has met the vouch threshold.
    pub fn check_verified(env: Env, student: Address) -> bool {
        let vouch_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::VouchCount(student))
            .unwrap_or(0);
        vouch_count >= VOUCH_THRESHOLD
    }

    /// Returns the full IdentityRecord for a student.
    pub fn get_identity(env: Env, student: Address) -> Option<IdentityRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Identity(student))
    }

    /// Returns all on-chain attestation messages left for a student.
    pub fn get_attestations(env: Env, student: Address) -> Vec<Attestation> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestations(student))
            .unwrap_or(Vec::new(&env))
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// Admin mints 1 KTBY credential token to a verified student.
    pub fn issue_credential(env: Env, student: Address, token_address: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
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

    /// A verified student applies for a scholarship slot on-chain.
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

        env.events()
            .publish((EVT_SCHOLARSHIP,), (student, school_id));
    }
}

mod test;