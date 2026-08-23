import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";

export function ResultCard({ result }: { result: PredictionResult }) {
  const fraud = result.label === "fraudulent";
  const pct = Number(result.confidence.replace("%", ""));

  return (
    <section
      className={`glass-card animate-rise rounded-3xl p-5 sm:p-7 ${
        fraud ? "ring-1 ring-danger/40" : "ring-1 ring-success/40"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
            fraud ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
          }`}
        >
          {fraud ? <XCircle className="size-6" /> : <CheckCircle2 className="size-6" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Model verdict
          </p>
          <h3
            className={`text-xl font-bold sm:text-2xl ${fraud ? "text-danger" : "text-success"}`}
          >
            {fraud ? "Fraudulent Job Posting" : "Genuine Job Posting"}
          </h3>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confidence score</span>
          <span className="font-display text-lg font-bold">{result.confidence}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/60">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              fraud ? "bg-danger" : "bg-success"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {fraud && result.indicators.length > 0 && (
        <div className="mt-6 rounded-2xl border border-danger/25 bg-danger/8 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="size-4" /> Scam indicators detected
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.indicators.map((i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!fraud && (
        <p className="mt-5 text-sm text-muted-foreground">
          No common scam patterns were found. Still verify the employer domain and never
          pay a fee to secure a role.
        </p>
      )}
    </section>
  );
}
