const watchtowerSources = [{
  "name": "Cutie Comics",
  "lang": "en",
  "baseUrl": "https://cutiecomics.com",
  "apiUrl": "",
  "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000001177.png",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/en/cutiecomics.js",
  "isNsfw": true,
  "hasCloudflare": false,
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
  "uiLayout": "ui-layouts/cutiecomics.json",
  "uiLayoutVersion": "1.0.0",
  "notes": "Cutie Comics — hentai manga & doujinshi (18+). Moteur DLE : home, catégories, recherche POST et galerie d'images."
}];

const BASE_URL = "https://cutiecomics.com";

// DLE search rejects any term shorter than this, so shorter input is served
// from a client-side filter of the newest listing instead of a dead search.
const MIN_SEARCH_LENGTH = 4;

// Category slug → DLE `catlist[]` id, used by search and the category shelves.
const CATEGORIES = [
  ["Game characters", "gamecharacters", "23"],
  ["Incest", "incest", "6"],
  ["Rape", "rape", "5"],
  ["Interracial", "interracial", "9"],
  ["Monsters", "monsters", "10"],
  ["Furry", "furry", "16"],
  ["Futanari", "futanari", "17"],
  ["Cartoons", "cartoons", "11"],
  ["Hentai pictures", "hentaipictures", "25"],
  ["MILF", "milf", "19"],
  ["Milftoon", "milftoon", "20"],
  ["Gilftoon", "gilftoon", "21"],
  ["Palcomix", "palcomix", "22"],
  ["Shadbase", "shadbase", "26"],
  ["Disney", "disney", "4"],
  ["3D", "3d", "1"],
  ["Other", "other", "14"]
];

class DefaultExtension extends MProvider {
  getBaseUrl() {
    const saved = String(new SharedPreferences().get("base_url") || "").trim();
    if (!saved) return BASE_URL;
    return saved.replace(/\/+$/, "");
  }

  getHeaders(referer) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": referer || `${this.getBaseUrl()}/`,
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  postHeaders(referer) {
    return {
      ...this.getHeaders(referer),
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };
  }

  resolveUrl(value, baseUrl) {
    const url = String(value || "").trim();
    if (!url || url.startsWith("data:")) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `${this.getBaseUrl()}${url}`;
    if (baseUrl) return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
    return `${this.getBaseUrl()}/${url.replace(/^\/+/, "")}`;
  }

  imageUrlFromElement(img) {
    if (!img) return "";
    const candidates = [
      img.attr("data-src") || "",
      img.attr("data-lazy-src") || "",
      img.attr("data-original") || "",
      img.attr("src") || ""
    ];
    const selected = candidates
      .map((item) => item.trim())
      .find((item) => item && !item.startsWith("data:"));
    return this.resolveUrl(selected);
  }

  // ── Listings ────────────────────────────────────────────────────────────
  // Every list page (home, category, search) renders the same `.w25` card:
  // title link in `.views-field-title`, cover in `.views-field-field-preview`.
  parseCards(body) {
    const doc = new Document(body || "");
    const nodes = doc.select(".w25");
    const list = [];
    const seen = {};
    for (let i = 0; i < nodes.length; i++) {
      const card = nodes[i];
      const link = card.selectFirst(".views-field-title a")
        || card.selectFirst(".views-field-field-preview a");
      const href = link ? (link.getHref || link.attr("href") || "") : "";
      const url = this.resolveUrl(href);
      if (!url || seen[url]) continue;
      seen[url] = true;
      const titleNode = card.selectFirst(".views-field-title a");
      const img = card.selectFirst(".views-field-field-preview img");
      const name = String(
        (titleNode ? titleNode.text : "") || (img ? img.attr("alt") : "") || ""
      ).replace(/\s+/g, " ").trim();
      list.push({
        name: name || "Comic",
        link: url,
        imageUrl: this.imageUrlFromElement(img)
      });
    }
    return list;
  }

  hasNextPage(body, page) {
    return String(body || "").indexOf(`/page/${page + 1}/`) !== -1;
  }

  // Local (dependency-free) case-insensitive title filter, used when a query
  // is too short for the site's search to return anything.
  filterByTitle(list, term) {
    const query = String(term || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (!query) return list;
    return list.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .indexOf(query) !== -1
    );
  }

  pagedPath(path, page) {
    const clean = path.endsWith("/") ? path : `${path}/`;
    return page > 1 ? `${clean}page/${page}/` : clean;
  }

  async getListing(path, page) {
    const url = this.pagedPath(path, page);
    const response = await new Client().get(url, this.getHeaders(url));
    const body = response.body || "";
    return { list: this.parseCards(body), hasNextPage: this.hasNextPage(body, page) };
  }

