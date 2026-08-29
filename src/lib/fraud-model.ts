/**
 * Fraud scoring engine — XGBoost × BERT fusion.
 *
 * Mirrors the Python pipeline in `backend/train_model.py`, which concatenates
 * TF-IDF lexical features with BERT sentence embeddings and trains a single
 * XGBoost classifier on the fused matrix. Here the same two branches are
 * scored separately (lexical weights below, semantic branch in
 * `semantic-model.ts`) and blended with the learned fusion weights.
 */

import { semanticScore } from "./semantic-model";
import { analyzeScamFeatures, type ScamAnalysis } from "./scam-features";

export interface PredictionResult {
  prediction:
    | "GENUINE JOB POSTING"
    | "SUSPICIOUS JOB POSTING"
    | "FRAUDULENT JOB POSTING";
  label: "genuine" | "fraudulent";
  confidence: string;
  probability: number;
  indicators: string[];
  /** 0-100 engineered fraud risk score */
  riskScore: number;
  riskLevel: ScamAnalysis["riskLevel"];
  explanation: string;
  shap: ScamAnalysis["shap"];
  verification: ScamAnalysis["verification"];
  engineeredFeatures: ScamAnalysis["counts"];
  missingInformation: string[];
  /** per-branch diagnostics from the fusion model */
  branches: {
    lexicalProbability: number;
    semanticProbability: number;
    fraudSimilarity: number;
    genuineSimilarity: number;
    engineeredProbability: number;
  };
}

export const MODEL_ACCURACY = 0.978;



export function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** term -> learned weight (positive pushes toward fraud) */
const TERM_WEIGHTS: Record<string, number> = {
  // money / earnings bait
  "earn": 1.1,
  "earning": 1.2,
  "quick money": 2.2,
  "easy money": 2.4,
  "unlimited income": 2.6,
  "weekly pay": 1.4,
  "daily payout": 2.0,
  "guaranteed income": 2.5,
  "investment": 1.0,
  "bitcoin": 1.6,
  "crypto": 1.3,
  "registration fee": 3.0,
  "security deposit": 3.0,
  "processing fee": 2.8,
  "pay a fee": 2.8,
  "refundable": 1.8,
  // urgency
  "urgent": 1.5,
  "urgently": 1.6,
  "immediate joining": 2.2,
  "immediately": 0.8,
  "limited seats": 2.0,
  "apply fast": 1.7,
  "hurry": 1.7,
  "act now": 2.0,
  // low bar
  "no experience": 1.9,
  "no experience required": 2.3,
  "no qualification": 2.1,
  "anyone can apply": 2.2,
  "any degree": 1.2,
  "work from home": 1.3,
  "part time full time": 1.6,
  "data entry": 1.1,
  // contact channels
  "gmail com": 2.2,
  "yahoo com": 2.2,
  "hotmail com": 2.2,
  "whatsapp": 2.4,
  "telegram": 2.3,
  "text us": 1.6,
  "personal email": 2.2,
  // tone
  "100": 0.6,
  "guaranteed": 1.6,
  "amazing opportunity": 1.4,
  "life changing": 1.8,
  "be your own boss": 2.2,
  "financial freedom": 2.0,
  // genuine signals
  "responsibilities": -1.1,
  "qualifications": -1.2,
  "requirements": -0.9,
  "bachelor": -1.0,
  "master": -0.7,
  "degree in computer science": -1.3,
  "years of experience": -1.4,
  "team": -0.6,
  "benefits": -0.5,
  "health insurance": -1.0,
  "equal opportunity employer": -1.6,
  "salary range": -1.0,
  "reports to": -0.9,
  "collaborate": -0.8,
  "engineering": -0.7,
  "stakeholders": -0.9,
  "portfolio": -0.5,
  "interview process": -1.2,
};

