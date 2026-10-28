#!/usr/bin/env node
/**
 * catalog_taxonomy.mjs — Single source of truth for the marketplace vocabulary.
 *
 * The Watchtower Marketplace groups extensions into shelves. Before this file,
 * a shelf was guessed by substring-matching the extension *name* (`/manhwa/`,
 * `/film/`…), which put "ManhwaDex" in the Manhwa shelf and left everything
 * else in "Autres". Tags now come from the catalogue, so a group is decided by
 * declared metadata instead of a fragile name comparison.
 *
 * The vocabulary is split in three axes, because they answer different
 * questions and must not be confused:
 *
 *   contentTypes — what the extension serves (a watch source serves series).
 *   genres       — what the extension can filter on (real getFilterList()
 *                  capabilities, never the site's marketing copy).
 *   languages    — the languages the catalogue declares.
 *
 * Plus one curation axis (featured/new) reserved for explicit opt-ins, and
 * `popular`/`trending`, which are only written when a real signal exists —
 * never invented.
 *
 * The Dart side mirrors this file in
 * `lib/models/catalog_taxonomy.dart`; keep the two in sync.
 */

/** Canonical content tags, in display order. */
export const CONTENT_TAGS = [
  "watch",
  "read",
  "manga",
  "manhwa",
  "manhua",
  "webtoon",
  "comics",
  "novel",
  "anime",
  "animation",
  "movies",
  "series",
  "documentary",
  "music",
  "game",
];

/** Canonical genre tags, in display order. */
export const GENRE_TAGS = [
  "action",
  "adventure",
  "fantasy",
  "science-fiction",
  "romance",
  "mystery",
  "drama",
  "comedy",
  "horror",
  "thriller",
  "historical",
  "slice-of-life",
  "mecha",
  "sports",
];

/** Canonical language tags, in display order. */
export const LANGUAGE_TAGS = [
  "multilingual",
  "french",
  "english",
  "spanish",
  "german",
  "italian",
  "portuguese",
  "japanese",
  "korean",
  "chinese",
  "arabic",
  "russian",
  "turkish",
  "thai",
  "indonesian",
  "hindi",
  "vietnamese",
  "polish",
  "dutch",
];

/** Curation tags. Only explicit opt-ins or real signals may produce these. */
export const CURATION_TAGS = ["featured", "popular", "trending", "new"];

export const ALL_TAGS = [
  ...CONTENT_TAGS,
  ...GENRE_TAGS,
  ...LANGUAGE_TAGS,
  ...CURATION_TAGS,
];

const TAG_SET = new Set(ALL_TAGS);

/** The catalogue an entry lives in decides its `itemType`, and its base content tag. */
export const ITEM_TYPE_TO_CONTENT = {
  0: "read", // manga / comic
  1: "watch", // video
  2: "read", // novel / ebook
  3: "music",
  4: "game",
  5: "read", // plugin entries that ship reading sources
  7: "watch", // subtitle tracks are a companion of watchable media
};

/** ISO-639-1 (and common BCP-47) language codes → canonical language tag. */
export const LANG_CODE_TO_TAG = {
  fr: "french",
  "fr-fr": "french",
  "fr-ca": "french",
  en: "english",
  "en-us": "english",
  "en-gb": "english",
  es: "spanish",
  "es-419": "spanish",
  de: "german",
  it: "italian",
  pt: "portuguese",
  "pt-br": "portuguese",
  ja: "japanese",
  ko: "korean",
  zh: "chinese",
  "zh-hk": "chinese",
  "zh-tw": "chinese",
  "zh-cn": "chinese",
  ar: "arabic",
  ru: "russian",
  tr: "turkish",
  th: "thai",
  id: "indonesian",
  hi: "hindi",
  vi: "vietnamese",
  pl: "polish",
  nl: "dutch",
  all: "multilingual",
  multi: "multilingual",
};

/**
 * Declared filter/genre label → canonical genre tag.
 *
 * Labels are matched case-insensitively after trimming. Only labels that a
 * source really exposes in `getFilterList()` reach this table, so a mapping
 * here is a capability claim, not a guess.
 */
export const GENRE_LABEL_TO_TAG = {
  action: "action",
  "action & adventure": "action",
  "action and adventure": "action",
  adventure: "adventure",
  aventure: "adventure",
  fantasy: "fantasy",
  fantastique: "fantasy",
  "sci-fi": "science-fiction",
  scifi: "science-fiction",
  "science fiction": "science-fiction",
  "science-fiction": "science-fiction",
  "sci fi": "science-fiction",
  "scientific fiction": "science-fiction",
  romance: "romance",
  "romantic subtext": "romance",
  mystery: "mystery",
  mystère: "mystery",
  mystere: "mystery",
  detective: "mystery",
  drama: "drama",
  drame: "drama",
  comedy: "comedy",
  comédie: "comedy",
  comedie: "comedy",
  "gag humor": "comedy",
  parody: "comedy",
  horror: "horror",
  horreur: "horror",
  gore: "horror",
  thriller: "thriller",
  suspense: "thriller",
  "high stakes game": "thriller",
  historical: "historical",
  histoire: "historical",
  "time travel": "historical",
  "slice of life": "slice-of-life",
  "slice-of-life": "slice-of-life",
  iyashikei: "slice-of-life",
  mecha: "mecha",
  sports: "sports",
  "team sports": "sports",
  "combat sports": "sports",
  racing: "sports",
};

