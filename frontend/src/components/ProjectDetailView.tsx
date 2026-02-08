import { useState } from "react";
import { applyToProject } from "../api";
import type { Project } from "../api";
import type { StartResponse } from "../api";
import { Icons } from "./Icons";
import { Countdown } from "./Countdown";
import { BackButton } from "./BackButton";
import { DetailItem } from "./DetailItem";
import { ApplicantItem } from "./ApplicantItem";
import { ActionsList } from "./ActionsList";
import { ChatPanel } from "./ChatPanel";
import { EscrowProgress } from "./EscrowProgress";
import { CopyButton } from "./CopyButton";
import { stroopsToXlm } from "../lib/token";
import { useToast } from "../lib/ToastContext";

export function ProjectDetailView({
  project,
  startInfo,
  wallet,
  setError,
  refreshProject,
  goBack,
}: {
  project: Project;
  startInfo: StartResponse | null;
  wallet: string;
  role: string;
  setError: (s: string) => void;
  refreshProject: () => Promise<void>;
  goBack: () => void;
}) {
  const isHiring = project.businessAddress === wallet;
  const isFreelancer = project.freelancerAddress === wallet;
  const { showToast } = useToast();
  const [applying, setApplying] = useState(false);
  const canApply = !!wallet && !isHiring && !project.freelancerAddress;
  const isApplied = project.applicants.includes(wallet);

  const handleApply = async () => {
    if (!wallet || applying || isApplied) return;
    setApplying(true);
    setError("");
    try {
      await applyToProject(project.id, wallet);
      await refreshProject();
      setError("");
      showToast("success", "Application submitted. The client will review applicants.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const escrowStep =
    startInfo?.status === "completed" || startInfo?.status === "cancelled" || startInfo?.status === "refunded"
      ? "delivered"
      : startInfo?.status === "ready"
        ? "funded"
        : "created";

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto bg-[#fafafa] min-h-full">
      <BackButton onClick={goBack} />

      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 md:p-10 shadow-sm">
        {project.contractId && (
          <div className="mb-6 p-5 bg-neutral-50/80 rounded-xl border border-neutral-100">
            <EscrowProgress current={escrowStep} />
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              {project.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              {project.contractId && (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200/60">
                  Escrow Active
                </span>
              )}
              {isHiring && (
                <span className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold border border-sky-200/60">
                  Your Project
                </span>
              )}
              {isFreelancer && (
                <span className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-semibold border border-violet-200/60">
                  Accepted
                </span>
              )}
            </div>
          </div>
          <p className="text-neutral-500 text-base leading-relaxed">{project.description}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <DetailItem label="Escrow amount" value={`${stroopsToXlm(project.totalAmount)} XLM`} />
          <DetailItem label="Delivery deadline" value={<Countdown deadlineTs={project.deliveryDeadlineTs} label="" />} />
          <DetailItem
            label="Status"
            value={
              startInfo?.status === "ready"
                ? "Money on Hold"
                : startInfo?.status === "reviewing"
                  ? "Reviewing Delivery"
                  : startInfo?.status === "completed"
                    ? "Completed"
                    : startInfo?.status === "cancelled"
                      ? "Cancelled"
                      : startInfo?.status === "refunded"
                        ? "Refunded"
                        : (startInfo?.totalAmount ?? startInfo?.advanceAmount) &&
                            startInfo?.status !== "completed" &&
                            startInfo?.status !== "refunded"
                          ? "Fund escrow"
                          : "New"
            }
          />
        </div>

        {canApply && (
          <div className="mb-8 p-6 rounded-xl border border-neutral-200 bg-neutral-50/80">
            {isApplied ? (
              <p className="text-neutral-700 font-semibold flex items-center gap-2">
                <Icons.CheckCircle />
                You have applied. The client will choose a freelancer from the applicants.
              </p>
            ) : (
              <div>
                <p className="text-neutral-700 font-semibold mb-4">
                  Interested? Apply and the client will see your wallet address.
                </p>
                <button type="button" className="btn-primary" onClick={handleApply} disabled={applying}>
                  {applying ? "Applying…" : "Apply to this project"}
                </button>
              </div>
            )}
          </div>
        )}

        {isHiring && (
          <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-6 mb-8">
            <h3 className="font-display text-lg font-bold text-neutral-900 mb-4">Applicants ({project.applicants.length})</h3>
            {project.applicants.length === 0 ? (
              <p className="text-neutral-600 text-sm">No applicants yet</p>
            ) : (
              <div className="space-y-3">
                {project.applicants.map((addr) => (
                  <ApplicantItem
                    key={addr}
                    address={addr}
                    projectId={project.id}
                    isSelected={project.freelancerAddress === addr}
                    setError={setError}
                    loadProjects={() => {}}
                    onAccepted={async () => {
                      await refreshProject();
                      showToast("success", "Freelancer accepted. You can now fund the escrow.");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <ActionsList
          project={project}
          wallet={wallet}
          startInfo={startInfo}
          setError={setError}
          refreshProject={refreshProject}
        />

        {project.freelancerAddress && (isHiring || isFreelancer) && (
          <div className="mt-8">
            <ChatPanel
              projectId={project.id}
              wallet={wallet}
              peer={isHiring ? project.freelancerAddress : project.businessAddress}
            />
          </div>
        )}
        <div className="mt-8 flex items-center justify-between">
          <button
            className="btn-secondary px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
            onClick={refreshProject}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.22-8.56" />
              <path d="M21 3v6h-6" />
            </svg>
            Refresh Status
          </button>
          {project.freelancerAddress && (
            <div className="flex items-center gap-2 text-neutral-500 text-sm">
              <span className="font-mono truncate max-w-[180px]">
                {project.freelancerAddress.slice(0, 10)}…{project.freelancerAddress.slice(-6)}
              </span>
              <CopyButton text={project.freelancerAddress} label="Copy address" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
