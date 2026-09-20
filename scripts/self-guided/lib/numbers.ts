/**
 * Display-text normaliser: the narration scripts spell every number out for
 * the TTS ("nineteen forty-four", "mille neuf cent quarante-quatre"). Subtitles
 * read better with digits. This module rewrites the *displayed* text only; the
 * spoken text (and therefore the timestamps) is untouched.
 *
 * Rules (both languages):
 *  - years, dates ("the twenty-fifth of August" -> "25 August", "le premier
 *    septembre" -> "le 1er septembre"), clock times and percentages are
 *    always converted
 *  - other cardinals are converted from 10 upwards; "stop one" / "arrêt un"
 *    always
 *  - ordinals are converted from 10 upwards or before Division / Infantry /
 *    arrondissement / day / jour / siècle ("Second World War" stays)
 *  - "one million men" / "trois heures" stay in words
 *
 * Every rewrite is also returned so a human can review them.
 */
import type { Lang } from "./sections.ts";

export interface Rewrite {
  from: string;
  to: string;
}

interface Tok {
  raw: string; // original token incl. punctuation
  lead: string; // leading punctuation
  core: string; // lower-cased word without surrounding punctuation
  trail: string; // trailing punctuation
  ws: string; // whitespace following the token
}

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  const re = /(\S+)(\s*)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[1]!;
    const lead = raw.match(/^[^\p{L}\p{N}]*/u)![0];
    const trail = raw.match(/[^\p{L}\p{N}]*$/u)![0];
    const core = raw.slice(lead.length, raw.length - trail.length).toLowerCase().replace(/[\u2019\u2018]/g, "'");
    toks.push({ raw, lead, core, trail, ws: m[2]! });
  }
  return toks;
}

// EN lexicon
const EN_UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const EN_TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const EN_ORD: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60,
  seventieth: 70, eightieth: 80, ninetieth: 90,
};
const EN_SCALE: Record<string, number> = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9 };
const EN_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const EN_ORD_NOUNS = /^(division|infantry|armoured|armored|arrondissement|day|century|floor|republic)$/;

