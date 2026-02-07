const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface Project {
  id: string;
  contractId: string;
  businessAddress: string;
  freelancerAddress: string;
  tokenId: string;
  totalAmount: string;
  advanceAmount: string;
  milestoneAmounts: string[];
  milestoneDeadlinesTs: number[];
  finalDeadlineTs: number;
  verificationWindowSecs: number;
  createdAt: number;
}

export async function createProject(body: {
  contractId: string;
  businessAddress: string;
  freelancerAddress: string;
  tokenId: string;
  totalAmount: string;
  advanceAmount: string;
  milestoneAmounts: string[];
  milestoneDeadlinesTs: number[];
  finalDeadlineTs: number;
  verificationWindowSecs: number;
  signature?: string;
  publicKey?: string;
}): Promise<{ projectId: string; contractId: string } & Project> {
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

export async function milestoneSubmit(projectId: string, milestoneIndex: number, deliverableHashHex: string): Promise<{ deliverableHashHex: string }> {
  const r = await fetch(`${API}/milestone/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, milestoneIndex, deliverableHashHex }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

export async function milestoneSubmitFile(projectId: string, milestoneIndex: number, file: File): Promise<{ deliverableHashHex: string }> {
  const form = new FormData();
  form.set("projectId", projectId);
  form.set("milestoneIndex", String(milestoneIndex));
  form.set("deliverable", file);
  const r = await fetch(`${API}/milestone/submit`, {
    method: "POST",
    body: form,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}
