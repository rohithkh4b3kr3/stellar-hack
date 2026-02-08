import { getPool } from "./db.js";
import type { ProjectRecord } from "./types.js";

const memory = new Map<string, ProjectRecord>();

function rowToProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    contractId: (row.contract_id as string) ?? undefined,
    jobId: row.job_id != null ? Number(row.job_id) : undefined,
    businessAddress: String(row.business_address),
    freelancerAddress: (row.freelancer_address as string) ?? undefined,
    tokenId: String(row.token_id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    totalAmount: String(row.total_amount ?? ""),
    advanceAmount: String(row.advance_amount ?? row.total_amount ?? ""),
    deliveryDeadlineTs: Number(row.delivery_deadline_ts),
    verificationWindowSecs: Number(row.verification_window_secs ?? 259200),
    applicants: Array.isArray(row.applicants) ? (row.applicants as string[]) : [],
    createdAt: Number(row.created_at),
  };
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  const pool = getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO projects (
        id, contract_id, job_id, business_address, freelancer_address, token_id,
        title, description, total_amount, advance_amount, delivery_deadline_ts,
        verification_window_secs, applicants, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        contract_id = COALESCE(EXCLUDED.contract_id, projects.contract_id),
        job_id = COALESCE(EXCLUDED.job_id, projects.job_id),
        freelancer_address = COALESCE(EXCLUDED.freelancer_address, projects.freelancer_address),
        applicants = EXCLUDED.applicants`,
      [
        project.id,
        project.contractId ?? null,
        project.jobId ?? null,
        project.businessAddress,
        project.freelancerAddress ?? null,
        project.tokenId,
        project.title,
        project.description,
        project.totalAmount,
        project.advanceAmount,
        project.deliveryDeadlineTs,
        project.verificationWindowSecs,
        JSON.stringify(project.applicants),
        project.createdAt,
      ]
    );
    return;
  }
  memory.set(project.id, project);
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  const pool = getPool();
  if (pool) {
    const result = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [id]
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return rowToProject(row);
  }
  return memory.get(id);
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const pool = getPool();
  if (pool) {
    const result = await pool.query(
      "SELECT * FROM projects ORDER BY created_at DESC"
    );
    return result.rows.map(rowToProject);
  }
  return Array.from(memory.values());
}

export async function getProjectByContractId(contractId: string): Promise<ProjectRecord | undefined> {
  const pool = getPool();
  if (pool) {
    const result = await pool.query(
      "SELECT * FROM projects WHERE contract_id = $1",
      [contractId]
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return rowToProject(row);
  }
  return (await listProjects()).find((p) => p.contractId === contractId);
}
