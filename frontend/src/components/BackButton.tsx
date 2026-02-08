import { Icons } from "./Icons";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-medium text-sm rounded-xl transition-all duration-200 mb-6"
      onClick={onClick}
    >
      <Icons.ChevronLeft />
      <span>Back</span>
    </button>
  );
}
