//! Escrow contract storage. Single delivery flow: 30% advance, full payment on approval.
//! Contract is sole escrow holder; no admin.

use soroban_sdk::contracttype;

/// Project lifecycle state.
#[derive(Clone, Debug, Eq, PartialEq, contracttype)]
pub enum ProjectState {
    /// Created; waiting for advance deposit.
    Created,
    /// Advance deposited; freelancer can submit delivery.
    AdvanceDeposited,
    /// Delivery submitted; approval window active.
    DeliverySubmitted,
    /// Completed; full payment released to freelancer.
    Completed,
    /// Refunded to business (deadline missed).
    Refunded,
}

#[derive(Clone, contracttype)]
pub struct ProjectData {
    pub business: soroban_sdk::Address,
    pub freelancer: soroban_sdk::Address,
    pub token: soroban_sdk::Address,
    pub total_amount: i128,
    /// Fixed 30% advance (locked first).
    pub advance_amount: i128,
    /// Unix timestamp: freelancer must deliver by this time.
    pub delivery_deadline: u64,
    /// Seconds after submission before auto-release (e.g. 3 days = 259200).
    pub verification_window_secs: u64,
    pub state: ProjectState,
    /// Set when freelancer submits delivery hash.
    pub delivery_hash: Option<soroban_sdk::BytesN<32>>,
    /// Approval window ends at this timestamp.
    pub approval_deadline_ts: Option<u64>,
}

#[derive(Clone, contracttype)]
pub enum DataKey {
    Project,
}
