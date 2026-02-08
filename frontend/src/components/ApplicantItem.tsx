import { useState } from "react";
import { acceptFreelancer } from "../api";
import { Icons } from "./Icons";

export function ApplicantItem({
  address,
  projectId,
  isSelected,
  setError,
  loadProjects,
  onAccepted,
}: {
  address: string;
  projectId: string;
  isSelected: boolean;
  setError: (s: string) => void;
  loadProjects: () => void;
  onAccepted?: () => void | Promise<void>;
}) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    setError("");
    try {
      await acceptFreelancer(projectId, address);
      loadProjects();
      await onAccepted?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-5 rounded-xl border transition-all duration-200 ${
        isSelected
          ? "bg-emerald-50 border-emerald-200 shadow-sm"
          : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
          {address.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-neutral-900 text-sm">
            {address.slice(0, 12)}...{address.slice(-4)}
          </div>
          {isSelected && (
            <div className="text-xs text-emerald-700 font-bold uppercase tracking-wide flex items-center gap-1 mt-1">
              <Icons.CheckCircle />
              Selected
            </div>
          )}
        </div>
      </div>
      {!isSelected && (
        <button
          className="btn-accept px-5 py-2.5 text-sm font-semibold rounded-xl"
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? "..." : "Accept"}
        </button>
      )}
    </div>
  );
}
