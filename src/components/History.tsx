import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryItem {
  id: string;
  date: string;
  text: string;
  label: "genuine" | "fraudulent";
  confidence: string;
}

export function History({
  items,
  onClear,
}: {
  items: HistoryItem[];
  onClear: () => void;
}) {
  return (
    <section className="animate-rise space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prediction history</h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-danger"
          >
            <Trash2 className="size-4" /> Clear
          </Button>
        )}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Your past predictions are stored locally and will appear here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-[150px_1fr_190px] gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Date</span>
              <span>Job text</span>
              <span>Prediction</span>
            </div>
            {items.map((it) => (
              <div
                key={it.id}
                className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[150px_1fr_190px] sm:gap-4"
              >
                <span className="text-xs text-muted-foreground">
                  {new Date(it.date).toLocaleString()}
                </span>
                <span className="line-clamp-2 text-muted-foreground">{it.text}</span>
                <span
                  className={`font-medium ${
                    it.label === "fraudulent" ? "text-danger" : "text-success"
                  }`}
                >
                  {it.label === "fraudulent" ? "Fraudulent" : "Genuine"} · {it.confidence}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
