import { ProgramConfig } from "../models/ProgramConfig.js";

/** Customer-facing program name (emails, payment copy, registration). */
export const PUBLIC_PROGRAM_TITLE = "Samsara — 80-Day Yoga Mohotsav";

/**
 * Older DB seeds used "3 Month Journey"; normalize so emails and APIs never contradict the 80-day program.
 */
export function normalizeProgramTitle(stored: string | undefined): string {
  const t = stored?.trim();
  if (!t) return PUBLIC_PROGRAM_TITLE;
  if (/3\s*-?\s*month/i.test(t)) return PUBLIC_PROGRAM_TITLE;
  return t;
}

export async function getProgramMeta(): Promise<{
  title: string;
  priceInr: number;
  currency: string;
}> {
  const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
  return {
    title: normalizeProgramTitle(doc?.title),
    priceInr: doc?.priceInr ?? 499,
    currency: doc?.currency ?? "INR",
  };
}