/**
 * Declared content-type labels → canonical content tags, per medium.
 *
 * Used when a source exposes a "Type"/"Format"/"Category" filter whose options
 * name the content it serves ("Manhwa", "Webtoon", "Light Novel"). That is
 * first-hand evidence, unlike a domain or a brand name.
 *
 * The mapping is medium-scoped because the same label means different things:
 * "Cartoon" is western comics on a reading site and animation on a streaming
 * site. Accepting the label unconditionally is exactly how a manga source ends
 * up in the Animation shelf.
 */
const READING_CONTENT_LABELS = {
  manga: "manga",
  manhwa: "manhwa",
  manhua: "manhua",
  webtoon: "webtoon",
  "web-toon": "webtoon",
  webtoons: "webtoon",
  comic: "comics",
  comics: "comics",
  cartoon: "comics",
  cartoons: "comics",
  "bande dessinée": "comics",
  "bande dessinee": "comics",
  bd: "comics",
  novel: "novel",
  novels: "novel",
  roman: "novel",
  romans: "novel",
  "light novel": "novel",
  "light novels": "novel",
  "web novel": "novel",
  "web novels": "novel",
  webnovel: "novel",
  ebook: "novel",
};

const WATCH_CONTENT_LABELS = {
  anime: "anime",
  animation: "animation",
  cartoon: "animation",
  cartoons: "animation",
  movie: "movies",
  movies: "movies",
  film: "movies",
  films: "movies",
  series: "series",
  "tv series": "series",
  "tv shows": "series",
  "tv show": "series",
  séries: "series",
  series_tv: "series",
  documentary: "documentary",
  documentaries: "documentary",
  documentaire: "documentary",
};

/** Medium a catalogue's itemType belongs to. */
export function mediumFor(itemType) {
  const content = ITEM_TYPE_TO_CONTENT[Number(itemType)];
  if (content === "watch") return "watch";
  if (content === "read") return "read";
  return content ?? null;
}

/**
 * Canonical content tag for a declared label, or null when the label carries
 * no content meaning for this medium.
 */
export function contentTagForLabel(label, itemType) {
  const key = String(label || "").trim().toLowerCase();
  const medium = mediumFor(itemType);
  if (medium === "watch") return WATCH_CONTENT_LABELS[key] ?? null;
  if (medium === "read") return READING_CONTENT_LABELS[key] ?? null;
  return null;
}

/** Every content label, for documentation and tests. */
export const CONTENT_LABEL_TO_TAG = {
  ...READING_CONTENT_LABELS,
  ...WATCH_CONTENT_LABELS,
};

export function isKnownTag(tag) {
  return TAG_SET.has(String(tag || "").trim().toLowerCase());
}

export function normalizeTag(tag) {
  return String(tag || "").trim().toLowerCase();
}

/** Canonical language tag for a BCP-47 code, or null when unmapped. */
export function languageTagFor(code) {
  const key = String(code || "").trim().toLowerCase();
  return LANG_CODE_TO_TAG[key] ?? null;
}

/**
 * Ordered, de-duplicated tag list. Order follows the vocabulary (content,
 * genre, language, curation) so the rendered card always shows content first
 * and curation last — deterministic across runs.
 */
export function orderTags(tags) {
  const wanted = new Set(tags.map(normalizeTag));
  return ALL_TAGS.filter((tag) => wanted.has(tag));
}

/**
 * Validates a tag list. Returns human-readable problems; an empty array means
 * the list is usable.
 */
export function validateTags(tags, { itemType } = {}) {
  const problems = [];
  if (tags === undefined) return problems;
  if (!Array.isArray(tags)) return [`tags must be an array, got ${typeof tags}`];
  const seen = new Set();
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag) {
      problems.push("tags contains an empty value");
      continue;
    }
    if (!isKnownTag(tag)) {
      problems.push(`unknown tag "${raw}"`);
      continue;
    }
    if (seen.has(tag)) {
      problems.push(`duplicate tag "${tag}"`);
      continue;
    }
    seen.add(tag);
    if (tag !== raw) {
      problems.push(`tag "${raw}" is not canonical (expected "${tag}")`);
    }
  }
  if (itemType !== undefined && Number.isInteger(itemType)) {
    const expected = ITEM_TYPE_TO_CONTENT[itemType];
    if (expected && !seen.has(expected)) {
      problems.push(
        `itemType ${itemType} catalogue must carry the "${expected}" content tag`,
      );
    }
    // A watch catalogue must not claim reading-only content, and vice versa.
    // Subtitle catalogues are watch catalogues, so the same rule already covers
    // them: they describe watchable media, never manga.
    const readingOnly = ["manga", "manhwa", "manhua", "webtoon", "comics", "novel"];
    const watchOnly = ["anime", "animation", "movies", "series", "documentary"];
    const claims = readingOnly.filter((tag) => seen.has(tag));
    const watchClaims = watchOnly.filter((tag) => seen.has(tag));
    if (expected === "watch" && claims.length) {
      problems.push(
        `itemType ${itemType} (watch) cannot carry reading tags: ${claims.join(", ")}`,
      );
    }
    if (expected === "read" && watchClaims.length) {
      problems.push(
        `itemType ${itemType} (read) cannot carry watch-only tags: ${watchClaims.join(", ")}`,
      );
    }
  }
  return problems;
}
