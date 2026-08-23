import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, ShieldAlert, ShieldCheck, Target } from "lucide-react";
import type { HistoryItem } from "@/components/History";
import { MODEL_ACCURACY } from "@/lib/fraud-model";

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-primary";
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`mb-2 flex items-center gap-2 text-xs text-muted-foreground`}>
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

export function Dashboard({ history }: { history: HistoryItem[] }) {
  const total = history.length;
  const fraud = history.filter((h) => h.label === "fraudulent").length;
  const genuine = total - fraud;
  const last = history[0];

  const data = [
    { name: "Genuine", value: genuine, color: "oklch(0.72 0.17 156)" },
    { name: "Fraudulent", value: fraud, color: "oklch(0.63 0.22 22)" },
  ].filter((d) => d.value > 0);

  return (
    <section className="animate-rise space-y-4">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<BarChart3 className="size-4" />}
          label="Total predictions"
          value={String(total)}
        />
        <Stat
          icon={<ShieldCheck className="size-4" />}
          label="Genuine"
          value={String(genuine)}
          tone="success"
        />
        <Stat
          icon={<ShieldAlert className="size-4" />}
          label="Fraudulent"
          value={String(fraud)}
          tone="danger"
        />
        <Stat
          icon={<Target className="size-4" />}
          label="Model accuracy"
          value={`${(MODEL_ACCURACY * 100).toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-2 text-sm font-medium">Prediction split</p>
          {data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Run a prediction to populate analytics.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.23 0.048 258)",
                      border: "1px solid oklch(0.98 0.01 250 / 0.15)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.006 250)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="mb-3 text-sm font-medium">Last prediction</p>
          {!last ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing analyzed yet.
            </p>
          ) : (
            <div className="space-y-3">
              <p
                className={`font-display text-lg font-bold ${
                  last.label === "fraudulent" ? "text-danger" : "text-success"
                }`}
              >
                {last.label === "fraudulent" ? "Fraudulent" : "Genuine"} ·{" "}
                {last.confidence}
              </p>
              <p className="line-clamp-4 text-sm text-muted-foreground">{last.text}</p>
              <p className="text-xs text-muted-foreground/80">
                {new Date(last.date).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
