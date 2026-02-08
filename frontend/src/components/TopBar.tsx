import { CopyButton } from "./CopyButton";

export function TopBar({ wallet }: { wallet: string }) {
  return (
    <div className="h-16 border-b border-neutral-200/80 flex items-center justify-between px-6 md:px-8 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
        <span className="font-mono text-sm text-neutral-700">
          {wallet.slice(0, 6)}…{wallet.slice(-4)}
        </span>
        <CopyButton text={wallet} label="Copy wallet" className="text-neutral-500" />
      </div>
    </div>
  );
}
