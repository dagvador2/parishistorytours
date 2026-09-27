/**
 * Shared shell for every transactional email the site sends.
 *
 * Three constraints shape everything here, and none of them are negotiable:
 *
 * 1. Tables, not divs. Outlook's word-processor renderer ignores `max-width`
 *    on a block element, so a `<div style="max-width:600px">` — what this
 *    codebase used to send — spreads across the whole window.
 * 2. Inline styles only. Gmail strips `<style>` blocks from the body, and
 *    classes with it.
 * 3. Light scheme, declared. The palette is ink-on-paper; letting Apple Mail
 *    and Gmail iOS auto-invert it turns the burgundy rules muddy and the
 *    paper blocks near-black. `color-scheme: light` opts out where it is
 *    honoured, and the dark-mode block below re-asserts the grounds where it
 *    is not.
 *
 * Every builder returns one or more `<tr>` rows of the 560px card, so a
 * template is a list of rows passed to `shell()`.
 */

/** Quiet palette, mirrored from src/styles/global.css. */
export const C = {
  paper: '#f0efea',
  card: '#ffffff',
  line: '#e4e0d6',
  lineSoft: '#eae5d9',
  hair: '#f2efe7',
  ink: '#1a1a1a',
  ink2: '#4a4a4a',
  muted: '#6f6a60',
  faint: '#8a857a',
  rouge: '#8a3b2e',
  gold: '#7d6e42',
  goldBg: '#f7f2e4',
  goldLine: '#e0d5b4',
  teal: '#3a4a48',
  tealBg: '#f1f4f3',
  tealLine: '#d3dedb',
  ticket: '#faf8f3',
  outline: '#cfc9bb',
} as const;

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',serif";

export const SITE = 'https://www.parishistorytours.com';
export const SUPPORT_EMAIL = 'clement@parishistorytours.com';
export const PHONE_DISPLAY = '+33 6 20 62 24 80';
export const AVATAR_URL = `${SITE}/photos/email/guide-avatar.jpg`;

/**
 * HTML-escapes anything that reaches a template from outside the codebase.
 * Customer names and free-text messages are interpolated straight into the
 * markup; without this an apostrophe or a stray `<` breaks the layout, and a
 * crafted name would inject markup into the copy that lands in your inbox.
 */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wraps the card rows in the full document. */
