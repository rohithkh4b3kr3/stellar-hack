//! Trustless B2B freelance escrow contract.
//! Funds are held only by this contract; business deposits advance, freelancer receives on approval/timeout.
//! Refunds to business are automatic if deadlines are missed.

#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, MuxedAddress};

pub mod storage;
use storage::{DataKey, Milestone, MilestoneStatus, ProjectData, ProjectState};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Initialize a new escrow project. Call once per contract deployment.
    /// - token: Stellar token contract (e.g. USDC or native XLM wrapper).
    /// - business: payer address.
    /// - freelancer: recipient address.
    /// - total_amount: total project payment (in token's smallest unit).
    /// - advance_amount: amount locked as advance (must be <= total_amount).
    /// - milestone_amounts: payment per milestone (sum + advance should match total).
    /// - milestone_deadlines_ts: Unix timestamp per milestone (freelancer must submit by then).
    /// - final_deadline_ts: Unix timestamp for final delivery.
    /// - verification_window_secs: seconds after submission before auto-release (e.g. 604800 = 7 days).
    #[allow(clippy::too_many_arguments)]
    pub fn init_project(
        env: Env,
        business: Address,
        freelancer: Address,
        token: Address,
        total_amount: i128,
        advance_amount: i128,
        milestone_amounts: soroban_sdk::Vec<i128>,
        milestone_deadlines_ts: soroban_sdk::Vec<u64>,
        final_deadline_ts: u64,
        verification_window_secs: u64,
    ) {
        business.require_auth();
        if advance_amount <= 0 || total_amount <= 0 || advance_amount > total_amount {
            panic!("invalid amounts");
        }
        if milestone_amounts.len() != milestone_deadlines_ts.len() {
            panic!("milestone len mismatch");
        }
        let mut milestones = soroban_sdk::Vec::new(&env);
        for (i, amount) in milestone_amounts.iter().enumerate() {
            let deadline_ts = milestone_deadlines_ts.get(i).unwrap();
            milestones.push_back(Milestone {
                amount: *amount,
                deadline_ts: *deadline_ts,
                status: MilestoneStatus::Pending,
                deliverable_hash: None,
                approval_deadline_ts: None,
            });
        }
        let project = ProjectData {
            business: business.clone(),
            freelancer: freelancer.clone(),
            token: token.clone(),
            total_amount,
            advance_amount,
            final_deadline_ts,
            verification_window_secs,
            state: ProjectState::Created,
            milestones,
            final_delivery_hash: None,
            final_approval_deadline_ts: None,
        };
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business deposits the advance by transferring tokens into the contract.
    /// Business must have approved this contract for at least advance_amount before calling.
    pub fn deposit_advance(env: Env, business: Address) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::Created {
            panic!("invalid state for deposit");
        }
        if project.business != business {
            panic!("not business");
        }
        let contract_id = env.current_contract_address();
        let token_client = token::Client::new(&env, &project.token);
        // Pull advance from business to this contract (business must have approved).
        token_client.transfer_from(
            &contract_id,
            &business,
            &contract_id,
            &project.advance_amount,
        );
        project.state = ProjectState::AdvanceDeposited;
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Freelancer submits a milestone deliverable hash. Sets status to Submitted and starts approval window.
    pub fn submit_milestone(env: Env, freelancer: Address, index: u32, deliverable_hash: soroban_sdk::BytesN<32>) {
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
        if now > project.final_deadline_ts {
            panic!("past final deadline");
        }
        let i = index as usize;
        if i >= project.milestones.len() as usize {
            panic!("invalid milestone index");
        }
        let mut m = project.milestones.get(i).unwrap();
        if m.status != MilestoneStatus::Pending {
            panic!("milestone not pending");
        }
        if now > m.deadline_ts {
            panic!("milestone deadline passed");
        }
        m.deliverable_hash = Some(deliverable_hash);
        m.status = MilestoneStatus::Submitted;
        m.approval_deadline_ts = Some(now + project.verification_window_secs);
        project.milestones.set(i, m);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business approves a submitted milestone; releases funds to freelancer.
    pub fn approve_milestone(env: Env, business: Address, index: u32) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        if project.business != business {
            panic!("not business");
        }
        let i = index as usize;
        if i >= project.milestones.len() as usize {
            panic!("invalid milestone index");
        }
        let mut m = project.milestones.get(i).unwrap();
        if m.status != MilestoneStatus::Submitted {
            panic!("milestone not submitted");
        }
        if m.status == MilestoneStatus::Disputed {
            panic!("milestone disputed");
        }
        m.status = MilestoneStatus::Approved;
        project.milestones.set(i, m);
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let freelancer_muxed = MuxedAddress::from(project.freelancer.clone());
        token_client.transfer(&contract_id, &freelancer_muxed, &m.amount);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business opens a dispute on a submitted milestone; funds are frozen (no release until resolution).
    pub fn dispute_milestone(env: Env, business: Address, index: u32) {
        business.require_auth();
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.business != business {
            panic!("not business");
        }
        let i = index as usize;
        if i >= project.milestones.len() as usize {
            panic!("invalid milestone index");
        }
        let mut m = project.milestones.get(i).unwrap();
        if m.status != MilestoneStatus::Submitted {
            panic!("milestone not submitted");
        }
        m.status = MilestoneStatus::Disputed;
        project.milestones.set(i, m);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Anyone can call: if approval window has passed, release milestone to freelancer (auto-release).
    pub fn auto_release_if_timeout(env: Env, index: u32) {
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        let now = env.ledger().timestamp();
        let i = index as usize;
        if i >= project.milestones.len() as usize {
            panic!("invalid milestone index");
        }
        let mut m = project.milestones.get(i).unwrap();
        if m.status != MilestoneStatus::Submitted {
            panic!("milestone not submitted");
        }
        let approval_deadline = m.approval_deadline_ts.unwrap_or(0);
        if now <= approval_deadline {
            panic!("approval window not yet passed");
        }
        m.status = MilestoneStatus::Approved;
        project.milestones.set(i, m);
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let freelancer_muxed = MuxedAddress::from(project.freelancer.clone());
        token_client.transfer(&contract_id, &freelancer_muxed, &m.amount);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Freelancer submits final delivery hash. Starts approval window for remaining balance.
    pub fn submit_final(env: Env, freelancer: Address, deliverable_hash: soroban_sdk::BytesN<32>) {
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
        if now > project.final_deadline_ts {
            panic!("past final deadline");
        }
        for i in 0..project.milestones.len() {
            let m = project.milestones.get(i).unwrap();
            if m.status != MilestoneStatus::Approved {
                panic!("not all milestones approved");
            }
        }
        if project.final_delivery_hash.is_some() {
            panic!("final already submitted");
        }
        project.final_delivery_hash = Some(deliverable_hash);
        project.final_approval_deadline_ts = Some(now + project.verification_window_secs);
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Business approves final delivery; releases remaining escrow to freelancer.
    pub fn approve_final(env: Env, business: Address) {
        business.require_auth();
        let project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        if project.business != business {
            panic!("not business");
        }
        if project.final_delivery_hash.is_none() {
            panic!("final not submitted");
        }
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
        let mut updated = project;
        updated.state = ProjectState::Completed;
        env.storage().instance().set(&DataKey::Project, &updated);
    }

    /// Anyone can call: if final approval window passed, auto-release remaining to freelancer.
    pub fn auto_release_final(env: Env) {
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        let deadline = project.final_approval_deadline_ts.unwrap_or(0);
        if env.ledger().timestamp() <= deadline {
            panic!("final approval window not yet passed");
        }
        if project.final_delivery_hash.is_none() {
            panic!("final not submitted");
        }
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
        project.state = ProjectState::Completed;
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// Refund advance to business if freelancer missed deadline (no valid submission in time).
    /// Callable when state is AdvanceDeposited and final_deadline_ts has passed and no full delivery.
    pub fn refund_if_deadline_missed(env: Env) {
        let mut project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state for refund");
        }
        let now = env.ledger().timestamp();
        if now <= project.final_deadline_ts {
            panic!("final deadline not yet passed");
        }
        // Check that not all milestones were completed (otherwise release remaining, not refund).
        let all_done = project
            .milestones
            .iter()
            .all(|m| m.status == MilestoneStatus::Approved);
        if all_done {
            panic!("all milestones done; use finalize not refund");
        }
        project.state = ProjectState::Refunded;
        let token_client = token::Client::new(&env, &project.token);
        let contract_id = env.current_contract_address();
        let balance = token_client.balance(&contract_id);
        token_client.transfer(
            &contract_id,
            &MuxedAddress::from(project.business.clone()),
            &balance,
        );
        env.storage().instance().set(&DataKey::Project, &project);
    }

    /// After all milestones and final delivery are approved, finalize and release any remaining funds.
    pub fn finalize_project(env: Env) {
        let project: ProjectData = env
            .storage()
            .instance()
            .get(&DataKey::Project)
            .unwrap_or_else(|| panic!("project not initialized"));
        if project.state != ProjectState::AdvanceDeposited {
            panic!("invalid state");
        }
        let all_approved = project
            .milestones
            .iter()
            .all(|m| m.status == MilestoneStatus::Approved);
        if !all_approved {
            panic!("not all milestones approved");
        }
        // Release remaining balance to freelancer (advance was already "released" by being in escrow;
        // we've paid out each milestone; remainder goes to freelancer).
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
        let mut updated = project;
        updated.state = ProjectState::Completed;
        env.storage().instance().set(&DataKey::Project, &updated);
    }

    // --- Views ---

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
        let token_client = token::Client::new(&env, &project.token);
        token_client.balance(&env.current_contract_address())
    }
}

mod test;
