#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::Address as _,
        Address, BytesN, Env, String,
    };
    use crate::{Katibay, KatibayClient};

    // ── Helpers ──────────────────────────────────────────────────────────────

    fn setup() -> (Env, Address, KatibayClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    /// Creates a deterministic 32-byte name hash from a string slice.
    fn make_hash(env: &Env, name: &str) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        let src = name.as_bytes();
        let len = src.len().min(32);
        bytes[..len].copy_from_slice(&src[..len]);
        BytesN::from_array(env, &bytes)
    }

    fn make_str(env: &Env, s: &str) -> String {
        String::from_str(env, s)
    }

    // ── Happy Path ───────────────────────────────────────────────────────────

    /// Full end-to-end: 4 registrations → 3 vouches → student is verified.
    #[test]
    fn test_happy_path_with_registration() {
        let (env, _admin, client) = setup();

        let student = Address::generate(&env);
        let v1 = Address::generate(&env);
        let v2 = Address::generate(&env);
        let v3 = Address::generate(&env);

        let student_hash = make_hash(&env, "Maria Santos");

        // All four parties register their identity
        client.register(&student, &student_hash);
        client.register(&v1, &make_hash(&env, "Juan dela Cruz"));
        client.register(&v2, &make_hash(&env, "Aling Rosa"));
        client.register(&v3, &make_hash(&env, "Mang Pedro"));

        // Verify registrations are stored correctly
        assert!(client.is_registered(&student));
        assert!(client.is_registered(&v1));
        assert!(client.is_registered(&v2));
        assert!(client.is_registered(&v3));

        let reg = client.get_registration(&student).unwrap();
        assert_eq!(reg.name_hash, student_hash);

        // Three community members vouch with role-prefixed messages
        client.vouch_for(
            &v1, &student, &student_hash,
            &make_str(&env, "[Barangay Official] I have known Maria for 10 years"),
        );
        client.vouch_for(
            &v2, &student, &student_hash,
            &make_str(&env, "[Teacher / Professor] Maria is enrolled in my class"),
        );
        client.vouch_for(
            &v3, &student, &student_hash,
            &make_str(&env, "[Neighbor / Community Member] We live in the same street"),
        );

        // Student is verified after 3 vouches
        assert!(client.check_verified(&student));

        // IdentityRecord shows 3 vouches
        let record = client.get_identity(&student).unwrap();
        assert_eq!(record.vouch_count, 3);

        // Attestations list contains all 3 messages
        let atts = client.get_attestations(&student);
        assert_eq!(atts.len(), 3);
    }

    // ── Registration Guard Tests ─────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "vouchers must register their identity first")]
    fn test_unregistered_voucher_rejected() {
        let (env, _admin, client) = setup();
        let student = Address::generate(&env);
        let voucher = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        // Register student but NOT voucher
        client.register(&student, &hash);

        client.vouch_for(
            &voucher, &student, &hash,
            &make_str(&env, "Should be rejected"),
        );
    }

    #[test]
    #[should_panic(expected = "student must register their identity first")]
    fn test_unregistered_student_rejected() {
        let (env, _admin, client) = setup();
        let student = Address::generate(&env);
        let voucher = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        // Register voucher but NOT student
        client.register(&voucher, &make_hash(&env, "Juan dela Cruz"));

        client.vouch_for(
            &voucher, &student, &hash,
            &make_str(&env, "Should be rejected"),
        );
    }

    #[test]
    #[should_panic(expected = "name hash does not match student's registered identity")]
    fn test_wrong_name_hash_rejected() {
        let (env, _admin, client) = setup();
        let student = Address::generate(&env);
        let voucher = Address::generate(&env);

        let real_hash  = make_hash(&env, "Maria Santos");
        let wrong_hash = make_hash(&env, "Someone Else");

        client.register(&student, &real_hash);
        client.register(&voucher, &make_hash(&env, "Juan dela Cruz"));

        // Supply wrong hash — should be rejected
        client.vouch_for(
            &voucher, &student, &wrong_hash,
            &make_str(&env, "Should be rejected"),
        );
    }

    #[test]
    #[should_panic(expected = "already vouched for this student")]
    fn test_double_vouch_rejected() {
        let (env, _admin, client) = setup();
        let student = Address::generate(&env);
        let voucher = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        client.register(&student, &hash);
        client.register(&voucher, &make_hash(&env, "Juan dela Cruz"));

        let msg = make_str(&env, "[Barangay Official] First vouch");
        client.vouch_for(&voucher, &student, &hash, &msg);

        // Second vouch from the same voucher — must be rejected
        let msg2 = make_str(&env, "[Barangay Official] Second attempt");
        client.vouch_for(&voucher, &student, &hash, &msg2);
    }

    #[test]
    #[should_panic(expected = "address already registered")]
    fn test_duplicate_registration_rejected() {
        let (env, _admin, client) = setup();
        let person = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        client.register(&person, &hash);

        // Second registration must be rejected
        let hash2 = make_hash(&env, "Maria Santos v2");
        client.register(&person, &hash2);
    }

    // ── Read-only Function Tests ─────────────────────────────────────────────

    #[test]
    fn test_is_registered_returns_false_for_unknown_address() {
        let (env, _admin, client) = setup();
        let unknown = Address::generate(&env);
        assert!(!client.is_registered(&unknown));
    }

    #[test]
    fn test_get_registration_returns_correct_record() {
        let (env, _admin, client) = setup();
        let person = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        client.register(&person, &hash);

        let reg = client.get_registration(&person).unwrap();
        assert_eq!(reg.address, person);
        assert_eq!(reg.name_hash, hash);
    }

    #[test]
    fn test_check_verified_returns_false_below_threshold() {
        let (env, _admin, client) = setup();
        let student = Address::generate(&env);
        let v1 = Address::generate(&env);
        let v2 = Address::generate(&env);
        let hash = make_hash(&env, "Maria Santos");

        client.register(&student, &hash);
        client.register(&v1, &make_hash(&env, "v1"));
        client.register(&v2, &make_hash(&env, "v2"));

        client.vouch_for(&v1, &student, &hash, &make_str(&env, "Vouch 1"));
        client.vouch_for(&v2, &student, &hash, &make_str(&env, "Vouch 2"));

        // Only 2 vouches — not yet verified
        assert!(!client.check_verified(&student));
    }
}