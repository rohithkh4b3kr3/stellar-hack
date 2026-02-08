import { Icons } from "./Icons";
import { Feature } from "./Feature";
import type { Role } from "./Sidebar";
import type { View } from "./Sidebar";

export function LandingPage({
  wallet,
  freighterOk,
  connect,
  setRole,
  setView,
  loadProjects,
  error,
}: {
  wallet: string | null;
  freighterOk: boolean;
  connect: () => Promise<void>;
  setRole: (r: Role) => void;
  setView: (v: View) => void;
  loadProjects: () => Promise<void>;
  error: string;
  setError: (s: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 md:p-12 border border-neutral-200/50">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-neutral-900 text-white rounded-xl flex items-center justify-center font-display text-2xl font-bold mx-auto mb-4">
            gig
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 mb-3 tracking-tight">
            gigX
          </h1>
          <p className="text-neutral-500 max-w-sm mx-auto text-sm leading-relaxed">
            Smart contract escrow. Funds on hold until you’re both happy.
          </p>
        </div>

        {!wallet && (
          <div className="grid grid-cols-3 gap-3 mb-10">
            <Feature title="Secure" description="Locked in contract" />
            <Feature title="On-chain" description="Transparent" />
            <Feature title="Trustless" description="No middleman" />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <Icons.AlertCircle />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {!wallet || !freighterOk ? (
            <>
              <button
                className="btn-primary w-full py-3.5 rounded-xl"
                onClick={connect}
              >
                {freighterOk ? "Connect Freighter" : "Install Freighter"}
              </button>
              <p className="text-center text-xs text-neutral-400">
                Testnet XLM:{" "}
                <a href="https://lab.stellar.org" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:underline">
                  lab.stellar.org
                </a>
              </p>
            </>
          ) : (
            <>
              <button
                className="btn-primary w-full py-3.5 rounded-xl"
                onClick={() => { setRole("hiring"); setView("home"); loadProjects(); }}
              >
                Hire Freelancers
              </button>
              <button
                className="btn-secondary w-full py-3.5 rounded-xl"
                onClick={() => { setRole("freelancer"); setView("home"); loadProjects(); }}
              >
                Find Work
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
