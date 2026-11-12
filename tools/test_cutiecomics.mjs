import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requests = [];

const BASE = "https://cutiecomics.com";

function card(id, title, slug, img) {
  return `
    <div class="w25" style="text-align: center;">
      <div class="views-field views-field-title">
        <strong class="field-content"><a href="${BASE}/${id}-${slug}.html">${title}</a></strong>
      </div>
      <div class="views-field views-field-field-preview">
        <div class="field-content scale">
          <a href="${BASE}/${id}-${slug}.html"><img src="${img}" width="409" height="547" alt="${title}"></a>
        </div>
      </div>
    </div>`;
}

const listingHtml = `
  <div id="dle-content">
    ${card(22994, "The Person I Let My Wife Sleep With", "the-person", "/uploads/posts/2026-11/1_1.webp")}
    ${card(22993, "For Some Reason This Thicc Beauty", "for-some-reason", "/uploads/posts/2026-11/2_1.webp")}
    ${card(22992, "Uninvited Big Breasted Gal Harem", "uninvited", "/uploads/posts/2026-11/3_1.webp")}
  </div>
  <div class="dpad basenavi"><div class="bnnavi"><div class="navigation">
    <div class="no"><span>1</span>
      <a href="${BASE}/milf/page/2/">2</a>
      <a href="${BASE}/milf/page/3/">3</a>
    </div>
    <a href="${BASE}/milf/page/2/"><i class="fa fa-angle-right"></i></a>
  </div></div></div>`;

const searchHtml = `
  <div id="dle-content">
    <div class="search_results">Found 71 responses (Query results 1 - 20) :</div>
    ${card(22931, "The Perverted MILF Who Stayed A Model Student", "perverted-milf", "/uploads/posts/2026-10/a_1.webp")}
    ${card(22630, "Milf Next Door", "milf-next-door", "/uploads/posts/2026-10/b_1.webp")}
  </div>
  <div class="navigation"><div class="no">
    <span>1</span>
    <a onclick="javascript:list_submit(2); return(false)" href="#">2</a>
  </div></div>`;

const detailHtml = `
  <h1 class="title" id="page-title">The Person I Let My Wife Sleep With</h1>
  <article id="node-12954" class="node node-comics node-full clearfix" role="article">
    <div class="field field-name-field-com-group">
      <h3 class="field-label">Categories: </h3>
      <a href="${BASE}/milf/">MILF</a>
      <a href="${BASE}/incest/">Incest</a>
    </div>
    <div class="field field-name-field-vote">
      <div class="meta-data"><p class="views">132 views</p></div>
    </div>
    <div class="field field-name-field-com-pages field-type-image">
      <div class="juicebox-parent">
        <div id="field--node--12954--field-com-pages--full" class="juicebox-container">
          <div class="xfieldimagegallery galery">
            <img src="/uploads/posts/2026-11/thumbs/1794393868_1.jpg" alt=""><br>
            <img src="/uploads/posts/2026-11/thumbs/1794393846_2.jpg" alt=""><br>
            <img src="/uploads/posts/2026-11/thumbs/1794393798_3.jpg" alt="">
          </div>
        </div>
      </div>
    </div>
  </article>`;

class Client {
  async get(url, headers) {
    requests.push({ method: "GET", url, headers });
    if (url === `${BASE}/`) return { body: listingHtml };
    if (url === `${BASE}/milf/`) return { body: listingHtml };
    if (url === `${BASE}/milf/page/2/`) return { body: listingHtml };
    if (url === `${BASE}/22994-the-person.html`) return { body: detailHtml };
    return { body: listingHtml };
  }

