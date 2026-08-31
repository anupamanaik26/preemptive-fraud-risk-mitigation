"""
Scam-specific feature engineering + company verification for the
recruitment fraud model. These engineered features are concatenated with the
TF-IDF block and the BERT embeddings before XGBoost (see train_model.py),
and are also used by app.py to produce the risk score and explanation.
"""

import re

try:
    import requests
except Exception:  # lookup is optional
    requests = None


def lookup_company(name):
    """Resolve website / email domain / LinkedIn for a company name using
    trusted public sources (Clearbit directory + DuckDuckGo for LinkedIn)."""
    if not name or requests is None:
        return {"website": None, "linkedin": None, "email_domain": None, "sources": []}
    out = {"website": None, "linkedin": None, "email_domain": None, "sources": []}
    try:
        r = requests.get(
            "https://autocomplete.clearbit.com/v1/companies/suggest",
            params={"query": name}, timeout=4,
        )
        items = r.json() if r.ok else []
        if items and items[0].get("domain"):
            domain = items[0]["domain"].lower()
            out["website"] = f"https://{domain}"
            out["email_domain"] = domain
            out["sources"].append("Clearbit company directory")
    except Exception:
        pass
    try:
        r = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": f"{name} site:linkedin.com/company"},
            headers={"User-Agent": "Mozilla/5.0"}, timeout=4,
        )
        m = re.search(r"https?://[a-z.]*linkedin\.com/company/[A-Za-z0-9_-]+", r.text or "")
        if m:
            out["linkedin"] = m.group(0)
            out["sources"].append("LinkedIn company page (public search)")
    except Exception:
        pass
    return out

GENERIC_GREETINGS = [
    "dear student", "dear candidate", "dear applicant", "greetings applicant",
    "greetings candidate", "congratulations", "congrats",
    "your profile has been shortlisted", "you have been shortlisted",
]
URGENCY = [
    "limited slots", "limited seats", "first come first serve", "apply immediately",
    "apply now", "hurry up", "hurry", "last chance", "register now",
    "immediate joining", "join today", "closing soon",
]
UNREALISTIC = [
    "guaranteed stipend", "fixed stipend", "assured placement", "100% job guarantee",
    "job guarantee", "no interview required", "no interview", "earn while studying",
    "high salary for freshers", "guaranteed income", "unlimited income",
]
EXTERNAL = [
    "click the link below", "click here", "fill the registration form",
    "registration form", "onboarding link", "whatsapp group", "telegram group",
    "join through whatsapp", "registration link",
]
REFERRAL = ["referral code", "promo code", "promotional code", "registration code", "coupon code"]
PAYMENT = ["registration fee", "security deposit", "processing fee", "training fee", "pay a fee"]
BRANDS = ["ibm", "microsoft", "google", "amazon", "adobe", "aicte", "infosys", "tcs", "wipro"]
FREE_MAIL = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"}

MISSING_CHECKS = {
    "role": r"\b(role|position|designation|job title)\b|\b(intern|engineer|developer|analyst|manager)\b",
    "skills": r"\b(skills?|requirements?|qualifications?|proficien\w+)\b",
    "address": r"\b(address|located|office at|headquarter\w*|street|road|sector)\b",
    "email": r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}",
    "process": r"\b(interview|selection process|assessment|screening|hiring process)\b",
    "website": r"(https?://|www\.)[a-z0-9.-]+\.[a-z]{2,}",
}

WEIGHTS = {
    "generic_greeting": 10, "urgency": 15, "unrealistic": 20, "external": 20,
    "referral": 10, "payment": 15, "brand_misuse": 10, "verification": 20, "missing": 15,
}

URL_RE = re.compile(r"(https?://[^\s)]+|www\.[^\s)]+)", re.I)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


def _hits(text, phrases):
    return [p for p in phrases if p in text]


def extract_company_name(raw):
    m = re.search(r"\b(?:company|organisation|organization|employer)\s*[:\-]\s*([A-Za-z0-9&.\'\- ]{2,60})", str(raw), re.I)
    if m:
        return " ".join(m.group(1).split(".")[0].split()[:5]) or None
    m = re.search(r"\b([A-Z][A-Za-z0-9&.\'-]*(?:\s+[A-Z][A-Za-z0-9&.\'-]*){0,3}\s+(?:Pvt\.?\s*Ltd\.?|Private Limited|Limited|Ltd\.?|Inc\.?|LLC|LLP|Technologies|Solutions|Systems|Labs))\b", str(raw))
    return m.group(1) if m else None


