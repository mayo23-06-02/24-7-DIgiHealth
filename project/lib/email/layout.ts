/**
 * The one branded layout every 24/7 Digi-Health email uses: a two-tone hero banner, a white
 * body with optional code box, details table, highlights, button and notes, a signature and
 * a legal footer.
 *
 * Email clients ignore <style> blocks and external CSS, and many block SVG and flexbox, so
 * everything is table-based with inline styles and web-safe fonts. Callers pass trusted HTML
 * for paragraphs; anything user-supplied must go through escapeHtml first.
 */

export const BRAND = {
  primary: "#4493b8",
  deep: "#0f4c64",
  accent: "#f47c5a",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  soft: "#f4f7f9",
  page: "#eaf0f3",
};

const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.digi-health.co.za").replace(/\/+$/, "");
}

export interface EmailContent {
  /** Hidden inbox preview text. */
  preheader: string;
  /** Small line above the title in the banner. */
  eyebrow?: string;
  /** Large banner title. */
  title: string;
  /** Symbol shown in the accent block (an emoji or a short glyph). */
  icon?: string;
  /** "Dear Thandi," — already escaped. */
  greeting?: string;
  /** Body paragraphs as trusted HTML. */
  paragraphs: string[];
  /** One-time code, shown large in its own box. */
  code?: string;
  codeLabel?: string;
  /** Label/value pairs shown in a soft box. Values are escaped here. */
  details?: [string, string][];
  /** Ticks and crosses, e.g. what accepting an invite does. Text is trusted HTML. */
  highlights?: { ok: boolean; text: string }[];
  cta?: { label: string; url: string };
  /** Small grey lines under the button, as trusted HTML. */
  notes?: string[];
  /** Defaults to "Kind regards, The 24/7 Digi-Health Team". */
  signoff?: string | false;
}

const p = (html: string) =>
  `<p style="margin:0 0 16px; color:${BRAND.body}; font-size:15px; line-height:1.65;">${html}</p>`;

