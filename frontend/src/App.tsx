import { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  createProject,
  getProject,
  applyToProject,
  acceptFreelancer,
  projectStart,
  setProjectJob,
  type Project,
  type StartResponse,
} from "./api";
import { connectFreighter, getPublicKey, isFreighterAvailable } from "./wallet";
import { createEscrow, completeJob, clientCancelWithin6h, claimRefundAfterHardDeadline } from "./contract";
import "./index.css";

// SVG Icons (Professional set)
const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

type Role = "hiring" | "freelancer" | null;
type View = "landing" | "home" | "create" | "project" | "applicants" | "search" | "history";

function Countdown({ deadlineTs, label }: { deadlineTs: number; label: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      if (now >= deadlineTs) {
        setText(`${label}: Expired`);
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
  
  const isExpired = text.includes("Expired");
  return (
    <span className={`font-medium ${isExpired ? "text-red-600" : "text-neutral-700"}`}>
      {text}
    </span>
  );
}

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [freighterOk, setFreighterOk] = useState(false);
  const [view, setView] = useState<View>("landing");
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [startInfo, setStartInfo] = useState<StartResponse | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const refreshProject = useCallback(async () => {
    if (!project) return;
    try {
      const p = await getProject(project.id);
      setProject(p);
      const start = await projectStart(project.id);
      setStartInfo(start);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [project]);

  // Auto-refresh project data while viewing a project so UI updates without manual refresh
  useEffect(() => {
    if (view !== "project" || !project) return;
    const projectId = project.id;
    const intervalId = setInterval(async () => {
      try {
        const p = await getProject(projectId);
        setProject(p);
        const start = await projectStart(projectId);
        setStartInfo(start);
      } catch (_) {
        // ignore polling errors (e.g. network blip)
      }
    }, 12_000);
    return () => clearInterval(intervalId);
  }, [view, project?.id]);

  if (view === "landing") {
    return (
      <LandingPage
        wallet={wallet}
        freighterOk={freighterOk}
        connect={connect}
        setRole={setRole}
        setView={setView}
        loadProjects={loadProjects}
        error={error}
        setError={setError}
      />
    );
  }

  if (role && wallet) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar role={role} view={view} setView={setView} setRole={setRole} wallet={wallet} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar wallet={wallet} />
          {error && <ErrorBar error={error} onClose={() => setError("")} />}
          <div className="flex-1 overflow-y-auto">
            {view === "home" && (
              <HomeView
                role={role}
                projects={projects}
                wallet={wallet}
                loadProjects={loadProjects}
                openProject={openProject}
              />
            )}

            {view === "create" && (
              <CreateProjectView
                wallet={wallet}
                setView={setView}
                setError={setError}
                loadProjects={loadProjects}
                openProject={openProject}
              />
            )}

            {view === "project" && project && (
              <ProjectDetailView
                project={project}
                startInfo={startInfo}
                wallet={wallet}
                role={role}
                setError={setError}
                refreshProject={refreshProject}
                goBack={() => setView("home")}
              />
            )}

            {view === "applicants" && (
              <ApplicantsView
                projects={projects}
                wallet={wallet}
                setError={setError}
                loadProjects={loadProjects}
              />
            )}

            {view === "search" && (
              <SearchView
                projects={projects}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                openProject={openProject}
              />
            )}

            {view === "history" && (
              <HistoryView
                projects={projects}
                wallet={wallet}
                role={role}
                openProject={openProject}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Sidebar({ role, view, setView, setRole, wallet }: { role: string; view: View; setView: (v: View) => void; setRole: (r: Role) => void; wallet: string }) {
  return (
    <aside className="w-64 bg-neutral-900 text-white flex flex-col border-r border-neutral-800">
      <div className="p-6 border-b border-neutral-800 flex items-center gap-3 cursor-pointer hover:bg-neutral-800 transition-colors">
        <div className="w-10 h-10 bg-white text-neutral-900 rounded-lg flex items-center justify-center font-bold text-lg">
          E
        </div>
        <h2 className="text-xl font-bold">gigX</h2>
      </div>

      <nav className="flex-1 py-8 space-y-1 px-3">
        <NavItem icon={<Icons.Home />} label="Home" active={view === "home"} onClick={() => setView("home")} />
        {role === "hiring" && (
          <>
            <NavItem icon={<Icons.Plus />} label="Create Project" active={view === "create"} onClick={() => setView("create")} />
            <NavItem
              icon={<Icons.Users />}
              label="Applicants"
              active={view === "applicants"}
              onClick={() => setView("applicants")}
            />
          </>
        )}
        <NavItem icon={<Icons.Search />} label="Browse" active={view === "search"} onClick={() => setView("search")} />
        <NavItem icon={<Icons.Clock />} label="History" active={view === "history"} onClick={() => setView("history")} />
      </nav>

      <div className="p-4 border-t border-neutral-800 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800">
          <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-xs font-bold text-white">
            {wallet.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wide">{role === "hiring" ? "Manager" : "Freelancer"}</div>
            <div className="text-xs text-neutral-400 truncate font-mono" title={wallet}>
              {wallet.slice(0, 8)}...
            </div>
          </div>
        </div>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors duration-200 hover:bg-neutral-800 rounded-lg"
          onClick={() => {
            setRole(null);
            setView("landing");
          }}
          title="Switch role"
        >
          <Icons.LogOut />
          <span>Switch Role</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
        active
          ? "bg-white text-neutral-900 shadow-md"
          : "text-neutral-300 hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function TopBar({ wallet }: { wallet: string }) {
  return (
    <div className="h-16 border-b border-neutral-200 flex items-center justify-between px-8 bg-white shadow-sm">
      <h1 className="text-xl font-bold text-neutral-900 tracking-tight">gigX</h1>
      <div className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold uppercase tracking-wide">
        {wallet.slice(-6)}
      </div>
    </div>
  );
}

function ErrorBar({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-center justify-between text-red-700 shadow-sm animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icons.AlertCircle />
        </div>
        <span className="font-medium text-sm">{error}</span>
      </div>
      <button
        onClick={onClose}
        className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg px-2 py-1 font-bold transition-all duration-200 text-lg flex-shrink-0"
        aria-label="Close error message"
      >
        ×
      </button>
    </div>
  );
}

function LandingPage({
  wallet,
  freighterOk,
  connect,
  setRole,
  setView,
  loadProjects,
  error,
}: {
  wallet: string | null;
  freighterOk: boolean;
  connect: () => Promise<void>;
  setRole: (r: Role) => void;
  setView: (v: View) => void;
  loadProjects: () => Promise<void>;
  error: string;
  setError: (s: string) => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-neutral-900 text-white rounded-2xl flex items-center justify-center text-4xl font-bold mx-auto mb-6">
            E
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">gigX</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Smart contract-enforced payments. Secure and transparent.
          </p>
        </div>

        {/* Features */}
        {!wallet && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Feature
              title="Secure"
              description="Funds locked in smart contract"
            />
            <Feature
              title="Transparent"
              description="All transactions on-chain"
            />
            <Feature
              title="Decentralized"
              description="No central authority"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <Icons.AlertCircle />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-10 space-y-4">
          {!wallet || !freighterOk ? (
            <>
              <button
                className="btn-primary w-full py-3 text-lg font-semibold"
                onClick={connect}
              >
                {freighterOk ? "Connect Wallet" : "Install Freighter"}
              </button>
              <p className="text-center text-sm text-neutral-600">
                Get testnet tokens at{" "}
                <a href="https://lab.stellar.org" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-semibold hover:underline">
                  lab.stellar.org
                </a>
              </p>
            </>
          ) : (
            <>
              <button
                className="btn-primary w-full py-3 text-lg font-semibold"
                onClick={() => {
                  setRole("hiring");
                  setView("home");
                  loadProjects();
                }}
              >
                Hire Freelancers
              </button>
              <button
                className="btn-secondary w-full py-3 text-lg font-semibold"
                onClick={() => {
                  setRole("freelancer");
                  setView("home");
                  loadProjects();
                }}
              >
                Find Work
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-neutral-50 rounded-xl text-center">
      <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  );
}

function HomeView({
  role,
  projects,
  wallet,
  openProject,
}: {
  role: string;
  projects: Project[];
  wallet: string;
  loadProjects: () => void;
  openProject: (id: string) => void;
}) {
  const myProjects = projects.filter((p) => p.businessAddress === wallet);
  const myActiveProjects = projects.filter((p) => p.freelancerAddress === wallet);
  const appliedProjects = projects.filter((p) => p.applicants.includes(wallet));
  const openProjects = projects.filter((p) => !p.freelancerAddress);

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {role === "hiring" && (
        <>
          <Section title="My Projects" count={myProjects.length}>
            {myProjects.length === 0 ? (
              <EmptyState
                title="No projects"
                description="Create a project to get started"
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    wallet={wallet}
                    onClick={() => openProject(p.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Overview">
            <StatsGrid projects={myProjects} />
          </Section>
        </>
      )}

      {role === "freelancer" && (
        <>
          <Section title="Active Assignments" count={myActiveProjects.length}>
            {myActiveProjects.length === 0 ? (
              <EmptyState
                title="No assignments"
                description="Browse and apply to available projects"
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myActiveProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    wallet={wallet}
                    onClick={() => openProject(p.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Recommended for You"
            count={openProjects.filter((p) => !appliedProjects.includes(p)).length}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openProjects
                .filter((p) => !appliedProjects.includes(p))
                .slice(0, 6)
                .map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    wallet={wallet}
                    onClick={() => openProject(p.id)}
                  />
                ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mb-16 pt-4">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">{title}</h2>
        {count !== undefined && <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-700 rounded-full">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function ProjectCard({
  project,
  wallet,
  onClick,
}: {
  project: Project;
  wallet: string;
  onClick: () => void;
}) {
  const isYourProject = project.businessAddress === wallet;
  const isApplied = project.applicants.includes(wallet);
  const isAccepted = project.freelancerAddress === wallet;

  const getStatus = () => {
    if (project.contractId) return "Active";
    if (isAccepted) return "Accepted";
    if (isApplied) return "Applied";
    if (isYourProject) return "Posted";
    return "Open";
  };

  const getStatusColor = () => {
    if (project.contractId) return "bg-green-100 text-green-700";
    if (isAccepted) return "bg-blue-100 text-blue-700";
    if (isApplied) return "bg-yellow-100 text-yellow-700";
    if (isYourProject) return "bg-neutral-100 text-neutral-700";
    return "bg-neutral-100 text-neutral-700";
  };

  const estimatedDaysLeft = Math.max(
    0,
    Math.ceil((project.deliveryDeadlineTs - Math.floor(Date.now() / 1000)) / 86400)
  );

  return (
    <div
      className="project-card p-6 bg-white border border-neutral-200 rounded-lg cursor-pointer hover:shadow-lg hover:border-neutral-300 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <h3 className="font-bold text-lg text-neutral-900 line-clamp-2 flex-1">
          {project.title}
        </h3>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor()}`}>
          {getStatus()}
        </span>
      </div>

      <p className="text-neutral-600 text-sm mb-5 line-clamp-2 min-h-[40px]">
        {project.description}
      </p>

      <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-neutral-200">
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Budget</p>
          <p className="font-bold text-neutral-900">${project.totalAmount}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Deadline</p>
          <p className="font-bold text-neutral-900">{estimatedDaysLeft}d</p>
        </div>
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Applied</p>
          <p className="font-bold text-neutral-900">{project.applicants.length}</p>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ projects }: { projects: Project[] }) {
  const total = projects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const active = projects.filter((p) => p.contractId).length;
  const completed = projects.filter((p) => p.contractId).length;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <StatCard label="Total Escrow" value={`$${total}`} />
      <StatCard label="Active Contracts" value={String(active)} />
      <StatCard label="Completed" value={String(completed)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card p-8 bg-white border border-neutral-200 rounded-lg text-center hover:shadow-md transition-all duration-300">
      <p className="text-neutral-600 text-sm font-semibold mb-3 uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 px-6 bg-neutral-50 rounded-lg border border-neutral-200">
      <p className="text-xl font-bold text-neutral-900 mb-2">{title}</p>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 font-semibold text-sm rounded-lg transition-all duration-200 mb-8"
      onClick={onClick}
    >
      <Icons.ChevronLeft />
      <span>Back</span>
    </button>
  );
}

function ApplicantsView({
  projects,
  wallet,
  loadProjects,
}: {
  projects: Project[];
  wallet: string;
  setError: (s: string) => void;
  loadProjects: () => void;
}) {
  const [error, setError] = useState("");
  const myProjects = projects.filter((p) => p.businessAddress === wallet && p.applicants.length > 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {myProjects.length === 0 ? (
        <EmptyState
          title="No applicants yet"
          description="Your posted projects will appear here when freelancers apply"
        />
      ) : (
        <div className="space-y-6">
          {myProjects.map((p) => (
            <div key={p.id} className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-neutral-900">{p.title}</h3>
                <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm font-semibold">
                  {p.applicants.length} applicant{p.applicants.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {p.applicants.map((addr) => (
                  <ApplicantItem
                    key={addr}
                    address={addr}
                    projectId={p.id}
                    isSelected={p.freelancerAddress === addr}
                    setError={setError}
                    loadProjects={loadProjects}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantItem({
  address,
  projectId,
  isSelected,
  setError,
  loadProjects,
  onAccepted,
}: {
  address: string;
  projectId: string;
  isSelected: boolean;
  setError: (s: string) => void;
  loadProjects: () => void;
  onAccepted?: () => void | Promise<void>;
}) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptFreelancer(projectId, address);
      setError("Freelancer accepted successfully!");
      loadProjects();
      await onAccepted?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className={`flex items-center justify-between p-5 rounded-lg border transition-all duration-200 ${
      isSelected
        ? "bg-green-50 border-green-200 shadow-sm"
        : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-md"
    }`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
          {address.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-neutral-900 text-sm">
            {address.slice(0, 12)}...{address.slice(-4)}
          </div>
          {isSelected && (
            <div className="text-xs text-green-700 font-bold uppercase tracking-wide flex items-center gap-1 mt-1">
              <Icons.CheckCircle />
              Selected
            </div>
          )}
        </div>
      </div>
      {!isSelected && (
        <button
          className="btn-accept px-5 py-2 text-sm font-semibold"
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? "..." : "Accept"}
        </button>
      )}
    </div>
  );
}

function SearchView({
  projects,
  searchQuery,
  setSearchQuery,
  openProject,
}: {
  projects: Project[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openProject: (id: string) => void;
}) {
  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-lg px-4 py-3 w-full max-w-md hover:border-neutral-400 transition-colors">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-neutral-900 placeholder-neutral-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No results" : "Search projects"}
          description={searchQuery ? "Try different keywords or browse all" : "Enter keywords to search"}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} wallet="" onClick={() => openProject(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryView({
  projects,
  wallet,
  role,
  openProject,
}: {
  projects: Project[];
  wallet: string;
  role: string;
  openProject: (id: string) => void;
}) {
  const relevant =
    role === "hiring"
      ? projects.filter((p) => p.businessAddress === wallet)
      : projects.filter(
          (p) => p.freelancerAddress === wallet || p.applicants.includes(wallet)
        );

  const active = relevant.filter((p) => !p.contractId);
  const completed = relevant.filter((p) => p.contractId);

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Section title="Active Projects" count={active.length}>
        {active.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="Active projects will appear here"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {active.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                wallet={wallet}
                onClick={() => openProject(p.id)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Completed Projects" count={completed.length}>
        {completed.length === 0 ? (
          <EmptyState
            title="No completed projects"
            description="Completed projects will appear here"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                wallet={wallet}
                onClick={() => openProject(p.id)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function CreateProjectView({
  wallet,
  setView,
  setError,
  loadProjects,
  openProject,
}: {
  wallet: string;
  setView: (v: View) => void;
  setError: (s: string) => void;
  loadProjects: () => void;
  openProject: (id: string) => void;
}) {
  const xlmTokenId = (import.meta.env.VITE_XLM_TOKEN_ID ?? "").trim();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("100000");
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!wallet) {
      setError("Wallet not connected");
      return;
    }
    if (!title.trim()) {
      setError("Project title is required");
      return;
    }
    if (!xlmTokenId) {
      setError("VITE_XLM_TOKEN_ID is not set in .env. Add the native XLM token contract ID and restart.");
      return;
    }
    if (!totalAmount.trim()) {
      setError("Payment amount is required");
      return;
    }
    if (!deadlineDays.trim()) {
      setError("Deadline is required");
      return;
    }
    
    setSubmitting(true);
    setError("");
    try {
      const now = Math.floor(Date.now() / 1000);
      const deliveryTs = now + Number(deadlineDays || 14) * 86400;
      const res = await createProject({
        businessAddress: wallet,
        tokenId: xlmTokenId,
        title: title.trim(),
        description: description.trim(),
        totalAmount: totalAmount.trim(),
        deliveryDeadlineTs: deliveryTs,
      });
      loadProjects();
      setError("");
      openProject(res.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <BackButton onClick={() => setView("home")} />

      <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">Create Project</h2>
        <p className="text-neutral-600 mb-8">
          Post details for your project and find the right freelancer.
        </p>

        <div className="space-y-7">
          <div>
            <label className="form-group-label">Project Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Website Development, Logo Design..."
              type="text"
            />
          </div>

          <div>
            <label className="form-group-label">Description *</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, requirements, and deliverables..."
              rows={5}
            />
          </div>

          {!xlmTokenId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">Token not configured</p>
              <p className="text-xs text-amber-800">
                Set <code className="font-mono bg-amber-100 px-1">VITE_XLM_TOKEN_ID</code> in frontend <code className="font-mono bg-amber-100 px-1">.env</code> to the native XLM token contract ID (see <code className="font-mono bg-amber-100 px-1">.env.example</code> for testnet value). Restart the dev server after changing.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 mb-6">
              <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase">Token</label>
              <p className="text-sm text-neutral-800 font-mono break-all">XLM (native) — {xlmTokenId.length > 24 ? `${xlmTokenId.slice(0, 12)}...${xlmTokenId.slice(-8)}` : xlmTokenId}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-7">
            <div>
              <label className="form-group-label">Payment (Stroops) *</label>
              <input
                className="form-input"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                type="number"
                placeholder="100000"
              />
            </div>
          </div>

          <div>
            <label className="form-group-label">Deadline (days) *</label>
            <input
              className="form-input"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              type="number"
              placeholder="14"
            />
          </div>

          <div className="flex gap-4 mt-10 pt-4 border-t border-neutral-200">
            <button
              className="btn-primary flex-1 py-3 font-semibold disabled:opacity-60 disabled:hover:bg-neutral-900 disabled:hover:shadow-md"
              onClick={submit}
              disabled={submitting || !title.trim() || !xlmTokenId}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner"></span>
                  Creating...
                </span>
              ) : (
                "Create Project"
              )}
            </button>
            <button className="btn-secondary flex-1 py-3 font-semibold" onClick={() => setView("home")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailView({
  project,
  startInfo,
  wallet,
  setError,
  refreshProject,
  goBack,
}: {
  project: Project;
  startInfo: StartResponse | null;
  wallet: string;
  role: string;
  setError: (s: string) => void;
  refreshProject: () => Promise<void>;
  goBack: () => void;
}) {
  const isHiring = project.businessAddress === wallet;
  const isFreelancer = project.freelancerAddress === wallet;
  const [applying, setApplying] = useState(false);
  const canApply = !!wallet && !isHiring && !project.freelancerAddress;
  const isApplied = project.applicants.includes(wallet);

  const handleApply = async () => {
    if (!wallet || applying || isApplied) return;
    setApplying(true);
    setError("");
    try {
      await applyToProject(project.id, wallet);
      await refreshProject();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <BackButton onClick={goBack} />

      <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-neutral-900">{project.title}</h1>
            <div className="flex gap-2">
              {project.contractId && (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                  Escrow Active
                </span>
              )}
              {isHiring && (
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                  Your Project
                </span>
              )}
              {isFreelancer && (
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
                  Accepted
                </span>
              )}
            </div>
          </div>
          <p className="text-neutral-600 text-lg">{project.description}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <DetailItem label="Escrow amount" value={`$${project.totalAmount}`} />
          <DetailItem
            label="Deadline"
            value={
              <Countdown
                deadlineTs={project.deliveryDeadlineTs}
                label=""
              />
            }
          />
          <DetailItem
            label="Status"
            value={
              startInfo?.status === "ready"
                ? "Ready for Work"
                : startInfo?.status === "reviewing"
                ? "Reviewing Delivery"
                : (startInfo?.totalAmount ?? startInfo?.advanceAmount) && startInfo?.status !== "completed" && startInfo?.status !== "refunded"
                ? "Fund escrow"
                : "New"
            }
          />
        </div>

        {canApply && (
          <div className="mb-8 p-6 rounded-lg border-2 border-neutral-200 bg-neutral-50">
            {isApplied ? (
              <p className="text-neutral-700 font-semibold flex items-center gap-2">
                <Icons.CheckCircle />
                You have applied. The client will choose a freelancer from the applicants.
              </p>
            ) : (
              <div>
                <p className="text-neutral-700 font-semibold mb-4">Interested? Apply and the client will see your wallet address.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApply}
                  disabled={applying}
                >
                  {applying ? "Applying…" : "Apply to this project"}
                </button>
              </div>
            )}
          </div>
        )}

        {isHiring && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">
              Applicants ({project.applicants.length})
            </h3>
            {project.applicants.length === 0 ? (
              <p className="text-neutral-600 text-sm">No applicants yet</p>
            ) : (
              <div className="space-y-3">
                {project.applicants.map((addr) => (
                  <ApplicantItem
                    key={addr}
                    address={addr}
                    projectId={project.id}
                    isSelected={project.freelancerAddress === addr}
                    setError={setError}
                    loadProjects={() => {}}
                    onAccepted={refreshProject}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <ActionsList
          project={project}
          wallet={wallet}
          startInfo={startInfo}
          setError={setError}
          refreshProject={refreshProject}
        />
        <div className="mt-6">
          <button
            className="btn-secondary px-6 py-2"
            onClick={refreshProject}
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-5 border border-neutral-200 hover:border-neutral-300 transition-colors duration-200">
      <p className="text-neutral-600 text-xs font-bold mb-3 uppercase tracking-wide">{label}</p>
      <p className="text-neutral-900 font-bold text-xl">{value}</p>
    </div>
  );
}

function ActionsList({
  project,
  wallet,
  startInfo,
  setError,
  refreshProject,
}: {
  project: Project;
  wallet: string;
  startInfo: StartResponse | null;
  setError: (s: string) => void;
  refreshProject: () => Promise<void>;
}) {
  const isHiring = project.businessAddress === wallet;
  const isFreelancer = project.freelancerAddress === wallet;
  const [actionLoading, setActionLoading] = useState<"pay" | "complete" | "cancel6h" | "refund" | null>(null);

  const needsFunding =
    (startInfo?.totalAmount ?? startInfo?.advanceAmount) &&
    startInfo?.status === "payment_required";
  const canFund = isHiring && project.contractId && needsFunding && project.freelancerAddress;
  const canCompleteJob = isHiring && project.contractId && project.jobId && startInfo?.status === "ready";
  const nowSec = Math.floor(Date.now() / 1000);
  const fundedAt = startInfo?.jobFundedAt ?? 0;
  const hardDeadline = startInfo?.jobHardDeadline ?? project.deliveryDeadlineTs + 7 * 86400;
  const SIX_HOURS = 6 * 3600;
  const canCancel6h = canCompleteJob && fundedAt > 0 && nowSec < fundedAt + SIX_HOURS;
  const canClaimRefund = isHiring && project.contractId && project.jobId && startInfo?.status === "ready" && nowSec >= hardDeadline;

  const handleCreateEscrow = async () => {
    if (!project.contractId || !project.freelancerAddress || !project.tokenId) return;
    setActionLoading("pay");
    setError("");
    try {
      const { jobId } = await createEscrow(
        wallet,
        project.contractId,
        project.businessAddress,
        project.freelancerAddress,
        project.tokenId,
        project.totalAmount,
        project.deliveryDeadlineTs
      );
      await setProjectJob(project.id, jobId);
      await refreshProject();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteJob = async () => {
    if (!project.contractId || project.jobId == null) return;
    setActionLoading("complete");
    setError("");
    try {
      await completeJob(wallet, project.contractId, project.jobId);
      await refreshProject();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel6h = async () => {
    if (!project.contractId || project.jobId == null) return;
    setActionLoading("cancel6h");
    setError("");
    try {
      await clientCancelWithin6h(wallet, project.contractId, project.jobId);
      await refreshProject();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClaimRefund = async () => {
    if (!project.contractId || project.jobId == null) return;
    setActionLoading("refund");
    setError("");
    try {
      await claimRefundAfterHardDeadline(wallet, project.contractId, project.jobId);
      await refreshProject();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

    return (
    <div className="space-y-4">
      {isHiring && !project.freelancerAddress && (
        <ActionCard
          title="Select Freelancer"
          description="Choose a freelancer from the applicants above"
          status="pending"
        />
      )}

      {isHiring && project.freelancerAddress && !project.contractId && (
        <ActionCard
          title="Contract not configured"
          description="Backend must set ESCROW_CONTRACT_ID in .env (deploy escrow contract once, then set the contract ID)."
          status="pending"
        />
      )}

      {canFund && (
        <div className="border rounded-lg p-6 bg-sky-50 border-sky-200">
          <h4 className="font-bold text-lg mb-2 text-sky-900">Pay Full Amount</h4>
          <p className="text-sm text-sky-800 mb-4">
            Create escrow in one transaction. Funds are transferred from your wallet to the contract.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateEscrow}
            disabled={!!actionLoading}
          >
            {actionLoading === "pay" ? "Processing…" : `Pay ${project.totalAmount} (create escrow)`}
          </button>
        </div>
      )}

      {canCompleteJob && (
        <div className="border rounded-lg p-6 bg-green-50 border-green-200 space-y-4">
          <h4 className="font-bold text-lg text-green-900">Delivery & Payout</h4>
          <p className="text-sm text-green-800">
            On time: freelancer gets 100%. Late: 5% per day penalty (you get that back). Hard deadline + 7 days: you can claim full refund if no delivery.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={handleCompleteJob} disabled={!!actionLoading}>
              {actionLoading === "complete" ? "Processing…" : "Complete Job & Pay Freelancer"}
            </button>
            {canCancel6h && (
              <button type="button" className="btn-secondary" onClick={handleCancel6h} disabled={!!actionLoading}>
                {actionLoading === "cancel6h" ? "Processing…" : "Cancel within 6h (full refund)"}
              </button>
            )}
            {canClaimRefund && (
              <button type="button" className="btn-secondary" onClick={handleClaimRefund} disabled={!!actionLoading}>
                {actionLoading === "refund" ? "Processing…" : "Claim Refund (hard deadline passed)"}
              </button>
            )}
          </div>
        </div>
      )}

      {isHiring && project.contractId && needsFunding && !canFund && (
        <ActionCard
          title="Fund escrow"
          description="Approve token and pay the full amount to activate escrow"
          status="pending"
        />
      )}

      {isHiring && startInfo?.status === "ready" && !canCompleteJob && !canFund && (
        <ActionCard
          title="Ready to Work"
          description="Freelancer can now start the assignment"
          status="success"
        />
      )}

      {isFreelancer && (startInfo?.totalAmount ?? startInfo?.advanceAmount) && startInfo?.status === "payment_required" && (
        <ActionCard
          title="Waiting for escrow"
          description={`Client will fund $${project.totalAmount} to start`}
          status="info"
        />
      )}

      {isFreelancer && startInfo?.status === "ready" && (
        <ActionCard
          title="Ready to Work"
          description="Deliver by soft deadline for 100%. Late: 5% per day penalty. Client completes when you deliver."
          status="success"
        />
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: "pending" | "success" | "info";
}) {
  const styles = {
    pending: "bg-yellow-50 border-yellow-200 text-yellow-900",
    success: "bg-green-50 border-green-200 text-green-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  }[status];

  return (
    <div className={`border rounded-lg p-6 ${styles} hover:shadow-md transition-shadow duration-300`}>
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      <p className="text-sm">{description}</p>
    </div>
  );
}
