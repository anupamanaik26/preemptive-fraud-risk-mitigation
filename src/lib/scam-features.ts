/**
 * Scam-specific feature engineering for the recruitment fraud model.
 *
 * These engineered features are concatenated with the TF-IDF lexical block and
 * the BERT sentence embeddings before the XGBoost decision layer (see
 * `backend/train_model.py`). Each detector returns the raw matches so the
 * explainability layer can quote them back to the user.
 */

export type RiskLevel = "low" | "medium" | "high";
export type VerificationStatus = "verified" | "partial" | "unverified";

export interface FeatureHit {
  /** engineered feature id */
  key: string;
  /** human label shown in the SHAP chart */
  label: string;
  /** matched evidence from the posting */
  matches: string[];
  /** points added to the 0-100 fraud risk score */
  points: number;
}

export type EvidenceSource = "posting" | "public-lookup";

/** Details resolved from trusted public directories when the posting omits them. */
export interface CompanyLookupResult {
  website: string | null;
  linkedin: string | null;
  emailDomain: string | null;
  sources: string[];
}

export interface CompanyVerification {
  companyName: string | null;
  website: string | null;
  linkedin: string | null;
  emailDomain: string | null;
  checks: {
    website: boolean;
    linkedin: boolean;
    emailDomain: boolean;
  };
  /** where each satisfied check came from */
  origin: {
    website: EvidenceSource | null;
    linkedin: EvidenceSource | null;
    emailDomain: EvidenceSource | null;
  };
  /** public directories consulted for the lookup */
  lookupSources: string[];
  score: number; // 0-100
  status: VerificationStatus;
  notes: string[];
}


export interface ShapContribution {
  feature: string;
  value: number; // signed contribution, positive = pushes toward fraud
  evidence?: string;
}

export interface ScamAnalysis {
  hits: FeatureHit[];
  missing: string[];
  brands: string[];
  urlCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  verification: CompanyVerification;
  shap: ShapContribution[];
  explanation: string;
  counts: {
    genericGreeting: number;
    urgency: number;
    suspicious: number;
    referralCode: number;
    urls: number;
    brands: number;
    missingInfo: number;
    verification: number;
  };
}

const GENERIC_GREETINGS = [
  "dear student",
  "dear candidate",
  "dear applicant",
  "greetings applicant",
  "greetings candidate",
  "congratulations",
  "congrats",
  "your profile has been shortlisted",
  "you have been shortlisted",
  "selected candidate",
];

const URGENCY = [
  "limited slots",
  "limited seats",
  "slots are limited",
  "first come first serve",
  "first come first served",
  "apply immediately",
  "apply now",
  "hurry up",
  "hurry",
  "last chance",
  "register now",
  "immediate joining",
  "join today",
  "act fast",
  "don't miss",
  "dont miss",
  "closing soon",
];

const UNREALISTIC = [
  "guaranteed stipend",
  "fixed stipend",
  "assured placement",
  "assured job",
  "100% job guarantee",
  "100 percent job guarantee",
  "job guarantee",
  "placement guarantee",
  "no interview required",
  "no interview",
  "earn while studying",
  "earn while you learn",
  "high salary for freshers",
  "guaranteed income",
  "unlimited income",
  "guaranteed selection",
];

const EXTERNAL_REGISTRATION = [
  "click the link below",
  "click below link",
  "click here",
  "fill the registration form",
  "fill this form",
  "registration form",
  "complete onboarding through the link",
  "onboarding link",
  "join through whatsapp",
  "join our whatsapp",
  "whatsapp group",
  "telegram group",
  "join telegram",
  "register through the link",
  "registration link",
];

const REFERRAL = [
  "referral code",
  "refer code",
  "promo code",
  "promotional code",
  "registration code",
  "coupon code",
  "use code",
  "apply code",
];

const PAYMENT = [
  "registration fee",
  "security deposit",
  "processing fee",
  "training fee",
  "refundable amount",
  "pay a fee",
  "kit charges",
];

const BRANDS = [
  "ibm",
  "microsoft",
  "google",
  "amazon",
  "adobe",
  "aicte",
  "infosys",
  "tcs",
  "wipro",
  "accenture",
  "deloitte",
  "nasscom",
];

const FREE_MAIL = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "rediffmail.com",
  "proton.me",
  "yandex.com",
];

const MISSING_CHECKS: Array<{ key: string; label: string; test: RegExp }> = [
  { key: "role", label: "Job role / designation", test: /\b(role|position|designation|job title|profile)\b\s*[:\-]|\b(intern|engineer|developer|analyst|designer|manager|associate|executive)\b/ },
  { key: "skills", label: "Skills required", test: /\b(skills?|requirements?|qualifications?|proficien\w+|experience with|must know)\b/ },
  { key: "address", label: "Company address", test: /\b(address|located|office at|headquarter\w*|street|road|floor|sector|pin\s?code|zip)\b/ },
  { key: "email", label: "Official email contact", test: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ },
  { key: "process", label: "Selection process", test: /\b(interview|selection process|assessment|screening|shortlist\w* round|technical round|hiring process)\b/ },
  { key: "website", label: "Company website", test: /\b(https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}/ },
];

