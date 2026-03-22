import { ProgramConfig } from "../models/ProgramConfig.js";
import { extractEmailDomain, normalizeCompanyDomain } from "../lib/companyEmail.js";

/** Domains configured for complimentary corporate access (normalized). */
export async function getAllowedCorporateDomains(): Promise<string[]> {
  const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
  const raw = doc?.allowedCorporateDomains ?? [];
  const set = new Set<string>();
  for (const d of raw) {
    const n = normalizeCompanyDomain(String(d));
    if (n) set.add(n);
  }
  return [...set];
}

/** True if email’s domain is on the admin allowlist. */
export async function isCorporateEmailAllowed(email: string): Promise<boolean> {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  const allowed = await getAllowedCorporateDomains();
  return allowed.includes(domain);
}

/** Normalize a list from admin UI (array or newline text). */
export function normalizeDomainList(domains: string[]): string[] {
  const set = new Set<string>();
  for (const line of domains) {
    const n = normalizeCompanyDomain(line);
    if (n) set.add(n);
  }
  return [...set].sort();
}
