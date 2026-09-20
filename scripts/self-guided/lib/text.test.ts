import { test } from "node:test";
import assert from "node:assert/strict";
import { groupParagraphs, splitLongSentence, splitParagraphs, splitSentences } from "./text.ts";
import { toDisplayText } from "./numbers.ts";
import { firstLetterIndex, letterOffsetAt, timeAtLetterOffset, wordLetterOffsets } from "./align.ts";

test("splitParagraphs: blank-line blocks, whitespace collapsed", () => {
  assert.deepEqual(splitParagraphs("A b.\n\n\nC d.\r\n\r\nE"), ["A b.", "C d.", "E"]);
});

test("splitSentences: terminal punctuation + quotes, EN and FR", () => {
  const en = splitSentences('She wrote: "It\'s as if we were rats in a trap." She had decided. What to do about it? Go on... Yes.');
  assert.deepEqual(
    en.map((s) => s.text),
    ['She wrote: "It\'s as if we were rats in a trap."', "She had decided.", "What to do about it?", "Go on...", "Yes."],
  );
  const fr = splitSentences("Ils disaient : « On ne va pas entrer en guerre pour ça. La paix compte plus. » Puis rien. Et l'Odéon ? Voilà.");
  assert.deepEqual(
    fr.map((s) => s.text),
    ["Ils disaient : « On ne va pas entrer en guerre pour ça.", "La paix compte plus. »", "Puis rien.", "Et l'Odéon ?", "Voilà."],
  );
  // offsets point into the paragraph
  for (const s of en) assert.ok(en[0]!.text && 'She wrote: "It\'s as if we were rats in a trap." She had decided. What to do about it? Go on... Yes.'.startsWith(s.text, s.offset));
  // lower-case after a period does not split ("St. michel" style)
  assert.equal(splitSentences("Look up. all the way up. Then stop.").length, 2);
  // a quote closing and reopening splits, despite the space French puts inside
  // the guillemets — the letter that decides is two characters on, not one
  assert.deepEqual(
    splitSentences("Ses mots : « Tout est perdu. » « La route est ouverte. » Puis plus rien.").map((s) => s.text),
    ["Ses mots : « Tout est perdu. »", "« La route est ouverte. »", "Puis plus rien."],
  );
});

test("splitLongSentence: prefers em dash / semicolon / colon near the middle, recursive", () => {
  const s = "Financial: a hundred and thirty-two billion gold marks in reparations — the equivalent of forty-seven kilotons of gold, or three times the current annual budget of the French state.";
  const parts = splitLongSentence(s, 120);
  assert.equal(parts.length, 2);
  assert.ok(parts[0]!.endsWith("—"));
  assert.ok(parts[1]!.startsWith("the equivalent"));
  assert.deepEqual(splitLongSentence("short", 170), ["short"]);
  // no separator at all -> comma fallback
  const c = "a".repeat(80) + ", " + "b".repeat(80) + ", " + "c".repeat(30);
  assert.equal(splitLongSentence(c, 120).length, 2);
});

test("groupParagraphs respects the size budget", () => {
  const g = groupParagraphs(["a".repeat(900), "b".repeat(700), "c".repeat(100), "d".repeat(1600)], 1500);
  assert.deepEqual(g.map((x) => x.length), [1, 2, 1]);
  assert.equal(g[2]![0]!.length, 1600); // oversize paragraph stays alone
});

