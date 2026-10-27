import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";
import { Slider } from "@/components/ui/slider";
import { getExtras } from "@/features/insights/types";

/**
 * Cost-sensitive decision threshold control. Re-labels the current
 * prediction on the client using the slider value instead of the model's
 * default 0.50 cutoff. Reads the optional `fraud_probability` field (falls
 * back to the existing `probability` field) and persists the chosen value
 * in localStorage under its own key. Hides when no probability is available.
 */

const STORAGE_KEY = "rfd_fraud_threshold_v1";
const DEFAULT_THRESHOLD = 0.5;

export function ThresholdControl({ result }: { result: PredictionResult }) {
  const extras = getExtras(result);
  const probability =
    typeof extras.fraud_probability === "number" && !Number.isNaN(extras.fraud_probability)
      ? extras.fraud_probability
      : result.probability;

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = Number(raw);
        if (value >= 0.1 && value <= 0.9) setThreshold(value);
      }
    } catch {
      /* storage blocked — keep default */
    }
  }, []);

  if (typeof probability !== "number" || Number.isNaN(probability)) return null;

  function updateThreshold(value: number) {
    setThreshold(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage full or blocked */
    }
  }

  const fraudulent = probability >= threshold;
  const adjustedConfidence = (fraudulent ? probability : 1 - probability) * 100;

  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="size-4 text-primary" /> Fraud sensitivity
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Lower threshold = catches more scams but more false alarms.
      </p>

      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">Decision threshold</span>
        <span className="font-display text-lg font-bold">{threshold.toFixed(2)}</span>
      </div>
      <Slider
        value={[threshold]}
        min={0.1}
        max={0.9}
        step={0.05}
        onValueChange={(values) => {
          const next = values[0];
          if (typeof next === "number") updateThreshold(next);
        }}
        aria-label="Fraud sensitivity threshold"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>0.10 · high recall</span>
        <span>model default 0.50</span>
        <span>0.90 · high precision</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Lower values favor catching fraud (higher recall).
      </p>

      <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/25 p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Verdict at this threshold
        </p>
        <p
          className={`mt-1 font-display text-lg font-bold ${
            fraudulent ? "text-danger" : "text-success"
          }`}
        >
          {fraudulent ? "Fraudulent job posting" : "Genuine job posting"}
          <span className="ml-2 text-sm font-semibold text-foreground">
            {adjustedConfidence.toFixed(1)}% confidence
          </span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Raw fraud probability: {(probability * 100).toFixed(1)}%
        </p>
      </div>
    </section>
  );
}
