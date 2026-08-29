import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";

const LEVEL = {
  low: { label: "Low Risk", color: "text-success", bar: "bg-success", ring: "ring-success/40" },
  medium: { label: "Medium Risk", color: "text-warning", bar: "bg-warning", ring: "ring-warning/40" },
  high: { label: "High Risk", color: "text-danger", bar: "bg-danger", ring: "ring-danger/40" },
} as const;

export function RiskMeter({ result }: { result: PredictionResult }) {
  const level = LEVEL[result.riskLevel];
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    setAnimated(0);
    const t = window.setTimeout(() => setAnimated(result.riskScore), 60);
    return () => window.clearTimeout(t);
  }, [result.riskScore, result.explanation]);

  const angle = -90 + (animated / 100) * 180;

  return (
    <section className={`glass-card animate-rise rounded-3xl p-5 ring-1 sm:p-7 ${level.ring}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-primary" /> Fraud Risk Score Meter
        </p>
        <span
          className={`rounded-full border border-current/30 px-3 py-1 text-xs font-semibold ${level.color}`}
        >
          {level.label}
        </span>
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <div className="relative mx-auto h-24 w-48">
          <svg viewBox="0 0 200 100" className="h-full w-full">
            <path
              d="M15 100 A85 85 0 0 1 185 100"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              className="stroke-secondary/60"
            />
            <path
              d="M15 100 A85 85 0 0 1 71 20"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              className="stroke-success/70"
            />
            <path d="M78 16 A85 85 0 0 1 122 16" fill="none" strokeWidth="16" className="stroke-warning/70" />
            <path
              d="M129 20 A85 85 0 0 1 185 100"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              className="stroke-danger/70"
            />
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-foreground transition-transform duration-1000 ease-out"
              style={{ transformOrigin: "100px 100px", transform: `rotate(${angle}deg)` }}
            />
            <circle cx="100" cy="100" r="7" className="fill-foreground" />
          </svg>
          <p
            className={`absolute inset-x-0 -bottom-1 text-center font-display text-2xl font-bold ${level.color}`}
          >
            {animated}
            <span className="text-sm text-muted-foreground">/100</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Fraud probability (XGBoost fusion)</span>
              <span className="font-display font-bold text-foreground">
                {(result.probability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-out ${level.bar}`}
                style={{ width: `${Math.round(result.probability * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "Confidence", v: result.confidence },
              { k: "Risk score", v: `${result.riskScore}` },
              { k: "Indicators", v: `${result.indicators.length}` },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-border/60 p-3">
                <p className="text-[11px] text-muted-foreground">{s.k}</p>
                <p className="font-display text-base font-bold">{s.v}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Bands: 0–30 low · 31–60 medium · 61–100 high
          </p>
        </div>
      </div>
    </section>
  );
}
