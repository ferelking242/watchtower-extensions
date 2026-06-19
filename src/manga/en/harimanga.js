const watchtowerSources = [
  {
    "id": 178905360,
    "name": "Harimanga",
    "lang": "en",
    "baseUrl": "https://www.harimanga.co.uk",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/dart/manga/multisrc/madara/src/en/harimanga/icon.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.2.5",
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

  // Resolve a potentially relative URL against the base
  resolveUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = this.getBaseUrl();
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return base + url;
    return base + "/" + url;
  }

  parseMangaFromPageItem(el) {
    const imgEl = el.selectFirst("img");

    // ── Image URL ─────────────────────────────────────────────────────────
    let imageUrl = "";
    if (imgEl) {
      const src      = imgEl.attr("src")         || "";
      const dataSrc  = imgEl.attr("data-src")    || "";
      const backup   = imgEl.attr("data-backup") || "";
      const candidates = [src, dataSrc, backup];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (c && !c.startsWith("data:")) {
          imageUrl = this.resolveUrl(c);
          break;
        }
      }
    }

    // ── Title & Link ──────────────────────────────────────────────────────
    // The site injects a <span class="manga-title-badges hot">HOT</span>
    // before the actual <a> inside h3.h5. Some QuickJS DOM builds return
    // the h3 text (which includes "HOT") when asked for the first <a> in
    // div.post-title. Use a more specific path first.
    let titleEl = el.selectFirst("h3.h5 a")
      || el.selectFirst("div.post-title h3 a")
      || el.selectFirst("div.post-title a");

    let name = titleEl ? (titleEl.attr("title") || "").trim() : "";
    if (!name && titleEl) name = (titleEl.text || "").replace(/\b(HOT|NEW|UPDATE|COMPLETED?)\b\s*/gi, "").trim();

    // Fallback: derive title from img alt (e.g. "Manga Name on HariManga")
    if (!name && imgEl) {
      const alt = imgEl.attr("alt") || imgEl.attr("title") || "";
      name = alt.replace(/\s+on\s+HariManga$/i, "").trim();
    }

    let link = titleEl ? titleEl.getHref || titleEl.attr("href") || "" : "";
    link = this.resolveUrl(link);

    // Fallback link from item-thumb data-post-slug
    if (!link) {
      const thumb = el.selectFirst("[data-post-slug]");
      if (thumb) {
        const slug = thumb.attr("data-post-slug") || "";
        if (slug) link = this.getBaseUrl() + "/manga/" + slug;
      }
    }

    return { name, imageUrl, link };
  }

  async getPopular(page) {
    const baseUrl = this.getBaseUrl();
    const res = await new Client().get(
      `${baseUrl}/manga/page/${page}/?m_orderby=views`,
      this.getHeaders()
    );
    const doc = new Document(res.body);
    const items = doc.select("div.page-item-detail");
    const list = items.map((el) => this.parseMangaFromPageItem(el));
    return { list, hasNextPage: list.length > 0 };
  }

  async getLatestUpdates(page) {
    const baseUrl = this.getBaseUrl();
    const res = await new Client().get(
      `${baseUrl}/manga/page/${page}/?m_orderby=latest`,
      this.getHeaders()
    );
    const doc = new Document(res.body);
    const items = doc.select("div.page-item-detail");
    const list = items.map((el) => this.parseMangaFromPageItem(el));
    return { list, hasNextPage: list.length > 0 };
  }

  async search(query, page, filters) {
    const baseUrl = this.getBaseUrl();
    const res = await new Client().get(
      `${baseUrl}/?s=${encodeURIComponent(query)}&post_type=wp-manga&paged=${page}`,
      this.getHeaders()
    );
    const doc = new Document(res.body);
    const items = doc.select("div.manga-item");
    const list = items.map((el) => {
      const anchor = el.selectFirst("a");
      const link = anchor ? this.resolveUrl(anchor.getHref || anchor.attr("href") || "") : "";
      const imgEl = el.selectFirst("img");
      const rawAlt = imgEl ? (imgEl.attr("alt") || "") : "";
      const name = rawAlt.replace(/ on HariManga$/i, "").trim();
      let imageUrl = "";
      if (imgEl) {
        const src     = imgEl.attr("src")      || "";
        const dataSrc = imgEl.attr("data-src") || "";
        imageUrl = this.resolveUrl(src.startsWith("http") ? src : (dataSrc || src));
      }
      return { name, imageUrl, link };
    });
    return { list, hasNextPage: false };
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

    // ── Cover image ───────────────────────────────────────────────────────
    const imgEl = doc.selectFirst("div.summary_image img");
    let imageUrl = "";
    if (imgEl) {
      const candidates = [
        imgEl.attr("src") || "",
        imgEl.attr("data-src") || "",
        imgEl.attr("data-backup") || "",
      ];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (c && !c.startsWith("data:")) {
          imageUrl = this.resolveUrl(c);
          break;
        }
      }
    }

    // ── Title ─────────────────────────────────────────────────────────────
    const titleEl = doc.selectFirst("div.post-title h1");
    const name = titleEl
      ? ((titleEl.attr("title") || "").trim() ||
         (titleEl.text || "").replace(/\b(HOT|NEW|UPDATE|COMPLETED?)\b\s*/gi, "").trim())
      : "";

    // ── Description ───────────────────────────────────────────────────────
    const descEl = doc.selectFirst("div.summary__content")
      || doc.selectFirst("div.description-summary");
    let description = "";
    if (descEl) {
      description = descEl.text
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+|\s+$/g, "")
        .trim();
    }

    // ── Genres ────────────────────────────────────────────────────────────
    const genre = doc.select(".genres-content a").map((el) => el.text.trim());

    // ── Status ────────────────────────────────────────────────────────────
    let status = 5;
    const postItems = doc.select(".post-content_item");
    for (let i = 0; i < postItems.length; i++) {
      const h = postItems[i].selectFirst(".summary-heading h5");
      if (h && h.text.trim().toLowerCase() === "status") {
        const sc = postItems[i].selectFirst(".summary-content");
        status = this.toStatus(sc ? sc.text : "");
        break;
      }
    }

    // ── Chapters (via API) ────────────────────────────────────────────────
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

    // Fallback: regex scan for CDN image URLs in the page body
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

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "harimanga_base_url",
      "editTextPreference": {
        "title": "Override BaseUrl",
        "summary": BASE_URL,
        "value": BASE_URL,
        "dialogTitle": "Override BaseUrl",
        "dialogMessage": `Default: ${BASE_URL}`,
      },
    }];
  }
      getCustomLists() {
          return [
          { id: "popular", name: "Popular" },
        { id: "latest", name: "Latest Updates" },
          ];
      }

      async getCustomList(listId, page) {
          if (listId === "popular") {
              const baseUrl = this.getBaseUrl();
              const res = await new Client().get(`${baseUrl}/manga/page/${page}/?m_orderby=trending`, this.getHeaders());
              const doc = new Document(res.body);
              const list = [];
              for (const el of doc.select(".page-item-detail")) {
                  const a = el.selectFirst("h3.h5 a") ?? el.selectFirst("a[href]");
                  const nameEl = el.selectFirst("a[title]");
                  const name = nameEl?.attr("title") ?? a?.text ?? "";
                  const link = a?.getHref ?? "";
                  const img = el.selectFirst("img")?.getSrc ?? "";
                  if (name && link) list.push({ name, imageUrl: img, link });
              }
              return { list, hasNextPage: true };
          }
          return this.getLatestUpdates(page);
      }
  
}
