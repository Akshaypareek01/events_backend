/**
 * Transactional email copy + HTML (multipart). Plain `text` always ends with EMAIL_PLAIN_SIGN_OFF.
 * Branding: header is wordmark image only (samsaralogomain.png via WEB_ORIGIN / EMAIL_LOGO_URL).
 */
import { ctaButton, EMAIL_PLAIN_SIGN_OFF, emailDocument, escapeHtml, pPlain, } from "./emailLayout.js";
/** Shared Yoga Mohotsav framing (80-day program). */
const YOGA_MOHOTSAV_WELCOME = "Welcome to Yoga Mohotsav by Samsara Wellness.";
const YOGA_MOHOTSAV_ENROLLED = "You're officially enrolled in 80 days of nonstop yoga — Yoga Mohotsav.";
function otpBox(otp) {
    const o = escapeHtml(otp);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td align="center" style="padding:20px 24px;background:#fff3eb;border-radius:12px;border:1px solid #f7c5ac;">
    <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.35em;color:#1c1914;">${o}</p>
  </td></tr>
</table>`;
}
/** Admin-triggered nudge for users who registered but have not paid yet. */
export function paymentReminderEmail(params) {
    const subject = `Yoga Mohotsav — complete your payment | Samsara Wellness`;
    const text = `Hi ${params.name},

${YOGA_MOHOTSAV_WELCOME}

This is a reminder to finish payment for ${params.programTitle} so we can confirm your spot for 80 days of nonstop yoga.

Pay securely here:
${params.payUrl}

If you've already paid, you can ignore this message.${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: `Complete payment for Yoga Mohotsav — ${params.programTitle}`,
        headline: "Complete your payment",
        innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(YOGA_MOHOTSAV_WELCOME)}
${pPlain(`You're almost there — finish payment for ${params.programTitle} to lock in your place for 80 days of nonstop yoga.`)}
${ctaButton(params.payUrl, "Pay now")}
${pPlain("If you already paid, no action needed — thank you.")}`,
    });
    return { subject, text, html };
}
export function registrationEmail(params) {
    const subject = `Welcome to Yoga Mohotsav — confirm your spot | Samsara Wellness`;
    const text = `Hi ${params.name},

${YOGA_MOHOTSAV_WELCOME}

Thank you for registering for ${params.programTitle}. You're one step away from 80 days of nonstop yoga — Yoga Mohotsav.

Complete payment here:
${params.payUrl}

If you didn't sign up, you can ignore this email.${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: `Complete payment to join Yoga Mohotsav — ${params.programTitle}`,
        headline: "You're registered — one step left",
        innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(YOGA_MOHOTSAV_WELCOME)}
${pPlain(`Thanks for choosing ${params.programTitle}. Complete your payment to confirm your place for 80 days of nonstop yoga — Yoga Mohotsav.`)}
${ctaButton(params.payUrl, "Complete payment")}
${pPlain("Didn't create an account? You can safely ignore this email.")}`,
    });
    return { subject, text, html };
}
export function corporateRegisteredEmail(params) {
    const subject = `Yoga Mohotsav — corporate registration confirmed | Samsara Wellness`;
    const text = `Hi ${params.name},

${YOGA_MOHOTSAV_WELCOME}

${YOGA_MOHOTSAV_ENROLLED}

Your corporate access for ${params.programTitle} is confirmed — no payment needed from you.

Sign in with the same email you used to register. We'll send you a one-time code to finish logging in:
${params.signInUrl}

After you sign in, your dashboard has session times and join links.${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: `Corporate access confirmed — 80-day Yoga Mohotsav — ${params.programTitle}`,
        headline: "You're registered — sign in to continue",
        innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(YOGA_MOHOTSAV_WELCOME)}
