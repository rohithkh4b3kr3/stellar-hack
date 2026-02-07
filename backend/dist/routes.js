/**
 * REST API: Trustless Freelance Escrow
 * Backend enforces x402, hashes deliverables, never holds funds.
 */
import { Router } from "express";
import multer from "multer";
import { saveProject, getProject, listProjects } from "./store.js";
import { hashDeliverable, hashToHex, randomId, verifySignature } from "./crypto.js";
import { getProjectState } from "./soroban.js";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();
function projectId(req) {
    const id = req.params.id;
    return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}
// ---------- POST /project/create ----------
router.post("/project/create", (req, res) => {
    try {
        const body = req.body;
        const { businessAddress, tokenId, title, description, totalAmount, deliveryDeadlineTs, verificationWindowSecs, signature, publicKey } = body;
        if (!businessAddress || !tokenId || !title || totalAmount == null || deliveryDeadlineTs == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const total = Number(totalAmount);
        const advance = Math.floor(total * 0.3);
        if (signature && publicKey) {
            const message = JSON.stringify({ businessAddress, tokenId, totalAmount });
            if (!verifySignature(message, signature, publicKey)) {
                return res.status(401).json({ error: "Invalid signature" });
            }
        }
        const id = randomId();
        const project = {
            id,
            businessAddress,
            tokenId,
            title,
            description: description ?? "",
            totalAmount: String(totalAmount),
            advanceAmount: String(advance),
            deliveryDeadlineTs,
            verificationWindowSecs: verificationWindowSecs ?? 259200, // 3 days
            applicants: [],
            createdAt: Date.now(),
        };
        saveProject(project);
        return res.status(201).json({ projectId: id, ...project });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// ---------- GET /projects ----------
router.get("/projects", (_req, res) => {
    return res.json(listProjects());
});
// ---------- GET /project/:id ----------
router.get("/project/:id", (req, res) => {
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    return res.json(project);
});
// ---------- POST /project/:id/apply ----------
router.post("/project/:id/apply", (req, res) => {
    const body = req.body;
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    const addr = body.freelancerAddress ?? req.body?.freelancerAddress;
    if (!addr)
        return res.status(400).json({ error: "freelancerAddress required" });
    if (project.applicants.includes(addr))
        return res.status(200).json(project);
    project.applicants.push(addr);
    saveProject(project);
    return res.status(200).json(project);
});
// ---------- POST /project/:id/accept ----------
router.post("/project/:id/accept", (req, res) => {
    const body = req.body;
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    const addr = body.freelancerAddress ?? req.body?.freelancerAddress;
    if (!addr)
        return res.status(400).json({ error: "freelancerAddress required" });
    if (!project.applicants.includes(addr))
        return res.status(400).json({ error: "Freelancer has not applied" });
    project.freelancerAddress = addr;
    saveProject(project);
    return res.json(project);
});
// ---------- POST /project/:id/set-contract ----------
router.post("/project/:id/set-contract", (req, res) => {
    const body = req.body;
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    if (!body.contractId)
        return res.status(400).json({ error: "contractId required" });
    project.contractId = body.contractId;
    saveProject(project);
    return res.json(project);
});
// ---------- GET /project/:id/start (x402) ----------
router.get("/project/:id/start", async (req, res) => {
    try {
        const project = getProject(projectId(req));
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        if (!project.freelancerAddress)
            return res.status(400).json({ error: "No freelancer accepted yet" });
        if (!project.contractId)
            return res.status(400).json({ error: "Contract not deployed yet. Deploy and set contract ID after accepting freelancer." });
        let state;
        try {
            state = await getProjectState(project.contractId);
        }
        catch {
            state = 0;
        }
        // 0=Created, 1=AdvanceDeposited, 2=DeliverySubmitted, 3=Completed, 4=Refunded
        if (state === 1 || state === 2) {
            return res.status(200).json({
                status: "ready",
                message: state === 1 ? "Advance deposited; work can start." : "Delivery submitted; deposit remaining & approve.",
                contractId: project.contractId,
                projectId: project.id,
                contractState: state,
            });
        }
        if (state === 3)
            return res.status(200).json({ status: "completed", contractId: project.contractId, projectId: project.id, contractState: 3 });
        if (state === 4)
            return res.status(400).json({ error: "Project refunded" });
        res.status(402).set({
            "Content-Type": "application/json",
            "X-Payment-Required": "true",
            "X-Payment-Amount": project.advanceAmount,
            "X-Payment-Asset": project.tokenId,
            "X-Payment-Contract": project.contractId,
        });
        return res.json({
            error: "Payment Required",
            message: "Hiring person must deposit 30% advance to the escrow contract.",
            advanceAmount: project.advanceAmount,
            asset: project.tokenId,
            contractAddress: project.contractId,
            projectId: project.id,
        });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// ---------- POST /project/:id/submit ----------
router.post("/project/:id/submit", upload.single("deliverable"), (req, res) => {
    try {
        const project = getProject(projectId(req));
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        if (!project.contractId)
            return res.status(400).json({ error: "Contract not deployed" });
        const body = (req.body || {});
        const deliverableHashHex = body.deliverableHashHex ?? req.body?.deliverableHashHex;
        let hashHex;
        if (deliverableHashHex && /^[0-9a-fA-F]{64}$/.test(deliverableHashHex)) {
            hashHex = deliverableHashHex;
        }
        else {
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
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// ---------- POST /project/:id/approve ----------
router.post("/project/:id/approve", (req, res) => {
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    return res.json({
        message: "Call contract.approve_delivery(business) from hiring person wallet.",
        projectId: project.id,
        contractId: project.contractId,
    });
});
// ---------- POST /project/:id/refund ----------
router.post("/project/:id/refund", (req, res) => {
    const project = getProject(projectId(req));
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    return res.json({
        message: "Call contract.refund_if_deadline_missed() after delivery deadline passed.",
        projectId: project.id,
        contractId: project.contractId,
    });
});
export default router;