export function shell(opts: { preheader: string; rows: string; ground?: string }): string {
  const ground = opts.ground ?? C.paper;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  @media (prefers-color-scheme: dark) {
    .pht-ground { background: ${ground} !important; }
    .pht-card { background: ${C.card} !important; }
  }
  @media only screen and (max-width: 420px) {
    .pht-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .pht-btn { display: block !important; text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${ground};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(opts.preheader)}</div>
<table role="presentation" class="pht-ground" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ground}">
<tr><td align="center" style="padding:26px 10px 34px">
<table role="presentation" class="pht-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line}">
${opts.rows}
</table>
</td></tr></table>
</body></html>`;
}

/** Wordmark, burgundy rule, and the small uppercase line naming the tour. */
export function masthead(eyebrow: string): string {
  return `<tr><td class="pht-pad" style="padding:26px 30px 0">
  <div style="font-family:${SERIF};font-size:20px;color:${C.ink}">Paris History Tours</div>
  <div style="height:2px;width:34px;background:${C.rouge};font-size:0;line-height:0;margin-top:10px">&nbsp;</div>
</td></tr>
<tr><td class="pht-pad" style="padding:12px 30px 0;font-family:${SANS};font-size:10.5px;font-weight:bold;letter-spacing:1.6px;color:${C.rouge}">${esc(eyebrow).toUpperCase()}</td></tr>`;
}

export function heading(text: string): string {
  return `<tr><td class="pht-pad" style="padding:14px 30px 0;font-family:${SERIF};font-size:27px;line-height:1.2;color:${C.ink}">${esc(text)}</td></tr>`;
}

/** `html` is trusted: callers escape their own interpolations. */
export function paragraph(html: string, topPad = 12): string {
  return `<tr><td class="pht-pad" style="padding:${topPad}px 30px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink2}">${html}</td></tr>`;
}

export function sectionTitle(text: string, topPad = 26): string {
  return `<tr><td class="pht-pad" style="padding:${topPad}px 30px 0;font-family:${SERIF};font-size:18px;color:${C.ink}">${esc(text)}</td></tr>`;
}

export interface TicketRow {
  label: string;
  value: string;
}

/**
 * The block the customer screenshots: date in words, the hour large, then the
 * facts. `status` prints a chip on the date line — used by the private-tour
 * request, where nothing is confirmed yet.
 */
export function ticket(opts: {
  dateLine: string;
  time: string;
  timeNote: string;
  rows: TicketRow[];
  accent?: string;
  status?: string;
}): string {
  const accent = opts.accent ?? C.rouge;
  const head = opts.status
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${SANS};font-size:10.5px;font-weight:bold;letter-spacing:1.4px;color:${C.gold}">${esc(opts.dateLine).toUpperCase()}</td>
        <td align="right"><span style="display:inline-block;background:#f0e6ce;color:#6f5a2e;font-family:${SANS};font-size:10px;font-weight:bold;letter-spacing:.9px;padding:4px 8px">${esc(opts.status).toUpperCase()}</span></td>
      </tr></table>`
    : `<div style="font-family:${SANS};font-size:10.5px;font-weight:bold;letter-spacing:1.4px;color:${C.gold}">${esc(opts.dateLine).toUpperCase()}</div>`;

  const rows = opts.rows
    .map(
      (r, i) => `<tr>
      <td style="padding:${i === 0 ? 11 : 7}px 0 0;font-family:${SANS};font-size:11px;letter-spacing:.9px;color:${C.faint};width:38%">${esc(r.label).toUpperCase()}</td>
      <td style="padding:${i === 0 ? 11 : 7}px 0 0;font-family:${SANS};font-size:14.5px;color:${C.ink};text-align:right">${r.value}</td>
    </tr>`,
    )
    .join('');

  return `<tr><td class="pht-pad" style="padding:22px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ticket};border:1px solid ${C.lineSoft};border-left:3px solid ${accent}">
    <tr><td style="padding:20px 22px 18px">
      ${head}
      <div style="font-family:${SERIF};font-size:34px;line-height:1.15;color:${C.ink};padding-top:${opts.status ? 6 : 4}px">${esc(opts.time)}</div>
      <div style="font-family:${SANS};font-size:13px;color:${C.muted};padding-top:3px">${esc(opts.timeNote)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid ${C.lineSoft}">${rows}</table>
    </td></tr>
  </table>
</td></tr>`;
}

/** Money strip under the ticket: gold when something is owed, teal when settled. */
export function notice(opts: { label: string; value: string; tone: 'gold' | 'teal' }): string {
  const bg = opts.tone === 'gold' ? C.goldBg : C.tealBg;
  const border = opts.tone === 'gold' ? C.goldLine : C.tealLine;
  const fg = opts.tone === 'gold' ? C.gold : C.teal;
  return `<tr><td class="pht-pad" style="padding:12px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:1px solid ${border}">
    <tr><td style="padding:14px 18px;font-family:${SANS}">
      <div style="font-size:11px;font-weight:bold;letter-spacing:1.2px;color:${fg}">${esc(opts.label).toUpperCase()}</div>
      <div style="font-size:19px;color:${C.ink};padding-top:4px">${opts.value}</div>
    </td></tr>
  </table>
</td></tr>`;
}

export function button(opts: {
  href: string;
  label: string;
  variant?: 'solid' | 'outline';
  note?: string;
  topPad?: number;
}): string {
  const solid = (opts.variant ?? 'solid') === 'solid';
  const style = solid
    ? `background:${C.rouge};color:#ffffff;border:1px solid ${C.rouge}`
    : `background:${C.card};color:${C.ink};border:1px solid ${C.outline}`;
  const note = opts.note
    ? `<div style="font-family:${SANS};font-size:11.5px;color:${C.faint};padding-top:7px">${esc(opts.note)}</div>`
    : '';
  return `<tr><td class="pht-pad" align="center" style="padding:${opts.topPad ?? 18}px 30px 0">
  <a class="pht-btn" href="${esc(opts.href)}" style="display:inline-block;font-family:${SANS};font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;${style}">${esc(opts.label)}</a>
  ${note}
</td></tr>`;
}

