import type { Project } from "../api";
import { Icons } from "./Icons";
import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "./EmptyState";

export function SearchView({
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
