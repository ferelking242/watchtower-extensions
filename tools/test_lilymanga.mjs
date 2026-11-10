import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requests = [];

const detailUrl = "https://lilymanga.net/gl/example-manga/";
const latestChapterUrl = `${detailUrl}chapter-2/`;
const searchHtml = `
  <div class="page-item-detail manga">
    <div class="item-summary">
      <h3 class="post-title"><a href="/gl/rock-it-girl/">Rock It Girl</a></h3>
    </div>
    <img data-src="/covers/rock-it-girl.webp" alt="Rock It Girl" />
  </div>`;
const homeHtml = `
  <div class="popular-slider">
    <div class="slider__item"><div class="slider__content">
      <h3 class="post-title"><a href="/gl/featured-one/">Featured One</a></h3>
      <img data-src="/covers/featured-one.webp" alt="Featured One" />
    </div></div>
    <div class="slider__item"><div class="slider__content">
      <h3 class="post-title"><a href="/gl/featured-two/">Featured Two</a></h3>
      <img data-src="/covers/featured-two.webp" alt="Featured Two" />
    </div></div>
  </div>`;
const detailHtml = `
  <h1>Example Manga</h1>
  <div class="summary_image"><img data-src="/covers/example.webp" /></div>
  <div class="description-summary"><div class="summary__content">A test description.</div></div>
  <div class="genres-content"><a href="/gl-genre/yuri/">Yuri</a></div>
  <div class="post-status"><div class="post-content_item">
    <div class="summary-heading"><h5>Status</h5></div>
    <div class="summary-content">Ongoing</div>
  </div></div>
  <div id="manga-chapters-holder" data-id="8343"></div>
  <div id="init-links" class="nav-links">
    <a id="btn-read-last" href="${detailUrl}chapter-1/">Read First</a>
    <a id="btn-read-first" href="${detailUrl}chapter-2/">Read Last</a>
  </div>
  <a href="https://mangabuddy.com/example-manga/chapter-15">
    https://mangabuddy.com/example-manga/chapter-15
  </a>`;
const chaptersHtml = `
  <div class="listing-chapters_wrap">
    <ul class="main">
      <li class="wp-manga-chapter"><a href="${detailUrl}chapter-2/">Chapter 2 - Latest</a></li>
      <li class="wp-manga-chapter"><a href="${detailUrl}chapter-1/">Chapter 1 - Start</a></li>
      <li class="wp-manga-chapter"><a href="${detailUrl}vol-02-chapter-440-cq-1-3/">Vol.02 - Chapter 440</a></li>
      <li class="wp-manga-chapter"><a href="${detailUrl}season-03-episode-114/">[Season 03] Episode 114</a></li>
    </ul>
  </div>
  <a href="${detailUrl}chapter-99/">Unrelated link outside chapter list</a>`;
const pageHtml = `
  <img class="wp-manga-chapter-img" data-src="https://img.lilymanga.net/page-1.webp" />
  <img class="wp-manga-chapter-img" data-src="https://img.lilymanga.net/page-1.webp" />
  <img class="wp-manga-chapter-img" data-src="https://img.lilymanga.net/page-2.webp" />`;

class Client {
  async get(url, headers) {
    requests.push({ method: "GET", url, headers });
    if (url === detailUrl) return { body: detailHtml };
    if (url === latestChapterUrl) return { body: pageHtml };
    if (url === "https://lilymanga.net/") return { body: homeHtml };
    return { body: searchHtml };
  }

  async post(url, headers, body) {
    requests.push({ method: "POST", url, headers, body });
    return { body: chaptersHtml };
  }
}

class MProvider {
  constructor() {
    this.source = null;
  }
}

class SharedPreferences {
  get() {
    return null;
  }
}

const sourceCode = fs.readFileSync(
  path.join(root, "src/manga/en/lilymanga.js"),
  "utf8",
);
const sandbox = {
  MProvider,
  Client,
  SharedPreferences,
  Document,
  URL,
  URLSearchParams,
  console,
  watchtowerSources: undefined,
  DefaultExtension: undefined,
};
vm.createContext(sandbox);
vm.runInContext(
  `${sourceCode}\n;this.__exports={sources:watchtowerSources,DefaultExtension};`,
  sandbox,
  { filename: "lilymanga.js", timeout: 8000 },
);

const { sources, DefaultExtension } = sandbox.__exports;
const extension = new DefaultExtension();
extension.source = sources[0];

assert.equal(sources[0].version, "1.4.0");

const allResults = await extension.search("Rock & Roll", 1, []);
assert.equal(allResults.list[0].name, "Rock It Girl");
assert.equal(allResults.list[0].link, "https://lilymanga.net/gl/rock-it-girl/");
const allSearch = new URL(requests.at(-1).url);
assert.equal(allSearch.searchParams.get("s"), "Rock & Roll");
assert.equal(allSearch.searchParams.get("post_type"), "wp-manga");

