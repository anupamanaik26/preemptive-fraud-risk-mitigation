import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { PredictionForm } from "@/components/PredictionForm";
import { ResultCard } from "@/components/ResultCard";
import { RiskMeter } from "@/components/RiskMeter";
import { ShapExplanation } from "@/components/ShapExplanation";
import { CompanyVerificationCard } from "@/components/CompanyVerificationCard";
import { Dashboard } from "@/components/Dashboard";
import { History, type HistoryItem } from "@/components/History";
import type { PredictionResult } from "@/lib/fraud-model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Recruitment Fraud Detection System" },
      {
        name: "description",
        content:
          "Detect fake job advertisements with an XGBoost + TF-IDF model. Paste a job posting and get a genuine or fraudulent verdict with a confidence score.",
      },
      { property: "og:title", content: "AI Recruitment Fraud Detection System" },
      {
        property: "og:description",
        content:
          "Detect fake job advertisements using machine learning. Instant fraud verdicts, confidence meter, scam indicators and analytics.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "rfd_history_v1";

function Index() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persist(next: HistoryItem[]) {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked */
    }
  }

  async function handlePredict() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/public/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text }),
      });
      if (!res.ok) throw new Error("Prediction failed");
      const data = (await res.json()) as PredictionResult;
      setResult(data);
      persist(
        [
          {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            text: text.trim().slice(0, 400),
            label: data.label,
            confidence: data.confidence,
          },
          ...history,
        ].slice(0, 50),
      );
    } catch {
      toast.error("Could not reach the prediction API. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-20 pt-10 sm:px-6">
        <section className="grid-lines animate-rise rounded-3xl border border-border/60 px-5 py-10 text-center sm:px-10 sm:py-14">
          <p className="mb-3 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            XGBoost × BERT fusion · TF-IDF (5,000) + sentence embeddings
          </p>

          <h1 className="gradient-text text-3xl font-extrabold sm:text-5xl">
            AI Recruitment Fraud Detection System
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Detect Fake Job Advertisements Using Machine Learning
          </p>
        </section>

        <PredictionForm
          value={text}
          onChange={setText}
          onPredict={handlePredict}
          onClear={() => {
            setText("");
            setResult(null);
          }}
          loading={loading}
        />

        {loading && (
          <div className="glass-card flex items-center gap-3 rounded-3xl p-6 text-sm text-muted-foreground">
            <span className="animate-scan size-3 rounded-full bg-primary" />
            Vectorizing text and running the classifier…
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <ResultCard result={result} />
            <RiskMeter result={result} />
            <div className="grid gap-6 lg:grid-cols-2">
              <ShapExplanation result={result} />
              <CompanyVerificationCard result={result} />
            </div>
          </div>
        )}

        <Dashboard history={history} />
        <History items={history} onClear={() => persist([])} />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Predictions are advisory. Always verify employers independently.
      </footer>
    </div>
  );
}
