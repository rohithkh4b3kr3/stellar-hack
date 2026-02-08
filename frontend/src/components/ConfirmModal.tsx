import { Icons } from "./Icons";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : "btn-primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              variant === "danger" ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            <Icons.AlertCircle />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
            <p className="text-neutral-600 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`px-6 py-2.5 font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="loading-spinner w-4 h-4" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
