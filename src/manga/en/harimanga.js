const watchtowerSources = [
  {
    "id": 178905360,
    "name": "Harimanga",
    "lang": "en",
    "baseUrl": "https://www.harimanga.co.uk",
    "apiUrl": "",
    "iconUrl": "https://www.harimanga.co.uk/image/icon/hari-icon-192x192.webp",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.4.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "",
    "pkgPath": "manga/src/en/harimanga.js",
    "isManga": true,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "",
    "requiresAccount": false,
    "hasDRM": false,
  },
];

// ── NOTE v0.4.0 ─────────────────────────────────────────────────────────────
// HariManga migrated away from WordPress/Madara in mid-2026.
//
// OLD (broken):  /?post_type=wp-manga&m_orderby=views&paged=N  → landing page
// NEW (working): /manga?m_orderby=views  (page 1)
//                /manga/page/N?m_orderby=views  (page 2+)
//
// Search stays on the /home route (still Madara-powered) but results are in
// div[role="tabpanel"].c-tabs-item, NOT in div.page-item-detail.
//
// Pagination in browse uses:  <a aria-label="Next" class="page-link custom function">
// ────────────────────────────────────────────────────────────────────────────

const BASE_URL = "https://www.harimanga.co.uk";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

class DefaultExtension extends MProvider {
  getBaseUrl() {
    return new SharedPreferences().get("harimanga_base_url") || BASE_URL;
  }

  getHeaders() {
    const base = this.getBaseUrl();
    return {
      "User-Agent": UA,
      "Referer": base + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
  }

  // Build the browse URL for page N with a given m_orderby value.
  // Page 1 → /manga?m_orderby=X
  // Page N → /manga/page/N?m_orderby=X
  _browseUrl(baseUrl, page, orderby) {
    const pageSegment = page > 1 ? `/page/${page}` : "";
    return `${baseUrl}/manga${pageSegment}?m_orderby=${orderby}`;
  }

  // Resolve a potentially relative URL against the base
  resolveUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = this.getBaseUrl();
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return base + url;
    return base + "/" + url;
  }

  // ── Browse page parser (div.page-item-detail) ─────────────────────────────
  // Used by getPopular / getLatestUpdates / getCustomList
  parseMangaFromPageItem(el) {
    const imgEl = el.selectFirst("img");

    let imageUrl = "";
    if (imgEl) {
      const src     = imgEl.attr("src")         || "";
      const dataSrc = imgEl.attr("data-src")    || "";
      const backup  = imgEl.attr("data-backup") || "";
      for (const c of [src, dataSrc, backup]) {
        if (c && !c.startsWith("data:")) { imageUrl = this.resolveUrl(c); break; }
      }
    }

    let titleEl = el.selectFirst("h3.h5 a")
      || el.selectFirst("div.post-title h3 a")
      || el.selectFirst("div.post-title a");

    let name = titleEl ? (titleEl.attr("title") || "").trim() : "";
    if (!name && titleEl) name = (titleEl.text || "").replace(/\b(HOT|NEW|UPDATE|COMPLETED?)\b\s*/gi, "").trim();
    if (!name && imgEl) {
      const alt = imgEl.attr("alt") || imgEl.attr("title") || "";
      name = alt.replace(/\s+on\s+HariManga$/i, "").trim();
    }

    let link = titleEl ? (titleEl.getHref || titleEl.attr("href") || "") : "";
    link = this.resolveUrl(link);

    if (!link) {
      const thumb = el.selectFirst("[data-post-slug]");
      if (thumb) {
        const slug = thumb.attr("data-post-slug") || "";
        if (slug) link = this.getBaseUrl() + "/manga/" + slug;
      }
    }

    return { name, imageUrl, link };
  }