  async getLatestUpdates(page) {
    return this.getListing(`${this.getBaseUrl()}/`, page);
  }

  // ── Search (DLE POST) ───────────────────────────────────────────────────
  // The site has no GET search route; the form posts to index.php?do=search
  // with `search_start` (page) and `result_from` (offset). A wildcard term
  // plus `sortby=news_read` gives the real "most viewed" ordering, which is
  // the only popularity signal the site exposes.
  buildSearchBody(term, page, categoryId, sortBy) {
    const offset = (page - 1) * 20 + 1;
    const parts = [
      "do=search",
      "subaction=search",
      `story=${encodeURIComponent(term)}`,
      "full_search=1",
      `search_start=${page}`,
      `result_from=${offset}`
    ];
    if (sortBy) {
      parts.push(`sortby=${encodeURIComponent(sortBy)}`);
      parts.push("resorder=desc");
    }
    if (categoryId) parts.push(`catlist[]=${encodeURIComponent(categoryId)}`);
    return parts.join("&");
  }

  async runSearch(term, page, categoryId, sortBy) {
    const url = `${this.getBaseUrl()}/index.php?do=search`;
    const response = await new Client().post(
      url,
      this.postHeaders(`${this.getBaseUrl()}/`),
      this.buildSearchBody(term, page, categoryId, sortBy)
    );
    const body = response.body || "";
    const list = this.parseCards(body);
    const range = body.match(/Query results\s+(\d+)\s*-\s*(\d+)/i);
    let hasNextPage = list.length >= 20;
    if (range) {
      const total = Number((body.match(/Found\s+(\d+)\s+responses/i) || [])[1]);
      if (Number.isFinite(total) && total > 0) {
        hasNextPage = Number(range[2]) < total;
      }
    }
    return { list, hasNextPage: list.length > 0 && hasNextPage };
  }

  async getPopular(page) {
    // Most-viewed comics, via the sorted global search.
    const result = await this.runSearch("____", page, "", "news_read");
    if (result.list.length) return result;
    return this.getLatestUpdates(page);
  }

  async getTopRated(page) {
    return this.runSearch("____", page, "", "rating");
  }

  selectedSort(filters) {
    for (const filter of Array.from(filters || [])) {
      if (filter.name !== "Sort By" || !filter.values) continue;
      const option = filter.values[filter.state];
      if (option && /^[a-z_]+$/i.test(option.value || "")) return option.value;
    }
    return "";
  }

  selectedCategory(filters) {
    for (const filter of Array.from(filters || [])) {
      if (filter.name !== "Category" || !filter.values) continue;
      const option = filter.values[filter.state];
      if (option && /^\d*$/.test(option.value || "")) return option.value;
    }
    return "";
  }

  async search(query, page, filters) {
    const term = String(query || "").trim();
    const categoryId = this.selectedCategory(filters);
    const sortBy = this.selectedSort(filters);

    if (term.length < MIN_SEARCH_LENGTH) {
      // A real search would come back empty; filter the newest listing so the
      // user still sees plausible matches while typing.
      const base = categoryId
        ? await this.getCategoryPage(this.categorySlug(categoryId), page)
        : await this.getLatestUpdates(page);
      return { list: this.filterByTitle(base.list, term), hasNextPage: false };
    }
    return this.runSearch(term, page, categoryId, sortBy);
  }

  categorySlug(categoryId) {
    for (const entry of CATEGORIES) {
      if (entry[2] === String(categoryId)) return entry[1];
    }
    return "";
  }

  getCategoryPage(slug, page) {
    if (!slug) return this.getLatestUpdates(page);
    return this.getListing(`${this.getBaseUrl()}/${slug}/`, page);
  }

