#[cfg(test)]
mod tests {
    use crate::{Katibay, KatibayClient};
    use soroban_sdk::{
        testutils::Address as _,
        Address, BytesN, Env, String,
    };

    fn make_name_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    fn msg(env: &Env, s: &str) -> String {
        String::from_str(env, s)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Happy Path — 3 vouches → verified → credential → scholarship
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    fn test_happy_path_full_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin            = Address::generate(&env);
        let maria            = Address::generate(&env);
        let barangay_captain = Address::generate(&env);
        let teacher          = Address::generate(&env);
        let neighbor         = Address::generate(&env);
        let name_hash        = make_name_hash(&env, 42u8);

        // Deploy mock KTBY token and fund contract
        let token_admin = Address::generate(&env);
        let token_id    = env.register_stellar_asset_contract(token_admin.clone());
        let token_sa    = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_sa.mint(&contract_id, &10_i128);

        client.initialize(&admin);

        // Three community members vouch with meaningful messages
        client.vouch_for(&barangay_captain, &maria, &name_hash,
            &msg(&env, "I am the barangay captain of Brgy. 105, Tondo. I have known this student for 5 years."));
        client.vouch_for(&teacher, &maria, &name_hash,
            &msg(&env, "Maria is a student at Tondo National High School. I can attest to her identity."));
        client.vouch_for(&neighbor, &maria, &name_hash,
            &msg(&env, "I am Maria's neighbor at Blk 3, Lot 5, Tondo. I confirm her identity."));

        // Threshold met
        assert!(client.check_verified(&maria), "Maria should be verified after 3 vouches");

        // Check attestations stored on-chain
        let attestations = client.get_attestations(&maria);
        assert_eq!(attestations.len(), 3, "Should have 3 attestations");

        // Issue credential
        client.issue_credential(&maria, &token_id);
        let token = soroban_sdk::token::Client::new(&env, &token_id);
        assert_eq!(token.balance(&maria), 1_i128, "Maria should hold 1 KTBY credential token");

        // Apply for scholarship
        client.apply_scholarship(&maria, &7u32);
        let record = client.get_identity(&maria).expect("record should exist");
        assert_eq!(record.scholarship_slot, Some(7u32));
        assert!(record.verified);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Double vouch rejected
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
        client.vouch_for(&voucher, &student, &name_hash, &msg(&env, "First vouch"));
        client.vouch_for(&voucher, &student, &name_hash, &msg(&env, "Trying to double-vouch"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: 2 vouches → not verified, vouch_count == 2
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
        client.vouch_for(&voucher_a, &student, &name_hash, &msg(&env, "First community member"));
        client.vouch_for(&voucher_b, &student, &name_hash, &msg(&env, "Second community member"));

        assert!(!client.check_verified(&student), "2 vouches should not be verified");

        let record = client.get_identity(&student).expect("record should exist");
        assert_eq!(record.vouch_count, 2u32);
        assert!(!record.verified);

        let attestations = client.get_attestations(&student);
        assert_eq!(attestations.len(), 2, "Should have 2 attestations");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Duplicate credential issuance rejected
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    #[should_panic(expected = "credential already issued")]
    fn test_issue_credential_twice_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let va = Address::generate(&env);
        let vb = Address::generate(&env);
        let vc = Address::generate(&env);
        let name_hash = make_name_hash(&env, 11u8);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_sa = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_sa.mint(&contract_id, &10_i128);

        client.initialize(&admin);
        client.vouch_for(&va, &student, &name_hash, &msg(&env, "Voucher A"));
        client.vouch_for(&vb, &student, &name_hash, &msg(&env, "Voucher B"));
        client.vouch_for(&vc, &student, &name_hash, &msg(&env, "Voucher C"));

        client.issue_credential(&student, &token_id);
        client.issue_credential(&student, &token_id); // should panic
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Name hash mismatch rejected
    // ─────────────────────────────────────────────────────────────────────────
    #[test]
    #[should_panic(expected = "name hash mismatch for student")]
    fn test_name_hash_mismatch_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let va = Address::generate(&env);
        let vb = Address::generate(&env);

        let hash_a = make_name_hash(&env, 3u8);
        let hash_b = make_name_hash(&env, 4u8);

        client.initialize(&admin);
        client.vouch_for(&va, &student, &hash_a, &msg(&env, "First voucher"));
        client.vouch_for(&vb, &student, &hash_b, &msg(&env, "Different hash — should panic"));
    }
}