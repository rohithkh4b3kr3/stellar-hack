import { useEffect } from "react";
import { Icons } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles =
    toast.type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : toast.type === "error"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-blue-50 border-blue-200 text-blue-800";

  const Icon =
    toast.type === "success"
      ? Icons.CheckCircle
      : toast.type === "error"
        ? Icons.AlertCircle
        : Icons.Clock;

  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg ${styles} animate-in slide-in-from-right duration-300`}
      role="alert"
    >
      <Icon />
      <span className="font-medium text-sm flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-black/5 font-bold text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
