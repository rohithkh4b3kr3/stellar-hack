/**
 * REST API: Trustless Freelance Escrow
 * Backend enforces x402, hashes deliverables, never holds funds.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { saveProject, getProject, listProjects } from "./store.js";
import { hashDeliverable, hashToHex, randomId, verifySignature } from "./crypto.js";
import { getJobState, getJobInfo } from "./soroban.js";
import type { CreateProjectBody, SetContractBody, SetJobBody, ApplyBody, SubmitBody, ProjectRecord } from "./types.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
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
    return res.status(201).json({ projectId: id, ...withContractId({ ...project }) });
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
        message: "Pay full amount via create_escrow. Client transfers funds in one transaction.",
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
        message: "Full amount in escrow; freelancer can deliver. Client can complete_job (on time=100%, late=5% per day penalty) or cancel within 6h.",
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

// ---------- POST /project/:id/submit ----------
router.post(
  "/project/:id/submit",
  upload.single("deliverable"),
  async (req: Request, res: Response) => {
    try {
      const project = await getProject(projectId(req));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!project.contractId) return res.status(400).json({ error: "Contract not deployed" });
      const body = (req.body || {}) as SubmitBody;
      const deliverableHashHex = body.deliverableHashHex ?? req.body?.deliverableHashHex;

      let hashHex: string;
      if (deliverableHashHex && /^[0-9a-fA-F]{64}$/.test(deliverableHashHex)) {
        hashHex = deliverableHashHex;
      } else {
        const file = req.file;
        const buf = file?.buffer ?? (body.deliverableBase64 ? Buffer.from(body.deliverableBase64, "base64") : null);
        if (!buf || buf.length === 0) {
          return res.status(400).json({ error: "Provide deliverable (file upload, deliverableBase64, or deliverableHashHex)" });
        }
        hashHex = hashToHex(hashDeliverable(buf));
      }

      return res.json({
        projectId: project.id,
        deliverableHashHex: hashHex,
        contractId: project.contractId,
        message: "Call contract.submit_delivery(freelancer, hash) from freelancer wallet.",
      });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  }
);

// ---------- POST /project/:id/approve ----------
router.post("/project/:id/approve", async (req: Request, res: Response) => {
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({
    message: "Call contract.approve_delivery(business) from hiring person wallet.",
    projectId: project.id,
    contractId: project.contractId,
  });
});

// ---------- POST /project/:id/refund ----------
router.post("/project/:id/refund", async (req: Request, res: Response) => {
  const project = await getProject(projectId(req));
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({
    message: "Call contract.refund_if_deadline_missed() after delivery deadline passed.",
    projectId: project.id,
    contractId: project.contractId,
  });
});

export default router;
