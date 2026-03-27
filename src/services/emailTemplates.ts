/**
 * Transactional email copy + HTML (multipart). Plain `text` is always included for accessibility.
 */

import {
  ctaButton,
  emailDocument,
  escapeHtml,
  pPlain,
} from "./emailLayout.js";

export type EmailPayload = { subject: string; text: string; html: string };

function otpBox(otp: string): string {
  const o = escapeHtml(otp);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td align="center" style="padding:20px 24px;background:#fff3eb;border-radius:12px;border:1px solid #f7c5ac;">
    <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.35em;color:#1c1914;">${o}</p>
  </td></tr>
</table>`;
}

/** Admin-triggered nudge for users who registered but have not paid yet. */
export function paymentReminderEmail(params: {
  name: string;
  payUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `Reminder: complete your payment — ${params.programTitle}`;
  const text = `Hi ${params.name},

This is a friendly reminder to finish payment for ${params.programTitle}.

Pay securely here:
${params.payUrl}

If you've already completed payment, you can ignore this message.

— Samsara`;

  const html = emailDocument({
    preheader: `Reminder to complete payment for ${params.programTitle}`,
    headline: "Complete your payment",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`You're almost there — your spot for ${params.programTitle} is waiting on payment. Use the button below when you're ready.`)}
${ctaButton(params.payUrl, "Pay now")}
${pPlain("If you already paid, no action needed — thank you.")}`,
  });

  return { subject, text, html };
}

export function registrationEmail(params: {
  name: string;
  payUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `Welcome — complete payment for ${params.programTitle}`;
  const text = `Hi ${params.name},

Thank you for registering for ${params.programTitle}.

To confirm your place, please complete payment using the link below:
${params.payUrl}

If you didn't sign up, you can ignore this email.

— Samsara`;

  const html = emailDocument({
    preheader: `Complete payment to join ${params.programTitle}`,
    headline: "You're registered — one step left",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Thanks for choosing ${params.programTitle}. Complete your payment to unlock your dashboard and join live sessions.`)}
${ctaButton(params.payUrl, "Complete payment")}
${pPlain("Didn't create an account? You can safely ignore this email.")}`,
  });

  return { subject, text, html };
}

export function corporateRegisteredEmail(params: {
  name: string;
  dashboardUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `You're in — ${params.programTitle} (corporate access)`;
  const text = `Hi ${params.name},

Your corporate registration for ${params.programTitle} is confirmed.

Open your dashboard to see schedules and join links:
${params.dashboardUrl}

— Samsara`;

  const html = emailDocument({
    preheader: `Corporate access is active for ${params.programTitle}`,
    headline: "Your corporate access is ready",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`You're registered for ${params.programTitle} through your work email. Your organisation covers this program — no payment needed from you.`)}
${ctaButton(params.dashboardUrl, "Open dashboard")}
${pPlain("Use the same email to log in with a one-time code when prompted.")}`,
  });

  return { subject, text, html };
}

/** Sent when payment is confirmed (Razorpay verify or webhook). */
export function paymentSuccessEmail(params: {
  name: string;
  dashboardUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `Payment confirmed — welcome to ${params.programTitle}`;
  const text = `Hi ${params.name},

We've received your payment — thank you. You're all set for ${params.programTitle}.

Your dashboard:
${params.dashboardUrl}

You'll find today's class times and links there. We're glad you're here.

— Samsara`;

  const html = emailDocument({
    preheader: `Payment received — you're enrolled in ${params.programTitle}`,
    headline: "Payment confirmed",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Thank you — your payment went through successfully. You're officially enrolled in ${params.programTitle}.`)}
${pPlain("What's next: open your dashboard for session times, Zoom links, and updates.")}
${ctaButton(params.dashboardUrl, "Go to dashboard")}
${pPlain("Questions? Reply to this email and we'll help.")}`,
  });

  return { subject, text, html };
}

/** Sent when an admin creates a teacher and supplies an email — includes username + password once. */
export function teacherCredentialsEmail(params: {
  displayName: string;
  teacherLoginUrl: string;
  username: string;
  password: string;
}): EmailPayload {
  const subject = "Your teacher login — Samsara";
  const u = params.username;
  const text = `Hi ${params.displayName},

An administrator created a teacher account for you.

Sign in here:
${params.teacherLoginUrl}

Username: ${u}
Password: ${params.password}

Please sign in and change your password if the admin shared a temporary one.

— Samsara`;

  const userEsc = escapeHtml(u);
  const passEsc = escapeHtml(params.password);
  const credBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td style="padding:20px 24px;background:#fff3eb;border-radius:12px;border:1px solid #f7c5ac;">
    <p style="margin:0 0 10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;color:#1c1914;"><strong style="font-family:system-ui,sans-serif;">Username</strong><br/>${userEsc}</p>
    <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;color:#1c1914;"><strong style="font-family:system-ui,sans-serif;">Password</strong><br/>${passEsc}</p>
  </td></tr>
</table>`;

  const html = emailDocument({
    preheader: "Your teacher dashboard login details",
    headline: "Teacher access is ready",
    innerHtml: `${pPlain(`Hi ${escapeHtml(params.displayName)},`)}
${pPlain("Your teacher account is set up. Use the button below to sign in, or copy your username and password from this email.")}
${ctaButton(params.teacherLoginUrl, "Teacher login")}
${credBox}
${pPlain("Keep these details private. If you did not expect this email, contact your program administrator.")}`,
  });

  return { subject, text, html };
}

export function otpLoginEmail(params: { otp: string }): EmailPayload {
  const subject = "Your login code";
  const text = `Your one-time login code is:

${params.otp}

It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.

— Samsara`;

  const html = emailDocument({
    preheader: "Your one-time login code — expires in 10 minutes",
    headline: "Sign in to your account",
    innerHtml: `${pPlain("Use this code to finish signing in. It expires in 10 minutes.")}
${otpBox(params.otp)}
${pPlain("If you didn't request this, someone may have entered your email by mistake — you can ignore this message.")}`,
  });

  return { subject, text, html };
}

export function dailyReminderEmail(params: {
  name: string;
  dashboardUrl: string;
  morningTime: string;
  eveningTime: string;
}): EmailPayload {
  const subject = "Today's live sessions";
  const text = `Hi ${params.name},

Today's sessions: morning ${params.morningTime}, evening ${params.eveningTime}.

Join from your dashboard:
${params.dashboardUrl}

— Samsara`;

  const html = emailDocument({
    preheader: `Morning ${params.morningTime} · Evening ${params.eveningTime}`,
    headline: "Today's sessions",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Morning: ${params.morningTime} · Evening: ${params.eveningTime}`)}
${pPlain("Join live from your dashboard — the link is the same each day.")}
${ctaButton(params.dashboardUrl, "Open dashboard")}`,
  });

  return { subject, text, html };
}
