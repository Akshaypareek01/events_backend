/**
 * Shared HTML shell for transactional mail (inline CSS for client compatibility).
 * Palette aligned with the web app: warm paper + forest green accent.
 */
const BG = "#f4f1ec";
const SURFACE = "#fffcf7";
const TEXT = "#1c1914";
const MUTED = "#5c574e";
const PRIMARY = "#2f5d50";
const PRIMARY_FG = "#f7faf8";
const BORDER = "#d8cfc3";
/** Escape user-controlled strings for HTML body text. */
export function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
/** Visible inbox snippet (hidden in body, shown by many clients). */
function preheaderBlock(text) {
    return `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}</div>`;
}
function ctaButton(href, label) {
    const safeHref = escapeHtml(href);
    const safeLabel = escapeHtml(label);
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td align="left">
    <a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:${PRIMARY};color:${PRIMARY_FG};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${safeLabel}</a>
  </td></tr>
</table>`;
}
/** Single paragraph; escapes `text`. */
export function pPlain(text) {
    return `<p style="margin:0 0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">${escapeHtml(text)}</p>`;
}
function mutedLineEscaped(text) {
    return `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(text)}</p>`;
}
/**
 * Wrap inner HTML (already safe or built from escapeHtml) in branded layout.
 * @param innerHtml - paragraphs, buttons, lists (trusted / escaped fragments only)
 */
export function emailDocument(params) {
    const footer = params.footerLines?.length ?
        params.footerLines.map((l) => mutedLineEscaped(l)).join("")
        : mutedLineEscaped("— Samsara Yoga");
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(params.headline)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
${preheaderBlock(params.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${SURFACE};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 4px 24px rgba(28,25,20,0.06);">
      <tr><td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
        <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${PRIMARY};">Samsara Yoga</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;line-height:1.3;color:${TEXT};">${escapeHtml(params.headline)}</h1>
        ${params.innerHtml}
        ${footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
export { ctaButton };