const WEIGHTS = {
  greeting: 10,
  urgency: 15,
  unrealistic: 20,
  external: 20,
  referral: 10,
  payment: 15,
  brandMisuse: 10,
  verification: 20,
  missing: 15,
};

function findMatches(haystack: string, needles: string[]): string[] {
  return needles.filter((n) => haystack.includes(n));
}

function extractUrls(raw: string): string[] {
  return raw.match(/(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi) ?? [];
}

function extractEmails(raw: string): string[] {
  return raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
}

export function extractCompanyName(raw: string): string | null {
  const labelled = raw.match(
    /\b(?:company|organi[sz]ation|employer|hiring partner)\s*[:\-]\s*([A-Za-z0-9&.,'\- ]{2,60})/i,
  );
  if (labelled?.[1]) return labelled[1].trim().replace(/[.,]$/, "");

  const suffix = raw.match(
    /\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3}\s+(?:Pvt\.?\s*Ltd\.?|Private Limited|Limited|Ltd\.?|Inc\.?|LLC|LLP|Technologies|Solutions|Systems|Labs|Softwares?))\b/,
  );
  if (suffix?.[1]) return suffix[1].trim();

  const atCompany = raw.match(/\b(?:at|with|from)\s+([A-Z][A-Za-z0-9&.'-]{2,30})\b/);
  return atCompany?.[1] ?? null;
}

/** Details found directly in the posting, before any public lookup. */
export function extractPostingCompanyDetails(raw: string) {
  const urls = extractUrls(raw);
  const emails = extractEmails(raw);
  const linkedin = urls.find((u) => /linkedin\.com\/(company|school)\//i.test(u)) ?? null;
  const website =
    urls.find(
      (u) =>
        !/linkedin\.com|forms\.gle|docs\.google\.com|bit\.ly|tinyurl|wa\.me|whatsapp|t\.me|telegram|typeform|airtable/i.test(
          u,
        ),
    ) ?? null;
  const corporate = emails.find((e) => {
    const domain = e.split("@")[1]?.toLowerCase() ?? "";
    return domain.length > 0 && !FREE_MAIL.includes(domain);
  });
  return {
    companyName: extractCompanyName(raw),
    website,
    linkedin,
    emailDomain: corporate ? (corporate.split("@")[1]?.toLowerCase() ?? null) : null,
    emailCount: emails.length,
  };
}

function verifyCompany(
  raw: string,
  lower: string,
  brands: string[],
  lookup?: CompanyLookupResult | null,
): CompanyVerification {
  const posted = extractPostingCompanyDetails(raw);
  const notes: string[] = [];

  const website = posted.website ?? lookup?.website ?? null;
  const linkedin = posted.linkedin ?? lookup?.linkedin ?? null;
  const emailDomain = posted.emailDomain ?? lookup?.emailDomain ?? null;

  const origin = {
    website: website ? (posted.website ? "posting" : "public-lookup") : null,
    linkedin: linkedin ? (posted.linkedin ? "posting" : "public-lookup") : null,
    emailDomain: emailDomain ? (posted.emailDomain ? "posting" : "public-lookup") : null,
  } as CompanyVerification["origin"];

  if (!website) {
    notes.push(
      posted.companyName
        ? `No official website for "${posted.companyName}" found in the posting or in public company directories.`
        : "No official company website found in the posting.",
    );
  } else if (origin.website === "public-lookup") {
    notes.push(`Official website resolved from public sources: ${website}`);
  }

  if (!linkedin) notes.push("No LinkedIn company page found for the named company.");
  else if (origin.linkedin === "public-lookup") {
    notes.push(`LinkedIn company page resolved from public search: ${linkedin}`);
  }

  if (!emailDomain) {
    notes.push(
      posted.emailCount > 0
        ? "Contact email uses a free consumer mail provider, not a corporate domain."
        : "No corporate email domain could be established for this company.",
    );
  } else if (origin.emailDomain === "public-lookup") {
    notes.push(`Corporate domain matched to the company record: ${emailDomain}`);
  }

  if (posted.emailCount > 0 && !posted.emailDomain && emailDomain) {
    notes.push(
      "The posting contacts you from a free mail account even though the company has its own domain.",
    );
  }

  if (brands.length > 0 && !website && !emailDomain) {
    notes.push(
      `Well-known brand name(s) (${brands.join(", ")}) used with no verifiable company details.`,
    );
  }
  if (/forms\.gle|docs\.google\.com\/forms|bit\.ly|tinyurl|typeform|wa\.me|t\.me/i.test(lower)) {
    notes.push("Registration handled through a third-party form or messaging link.");
  }

  const checks = { website: Boolean(website), linkedin: Boolean(linkedin), emailDomain: Boolean(emailDomain) };
  const passed = Number(checks.website) + Number(checks.linkedin) + Number(checks.emailDomain);
  const score = Math.round((passed / 3) * 100);
  const status: VerificationStatus = passed === 3 ? "verified" : passed >= 1 ? "partial" : "unverified";

  return {
    companyName: posted.companyName,
    website,
    linkedin,
    emailDomain,
    checks,
    origin,
    lookupSources: lookup?.sources ?? [],
    score,
    status,
    notes,
  };
}


function pointsFor(base: number, count: number): number {
  // saturating contribution: repeated hits of one category add less each time
  return Math.round(base * Math.min(1, 0.7 + 0.3 * Math.log2(count + 1)));
}

export function analyzeScamFeatures(raw: string): ScamAnalysis {
  const lower = raw.toLowerCase();
  const compact = lower.replace(/\s+/g, " ");

  const greetings = findMatches(compact, GENERIC_GREETINGS);
  const urgency = findMatches(compact, URGENCY);
  const unrealistic = findMatches(compact, UNREALISTIC);
  const external = findMatches(compact, EXTERNAL_REGISTRATION);
  const referral = findMatches(compact, REFERRAL);
  const payment = findMatches(compact, PAYMENT);
  const brands = BRANDS.filter((b) => new RegExp(`\\b${b}\\b`, "i").test(compact));
  const urls = extractUrls(raw);

  const missing = MISSING_CHECKS.filter((c) => !c.test.test(compact)).map((c) => c.label);
  const verification = verifyCompany(raw, compact, brands);

  const hits: FeatureHit[] = [];
  const push = (key: string, label: string, matches: string[], base: number) => {
    if (matches.length === 0) return;
    hits.push({ key, label, matches, points: pointsFor(base, matches.length) });
  };

  push("genericGreeting", "Generic mass-mailed greeting", greetings, WEIGHTS.greeting);
  push("urgency", "Urgency and pressure tactics", urgency, WEIGHTS.urgency);
  push("unrealistic", "Guaranteed / unrealistic benefits", unrealistic, WEIGHTS.unrealistic);
  push("external", "External registration or messaging link", external, WEIGHTS.external);
  push("referral", "Referral or promotional code", referral, WEIGHTS.referral);
  push("payment", "Upfront payment requested", payment, WEIGHTS.payment);

  const brandMisuse = brands.length > 0 && verification.status === "unverified";
  if (brandMisuse) {
    hits.push({
      key: "brandMisuse",
      label: "Brand name used without verifiable company",
      matches: brands.map((b) => b.toUpperCase()),
      points: pointsFor(WEIGHTS.brandMisuse, brands.length),
    });
  }

  if (verification.status !== "verified") {
    hits.push({
      key: "verification",
      label:
        verification.status === "unverified"
          ? "Company could not be verified"
          : "Company only partially verified",
      matches: verification.notes.slice(0, 3),
      points: verification.status === "unverified" ? WEIGHTS.verification : Math.round(WEIGHTS.verification / 2),
    });
  }

  if (missing.length >= 2) {
    hits.push({
      key: "missingInfo",
      label: "Missing essential job information",
      matches: missing,
      points: Math.min(WEIGHTS.missing, Math.round((missing.length / MISSING_CHECKS.length) * WEIGHTS.missing * 1.4)),
    });
  }

  const raw_score = hits.reduce((s, h) => s + h.points, 0);

  // negative evidence keeps legitimate postings low
  let credit = 0;
  if (verification.checks.website) credit += 8;
  if (verification.checks.emailDomain) credit += 8;
  if (verification.checks.linkedin) credit += 6;
  if (missing.length === 0) credit += 8;
  if (/\b(equal opportunity|salary range|responsibilities|interview process)\b/.test(compact)) credit += 6;

  const riskScore = Math.max(0, Math.min(100, raw_score - credit));
  const riskLevel: RiskLevel = riskScore <= 30 ? "low" : riskScore <= 60 ? "medium" : "high";

  const shap: ShapContribution[] = hits
    .map((h) => ({
      feature: h.label,
      value: h.points / 100,
      evidence: h.matches.slice(0, 3).join(", "),
    }))
    .concat(
      credit > 0
        ? [
            {
              feature: "Verifiable / complete posting details",
              value: -credit / 100,
              evidence: [
                verification.checks.website ? "official website" : null,
                verification.checks.emailDomain ? "corporate email domain" : null,
                verification.checks.linkedin ? "LinkedIn page" : null,
                missing.length === 0 ? "all key job fields present" : null,
              ]
                .filter(Boolean)
                .join(", "),
            },
          ]
        : [],
    )
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8);

  const reasons = hits
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((h) => h.label.toLowerCase());

  const explanation =
    reasons.length === 0
      ? "No scam-specific patterns were triggered: the posting provides verifiable company details and complete job information."
      : `The posting was scored ${riskScore}/100 (${riskLevel} risk) because it contains ${
          reasons.length > 1
            ? `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`
            : reasons[0]
        }.`;

  return {
    hits,
    missing,
    brands,
    urlCount: urls.length,
    riskScore,
    riskLevel,
    verification,
    shap,
    explanation,
    counts: {
      genericGreeting: greetings.length,
      urgency: urgency.length,
      suspicious: unrealistic.length + payment.length + external.length,
      referralCode: referral.length,
      urls: urls.length,
      brands: brands.length,
      missingInfo: missing.length,
      verification: verification.score,
    },
  };
}
