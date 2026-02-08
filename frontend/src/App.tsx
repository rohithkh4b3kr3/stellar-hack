import { useState, useEffect, useCallback } from "react";
import { listProjects, getProject, projectStart, type Project, type StartResponse } from "./api";
import { connectFreighter, getPublicKey, isFreighterAvailable } from "./wallet";
import {
  Sidebar,
  TopBar,
  ErrorBar,
  LandingPage,
  HomeView,
  CreateProjectView,
  ProjectDetailView,
  ApplicantsView,
  SearchView,
  HistoryView,
  type View,
  type Role,
} from "./components";
import "./index.css";

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
        // ignore polling errors
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
      <div className="flex h-screen bg-[#fafafa] overflow-hidden">
        <Sidebar role={role} view={view} setView={setView} setRole={setRole} wallet={wallet} />
        <main className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">
          <TopBar wallet={wallet} />
          {error && <ErrorBar error={error} onClose={() => setError("")} />}
          <div className="flex-1 overflow-y-auto bg-[#fafafa]">
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
