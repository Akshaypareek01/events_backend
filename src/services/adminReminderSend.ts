import { ClassSession } from "../models/ClassSession.js";
import { User } from "../models/User.js";
import { canAccessProgram } from "./access.js";
import { isEmailConfigured, sendMailSafe } from "./email.js";
import { signPayToken } from "./authJwt.js";
import { dailyReminderEmail, paymentReminderEmail } from "./emailTemplates.js";
import { getProgramMeta } from "./programConfig.js";

const MAX_BATCH = 5000;

/** Counts for admin UI before sending. */
export async function getReminderPreview() {
  const pendingPaymentCount = await User.countDocuments({
    userType: "normal",
    paymentStatus: "pending",
  });
  const eligibleForClassCount = await User.countDocuments({
    $or: [
      { userType: "corporate", paymentStatus: "free", isApproved: true },
      { userType: "normal", paymentStatus: "paid", isApproved: true },
    ],
  });
  return {
    pendingPaymentCount,
    eligibleForClassCount,
    emailConfigured: isEmailConfigured(),
  };
}

/** Email all individual users who still owe payment (pending). */
export async function sendPaymentPendingReminders(): Promise<{
  recipients: number;
}> {
  const meta = await getProgramMeta();
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const users = await User.find({ userType: "normal", paymentStatus: "pending" })
    .limit(MAX_BATCH)
    .exec();

  let recipients = 0;
  for (const u of users) {
    const pt = signPayToken(u._id.toString());
    const payUrl = `${webOrigin}/pay?userId=${u._id.toString()}&token=${encodeURIComponent(pt)}`;
    const mail = paymentReminderEmail({
      name: u.name,
      payUrl,
      programTitle: meta.title,
    });
    await sendMailSafe({ to: u.email, ...mail });
    recipients++;
  }
  return { recipients };
}

/**
 * Same audience as the daily cron: users who can open the dashboard (paid individuals +
 * approved corporate/free). Unpaid individuals are skipped.
 */
export async function sendClassSessionReminders(): Promise<{
  recipients: number;
  skippedNoAccess: number;
}> {
  const morning = await ClassSession.findOne({ type: "morning", active: true });
  const evening = await ClassSession.findOne({ type: "evening", active: true });
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const users = await User.find().limit(MAX_BATCH).exec();

  let recipients = 0;
  let skippedNoAccess = 0;
  for (const u of users) {
    if (
      !canAccessProgram({
        userType: u.userType,
        paymentStatus: u.paymentStatus,
        isApproved: u.isApproved,
      })
    ) {
      skippedNoAccess++;
      continue;
    }
    const mail = dailyReminderEmail({
      name: u.name,
      dashboardUrl: `${webOrigin}/dashboard`,
      morningTime: morning?.timeLabel ?? "07:00 AM",
      eveningTime: evening?.timeLabel ?? "07:00 PM",
    });
    await sendMailSafe({ to: u.email, ...mail });
    recipients++;
  }
  return { recipients, skippedNoAccess };
}
