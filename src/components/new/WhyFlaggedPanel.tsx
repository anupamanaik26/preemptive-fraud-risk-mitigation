import { useMemo } from "react";
import { Brain } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";
import { getWordContributions } from "@/features/insights/types";

/**
 * "Why was this flagged?" — highlights the original job text with the
 * optional `explanation` word-weight list (or `word_contributions`) and
 * charts the top 10 contributing words. Hides completely when the API does
 * not return the data.
 */

const TOKEN_PATTERN = /\S+|\s+/g;

function cleanToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Explicit class strings so Tailwind can see every variant. */
function bucketClass(ratio: number, positive: boolean): string {
  if (ratio > 0.66) {
    return positive ? "bg-danger/25 text-danger font-semibold" : "bg-success/25 text-success font-semibold";
  }
  if (ratio > 0.33) {
    return positive ? "bg-danger/15 text-danger" : "bg-success/15 text-success";
  }
  return positive ? "bg-danger/10 text-danger/90" : "bg-success/10 text-success/90";
}

export function WhyFlaggedPanel({
  result,
  jobText,
}: {
  result: PredictionResult;
  jobText: string;
}) {
  const contributions = getWordContributions(result);

  const highlights = useMemo(() => {
    if (contributions.length === 0 || !jobText.trim()) return null;
    const map = new Map<string, number>();
    for (const c of contributions) {
      const key = cleanToken(c.word);
      if (key) map.set(key, c.weight);
    }
    const maxAbs = Math.max(0.01, ...contributions.map((c) => Math.abs(c.weight)));
    const tokens = jobText.match(TOKEN_PATTERN) ?? [];
    return { map, maxAbs, tokens };
  }, [contributions, jobText]);

  if (!highlights) return null;

  const { map, maxAbs, tokens } = highlights;

  const sorted = [...contributions].sort(
    (a, b) => Math.abs(b.weight) - Math.abs(a.weight),
  );
  const top10 = sorted.slice(0, 10);
  const top3 = sorted.slice(0, 3);
  const direction = top3.reduce((sum, c) => sum + c.weight, 0) > 0 ? "toward fraud" : "toward genuine";
  const summary =
    top3
      .map((c) => `"${c.word}" (${c.weight > 0 ? "+" : "−"}${Math.abs(c.weight).toFixed(2)})`)
      .join(", ") + ` pushed this verdict ${direction}.`;
  const chartMax = Math.max(0.01, ...top10.map((c) => Math.abs(c.weight)));

  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Brain className="size-4 text-primary" /> Why was this flagged?
      </p>
      <p className="mb-5 text-xs text-muted-foreground">
        Words highlighted red push the verdict toward fraud, green toward genuine.
        Intensity reflects contribution weight.
      </p>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-border/60 bg-secondary/25 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {tokens.map((token, i) => {
            const weight = map.get(cleanToken(token));
            if (weight === undefined || weight === 0) {
              return <span key={i}>{token}</span>;
            }
            const positive = weight > 0;
            return (
              <span
                key={i}
                className={`rounded px-0.5 ${bucketClass(Math.abs(weight) / maxAbs, positive)}`}
              >
                {token}
              </span>
            );
          })}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-danger/25 bg-danger/5 p-4">
        <p className="text-sm">{summary}</p>
      </div>

      <div className="mt-6">
        <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
          Top {top10.length} contributing words
        </p>
        <ul className="space-y-3">
          {top10.map((c) => {
            const positive = c.weight > 0;
            const width = (Math.abs(c.weight) / chartMax) * 50;
            return (
              <li key={c.word}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-sm">{c.word}</span>
                  <span
                    className={`font-display text-xs font-bold ${positive ? "text-danger" : "text-success"}`}
                  >
                    {positive ? "+" : "−"}
                    {Math.abs(c.weight).toFixed(2)}
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
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
