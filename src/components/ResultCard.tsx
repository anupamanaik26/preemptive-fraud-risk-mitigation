import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";

export function ResultCard({ result }: { result: PredictionResult }) {
  const fraud = result.label === "fraudulent";
  const suspicious = result.prediction === "SUSPICIOUS JOB POSTING";
  const pct = Number(result.confidence.replace("%", ""));

  const tone = suspicious
    ? { text: "text-warning", bg: "bg-warning/15", ring: "ring-warning/40", title: "Suspicious Job Posting" }
    : fraud
      ? { text: "text-danger", bg: "bg-danger/15", ring: "ring-danger/40", title: "Fraudulent Job Posting" }
      : { text: "text-success", bg: "bg-success/15", ring: "ring-success/40", title: "Genuine Job Posting" };

  return (
    <section className={`glass-card animate-rise rounded-3xl p-5 ring-1 sm:p-7 ${tone.ring}`}>
      <div className="flex items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}
        >
          {suspicious ? (
            <AlertTriangle className="size-6" />
          ) : fraud ? (
            <XCircle className="size-6" />
          ) : (
            <CheckCircle2 className="size-6" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Model verdict
          </p>
          <h3 className={`text-xl font-bold sm:text-2xl ${tone.text}`}>{tone.title}</h3>
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          {
            name: "XGBoost · TF-IDF branch",
            note: "Lexical scam-term features",
            value: result.branches?.lexicalProbability ?? 0,
          },
          {
            name: "BERT branch",
            note: `Fraud sim ${(result.branches?.fraudSimilarity ?? 0).toFixed(2)} · Genuine sim ${(result.branches?.genuineSimilarity ?? 0).toFixed(2)}`,
            value: result.branches?.semanticProbability ?? 0,
          },
        ].map((b) => (
          <div key={b.name} className="rounded-2xl border border-border/60 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{b.name}</p>
              <span className="font-display text-sm font-bold">
                {(b.value * 100).toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{b.note}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${b.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Fusion layer weights: 0.62 lexical · 0.38 semantic
      </p>


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
