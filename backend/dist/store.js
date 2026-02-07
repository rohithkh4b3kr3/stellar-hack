const projects = new Map();
export function saveProject(project) {
    projects.set(project.id, project);
}
export function getProject(id) {
    return projects.get(id);
}
export function listProjects() {
    return Array.from(projects.values());
}
export function getProjectByContractId(contractId) {
    return listProjects().find((p) => p.contractId === contractId);
}