  async post(url, headers, body) {
    requests.push({ method: "POST", url, headers, body });
    if (body && /story=milf/i.test(body)) return { body: searchHtml };
    return { body: searchHtml };
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
  path.join(root, "src/nsfw/manga/en/cutiecomics.js"),
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
  { filename: "cutiecomics.js", timeout: 8000 },
);

const { sources, DefaultExtension } = sandbox.__exports;
const extension = new DefaultExtension();
extension.source = sources[0];

assert.equal(sources[0].version, "1.0.0");
assert.equal(sources[0].baseUrl, BASE);
assert.equal(sources[0].isNsfw, true);
assert.equal(sources[0].uiLayout, "ui-layouts/cutiecomics.json");

// ── Listing ─────────────────────────────────────────────────────────────────
const latest = await extension.getLatestUpdates(1);
assert.equal(latest.list.length, 3);
assert.equal(latest.list[0].name, "The Person I Let My Wife Sleep With");
assert.equal(latest.list[0].link, `${BASE}/22994-the-person.html`);
assert.equal(latest.list[0].imageUrl, `${BASE}/uploads/posts/2026-11/1_1.webp`);
assert.equal(latest.hasNextPage, true);

// ── Search: real (>= 4 chars) POST search ───────────────────────────────────
const search = await extension.search("milf", 1, []);
assert.equal(search.list.length, 2);
assert.equal(search.list[0].name, "The Perverted MILF Who Stayed A Model Student");
const postRequest = requests.find(
  (request) => request.method === "POST" && /story=milf/.test(request.body || ""),
);
assert.ok(postRequest, "search must POST to the DLE search endpoint");
assert.equal(postRequest.url, `${BASE}/index.php?do=search`);
assert.match(postRequest.headers["Content-Type"], /urlencoded/);
assert.match(postRequest.body, /do=search/);
assert.match(postRequest.body, /subaction=search/);
assert.match(postRequest.body, /full_search=1/);
assert.match(postRequest.body, /search_start=1/);
assert.match(postRequest.body, /result_from=1/);

// ── Search: pagination offsets ──────────────────────────────────────────────
await extension.search("milf", 3, []);
const pagedRequest = requests.at(-1);
assert.match(pagedRequest.body, /search_start=3/);
assert.match(pagedRequest.body, /result_from=41/);

// ── Search: too-short queries fall back to a client-side filter ─────────────
const shortSearch = await extension.search("mil", 1, []);
assert.equal(shortSearch.hasNextPage, false);
assert.ok(
  shortSearch.list.every((item) => /mil/i.test(item.name)),
  "short query must be filtered locally",
);

// ── Filters: sort + category are forwarded to the POST body ─────────────────
const filters = extension.getFilterList();
const sortFilter = filters.find((filter) => filter.name === "Sort By");
sortFilter.state = 1; // Most Viewed
const categoryFilter = filters.find((filter) => filter.name === "Category");
categoryFilter.state = categoryFilter.values.findIndex(
  (option) => option.value === "19", // MILF
);
await extension.search("milf", 1, filters);
const filteredRequest = requests.at(-1);
assert.match(filteredRequest.body, /sortby=news_read/);
assert.match(filteredRequest.body, /resorder=desc/);
assert.match(filteredRequest.body, /catlist\[\]=19/);

// ── Popular uses the sorted global search, not the home page ────────────────
await extension.getPopular(1);
const popularRequest = requests.at(-1);
assert.match(popularRequest.body, /sortby=news_read/);
assert.match(popularRequest.body, /story=____/);

// ── Custom lists used by the layout ─────────────────────────────────────────
const spotlight = await extension.getCustomList("spotlight", 1);
assert.ok(spotlight.list.length > 0 && spotlight.list.length <= 6);
assert.equal(spotlight.hasNextPage, false);

const categoryShelf = await extension.getCustomList("category_milf", 2);
assert.equal(requests.at(-1).url, `${BASE}/milf/page/2/`);
assert.ok(categoryShelf.list.length > 0);

const preview = await extension.getCustomList("search_preview:milf", 1);
assert.ok(preview.list.length > 0);

const tab = await extension.getCustomList("search_tab:milf:milf", 1);
const tabRequest = requests.at(-1);
assert.equal(tabRequest.method, "POST");
assert.match(tabRequest.body, /catlist\[\]=19/);

// ── Detail + reader ─────────────────────────────────────────────────────────
const detail = await extension.getDetail(`${BASE}/22994-the-person.html`);
assert.equal(detail.name, "The Person I Let My Wife Sleep With");
assert.deepEqual(Array.from(detail.genre), ["MILF", "Incest"]);
assert.equal(detail.chapters.length, 1);
assert.equal(detail.chapters[0].url, `${BASE}/22994-the-person.html`);
assert.match(detail.description, /Pages: 3/);
assert.equal(
  detail.imageUrl,
  `${BASE}/uploads/posts/2026-11/thumbs/1794393868_1.jpg`,
);

const pages = await extension.getPageList(`${BASE}/22994-the-person.html`);
assert.deepEqual(Array.from(pages), [
  `${BASE}/uploads/posts/2026-11/thumbs/1794393868_1.jpg`,
  `${BASE}/uploads/posts/2026-11/thumbs/1794393846_2.jpg`,
  `${BASE}/uploads/posts/2026-11/thumbs/1794393798_3.jpg`,
]);

// ── Layout contract ─────────────────────────────────────────────────────────
const layout = JSON.parse(
  fs.readFileSync(path.join(root, "ui-layouts/cutiecomics.json"), "utf8"),
);
const heroes = layout.home.sections.filter(
  (section) => section.component === "spotlight" || section.component === "carousel",
);
assert.equal(heroes.length, 1);
assert.equal(heroes[0].id, "spotlight");
assert.equal(layout.browse.search.searchPreview, true);
// Every declared home section id must resolve in getCustomList.
for (const section of layout.home.sections) {
  const result = await extension.getCustomList(section.id, 1);
  assert.ok(Array.isArray(result.list), `section ${section.id} must resolve`);
}

// ── Catalogue entry ─────────────────────────────────────────────────────────
const index = JSON.parse(
  fs.readFileSync(path.join(root, "index/manga.json"), "utf8"),
);
const entry = index.find((item) => item.name === "Cutie Comics");
assert.ok(entry, "Cutie Comics must be present in index/manga.json");
assert.equal(entry.version, sources[0].version);
assert.equal(entry.itemType, 0);
assert.equal(entry.isNsfw, true);
assert.equal(entry.uiLayout, "ui-layouts/cutiecomics.json");
assert.ok(
  (entry.tags || []).includes("read"),
  "catalogue entry must carry the read content tag",
);

console.log(
  "Cutie Comics unit checks passed: search, filters, shelves, reader, and layout.",
);
