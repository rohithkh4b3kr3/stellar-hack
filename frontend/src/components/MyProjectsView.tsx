import type { Project } from "../api";
import { Section } from "./Section";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "./EmptyState";
import { StatsGrid } from "./StatsGrid";

function uniqueById(projects: Project[]) {
  const map = new Map<string, Project>();
  projects.forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}

export function MyProjectsView({
  role,
  projects,
  wallet,
  openProject,
}: {
  role: string;
  projects: Project[];
  wallet: string;
  openProject: (id: string) => void;
}) {
  const createdProjects = projects.filter((p) => p.businessAddress === wallet);
  const assignedProjects = projects.filter((p) => p.freelancerAddress === wallet);
  const appliedProjects = projects.filter((p) => p.applicants.includes(wallet));
  const openProjects = projects.filter((p) => !p.freelancerAddress);

  const inProgress = createdProjects.filter((p) => p.freelancerAddress);
  const awaitingApplicants = createdProjects.filter((p) => !p.freelancerAddress);

  const relatedProjects =
    role === "hiring"
      ? createdProjects
      : uniqueById([...assignedProjects, ...appliedProjects]);

  const summaryCards =
    role === "hiring"
      ? [
          { label: "Total postings", value: createdProjects.length },
          { label: "In progress", value: inProgress.length },
          { label: "Awaiting applicants", value: awaitingApplicants.length },
        ]
      : [
          { label: "Assigned to you", value: assignedProjects.length },
          { label: "Applications", value: appliedProjects.length },
          { label: "Open to apply", value: openProjects.filter((p) => !appliedProjects.includes(p)).length },
        ];

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm"
          >
            <div className="text-xs uppercase tracking-widest text-neutral-400">{card.label}</div>
            <div className="mt-2 text-3xl font-bold text-neutral-900">{card.value}</div>
          </div>
        ))}
      </div>

      <Section title="My Projects" count={relatedProjects.length}>
        {relatedProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description={role === "hiring" ? "Post a job to get started" : "Apply to a project to show up here"}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
            ))}
          </div>
        )}
      </Section>

      {role === "hiring" ? (
        <>
          <Section title="In Progress" count={inProgress.length}>
            {inProgress.length === 0 ? (
              <EmptyState title="No active work" description="Accept a freelancer to start delivery" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgress.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Awaiting Applicants" count={awaitingApplicants.length}>
            {awaitingApplicants.length === 0 ? (
              <EmptyState title="No open postings" description="Post a new job to attract applicants" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awaitingApplicants.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Project Insights">
            <StatsGrid projects={createdProjects} />
          </Section>
        </>
      ) : (
        <>
          <Section title="Assigned to You" count={assignedProjects.length}>
            {assignedProjects.length === 0 ? (
              <EmptyState title="No active assignments" description="Apply to jobs to get hired" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Your Applications" count={appliedProjects.length}>
            {appliedProjects.length === 0 ? (
              <EmptyState title="No applications yet" description="Apply to open jobs to show up here" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appliedProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Open to Apply" count={openProjects.filter((p) => !appliedProjects.includes(p)).length}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openProjects
                .filter((p) => !appliedProjects.includes(p))
                .slice(0, 6)
                .map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