// FR lexicon
const FR_UNITS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const FR_TENS: Record<string, number> = { vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
const FR_SCALE: Record<string, number> = { cent: 100, cents: 100, mille: 1e3, million: 1e6, millions: 1e6, milliard: 1e9, milliards: 1e9 };
const FR_MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const FR_ORD_NOUNS = /^(division|arrondissement|jour|siècle|république|étage)$/;

/** Value of a possibly hyphenated small number ("forty-four", "quatre-vingt-dix-neuf"). */
function smallNumber(core: string, lang: Lang): number | undefined {
  const parts = core.split("-").filter((p) => p !== "et" && p !== "and");
  if (lang === "en") {
    if (parts.length === 1) return EN_UNITS[core] ?? EN_TENS[core];
    if (parts.length === 2 && EN_TENS[parts[0]!] !== undefined && EN_UNITS[parts[1]!] !== undefined && EN_UNITS[parts[1]!]! < 10) {
      return EN_TENS[parts[0]!]! + EN_UNITS[parts[1]!]!;
    }
    return undefined;
  }
  // French: quatre-vingt(s) = 80 prefix, then sum of the rest (dix-sept, soixante-dix, vingt-et-un ...)
  let total = 0;
  let i = 0;
  if (parts[0] === "quatre" && (parts[1] === "vingt" || parts[1] === "vingts")) {
    total = 80;
    i = 2;
    if (i === parts.length) return 80;
  }
  let prev = Infinity;
  for (; i < parts.length; i++) {
    const v = FR_UNITS[parts[i]!] ?? FR_TENS[parts[i]!];
    if (v === undefined) return undefined;
    // parts must be decreasing except the "dix" after a tens word (soixante-dix, quatre-vingt-dix)
    if (v >= prev && !(prev >= 20 && v <= 19)) return undefined;
    total += v;
    prev = v;
  }
  return total > 0 ? total : undefined;
}

/** Ordinal token -> value ("twenty-fifth" -> 25, "dix-huitième" -> 18, "premier" -> 1). */
function ordinal(core: string, lang: Lang): number | undefined {
  if (lang === "en") {
    if (EN_ORD[core] !== undefined) return EN_ORD[core];
    const parts = core.split("-");
    if (parts.length === 2 && EN_TENS[parts[0]!] !== undefined && EN_ORD[parts[1]!] !== undefined && EN_ORD[parts[1]!]! < 10) {
      return EN_TENS[parts[0]!]! + EN_ORD[parts[1]!]!;
    }
    return undefined;
  }
  if (core === "premier" || core === "première") return 1;
  if (!core.endsWith("ième")) return undefined;
  const base = core.slice(0, -4);
  for (const cand of [base, base + "e", base.slice(0, -1), base === "neuv" ? "neuf" : "", base === "cinqu" ? "cinq" : ""]) {
    if (!cand) continue;
    const v = smallNumber(cand, lang) ?? (cand === "mille" ? 1000 : cand === "cent" ? 100 : undefined);
    if (v !== undefined) return v;
  }
  return undefined;
}

interface NumberRun {
  /** number of tokens consumed */
  count: number;
  value: number;
  /** trailing display scale kept in words (million/billion) */
  scaleWord?: string;
  /** mantissa before the scale word, for the >= 10 rule */
  mantissa: number;
  isOrdinal: boolean;
  hasDecimal: boolean;
  isYearForm: boolean;
}

/** Parse a run of number words starting at toks[i]. */
function parseRun(toks: Tok[], i: number, lang: Lang): NumberRun | undefined {
  const units = lang === "en" ? EN_UNITS : FR_UNITS;
  const scales = lang === "en" ? EN_SCALE : FR_SCALE;
  const isStarter = (c: string) =>
    smallNumber(c, lang) !== undefined ||
    ordinal(c, lang) !== undefined ||
    (lang === "fr" && (c === "cent" || c === "mille")) ||
    (lang === "en" && c === "a" && toks[i + 1] && EN_SCALE[toks[i + 1]!.core] !== undefined);
  if (!toks[i] || !isStarter(toks[i]!.core)) return undefined;
  // a bare "un/une" is an article unless followed by a scale word
  if (lang === "fr" && (toks[i]!.core === "un" || toks[i]!.core === "une") && !(toks[i + 1] && FR_SCALE[toks[i + 1]!.core] !== undefined)) return undefined;

  let total = 0;
  let current = 0;
  let count = 0;
  let scaleWord: string | undefined;
  let mantissa = 0;
  let isOrdinal = false;
  let hasDecimal = false;
  let isYearForm = false;
  let decimalDigits = "";
  let inDecimal = false;
  let lastWasNumber = false;

  for (let j = i; j < toks.length; j++) {
    const t = toks[j]!;
    const c = t.core;
    // a token carrying terminal punctuation ends the run after itself
    const endsHere = /[.!?;:,]$/.test(t.trail) || /[»”"]$/.test(t.trail);
    const small = smallNumber(c, lang);
    const ord = ordinal(c, lang);

    if (inDecimal) {
      if (small !== undefined && small < 10) {
        decimalDigits += String(small);
        count++;
        lastWasNumber = true;
        if (endsHere) break;
        continue;
      }
      inDecimal = false;
    }

    if ((c === "point" && lang === "en") || (c === "virgule" && lang === "fr")) {
      if (!lastWasNumber) break;
      const next = toks[j + 1];
      if (!next || smallNumber(next.core, lang) === undefined) break;
      inDecimal = true;
      hasDecimal = true;
      count++;
      continue;
    }
    if (c === "and" || c === "et") {
      // connector only if a number word follows and we are inside a run
      const next = toks[j + 1];
      if (!lastWasNumber || !next || (smallNumber(next.core, lang) === undefined && ordinal(next.core, lang) === undefined)) break;
      count++;
      lastWasNumber = false;
      continue;
    }
    if (lang === "en" && c === "a" && j === i) {
      current = 1;
      count++;
      lastWasNumber = true;
      continue;
    }
    if (ord !== undefined) {
      // ordinal closes the run: "one thousand five hundred and eighteenth"
      current += ord;
      isOrdinal = true;
      count++;
      break;
    }
    if (small !== undefined) {
      // English year form: "nineteen forty-four", "eighteen seventy-one"
      if (lang === "en" && lastWasNumber && current >= 13 && current <= 20 && total === 0 && count === 1 && small >= 1 && small <= 99 && !(EN_UNITS[c] !== undefined && small < 10 && false)) {
        const next = toks[j + 1];
        const nextIsScale = next && scales[next.core] !== undefined && !/[.!?]$/.test(t.trail);
        if (!nextIsScale || next!.core === "hundred") {
          // "nineteen forty-four" (year) but not "eighteen thousand"
          current = current * 100 + small;
          isYearForm = true;
          count++;
          lastWasNumber = true;
          if (endsHere) break;
          // a year form is complete; stop unless an ordinal follows (rare)
          break;
        }
      }
      if (lastWasNumber && !isYearForm) {
        // two plain numbers in a row without connector: stop before the second ("two two")
        const prevCore = toks[j - 1]!.core;
        if (smallNumber(prevCore, lang) !== undefined && !(lang === "fr" && (prevCore === "cent" || prevCore === "mille")) && scales[prevCore] === undefined) break;
      }
      current += small;
      count++;
      lastWasNumber = true;
      if (endsHere) break;
      continue;
    }
    const scale = scales[c];
    if (scale !== undefined) {
      if (scale === 100) {
        current = (current || 1) * 100;
      } else if (scale === 1000) {
        total += (current || 1) * 1000;
        current = 0;
      } else {
        // million / billion: keep the word, remember the mantissa
        const m = total + current;
        mantissa = m || 1;
        total = (m || 1) * scale;
        current = 0;
        scaleWord = t.raw.slice(t.lead.length, t.raw.length - t.trail.length);
      }
      count++;
      lastWasNumber = true;
      if (endsHere) break;
      continue;
    }
    break;
  }
  if (count === 0) return undefined;
  // the run must end on a number-ish token (drop a dangling "and"/"a")
  while (count > 0) {
    const last = toks[i + count - 1]!.core;
    if (last === "and" || last === "et" || (lang === "en" && last === "a") || last === "point" || last === "virgule") count--;
    else break;
  }
  if (count === 0) return undefined;
  let value = total + current;
  if (hasDecimal && decimalDigits) {
    const frac = Number(`0.${decimalDigits}`);
    if (scaleWord) {
      const scale = scales[scaleWord.toLowerCase()]!;
      value = (mantissa + frac) * scale;
      mantissa = mantissa + frac;
    } else value += frac;
  }
  // "deux millions huit cent mille" -> 2.8 millions: the mantissa is whatever sits above the kept scale word
  if (scaleWord) mantissa = Math.round((value / scales[scaleWord.toLowerCase()]!) * 1000) / 1000;
  else mantissa = value;
  // "hundred" alone ("a few hundred metres") is not a number
  if (count === 1 && scales[toks[i]!.core] !== undefined && toks[i]!.core !== "cent" && toks[i]!.core !== "mille") return undefined;
  return { count, value, scaleWord, mantissa, isOrdinal, hasDecimal, isYearForm };
}

// Formatting

const NBSP = "\u00A0";

function fmtInt(n: number, lang: Lang, opts: { year?: boolean } = {}): string {
  if (opts.year || (n >= 1000 && n <= 2099 && Number.isInteger(n))) return String(n);
  if (!Number.isInteger(n)) return lang === "en" ? String(n) : String(n).replace(".", ",");
  const s = String(n);
  const sep = lang === "en" ? "," : NBSP;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function fmtOrdinal(n: number, lang: Lang, feminine = false): string {
  if (lang === "fr") return n === 1 ? (feminine ? "1re" : "1er") : `${fmtInt(n, lang).replace(/^(\d)(\d{3})$/, `$1${NBSP}$2`)}e`;
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${fmtInt(n, lang).replace(/^(\d)(\d{3})$/, "$1,$2")}${suffix}`;
}

function fmtRun(run: NumberRun, lang: Lang): string {
  if (run.scaleWord) {
    const m = run.mantissa;
    const mant = Number.isInteger(m) ? String(m) : lang === "en" ? String(m) : String(m).replace(".", ",");
    return `${mant} ${run.scaleWord}`;
  }
  // FR: 2 800 000 -> "2,8 millions"
  if (lang === "fr" && run.value >= 1e6 && run.value % 1e5 === 0 && !run.isOrdinal) {
    const m = run.value / 1e6;
    return `${String(m).replace(".", ",")} ${m > 1 ? "millions" : "million"}`;
  }
  return fmtInt(run.value, lang, { year: run.isYearForm });
}

// Main pass

const EN_TIME_TAIL = /^(in|a\.m\.|p\.m\.|am|pm|o'clock)$/;

export function toDisplayText(spoken: string, lang: Lang): { text: string; rewrites: Rewrite[] } {
  const toks = tokenize(spoken);
  const out: string[] = [];
  const rewrites: Rewrite[] = [];
  let i = 0;

  const emit = (from: number, to: number, replacement: string) => {
    const first = toks[from]!;
    const last = toks[to - 1]!;
    const original = toks.slice(from, to).map((t, k) => t.raw + (k < to - from - 1 ? t.ws : "")).join("");
    out.push(first.lead + replacement + last.trail + last.ws);
    rewrites.push({ from: original, to: first.lead + replacement + last.trail });
  };

  while (i < toks.length) {
    const t = toks[i]!;
    const c = t.core;

    // EN dates: "the <ordinal> of <Month>" -> "<n> <Month>"
    if (lang === "en" && c === "the" && toks[i + 1] && toks[i + 2]?.core === "of" && toks[i + 3] && EN_MONTHS.includes(toks[i + 3]!.core)) {
      const ord = ordinal(toks[i + 1]!.core, lang);
      if (ord !== undefined && !toks[i + 1]!.trail && !toks[i + 2]!.trail) {
        const month = toks[i + 3]!;
        emit(i, i + 4, `${ord} ${month.raw.slice(month.lead.length, month.raw.length - month.trail.length)}`);
        i += 4;
        continue;
      }
    }
    // EN clock times: "three-thirty in the afternoon", "nine twenty-two in the evening"
    if (lang === "en") {
      const hm = c.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)-(thirty|fifteen|forty-five|twenty|forty|fifty|ten)$/);
      const hour = EN_UNITS[c];
      let hh: number | undefined;
      let mm: number | undefined;
      let used = 0;
      if (hm) {
        hh = EN_UNITS[hm[1]!];
        mm = smallNumber(hm[2]!, lang);
        used = 1;
      } else if (hour !== undefined && hour <= 12 && toks[i + 1] && !t.trail) {
        const m2 = smallNumber(toks[i + 1]!.core, lang);
        if (m2 !== undefined && m2 >= 10 && m2 <= 59 && toks[i + 2]?.core === "in" && toks[i + 3]?.core === "the" && /^(morning|afternoon|evening)$/.test(toks[i + 4]?.core ?? "")) {
          hh = hour;
          mm = m2;
          used = 2;
        }
      }
      const prevCore = toks[i - 1]?.core ?? "";
      const timeContext = (toks[i + used] && EN_TIME_TAIL.test(toks[i + used]!.core)) || (hm && /^(at|around|about|by|until|before|after)$/.test(prevCore));
      if (hh !== undefined && mm !== undefined && timeContext) {
        emit(i, i + used, `${hh}:${String(mm).padStart(2, "0")}`);
        i += used;
        continue;
      }
    }
    // FR dates: "le|du|au <premier|cardinal> <mois>"
    if (lang === "fr" && /^(le|du|au)$/.test(c) && toks[i + 1] && toks[i + 2] && FR_MONTHS.includes(toks[i + 2]!.core) && !toks[i + 1]!.trail) {
      const dayTok = toks[i + 1]!.core;
      const day = dayTok === "premier" ? 1 : smallNumber(dayTok, lang);
      if (day !== undefined && day >= 1 && day <= 31) {
        out.push(t.raw + t.ws);
        emit(i + 1, i + 2, day === 1 ? "1er" : String(day));
        i += 2;
        continue;
      }
    }
    // FR clock times: "quinze heures trente", "dix-sept heures", "six heures du matin", "à neuf heures"
    if (lang === "fr" && toks[i + 1] && /^heures?$/.test(toks[i + 1]!.core) && !t.trail) {
      const h = smallNumber(c, lang);
      if (h !== undefined && h <= 24) {
        const hTok = toks[i + 1]!;
        const minutes = !hTok.trail && toks[i + 2] ? smallNumber(toks[i + 2]!.core, lang) : undefined;
        const hasMinutes = minutes !== undefined && minutes <= 59;
        const tail = toks[i + 2]?.core ?? "";
        const tail2 = toks[i + 3]?.core ?? "";
        const partOfDay = !hTok.trail && ((tail === "du" && /^(matin|soir)$/.test(tail2)) || (tail === "de" && tail2 === "l'après-midi"));
        const prev = toks[i - 1]?.core ?? "";
        const clockContext = h >= 13 || hasMinutes || partOfDay || /^(à|vers)$/.test(prev);
        if (clockContext) {
          const repl = hasMinutes ? `${h}${NBSP}h${NBSP}${String(minutes).padStart(2, "0")}` : `${h}${NBSP}h`;
          emit(i, i + (hasMinutes ? 3 : 2), repl);
          i += hasMinutes ? 3 : 2;
          continue;
        }
      }
    }
    // "stop one" / "arrêt un"
    if ((lang === "en" && c === "stop") || (lang === "fr" && /^(?:[ld]')?arrêt$/.test(c))) {
      const n = toks[i + 1] ? smallNumber(toks[i + 1]!.core, lang) : undefined;
      if (n !== undefined && n <= 9 && !t.trail) {
        out.push(t.raw + t.ws);
        emit(i + 1, i + 2, String(n));
        i += 2;
        continue;
      }
    }

    const run = parseRun(toks, i, lang);
    if (run) {
      const next = toks[i + run.count];
      const nextCore = next?.core ?? "";
      const isPercent = (lang === "en" && /^(percent|per)$/.test(nextCore)) || (lang === "fr" && nextCore === "pour" && toks[i + run.count + 1]?.core === "cent");
      let convert = false;
      let replacement = "";
      if (run.isOrdinal) {
        const feminine = toks[i + run.count - 1]!.core === "première";
        const nounNext = lang === "en" ? EN_ORD_NOUNS.test(nextCore) : FR_ORD_NOUNS.test(nextCore);
        convert = run.value >= 10 || nounNext;
        // "Première Guerre mondiale", "Second World War", "first stop" stay
        if (convert) replacement = fmtOrdinal(run.value, lang, feminine);
      } else if (isPercent) {
        convert = true;
        const n = fmtInt(run.value, lang);
        if (lang === "en") {
          const consumed = nextCore === "per" && toks[i + run.count + 1]?.core === "cent" ? 2 : 1;
          const lastTok = toks[i + run.count + consumed - 1]!;
          emit(i, i + run.count + consumed, `${n}%`);
          void lastTok;
          i += run.count + consumed;
          continue;
        }
        emit(i, i + run.count + 2, `${n}${NBSP}%`);
        i += run.count + 2;
        continue;
      } else {
        convert = run.hasDecimal || run.isYearForm || run.mantissa >= 10 || !Number.isInteger(run.mantissa);
        if (convert) replacement = fmtRun(run, lang);
      }
      if (convert) {
        // "deux millions huit cent mille Parisiens" is correct French, but its
        // digit form is not: collapsing the tail into a scale word makes "de"
        // mandatory ("2,8 millions DE Parisiens"). Add it, elided before a
        // vowel, when a bare noun follows.
        let extra = 0;
        if (lang === "fr" && /(?:millions?|milliards?)$/.test(replacement)) {
          const lastTok = toks[i + run.count - 1]!;
          const next = toks[i + run.count];
          if (!lastTok.trail && next && /^\p{L}/u.test(next.core) && !/^(de|d'|des|du|et)$/.test(next.core)) {
            if (/^(?:[aeiouyàâéèêëîïôöûü]|h[aeiouyàâéèêëîïôöûü])/i.test(next.core)) {
              replacement = `${replacement} d'${next.raw.slice(next.lead.length, next.raw.length - next.trail.length)}`;
              extra = 1;
            } else {
              replacement = `${replacement} de`;
            }
          }
        }
        emit(i, i + run.count + extra, replacement);
        i += run.count + extra;
        continue;
      }
    }
    out.push(t.raw + t.ws);
    i++;
  }
  return { text: out.join("").trimEnd(), rewrites };
}
