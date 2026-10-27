import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";
import { getExtras } from "@/features/insights/types";

/**
 * Scam Signals checklist — renders the optional `signals` list returned by
 * the prediction API. Hides completely when the API does not provide it.
 */
export function ScamSignalsPanel({ result }: { result: PredictionResult }) {
  const signals = getExtras(result).signals;
  if (!signals || signals.length === 0) return null;

  const detected = signals.filter((s) => s.detected).length;

  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" /> Scam signals
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            detected > 0 ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
          }`}
        >
          {detected} of {signals.length} signals detected
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {signals.map((signal) => (
          <li
            key={signal.name}
            className="flex items-start gap-3 rounded-2xl border border-border/60 p-3"
          >
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                signal.detected ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
              }`}
            >
              {signal.detected ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{signal.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    signal.detected ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                  }`}
                >
                  {signal.detected ? "Detected" : "Clear"}
                </span>
              </div>
              {signal.detail && (
                <p className="mt-1 text-[11px] text-muted-foreground">{signal.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
