import { useState, useEffect } from "react";

export function Countdown({
  deadlineTs,
  label,
  className,
}: {
  deadlineTs: number;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      if (now >= deadlineTs) {
        setText(`${label}: Expired`);
        return;
      }
      const d = deadlineTs - now;
      const days = Math.floor(d / 86400);
      const h = Math.floor((d % 86400) / 3600);
      const m = Math.floor((d % 3600) / 60);
      setText(`${label}: ${days}d ${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [deadlineTs, label]);

  const isExpired = text.includes("Expired");
  return (
    <span className={`font-medium ${isExpired ? "text-red-600" : "text-neutral-700"} ${className ?? ""}`}>
      {text}
    </span>
  );
}
