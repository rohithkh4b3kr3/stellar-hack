//! Escrow contract storage keys and types.
//! All project state is stored in instance storage; only the contract holds funds.

use soroban_sdk::contracttype;

/// Project lifecycle state.
#[derive(Clone, Debug, Eq, PartialEq, contracttype)]
pub enum ProjectState {
    /// Created, waiting for advance deposit.
    Created,
    /// Advance deposited; freelancer can submit milestones.
    AdvanceDeposited,
    /// All milestones and final delivery done; can finalize.
    Completed,
    /// Refunded to business (deadline missed or dispute).
    Refunded,
}

/// Single milestone: amount, deadline (unix timestamp), status.
#[derive(Clone, Debug, Eq, PartialEq, contracttype)]
pub enum MilestoneStatus {
    Pending,
    Submitted,   // hash submitted, waiting approval or timeout
    Approved,    // funds released
    Disputed,    // funds frozen
}

#[derive(Clone, Debug, contracttype)]
pub struct Milestone {
    pub amount: i128,
    /// Unix timestamp by which freelancer must submit.
    pub deadline_ts: u64,
    pub status: MilestoneStatus,
    /// Deliverable hash (set when submitted).
    pub deliverable_hash: Option<soroban_sdk::BytesN<32>>,
    /// Approval window ends at this timestamp (submission_ts + window).
    pub approval_deadline_ts: Option<u64>,
}

#[derive(Clone, contracttype)]
pub struct ProjectData {
    pub business: soroban_sdk::Address,
    pub freelancer: soroban_sdk::Address,
    pub token: soroban_sdk::Address,
    pub total_amount: i128,
    pub advance_amount: i128,
    /// Final delivery deadline (unix timestamp).
    pub final_deadline_ts: u64,
    /// Verification window in seconds (e.g. 7 days).
    pub verification_window_secs: u64,
    pub state: ProjectState,
    pub milestones: soroban_sdk::Vec<Milestone>,
    /// Set when freelancer submits final delivery.
    pub final_delivery_hash: Option<soroban_sdk::BytesN<32>>,
    /// Approval window end for final delivery.
    pub final_approval_deadline_ts: Option<u64>,
}

/// Instance storage key for the single project (one project per contract instance).
#[derive(Clone, contracttype)]
pub enum DataKey {
    Project,
}
