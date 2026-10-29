import type { PredictionResult } from "@/lib/fraud-model";

/**
 * Optional, additive fields that the /predict API may return alongside the
 * existing response contract. Every field is optional: the new panels hide
 * themselves gracefully when the data is absent, so the current app keeps
 * working unchanged.
 */
export interface ScamSignal {
  name: string;
  detected: boolean;
  detail?: string;
}

export interface WordContribution {
  word: string;
  /** > 0 pushes toward fraud, < 0 pushes toward genuine */
  weight: number;
}

interface Extras {
  /** Scam Signals checklist data */
  signals?: ScamSignal[];
  word_contributions?: WordContribution[];
  /** Raw fraud probability for the cost-sensitive threshold slider */
  fraud_probability?: number;
}

/**
 * NOTE: the legacy response already uses `explanation` for a plain-text
 * string, so the extras type re-declares it as a list-or-string union via
 * Omit to stay assignable; consumers treat it as a list only when it is
 * actually an array.
 */
export type ResultWithExtras = Omit<PredictionResult, "explanation"> &
  Extras & {
    explanation?: string | WordContribution[];
  };

export function getExtras(result: PredictionResult): ResultWithExtras {
  return result as unknown as ResultWithExtras;
}

/** Reads the word-weight list from `explanation` (array form) or `word_contributions`. */
export function getWordContributions(result: PredictionResult): WordContribution[] {
  const record = result as unknown as Record<string, unknown>;
  for (const key of ["explanation", "word_contributions"]) {
    const raw = record[key];
    if (Array.isArray(raw)) {
      const list = raw as unknown[];
      const parsed: WordContribution[] = [];
      for (const item of list) {
        if (
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>)["word"] === "string" &&
          typeof (item as Record<string, unknown>)["weight"] === "number"
        ) {
          const entry = item as Record<string, unknown>;
          parsed.push({
            word: entry["word"] as string,
            weight: entry["weight"] as number,
          });
        }
      }
      if (parsed.length > 0) return parsed;
    }
  }
  return [];
}
