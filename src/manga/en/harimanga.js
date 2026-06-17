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
    "version": "0.2.0",
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

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
  }

  getBaseUrl() {
    return new SharedPreferences().get("harimanga_override_base_url") || this.source.baseUrl;
  }

  getHeaders() {
    return { "Referer": this.getBaseUrl() + "/" };
  }

  parseMangaFromPageItem(el) {
    const titleEl = el.selectFirst("div.post-title a");
    const imgEl = el.selectFirst("img");
    const name = titleEl ? titleEl.text.trim() : "";
    const link = titleEl ? titleEl.getHref : "";
    const imageUrl = imgEl
      ? (imgEl.attr("data-src") || imgEl.getSrc || "")
      : "";
    return { name, imageUrl, link };
  }

  async getPopular(page) {
    const baseUrl = this.getBaseUrl();
    const res = await this.client.get(
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
    const res = await this.client.get(
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
    const encodedQuery = encodeURIComponent(query);
    const res = await this.client.get(
      `${baseUrl}/?s=${encodedQuery}&post_type=wp-manga&paged=${page}`,
      this.getHeaders()
    );
    const doc = new Document(res.body);
    const items = doc.select("div.manga-item");
    const list = items.map((el) => {
      const anchor = el.selectFirst("a");
      const link = anchor ? anchor.getHref : "";
      const imgEl = el.selectFirst("img");
      const rawAlt = imgEl ? (imgEl.attr("alt") || "") : "";
      const name = rawAlt.replace(/ on HariManga$/i, "").trim();
      const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";
      return { name, imageUrl, link };
    });
    return { list, hasNextPage: false };
  }

  toStatus(text) {
    const s = (text || "").toLowerCase().trim();
    if (s.includes("ongoing") || s.includes("publishing") || s.includes("on going")) return 0;
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
    const res = await this.client.get(
      `${baseUrl}/manga/${slug}/`,
      this.getHeaders()
    );
    const doc = new Document(res.body);

    const imageUrl = (() => {
      const img = doc.selectFirst("div.summary_image img");
      return img ? (img.getSrc || img.attr("data-src") || "") : "";
    })();

    const name = (() => {
      const h = doc.selectFirst("div.post-title h1");
      return h ? h.text.trim() : "";
    })();

    const description = (() => {
      const d = doc.selectFirst("div.summary__content");
      return d ? d.text.trim() : "";
    })();

    const genre = doc.select(".genres-content a").map((el) => el.text.trim());

    const status = (() => {
      const items = doc.select(".post-content_item");
      for (const item of items) {
        const h = item.selectFirst(".summary-heading h5");
        if (h && h.text.trim().toLowerCase() === "status") {
          const sc = item.selectFirst(".summary-content");
          return this.toStatus(sc ? sc.text : "");
        }
      }
      return 5;
    })();

    const chapters = [];
    let apiPage = 1;
    let lastPage = 1;
    do {
      const apiRes = await this.client.get(
        `${baseUrl}/api/comics/${slug}/chapters?per_page=100&page=${apiPage}`,
        { ...this.getHeaders(), "Accept": "application/json" }
      );
      let data;
      try {
        data = JSON.parse(apiRes.body);
      } catch (_) {
        break;
      }
      if (!data.success || !data.data) break;
      lastPage = data.data.last_page || 1;
      for (const ch of data.data.chapters) {
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
    const res = await this.client.get(url, this.getHeaders());
    const doc = new Document(res.body);

    const imgEls = doc.select(".wp-manga-chapter-img");
    if (imgEls.length > 0) {
      const seen = new Set();
      const pages = [];
      for (const el of imgEls) {
        const src = el.attr("data-src") || el.getSrc || "";
        if (src && !seen.has(src)) {
          seen.add(src);
          pages.push(src);
        }
      }
      if (pages.length > 0) return pages;
    }

    const body = res.body;
    const seen = new Set();
    const pages = [];
    const re = /https?:\/\/[^\s"'<>]+2xstorage\.com\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png)/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      const imgUrl = m[0];
      if (!seen.has(imgUrl) && !imgUrl.includes("/thumb/")) {
        seen.add(imgUrl);
        pages.push(imgUrl);
      }
    }
    return pages;
  }

  getFilterList() {
    return [];
  }

  getSourcePreferences() {
    return [
      {
        key: "harimanga_override_base_url",
        editTextPreference: {
          title: "Override BaseUrl",
          summary: "https://www.harimanga.co.uk",
          value: "https://www.harimanga.co.uk",
          dialogTitle: "Override BaseUrl",
          dialogMessage: "Default: https://www.harimanga.co.uk",
        },
      },
    ];
  }
}
