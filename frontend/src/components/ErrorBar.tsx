import { Icons } from "./Icons";

export function ErrorBar({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-center justify-between text-red-700 shadow-sm animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icons.AlertCircle />
        </div>
        <span className="font-medium text-sm">{error}</span>
      </div>
      <button
        onClick={onClose}
        className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg px-2 py-1 font-bold transition-all duration-200 text-lg flex-shrink-0"
        aria-label="Close error message"
      >
        ×
      </button>
    </div>
  );
}
