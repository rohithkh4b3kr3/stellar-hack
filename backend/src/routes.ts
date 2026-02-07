/**
 * REST API: project create, start (x402), milestone submit/approve, refund.
 * Backend never holds funds; all money is in the Soroban contract.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { saveProject, getProject } from "./store.js";
import { hashDeliverable, hashToHex, hexToBuffer, randomId, verifySignature } from "./crypto.js";
import { getProjectState } from "./soroban.js";
import type { CreateProjectBody, MilestoneSubmitBody, MilestoneApproveBody, RefundBody } from "./types.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const router = Router();

// ---------- POST /project/create ----------
// Register a new project (contract already deployed and inited by client).
router.post("/project/create", (req: Request, res: Response) => {
  try {
    const body = req.body as CreateProjectBody;
    const {
      contractId,
      businessAddress,
      freelancerAddress,
      tokenId,
      totalAmount,
      advanceAmount,
      milestoneAmounts,
      milestoneDeadlinesTs,
      finalDeadlineTs,
      verificationWindowSecs,
      signature,
      publicKey,
    } = body;

    if (
      !contractId ||
      !businessAddress ||
      !freelancerAddress ||
      !tokenId ||
      totalAmount == null ||
      advanceAmount == null ||
      !Array.isArray(milestoneAmounts) ||
      !Array.isArray(milestoneDeadlinesTs) ||
      finalDeadlineTs == null ||
      verificationWindowSecs == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (signature && publicKey) {
      const message = JSON.stringify({
        contractId,
        businessAddress,
        freelancerAddress,
        totalAmount,
        advanceAmount,
      });
      if (!verifySignature(message, signature, publicKey)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const id = randomId();
    const project = {
      id,
      contractId,
      businessAddress,
      freelancerAddress,
      tokenId,
      totalAmount: String(totalAmount),
      advanceAmount: String(advanceAmount),
      milestoneAmounts: milestoneAmounts.map(String),
      milestoneDeadlinesTs,
      finalDeadlineTs,
      verificationWindowSecs,
      createdAt: Date.now(),
    };
    saveProject(project);
    return res.status(201).json({ projectId: id, ...project });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ---------- GET /project/:id/start (x402) ----------
// Freelancer requests to start; backend responds 402 until advance is in contract.
router.get("/project/:id/start", async (req: Request, res: Response) => {
  try {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    let state: number;
    try {
      state = await getProjectState(project.contractId);
    } catch {
      state = 0; // assume Created if we can't read
    }
    // 0=Created, 1=AdvanceDeposited, 2=Completed, 3=Refunded
    if (state === 1) {
      return res.status(200).json({
        status: "ready",
        message: "Advance deposited; work can start.",
        contractId: project.contractId,
        projectId: project.id,
      });
    }
    if (state === 2) {
      return res.status(200).json({ status: "completed", contractId: project.contractId, projectId: project.id });
    }
    if (state === 3) {
      return res.status(400).json({ error: "Project refunded" });
    }

    // state === 0: advance not yet deposited -> 402 Payment Required
    res.status(402).set({
      "Content-Type": "application/json",
      "X-Payment-Required": "true",
      "X-Payment-Amount": project.advanceAmount,
      "X-Payment-Asset": project.tokenId,
      "X-Payment-Contract": project.contractId,
    });
    return res.json({
      error: "Payment Required",
      message: "Business must deposit the advance to the escrow contract before work can start.",
      advanceAmount: project.advanceAmount,
      asset: project.tokenId,
      contractAddress: project.contractId,
      projectId: project.id,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ---------- GET /project/:id ----------
router.get("/project/:id", (req: Request, res: Response) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json(project);
});

// ---------- POST /milestone/submit ----------
// Accept deliverable (file or hash), return hash for client to submit on-chain.
router.post(
  "/milestone/submit",
  upload.single("deliverable"),
  (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as MilestoneSubmitBody;
      const projectId = body.projectId ?? req.body?.projectId;
      const milestoneIndex = Number(body.milestoneIndex ?? req.body?.milestoneIndex ?? 0);
      const deliverableHashHex = body.deliverableHashHex ?? req.body?.deliverableHashHex;

      if (!projectId) return res.status(400).json({ error: "projectId required" });

      const project = getProject(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      let hashHex: string;
      if (deliverableHashHex && /^[0-9a-fA-F]{64}$/.test(deliverableHashHex)) {
        hashHex = deliverableHashHex;
      } else {
        const file = req.file;
        const buf = file?.buffer ?? (body.deliverableBase64 ? Buffer.from(body.deliverableBase64, "base64") : null);
        if (!buf || buf.length === 0) {
          return res.status(400).json({ error: "Provide deliverable (file upload or deliverableBase64 or deliverableHashHex)" });
        }
        const hash = hashDeliverable(buf);
        hashHex = hashToHex(hash);
      }

      return res.json({
        projectId,
        milestoneIndex,
        deliverableHashHex: hashHex,
        message: "Submit this hash to the Soroban contract (submit_milestone) from the freelancer wallet.",
      });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  }
);

// ---------- POST /milestone/approve ----------
// Acknowledge; actual approval is on-chain by business.
router.post("/milestone/approve", (req: Request, res: Response) => {
  const body = req.body as MilestoneApproveBody;
  const project = getProject(body.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({
    message: "Call contract.approve_milestone(business, index) from the business wallet.",
    projectId: body.projectId,
    milestoneIndex: body.milestoneIndex,
    contractId: project.contractId,
  });
});

// ---------- POST /project/refund ----------
router.post("/project/refund", (req: Request, res: Response) => {
  const body = req.body as RefundBody;
  const project = getProject(body.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({
    message: "Call contract.refund_if_deadline_missed() (anyone can call after final deadline passed).",
    projectId: body.projectId,
    contractId: project.contractId,
  });
});

export default router;
