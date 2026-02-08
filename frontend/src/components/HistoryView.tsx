import type { Project } from "../api";
import { Section } from "./Section";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "./EmptyState";

export function HistoryView({
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
      : projects.filter((p) => p.freelancerAddress === wallet || p.applicants.includes(wallet));

  const active = relevant.filter((p) => !p.contractId);
  const completed = relevant.filter((p) => p.contractId);

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Section title="Active Projects" count={active.length}>
        {active.length === 0 ? (
          <EmptyState title="No active projects" description="Active projects will appear here" />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {active.map((p) => (
              <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Completed Projects" count={completed.length}>
        {completed.length === 0 ? (
          <EmptyState title="No completed projects" description="Completed projects will appear here" />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map((p) => (
              <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