  // ── Search result parser (div[role="tabpanel"].c-tabs-item) ───────────────
  // The /home search route still uses the Madara WP layout but renders results
  // inside .c-tabs-item cards (not .page-item-detail).
  parseMangaFromSearchItem(el) {
    // Image: inside .tab-thumb img
    const imgEl = el.selectFirst("div.tab-thumb img");
    let imageUrl = "";
    if (imgEl) {
      const dataSrc = imgEl.attr("data-src") || "";
      const src     = imgEl.attr("src")      || "";
      for (const c of [dataSrc, src]) {
        if (c && !c.startsWith("data:")) { imageUrl = this.resolveUrl(c); break; }
      }
    }

    // Title & link: .tab-summary h3 a  (or h4 a as fallback)
    const titleEl = el.selectFirst("div.tab-summary div.post-title h3 a")
      || el.selectFirst("div.tab-summary h3 a")
      || el.selectFirst("div.tab-summary h4 a")
      || el.selectFirst("div.tab-summary a");

    const name = titleEl ? (titleEl.text || "").trim() : "";
    const link = titleEl ? this.resolveUrl(titleEl.getHref || titleEl.attr("href") || "") : "";

    return { name, imageUrl, link };
  }

  async getPopular(page) {
    const baseUrl = this.getBaseUrl();
    const url = this._browseUrl(baseUrl, page, "views");
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const items = doc.select("div.page-item-detail");
    const list = [];
    for (let i = 0; i < items.length; i++) {
      const parsed = this.parseMangaFromPageItem(items[i]);
      if (parsed.name && parsed.link) list.push(parsed);
    }
    // New pagination: <a aria-label="Next" class="page-link custom function">
    const hasNextPage = !!doc.selectFirst("a[aria-label='Next']") || list.length >= 12;
    return { list, hasNextPage };
  }

  async getLatestUpdates(page) {
    const baseUrl = this.getBaseUrl();
    const url = this._browseUrl(baseUrl, page, "latest");
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const items = doc.select("div.page-item-detail");
    const list = [];
    for (let i = 0; i < items.length; i++) {
      const parsed = this.parseMangaFromPageItem(items[i]);
      if (parsed.name && parsed.link) list.push(parsed);
    }
    const hasNextPage = !!doc.selectFirst("a[aria-label='Next']") || list.length >= 12;
    return { list, hasNextPage };
  }

  // Build a filter-aware search URL for the /home Madara route
  _buildSearchUrl(baseUrl, query, page, filters) {
    let sortBy = "latest";
    let status = "";
    const genres = [];

    if (filters && filters.length > 0) {
      for (let i = 0; i < filters.length; i++) {
        const f = filters[i];
        if (!f) continue;
        if (f.type_name === "SelectFilter" && f.name === "Sort By") {
          const vals = Array.from(f.values || []);
          sortBy = (vals[f.state] || {}).value || "latest";
        } else if (f.type_name === "SelectFilter" && f.name === "Status") {
          const vals = Array.from(f.values || []);
          status = (vals[f.state] || {}).value || "";
        } else if (f.type_name === "GroupFilter" && f.name === "Genre") {
          const items = Array.from(f.state || []);
          for (let j = 0; j < items.length; j++) {
            if (items[j] && items[j].state === true) genres.push(items[j].value);
          }
        }
      }
    }

    // The /home route remains on Madara and handles keyword search + filters
    let url = `${baseUrl}/home?post_type=wp-manga&paged=${page}`;
    if (query && query.trim()) url += `&s=${encodeURIComponent(query.trim())}`;
    if (sortBy) url += `&m_orderby=${sortBy}`;
    if (status) url += `&status[]=${status}`;
    for (let k = 0; k < genres.length; k++) url += `&genre[]=${encodeURIComponent(genres[k])}`;
    return url;
  }

  async search(query, page, filters) {
    const baseUrl = this.getBaseUrl();
    const url = this._buildSearchUrl(baseUrl, query, page, filters);
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);

    const list = [];

