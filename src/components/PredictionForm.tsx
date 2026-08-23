import { Loader2, Search, Eraser, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLE =
  "Google is hiring a Software Engineer with Python and Machine Learning skills. Responsibilities include building scalable services, collaborating with stakeholders and mentoring juniors. Requirements: Bachelor degree in Computer Science and 5 years of experience. Benefits include health insurance and equity. We are an equal opportunity employer.";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPredict: () => void;
  onClear: () => void;
  loading: boolean;
}

export function PredictionForm({ value, onChange, onPredict, onClear, loading }: Props) {
  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Analyze a job advertisement</h2>
        <button
          type="button"
          onClick={() => onChange(EXAMPLE)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3.5" /> Load example
        </button>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job posting here — title, company profile, description, requirements and benefits…"
        className="min-h-48 resize-y rounded-2xl border-border bg-background/40 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus-visible:ring-primary/50"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {value.trim() ? `${value.trim().split(/\s+/).length} words` : "No text yet"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={loading || !value}
            className="rounded-xl border-border bg-secondary/30"
          >
            <Eraser className="size-4" /> Clear
          </Button>
          <Button
            onClick={onPredict}
            disabled={loading || !value.trim()}
            className="rounded-xl px-6 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Search className="size-4" /> Predict
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