  // ── Detail ──────────────────────────────────────────────────────────────
  async getDetail(url) {
    const detailUrl = this.resolveUrl(url);
    const response = await new Client().get(detailUrl, this.getHeaders(detailUrl));
    const body = response.body || "";
    const doc = new Document(body);

    const titleNode = doc.selectFirst("h1#page-title")
      || doc.selectFirst("h1.title")
      || doc.selectFirst("h1");
    const name = String(titleNode ? titleNode.text : "").replace(/\s+/g, " ").trim();

    const genre = [];
    const categoryLinks = doc.select(".field-name-field-com-group a");
    for (let i = 0; i < categoryLinks.length; i++) {
      const label = String(categoryLinks[i].text || "").replace(/\s+/g, " ").trim();
      if (label && genre.indexOf(label) === -1) genre.push(label);
    }

    const firstImage = doc.selectFirst(".xfieldimagegallery img")
      || doc.selectFirst(".field-name-field-com-pages img");
    const imageUrl = this.imageUrlFromElement(firstImage);

    const views = (body.match(/class="views">\s*([\d\s,]+?)\s*views/i) || [])[1];
    const pageCount = doc.select(".xfieldimagegallery img").length
      || doc.select(".field-name-field-com-pages img").length;

    const descriptionLines = [];
    if (genre.length) descriptionLines.push(`Categories: ${genre.join(" · ")}`);
    if (pageCount) descriptionLines.push(`Pages: ${pageCount}`);
    if (views) descriptionLines.push(`Views: ${views.trim()}`);

    return {
      name,
      imageUrl,
      description: descriptionLines.join("\n"),
      genre,
      status: 1,
      chapters: [{ name: "Read", url: detailUrl }]
    };
  }

  async getPageList(url) {
    const chapterUrl = this.resolveUrl(url);
    const response = await new Client().get(chapterUrl, this.getHeaders(chapterUrl));
    const doc = new Document(response.body || "");
    const images = doc.select(".xfieldimagegallery img");
    const nodes = images.length ? images : doc.select(".field-name-field-com-pages img");
    const pages = [];
    const seen = {};
    for (let i = 0; i < nodes.length; i++) {
      const imageUrl = this.imageUrlFromElement(nodes[i]);
      if (imageUrl && !seen[imageUrl]) {
        seen[imageUrl] = true;
        pages.push(imageUrl);
      }
    }
    return pages;
  }

  // ── Home shelves ────────────────────────────────────────────────────────
  async getCustomList(listId, page) {
    const id = String(listId || "");

    const searchTab = id.match(/^search_tab:([a-z0-9-]+):(.*)$/i);
    if (searchTab) {
      let term = searchTab[2] || "";
      try {
        term = decodeURIComponent(term);
      } catch (_) {
        // Keep the original query if the caller passed malformed encoding.
      }
      const categoryId = this.categoryIdForSlug(searchTab[1]);
      if (term.trim().length < MIN_SEARCH_LENGTH) {
        const base = await this.getCategoryPage(searchTab[1], page);
        return { list: this.filterByTitle(base.list, term), hasNextPage: false };
      }
      return this.runSearch(term, page, categoryId, "");
    }

    if (id.indexOf("search_preview:") === 0) {
      // The app's live search box queries getCustomList("search_preview:<term>").
      let term = id.slice("search_preview:".length);
      try {
        term = decodeURIComponent(term);
      } catch (_) {
        // Keep the original query if the caller passed malformed encoding.
      }
      if (term.trim().length < MIN_SEARCH_LENGTH) {
        const base = await this.getLatestUpdates(page);
        return { list: this.filterByTitle(base.list, term), hasNextPage: false };
      }
      return this.runSearch(term, page, "", "");
    }

    if (id === "spotlight") {
      const popular = await this.getPopular(1);
      return { list: popular.list.slice(0, 6), hasNextPage: false };
    }
    if (id === "popular") return this.getPopular(page);
    if (id === "top_rated") return this.getTopRated(page);
    if (id === "latest_updates" || id === "latest" || id === "new_manga" || id === "new") {
      return this.getLatestUpdates(page);
    }

    const category = id.match(/^category_([a-z0-9-]+)$/i);
    if (category) return this.getCategoryPage(category[1], page);

    return this.getLatestUpdates(page);
  }

  categoryIdForSlug(slug) {
    for (const entry of CATEGORIES) {
      if (entry[1] === String(slug).toLowerCase()) return entry[2];
    }
    return "";
  }

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort By",
        state: 0,
        values: [
          ["Newest", "date"],
          ["Most Viewed", "news_read"],
          ["Top Rated", "rating"],
          ["Title A-Z", "title"]
        ].map((item) => ({
          type_name: "SelectOption",
          name: item[0],
          value: item[1]
        }))
      },
      {
        type_name: "SelectFilter",
        name: "Category",
        state: 0,
        values: [["All", ""]].concat(
          CATEGORIES.map((entry) => [entry[0], entry[2]])
        ).map((item) => ({
          type_name: "SelectOption",
          name: item[0],
          value: item[1]
        }))
      }
    ];
  }

  getSourcePreferences() {
    return [
      {
        key: "base_url",
        editTextPreference: {
          title: "Site URL",
          summary: "Change this if Cutie Comics moves to another domain.",
          value: BASE_URL,
          dialogTitle: "Site URL",
          dialogMessage: `Current URL: ${BASE_URL}`
        }
      }
    ];
  }
}
