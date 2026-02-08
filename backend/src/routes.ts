/**
 * REST API: Trustless Freelance Escrow
 * stellar-contract: create_escrow, complete_job, cancel_within_6h, refund_after_hard_deadline, get_job
 * Backend never holds funds; metadata only. Set ESCROW_CONTRACT_ID and optionally DATABASE_URL.
 */
import { Router, Request, Response } from "express";
import { saveProject, getProject, listProjects } from "./store.js";
import { randomId, verifySignature } from "./crypto.js";
import { getJobState, getJobInfo, simulateCreateEscrow } from "./soroban.js";
import type { CreateProjectBody, SetContractBody, SetJobBody, ApplyBody, ProjectRecord } from "./types.js";

const router = Router();

const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID ?? "";

function projectId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}

/** Inject global escrow contract ID into project for response. */
function withContractId<T extends { contractId?: string }>(project: T): T {
  const contractId = ESCROW_CONTRACT_ID || project.contractId;
  return { ...project, contractId };
}

// ---------- POST /project/create ----------
router.post("/project/create", async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateProjectBody;
    const { businessAddress, tokenId, title, description, totalAmount, deliveryDeadlineTs, verificationWindowSecs, signature, publicKey } = body;

    if (!businessAddress || !title || totalAmount == null || deliveryDeadlineTs == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!tokenId && !process.env.XLM_TOKEN_ID) {
      return res.status(400).json({ error: "tokenId required or set XLM_TOKEN_ID in backend .env" });
    }

    if (signature && publicKey) {
      const message = JSON.stringify({ businessAddress, tokenId, totalAmount });
      if (!verifySignature(message, signature, publicKey)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const id = randomId();
    const tokenIdToUse = tokenId || process.env.XLM_TOKEN_ID;
    if (!tokenIdToUse) {
      return res.status(400).json({ error: "tokenId required or set XLM_TOKEN_ID in backend .env" });
    }
    const project: ProjectRecord = {
      id,
      businessAddress,
      tokenId: tokenIdToUse,
      title,
      description: description ?? "",
      totalAmount: String(totalAmount),
      advanceAmount: String(totalAmount), // 100% upfront (no advance split)
      deliveryDeadlineTs,
      verificationWindowSecs: verificationWindowSecs ?? 259200, // 3 days
      applicants: [] as string[],
      createdAt: Date.now(),
    };
    await saveProject(project);
    return res.status(201).json(withContractId({ ...project }));
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ---------- GET /projects ----------
router.get("/projects", async (_req: Request, res: Response) => {
  const list = await listProjects();
  return res.json(list.map(withContractId));
});

// ---------- GET /project/:id ----------
router.get("/project/:id", async (req: Request, res: Response) => {
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json(withContractId(project));
});

// ---------- POST /project/:id/apply ----------
router.post("/project/:id/apply", async (req: Request, res: Response) => {
  const body = req.body as ApplyBody;
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  const addr = body.freelancerAddress ?? req.body?.freelancerAddress;
  if (!addr) return res.status(400).json({ error: "freelancerAddress required" });
  if (project.applicants.includes(addr)) return res.status(200).json(withContractId(project));
  project.applicants.push(addr);
  await saveProject(project);
  return res.status(200).json(withContractId(project));
});

// ---------- POST /project/:id/accept ----------
router.post("/project/:id/accept", async (req: Request, res: Response) => {
  const body = req.body as ApplyBody;
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  const addr = body.freelancerAddress ?? req.body?.freelancerAddress;
  if (!addr) return res.status(400).json({ error: "freelancerAddress required" });
  if (!project.applicants.includes(addr)) return res.status(400).json({ error: "Freelancer has not applied" });
  project.freelancerAddress = addr;
  await saveProject(project);
  return res.json(withContractId(project));
});

// ---------- POST /project/:id/set-contract ----------
router.post("/project/:id/set-contract", async (req: Request, res: Response) => {
  const body = req.body as SetContractBody;
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!body.contractId) return res.status(400).json({ error: "contractId required" });
  if (!ESCROW_CONTRACT_ID) project.contractId = body.contractId;
  await saveProject(project);
  return res.json(withContractId(project));
});

// ---------- POST /project/:id/set-job ----------
router.post("/project/:id/set-job", async (req: Request, res: Response) => {
  const body = req.body as SetJobBody;
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (body.jobId == null || typeof body.jobId !== "number") return res.status(400).json({ error: "jobId (number) required" });
  project.jobId = body.jobId;
  await saveProject(project);
  return res.json(withContractId(project));
});

// ---------- POST /preflight/escrow ----------
router.post("/preflight/escrow", async (req: Request, res: Response) => {
  try {
    const { client, freelancer, tokenId, amount, softDeadline } = req.body as {
      client?: string;
      freelancer?: string;
      tokenId?: string;
      amount?: string;
      softDeadline?: number;
    };
    if (!client || !freelancer || !tokenId || amount == null || softDeadline == null) {
      return res.status(400).json({ ok: false, error: "Missing client, freelancer, tokenId, amount, or softDeadline" });
    }
    if (!ESCROW_CONTRACT_ID) {
      return res.status(400).json({ ok: false, error: "ESCROW_CONTRACT_ID not set" });
    }
    const result = await simulateCreateEscrow(ESCROW_CONTRACT_ID, client, freelancer, tokenId, String(amount), Number(softDeadline));
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// ---------- GET /project/:id/start ----------
// FreelanceContract: JobState Funded=0, Completed=1, Cancelled=2, Refunded=3
router.get("/project/:id/start", async (req: Request, res: Response) => {
  try {
    const project = await getProject(projectId(req));
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.freelancerAddress) return res.status(400).json({ error: "No freelancer accepted yet" });
    const contractId = ESCROW_CONTRACT_ID || project.contractId;
    if (!contractId) return res.status(400).json({ error: "ESCROW_CONTRACT_ID not set. Deploy contract once and set in backend .env." });

    // If no jobId yet, client must call create_escrow (funds in one tx)
    if (!project.jobId) {
      return res.status(200).json({
        status: "payment_required",
        message: "Pay full amount via create_escrow. Client transfers funds in one tx.",
        totalAmount: project.totalAmount,
        asset: project.tokenId,
        contractAddress: contractId,
        projectId: project.id,
      });
    }

    let state: number;
    try {
      state = await getJobState(contractId, project.jobId);
    } catch {
      state = -1;
    }
    const jobInfo = await getJobInfo(contractId, project.jobId).catch(() => null);

    // Funded=0: ready for work
    if (state === 0) {
      return res.status(200).json({
        status: "ready",
        message: "Full amount in escrow. Client can complete_job or cancel_within_6h.",
        contractId,
        projectId: project.id,
        jobId: project.jobId,
        contractState: state,
        jobFundedAt: jobInfo?.funded_at,
        jobSoftDeadline: jobInfo?.soft_deadline,
        jobHardDeadline: jobInfo?.hard_deadline,
      });
    }
    // Completed=1, Cancelled=2, Refunded=3
    if (state === 1) return res.status(200).json({ status: "completed", contractId, projectId: project.id, jobId: project.jobId, contractState: 1 });
    if (state === 2) return res.status(200).json({ status: "cancelled", contractId, projectId: project.id, jobId: project.jobId, contractState: 2 });
    if (state === 3) return res.status(200).json({ status: "refunded", contractId, projectId: project.id, jobId: project.jobId, contractState: 3 });

    return res.status(200).json({
      status: "payment_required",
      message: "Pay full amount via create_escrow.",
      totalAmount: project.totalAmount,
      asset: project.tokenId,
      contractAddress: contractId,
      projectId: project.id,
      jobId: project.jobId,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
