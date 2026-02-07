import React, { useState, useEffect, useCallback } from "react";
import {
  createProject,
  getProject,
  projectStart,
  milestoneSubmitFile,
  type Project,
  type StartResponse,
} from "./api";
import { connectFreighter, getPublicKey, isFreighterAvailable } from "./wallet";
import "./index.css";

function Countdown({ deadlineTs, label }: { deadlineTs: number; label: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      if (now >= deadlineTs) {
        setText(`${label}: passed`);
        return;
      }
      const d = deadlineTs - now;
      const days = Math.floor(d / 86400);
      const h = Math.floor((d % 86400) / 3600);
      const m = Math.floor((d % 3600) / 60);
      setText(`${label}: ${days}d ${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [deadlineTs, label]);
  return <span className={text.includes("passed") ? "timer past" : "timer"}>{text}</span>;
}

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [freighterOk, setFreighterOk] = useState(false);
  const [view, setView] = useState<"home" | "create" | "project">("home");
  const [projectId, setProjectId] = useState("");
  const [project, setProjectState] = useState<Project | null>(null);
  const [startInfo, setStartInfo] = useState<StartResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    const ok = await isFreighterAvailable();
    setFreighterOk(ok);
    if (ok) {
      const pk = await getPublicKey();
      setWallet(pk ?? null);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const connect = async () => {
    setError("");
    try {
      const pk = await connectFreighter();
      setWallet(pk);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadProject = async (id: string) => {
    setError("");
    try {
      const p = await getProject(id);
      setProjectState(p);
      setProjectId(id);
      const start = await projectStart(id);
      setStartInfo(start);
      setView("project");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <span className="title">Escrow MVP</span>
        <div className="wallet">
          {wallet ? (
            <span title={wallet}>{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : freighterOk ? (
            <button className="btn" onClick={connect}>Connect Wallet</button>
          ) : (
            <span>Install Freighter</span>
          )}
        </div>
      </header>

      {error && (
        <div className="card" style={{ borderColor: "#b91c1c" }}>
          {error}
        </div>
      )}

      {view === "home" && (
        <>
          <div className="card">
            <h3>Open project</h3>
            <div className="form-group">
              <label>Project ID</label>
              <input
                type="text"
                placeholder="Paste project ID"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <button className="btn" onClick={() => loadProject(projectId)} disabled={!projectId.trim()}>
              Load
            </button>
          </div>
          <div className="card">
            <button className="btn" onClick={() => setView("create")}>Create project</button>
          </div>
        </>
      )}

      {view === "create" && (
        <CreateForm
          wallet={wallet}
          onCreated={(id) => {
            setProjectId(id);
            loadProject(id);
          }}
          onBack={() => setView("home")}
          setError={setError}
          setLoading={setLoading}
        />
      )}

      {view === "project" && project && (
        <ProjectDashboard
          project={project}
          startInfo={startInfo}
          wallet={wallet}
          onBack={() => {
            setView("home");
            setProjectState(null);
            setStartInfo(null);
          }}
          setError={setError}
          setLoading={setLoading}
        />
      )}
    </div>
  );
}

function CreateForm({
  wallet,
  onCreated,
  onBack,
  setError,
  setLoading,
}: {
  wallet: string | null;
  onCreated: (id: string) => void;
  onBack: () => void;
  setError: (s: string) => void;
  setLoading: (b: boolean) => void;
}) {
  const [contractId, setContractId] = useState("");
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [totalAmount, setTotalAmount] = useState("1000");
  const [advanceAmount, setAdvanceAmount] = useState("200");
  const [milestoneAmounts, setMilestoneAmounts] = useState("300,500");
  const [milestoneDeadlines, setMilestoneDeadlines] = useState(""); // comma-sep unix ts or days from now
  const [finalDeadlineDays, setFinalDeadlineDays] = useState("30");
  const [verificationDays, setVerificationDays] = useState("7");

  const submit = async () => {
    if (!wallet) {
      setError("Connect wallet first");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const amounts = milestoneAmounts.split(",").map((s) => s.trim()).filter(Boolean);
      const now = Math.floor(Date.now() / 1000);
      const day = 86400;
      const finalTs = now + Number(finalDeadlineDays || 30) * day;
      const verificationSecs = Number(verificationDays || 7) * day;
      let deadlineStrs: string[];
      if (milestoneDeadlines.trim()) {
        deadlineStrs = milestoneDeadlines.split(",").map((s) => s.trim());
      } else {
        deadlineStrs = amounts.map((_, i) => String(now + (i + 1) * 7 * day));
      }
      const milestoneDeadlinesTs = deadlineStrs.map((s) => (s.match(/^\d+$/) ? Number(s) : now + Number(s) * day));
      const body = {
        contractId: contractId.trim(),
        businessAddress: wallet,
        freelancerAddress: freelancerAddress.trim(),
        tokenId: tokenId.trim(),
        totalAmount: totalAmount.trim(),
        advanceAmount: advanceAmount.trim(),
        milestoneAmounts: amounts,
        milestoneDeadlinesTs,
        finalDeadlineTs: finalTs,
        verificationWindowSecs: verificationSecs,
      };
      const res = await createProject(body);
      onCreated(res.projectId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Create project</h3>
      <p style={{ fontSize: "0.875rem", color: "#a1a1aa" }}>
        Deploy the escrow contract first (e.g. via Stellar Lab), run init_project, then register here.
      </p>
      <div className="form-group">
        <label>Contract ID</label>
        <input value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="C..." />
      </div>
      <div className="form-group">
        <label>Freelancer address</label>
        <input value={freelancerAddress} onChange={(e) => setFreelancerAddress(e.target.value)} placeholder="G..." />
      </div>
      <div className="form-group">
        <label>Token contract ID</label>
        <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="C..." />
      </div>
      <div className="form-group">
        <label>Total amount (stroops/smallest unit)</label>
        <input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Advance amount</label>
        <input value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Milestone amounts (comma-sep)</label>
        <input value={milestoneAmounts} onChange={(e) => setMilestoneAmounts(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Final deadline (days from now)</label>
        <input value={finalDeadlineDays} onChange={(e) => setFinalDeadlineDays(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Verification window (days)</label>
        <input value={verificationDays} onChange={(e) => setVerificationDays(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button className="btn" onClick={submit} disabled={!contractId || !freelancerAddress || !tokenId}>
          Register project
        </button>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function ProjectDashboard({
  project,
  startInfo,
  wallet,
  onBack,
  setError,
  setLoading,
}: {
  project: Project;
  startInfo: StartResponse | null;
  wallet: string | null;
  onBack: () => void;
  setError: (s: string) => void;
  setLoading: (b: boolean) => void;
}) {
  const [milestoneFile, setMilestoneFile] = useState<File | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [hashResult, setHashResult] = useState<{ hash: string; index: number } | null>(null);
  const isBusiness = wallet === project.businessAddress;
  const isFreelancer = wallet === project.freelancerAddress;

  const requestStart = () => {
    if (!startInfo?.contractAddress) return;
    const msg = `Deposit advance: ${startInfo.advanceAmount} to contract ${startInfo.contractAddress}. Then call deposit_advance(business) from the business wallet.`;
    setError(msg);
  };

  const submitMilestoneFile = async () => {
    if (!milestoneFile || wallet !== project.freelancerAddress) return;
    setError("");
    setLoading(true);
    try {
      const form = new FormData();
      form.set("projectId", project.id);
      form.set("milestoneIndex", String(milestoneIndex));
      form.set("deliverable", milestoneFile);
      const api = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const r = await fetch(`${api}/milestone/submit`, { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Submit failed");
      setHashResult({ hash: data.deliverableHashHex, index: milestoneIndex });
      setError("Hash computed. Submit this hash to the contract (submit_milestone) from your Freighter wallet.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const approveMilestone = (index: number) => {
    setError(
      `Call contract.approve_milestone(business, ${index}) from the business wallet (Freighter) on contract ${project.contractId}`
    );
  };

  return (
    <>
      <div className="card">
        <h3>Project {project.id}</h3>
        <p><strong>Contract:</strong> {project.contractId.slice(0, 12)}...</p>
        <p><strong>Advance:</strong> {project.advanceAmount} | <strong>Total:</strong> {project.totalAmount}</p>
        {startInfo?.advanceAmount && startInfo?.contractAddress && (
          <p className="timer">
            Payment required: {startInfo.advanceAmount} to {startInfo.contractAddress}
          </p>
        )}
        {startInfo?.status === "ready" && <p style={{ color: "#86efac" }}>Advance deposited — work can start.</p>}
        {isBusiness && startInfo?.advanceAmount && startInfo?.contractAddress && (
          <button className="btn" onClick={requestStart}>Show deposit instructions</button>
        )}
        <button className="btn secondary" onClick={onBack} style={{ marginTop: "0.5rem" }}>Back to list</button>
      </div>

      <div className="card">
        <h3>Milestones</h3>
        {project.milestoneAmounts.map((amt, i) => (
          <div key={i} className="milestone-row">
            <span>Milestone {i + 1}: {amt}</span>
            <Countdown deadlineTs={project.milestoneDeadlinesTs[i] ?? 0} label="Due" />
            {isFreelancer && (
              <>
                <input
                  type="file"
                  onChange={(e) => {
                    setMilestoneIndex(i);
                    setMilestoneFile(e.target.files?.[0] ?? null);
                  }}
                />
                <button
                  className="btn"
                  onClick={submitMilestoneFile}
                  disabled={!milestoneFile || milestoneIndex !== i}
                >
                  Submit deliverable
                </button>
              </>
            )}
            {isBusiness && (
              <>
                <button className="btn" onClick={() => approveMilestone(i)}>Approve</button>
                <button className="btn secondary" onClick={() => setError(`Call contract.dispute_milestone(business, ${i}) to freeze funds.`)}>Dispute</button>
              </>
            )}
          </div>
        ))}
      </div>

      {hashResult && (
        <div className="card">
          <p>Deliverable hash (submit to contract if needed): <code>{hashResult.hash}</code></p>
        </div>
      )}
    </>
  );
}