    // Primary: search results use .c-tabs-item cards
    let items = doc.select("div[role='tabpanel'].c-tabs-item");
    if (!items || items.length === 0) items = doc.select("div.c-tabs-item");

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const parsed = this.parseMangaFromSearchItem(items[i]);
        if (parsed.name && parsed.link) list.push(parsed);
      }
    } else {
      // Fallback: browse page layout (can appear on genre/filter-only searches)
      const browseItems = doc.select("div.page-item-detail");
      for (let i = 0; i < browseItems.length; i++) {
        const parsed = this.parseMangaFromPageItem(browseItems[i]);
        if (parsed.name && parsed.link) list.push(parsed);
      }
    }

    const hasNextPage = !!doc.selectFirst("a.next.page-numbers");
    return { list, hasNextPage };
  }

  toStatus(text) {
    const s = (text || "").toLowerCase().trim();
    if (s.includes("ongoing") || s.includes("on going")) return 0;
    if (s.includes("completed") || s.includes("finished")) return 1;
    if (s.includes("hiatus") || s.includes("on hold")) return 2;
    if (s.includes("dropped") || s.includes("cancelled") || s.includes("canceled")) return 3;
    return 5;
  }

  getMangaSlugFromUrl(url) {
    return url.replace(/.*\/manga\//, "").replace(/\/+$/, "");
  }

  async getDetail(url) {
    const baseUrl = this.getBaseUrl();
    const slug = this.getMangaSlugFromUrl(url);
    const res = await new Client().get(
      `${baseUrl}/manga/${slug}/`,
      this.getHeaders()
    );
    const doc = new Document(res.body);

    // Cover image
    const imgEl = doc.selectFirst("div.summary_image img");
    let imageUrl = "";
    if (imgEl) {
      for (const c of [imgEl.attr("src") || "", imgEl.attr("data-src") || "", imgEl.attr("data-backup") || ""]) {
        if (c && !c.startsWith("data:")) { imageUrl = this.resolveUrl(c); break; }
      }
    }

    // Title
    const titleEl = doc.selectFirst("div.post-title h1");
    const name = titleEl
      ? ((titleEl.attr("title") || "").trim() ||
         (titleEl.text || "").replace(/\b(HOT|NEW|UPDATE|COMPLETED?)\b\s*/gi, "").trim())
      : "";

    // Description
    const descEl = doc.selectFirst("div.summary__content")
      || doc.selectFirst("div.description-summary");
    let description = "";
    if (descEl) {
      description = (descEl.text || "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    // Genres
    const genre = doc.select(".genres-content a").map((el) => (el.text || "").trim());

    // Status
    let status = 5;
    const postItems = doc.select(".post-content_item");
    for (let i = 0; i < postItems.length; i++) {
      const h = postItems[i].selectFirst(".summary-heading h5");
      if (h && (h.text || "").trim().toLowerCase() === "status") {
        const sc = postItems[i].selectFirst(".summary-content");
        status = this.toStatus(sc ? sc.text : "");
        break;
      }
    }

    // Chapters via the custom JSON API (unchanged — still works)
    const chapters = [];
    let apiPage = 1;
    let lastPage = 1;
    do {
      const apiRes = await new Client().get(
        `${baseUrl}/api/comics/${slug}/chapters?per_page=100&page=${apiPage}`,
        {
          "User-Agent": UA,
          "Referer": baseUrl + "/",
          "Accept": "application/json",
        }
      );
      let data;
      try { data = JSON.parse(apiRes.body); } catch (_) { break; }
      if (!data || !data.success || !data.data) break;
      lastPage = data.data.last_page || 1;
      const chs = data.data.chapters || [];
      for (let j = 0; j < chs.length; j++) {
        const ch = chs[j];
        const dateMs = ch.updated_at ? String(new Date(ch.updated_at).getTime()) : "";
        chapters.push({
          name: ch.chapter_name,
          url: `${baseUrl}/manga/${slug}/${ch.chapter_slug}`,
          dateUpload: dateMs,
        });
      }
      apiPage++;
    } while (apiPage <= lastPage);

    return { name, imageUrl, description, genre, status, chapters };
  }

  async getPageList(url) {
    const baseUrl = this.getBaseUrl();
    const headers = {
      "User-Agent": UA,
      "Referer": baseUrl + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    };

    const res = await new Client().get(url, headers);
    const doc = new Document(res.body);

    const imgEls = doc.select(".wp-manga-chapter-img");
    if (imgEls.length > 0) {
      const seen = {};
      const pages = [];
      for (let i = 0; i < imgEls.length; i++) {
        const src = imgEls[i].attr("data-src") || imgEls[i].attr("src") || "";
        const resolved = this.resolveUrl(src.trim());
        if (resolved && !(resolved in seen)) {
          seen[resolved] = 1;
          pages.push(resolved);
        }
      }
      if (pages.length > 0) return pages;
    }

    // Fallback: regex scan for CDN image URLs in page body
    // HariManga uses zinmanga1.com CDN (updated from zinmanga.com)
    const seen = {};
    const pages = [];
    const body = res.body;
    const re = /https?:\/\/[^\s"'<>]*(?:zinmanga\d*\.com|2xstorage\.com)\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png)/g;
    let m = re.exec(body);
    while (m !== null) {
      const imgUrl = m[0];
      if (!(imgUrl in seen) && imgUrl.indexOf("/thumb/") === -1) {
        seen[imgUrl] = 1;
        pages.push(imgUrl);
      }
      m = re.exec(body);
    }
    return pages;
  }

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort By",
        state: 0,
        values: [
          ["Most Popular", "views"],
          ["Trending",      "trending"],
          ["Latest",        "latest"],
          ["A–Z",           "alphabet"],
          ["Rating",        "rating"],
          ["New",           "new-manga"],
        ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
      },
      {
        type_name: "SelectFilter",
        name: "Status",
        state: 0,
        values: [
          ["All",       ""],
          ["Ongoing",   "ongoing"],
          ["Completed", "end"],
          ["Hiatus",    "hiatus"],
          ["Canceled",  "canceled"],
        ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
      },
      {
        type_name: "GroupFilter",
        name: "Genre",
        state: [
          ["Action",        "action"],
          ["Adventure",     "adventure"],
          ["Comedy",        "comedy"],
          ["Drama",         "drama"],
          ["Fantasy",       "fantasy"],
          ["Historical",    "historical"],
          ["Horror",        "horror"],
          ["Isekai",        "isekai"],
          ["Josei",         "josei"],
          ["Manhua",        "manhua"],
          ["Manhwa",        "manhwa"],
          ["Martial Arts",  "martial-arts"],
          ["Mature",        "mature"],
          ["Mecha",         "mecha"],
          ["Mystery",       "mystery"],
          ["Psychological", "psychological"],
          ["Romance",       "romance"],
          ["School Life",   "school-life"],
          ["Sci-Fi",        "sci-fi"],
          ["Seinen",        "seinen"],
          ["Shoujo",        "shoujo"],
          ["Shounen",       "shounen"],
          ["Slice of Life", "slice-of-life"],
          ["Sports",        "sports"],
          ["Supernatural",  "supernatural"],
          ["Thriller",      "thriller"],
          ["Tragedy",       "tragedy"],
          ["Webtoon",       "webtoon"],
        ].map((x) => ({ type_name: "CheckBox", name: x[0], value: x[1], state: false })),
      },
    ];
  }

  getSourcePreferences() {
    return [
      {
        "key": "harimanga_base_url",
        "editTextPreference": {
          "title": "Override BaseUrl",
          "summary": BASE_URL,
          "value": BASE_URL,
          "dialogTitle": "Override BaseUrl",
          "dialogMessage": `Default: ${BASE_URL}`,
        },
      },
      {
        "key": "harimanga_reader_mode",
        "listPreference": {
          "title": "Default reader mode",
          "summary": "Choose the default reading direction for this source",
          "valueIndex": 0,
          "entries": ["Left to Right", "Right to Left", "Vertical", "Webtoon"],
          "entryValues": ["ltr", "rtl", "vertical", "webtoon"],
        },
      },
    ];
  }

  async getCustomList(listId, page) {
    const baseUrl = this.getBaseUrl();
    // Map each section to Madara query params
    const orderMap  = { popular: "views", latest: "latest", new: "new-manga", completed: "latest" };
    const statusMap = { completed: "end" };
    const order  = orderMap[listId]  || "latest";
    const status = statusMap[listId] || "";

    // Use the same _browseUrl helper — avoids the trailing-slash 301 redirect
    let url = this._browseUrl(baseUrl, page, order);
    if (status) url += `&status[]=${status}`;

    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const items = doc.select("div.page-item-detail");
    const list = [];
    for (let i = 0; i < items.length; i++) {
      const parsed = this.parseMangaFromPageItem(items[i]);
      if (parsed.name && parsed.link) list.push(parsed);
    }
    const hasNextPage = !!doc.selectFirst("a[aria-label='Next']") || list.length >= 12;
    return { list, hasNextPage };
  }
}
