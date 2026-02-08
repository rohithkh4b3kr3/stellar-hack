import { Shield, Zap, Lock, ArrowUpRight, Activity } from "lucide-react";

const ONCHAIN_FEATURES = [
  {
    title: "Escrow-secured funds",
    description: "Client funds are locked on-chain until delivery is approved.",
    Icon: Shield,
  },
  {
    title: "6-hour cancel window",
    description: "Cancel early without risk if the scope changes quickly.",
    Icon: Zap,
  },
  {
    title: "Hard deadline protection",
    description: "Automatic guardrails if the delivery window is missed.",
    Icon: Lock,
  },
  {
    title: "On-chain transaction history",
    description: "Every transfer and state change is verifiable on Stellar.",
    Icon: Activity,
  },
];

const HOW_IT_WORKS = [
  { title: "Post job", description: "Create a brief with budget and delivery window." },
  { title: "Lock funds", description: "Escrow secures the amount on-chain." },
  { title: "Deliver work", description: "Freelancer ships milestones and updates." },
  { title: "Approve & release", description: "Client approves, funds release instantly." },
];

const FAQS = [
  {
    q: "When can I cancel a job?",
    a: "You can cancel within 6 hours of funding if the freelancer has not accepted.",
  },
  {
    q: "How are funds protected?",
    a: "Funds are locked in escrow on Stellar and release only after approval.",
  },
  {
    q: "What happens if deadlines are missed?",
    a: "Hard deadlines trigger refund logic according to the escrow rules.",
  },
];

export function HomeView({ projects = [] }: { projects: any[] }) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900">
      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <section className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-8 md:p-12 shadow-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="home-grid h-full w-full opacity-60" />
          </div>
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-3 py-1 text-[11px] font-semibold text-neutral-600">
                <Activity size={12} className="text-neutral-700" />
                On-chain escrow system
              </div>
              <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold text-neutral-900">
                Post jobs. Lock funds. Approve delivery.
              </h1>
              <p className="mt-3 text-sm text-neutral-600 max-w-xl">
                A clean, escrow-first workflow where payments only release after the client signs off.
                Every action is recorded on-chain for full transparency.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn-primary">
                  Post job <ArrowUpRight size={16} className="ml-2" />
                </button>
                <button className="btn-secondary">Explore projects</button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 max-w-xl">
                <div className="rounded-2xl border border-neutral-200/70 bg-white px-4 py-3">
                  <div className="text-2xl font-bold text-neutral-900">{projects.length}</div>
                  <div className="text-[11px] uppercase tracking-widest text-neutral-400">Active jobs</div>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white px-4 py-3">
                  <div className="text-2xl font-bold text-neutral-900">6h</div>
                  <div className="text-[11px] uppercase tracking-widest text-neutral-400">Cancel window</div>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white px-4 py-3">
                  <div className="text-2xl font-bold text-neutral-900">100%</div>
                  <div className="text-[11px] uppercase tracking-widest text-neutral-400">On-chain</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-widest text-neutral-400">On-chain protections</p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">
                  Built for trustless delivery and automated protection.
                </p>
                <div className="mt-4 space-y-3 text-sm text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span>Escrow contracts</span>
                    <span className="font-semibold text-neutral-900">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cancel clause</span>
                    <span className="font-semibold text-neutral-900">6 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit trail</span>
                    <span className="font-semibold text-neutral-900">Stellar</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-900 p-6 text-white shadow-sm">
                <p className="text-xs uppercase tracking-widest text-neutral-400">On-chain advantages</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Immutable records</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Tamper-proof escrow</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Public verification</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Instant settlement</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-400">On-chain features</p>
              <h2 className="font-display text-2xl font-bold text-neutral-900">
                Everything runs on Stellar
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ONCHAIN_FEATURES.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-2xl border border-neutral-200/80 bg-black p-5 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-400">How it works</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-neutral-900">
              Clear workflow, no surprises
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {HOW_IT_WORKS.map((step, idx) => (
                <div key={step.title} className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-5">
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Step {idx + 1}
                  </div>
                  <div className="mt-2 font-semibold text-neutral-900">{step.title}</div>
                  <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-neutral-200/80 bg-neutral-900 p-8 text-white shadow-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Built for both sides</p>
            <h2 className="mt-2 text-2xl font-semibold">Clients & freelancers stay aligned.</h2>
            <div className="mt-6 space-y-4 text-sm text-neutral-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Clear milestones and delivery criteria
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Real-time chat with on-chain payment clarity
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Transparent history for every transaction
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-400">On-chain activity</p>
              <h2 className="font-display text-2xl font-bold text-neutral-900">Active escrows</h2>
            </div>
            <span className="text-xs text-neutral-500">{projects.length} total</span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.length > 0 ? (
              projects.map((p: any, i: number) => (
                <div key={p.id ?? i} className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                      <Lock size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">IDX_{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h4 className="font-semibold text-neutral-900 truncate">{p.title || "Untitled Project"}</h4>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-neutral-900">{p.totalAmount ?? "0"}</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">XLM</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span>Status: {p.status ?? "Active"}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      On-chain
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
                No escrows yet. Post a job to create your first on-chain contract.
              </div>
            )}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Frequently asked</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-neutral-900">Questions & answers</h2>
            <div className="mt-6 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4">
                  <div className="text-sm font-semibold text-neutral-900">{faq.q}</div>
                  <div className="mt-2 text-sm text-neutral-600">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Get started</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-neutral-900">
              Post a job and experience on-chain escrow for yourself.
            </h2>
            <p className="mt-3 text-sm text-neutral-600 max-w-xl">
              Create a professional brief, set escrow, and invite the best talent. You stay in control until delivery is approved.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary">
                Post job <ArrowUpRight size={16} className="ml-2" />
              </button>
              <button className="btn-secondary">Browse talent</button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-neutral-500">
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-3">
                <div className="text-lg font-semibold text-neutral-900">24h</div>
                Avg kickoff
              </div>
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-3">
                <div className="text-lg font-semibold text-neutral-900">0%</div>
                Platform fees
              </div>
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-3">
                <div className="text-lg font-semibold text-neutral-900">100%</div>
                On-chain
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}