import { useState } from "react";
import { createProject } from "../api";
import { BackButton } from "./BackButton";
import type { View } from "./Sidebar";
import { isNativeXlm, XLM_MIN_ESCROW_STROOPS, xlmToStroops } from "../lib/token";

export function CreateProjectView({
  wallet,
  setView,
  setError,
  loadProjects,
  openProject,
}: {
  wallet: string;
  setView: (v: View) => void;
  setError: (s: string) => void;
  loadProjects: () => void;
  openProject: (id: string) => void;
}) {
  const xlmTokenId = (import.meta.env.VITE_XLM_TOKEN_ID ?? "").trim();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmountXlm, setTotalAmountXlm] = useState("2"); // XLM (2 min for native)
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [submitting, setSubmitting] = useState(false);

  const amountStroops = xlmToStroops(totalAmountXlm);
  const amountNum = parseInt(amountStroops, 10);
  const nativeMinOk = !xlmTokenId || !isNativeXlm(xlmTokenId) || amountNum >= XLM_MIN_ESCROW_STROOPS;

  const submit = async () => {
    if (!wallet) {
      setError("Wallet not connected");
      return;
    }
    if (!title.trim()) {
      setError("Project title is required");
      return;
    }
    if (!xlmTokenId) {
      setError("VITE_XLM_TOKEN_ID is not set in .env. Add the native XLM token contract ID and restart.");
      return;
    }
    if (!totalAmountXlm.trim()) {
      setError("Payment amount is required");
      return;
    }
    if (!deadlineDays.trim()) {
      setError("Deadline is required");
      return;
    }
    if (xlmTokenId && isNativeXlm(xlmTokenId) && amountNum < XLM_MIN_ESCROW_STROOPS) {
      setError(`Native XLM escrow requires at least ${XLM_MIN_ESCROW_STROOPS / 10_000_000} XLM (${XLM_MIN_ESCROW_STROOPS} stroops)`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const now = Math.floor(Date.now() / 1000);
      const deliveryTs = now + Number(deadlineDays || 14) * 86400;
      const res = await createProject({
        businessAddress: wallet,
        tokenId: xlmTokenId,
        title: title.trim(),
        description: description.trim(),
        totalAmount: amountStroops,
        deliveryDeadlineTs: deliveryTs,
      });
      loadProjects();
      setError("");
      openProject(res.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <BackButton onClick={() => setView("home")} />

      <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">Create Project</h2>
        <p className="text-neutral-600 mb-8">
          Post details for your project and find the right freelancer.
        </p>

        <div className="space-y-7">
          <div>
            <label className="form-group-label">Project Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Website Development, Logo Design..."
              type="text"
            />
          </div>

          <div>
            <label className="form-group-label">Description *</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, requirements, and deliverables..."
              rows={5}
            />
          </div>

          {!xlmTokenId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">Token not configured</p>
              <p className="text-xs text-amber-800">
                Set <code className="font-mono bg-amber-100 px-1">VITE_XLM_TOKEN_ID</code> in frontend{" "}
                <code className="font-mono bg-amber-100 px-1">.env</code> to the native XLM token contract ID (see{" "}
                <code className="font-mono bg-amber-100 px-1">.env.example</code> for testnet value). Restart the dev
                server after changing.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 mb-6">
              <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase">Token</label>
              <p className="text-sm text-neutral-800 font-mono break-all">
                XLM (native) — {xlmTokenId.length > 24 ? `${xlmTokenId.slice(0, 12)}...${xlmTokenId.slice(-8)}` : xlmTokenId}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-7">
            <div>
              <label className="form-group-label">Payment (XLM) *</label>
              <input
                className="form-input"
                value={totalAmountXlm}
                onChange={(e) => setTotalAmountXlm(e.target.value)}
                type="number"
                placeholder="2"
                min={xlmTokenId && isNativeXlm(xlmTokenId) ? 2 : 0.0001}
                step="0.1"
              />
              {xlmTokenId && isNativeXlm(xlmTokenId) && (
                <p className="text-xs text-neutral-500 mt-1">
                  Native XLM: min 2 XLM. Reserve: 1 XLM (keep balance ≥ 3 XLM for 2 XLM escrow).
                </p>
              )}
              {!nativeMinOk && (
                <p className="text-sm text-red-600 font-medium mt-2">
                  Amount below minimum. Native XLM requires at least 2 XLM.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="form-group-label">Deadline (days) *</label>
            <input
              className="form-input"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              type="number"
              placeholder="14"
            />
          </div>

          <div className="flex gap-4 mt-10 pt-4 border-t border-neutral-200">
            <button
              className="btn-primary flex-1 py-3 font-semibold disabled:opacity-60 disabled:hover:bg-neutral-900 disabled:hover:shadow-md"
              onClick={submit}
              disabled={submitting || !title.trim() || !xlmTokenId || !nativeMinOk}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner"></span>
                  Creating...
                </span>
              ) : (
                "Create Project"
              )}
            </button>
            <button className="btn-secondary flex-1 py-3 font-semibold" onClick={() => setView("home")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
