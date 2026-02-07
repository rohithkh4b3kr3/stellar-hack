const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface Project {
  id: string;
  contractId?: string;
  businessAddress: string;
  freelancerAddress?: string;
  tokenId: string;
  title: string;
  description: string;
  totalAmount: string;
  advanceAmount: string;
  deliveryDeadlineTs: number;
  verificationWindowSecs: number;
  applicants: string[];
  createdAt: number;
}

export async function listProjects(): Promise<Project[]> {
  const r = await fetch(`${API}/projects`);
  if (!r.ok) throw new Error("Failed to fetch projects");
  return r.json();
}

export async function createProject(body: {
  contractId: string;
  businessAddress: string;
  tokenId: string;
  title: string;
  description: string;
  totalAmount: string;
  deliveryDeadlineTs: number;
  verificationWindowSecs?: number;
}): Promise<Project> {
  const r = await fetch(`${API}/project/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

export async function getProject(id: string): Promise<Project> {
  const r = await fetch(`${API}/project/${id}`);
  if (!r.ok) throw new Error("Project not found");
  return r.json();
}

export async function applyToProject(projectId: string, freelancerAddress: string): Promise<Project> {
  const r = await fetch(`${API}/project/${projectId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ freelancerAddress }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

export async function acceptFreelancer(projectId: string, freelancerAddress: string): Promise<Project> {
  const r = await fetch(`${API}/project/${projectId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ freelancerAddress }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

export interface StartResponse {
  status?: string;
  message?: string;
  advanceAmount?: string;
  asset?: string;
  contractAddress?: string;
  projectId?: string;
  error?: string;
}

export async function projectStart(id: string): Promise<StartResponse> {
  const r = await fetch(`${API}/project/${id}/start`);
  const data = await r.json().catch(() => ({}));
  if (r.status === 402) return { ...data, advanceAmount: data.advanceAmount, contractAddress: data.contractAddress };
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function setProjectContract(projectId: string, contractId: string): Promise<Project> {
  const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/project/${projectId}/set-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractId }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

export async function submitDelivery(projectId: string, file: File): Promise<{ deliverableHashHex: string; contractId: string }> {
  const form = new FormData();
  form.set("deliverable", file);
  const r = await fetch(`${API}/project/${projectId}/submit`, { method: "POST", body: form });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}
