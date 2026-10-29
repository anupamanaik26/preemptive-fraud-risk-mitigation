import { FlaskConical, TriangleAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import insightsData from "@/data/insights.json";
import { FEATURE_FLAGS } from "./flags";

/**
 * Model Insights page — ablation study, baseline comparison, cross-dataset
 * results and a precision-recall curve, all loaded from
 * `src/data/insights.json` (placeholder numbers the project owner replaces
 * with real experiment results later).
 */

interface MetricRow {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  pr_auc: number;
  mcc: number;
}

interface DatasetRow extends MetricRow {
  accuracy: number;
}

interface CurvePoint {
  recall: number;
  precision: number;
}

interface InsightsData {
  ablation: MetricRow[];
  baselines: MetricRow[];
  cross_dataset: DatasetRow[];
  pr_curves: Record<string, CurvePoint[]>;
}

const data = insightsData as unknown as InsightsData;

const LINE_COLORS = ["var(--primary)", "var(--warning)", "var(--danger)", "var(--success)"];

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function MetricsTable({
  rows,
  showAccuracy = false,
}: {
  rows: MetricRow[];
  showAccuracy?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-52">Configuration</TableHead>
            {showAccuracy && <TableHead>Accuracy</TableHead>}
            <TableHead>Precision</TableHead>
            <TableHead>Recall</TableHead>
            <TableHead>F1</TableHead>
            <TableHead>PR-AUC</TableHead>
            <TableHead>MCC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {showAccuracy && (
                <TableCell>{"accuracy" in row ? pct((row as DatasetRow).accuracy) : "—"}</TableCell>
              )}
              <TableCell>{pct(row.precision)}</TableCell>
              <TableCell>{pct(row.recall)}</TableCell>
              <TableCell>{pct(row.f1)}</TableCell>
              <TableCell>{pct(row.pr_auc)}</TableCell>
              <TableCell>{row.mcc.toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PrCurveChart() {
  const curveEntries = Object.entries(data.pr_curves);
  const firstCurve = curveEntries[0]?.[1] ?? [];
  const chartData = firstCurve.map((point, i) => {
    const row: Record<string, number> = { recall: point.recall };
    for (const [seriesName, points] of curveEntries) {
      const p = points[i];
      if (p) row[seriesName] = p.precision;
    }
    return row;
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="recall"
            type="number"
            domain={[0, 1]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={[0.4, 1]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {curveEntries.map(([seriesName], i) => (
            <Line
              key={seriesName}
              type="monotone"
              dataKey={seriesName}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ModelInsightsPage() {
  if (!FEATURE_FLAGS.modelInsightsPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Model Insights is currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-20 pt-10 sm:px-6">
        <section className="animate-rise">
          <p className="mb-3 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <FlaskConical className="mr-1.5 size-3.5" /> Experiment results
          </p>
          <h1 className="gradient-text text-3xl font-extrabold sm:text-4xl">Model Insights</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Ablation study, baseline comparison and cross-dataset evaluation of the
            XGBoost × BERT fraud detector. Metrics are reported for the fraud class.
          </p>
        </section>

        <div className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold text-warning">
              Placeholder values — replace with experiment results
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Every number on this page comes from <span className="font-mono">src/data/insights.json</span>{" "}
              and is illustrative until you swap in your own measurements.
            </p>
          </div>
        </div>

        <Tabs defaultValue="ablation" className="w-full">
          <TabsList>
            <TabsTrigger value="ablation">Ablation study</TabsTrigger>
            <TabsTrigger value="baselines">Baseline comparison</TabsTrigger>
            <TabsTrigger value="cross-dataset">Cross-dataset results</TabsTrigger>
          </TabsList>

          <TabsContent value="ablation" className="mt-4">
            <MetricsTable rows={data.ablation} />
          </TabsContent>
          <TabsContent value="baselines" className="mt-4">
            <MetricsTable rows={data.baselines} />
          </TabsContent>
          <TabsContent value="cross-dataset" className="mt-4">
            <MetricsTable rows={data.cross_dataset} showAccuracy />
          </TabsContent>
        </Tabs>

        <section className="glass-card rounded-3xl p-5 sm:p-7">
          <p className="mb-1 text-sm font-semibold">Precision-Recall curves</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Fraud-class precision as recall increases, per model configuration. Higher and
            flatter is better.
          </p>
          <PrCurveChart />
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Predictions are advisory. Always verify employers independently.
      </footer>
    </div>
  );
}
