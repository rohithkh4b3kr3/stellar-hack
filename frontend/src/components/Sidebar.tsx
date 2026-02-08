import { Icons } from "./Icons";

export type View =
  | "landing"
  | "home"
  | "create"
  | "project"
  | "applicants"
  | "search"
  | "history"
  | "transactions"
  | "my-projects";
export type Role = "hiring" | "freelancer" | null;

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
        active
          ? "bg-white text-neutral-900 shadow-sm"
          : "text-neutral-400 hover:bg-neutral-800/80 hover:text-white"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function Sidebar({
  role,
  view,
  setView,
  setRole,
  wallet,
}: {
  role: string;
  view: View;
  setView: (v: View) => void;
  setRole: (r: Role) => void;
  wallet: string;
}) {
  return (
    <aside className="w-64 bg-neutral-900 text-white flex flex-col border-r border-neutral-800/80">
      <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">gigX</h1>
      </div>

      <nav className="flex-1 py-6 space-y-1 px-3">
        <NavItem icon={<Icons.Home />} label="Home" active={view === "home"} onClick={() => setView("home")} />
        <NavItem
          icon={<Icons.CheckCircle />}
          label="My Projects"
          active={view === "my-projects"}
          onClick={() => setView("my-projects")}
        />
        {role === "hiring" && (
          <>
            <NavItem icon={<Icons.Plus />} label="Post job" active={view === "create"} onClick={() => setView("create")} />
            <NavItem
              icon={<Icons.Users />}
              label="Applicants"
              active={view === "applicants"}
              onClick={() => setView("applicants")}
            />
          </>
        )}
        <NavItem icon={<Icons.Search />} label="Browse" active={view === "search"} onClick={() => setView("search")} />
        <NavItem icon={<Icons.Clock />} label="History" active={view === "history"} onClick={() => setView("history")} />
        <NavItem icon={<Icons.Activity />} label="Transactions" active={view === "transactions"} onClick={() => setView("transactions")} />
      </nav>

      <div className="p-4 border-t border-neutral-800 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80">
          <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-xs font-bold text-white">
            {wallet.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wide">{role === "hiring" ? "Manager" : "Freelancer"}</div>
            <div className="text-xs text-neutral-400 truncate font-mono" title={wallet}>
              {wallet.slice(0, 8)}...
            </div>
          </div>
        </div>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors duration-200 hover:bg-neutral-800 rounded-lg"
          onClick={() => {
            setRole(null);
            setView("landing");
          }}
          title="Switch role"
        >
          <Icons.LogOut />
          <span>Switch Role</span>
        </button>
      </div>
    </aside>
  );
}