test("toDisplayText EN: years, dates, times, scales, ordinals, percentages", () => {
  const cases: [string, string][] = [
    ["in August nineteen forty-four.", "in August 1944."],
    ["The First World War ends in nineteen eighteen.", "The First World War ends in 1918."],
    ["the war of eighteen seventy-one. At three-thirty in the afternoon, the Germans", "the war of 1871. At 3:30 in the afternoon, the Germans"],
    ["At nine twenty-two in the evening, Captain Dronne", "At 9:22 in the evening, Captain Dronne"],
    ["at six in the morning, the Minister", "at six in the morning, the Minister"],
    ["on the twenty-fifth of August nineteen forty-four.", "on 25 August 1944."],
    ["on the first of September nineteen thirty-nine, France", "on 1 September 1939, France"],
    ["Germany lost fifteen percent of its land", "Germany lost 15% of its land"],
    ["Eighty-five percent of the city", "85% of the city"],
    ["a hundred and thirty-two billion gold marks", "132 billion gold marks"],
    ["the army capped at one hundred thousand men.", "the army capped at 100,000 men."],
    ["Of the two point eight million Parisians, only around seven hundred thousand stayed.", "Of the 2.8 million Parisians, only around 700,000 stayed."],
    ["He moved one million men north.", "He moved one million men north."],
    ["three million mouths to feed", "three million mouths to feed"],
    ["twenty-two thousand men and one hundred tanks", "22,000 men and 100 tanks"],
    ["eighteen thousand Polish soldiers and one hundred and seventy thousand civilians", "18,000 Polish soldiers and 170,000 civilians"],
    ["More than two hundred and fifty people died.", "More than 250 people died."],
    ["More than six hundred barricades", "More than 600 barricades"],
    ["A few hundred metres behind you", "A few hundred metres behind you"],
    ["Eight hundred metres from the Préfecture", "800 metres from the Préfecture"],
    ["sixty Boulevard Saint-Michel, in the fifth arrondissement.", "60 Boulevard Saint-Michel, in the 5th arrondissement."],
    ["fourteen Rue de l'Abbaye, in the sixth arrondissement", "14 Rue de l'Abbaye, in the 6th arrondissement"],
    ["the one thousand five hundred and eighteenth day of the German occupation.", "the 1,518th day of the German occupation."],
    ["the US Fourth Infantry Division", "the US 4th Infantry Division"],
    ["the Second World War. The first stop. Four main stops, three districts, two kilometres.", "the Second World War. The first stop. Four main stops, three districts, two kilometres."],
    ["start the audio for stop one when", "start the audio for stop 1 when"],
    ["He died in two thousand and six.", "He died in 2006."],
    ["at least twenty times, hand-picking", "at least 20 times, hand-picking"],
    ["It lasted eight months.", "It lasted eight months."],
    ["exactly ten years after his failed putsch", "exactly 10 years after his failed putsch"],
    ["their two hundred and fifty thousand men home", "their 250,000 men home"],
    ["Paris is worth two hundred thousand dead.", "Paris is worth 200,000 dead."],
    ["a hundred tonnes of classified archives", "100 tonnes of classified archives"],
    ["The nineteen twenty-nine crash", "The 1929 crash"],
    ["the nineteen thirty-six French general strikes", "the 1936 French general strikes"],
    ["rang out around nine-thirty.", "rang out around 9:30."],
    ["a thirteen-tonne bell", "a thirteen-tonne bell"],
    ["Three: the logistical nightmare", "Three: the logistical nightmare"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(toDisplayText(input, "en").text, expected, `EN: ${input}`);
  }
});

test("toDisplayText FR: années, dates, heures, échelles, ordinaux, pourcentages", () => {
  const NB = "\u00A0";
  const cases: [string, string][] = [
    ["en août mille neuf cent quarante-quatre.", "en août 1944."],
    ["se termine en mille neuf cent dix-huit.", "se termine en 1918."],
    ["Il est mort en deux mille six.", "Il est mort en 2006."],
    ["le premier septembre mille neuf cent trente-neuf, la France", "le 1er septembre 1939, la France"],
    ["Le vingt-six février mille neuf cent quarante, le premier avion", "Le 26 février 1940, le premier avion"],
    ["au matin du vingt-cinq août mille neuf cent quarante-quatre.", "au matin du 25 août 1944."],
    ["Le vingt-et-un mai mille neuf cent quarante", "Le 21 mai 1940"],
    [`l'Allemagne perd quinze pour cent de son territoire`, `l'Allemagne perd 15${NB}% de son territoire`],
    [`Quatre-vingt-cinq pour cent de la ville`, `85${NB}% de la ville`],
    ["cent trente-deux milliards de marks-or", "132 milliards de marks-or"],
    [`une armée plafonnée à cent mille hommes.`, `une armée plafonnée à 100${NB}000 hommes.`],
    // Collapsing the tail into a scale word makes "de" mandatory in French.
    ["Sur les deux millions huit cent mille Parisiens, seuls sept cent mille environ", `Sur les 2,8 millions de Parisiens, seuls 700${NB}000 environ`],
    ["deux millions huit cent mille habitants", "2,8 millions d'habitants"],
    ["Il déplace un million d'hommes", "Il déplace un million d'hommes"],
    [`environ vingt-deux mille hommes et cent chars`, `environ 22${NB}000 hommes et 100 chars`],
    [`dix-huit mille soldats polonais et cent soixante-dix mille civils`, `18${NB}000 soldats polonais et 170${NB}000 civils`],
    ["Plus de six cents barricades", "Plus de 600 barricades"],
    ["Plus de deux cent cinquante personnes", "Plus de 250 personnes"],
    ["À quelques centaines de mètres", "À quelques centaines de mètres"],
    ["À huit cents mètres de la Préfecture", "À 800 mètres de la Préfecture"],
    ["au soixante Boulevard Saint-Michel, dans le cinquième arrondissement.", "au 60 Boulevard Saint-Michel, dans le 5e arrondissement."],
    ["quatorze Rue de l'Abbaye dans le sixième arrondissement", "14 Rue de l'Abbaye dans le 6e arrondissement"],
    [`le mille cinq cent dix-huitième jour de l'occupation`, `le 1${NB}518e jour de l'occupation`],
    ["la deuxième Division Blindée et la quatrième Division d'Infanterie", "la 2e Division Blindée et la 4e Division d'Infanterie"],
    ["La Première Guerre mondiale. Pour la première fois. Le Premier ministre. Quatre arrêts principaux, trois arrondissements, deux kilomètres.", "La Première Guerre mondiale. Pour la première fois. Le Premier ministre. Quatre arrêts principaux, trois arrondissements, deux kilomètres."],
    ["lancez l'audio de l'arrêt un quand vous", "lancez l'audio de l'arrêt 1 quand vous"],
    ["Lancez l'audio de l'arrêt trois quand", "Lancez l'audio de l'arrêt 3 quand"],
    ["lancez l\u2019audio de l\u2019arrêt un quand vous", "lancez l\u2019audio de l\u2019arrêt 1 quand vous"],
    ["Phase deux : le treize mai, les Allemands", "Phase deux : le 13 mai, les Allemands"],
    ["Hitler fait le tour de la ville pendant trois heures.", "Hitler fait le tour de la ville pendant trois heures."],
    [`À quinze heures trente, les Allemands`, `À 15${NB}h${NB}30, les Allemands`],
    [`La mission décolle vers dix-sept heures.`, `La mission décolle vers 17${NB}h.`],
    [`À vingt-et-une heures vingt-deux, le capitaine`, `À 21${NB}h${NB}22, le capitaine`],
    [`à six heures du matin, le ministre`, `à 6${NB}h du matin, le ministre`],
    ["Trois heures dans la ville, à l'aube.", "Trois heures dans la ville, à l'aube."],
    ["quelques heures avant que", "quelques heures avant que"],
    ["au moins vingt fois", "au moins 20 fois"],
    ["Elle a duré plus de soixante jours.", "Elle a duré plus de 60 jours."],
    ["Le krach de mille neuf cent vingt-neuf", "Le krach de 1929"],
    ["une trentaine de minutes", "une trentaine de minutes"],
    ["cent tonnes d'archives", "100 tonnes d'archives"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(toDisplayText(input, "fr").text, expected, `FR: ${input}`);
  }
  const r = toDisplayText("en août mille neuf cent quarante-quatre.", "fr");
  assert.deepEqual(r.rewrites, [{ from: "mille neuf cent quarante-quatre.", to: "1944." }]);
});

test("align: letter offsets map sentence starts to word times", () => {
  const words = [
    { text: "As", start: 0.16, end: 0.32 },
    { text: "you", start: 0.32, end: 0.4 },
    { text: "walk", start: 0.4, end: 0.64 },
    { text: "left", start: 0.7, end: 0.9 },
    { text: "hand", start: 0.9, end: 1.1 }, // Fish split "left-hand"
    { text: "A", start: 1.5, end: 1.6 },
    { text: "plaque", start: 1.6, end: 2.0 },
  ];
  const text = "As you walk left-hand. A plaque.";
  const offsets = wordLetterOffsets(words);
  assert.deepEqual(offsets, [0, 2, 5, 9, 13, 17, 18]);
  const secondSentence = text.indexOf("A plaque");
  assert.equal(letterOffsetAt(text, secondSentence), 17);
  assert.equal(timeAtLetterOffset(words, offsets, 17), 1.5);
  assert.equal(timeAtLetterOffset(words, offsets, 0), 0.16);
  // offset inside "hand" (second half) snaps to next word
  assert.equal(timeAtLetterOffset(words, offsets, 16), 1.5);
  assert.equal(timeAtLetterOffset(words, offsets, 13), 0.9);
});

test("firstLetterIndex skips the punctuation a quoted sentence opens on", () => {
  assert.equal(firstLetterIndex("« Ici est tombé"), 2);
  assert.equal(firstLetterIndex("Ici est tombé"), 0);
  assert.equal(firstLetterIndex("\u201CAll is lost"), 1);
  assert.equal(firstLetterIndex("... 1944"), 4);
  assert.equal(firstLetterIndex("«»"), 0); // nothing to aim at
});
