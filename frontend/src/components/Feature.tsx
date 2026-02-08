export function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-neutral-100/80 rounded-xl text-center border border-neutral-200/50">
      <h3 className="font-display text-base font-bold text-neutral-900 mb-1">{title}</h3>
      <p className="text-neutral-500 text-xs">{description}</p>
    </div>
  );
}
