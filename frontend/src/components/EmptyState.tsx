export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 px-6 bg-neutral-50 rounded-lg border border-neutral-200">
      <p className="text-xl font-bold text-neutral-900 mb-2">{title}</p>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  );
}
