export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-neutral-50/80 rounded-xl p-5 border border-neutral-200/80 transition-colors duration-200">
      <p className="text-neutral-500 text-xs font-semibold mb-2 uppercase tracking-wider">{label}</p>
      <div className="text-neutral-900 font-semibold text-lg">{value}</div>
    </div>
  );
}
