#![cfg(test)]

use super::*;
use soroban_sdk::{vec, Address, Env};

#[test]
fn test_init_and_get_project() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let business = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let token = Address::generate(&env);
    let milestone_amounts = vec![&env, 100_i128, 200_i128];
    let milestone_deadlines = vec![&env, 1000_u64, 2000_u64];

    client.init_project(
        &business,
        &freelancer,
        &token,
        &500_i128,
        &100_i128,
        &milestone_amounts,
        &milestone_deadlines,
        &3000_u64,
        &604800_u64, // 7 days
    );

    let project = client.get_project();
    assert_eq!(project.business, business);
    assert_eq!(project.freelancer, freelancer);
    assert_eq!(project.total_amount, 500);
    assert_eq!(project.advance_amount, 100);
    assert_eq!(project.milestones.len(), 2);
    assert_eq!(project.state, storage::ProjectState::Created);
}
