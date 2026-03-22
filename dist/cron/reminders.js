import cron from "node-cron";
import { ClassSession } from "../models/ClassSession.js";
import { User } from "../models/User.js";
import { canAccessProgram } from "../services/access.js";
import { isEmailConfigured, sendMailSafe } from "../services/email.js";
import { dailyReminderEmail } from "../services/emailTemplates.js";
/** Daily digest (default 08:00 Asia/Kolkata). Disable with REMINDER_CRON=false. */
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
    cron.schedule("0 8 * * *", async () => {
        const morning = await ClassSession.findOne({ type: "morning", active: true });
        const evening = await ClassSession.findOne({ type: "evening", active: true });
        const users = await User.find().limit(3000);
        const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
        for (const u of users) {
            if (!canAccessProgram({
                userType: u.userType,
                paymentStatus: u.paymentStatus,
                isApproved: u.isApproved,
            })) {
                continue;
            }
            const mail = dailyReminderEmail({
                name: u.name,
                dashboardUrl: `${webOrigin}/dashboard`,
                morningTime: morning?.timeLabel ?? "07:00 AM",
                eveningTime: evening?.timeLabel ?? "07:00 PM",
            });
            await sendMailSafe({ to: u.email, ...mail });
        }
    }, { timezone: tz });
    console.log(`[cron] daily reminders at 08:00 (${tz})`);
}
