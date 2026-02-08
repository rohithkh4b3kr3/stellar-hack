type Step = "created" | "funded" | "delivered";

export function EscrowProgress({
  current,
}: {
  current: Step;
}) {
  const steps: { key: Step; label: string }[] = [
    { key: "created", label: "Created" },
    { key: "funded", label: "Funded" },
    { key: "delivered", label: "Delivered" },
  ];

  const idx = steps.findIndex((s) => s.key === current);
  const activeIdx = idx >= 0 ? idx : 0;

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, i) => {
        const isActive = i <= activeIdx;
        const isCurrent = i === activeIdx;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div
              className={`flex items-center gap-2 flex-shrink-0 ${
                isActive ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  isCurrent
                    ? "bg-neutral-900 text-white ring-4 ring-neutral-200"
                    : isActive
                      ? "bg-neutral-200 text-neutral-700"
                      : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {i < activeIdx ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-sm font-semibold hidden sm:inline ${isCurrent ? "" : ""}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                  i < activeIdx ? "bg-neutral-300" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
