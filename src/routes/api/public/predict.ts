import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { predictFraud, MODEL_ACCURACY } from "@/lib/fraud-model";
import { extractPostingCompanyDetails } from "@/lib/scam-features";


const bodySchema = z.object({
  job_description: z.string().min(1).max(20000),
});

export const Route = createFileRoute("/api/public/predict")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          message: "Recruitment Fraud Detection API Running",
          model: "XGBoost + TF-IDF + BERT fusion",
          accuracy: MODEL_ACCURACY,
        }),

      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json(
            { error: "`job_description` is required" },
            { status: 400 },
          );
        }

        const text = parsed.data.job_description;

        // Company verification must not depend on URLs in the posting: when a
        // company name is present but details are missing, resolve them from
        // trusted public directories before scoring.
        const posted = extractPostingCompanyDetails(text);
        let lookup = null;
        if (posted.companyName && (!posted.website || !posted.linkedin || !posted.emailDomain)) {
          const { lookupCompany } = await import("@/lib/company-lookup.server");
          lookup = await lookupCompany(posted.companyName, posted);
        }

        const result = predictFraud(text, lookup);
        return Response.json(result);
      },
    },
  },
});
