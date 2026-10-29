import { Link } from "@tanstack/react-router";
import { ShieldCheck, Activity } from "lucide-react";
import { FEATURE_FLAGS } from "@/features/insights/flags";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="animate-scan flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-tight sm:text-base">
              Recruitment Fraud Detection
            </p>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              XGBoost × BERT fusion · REST API
            </p>

          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {FEATURE_FLAGS.modelInsightsPage && (
            <Link
              to="/insights"
              preload="intent"
              className="rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Model Insights
            </Link>
          )}
          <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:flex">
            <Activity className="size-3.5" />
            Model online
          </div>
        </div>
      </div>
    </header>
  );
}