/**
 * Numbered sequence. Numbering earns its place here: these really are steps in
 * time, and the customer reads them to know what lands when.
 */
export function steps(items: Array<{ lead: string; rest: string }>): string {
  const rows = items
    .map(
      (s, i) => `<tr>
      <td valign="top" style="width:26px;font-family:${SERIF};font-size:15px;color:${C.rouge};padding-bottom:${i === items.length - 1 ? 0 : 12}px">${i + 1}</td>
      <td style="font-family:${SANS};font-size:14.5px;line-height:1.55;color:${C.ink2};padding-bottom:${i === items.length - 1 ? 0 : 12}px"><strong style="color:${C.ink}">${esc(s.lead)}</strong> ${esc(s.rest)}</td>
    </tr>`,
    )
    .join('');
  return `<tr><td class="pht-pad" style="padding:12px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>`;
}

export function bullets(items: string[]): string {
  const rows = items
    .map(
      (b, i) =>
        `<tr><td style="padding-bottom:${i === items.length - 1 ? 0 : 7}px;font-family:${SANS};font-size:14.5px;line-height:1.55;color:${C.ink2}">${esc(b)}</td></tr>`,
    )
    .join('');
  return `<tr><td class="pht-pad" style="padding:10px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>`;
}

/** Label/value table with hairline rules — the practical reminders. */
export function factTable(rows: TicketRow[], topPad = 22): string {
  const body = rows
    .map(
      (r, i) => `<tr>
      <td style="padding:11px 0;font-family:${SANS};font-size:11px;letter-spacing:.9px;color:${C.faint};width:34%;${i === rows.length - 1 ? '' : `border-bottom:1px solid ${C.hair}`}">${esc(r.label).toUpperCase()}</td>
      <td style="padding:11px 0;font-family:${SANS};font-size:14.5px;color:${C.ink};text-align:right;${i === rows.length - 1 ? '' : `border-bottom:1px solid ${C.hair}`}">${r.value}</td>
    </tr>`,
    )
    .join('');
  return `<tr><td class="pht-pad" style="padding:${topPad}px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.lineSoft}">${body}</table>
</td></tr>`;
}

/** Portrait plus a line in the first person — the reassurance a booking needs. */
export function guideCard(opts: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
  rule?: boolean;
  topPad?: number;
}): string {
  const cta = opts.cta
    ? `<div style="padding-top:12px"><a class="pht-btn" href="${esc(opts.cta.href)}" style="display:inline-block;background:${C.rouge};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:bold;text-decoration:none;padding:11px 20px">${esc(opts.cta.label)}</a></div>`
    : '';
  return `<tr><td class="pht-pad" style="padding:${opts.topPad ?? 26}px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${opts.rule === false ? '' : ` style="border-top:1px solid ${C.lineSoft}"`}>
    <tr>
      <td valign="top" style="width:64px;padding:${opts.rule === false ? 0 : 20}px 14px 0 0">
        <img src="${AVATAR_URL}" width="56" height="56" alt="Clément" style="display:block;width:56px;height:56px;border-radius:28px;border:1px solid ${C.line}">
      </td>
      <td valign="top" style="padding-top:${opts.rule === false ? 0 : 20}px;font-family:${SANS}">
        <div style="font-size:15px;color:${C.ink}">${opts.title}</div>
        <div style="font-size:13.5px;line-height:1.55;color:${C.muted};padding-top:3px">${esc(opts.body)}</div>
        ${cta}
      </td>
    </tr>
  </table>
</td></tr>`;
}

export function footer(lines: string[]): string {
  return `<tr><td class="pht-pad" style="padding:26px 30px 28px">
  <div style="border-top:1px solid ${C.lineSoft};padding-top:14px;font-family:${SANS};font-size:11.5px;line-height:1.7;color:${C.faint}">${lines.map(esc).join('<br>')}</div>
</td></tr>`;
}
