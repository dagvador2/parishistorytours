/**
 * Country catalogue shared by the tracking importer and the public pages.
 *
 * The tracking workbook stores free-text French country labels ("USA", "Pays
 * Bas", "Ecosse"…). `countryFromLabel` resolves them to an ISO 3166-1 alpha-2
 * code, which is what the database stores and what every display derives from:
 *
 *   code    → flag image (flagsapi.com) and stable grouping key
 *   numeric → ISO 3166-1 numeric, the `id` of each geometry in
 *             public/data/world-110m.json, used to shade the world map
 *   fr / en → the label shown to the visitor, in the page language
 *
 * A handful of entries have no geometry at the 110m resolution (Hong Kong,
 * Singapore, Malta, Mauritius, Monaco, Andorra): they still count in the
 * statistics, they simply do not shade a shape on the map.
 */

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** ISO 3166-1 numeric, zero-padded — matches `geo.id` in world-110m.json. */
  numeric: string;
  fr: string;
  en: string;
}

const LIST: Country[] = [
  // Europe
  { code: "AD", numeric: "020", fr: "Andorre", en: "Andorra" },
  { code: "AL", numeric: "008", fr: "Albanie", en: "Albania" },
  { code: "AM", numeric: "051", fr: "Arménie", en: "Armenia" },
  { code: "AT", numeric: "040", fr: "Autriche", en: "Austria" },
  { code: "AZ", numeric: "031", fr: "Azerbaïdjan", en: "Azerbaijan" },
  { code: "BA", numeric: "070", fr: "Bosnie-Herzégovine", en: "Bosnia and Herzegovina" },
  { code: "BE", numeric: "056", fr: "Belgique", en: "Belgium" },
  { code: "BG", numeric: "100", fr: "Bulgarie", en: "Bulgaria" },
  { code: "BY", numeric: "112", fr: "Biélorussie", en: "Belarus" },
  { code: "CH", numeric: "756", fr: "Suisse", en: "Switzerland" },
  { code: "CY", numeric: "196", fr: "Chypre", en: "Cyprus" },
  { code: "CZ", numeric: "203", fr: "République tchèque", en: "Czechia" },
  { code: "DE", numeric: "276", fr: "Allemagne", en: "Germany" },
  { code: "DK", numeric: "208", fr: "Danemark", en: "Denmark" },
  { code: "EE", numeric: "233", fr: "Estonie", en: "Estonia" },
  { code: "ES", numeric: "724", fr: "Espagne", en: "Spain" },
  { code: "FI", numeric: "246", fr: "Finlande", en: "Finland" },
  { code: "FR", numeric: "250", fr: "France", en: "France" },
  { code: "GB", numeric: "826", fr: "Royaume-Uni", en: "United Kingdom" },
  { code: "GE", numeric: "268", fr: "Géorgie", en: "Georgia" },
  { code: "GR", numeric: "300", fr: "Grèce", en: "Greece" },
  { code: "HR", numeric: "191", fr: "Croatie", en: "Croatia" },
  { code: "HU", numeric: "348", fr: "Hongrie", en: "Hungary" },
  { code: "IE", numeric: "372", fr: "Irlande", en: "Ireland" },
  { code: "IS", numeric: "352", fr: "Islande", en: "Iceland" },
  { code: "IT", numeric: "380", fr: "Italie", en: "Italy" },
  { code: "LT", numeric: "440", fr: "Lituanie", en: "Lithuania" },
  { code: "LU", numeric: "442", fr: "Luxembourg", en: "Luxembourg" },
  { code: "LV", numeric: "428", fr: "Lettonie", en: "Latvia" },
  { code: "MC", numeric: "492", fr: "Monaco", en: "Monaco" },
  { code: "MD", numeric: "498", fr: "Moldavie", en: "Moldova" },
  { code: "ME", numeric: "499", fr: "Monténégro", en: "Montenegro" },
  { code: "MK", numeric: "807", fr: "Macédoine du Nord", en: "North Macedonia" },
  { code: "MT", numeric: "470", fr: "Malte", en: "Malta" },
  { code: "NL", numeric: "528", fr: "Pays-Bas", en: "Netherlands" },
  { code: "NO", numeric: "578", fr: "Norvège", en: "Norway" },
  { code: "PL", numeric: "616", fr: "Pologne", en: "Poland" },
  { code: "PT", numeric: "620", fr: "Portugal", en: "Portugal" },
  { code: "RO", numeric: "642", fr: "Roumanie", en: "Romania" },
  { code: "RS", numeric: "688", fr: "Serbie", en: "Serbia" },
  { code: "RU", numeric: "643", fr: "Russie", en: "Russia" },
  { code: "SE", numeric: "752", fr: "Suède", en: "Sweden" },
  { code: "SI", numeric: "705", fr: "Slovénie", en: "Slovenia" },
  { code: "SK", numeric: "703", fr: "Slovaquie", en: "Slovakia" },
  { code: "UA", numeric: "804", fr: "Ukraine", en: "Ukraine" },
  // Americas
  { code: "AR", numeric: "032", fr: "Argentine", en: "Argentina" },
  { code: "BO", numeric: "068", fr: "Bolivie", en: "Bolivia" },
  { code: "BR", numeric: "076", fr: "Brésil", en: "Brazil" },
  { code: "CA", numeric: "124", fr: "Canada", en: "Canada" },
  { code: "CL", numeric: "152", fr: "Chili", en: "Chile" },
  { code: "CO", numeric: "170", fr: "Colombie", en: "Colombia" },
  { code: "CR", numeric: "188", fr: "Costa Rica", en: "Costa Rica" },
  { code: "CU", numeric: "192", fr: "Cuba", en: "Cuba" },
  { code: "DO", numeric: "214", fr: "République dominicaine", en: "Dominican Republic" },
  { code: "EC", numeric: "218", fr: "Équateur", en: "Ecuador" },
  { code: "GT", numeric: "320", fr: "Guatemala", en: "Guatemala" },
  { code: "HN", numeric: "340", fr: "Honduras", en: "Honduras" },
  { code: "JM", numeric: "388", fr: "Jamaïque", en: "Jamaica" },
  { code: "MX", numeric: "484", fr: "Mexique", en: "Mexico" },
  { code: "NI", numeric: "558", fr: "Nicaragua", en: "Nicaragua" },
  { code: "PA", numeric: "591", fr: "Panama", en: "Panama" },
  { code: "PE", numeric: "604", fr: "Pérou", en: "Peru" },
  { code: "PR", numeric: "630", fr: "Porto Rico", en: "Puerto Rico" },
  { code: "PY", numeric: "600", fr: "Paraguay", en: "Paraguay" },
  { code: "SV", numeric: "222", fr: "Salvador", en: "El Salvador" },
  { code: "TT", numeric: "780", fr: "Trinité-et-Tobago", en: "Trinidad and Tobago" },
  { code: "US", numeric: "840", fr: "États-Unis", en: "United States" },
  { code: "UY", numeric: "858", fr: "Uruguay", en: "Uruguay" },
  { code: "VE", numeric: "862", fr: "Venezuela", en: "Venezuela" },
  // Asia & Oceania
  { code: "AU", numeric: "036", fr: "Australie", en: "Australia" },
  { code: "BD", numeric: "050", fr: "Bangladesh", en: "Bangladesh" },
  { code: "CN", numeric: "156", fr: "Chine", en: "China" },
  { code: "HK", numeric: "344", fr: "Hong Kong", en: "Hong Kong" },
  { code: "ID", numeric: "360", fr: "Indonésie", en: "Indonesia" },
  { code: "IN", numeric: "356", fr: "Inde", en: "India" },
  { code: "JP", numeric: "392", fr: "Japon", en: "Japan" },
  { code: "KR", numeric: "410", fr: "Corée du Sud", en: "South Korea" },
  { code: "KZ", numeric: "398", fr: "Kazakhstan", en: "Kazakhstan" },
  { code: "LK", numeric: "144", fr: "Sri Lanka", en: "Sri Lanka" },
  { code: "MY", numeric: "458", fr: "Malaisie", en: "Malaysia" },
  { code: "NP", numeric: "524", fr: "Népal", en: "Nepal" },
  { code: "NZ", numeric: "554", fr: "Nouvelle-Zélande", en: "New Zealand" },
  { code: "PH", numeric: "608", fr: "Philippines", en: "Philippines" },
  { code: "PK", numeric: "586", fr: "Pakistan", en: "Pakistan" },
  { code: "SG", numeric: "702", fr: "Singapour", en: "Singapore" },
  { code: "TH", numeric: "764", fr: "Thaïlande", en: "Thailand" },
  { code: "TW", numeric: "158", fr: "Taïwan", en: "Taiwan" },
  { code: "VN", numeric: "704", fr: "Viêt Nam", en: "Vietnam" },
  // Middle East & Africa
  { code: "AE", numeric: "784", fr: "Émirats arabes unis", en: "United Arab Emirates" },
  { code: "CI", numeric: "384", fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
  { code: "CM", numeric: "120", fr: "Cameroun", en: "Cameroon" },
  { code: "DZ", numeric: "012", fr: "Algérie", en: "Algeria" },
  { code: "EG", numeric: "818", fr: "Égypte", en: "Egypt" },
  { code: "ET", numeric: "231", fr: "Éthiopie", en: "Ethiopia" },
  { code: "GH", numeric: "288", fr: "Ghana", en: "Ghana" },
  { code: "IL", numeric: "376", fr: "Israël", en: "Israel" },
  { code: "IR", numeric: "364", fr: "Iran", en: "Iran" },
  { code: "JO", numeric: "400", fr: "Jordanie", en: "Jordan" },
  { code: "KE", numeric: "404", fr: "Kenya", en: "Kenya" },
  { code: "LB", numeric: "422", fr: "Liban", en: "Lebanon" },
  { code: "MA", numeric: "504", fr: "Maroc", en: "Morocco" },
  { code: "MU", numeric: "480", fr: "Maurice", en: "Mauritius" },
  { code: "NG", numeric: "566", fr: "Nigeria", en: "Nigeria" },
  { code: "QA", numeric: "634", fr: "Qatar", en: "Qatar" },
  { code: "SA", numeric: "682", fr: "Arabie saoudite", en: "Saudi Arabia" },
  { code: "SN", numeric: "686", fr: "Sénégal", en: "Senegal" },
  { code: "TN", numeric: "788", fr: "Tunisie", en: "Tunisia" },
  { code: "TR", numeric: "792", fr: "Turquie", en: "Türkiye" },
  { code: "TZ", numeric: "834", fr: "Tanzanie", en: "Tanzania" },
  { code: "ZA", numeric: "710", fr: "Afrique du Sud", en: "South Africa" },
];

export const COUNTRIES: Record<string, Country> = Object.fromEntries(LIST.map((c) => [c.code, c]));

/**
 * Labels seen in the workbook (or likely to be typed later) that are not the
 * catalogue's own French or English name. Constituent nations of the UK
 * deliberately collapse onto GB so the country count stays honest.
 */
const ALIASES: Record<string, string> = {
  usa: "US", us: "US", "etats unis": "US", amerique: "US", "united states of america": "US",
  uk: "GB", angleterre: "GB", england: "GB", ecosse: "GB", scotland: "GB",
  "irlande du nord": "GB", "northern ireland": "GB", "pays de galles": "GB", wales: "GB",
  "grande bretagne": "GB", "great britain": "GB", britain: "GB",
  hollande: "NL", holland: "NL",
  tchequie: "CZ", "czech republic": "CZ",
  coree: "KR", "south korea": "KR",
  turkey: "TR",
  "emirats arabes unis": "AE", uae: "AE", "dubai": "AE",
  "ivory coast": "CI",
  "republique dominicaine": "DO",
  bielorussie: "BY",
  "macedoine": "MK",
};

/** lowercase, strip accents and every non-alphanumeric character. */
function normalize(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_LABEL = new Map<string, Country>();
for (const c of LIST) {
  BY_LABEL.set(normalize(c.fr), c);
  BY_LABEL.set(normalize(c.en), c);
  BY_LABEL.set(normalize(c.code), c);
}
for (const [alias, code] of Object.entries(ALIASES)) {
  BY_LABEL.set(normalize(alias), COUNTRIES[code]!);
}
// Spellings that survive normalisation as one word ("PaysBas", "NouvelleZelande").
for (const c of LIST) BY_LABEL.set(normalize(c.fr).replace(/ /g, ""), c);
for (const [alias, code] of Object.entries(ALIASES)) {
  BY_LABEL.set(normalize(alias).replace(/ /g, ""), COUNTRIES[code]!);
}

/** Resolve a free-text country label. Returns null for empty or unknown input. */
export function countryFromLabel(label: string | null | undefined): Country | null {
  if (!label) return null;
  const key = normalize(label);
  if (!key || key === "-") return null;
  return BY_LABEL.get(key) ?? BY_LABEL.get(key.replace(/ /g, "")) ?? null;
}

/** Display name in the page language; falls back to the raw code. */
export function countryName(code: string, lang: "en" | "fr"): string {
  const c = COUNTRIES[code];
  if (!c) return code;
  return lang === "fr" ? c.fr : c.en;
}
