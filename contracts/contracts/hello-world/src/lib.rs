//! Trustless Freelance Escrow Protocol
//! Single delivery: 30% advance, full payment on approval. Refund if deadline missed.

#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, MuxedAddress};

pub mod storage;
use storage::{DataKey, ProjectData, ProjectState};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Initialize escrow. Called once per deployment.
    /// advance_amount = 30% of total_amount (enforced off-chain).
    pub fn init_project(
        env: Env,
        business: Address,
        freelancer: Address,
        token: Address,
        total_amount: i128,
        advance_amount: i128,
        delivery_deadline: u64,
        verification_window_secs: u64,
    ) {
        business.require_auth();
        if env.storage().instance().has(&DataKey::Project) {
            let existing: ProjectData = env.storage().instance().get(&DataKey::Project).unwrap();
            if existing.state != ProjectState::Created {
                panic!("project already initialized");
            }
        }
        if advance_amount <= 0 || total_amount <= 0 || advance_amount > total_amount {
            panic!("invalid amounts");
        }
        if delivery_deadline == 0 {
            panic!("invalid deadline");
        }
        let project = ProjectData {
            business: business.clone(),
            freelancer: freelancer.clone(),
            token: token.clone(),
            total_amount,
            advance_amount,
            delivery_deadline,
            verification_window_secs,
            state: ProjectState::Created,
            delivery_hash: None,
            approval_deadline_ts: None,
        };
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business deposits 30% advance. Must approve contract for advance_amount first.
    pub fn deposit_advance(env: Env, business: Address) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::Created {
            panic!("invalid state");
        }
        if project.business != business {
            panic!("not business");
        }
        let contract_id = env.current_contract_address();
        let token_client = token::Client::new(&env, &project.token);
        token_client.transfer_from(&business, &contract_id, &project.advance_amount);
        project.state = ProjectState::AdvanceDeposited;
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business deposits remaining (70%) before approve. Must approve contract first.
    pub fn deposit_remaining(env: Env, business: Address) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::DeliverySubmitted {
            panic!("deposit remaining only after delivery submitted");
        }
        if project.business != business {
            panic!("not business");
        }
        let remaining = project.total_amount - project.advance_amount;
        if remaining <= 0 {
            return;
        }
        let contract_id = env.current_contract_address();
        let token_client = token::Client::new(&env, &project.token);
        token_client.transfer_from(&business, &contract_id, &remaining);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Freelancer submits delivery hash. Starts verification window.
    pub fn submit_delivery(env: Env, freelancer: Address, deliverable_hash: soroban_sdk::BytesN<32>) {
        freelancer.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        if project.freelancer != freelancer {
            panic!("not freelancer");
        }
        let now = env.ledger().timestamp();
        if now > project.delivery_deadline {
            panic!("delivery deadline passed");
        }
        if project.delivery_hash.is_some() {
            panic!("delivery already submitted");
        }
        project.delivery_hash = Some(deliverable_hash);
        project.state = ProjectState::DeliverySubmitted;
        project.approval_deadline_ts = Some(now + project.verification_window_secs);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business approves delivery; releases full payment to freelancer.
    pub fn approve_delivery(env: Env, business: Address) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::DeliverySubmitted {
            panic!("invalid state");
        }
        if project.business != business {
            panic!("not business");
        }
        if project.delivery_hash.is_none() {
            panic!("no delivery submitted");
        }
        project.state = ProjectState::Completed;
        env.storage().instance().set(&DataKey::Project, &project);
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let balance = token_client.balance(&contract_id);
        if balance > 0 {
            token_client.transfer(
                &contract_id,
                &MuxedAddress::from(project.freelancer.clone()),
                &balance,
            );
        }
    }

    /// Anyone can call after verification window: auto-release to freelancer.
    pub fn auto_release_if_timeout(env: Env) {
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::DeliverySubmitted {
            panic!("invalid state");
        }
        let deadline = project.approval_deadline_ts.unwrap_or(0);
        if env.ledger().timestamp() <= deadline {
            panic!("approval window not yet passed");
        }
        project.state = ProjectState::Completed;
        env.storage().instance().set(&DataKey::Project, &project);
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let balance = token_client.balance(&contract_id);
        if balance > 0 {
            token_client.transfer(
                &contract_id,
                &MuxedAddress::from(project.freelancer.clone()),
                &balance,
            );
        }
    }

    /// Refund advance to business if freelancer missed deadline (no delivery).
    pub fn refund_if_deadline_missed(env: Env) {
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        if env.ledger().timestamp() <= project.delivery_deadline {
            panic!("deadline not yet passed");
        }
        if project.delivery_hash.is_some() {
            panic!("delivery was submitted; use approve or auto_release");
        }
        project.state = ProjectState::Refunded;
        env.storage().instance().set(&DataKey::Project, &project);
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let balance = token_client.balance(&contract_id);
        token_client.transfer(
            &contract_id,
            &MuxedAddress::from(project.business.clone()),
            &balance,
        );
    }

    /// Release full payment after approval. Alias for approve_delivery flow; kept for API compatibility.
    pub fn finalize_project(env: Env) {
        let project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::DeliverySubmitted {
            panic!("call approve_delivery or auto_release_if_timeout first");
        }
        // Redirect to auto_release logic if window passed
        let deadline = project.approval_deadline_ts.unwrap_or(0);
        if env.ledger().timestamp() > deadline {
            Self::auto_release_if_timeout(env);
        } else {
            panic!("approval window not passed; business must call approve_delivery");
        }
    }

    pub fn get_project(env: Env) -> ProjectData {
        env.storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"))
    }

    pub fn get_escrow_balance(env: Env) -> i128 {
        let project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        token::Client::new(&env, &project.token).balance(&env.current_contract_address())
    }
}

mod test;
