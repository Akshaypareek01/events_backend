import { ProgramConfig } from "../models/ProgramConfig.js";
/** Customer-facing program name (emails, payment copy, registration). */
export const PUBLIC_PROGRAM_TITLE = "Samsara — 80-Day Yoga Mohotsav";
/**
 * Older DB seeds used "3 Month Journey"; normalize so emails and APIs never contradict the 80-day program.
 */
export function normalizeProgramTitle(stored) {
    const t = stored?.trim();
    if (!t)
        return PUBLIC_PROGRAM_TITLE;
    if (/3\s*-?\s*month/i.test(t))
        return PUBLIC_PROGRAM_TITLE;
    return t;
}
export async function getProgramMeta() {
    const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    const msg = doc?.dashboardAlertMessage?.trim();
    return {
        title: normalizeProgramTitle(doc?.title),
        priceInr: doc?.priceInr ?? 499,
        currency: doc?.currency ?? "INR",
        dashboardAlert: msg && msg.length > 0
            ? {
                message: msg,
                color: doc?.dashboardAlertColor ?? "info",
            }
            : undefined,
    };
}
