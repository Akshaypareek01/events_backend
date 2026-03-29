/**
 * Shared HTML shell for transactional mail (inline CSS for client compatibility).
 * Palette aligned with the web app: warm paper + orange accent.
 */

const BG = "#f4f1ec";
const SURFACE = "#fffcf7";
const TEXT = "#1c1914";
const MUTED = "#5c574e";
const PRIMARY = "#e8541a";
const PRIMARY_FG = "#ffffff";
const BORDER = "#d8cfc3";

/** Header wordmark for transactional email (`/public/samsaralogomain.png` on the web app). */
function resolveHeaderLogoUrl(): string {
  const explicit = process.env.EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const webOrigin = (process.env.WEB_ORIGIN ?? "http://localhost:3000").trim().replace(/\/$/, "");
  return `${webOrigin}/samsaralogomain.png`;
}

/** Escape user-controlled strings for HTML body text. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Visible inbox snippet (hidden in body, shown by many clients). */
function preheaderBlock(text: string): string {
  return `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}</div>`;
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td align="left">
    <a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:${PRIMARY};color:${PRIMARY_FG};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${safeLabel}</a>
  </td></tr>
</table>`;
}

/** Single paragraph; escapes `text`. */
export function pPlain(text: string): string {
  return `<p style="margin:0 0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">${escapeHtml(text)}</p>`;
}

function mutedLineEscaped(text: string): string {
  return `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(text)}</p>`;
}

/**
 * Wrap inner HTML (already safe or built from escapeHtml) in branded layout.
 * @param innerHtml - paragraphs, buttons, lists (trusted / escaped fragments only)
 */
/** Plain-text closing for every transactional email (multipart). */
export const EMAIL_PLAIN_SIGN_OFF = "\n\nRegards,\nTeam Samsara Wellness";

function htmlSignOffBlock(): string {
  const font = "Georgia,'Times New Roman',Times,serif";
  return `<div style="margin-top:28px;padding-top:22px;border-top:1px solid ${BORDER};">
  <p style="margin:0 0 6px;font-family:${font};font-size:14px;font-weight:400;color:${MUTED};line-height:1.55;">Regards,</p>
  <p style="margin:0;font-family:${font};font-size:14px;font-weight:400;color:${MUTED};line-height:1.55;">Team Samsara Wellness</p>
</div>`;
}

export function emailDocument(params: {
  preheader: string;
  headline: string;
  innerHtml: string;
  footerLines?: string[];
  /** Default true: logo-only header; no separate brand wordmark text in body. */
  includeSignOff?: boolean;
}): string {
  const logoUrl = resolveHeaderLogoUrl();
  const footer =
    params.footerLines?.length ?
      params.footerLines.map((l) => mutedLineEscaped(l)).join("")
    : "";
  const signOff = params.includeSignOff === false ? "" : htmlSignOffBlock();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(params.headline)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
${preheaderBlock(params.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${SURFACE};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 4px 24px rgba(28,25,20,0.06);">
      <tr><td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
          <tr>
            <td>
              <img src="${escapeHtml(logoUrl)}" alt="Samsara Wellness" width="300" style="display:block;max-width:100%;width:300px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;line-height:1.3;color:${TEXT};">${escapeHtml(params.headline)}</h1>
        ${params.innerHtml}
        ${footer}
        ${signOff}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export { ctaButton };
