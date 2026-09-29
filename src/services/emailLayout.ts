/**
 * Branded HTML shell for transactional mail. Inline CSS only.
 * Logo is attached as cid:samsara-logo so it shows even when the site is localhost.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BG = "#f4f1ec";
const SURFACE = "#fffcf7";
const TEXT = "#1c1914";
const MUTED = "#5c574e";
const PRIMARY = "#e8541a";
const PRIMARY_FG = "#ffffff";
const BORDER = "#eadfd2";
const FONT = "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

const LOGO_CID = "samsara-logo";

/** Escape user-controlled strings for HTML body text. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * PNG shipped with the web app. Resolved from this file so src and dist both find it.
 */
export function emailLogoPath(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, "../../../events_frontend/public/samsaralogomain.png");
  return fs.existsSync(candidate) ? candidate : null;
}

/** Nodemailer attachment for the header logo. Null if the file is missing. */
export function emailLogoAttachment(): {
  filename: string;
  path: string;
  cid: string;
} | null {
  const logoPath = emailLogoPath();
  if (!logoPath) return null;
  return { filename: "samsara-logo.png", path: logoPath, cid: LOGO_CID };
}

/** Visible inbox snippet (hidden in the body). */
function preheaderBlock(text: string): string {
  return `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}</div>`;
}

/** Orange pill button. */
export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr><td align="left" bgcolor="${PRIMARY}" style="border-radius:999px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background:${PRIMARY};color:${PRIMARY_FG};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

/** Single paragraph; escapes `text`. */
export function pPlain(text: string): string {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};">${escapeHtml(text)}</p>`;
}

function mutedLine(text: string): string {
  return `<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(text)}</p>`;
}

/** Label / value rows for event or payment facts. */
export function detailCard(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      (row) => `<tr>
      <td style="padding:10px 0;font-family:${FONT};font-size:13px;color:${MUTED};border-bottom:1px solid ${BORDER};">${escapeHtml(row.label)}</td>
      <td style="padding:10px 0;font-family:${FONT};font-size:14px;font-weight:700;color:${TEXT};text-align:right;border-bottom:1px solid ${BORDER};">${escapeHtml(row.value)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;">
  <tr><td style="padding:4px 18px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
  </td></tr>
</table>`;
}

/** Large one-time code. */
export function otpBox(otp: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
  <tr><td align="center" style="padding:22px 16px;background:#fff7f2;border-radius:14px;border:1px solid #f3c7b4;">
    <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;color:${PRIMARY};">YOUR CODE</p>
    <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:${TEXT};">${escapeHtml(otp)}</p>
  </td></tr>
</table>`;
}

/** Plain-text closing for every transactional email. */
export const EMAIL_PLAIN_SIGN_OFF = "\n\nRegards,\nTeam Samsara Wellness";

function htmlSignOff(): string {
  return `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid ${BORDER};font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.55;color:${MUTED};">Regards,<br/>Team Samsara Wellness</p>`;
}

/**
 * Wrap trusted/escaped fragments in the branded card.
 */
export function emailDocument(params: {
  preheader: string;
  headline: string;
  innerHtml: string;
  footerLines?: string[];
  includeSignOff?: boolean;
}): string {
  const footer = (params.footerLines ?? []).map((line) => mutedLine(line)).join("");
  const signOff = params.includeSignOff === false ? "" : htmlSignOff();
  const logo = `<img src="cid:${LOGO_CID}" alt="Samsara Wellness" width="168" style="display:block;width:168px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(params.headline)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
${preheaderBlock(params.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${SURFACE};border-radius:18px;border:1px solid ${BORDER};overflow:hidden;">
      <tr><td style="height:6px;background:${PRIMARY};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td align="center" style="padding:28px 28px 0;">${logo}</td></tr>
      <tr><td style="padding:22px 28px 28px;font-family:${FONT};">
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:${TEXT};">${escapeHtml(params.headline)}</h1>
        ${params.innerHtml}
        ${footer}
        ${signOff}
        <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8a8178;">The Moon Within · Hosted by Samsara Wellness</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
