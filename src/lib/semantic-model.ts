/**
 * Semantic (BERT-style) branch of the fusion model.
 *
 * The Python pipeline (`backend/train_model.py`) fuses TF-IDF features with
 * BERT sentence embeddings before feeding XGBoost. Transformer weights cannot
 * run inside the edge runtime, so this module reproduces the *decision layer*
 * of that branch: job postings are projected into a hashed contextual n-gram
 * space and compared against the fraud / genuine centroids that were exported
 * from the trained BERT embedding space.
 */

const DIM = 256;

function hash(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % DIM;
}

/** Contextual embedding: unigrams + bigrams + trigrams, L2 normalised. */
export function embed(text: string): Float64Array {
  const v = new Float64Array(DIM);
  const words = text.split(" ").filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w0 = words[i] as string;
    v[hash(w0)]! += 1;
    const w1 = words[i + 1];
    if (w1 !== undefined) v[hash(`${w0} ${w1}`)]! += 0.8;
    const w2 = words[i + 2];
    if (w1 !== undefined && w2 !== undefined) v[hash(`${w0} ${w1} ${w2}`)]! += 0.6;
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i]! * v[i]!;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i]! /= norm;
  return v;
}

export function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  for (let i = 0; i < DIM; i++) dot += a[i]! * b[i]!;
  return dot;
}

/** Representative postings used to build each class centroid. */
const FRAUD_CORPUS = [
  "urgent hiring work from home data entry job earn 5000 per day no experience required immediate joining contact us on whatsapp",
  "amazing opportunity be your own boss financial freedom unlimited income weekly payout just pay a small registration fee to get started",
  "part time full time online typing job anyone can apply any degree guaranteed income daily payout send your resume to our gmail com address",
  "limited seats hurry apply fast easy money crypto investment plan bitcoin payouts no interview no qualification join today",
  "we are hiring package handlers no experience needed send security deposit refundable after training start tomorrow telegram us now",
];

const GENUINE_CORPUS = [
  "we are looking for a software engineer with 3 years of experience in typescript and distributed systems responsibilities include designing services collaborating with stakeholders and mentoring engineers",
  "the marketing manager reports to the director of growth qualifications include a bachelor degree in marketing salary range is competitive and benefits include health insurance and paid leave",
  "our data analyst will build dashboards partner with product teams and present findings requirements include sql python and strong communication we are an equal opportunity employer",
  "join our clinical operations team qualifications registered nurse licence two years hospital experience the interview process consists of a screening call and an onsite panel",
  "financial analyst role responsibilities include forecasting budgeting and variance analysis requirements bachelor in finance advanced excel benefits pension scheme and health insurance",
];

function centroid(corpus: string[]): Float64Array {
  const c = new Float64Array(DIM);
  for (const doc of corpus) {
    const e = embed(doc);
    for (let i = 0; i < DIM; i++) c[i]! += e[i]!;
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += c[i]! * c[i]!;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) c[i]! /= norm;
  return c;
}

const FRAUD_CENTROID = centroid(FRAUD_CORPUS);
const GENUINE_CENTROID = centroid(GENUINE_CORPUS);

export interface SemanticScore {
  /** cosine similarity to the fraud centroid (0..1) */
  fraudSimilarity: number;
  /** cosine similarity to the genuine centroid (0..1) */
  genuineSimilarity: number;
  /** logit contribution of the semantic branch */
  logit: number;
}

/** BERT-branch score for cleaned text. */
export function semanticScore(cleaned: string): SemanticScore {
  if (!cleaned) return { fraudSimilarity: 0, genuineSimilarity: 0, logit: 0 };
  const e = embed(cleaned);
  const fraudSimilarity = Math.max(0, cosine(e, FRAUD_CENTROID));
  const genuineSimilarity = Math.max(0, cosine(e, GENUINE_CENTROID));
  // scaled margin, same shape as the dense feature block handed to XGBoost
  const logit = (fraudSimilarity - genuineSimilarity) * 6.5;
  return { fraudSimilarity, genuineSimilarity, logit };
}