const filters = extension.getFilterList();
filters.find((filter) => filter.name === "Sort By").state = 1;
filters
  .find((filter) => filter.name === "Genre")
  .state.find((option) => option.value === "yuri").state = true;
const filteredResults = await extension.search("rock", 2, filters);
assert.equal(filteredResults.list.length, 1);
const filteredSearch = new URL(requests.at(-1).url);
assert.equal(filteredSearch.pathname, "/gl-genre/yuri/page/2/");
assert.equal(filteredSearch.searchParams.get("s"), "rock");
assert.equal(filteredSearch.searchParams.get("m_orderby"), "latest");

const tabResults = await extension.getCustomList(
  "search_tab:romance:rock%20music",
  1,
);
assert.equal(tabResults.list[0].name, "Rock It Girl");
const tabSearch = new URL(requests.at(-1).url);
assert.equal(tabSearch.pathname, "/gl-genre/romance/");
assert.equal(tabSearch.searchParams.get("s"), "rock music");

// The app's live search box calls getCustomList with a "search_preview:" id.
const previewResults = await extension.getCustomList(
  "search_preview:rock%20%26%20roll",
  1,
);
assert.equal(previewResults.list[0].name, "Rock It Girl");
const previewSearch = new URL(requests.at(-1).url);
assert.equal(previewSearch.pathname, "/");
assert.equal(previewSearch.searchParams.get("s"), "rock & roll");
assert.equal(previewSearch.searchParams.get("post_type"), "wp-manga");

const newManga = await extension.getCustomList("new_manga", 1);
assert.equal(newManga.list[0].name, "Rock It Girl");
const newMangaSearch = new URL(requests.at(-1).url);
assert.equal(newMangaSearch.searchParams.get("m_orderby"), "new-manga");

const spotlight = await extension.getCustomList("spotlight", 1);
assert.deepEqual(
  Array.from(spotlight.list, (item) => item.name),
  ["Featured One", "Featured Two"],
);

const detail = await extension.getDetail(detailUrl);
assert.equal(detail.name, "Example Manga");
assert.equal(detail.chapters.length, 4);
assert.deepEqual(
  Array.from(detail.chapters, (chapter) => chapter.name),
  [
    "Chapter 2 - Latest",
    "Chapter 1 - Start",
    "Vol.02 - Chapter 440",
    "[Season 03] Episode 114",
  ],
);
assert.ok(
  detail.chapters.every(
    (chapter) =>
      chapter.url.startsWith("https://lilymanga.net/") &&
      !/read first|read last|mangabuddy/i.test(chapter.name),
  ),
);
// Volume- and season-prefixed slugs must survive parsing, not just bare
// "chapter-N"/"episode-N" URLs.
assert.ok(
  detail.chapters.some((chapter) => /vol-02-chapter-440/.test(chapter.url)),
);
assert.ok(
  detail.chapters.some((chapter) => /season-03-episode-114/.test(chapter.url)),
);
const chapterRequest = requests.find((request) => request.method === "POST");
assert.equal(
  chapterRequest.url,
  `${detailUrl}ajax/chapters/?t=1`,
);
assert.equal(chapterRequest.headers["X-Requested-With"], "XMLHttpRequest");
assert.equal(chapterRequest.body, null);

const pages = await extension.getPageList(latestChapterUrl);
assert.deepEqual(
  Array.from(pages),
  [
    "https://img.lilymanga.net/page-1.webp",
    "https://img.lilymanga.net/page-2.webp",
  ],
);

const layout = JSON.parse(
  fs.readFileSync(path.join(root, "ui-layouts/lilymanga.json"), "utf8"),
);
const heroSections = layout.home.sections.filter(
  (section) => section.component === "spotlight" || section.component === "carousel",
);
assert.equal(heroSections.length, 1);
assert.equal(heroSections[0].id, "spotlight");
assert.deepEqual(
  layout.browse.search.tabs.map((tab) => tab.id),
  ["all", "yuri", "romance", "fantasy", "drama"],
);
assert.equal(layout.browse.search.searchPreview, true);
assert.ok(
  layout.home.sections
    .filter((section) => section.id.startsWith("genre_"))
    .every((section) => section.component === "compactRow"),
);
// Every declared section must resolve to a real getCustomList id.
assert.deepEqual(
  layout.home.sections.map((section) => section.id),
  [
    "spotlight",
    "popular",
    "latest_updates",
    "new_manga",
    "top_rated",
    "genre_yuri",
    "genre_romance",
    "genre_fantasy",
    "genre_drama",
  ],
);

const index = JSON.parse(
  fs.readFileSync(path.join(root, "index/manga.json"), "utf8"),
);
const catalogEntry = index.find((entry) => entry.id === 2000000051);
assert.equal(catalogEntry.version, sources[0].version);
assert.equal(catalogEntry.uiLayout, "ui-layouts/lilymanga.json");
assert.equal(catalogEntry.uiLayoutVersion, "1.2.0");

console.log("Lily Manga unit checks passed: search, genre tabs, chapters, reader, and layout.");
