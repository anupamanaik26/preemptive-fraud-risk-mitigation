import { BadgeCheck, Building2, CircleAlert, CircleX, Globe, Linkedin, Mail } from "lucide-react";
import type { PredictionResult } from "@/lib/fraud-model";

const STATUS = {
  verified: { label: "Verified Company", cls: "text-success border-success/40 bg-success/10" },
  partial: { label: "Partially Verified", cls: "text-warning border-warning/40 bg-warning/10" },
  unverified: { label: "Unverified Company", cls: "text-danger border-danger/40 bg-danger/10" },
} as const;

function Row({
  icon,
  label,
  ok,
  value,
  origin,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  value: string | null;
  origin?: "posting" | "public-lookup" | null;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
      <span className={ok ? "text-success" : "text-danger"}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {value ?? "Not found in posting or public sources"}
        </p>
        {ok && origin && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/80">
            {origin === "posting" ? "From posting" : "Verified via public sources"}
          </p>
        )}
      </div>
      {ok ? (
        <BadgeCheck className="size-4 shrink-0 text-success" />
      ) : (
        <CircleX className="size-4 shrink-0 text-danger" />
      )}
    </li>
  );
}


export function CompanyVerificationCard({ result }: { result: PredictionResult }) {
  const v = result.verification;
  const status = STATUS[v.status];

  return (
    <section className="glass-card animate-rise rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-primary" /> Company Verification
        </p>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Detected company: </span>
          <span className="font-medium">{v.companyName ?? "Not stated"}</span>
        </p>
        <p className="font-display text-lg font-bold">{v.score}%</p>
      </div>
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-secondary/60">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            v.status === "verified" ? "bg-success" : v.status === "partial" ? "bg-warning" : "bg-danger"
          }`}
          style={{ width: `${Math.max(v.score, 4)}%` }}
        />
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        <Row icon={<Globe className="size-4" />} label="Official website" ok={v.checks.website} value={v.website} origin={v.origin?.website} />
        <Row icon={<Linkedin className="size-4" />} label="LinkedIn page" ok={v.checks.linkedin} value={v.linkedin} origin={v.origin?.linkedin} />
        <Row icon={<Mail className="size-4" />} label="Corporate email domain" ok={v.checks.emailDomain} value={v.emailDomain} origin={v.origin?.emailDomain} />
      </ul>

      {v.lookupSources?.length > 0 && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Checked against public sources: {v.lookupSources.join(" · ")}
        </p>
      )}

      {v.notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {v.notes.map((n) => (
            <li key={n} className="flex gap-2 text-xs text-muted-foreground">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
              {n}
            </li>
          ))}
        </ul>
      )}

      {result.missingInformation.length > 0 && (
        <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/8 p-4">
          <p className="mb-2 text-xs font-semibold text-warning">Missing job information</p>
          <div className="flex flex-wrap gap-2">
            {result.missingInformation.map((m) => (
              <span
                key={m}
                className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