${pPlain(YOGA_MOHOTSAV_ENROLLED)}
${pPlain(`You're registered for ${params.programTitle} through your organisation — no payment required.`)}
${ctaButton(params.signInUrl, "Sign in")}
${pPlain("Use the same email you registered with; we'll email you a one-time code. Then open your dashboard for schedules and join links.")}`,
    });
    return { subject, text, html };
}
/** Sent when payment is confirmed (Razorpay verify or webhook). */
export function paymentSuccessEmail(params) {
    const subject = `Welcome to Yoga Mohotsav — you're officially enrolled | Samsara Wellness`;
    const text = `Hi ${params.name},

${YOGA_MOHOTSAV_WELCOME}

${YOGA_MOHOTSAV_ENROLLED}

We've received your payment — thank you. You're all set for ${params.programTitle}.

Your dashboard:
${params.dashboardUrl}

You'll find class times and join links there.${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: `Payment confirmed — Yoga Mohotsav — 80 days nonstop yoga`,
        headline: "You're officially enrolled",
        innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(YOGA_MOHOTSAV_WELCOME)}
${pPlain(YOGA_MOHOTSAV_ENROLLED)}
${pPlain(`Your payment went through successfully. You're confirmed for ${params.programTitle}.`)}
${pPlain("Open your dashboard for session times, join links, and updates.")}
${ctaButton(params.dashboardUrl, "Go to dashboard")}
${pPlain("Questions? Reply to this email and we'll help.")}`,
    });
    return { subject, text, html };
}
/** Sent when an admin creates a teacher and supplies an email — includes username + password once. */
export function teacherCredentialsEmail(params) {
    const subject = "Your teacher login — Yoga Mohotsav | Samsara Wellness";
    const u = params.username;
    const text = `Hi ${params.displayName},

An administrator created a Yoga Mohotsav teacher account for you.

Sign in here:
${params.teacherLoginUrl}

Username: ${u}
Password: ${params.password}

Please sign in and change your password if the admin shared a temporary one.${EMAIL_PLAIN_SIGN_OFF}`;
    const userEsc = escapeHtml(u);
    const passEsc = escapeHtml(params.password);
    const credBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td style="padding:20px 24px;background:#fff3eb;border-radius:12px;border:1px solid #f7c5ac;">
    <p style="margin:0 0 10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;color:#1c1914;"><strong style="font-family:system-ui,sans-serif;">Username</strong><br/>${userEsc}</p>
    <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;color:#1c1914;"><strong style="font-family:system-ui,sans-serif;">Password</strong><br/>${passEsc}</p>
  </td></tr>
</table>`;
    const html = emailDocument({
        preheader: "Teacher dashboard login — Yoga Mohotsav",
        headline: "Teacher access is ready",
        innerHtml: `${pPlain(`Hi ${escapeHtml(params.displayName)},`)}
${pPlain("Your teacher account for Yoga Mohotsav is set up. Use the button below to sign in, or copy your username and password from this email.")}
${ctaButton(params.teacherLoginUrl, "Teacher login")}
${credBox}
${pPlain("Keep these details private. If you did not expect this email, contact your program administrator.")}`,
    });
    return { subject, text, html };
}
export function otpLoginEmail(params) {
    const subject = "Your Yoga Mohotsav login code | Samsara Wellness";
    const text = `Your one-time login code is:

${params.otp}

It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: "Your one-time login code — expires in 10 minutes",
        headline: "Sign in to your account",
        innerHtml: `${pPlain("Use this code to finish signing in to Yoga Mohotsav. It expires in 10 minutes.")}
${otpBox(params.otp)}
${pPlain("If you didn't request this, someone may have entered your email by mistake — you can ignore this message.")}`,
    });
    return { subject, text, html };
}
export function dailyReminderEmail(params) {
    const subject = `Yoga Mohotsav — today's live sessions | Samsara Wellness`;
    const text = `Hi ${params.name},

Check your batch schedule on your dashboard for today's session times and join links.

${params.dashboardUrl}${EMAIL_PLAIN_SIGN_OFF}`;
    const html = emailDocument({
        preheader: "Yoga Mohotsav · Check your dashboard for today’s schedule",
        headline: "Today's sessions",
        innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain("Open your dashboard to see your batch schedule and join today’s live sessions — times and join links are listed there.")}
${ctaButton(params.dashboardUrl, "Open dashboard")}`,
    });
    return { subject, text, html };
}