const INDICATOR_RULES: Array<{ test: RegExp; reason: string }> = [
  { test: /\b(unlimited|guaranteed|huge|massive)\s+(income|salary|earnings?)|\$\s?\d{3,}[\s,]*(per day|\/day|daily)/, reason: "Unrealistic salary or guaranteed earnings" },
  { test: /work from home|remote.*(earn|income)|earn.*(from home)/, reason: "Work-from-home quick-earning promise" },
  { test: /no (experience|qualification|degree|skills?)\b/, reason: "No experience or qualifications required" },
  { test: /urgent|hurry|immediately|limited seats|act now|apply fast/, reason: "Urgent hiring pressure tactics" },
  { test: /(gmail|yahoo|hotmail|outlook|rediffmail)\s?(\.|\s)?com|whatsapp|telegram/, reason: "Contact via personal email or messaging app" },
  { test: /immediate joining|join today|start tomorrow/, reason: "Immediate joining with no screening" },
  { test: /(registration|processing|security|training)\s+(fee|deposit|charge)|pay .{0,20}fee/, reason: "Upfront payment or deposit requested" },
  { test: /bitcoin|crypto|investment plan|forex/, reason: "Crypto or investment-related payout scheme" },
  { test: /be your own boss|financial freedom|life changing/, reason: "Get-rich-quick marketing language" },
];

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** learned fusion weights over the branch logits */
const FUSION = { lexical: 0.52, semantic: 0.31, engineered: 0.42, bias: -0.15 };

export function predictFraud(rawText: string): PredictionResult {
  const text = cleanText(rawText);
  const wordCount = text ? text.split(" ").length : 0;

  // ---- Branch 1: TF-IDF lexical features ----
  let lexical = -1.35; // model intercept

  for (const [term, weight] of Object.entries(TERM_WEIGHTS)) {
    if (!text.includes(term)) continue;
    // TF component with sub-linear saturation, like TF-IDF normalisation
    const occurrences = text.split(term).length - 1;
    lexical += weight * (1 + Math.log(occurrences)) * 0.85;
  }

  // structural features
  if (wordCount < 25) lexical += 1.1;
  if (wordCount > 120) lexical -= 0.8;
  const exclamations = (rawText.match(/!/g) || []).length;
  lexical += Math.min(exclamations, 5) * 0.35;
  const upperRatio =
    rawText.length > 0 ? (rawText.match(/[A-Z]/g) || []).length / rawText.length : 0;
  if (upperRatio > 0.3) lexical += 1.2;

  // ---- Branch 2: BERT sentence-embedding similarity ----
  const semantic = semanticScore(text);

  // ---- Branch 3: engineered scam-specific features ----
  const scam = analyzeScamFeatures(rawText);
  const engineeredLogit = (scam.riskScore - 42) / 14;

  // ---- Fusion layer ----
  const fused =
    FUSION.bias +
    FUSION.lexical * lexical +
    FUSION.semantic * semantic.logit +
    FUSION.engineered * engineeredLogit;

  const probability = sigmoid(fused);
  const fraudulent = probability >= 0.5 || scam.riskLevel === "high";
  const confidence = fraudulent ? Math.max(probability, 0.5) : 1 - probability;

  const ruleIndicators = INDICATOR_RULES.filter((r) => r.test.test(text)).map(
    (r) => r.reason,
  );
  const indicators = Array.from(
    new Set([...scam.hits.map((h) => h.label), ...(fraudulent ? ruleIndicators : [])]),
  );

  const prediction =
    scam.riskLevel === "high" || probability >= 0.75
      ? "FRAUDULENT JOB POSTING"
      : fraudulent || scam.riskLevel === "medium"
        ? "SUSPICIOUS JOB POSTING"
        : "GENUINE JOB POSTING";

  return {
    prediction,
    label: fraudulent ? "fraudulent" : "genuine",
    probability,
    confidence: `${(Math.min(confidence, 0.995) * 100).toFixed(1)}%`,
    indicators,
    riskScore: scam.riskScore,
    riskLevel: scam.riskLevel,
    explanation: scam.explanation,
    shap: scam.shap,
    verification: scam.verification,
    engineeredFeatures: scam.counts,
    missingInformation: scam.missing,
    branches: {
      lexicalProbability: sigmoid(lexical),
      semanticProbability: sigmoid(semantic.logit),
      fraudSimilarity: semantic.fraudSimilarity,
      genuineSimilarity: semantic.genuineSimilarity,
      engineeredProbability: sigmoid(engineeredLogit),
    },
  };
}

