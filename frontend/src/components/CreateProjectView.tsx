import { useState, useMemo } from "react";
import { createProject } from "../api";
import { BackButton } from "./BackButton";
import type { View } from "./Sidebar";
import { isNativeXlm, XLM_MIN_ESCROW_STROOPS, xlmToStroops } from "../lib/token";
import { 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  Check, 
  Coins, 
  CalendarDays,
  FileText 
} from "lucide-react";

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
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmountXlm, setTotalAmountXlm] = useState("5");
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [submitting, setSubmitting] = useState(false);

  const amountStroops = useMemo(() => xlmToStroops(totalAmountXlm), [totalAmountXlm]);
  const isNative = isNativeXlm(xlmTokenId);
  const isAmountTooLow = isNative && parseInt(amountStroops) < XLM_MIN_ESCROW_STROOPS;

  const estimatedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (parseInt(deadlineDays) || 0));
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }, [deadlineDays]);

  const canContinueStep1 = title.length > 3 && description.length > 10;
  const canContinueStep2 = !isAmountTooLow && parseFloat(totalAmountXlm) > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const deliveryTs = Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400;
      const res = await createProject({
        businessAddress: wallet,
        tokenId: xlmTokenId,
        title,
        description,
        totalAmount: amountStroops,
        deliveryDeadlineTs: deliveryTs,
      });
      loadProjects();
      openProject(res.id);
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => setView("home")} />

          <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-full border border-neutral-200/80 shadow-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= i ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                }`}>
                  {step > i ? <Check size={14} /> : i}
                </div>
                <span className={`text-xs font-medium ${step >= i ? "text-neutral-900" : "text-neutral-400"}`}>
                  {i === 1 ? "Scope" : i === 2 ? "Payment" : "Finalize"}
                </span>
                {i < 3 && <div className="w-4 h-[1px] bg-neutral-200" />}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 md:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-400">Post a job</p>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-neutral-900">
                  Create a professional work post
                </h1>
                <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
                  Write a clear brief, set the budget and timeline, then lock funds in escrow. You approve delivery before any release.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-neutral-600">
                  <span className="rounded-full border border-neutral-200/70 bg-neutral-50 px-3 py-1">Escrow-protected</span>
                  <span className="rounded-full border border-neutral-200/70 bg-neutral-50 px-3 py-1">6-hour cancel</span>
                  <span className="rounded-full border border-neutral-200/70 bg-neutral-50 px-3 py-1">On-chain audit trail</span>
                </div>
              </div>
              <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-900">
                <FileText size={26} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-7 md:p-8 shadow-sm border border-neutral-200/80 min-h-[450px] flex flex-col">
              
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <header>
                    <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
                      <FileText className="text-neutral-900" size={22} /> Product Brief
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">Tell the freelancer what you want shipped.</p>
                  </header>
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      Job title
                    </label>
                    <input
                      className="w-full text-xl font-semibold border-b border-black py-3 focus:border-black outline-none placeholder:text-neutral-300"
                      placeholder="e.g. Build a responsive landing page for a SaaS"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      Brief & deliverables
                    </label>
                    <textarea
                      className="w-full h-48 p-4 bg-neutral-50 rounded-2xl border border-black focus:ring-2 focus:ring-neutral-200 outline-none resize-none"
                      placeholder="Key requirements, milestones, references, and success criteria..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
                    Tip: Add links, reference designs, and clear acceptance criteria to avoid revisions.
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <header>
                    <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
                      <Coins className="text-neutral-900" size={22} /> Budget & Timing
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">Lock funds and set the delivery window.</p>
                  </header>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Escrow Amount</label>
                      <div className="relative group">
                        <input
                          type="number"
                          className="w-full text-3xl font-bold bg-white border-2 border-black rounded-2xl px-6 py-4 focus:border-black outline-none transition-all"
                          value={totalAmountXlm}
                          onChange={(e) => setTotalAmountXlm(e.target.value)}
                        />
                        <span className="absolute right-6 top-5 text-xl font-bold text-neutral-300 group-focus-within:text-neutral-900">XLM</span>
                      </div>
                      {isAmountTooLow && (
                        <p className="text-red-500 text-xs flex items-center gap-1 font-medium italic">
                          <AlertTriangle size={12} /> Minimum 2 XLM required for native escrow.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Delivery Window</label>
                      <div className="relative group">
                        <input
                          type="number"
                          className="w-full text-3xl font-bold bg-white border-2 border-black rounded-2xl px-6 py-4 focus:border-black outline-none transition-all"
                          value={deadlineDays}
                          onChange={(e) => setDeadlineDays(e.target.value)}
                        />
                        <span className="absolute right-6 top-5 text-xl font-bold text-neutral-300">DAYS</span>
                      </div>
                      <p className="text-neutral-700 text-xs font-medium bg-neutral-50 p-2 rounded-lg flex items-center gap-2 border border-neutral-200/60">
                        <CalendarDays size={14} /> Due on {estimatedDate}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 text-center py-8 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={40} />
                  </div>
                  <h2 className="font-display text-3xl font-bold">Post & Lock Funds?</h2>
                  <p className="text-neutral-500 max-w-sm mx-auto">
                    By continuing, {totalAmountXlm} XLM will be locked in the smart contract. You approve delivery before anything is released.
                  </p>
                  <div className="bg-neutral-50 p-6 rounded-2xl text-left space-y-3 border border-neutral-200/60">
                     <div className="flex justify-between text-sm"><span className="text-neutral-500">Contract Asset</span> <span className="font-bold">XLM (Native)</span></div>
                     <div className="flex justify-between text-sm"><span className="text-neutral-500">Security Deposit</span> <span className="font-bold text-neutral-900">{totalAmountXlm} XLM</span></div>
                     <div className="flex justify-between text-sm"><span className="text-neutral-500">Network Reserve</span> <span className="font-bold">~1.0 XLM</span></div>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-8 flex items-center justify-between border-t border-neutral-100">
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="text-neutral-500 font-semibold hover:text-neutral-900 transition-colors">
                    Back
                  </button>
                )}
                <div className="ml-auto">
                  {step < 3 ? (
                    <button
                      disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
                      onClick={() => setStep(step + 1)}
                      className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-2"
                    >
                      Continue <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      disabled={submitting}
                      onClick={handleSubmit}
                      className="btn-primary px-12 py-3 rounded-xl font-semibold shadow-lg"
                    >
                      {submitting ? "Deploying..." : "Confirm & Deposit"}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-neutral-900"><ShieldCheck size={80} /></div>
              <p className="text-xs uppercase tracking-widest text-neutral-400">Escrow guarantee</p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">
                Funds stay on hold until you approve delivery.
              </p>
              <div className="mt-4 space-y-3 text-xs text-neutral-600">
                <div className="flex items-center justify-between">
                  <span>Estimated due date</span>
                  <span className="font-semibold text-neutral-900">{estimatedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Escrow amount</span>
                  <span className="font-semibold text-neutral-900">{totalAmountXlm || "0"} XLM</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-neutral-900"><ShieldCheck size={80} /></div>
              <h3 className="text-xs font-black uppercase tracking-tighter text-neutral-400 mb-6">Escrow Preview</h3>
              <div className="space-y-4 relative z-10 text-neutral-900">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase">Project</label>
                  <p className="font-bold truncate">{title || "Untitled Project"}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase">Locking</label>
                    <p className="text-xl font-black text-emerald-600">{totalAmountXlm} XLM</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] text-neutral-500 uppercase">Wait Period</label>
                    <p className="font-bold">{deadlineDays} Days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-neutral-900 mb-4">What happens next</h4>
              <div className="space-y-3 text-xs text-neutral-600">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                  <div>Post your job and lock funds in escrow.</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                  <div>Freelancer accepts and starts delivery.</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                  <div>You approve delivery, then funds release.</div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-5 flex gap-4">
              <Info size={20} className="text-neutral-600 shrink-0" />
              <p className="text-xs text-neutral-700 leading-relaxed">
                <strong>Stellar Network Notice:</strong> Once created, you will have a 6-hour window to cancel if the freelancer has not accepted. After that, funds are locked until the deadline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}