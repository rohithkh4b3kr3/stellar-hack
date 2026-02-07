#![cfg(test)]

use super::*;
use soroban_sdk::Address;

#[test]
fn test_init_and_get_project() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let business = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let token = Address::generate(&env);

    client.init_project(
        &business,
        &freelancer,
        &token,
        &1000_i128,
        &300_i128, // 30% advance
        &3000_u64, // delivery deadline
        &259200_u64, // 3 days verification
    );

    let project = client.get_project();
    assert_eq!(project.business, business);
    assert_eq!(project.freelancer, freelancer);
    assert_eq!(project.total_amount, 1000);
    assert_eq!(project.advance_amount, 300);
    assert_eq!(project.state, storage::ProjectState::Created);
}
