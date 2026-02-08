import type { Project } from "../api";
import { stroopsToXlm } from "../lib/token";

export function ProjectCard({
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
    if (project.contractId) return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    if (isAccepted) return "bg-sky-50 text-sky-700 border-sky-200/60";
    if (isApplied) return "bg-amber-50 text-amber-700 border-amber-200/60";
    if (isYourProject) return "bg-neutral-100 text-neutral-600 border-neutral-200";
    return "bg-neutral-100 text-neutral-600 border-neutral-200";
  };

  const estimatedDaysLeft = Math.max(
    0,
    Math.ceil((project.deliveryDeadlineTs - Math.floor(Date.now() / 1000)) / 86400)
  );

  return (
    <div
      className="p-6 bg-white border border-neutral-200/80 rounded-xl cursor-pointer hover:shadow-lg hover:border-neutral-300 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-display font-bold text-lg text-neutral-900 line-clamp-2 flex-1">{project.title}</h3>
        <span className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border ${getStatusColor()}`}>
          {getStatus()}
        </span>
      </div>

      <p className="text-neutral-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{project.description}</p>

      <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-neutral-100">
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Budget</p>
          <p className="font-semibold text-neutral-900">{stroopsToXlm(project.totalAmount)} XLM</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Deadline</p>
          <p className="font-semibold text-neutral-900">{estimatedDaysLeft}d</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Applied</p>
          <p className="font-semibold text-neutral-900">{project.applicants.length}</p>
        </div>
      </div>
    </div>
  );
}
