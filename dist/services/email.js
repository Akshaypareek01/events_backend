import nodemailer from "nodemailer";
/** AWS SES SMTP (preferred): endpoint + IAM SMTP user + password. */
function sesConfigured() {
    return Boolean(process.env.SES_SMTP_ENDPOINT &&
        process.env.SES_SMTP_USERNAME &&
        process.env.SES_SMTP_PASSWORD);
}
/** Legacy generic SMTP (e.g. Gmail) when SES is not set. */
function legacySmtpConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
/** True when any outbound mail transport is configured. */
export function isEmailConfigured() {
    return sesConfigured() || legacySmtpConfigured();
}
function createSesTransport() {
    const port = Number(process.env.SES_SMTP_PORT) || 587;
    const secure = process.env.SES_SMTP_SECURE === "true" || port === 465;
    return nodemailer.createTransport({
        host: process.env.SES_SMTP_ENDPOINT,
        port,
        secure,
        auth: {
            user: process.env.SES_SMTP_USERNAME,
            pass: process.env.SES_SMTP_PASSWORD,
        },
    });
}
function createLegacySmtpTransport() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
function createTransport() {
    if (sesConfigured())
        return createSesTransport();
    return createLegacySmtpTransport();
}
function resolveFromAddress() {
    if (sesConfigured()) {
        return (process.env.EMAIL_FROM ??
            process.env.SMTP_FROM ??
            process.env.SMTP_USER);
    }
    return process.env.SMTP_FROM ?? process.env.SMTP_USER;
}
/** Sends mail when SES or SMTP is configured; otherwise logs (dev). HTML is optional (multipart). */
export async function sendMailSafe(options) {
    if (!isEmailConfigured()) {
        console.warn(`[email] Mail not configured — would send to ${options.to}: ${options.subject}`);
        return;
    }
    const from = resolveFromAddress();
    if (!from) {
        console.warn("[email] Set EMAIL_FROM (SES) or SMTP_FROM / SMTP_USER");
        return;
    }
    await createTransport().sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {}),
    });
}
