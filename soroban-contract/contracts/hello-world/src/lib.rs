#![no_std]

use soroban_sdk::{

contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,

};



// ----------------------------------------------------------------------

// 1. CONSTANTS & CONFIGURATION

// ----------------------------------------------------------------------



const CLIENT_CANCEL_WINDOW_SECS: u64 = 6 * 3600; // 6 hours

const HARD_DEADLINE_EXTENSION_SECS: u64 = 7 * 24 * 3600; // 7 days

const PENALTY_PERCENT_PER_DAY: i128 = 5;

const SECS_PER_DAY: u64 = 86400;



// Retention: How long data stays on-chain (Storage Rent)

const LEDGER_THRESHOLD_LOW: u32 = 17280; // ~1 day

const LEDGER_THRESHOLD_HIGH: u32 = 34560; // ~2 days



// ----------------------------------------------------------------------

// 2. DATA STRUCTURES

// ----------------------------------------------------------------------



#[contracttype]

#[derive(Clone, Copy, Debug, PartialEq)]

pub enum JobState {

Funded = 0, // Active

Completed = 1, // Paid out

Cancelled = 2, // Cancelled by client early

Refunded = 3, // Refunded to client after failure

}



#[contracttype]

#[derive(Clone, Debug)]

pub struct Job {

pub id: u64,

pub client: Address,

pub freelancer: Address,

pub token: Address,

pub amount: i128,

pub soft_deadline: u64,

pub hard_deadline: u64,

pub funded_at: u64,

pub state: JobState,

}



#[contracttype]

pub enum DataKey {

Job(u64), // Key: Job ID -> Value: Job Struct

JobCounter, // Key: Counter -> Value: u64

}



// ----------------------------------------------------------------------

// 3. CONTRACT IMPLEMENTATION

// ----------------------------------------------------------------------



#[contract]

pub struct FreelanceContract;



#[contractimpl]

impl FreelanceContract {


/// Create a new job.

/// RETURNS: The new Job ID (u64) so the Frontend can save it.

pub fn create_escrow(

env: Env,

client: Address,

freelancer: Address,

token: Address,

amount: i128,

soft_deadline: u64,

) -> u64 {

// A. Security Checks

client.require_auth(); // <--- CRITICAL: Prevents "InvalidAction" if not signed



if amount <= 0 {

panic!("Amount must be positive");

}

if soft_deadline <= env.ledger().timestamp() {

panic!("Deadline must be in the future");

}



// B. Generate New ID

let mut count: u64 = env.storage().instance().get(&DataKey::JobCounter).unwrap_or(0);

count += 1;



// C. Calculate Dates

let hard_deadline = soft_deadline + HARD_DEADLINE_EXTENSION_SECS;

let funded_at = env.ledger().timestamp();



// D. Transfer Funds (Client -> Contract)

let token_client = token::Client::new(&env, &token);

token_client.transfer(&client, &env.current_contract_address(), &amount);



// E. Save Job Data

let new_job = Job {

id: count,

client: client.clone(),

freelancer: freelancer.clone(),

token: token.clone(),

amount,

soft_deadline,

hard_deadline,

funded_at,

state: JobState::Funded,

};



// Save to Persistent Storage

env.storage().persistent().set(&DataKey::Job(count), &new_job);


// Update Counter

env.storage().instance().set(&DataKey::JobCounter, &count);


// F. Pay Rent (Extend TTL so data doesn't vanish)

env.storage().persistent().extend_ttl(

&DataKey::Job(count),

LEDGER_THRESHOLD_LOW,

LEDGER_THRESHOLD_HIGH,

);



// G. Emit Event

env.events().publish(

(symbol_short!("created"), client, freelancer),

count,

);



return count;

}



/// Complete Job & Pay Freelancer

pub fn complete_job(env: Env, job_id: u64) {

let mut job = get_job_safe(&env, job_id);


// Security: Only client can release funds

job.client.require_auth();



if job.state != JobState::Funded {

panic!("Job is not active");

}



let now = env.ledger().timestamp();

if now >= job.hard_deadline {

panic!("Past hard deadline");

}



// Calculate Payout vs Penalty

let (payout, refund) = if now <= job.soft_deadline {

(job.amount, 0)

} else {

// Late Penalty Logic

let seconds_late = now - job.soft_deadline;

let days_late = (seconds_late + SECS_PER_DAY - 1) / SECS_PER_DAY;


let penalty = (job.amount * (days_late as i128) * PENALTY_PERCENT_PER_DAY) / 100;

let actual_penalty = if penalty > job.amount { job.amount } else { penalty };


(job.amount - actual_penalty, actual_penalty)

};



let token_client = token::Client::new(&env, &job.token);

let contract = env.current_contract_address();



// Transfer Payouts

if payout > 0 {

token_client.transfer(&contract, &job.freelancer, &payout);

}

if refund > 0 {

token_client.transfer(&contract, &job.client, &refund);

}



// Update State

job.state = JobState::Completed;

env.storage().persistent().set(&DataKey::Job(job_id), &job);


env.events().publish((symbol_short!("complete"), job.client), job_id);

}



/// Cancel within 6 hours

pub fn client_cancel_within_6h(env: Env, job_id: u64) {

let mut job = get_job_safe(&env, job_id);

job.client.require_auth();



if job.state != JobState::Funded {

panic!("Job is not active");

}

if env.ledger().timestamp() > job.funded_at + CLIENT_CANCEL_WINDOW_SECS {

panic!("6h window passed");

}



let token_client = token::Client::new(&env, &job.token);

token_client.transfer(&env.current_contract_address(), &job.client, &job.amount);



job.state = JobState::Cancelled;

env.storage().persistent().set(&DataKey::Job(job_id), &job);

}



/// Refund after hard deadline

pub fn claim_refund_after_hard_deadline(env: Env, job_id: u64) {

let mut job = get_job_safe(&env, job_id);

job.client.require_auth();



if job.state != JobState::Funded {

panic!("Job is not active");

}

if env.ledger().timestamp() < job.hard_deadline {

panic!("Hard deadline not passed");

}



let token_client = token::Client::new(&env, &job.token);

token_client.transfer(&env.current_contract_address(), &job.client, &job.amount);



job.state = JobState::Refunded;

env.storage().persistent().set(&DataKey::Job(job_id), &job);

}

}



// ----------------------------------------------------------------------

// 4. HELPERS

// ----------------------------------------------------------------------



fn get_job_safe(env: &Env, job_id: u64) -> Job {

let key = DataKey::Job(job_id);

if !env.storage().persistent().has(&key) {

panic!("Job ID not found");

}

// Refresh TTL every time we access the job

env.storage().persistent().extend_ttl(

&key,

LEDGER_THRESHOLD_LOW,

LEDGER_THRESHOLD_HIGH

);

env.storage().persistent().get(&key).unwrap()

}



mod test;