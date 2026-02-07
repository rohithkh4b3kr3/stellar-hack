/**
 * In-memory project store. Replace with DB in production.
 * Backend never holds funds; this is metadata only.
 */
import type { ProjectRecord } from "./types.js";

const projects = new Map<string, ProjectRecord>();

export function saveProject(project: ProjectRecord): void {
  projects.set(project.id, project);
}

export function getProject(id: string): ProjectRecord | undefined {
  return projects.get(id);
}

export function listProjects(): ProjectRecord[] {
  return Array.from(projects.values());
}

export function getProjectByContractId(contractId: string): ProjectRecord | undefined {
  return listProjects().find((p) => p.contractId === contractId);
}
