import { useEffect, useState } from "react";
import {
  createEscrow,
  completeJob,
  clientCancelWithin6h,
  claimRefundAfterHardDeadline,
  mapContractError,
  VALID_TOKEN_ID,
} from "../contract";
import { setProjectJob } from "../api";
import type { Project, StartResponse } from "../api";
import { ActionCard } from "./ActionCard";
import { Countdown } from "./Countdown";
import { ConfirmModal } from "./ConfirmModal";
import { CopyButton } from "./CopyButton";
import {
  isNativeXlm,
  CONTRACT_MIN_AMOUNT,
  preflightCreateEscrow,
  stroopsToXlm,
  canSubmitNativeXlmEscrow,
  NATIVE_XLM_RESERVE_ERROR,
} from "../lib/token";
import { useNativeXlmGuard } from "../lib/useNativeXlmGuard";
import { useToast } from "../lib/ToastContext";
import { txUrl } from "../lib/stellar-explorer";

const SIX_HOURS_SEC = 6 * 3600;

function formatSeconds(sec: number): string {
  if (sec <= 0) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec % 60}s`;
}

interface ActionsListProps {
  project: Project;
  wallet: string;
  startInfo: StartResponse | null;
  setError: (s: string) => void;
  refreshProject: () => Promise<void>;
}

export function ActionsList({
  project,
  wallet,
  startInfo,
  setError,
  refreshProject,
}: ActionsListProps) {
  const { showToast } = useToast();
  
  const [actionLoading, setActionLoading] = useState<"pay" | "complete" | "cancel6h" | "refund" | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [txHistory, setTxHistory] = useState<
    { id: string; type: string; hash: string; amount: string; ts: number }[]
  >([]);

  const isHiring = project.businessAddress === wallet;
  const isFreelancer = project.freelancerAddress === wallet;
  const storageKey = `gigx:tx:${project.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id: string; type: string; hash: string; amount: string; ts: number }[];
      setTxHistory(parsed);
    } catch {}
  }, [storageKey]);

  const addTxEntry = (entry: { type: string; hash: string; amount: string }) => {
    const item = { id: `${Date.now()}-${entry.type}`, ...entry, ts: Date.now() };
    const next = [item, ...txHistory].slice(0, 25);
    setTxHistory(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  
  const nowSec = Math.floor(Date.now() / 1000);
  const fundedAt = startInfo?.jobFundedAt ? Number(startInfo.jobFundedAt) : 0;
  
  const softDeadline = startInfo?.jobSoftDeadline 
    ? Number(startInfo.jobSoftDeadline) 
    : project.deliveryDeadlineTs;
    
  const hardDeadline = startInfo?.jobHardDeadline 
    ? Number(startInfo.jobHardDeadline) 
    : project.deliveryDeadlineTs + (7 * 24 * 3600);

  const cancelWindowEnd = fundedAt > 0 ? fundedAt + SIX_HOURS_SEC : 0;

  const needsFunding = (startInfo?.status === "payment_required" || !startInfo);
  
  const canFund = 
    isHiring && 
    !!project.contractId && 
    needsFunding && 
    !!project.freelancerAddress && 
    !!project.totalAmount;

  const canCompleteJob = 
    isHiring && 
    !!project.contractId && 
    project.jobId != null && 
    startInfo?.status === "ready";

  const canCancel6h = 
    isHiring &&
    !!project.contractId &&
    project.jobId != null &&
    startInfo?.status === "ready" &&
    fundedAt > 0 && 
    nowSec < cancelWindowEnd;

  const canClaimRefund = 
    isHiring && 
    !!project.contractId && 
    project.jobId != null && 
    (startInfo?.status === "ready" || startInfo?.status === "disputed") &&
    nowSec >= hardDeadline;

  const amountStroops = BigInt(project.totalAmount || "0");
  const isNative = isNativeXlm(project.tokenId);

  const guard = useNativeXlmGuard(
    project.tokenId ?? "",
    project.totalAmount ?? "0",
    wallet,
    !!canFund && !!project.tokenId && !!wallet && isNative
  );

  const nativeCanSubmit = 
    !isNative || 
    (guard.spendableLoaded && canSubmitNativeXlmEscrow(guard.spendable, project.totalAmount ?? "0"));

  const canSubmitEscrow = 
    canFund && 
    !!project.tokenId &&
    (isNative 
      ? nativeCanSubmit 
      : amountStroops >= BigInt(CONTRACT_MIN_AMOUNT));

  const payDisabled = !!actionLoading || !canSubmitEscrow;

  const handleCreateEscrow = async () => {
    if (!project.contractId || !project.freelancerAddress || !project.tokenId || !project.totalAmount) {
      setError("Missing project configuration.");
      return;
    }

    if (!canSubmitEscrow) {
      setError(
        guard.errorMessage ?? 
        (isNative ? NATIVE_XLM_RESERVE_ERROR : "Validation failed. Check amount.")
      );
      return;
    }

    setActionLoading("pay");
    setError("");
    setTxHash("");

    try {
      const preflight = await preflightCreateEscrow(
        wallet,
        VALID_TOKEN_ID,
        project.totalAmount,
        project.deliveryDeadlineTs
      );

      if (!preflight.ok) {
        throw new Error(preflight.error ?? "Preflight validation failed");
      }

      const { jobId, txHash: hash } = await createEscrow(
        project.contractId,
        project.freelancerAddress,
        VALID_TOKEN_ID,
        project.totalAmount,
        project.deliveryDeadlineTs
      );

      setTxHash(hash);

      await setProjectJob(project.id, jobId);
      await refreshProject();
      
      showToast("success", "Escrow funded successfully!");
      addTxEntry({ type: "Escrow funded", hash, amount: project.totalAmount });
    } catch (e: any) {
      const msg = mapContractError(e);
      console.error("[createEscrow] Error:", e);
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteJob = async () => {
    if (!project.contractId || project.jobId == null) return;
    
    setActionLoading("complete");
    setError("");
    setTxHash("");

    try {
      const hash = await completeJob(wallet, project.contractId, project.jobId);
      setTxHash(hash);
      await refreshProject();
      showToast("success", "Job completed. Funds released to freelancer.");
      addTxEntry({ type: "Job completed", hash, amount: project.totalAmount });
    } catch (e: any) {
      setError(mapContractError(e));
    } finally {
      setActionLoading(null);
    }
  };

  const doCancel6h = async () => {
    if (!project.contractId || project.jobId == null) return;
    
    setActionLoading("cancel6h");
    setError("");
    setTxHash("");

    try {
      const hash = await clientCancelWithin6h(wallet, project.contractId, project.jobId);
      setTxHash(hash);
      await refreshProject();
      setShowCancelModal(false);
      showToast("success", "Cancelled. Refund issued.");
      addTxEntry({ type: "Client cancel (6h)", hash, amount: project.totalAmount });
    } catch (e: any) {
      setError(mapContractError(e));
    } finally {
      setActionLoading(null);
    }
  };

  const doClaimRefund = async () => {
    if (!project.contractId || project.jobId == null) return;
    
    setActionLoading("refund");
    setError("");
    setTxHash("");

    try {
      const hash = await claimRefundAfterHardDeadline(wallet, project.contractId, project.jobId);
      setTxHash(hash);
      await refreshProject();
      setShowRefundModal(false);
      showToast("success", "Refund claimed successfully.");
      addTxEntry({ type: "Refund claimed", hash, amount: project.totalAmount });
    } catch (e: any) {
      setError(mapContractError(e));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {isHiring && !project.freelancerAddress && (
        <ActionCard
          title="Select Freelancer"
          description="Review applicants and select a freelancer to begin."
          status="pending"
        />
      )}

      {isHiring && project.freelancerAddress && !project.contractId && (
        <ActionCard
          title="System Config Required"
          description="Escrow contract ID missing. Please check backend configuration."
          status="pending"
        />
      )}

      {canFund && (
        <div className="border rounded-2xl p-6 md:p-8 bg-gradient-to-br from-sky-50/90 to-white border-sky-200/80 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="font-display font-bold text-lg mb-2 text-sky-900">Activate Escrow</h4>
            <p className="text-sm text-sky-800 mb-5 max-w-lg">
              Deposit <span className="font-semibold">{stroopsToXlm(project.totalAmount)} XLM</span> into the smart contract. 
              Funds are held securely until the work is approved.
            </p>

            {isNative && (
              <div className="mb-5 p-4 bg-white/60 rounded-xl border border-sky-100/50 text-sm text-sky-900">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sky-700 font-medium">Your Wallet Spendable:</span>
                  <span className="font-mono font-bold text-lg">
                    {guard.spendableLoaded ? stroopsToXlm(guard.spendable) : "..."} <span className="text-xs font-sans font-normal text-sky-600">XLM</span>
                  </span>
                </div>
                
                {guard.errorMessage ? (
                  <p className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded mt-2 border border-red-100">
                    ⚠️ {guard.errorMessage}
                  </p>
                ) : (
                  <p className="text-sky-600/80 text-xs">
                    Includes 1 XLM mandatory network reserve.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn-primary w-full md:w-auto px-8 py-3 rounded-xl font-semibold shadow-sky-200/50 shadow-lg disabled:opacity-60 disabled:shadow-none transition-all"
              onClick={handleCreateEscrow}
              disabled={payDisabled}
            >
              {actionLoading === "pay" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white" />
                  Processing Transaction...
                </span>
              ) : (
                `Lock ${stroopsToXlm(project.totalAmount)} XLM & Start`
              )}
            </button>

            {txHash && (
              <div className="mt-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Sent
                </div>
                <a href={txUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline font-mono text-xs truncate max-w-[120px]">
                  {txHash}
                </a>
                <CopyButton text={txHash} label="Copy" />
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="Cancel Escrow?"
        message="Since it has been less than 6 hours, you can cancel immediately. The full amount will be refunded to your wallet."
        confirmLabel="Yes, Cancel & Refund"
        cancelLabel="Keep Active"
        variant="danger"
        onConfirm={doCancel6h}
        onCancel={() => setShowCancelModal(false)}
        loading={actionLoading === "cancel6h"}
      />
      <ConfirmModal
        open={showRefundModal}
        title="Claim Refund?"
        message="The hard deadline has passed. You are entitled to claim a full refund of the escrowed funds."
        confirmLabel="Claim Refund"
        cancelLabel="Close"
        variant="danger"
        onConfirm={doClaimRefund}
        onCancel={() => setShowRefundModal(false)}
        loading={actionLoading === "refund"}
      />

      {startInfo?.status === "ready" && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/50 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-neutral-900">Escrow Active</h3>
                  <p className="text-sm text-neutral-500">Funds are securely locked on the blockchain</p>
                </div>
                <div className="text-right">
                   <div className="font-display text-2xl font-bold text-emerald-700">
                    {stroopsToXlm(project.totalAmount)} XLM
                   </div>
                   <div className="text-xs text-emerald-600/80 font-medium uppercase tracking-wide">Locked Amount</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 p-4 bg-white/80 rounded-xl border border-emerald-100/50">
                 <div>
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mb-1">Deliver By (Soft Deadline)</span>
                    <span className="text-sm font-medium text-neutral-700">
                      <Countdown deadlineTs={softDeadline} label="" />
                    </span>
                 </div>
                 <div>
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mb-1">Auto-Refund (Hard Deadline)</span>
                    <span className="text-sm font-medium text-neutral-700">
                      <Countdown deadlineTs={hardDeadline} label="" />
                    </span>
                 </div>
              </div>

              {isHiring && (
                <div className="mt-6 space-y-3">
                   {canCancel6h ? (
                      <div className="flex items-center justify-between gap-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-900">
                        <span>You can cancel for a full refund for <strong>{formatSeconds(cancelWindowEnd - nowSec)}</strong> more.</span>
                        <button 
                          onClick={() => setShowCancelModal(true)}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 underline disabled:opacity-50"
                          disabled={!!actionLoading}
                        >
                          Cancel Now
                        </button>
                      </div>
                   ) : fundedAt > 0 && (
                      <p className="text-xs text-neutral-400 text-center">Safety cancellation window has expired.</p>
                   )}
                </div>
              )}
              
              {isFreelancer && (
                 <div className="mt-4 text-sm text-neutral-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                    <p><strong>Action Required:</strong> Complete the work and submit it. Once the client approves, the {stroopsToXlm(project.totalAmount)} XLM will be released to your wallet immediately.</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canCompleteJob && (
        <div className="border rounded-2xl p-6 md:p-8 bg-white border-neutral-200 shadow-sm">
          <h4 className="font-display font-bold text-lg text-neutral-900 mb-2">Finalize Job</h4>
          <p className="text-sm text-neutral-600 mb-6">
            Review the work. If satisfied, complete the job to release funds. If the hard deadline has passed without delivery, you may claim a refund.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-emerald-200/50 shadow-lg disabled:opacity-50"
              onClick={handleCompleteJob}
              disabled={!!actionLoading}
            >
              {actionLoading === "complete" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white" />
                  Releasing Funds...
                </span>
              ) : (
                "Approve & Release Funds"
              )}
            </button>

            {canClaimRefund && (
              <button
                type="button"
                className="btn-secondary border-red-200 text-red-700 hover:bg-red-50 px-6 py-3 rounded-xl font-medium"
                onClick={() => setShowRefundModal(true)}
                disabled={!!actionLoading}
              >
                {actionLoading === "refund" ? "Processing..." : "Claim Refund (Expired)"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-2xl p-6 md:p-7 bg-white border-neutral-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display font-bold text-lg text-neutral-900">Transaction Activity</h4>
          <span className="text-xs text-neutral-400">Saved on this device</span>
        </div>
        {txHistory.length === 0 ? (
          <p className="text-sm text-neutral-500">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {txHistory.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-neutral-50/80 border border-neutral-100"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{tx.type}</p>
                  <p className="text-xs text-neutral-500">{new Date(tx.ts).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">{stroopsToXlm(tx.amount)} XLM</p>
                  <div className="flex items-center gap-2 justify-end">
                    <a
                      href={txUrl(tx.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-500 hover:underline font-mono"
                    >
                      {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
                    </a>
                    <CopyButton text={tx.hash} label="Copy" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}