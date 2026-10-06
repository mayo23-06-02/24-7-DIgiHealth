/**
 * Articles are written as plain text with three simple rules and stored as HTML for the
 * Health Blog, which renders it directly. Everything is escaped, so no markup typed by an
 * editor reaches readers' browsers.
 *
 *   ## Heading        -> <h3>
 *   - item            -> bulleted list
 *   blank line        -> new paragraph
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** **bold** inside a line, after escaping. */
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export function articleTextToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const out: string[] = [];
  for (const raw of blocks) {
    const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) out.push(`<p>${para.map(inline).join("<br />")}</p>`);
      para = [];
    };
    const flushList = () => {
      if (list.length) out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      list = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (/^#{2,3}\s+/.test(t)) {
        flushPara();
        flushList();
        out.push(`<h3>${inline(t.replace(/^#{2,3}\s+/, ""))}</h3>`);
      } else if (/^[-*]\s+/.test(t)) {
        flushPara();
        list.push(t.replace(/^[-*]\s+/, ""));
      } else {
        flushList();
        para.push(t);
      }
    }
    flushPara();
    flushList();
  }
  return out.join("\n");
}

const unesc = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** Back to editable text. Exact for articles written here; best effort for older HTML. */
export function articleHtmlToText(html: string): string {
  return unesc(
    String(html || "")
      .replace(/\r\n/g, "\n")
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, t) => `\n\n## ${t.trim()}\n\n`)
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `\n- ${t.trim()}`)
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<(strong|b)>([\s\S]*?)<\/(strong|b)>/gi, "**$2**")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
