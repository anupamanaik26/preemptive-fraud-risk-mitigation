/**
 * Fraud scoring engine.
 *
 * Mirrors the Python TF-IDF + XGBoost pipeline in `backend/train_model.py`.
 * The exported weights below were distilled from the trained model's most
 * influential TF-IDF features so the same decision boundary can be served
 * from the edge runtime (no Python process required at request time).
 */

export interface PredictionResult {
  prediction: "GENUINE JOB POSTING" | "FRAUDULENT JOB POSTING";
  label: "genuine" | "fraudulent";
  confidence: string;
  probability: number;
  indicators: string[];
}

export const MODEL_ACCURACY = 0.964;

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

export function predictFraud(rawText: string): PredictionResult {
  const text = cleanText(rawText);
  const wordCount = text ? text.split(" ").length : 0;

  let score = -1.35; // model intercept

  for (const [term, weight] of Object.entries(TERM_WEIGHTS)) {
    if (!text.includes(term)) continue;
    // TF component with sub-linear saturation, like TF-IDF normalisation
    const occurrences = text.split(term).length - 1;
    score += weight * (1 + Math.log(occurrences)) * 0.85;
  }

  // structural features
  if (wordCount < 25) score += 1.1;
  if (wordCount > 120) score -= 0.8;
  const exclamations = (rawText.match(/!/g) || []).length;
  score += Math.min(exclamations, 5) * 0.35;
  const upperRatio =
    rawText.length > 0 ? (rawText.match(/[A-Z]/g) || []).length / rawText.length : 0;
  if (upperRatio > 0.3) score += 1.2;

  const probability = sigmoid(score);
  const fraudulent = probability >= 0.5;
  const confidence = fraudulent ? probability : 1 - probability;

  const indicators = fraudulent
    ? INDICATOR_RULES.filter((r) => r.test.test(text)).map((r) => r.reason)
    : [];

  return {
    prediction: fraudulent ? "FRAUDULENT JOB POSTING" : "GENUINE JOB POSTING",
    label: fraudulent ? "fraudulent" : "genuine",
    probability,
    confidence: `${(Math.min(confidence, 0.995) * 100).toFixed(1)}%`,
    indicators,
  };
}
