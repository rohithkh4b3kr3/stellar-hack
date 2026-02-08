import type { Project } from "../api";
import { stroopsToXlm } from "../lib/token";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card p-8 bg-white border border-neutral-200 rounded-lg text-center hover:shadow-md transition-all duration-300">
      <p className="text-neutral-600 text-sm font-semibold mb-3 uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

export function StatsGrid({ projects }: { projects: Project[] }) {
  const totalStroops = projects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const totalXlm = stroopsToXlm(totalStroops);
  const active = projects.filter((p) => p.contractId).length;
  const completed = projects.filter((p) => p.contractId).length;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <StatCard label="Total Escrow" value={`${totalXlm} XLM`} />
      <StatCard label="Active Contracts" value={String(active)} />
      <StatCard label="Completed" value={String(completed)} />
    </div>
  );
}
