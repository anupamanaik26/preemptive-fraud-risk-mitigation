import { createFileRoute } from "@tanstack/react-router";
import { ModelInsightsPage } from "@/features/insights/ModelInsightsPage";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Model Insights — AI Recruitment Fraud Detection" },
      {
        name: "description",
        content:
          "Ablation study, baseline comparison, cross-dataset results and precision-recall curves for the XGBoost × BERT recruitment fraud detector.",
      },
      { property: "og:title", content: "Model Insights — AI Recruitment Fraud Detection" },
      {
        property: "og:description",
        content:
          "Ablation study, baseline comparison, cross-dataset results and precision-recall curves for the recruitment fraud detection model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelInsightsPage,
});
