import { useEffect, useMemo, useState } from "react";
import { Section } from "./Section";
import { EmptyState } from "./EmptyState";
import { CopyButton } from "./CopyButton";
import { txUrl } from "../lib/stellar-explorer";
import { stroopsToXlm } from "../lib/token";

type TxItem = {
  id: string;
  type: string;
  hash: string;
  amount: string;
  ts: number;
  projectId: string;
};

export function TransactionsView() {
  const [items, setItems] = useState<TxItem[]>([]);

  useEffect(() => {
    const all: TxItem[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("gigx:tx:")) continue;
        const projectId = key.replace("gigx:tx:", "");
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Omit<TxItem, "projectId">[];
        parsed.forEach((t) => all.push({ ...t, projectId }));
      }
    } catch {}
    all.sort((a, b) => b.ts - a.ts);
    setItems(all);
  }, []);

  const grouped = useMemo(() => items, [items]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Section title="Transactions">
        {grouped.length === 0 ? (
          <EmptyState title="No transactions yet" description="Transactions you make in the dapp will appear here." />
        ) : (
          <div className="space-y-3">
            {grouped.map((tx) => (
              <div
                key={`${tx.projectId}-${tx.id}`}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{tx.type}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(tx.ts).toLocaleString()} · Project {tx.projectId}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-neutral-900">{stroopsToXlm(tx.amount)} XLM</p>
                  <div className="flex items-center gap-2 md:justify-end">
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
      </Section>
    </div>
  );
}
