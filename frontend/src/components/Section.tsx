export function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mb-12 pt-2">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-neutral-200/80 text-neutral-600 rounded-full">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
