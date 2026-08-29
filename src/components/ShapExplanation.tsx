import { Brain } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";

export function ShapExplanation({ result }: { result: PredictionResult }) {
  const max = Math.max(0.01, ...result.shap.map((s) => Math.abs(s.value)));

  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Brain className="size-4 text-primary" /> Explainable AI · SHAP contributions
      </p>
      <p className="mb-5 text-xs text-muted-foreground">
        Signed feature attributions from the XGBoost decision layer. Red bars push the
        prediction toward fraud, green bars toward genuine.
      </p>

      {result.shap.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No engineered feature contributed meaningfully to this prediction.
        </p>
      ) : (
        <ul className="space-y-3">
          {result.shap.map((s) => {
            const positive = s.value > 0;
            const width = (Math.abs(s.value) / max) * 50;
            return (
              <li key={s.feature}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-sm">{s.feature}</span>
                  <span
                    className={`font-display text-xs font-bold ${positive ? "text-danger" : "text-success"}`}
                  >
                    {positive ? "+" : "−"}
                    {Math.abs(s.value).toFixed(2)}
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-secondary/50">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className={`absolute top-0 h-2.5 rounded-full transition-[width] duration-700 ease-out ${
                      positive ? "left-1/2 bg-danger" : "right-1/2 bg-success"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {s.evidence && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {s.evidence}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/25 p-4">
        <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
          Plain-language explanation
        </p>
        <p className="text-sm">{result.explanation}</p>
      </div>
    </section>
  );
}