def verify_company(raw):
    """Website / LinkedIn / corporate-email verification -> 0-100 + status."""
    urls = URL_RE.findall(raw)
    emails = EMAIL_RE.findall(raw)
    linkedin = next((u for u in urls if "linkedin.com/company" in u.lower()), None)
    website = next(
        (u for u in urls
         if not re.search(r"linkedin|forms\.gle|docs\.google|bit\.ly|tinyurl|wa\.me|t\.me", u, re.I)),
        None,
    )
    corporate = next((e for e in emails if e.split("@")[-1].lower() not in FREE_MAIL), None)
    company_name = extract_company_name(raw)
    corporate_domain = corporate.split("@")[-1].lower() if corporate else None

    # Verification must not depend on URLs in the posting: resolve the named
    # company against trusted public sources when details are missing.
    sources = []
    if company_name and not (website and linkedin and corporate_domain):
        found = lookup_company(company_name)
        website = website or found["website"]
        linkedin = linkedin or found["linkedin"]
        corporate_domain = corporate_domain or found["email_domain"]
        sources = found["sources"]

    checks = {"website": bool(website), "linkedin": bool(linkedin), "email_domain": bool(corporate_domain)}
    score = round(sum(checks.values()) / 3 * 100)
    status = "verified" if score == 100 else ("partial" if score > 0 else "unverified")
    return {
        "website": website,
        "linkedin": linkedin,
        "company_name": company_name,
        "email_domain": corporate_domain,
        "lookup_sources": sources,
        "checks": checks,
        "score": score,
        "status": status,
    }


def extract_features(raw):
    """Return (feature_vector, detail_dict). Vector order is stable for XGBoost."""
    text = re.sub(r"\s+", " ", str(raw).lower())

    greeting = _hits(text, GENERIC_GREETINGS)
    urgency = _hits(text, URGENCY)
    unrealistic = _hits(text, UNREALISTIC)
    external = _hits(text, EXTERNAL)
    referral = _hits(text, REFERRAL)
    payment = _hits(text, PAYMENT)
    brands = [b for b in BRANDS if re.search(rf"\b{b}\b", text)]
    urls = URL_RE.findall(str(raw))
    missing = [k for k, pat in MISSING_CHECKS.items() if not re.search(pat, text)]
    verification = verify_company(str(raw))

    detail = {
        "generic_greeting": greeting,
        "urgency": urgency,
        "unrealistic": unrealistic,
        "external": external,
        "referral": referral,
        "payment": payment,
        "brands": brands,
        "missing": missing,
        "verification": verification,
    }

    vector = [
        len(greeting), len(urgency),
        len(unrealistic) + len(payment) + len(external),
        1 if referral else 0,
        len(urls), len(brands), len(missing),
        verification["score"] / 100.0,
    ]
    return vector, detail


FEATURE_NAMES = [
    "generic_greeting_count", "urgency_count", "suspicious_count",
    "referral_code", "url_count", "brand_count", "missing_info_score",
    "verification_score",
]


def risk_score(detail):
    """0-100 risk score + level, using the documented weighting."""
    score = 0
    if detail["generic_greeting"]:
        score += WEIGHTS["generic_greeting"]
    if detail["urgency"]:
        score += WEIGHTS["urgency"]
    if detail["unrealistic"]:
        score += WEIGHTS["unrealistic"]
    if detail["external"]:
        score += WEIGHTS["external"]
    if detail["referral"]:
        score += WEIGHTS["referral"]
    if detail["payment"]:
        score += WEIGHTS["payment"]
    if detail["brands"] and detail["verification"]["status"] == "unverified":
        score += WEIGHTS["brand_misuse"]
    if detail["verification"]["status"] != "verified":
        score += WEIGHTS["verification"] if detail["verification"]["status"] == "unverified" \
            else WEIGHTS["verification"] // 2
    if len(detail["missing"]) >= 2:
        score += WEIGHTS["missing"]

    credit = 8 * detail["verification"]["checks"]["website"] \
        + 8 * detail["verification"]["checks"]["email_domain"] \
        + 6 * detail["verification"]["checks"]["linkedin"] \
        + (8 if not detail["missing"] else 0)

    score = max(0, min(100, score - credit))
    level = "low" if score <= 30 else ("medium" if score <= 60 else "high")
    return score, level


def explain(detail, score, level):
    reasons = []
    if detail["generic_greeting"]:
        reasons.append("a generic congratulatory or mass-mailed greeting")
    if detail["unrealistic"]:
        reasons.append("guaranteed stipend or assured placement claims")
    if detail["urgency"]:
        reasons.append("urgency language")
    if detail["external"]:
        reasons.append("external registration or messaging links")
    if detail["referral"]:
        reasons.append("a referral code")
    if detail["payment"]:
        reasons.append("an upfront payment request")
    if detail["verification"]["status"] != "verified":
        reasons.append("no verifiable company information")
    if len(detail["missing"]) >= 2:
        reasons.append("missing essential job details")

    if not reasons:
        return "No scam-specific patterns were triggered; company details and job information are complete."
    joined = ", ".join(reasons[:-1]) + (" and " + reasons[-1] if len(reasons) > 1 else reasons[0])
    return f"The posting scored {score}/100 ({level} risk) because it contains {joined}."
