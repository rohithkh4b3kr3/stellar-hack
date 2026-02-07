import { useState, useEffect, useCallback } from "react";
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
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [startInfo, setStartInfo] = useState<StartResponse | null>(null);
  const [error, setError] = useState("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [deploying, setDeploying] = useState(false);

  const handleSet = async () => {
    setDeploying(true);
    setError("");
    try {
      await setProjectContract(projectId, contractId.trim());
      await onSet();
      setError("Contract set! Advance can now be paid.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="card">
      <h3>Step 2: Deploy & Set Contract</h3>
      <p style={{ color: "#666", fontSize: "0.875rem", lineHeight: "1.5" }}>
        You've accepted a freelancer. Now deploy the Soroban escrow contract:
      </p>
      <ol style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.5rem" }}>
        <li>Use stellar.io/docs or soroban-cli: <code style={{background: "#1a1a1a", padding: "2px 4px"}}>soroban contract build</code></li>
        <li>Deploy with freelancer address: <code style={{background: "#1a1a1a", padding: "2px 4px"}}>soroban contract deploy --wasm target/wasm32-unknown-unknown/release/hello_world.wasm</code></li>
        <li>Copy the contract ID (C...) and paste below</li>
        <li>Call: <code style={{background: "#1a1a1a", padding: "2px 4px"}}>contract.init_project(business, freelancer, token, total, advance, deadline, verification_secs)</code></li>
      </ol>
      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label>Contract ID</label>
        <input value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="C..." />
      </div>
      <button
        className="btn"
        onClick={handleSet}
        disabled={!contractId.trim() || deploying}
      >
        {deploying ? "Setting..." : "Set Contract"}
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
  const [submitting, setSubmitting] = useState(false);
  const isHiring = wallet === project.businessAddress;
  const isFreelancer = wallet === project.freelancerAddress;

  const handleSubmitDelivery = async () => {
    if (!deliverableFile || !isFreelancer) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await submitDelivery(project.id, deliverableFile);
      setHashResult(res.deliverableHashHex);
      setError(`✓ Deliverable hashed. Call contract.submit_delivery(freelancer, "${res.deliverableHashHex.slice(0, 32)}...") on ${res.contractId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDisplay = () => {
    if (startInfo?.status === "completed") return "✓ Completed";
    if (startInfo?.status === "ready") return "✓ Ready to Work";
    if (startInfo?.status === "error") return "✗ Refunded or Error";
    if (startInfo?.advanceAmount) return "⏳ Waiting for Payment";
    return "⏳ Not Started";
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
        <p style={{color: "#999", marginBottom: "0.75rem"}}>{project.description}</p>
        
        <div style={{ background: "#0a0a0a", border: "1px solid #222", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          <div><strong>Total Payment:</strong> {project.totalAmount}</div>
          <div style={{marginTop: "0.25rem"}}><strong>30% Advance:</strong> {project.advanceAmount}</div>
          <div style={{marginTop: "0.25rem"}}><strong>Status:</strong> {getStatusDisplay()}</div>
          <Countdown deadlineTs={project.deliveryDeadlineTs} label="Delivery Deadline" />
        </div>

        {project.contractId && (
          <div style={{ background: "#0a0a0a", border: "1px solid #222", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.7rem" }}>
            <strong>Contract:</strong> <span style={{fontFamily: "monospace"}}>{project.contractId}</span>
          </div>
        )}
      </div>

      {isHiring && project.applicants.length > 0 && (
        <div className="card">
          <h3>Step 1: Accept Freelancer</h3>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "0.75rem" }}>Choose who will do the work:</p>
          {project.applicants.map((addr) => (
            <div key={addr} className="project-row">
              <span className="chip" title={addr}>{addr.slice(0, 8)}...{addr.slice(-4)}</span>
              <button
                className="btn"
                onClick={async () => {
                  setError("");
                  try {
                    await acceptFreelancer(project.id, addr);
                    await loadProject();
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                disabled={!!project.freelancerAddress}
              >
                {project.freelancerAddress === addr ? "✓ Accepted" : "Accept"}
              </button>
            </div>
          ))}
        </div>
      )}

      {isHiring && project.freelancerAddress && !project.contractId && (
        <SetContractForm projectId={project.id} onSet={loadProject} setError={setError} />
      )}

      {isHiring && project.contractId && startInfo?.advanceAmount && (
        <div className="card">
          <h3>Step 3: Pay Advance (30%)</h3>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "0.75rem" }}>Send ${project.advanceAmount} to the contract:</p>
          <ol style={{ color: "#666", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
            <li>In your wallet, "send" {project.advanceAmount} to {project.contractId}</li>
            <li>Approve transaction on {project.tokenId}</li>
            <li>Call <code style={{background: "#1a1a1a", padding: "2px 4px"}}>contract.deposit_advance(business)</code></li>
            <li>Refresh this page</li>
          </ol>
          <button className="btn secondary" onClick={() => loadProject()}>Refresh Status</button>
        </div>
      )}

      {isHiring && startInfo?.status === "ready" && project.contractId && (
        <div className="card">
          <h3>Step 4: Approve Delivery</h3>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "0.75rem" }}>When freelancer delivers, call:</p>
          <div style={{background: "#1a1a1a", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.7rem", marginBottom: "0.75rem"}}>
            contract.approve_delivery(business)
          </div>
          <p style={{ color: "#666", fontSize: "0.75rem" }}>OR wait 3 days for auto-release</p>
        </div>
      )}

      {isFreelancer && project.freelancerAddress === wallet && !startInfo?.status && startInfo?.advanceAmount && (
        <div className="card">
          <h3>⏳ Waiting for Payment</h3>
          <p>Hiring person must pay the 30% advance (${project.advanceAmount}) before you can submit work.</p>
          <button className="btn secondary" onClick={() => loadProject()}>Check Status</button>
        </div>
      )}

      {isFreelancer && startInfo?.status === "ready" && (
        <div className="card">
          <h3>Ready to Work!</h3>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>Advance is locked. Submit your deliverable:</p>
          <div className="form-group">
            <label>Deliverable File</label>
            <input type="file" onChange={(e) => setDeliverableFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn" onClick={handleSubmitDelivery} disabled={!deliverableFile || submitting} style={{ marginBottom: "0.5rem" }}>
            {submitting ? "Hashing..." : "Submit Deliverable"}
          </button>
          {hashResult && (
            <div style={{ marginTop: "0.75rem", background: "#0a0a0a", border: "1px solid #222", padding: "0.75rem", fontSize: "0.7rem" }}>
              <p style={{margin: "0 0 0.25rem 0"}}>Hash: <span style={{fontFamily: "monospace"}}>{hashResult}</span></p>
              <p style={{margin: "0", color: "#666"}}>Copy this to submit_delivery call on the contract</p>
            </div>
          )}
        </div>
      )}

      {isFreelancer && startInfo?.status === "completed" && (
        <div className="card">
          <h3>✓ Payment Complete</h3>
          <p>You've been paid. Project is closed.</p>
        </div>
      )}
    </div>
  );
}
