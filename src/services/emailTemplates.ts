/**
 * Transactional copy for The Moon Within. Every template is multipart (text + branded HTML).
 */

import { INCLUSIVE_PRICE_INR } from "./pricing.js";
import {
  ctaButton,
  detailCard,
  EMAIL_PLAIN_SIGN_OFF,
  emailDocument,
  escapeHtml,
  otpBox,
  pPlain,
} from "./emailLayout.js";

export type EmailPayload = { subject: string; text: string; html: string };

const EVENT = "The Moon Within";
const EVENT_LINE = "Online full moon circle for women";
const WHEN = "26 October 2026, 7:30 PM IST";
const FEE = `₹${INCLUSIVE_PRICE_INR} (GST included)`;

/** Admin nudge for someone who registered and has not paid. */
export function paymentReminderEmail(params: {
  name: string;
  payUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `Complete your payment · ${EVENT}`;
  const text = `Hi ${params.name},

You're registered for ${EVENT} — ${EVENT_LINE}.

Payment of ${FEE} is still pending. Finish it here:
${params.payUrl}

Circle: ${WHEN}

If you've already paid, you can ignore this message.${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `₹${INCLUSIVE_PRICE_INR} confirms your place in ${EVENT}`,
    headline: "Complete your payment",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Your place in ${EVENT} is held, but payment is still open.`)}
${detailCard([
  { label: "Circle", value: EVENT },
  { label: "When", value: WHEN },
  { label: "Fee", value: FEE },
])}
${ctaButton(params.payUrl, "Pay ₹" + INCLUSIVE_PRICE_INR)}
${pPlain("Already paid? You can ignore this email.")}`,
  });

  return { subject, text, html };
}

/** Individual registration — payment still required. */
export function registrationEmail(params: {
  name: string;
  payUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `You're registered · ${EVENT}`;
  const text = `Hi ${params.name},

You're registered for ${EVENT}, ${EVENT_LINE}, hosted by Samsara Wellness.

When: ${WHEN}
Fee: ${FEE}

Complete payment to confirm your place:
${params.payUrl}

If you didn't sign up, you can ignore this email.${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `Registration received. Pay ${FEE} to confirm ${EVENT}.`,
    headline: "You're registered",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Thanks for registering for ${EVENT}. One payment confirms your place in the circle.`)}
${detailCard([
  { label: "Event", value: EVENT },
  { label: "Format", value: EVENT_LINE },
  { label: "When", value: WHEN },
  { label: "Fee", value: FEE },
])}
${ctaButton(params.payUrl, "Complete payment")}
${pPlain("Didn't create this registration? You can safely ignore this email.")}`,
  });

  return { subject, text, html };
}

/** Corporate registration — no payment. */
export function corporateRegisteredEmail(params: {
  name: string;
  signInUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `You're registered · ${EVENT}`;
  const text = `Hi ${params.name},

You're registered for ${EVENT} through your organisation. No payment is needed.

When: ${WHEN}

Sign in with this email. We'll send a one-time code:
${params.signInUrl}${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `Corporate registration confirmed for ${EVENT}`,
    headline: "You're registered",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Your organisation has registered you for ${EVENT}. There is nothing to pay.`)}
${detailCard([
  { label: "Event", value: EVENT },
  { label: "When", value: WHEN },
  { label: "Access", value: "Included" },
])}
${ctaButton(params.signInUrl, "Sign in")}
${pPlain("Use the same email you registered with. We'll send a one-time code to finish signing in.")}`,
  });

  return { subject, text, html };
}

/** Sent when Razorpay verify or the webhook confirms payment. */
export function paymentSuccessEmail(params: {
  name: string;
  dashboardUrl: string;
  programTitle: string;
}): EmailPayload {
  const subject = `Payment confirmed · ${EVENT}`;
  const text = `Hi ${params.name},

We've received your payment of ${FEE} for ${EVENT}.

You're confirmed for the circle on ${WHEN}.

Open your dashboard for the join link:
${params.dashboardUrl}${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `Payment of ${FEE} received. You're confirmed for ${EVENT}.`,
    headline: "Payment confirmed",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`Your payment went through. You're confirmed for ${EVENT}.`)}
${detailCard([
  { label: "Amount", value: FEE },
  { label: "Status", value: "Paid" },
  { label: "Event", value: EVENT },
  { label: "When", value: WHEN },
])}
${ctaButton(params.dashboardUrl, "Open dashboard")}
${pPlain("The join link opens 5 minutes before 7:30 PM IST on 26 October 2026.")}`,
  });

  return { subject, text, html };
}

/** Teacher account created by an admin. Password is shown once. */
export function teacherCredentialsEmail(params: {
  displayName: string;
  teacherLoginUrl: string;
  username: string;
  password: string;
}): EmailPayload {
  const subject = `Your teacher login · ${EVENT}`;
  const text = `Hi ${params.displayName},

A teacher account is ready for ${EVENT}.

Sign in:
${params.teacherLoginUrl}

Username: ${params.username}
Password: ${params.password}

Keep this private.${EMAIL_PLAIN_SIGN_OFF}`;

  const creds = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
  <tr><td style="padding:16px 18px;background:#fff7f2;border-radius:14px;border:1px solid #f3c7b4;font-family:system-ui,sans-serif;font-size:14px;color:#1c1914;line-height:1.6;">
    <strong>Username</strong><br/>${escapeHtml(params.username)}<br/><br/>
    <strong>Password</strong><br/>${escapeHtml(params.password)}
  </td></tr>
</table>`;

  const html = emailDocument({
    preheader: `Teacher login for ${EVENT}`,
    headline: "Teacher access is ready",
    innerHtml: `${pPlain(`Hi ${params.displayName},`)}
${pPlain(`Your teacher account for ${EVENT} is set up. Sign in with the details below.`)}
${ctaButton(params.teacherLoginUrl, "Teacher login")}
${creds}
${pPlain("Keep these details private. If you did not expect this email, contact your administrator.")}`,
  });

  return { subject, text, html };
}

/** One-time login code. */
export function otpLoginEmail(params: { otp: string }): EmailPayload {
  const subject = `Your sign-in code · ${EVENT}`;
  const text = `Your one-time sign-in code for ${EVENT} is:

${params.otp}

It expires in 10 minutes. If you didn't try to sign in, ignore this email.${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `Code ${params.otp} expires in 10 minutes`,
    headline: "Your sign-in code",
    innerHtml: `${pPlain(`Use this code to sign in to ${EVENT}. It expires in 10 minutes.`)}
${otpBox(params.otp)}
${pPlain("If you didn't request this, you can ignore the email. The code will expire on its own.")}`,
  });

  return { subject, text, html };
}

/** Reminder pointing at the circle, not a daily yoga batch. */
export function dailyReminderEmail(params: {
  name: string;
  dashboardUrl: string;
}): EmailPayload {
  const subject = `Your circle · ${EVENT}`;
  const text = `Hi ${params.name},

${EVENT} is on ${WHEN}.

Open your dashboard for the join link:
${params.dashboardUrl}${EMAIL_PLAIN_SIGN_OFF}`;

  const html = emailDocument({
    preheader: `${EVENT} · ${WHEN}`,
    headline: "Your circle is coming up",
    innerHtml: `${pPlain(`Hi ${params.name},`)}
${pPlain(`${EVENT} is on ${WHEN}. Join from your dashboard — the link opens 5 minutes before the start.`)}
${ctaButton(params.dashboardUrl, "Open dashboard")}`,
  });

  return { subject, text, html };
}
