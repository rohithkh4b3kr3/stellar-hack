import type { Project } from "../api";
import { Section } from "./Section";
import { ProjectCard } from "./ProjectCard";
import { StatsGrid } from "./StatsGrid";
import { EmptyState } from "./EmptyState";

export function HomeView({
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
              <EmptyState title="No projects" description="Create a project to get started" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
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
              <EmptyState title="No assignments" description="Browse and apply to available projects" />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myActiveProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
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
                  <ProjectCard key={p.id} project={p} wallet={wallet} onClick={() => openProject(p.id)} />
                ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
