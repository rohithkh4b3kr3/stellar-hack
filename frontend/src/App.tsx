import React, { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  createProject,
  getProject,
  applyToProject,
  acceptFreelancer,
  setProjectContract,
  projectStart,
  submitDelivery,
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

type Role = "hiring" | "freelancer" | null;

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [freighterOk, setFreighterOk] = useState(false);
  const [view, setView] = useState<"landing" | "hiring" | "freelancer" | "create" | "project">("landing");
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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

  const loadProjects = useCallback(async () => {
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const openProject = async (id: string) => {
    setError("");
    try {
      const p = await getProject(id);
      setProject(p);
      setProjectId(id);
      const start = await projectStart(id);
      setStartInfo(start);
      setView("project");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Landing
  if (view === "landing") {
    return (
      <div className="app">
        <header className="header">
          <span className="title">Trustless Escrow</span>
          {wallet ? (
            <span className="wallet" title={wallet}>{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : freighterOk ? (
            <button className="btn" onClick={connect}>Connect Wallet</button>
          ) : (
            <span className="wallet">Install Freighter</span>
          )}
        </header>
        {error && <div className="error-msg">{error}</div>}
        <div className="landing">
          <h1>Trustless Freelance Escrow</h1>
          <p>Payments enforced by protocol. No trust required.</p>
          {!wallet ? (
            <button className="role-btn" onClick={connect}>Connect Wallet to Continue</button>
          ) : (
            <div className="role-btns">
              <button
                className="role-btn"
                onClick={() => {
                  setRole("hiring");
                  setView("hiring");
                  loadProjects();
                }}
              >
                Login as Hiring Person
              </button>
              <button
                className="role-btn"
                onClick={() => {
                  setRole("freelancer");
                  setView("freelancer");
                  loadProjects();
                }}
              >
                Login as Freelancer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Hiring dashboard
  if (view === "hiring") {
    const myProjects = projects.filter((p) => p.businessAddress === wallet);
    return (
      <div className="app">
        <header className="header">
          <span className="title">Hiring Dashboard</span>
          <div className="wallet">
            <span title={wallet ?? ""}>{wallet?.slice(0, 6)}...{wallet?.slice(-4)}</span>
            <button className="btn secondary" style={{ marginLeft: "0.5rem" }} onClick={() => setView("landing")}>Switch Role</button>
          </div>
        </header>
        {error && <div className="error-msg">{error}</div>}
        <div className="card">
          <h3>My Projects</h3>
          {myProjects.length === 0 ? (
            <p style={{ color: "#666" }}>No projects yet. Create one below.</p>
          ) : (
            myProjects.map((p) => (
              <div key={p.id} className="project-row">
                <div>
                  <strong>{p.title}</strong>
                  <span style={{ marginLeft: "0.5rem", color: "#666" }}>{p.totalAmount} / 30% advance: {p.advanceAmount}</span>
                </div>
                <button className="btn" onClick={() => openProject(p.id)}>Open</button>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <button className="btn" onClick={() => setView("create")}>Post Project</button>
        </div>
      </div>
    );
  }

  // Freelancer dashboard
  if (view === "freelancer") {
    const openProjects = projects.filter((p) => !p.freelancerAddress || p.freelancerAddress === wallet);
    const myAccepted = projects.filter((p) => p.freelancerAddress === wallet);
    return (
      <div className="app">
        <header className="header">
          <span className="title">Freelancer Dashboard</span>
          <div className="wallet">
            <span title={wallet ?? ""}>{wallet?.slice(0, 6)}...{wallet?.slice(-4)}</span>
            <button className="btn secondary" style={{ marginLeft: "0.5rem" }} onClick={() => setView("landing")}>Switch Role</button>
          </div>
        </header>
        {error && <div className="error-msg">{error}</div>}
        <div className="card">
          <h3>My Active Projects</h3>
          {myAccepted.length === 0 ? (
            <p style={{ color: "#666" }}>None. Apply to projects below.</p>
          ) : (
            myAccepted.map((p) => (
              <div key={p.id} className="project-row">
                <div>
                  <strong>{p.title}</strong>
                  <span style={{ marginLeft: "0.5rem", color: "#666" }}>{p.totalAmount}</span>
                </div>
                <button className="btn" onClick={() => openProject(p.id)}>Open</button>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <h3>Open Projects</h3>
          {openProjects.filter((p) => !p.freelancerAddress).length === 0 ? (
            <p style={{ color: "#666" }}>No open projects.</p>
          ) : (
            openProjects
              .filter((p) => !p.freelancerAddress)
              .map((p) => (
                <div key={p.id} className="project-row">
                  <div>
                    <strong>{p.title}</strong>
                    <span style={{ marginLeft: "0.5rem", color: "#666" }}>{p.totalAmount}</span>
                    <Countdown deadlineTs={p.deliveryDeadlineTs} label="Due" />
                  </div>
                  <button
                    className="btn"
                    onClick={async () => {
                      if (!wallet) return;
                      setError("");
                      try {
                        await applyToProject(p.id, wallet);
                        setError("Applied.");
                        loadProjects();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                    disabled={p.applicants.includes(wallet ?? "")}
                  >
                    {p.applicants.includes(wallet ?? "") ? "Applied" : "Apply"}
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    );
  }

  // Create project
  if (view === "create") {
    return (
      <CreateForm
        wallet={wallet}
        onCreated={(id) => {
          setProjectId(id);
          openProject(id);
        }}
        onBack={() => setView("hiring")}
        setError={setError}
        loadProjects={loadProjects}
      />
    );
  }

  // Project detail
  if (view === "project" && project) {
    return (
      <ProjectDetail
        project={project}
        startInfo={startInfo}
        wallet={wallet}
        error={error}
        onBack={() => {
          setView(role === "hiring" ? "hiring" : "freelancer");
          setProject(null);
          setStartInfo(null);
          loadProjects();
        }}
        setError={setError}
        loadProject={async () => {
          const p = await getProject(project.id);
          setProject(p);
        }}
      />
    );
  }

  return null;
}

function CreateForm({
  wallet,
  onCreated,
  onBack,
  setError,
  loadProjects,
}: {
  wallet: string | null;
  onCreated: (id: string) => void;
  onBack: () => void;
  setError: (s: string) => void;
  loadProjects: () => void;
}) {
  const [tokenId, setTokenId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("100");
  const [deadlineDays, setDeadlineDays] = useState("14");

  const submit = async () => {
    if (!wallet) {
      setError("Connect wallet first");
      return;
    }
    setError("");
    try {
      const now = Math.floor(Date.now() / 1000);
      const deliveryTs = now + Number(deadlineDays || 14) * 86400;
      const res = await createProject({
        businessAddress: wallet,
        tokenId: tokenId.trim(),
        title: title.trim(),
        description: description.trim(),
        totalAmount: totalAmount.trim(),
        deliveryDeadlineTs: deliveryTs,
      });
      loadProjects();
      onCreated(res.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <span className="title">Post Project</span>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </header>
      <div className="card">
        <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Create project first. After you accept a freelancer, deploy the escrow contract and add its ID.
        </p>
        <div className="form-group">
          <label>Project Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Logo design" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope of work" />
        </div>
        <div className="form-group">
          <label>Token ID</label>
          <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="C..." />
        </div>
        <div className="form-group">
          <label>Total Payment (smallest unit)</label>
          <input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="100" />
        </div>
        <div className="form-group">
          <label>Delivery Deadline (days)</label>
          <input value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn" onClick={submit} disabled={!tokenId || !title}>
            Create
          </button>
          <button className="btn secondary" onClick={onBack}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SetContractForm({ projectId, onSet, setError }: { projectId: string; onSet: () => Promise<void>; setError: (s: string) => void }) {
  const [contractId, setContractId] = useState("");
  return (
    <div className="card">
      <h3>Set Contract ID</h3>
      <p style={{ color: "#666", fontSize: "0.875rem" }}>After deploying escrow and calling init_project with accepted freelancer:</p>
      <div className="form-group" style={{ marginTop: "0.5rem" }}>
        <label>Contract ID</label>
        <input value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="C..." />
      </div>
      <button
        className="btn"
        onClick={async () => {
          setError("");
          try {
            await setProjectContract(projectId, contractId.trim());
            await onSet();
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        disabled={!contractId.trim()}
      >
        Set Contract
      </button>
    </div>
  );
}

function ProjectDetail({
  project,
  startInfo,
  wallet,
  error,
  onBack,
  setError,
  loadProject,
}: {
  project: Project;
  startInfo: StartResponse | null;
  wallet: string | null;
  error: string;
  onBack: () => void;
  setError: (s: string) => void;
  loadProject: () => Promise<void>;
}) {
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [hashResult, setHashResult] = useState<string | null>(null);
  const isHiring = wallet === project.businessAddress;
  const isFreelancer = wallet === project.freelancerAddress;

  const handleSubmitDelivery = async () => {
    if (!deliverableFile || !isFreelancer) return;
    setError("");
    try {
      const res = await submitDelivery(project.id, deliverableFile);
      setHashResult(res.deliverableHashHex);
      setError(`Hash: ${res.deliverableHashHex}. Call contract.submit_delivery(freelancer, hash) on ${res.contractId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <span className="title">{project.title}</span>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </header>
      {error && <div className="error-msg">{error}</div>}
      <div className="card">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <p><strong>Total:</strong> {project.totalAmount} | <strong>30% Advance:</strong> {project.advanceAmount}</p>
        {project.contractId ? (
          <p><strong>Contract:</strong> <span className="chip">{project.contractId}</span></p>
        ) : (
          <p><strong>Contract:</strong> Not deployed yet. Deploy after accepting a freelancer, then set contract ID below.</p>
        )}
        <Countdown deadlineTs={project.deliveryDeadlineTs} label="Delivery due" />
        {startInfo?.advanceAmount && startInfo?.contractAddress && (
          <p style={{ marginTop: "0.5rem" }}>402: Pay {startInfo.advanceAmount} to contract, then call deposit_advance(business).</p>
        )}
        {startInfo?.status === "ready" && <p style={{ marginTop: "0.5rem" }}>Advance locked. Work can start.</p>}
        {isHiring && startInfo?.contractAddress && (
          <button className="btn" onClick={() => setError(`Deposit ${startInfo?.advanceAmount} to ${startInfo?.contractAddress}, then deposit_advance.`)}>
            Show deposit info
          </button>
        )}
      </div>

      {isHiring && project.applicants.length > 0 && (
        <div className="card">
          <h3>Applicants</h3>
          {project.applicants.map((addr) => (
            <div key={addr} className="project-row">
              <span className="chip" title={addr}>{addr.slice(0, 8)}...</span>
              <button
                className="btn"
                onClick={async () => {
                  setError("");
                  try {
                    await acceptFreelancer(project.id, addr);
                    await loadProject();
                    setError("Accepted. Deploy escrow contract (init_project with this freelancer), then add contract ID below.");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                disabled={!!project.freelancerAddress}
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {isHiring && project.freelancerAddress && !project.contractId && (
        <SetContractForm projectId={project.id} onSet={loadProject} setError={setError} />
      )}

      {isFreelancer && !startInfo?.status && startInfo?.advanceAmount && (
        <div className="card">
          <h3>Waiting for Advance</h3>
          <p>Hiring person must deposit 30% advance ({startInfo.advanceAmount}) to the contract before you can start. You will see &quot;Submit Delivery&quot; when ready.</p>
        </div>
      )}
      {isFreelancer && startInfo?.status === "ready" && (
        <div className="card">
          <h3>Submit Delivery</h3>
          <input type="file" onChange={(e) => setDeliverableFile(e.target.files?.[0] ?? null)} />
          <button className="btn" onClick={handleSubmitDelivery} disabled={!deliverableFile} style={{ marginTop: "0.5rem" }}>
            Submit
          </button>
          {hashResult && <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", wordBreak: "break-all" }}>{hashResult}</p>}
        </div>
      )}

      {isHiring && project.freelancerAddress && project.contractId && (
        <div className="card">
          <h3>Approve Delivery</h3>
          <p>Call contract.approve_delivery(business) on {project.contractId}</p>
        </div>
      )}
    </div>
  );
}
