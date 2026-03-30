#[cfg(test)]
mod tests {
    use crate::{Katibay, KatibayClient};
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

    #[test]
    #[should_panic(expected = "credential already issued")]
    fn test_issue_credential_twice_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let voucher_a = Address::generate(&env);
        let voucher_b = Address::generate(&env);
        let voucher_c = Address::generate(&env);
        let name_hash = make_name_hash(&env, 11u8);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_sa = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_sa.mint(&contract_id, &10_i128);

        client.initialize(&admin);
        client.vouch_for(&voucher_a, &student, &name_hash);
        client.vouch_for(&voucher_b, &student, &name_hash);
        client.vouch_for(&voucher_c, &student, &name_hash);

        client.issue_credential(&student, &token_id);
        client.issue_credential(&student, &token_id);
    }

    #[test]
    #[should_panic(expected = "name hash mismatch for student")]
    fn test_name_hash_mismatch_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, Katibay);
        let client = KatibayClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let voucher_a = Address::generate(&env);
        let voucher_b = Address::generate(&env);

        let name_hash_a = make_name_hash(&env, 3u8);
        let name_hash_b = make_name_hash(&env, 4u8);

        client.initialize(&admin);
        client.vouch_for(&voucher_a, &student, &name_hash_a);
        client.vouch_for(&voucher_b, &student, &name_hash_b);
    }
}