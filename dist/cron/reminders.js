import cron from "node-cron";
import { sendClassSessionReminders } from "../services/adminReminderSend.js";
import { isEmailConfigured } from "../services/email.js";
/**
 * Production batch windows (IST) → cron fires 30 minutes before class start.
 * Each run emails eligible students (same audience as admin POST /reminders/class-sessions).
 */
const CLASS_REMINDER_SLOTS = [
    { expression: "30 5 * * *", label: "05:30 — before 06:00–07:00" },
    { expression: "0 7 * * *", label: "07:00 — before 07:30–08:30" },
    { expression: "30 8 * * *", label: "08:30 — before 09:00–10:00" },
    { expression: "30 10 * * *", label: "10:30 — before 11:00–12:00" },
    { expression: "30 16 * * *", label: "16:30 — before 17:00–18:00" },
    { expression: "30 18 * * *", label: "18:30 — before 19:00–20:00" },
];
/** Disable with REMINDER_CRON=false. Times use CRON_TZ (default Asia/Kolkata). */
export function startReminderCron() {
    if (process.env.REMINDER_CRON === "false") {
        console.log("[cron] reminders disabled");
        return;
    }
    if (!isEmailConfigured()) {
        console.log("[cron] reminders skipped (no email transport)");
        return;
    }
    const tz = process.env.CRON_TZ ?? "Asia/Kolkata";
    for (const slot of CLASS_REMINDER_SLOTS) {
        cron.schedule(slot.expression, async () => {
            try {
                const result = await sendClassSessionReminders();
                console.log(`[cron] class reminders (${slot.label} ${tz}): sent=${result.recipients} skippedNoAccess=${result.skippedNoAccess}`);
            }
            catch (e) {
                console.error(`[cron] class reminders failed (${slot.label})`, e);
            }
        }, { timezone: tz });
    }
    console.log(`[cron] class session reminders: ${CLASS_REMINDER_SLOTS.length} daily slots (${tz})`);
    for (const s of CLASS_REMINDER_SLOTS) {
        console.log(`[cron]   ${s.label}`);
    }
}
