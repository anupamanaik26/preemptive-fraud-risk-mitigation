/**
 * Company verification lookup against trusted public sources.
 *
 * Used when a posting names a company but provides no website / LinkedIn /
 * corporate email. Instead of marking those checks as "missing", we resolve the
 * company from public directories:
 *   1. Clearbit Autocomplete  -> official domain (and therefore email domain)
 *   2. Wikipedia REST search  -> corroborates the organisation exists
 *   3. DuckDuckGo HTML search -> linkedin.com/company page
 *
 * All calls are best-effort with short timeouts; failures degrade to "not found".
 */

export interface CompanyLookup {
  website: string | null;
  linkedin: string | null;
  emailDomain: string | null;
  sources: string[];
}

const TIMEOUT_MS = 4000;
const UA =
  "Mozilla/5.0 (compatible; RecruitmentFraudDetection/1.0; +https://lovable.dev)";

async function get(url: string, accept = "application/json"): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { accept, "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function normalise(name: string): string {
  return name
    .replace(/\b(pvt\.?|private|ltd\.?|limited|inc\.?|llc|llp|corp\.?|corporation)\b/gi, "")
    .replace(/[^A-Za-z0-9&' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clearbit's public autocomplete endpoint: name -> official domain. */
async function findDomain(name: string): Promise<{ domain: string; site: string } | null> {
  const body = await get(
    `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`,
  );
  if (!body) return null;
  try {
    const list = JSON.parse(body) as Array<{ name?: string; domain?: string }>;
    const target = normalise(name).toLowerCase();
    const best =
      list.find((c) => (c.name ?? "").toLowerCase() === target) ??
      list.find((c) => normalise(c.name ?? "").toLowerCase().startsWith(target)) ??
      list[0];
    if (!best?.domain) return null;
    return { domain: best.domain.toLowerCase(), site: `https://${best.domain.toLowerCase()}` };
  } catch {
    return null;
  }
}

/** Wikipedia corroboration that the organisation is a real, documented entity. */
async function existsOnWikipedia(name: string): Promise<boolean> {
  const body = await get(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(name)}&limit=1`,
  );
  if (!body) return false;
  try {
    const data = JSON.parse(body) as { pages?: Array<{ title?: string }> };
    return Boolean(data.pages?.length);
  } catch {
    return false;
  }
}

/** DuckDuckGo HTML endpoint, filtered to LinkedIn company pages. */
async function findLinkedIn(name: string): Promise<string | null> {
  const body = await get(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${name} site:linkedin.com/company`)}`,
    "text/html",
  );
  if (!body) return null;
  const matches = body.match(
    /https?%3A%2F%2F[a-z.]*linkedin\.com%2Fcompany%2F[A-Za-z0-9_-]+|https?:\/\/[a-z.]*linkedin\.com\/company\/[A-Za-z0-9_-]+/gi,
  );
  const first = matches?.[0];
  if (!first) return null;
  return decodeURIComponent(first).split("?")[0] ?? null;
}

/**
 * Resolve a company's public footprint from its name alone.
 * `known` lets us skip lookups for details already present in the posting.
 */
export async function lookupCompany(
  companyName: string | null,
  known: { website?: string | null; linkedin?: string | null; emailDomain?: string | null } = {},
): Promise<CompanyLookup | null> {
  const name = companyName?.trim();
  if (!name || name.length < 2) return null;

  const needsSite = !known.website || !known.emailDomain;
  const needsLinkedIn = !known.linkedin;

  const [domain, linkedin, onWikipedia] = await Promise.all([
    needsSite ? findDomain(name) : Promise.resolve(null),
    needsLinkedIn ? findLinkedIn(name) : Promise.resolve(null),
    needsSite ? existsOnWikipedia(name) : Promise.resolve(false),
  ]);

  const sources: string[] = [];
  if (domain) sources.push("Clearbit company directory");
  if (linkedin) sources.push("LinkedIn company page (public search)");
  if (onWikipedia) sources.push("Wikipedia organisation record");

  if (!domain && !linkedin) return null;

  return {
    website: domain?.site ?? null,
    linkedin,
    emailDomain: domain?.domain ?? null,
    sources,
  };
}
