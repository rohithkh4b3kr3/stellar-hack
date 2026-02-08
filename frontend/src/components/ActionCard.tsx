import type { ReactNode } from "react";

export function ActionCard({
  title,
  description,
  status,
}: {
  title: string;
  description: ReactNode;
  status: "pending" | "success" | "info";
}) {
  const styles = {
    pending: "bg-amber-50/90 border-amber-200/80 text-amber-900",
    success: "bg-emerald-50/90 border-emerald-200/80 text-emerald-900",
    info: "bg-sky-50/90 border-sky-200/80 text-sky-900",
  }[status];

  return (
    <div className={`border rounded-xl p-6 ${styles} transition-all duration-300`}>
      <h4 className="font-display font-bold text-lg mb-2">{title}</h4>
      <div className="text-sm">{description}</div>
    </div>
  );
}