export function renderEmail(c: EmailContent): string {
  const origin = appOrigin();
  const icon = c.icon ?? "&#10010;"; // heavy Greek cross

  const codeBox = c.code
    ? `
      <tr><td style="padding:8px 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft}; border-radius:12px;">
          <tr><td style="padding:22px 16px 6px; text-align:center; color:${BRAND.body}; font-size:14px;">${escapeHtml(c.codeLabel ?? "Your verification code")}</td></tr>
          <tr><td style="padding:4px 16px 24px; text-align:center; color:${BRAND.ink}; font-family:'Courier New', Consolas, monospace; font-size:36px; font-weight:700; letter-spacing:12px;">${escapeHtml(c.code)}</td></tr>
        </table>
      </td></tr>`
    : "";

  const details = c.details?.length
    ? `
      <tr><td style="padding:8px 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft}; border-radius:12px;">
          ${c.details
            .map(
              ([label, value], i) => `
          <tr>
            <td style="padding:12px 18px; ${i ? `border-top:1px solid ${BRAND.line};` : ""} color:${BRAND.muted}; font-size:13px; width:42%;">${escapeHtml(label)}</td>
            <td style="padding:12px 18px; ${i ? `border-top:1px solid ${BRAND.line};` : ""} color:${BRAND.ink}; font-size:14px; font-weight:600; text-align:right; word-break:break-word;">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>`
    : "";

  const highlights = c.highlights?.length
    ? `
      <tr><td style="padding:8px 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${c.highlights
            .map(
              (h) => `
          <tr>
            <td style="width:28px; padding:6px 0; vertical-align:top;">
              <span style="display:inline-block; width:20px; height:20px; line-height:20px; text-align:center; border-radius:10px; font-size:12px; font-weight:700; color:#ffffff; background:${h.ok ? "#16a34a" : "#dc2626"};">${h.ok ? "&#10003;" : "&#10005;"}</span>
            </td>
            <td style="padding:6px 0; color:${BRAND.body}; font-size:14px; line-height:1.5;">${h.text}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>`
    : "";

  const cta = c.cta
    ? `
      <tr><td style="padding:16px 40px 8px;" align="left">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:999px; background:${BRAND.primary};">
            <a href="${c.cta.url}" style="display:inline-block; padding:14px 32px; font-family:${FONT}; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">${escapeHtml(c.cta.label)}</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 40px 0;">
        <p style="margin:0; color:${BRAND.faint}; font-size:12px; line-height:1.6;">
          If the button does not work, copy and paste this link into your browser:<br />
          <a href="${c.cta.url}" style="color:${BRAND.primary}; word-break:break-all;">${escapeHtml(c.cta.url)}</a>
        </p>
      </td></tr>`
    : "";

  const notes = c.notes?.length
    ? `<tr><td style="padding:20px 40px 0;">${c.notes
        .map((n) => `<p style="margin:0 0 10px; color:${BRAND.muted}; font-size:13px; line-height:1.6;">${n}</p>`)
        .join("")}</td></tr>`
    : "";

  const signoff =
    c.signoff === false
      ? ""
      : `<tr><td style="padding:20px 40px 0;">${p(c.signoff ?? "Kind regards,<br />The 24/7 Digi-Health Team")}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(c.title)}</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.page}; font-family:${FONT}; -webkit-font-smoothing:antialiased;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page}; padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden;">

        <!-- Banner -->
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:${BRAND.deep}; background-image:linear-gradient(135deg, ${BRAND.deep} 0%, ${BRAND.primary} 100%); padding:30px 32px 34px; vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:26px; height:26px; background:#ffffff; border-radius:7px; text-align:center; vertical-align:middle; color:${BRAND.primary}; font-size:16px; font-weight:700; line-height:26px;">&#10010;</td>
                <td style="padding-left:9px; color:#ffffff; font-size:15px; font-weight:700; letter-spacing:0.2px;">24/7 Digi-Health</td>
              </tr></table>
              ${c.eyebrow ? `<p style="margin:26px 0 6px; color:rgba(255,255,255,0.78); font-size:12px; font-weight:600; letter-spacing:1.4px; text-transform:uppercase;">${escapeHtml(c.eyebrow)}</p>` : `<div style="height:26px; line-height:26px;">&nbsp;</div>`}
              <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.2; font-weight:700; letter-spacing:-0.4px;">${escapeHtml(c.title)}</h1>
            </td>
            <td style="width:132px; background:${BRAND.accent}; text-align:center; vertical-align:middle; color:#ffffff; font-size:58px; line-height:1;">${icon}</td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:34px 40px 4px;">
          ${c.greeting ? p(`<strong style="color:${BRAND.ink};">${c.greeting}</strong>`) : ""}
          ${c.paragraphs.map(p).join("")}
        </td></tr>
        ${codeBox}
        ${details}
        ${highlights}
        ${cta}
        ${notes}
        ${signoff}

        <!-- Footer -->
        <tr><td style="padding:28px 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${BRAND.line}; font-size:0; line-height:0;">&nbsp;</td></tr></table>
          <p style="margin:22px 0 8px; text-align:center; font-size:12px;">
            <a href="${origin}" style="color:${BRAND.primary}; text-decoration:none; font-weight:600;">digi-health.co.za</a>
            <span style="color:${BRAND.line};">&nbsp;|&nbsp;</span>
            <a href="${origin}/terms" style="color:${BRAND.muted}; text-decoration:underline;">Terms of Service</a>
            <span style="color:${BRAND.line};">&nbsp;|&nbsp;</span>
            <a href="${origin}/contact" style="color:${BRAND.muted}; text-decoration:underline;">Contact us</a>
          </p>
          <p style="margin:0 0 4px; text-align:center; color:${BRAND.faint}; font-size:11px; line-height:1.6;">
            24/7 Digi-Health &middot; Quality care, wherever you are.
          </p>
          <p style="margin:0 0 4px; text-align:center; color:${BRAND.faint}; font-size:11px; line-height:1.6;">
            Digital Vantage Solutions (Pty) Ltd, trading as 24/7 DigiMedCare &middot; South Africa &middot;
            <a href="mailto:info@digi-health.co.za" style="color:${BRAND.faint};">info@digi-health.co.za</a>
          </p>
          <p style="margin:0; text-align:center; color:${BRAND.faint}; font-size:11px;">This is an automated message. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
