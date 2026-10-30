const watchtowerSources = [{
  "name": "1PornTV",
  "lang": "en",
  "baseUrl": "https://www.1porn.tv",
  "apiUrl": "",
  "iconUrl": "https://www.1porn.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.3.1",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/1porntv.js",
  "notes": "Adult content (18+) — multi-quality MP4",
  "isNsfw": true,
  "hasCloudflare": true,
  "uiLayout": "ui-layouts/1porntv.json",
  "uiLayoutVersion": "1.2.0",
  "subCategories": ["pornstars", "studios", "networks", "categories", "tags"],
  "contentSubtype": ["videos", "pornstars", "studios", "networks", "tags"]
}];

class DefaultExtension extends MProvider {

  static get BASE() { return "https://www.1porn.tv"; }

  // ── Sort & category definitions ───────────────────────────────────────────
  // sorts: 0=Latest, 1=Top Rated, 2=Most Popular
  static get SORT_BASES() {
    return ["latest-updates", "top-rated", "most-popular"];
  }

  static get CATEGORIES() {
    return [
      ["All",          ""],
      ["Amateur",      "amateur"],
      ["Anal",         "anal"],
      ["Asian",        "asian"],
      ["BBW",          "bbw"],
      ["Big Tits",     "big-tits"],
      ["Blonde",       "blonde"],
      ["Blowjob",      "blowjob"],
      ["Brunette",     "brunette"],
      ["Casting",      "casting"],
      ["Creampie",     "creampie"],
      ["Cumshot",      "cumshot"],
      ["Ebony",        "ebony"],
      ["Facial",       "facial"],
      ["Gangbang",     "gangbang"],
      ["Hardcore",     "hardcore"],
      ["Interracial",  "interracial"],
      ["Latina",       "latina"],
      ["Lesbian",      "lesbian"],
      ["Mature",       "mature"],
      ["MILF",         "milf"],
      ["POV",          "pov"],
      ["Rough Sex",    "rough-sex"],
      ["Small Tits",   "small-tits"],
      ["Solo",         "solo"],
      ["Teen",         "teen"],
      ["Threesome",    "threesome"],
      ["Toys",         "toys"],
    ];
  }

  // No hardcoded `User-Agent`: the site sits behind a Cloudflare managed
  // challenge whose `cf_clearance` cookie is bound to the exact User-Agent the
  // browser engine used to solve it. Forcing a desktop Chrome string here
  // overwrote that session UA on every request (the HTTP layer only fills the
  // UA in when the request does not already carry one), so the clearance no
  // longer matched and covers/videos stayed 403. Leaving the header out lets
  // the app send the session UA.
  getHeaders(url) {
    return {
      "Referer": url || "https://www.1porn.tv/"
    };
  }

  // ── Small DOM helpers ─────────────────────────────────────────────────────
  _attr(el, name) {
    return el && el.attr ? (el.attr(name) || "") : "";
  }

  _text(el) {
    if (!el) return "";
    const value = el.text != null ? el.text : "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  // Covers are lazy-loaded: the real URL lives in `data-original` (or
  // `data-src`), while `src` is a 1x1 transparent GIF placeholder. Reading
  // `src` first is what made every thumbnail come back empty.
  _image(el) {
    if (!el) return "";
    return this._attr(el, "data-original")
      || this._attr(el, "data-src")
      || this._attr(el, "data-lazy-src")
      || this._attr(el, "src")
      || "";
  }

  _absolute(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return DefaultExtension.BASE + (url.startsWith("/") ? url : "/" + url);
  }

  // ── Filter helpers ────────────────────────────────────────────────────────
  _filterSort(filters)     { return (filters && filters[0]) ? (filters[0].state || 0) : 0; }
  _filterCategory(filters) {
    const idx = (filters && filters[1]) ? (filters[1].state || 0) : 0;
    return DefaultExtension.CATEGORIES[idx] ? DefaultExtension.CATEGORIES[idx][1] : "";
  }

  // ── URL builders ──────────────────────────────────────────────────────────
  // The site paginates with real `/2/`, `/3/` segments (the pagination block
  // links to `/latest-updates/2/`, `/top-rated/3/`…). `?from=N` also works but
  // only on some templates, so the path form is used everywhere.
  _pageUrl(path, page) {
    const p = Math.max(1, page || 1);
    const base = path.replace(/\/+$/, "");
    return p > 1
      ? `${DefaultExtension.BASE}${base}/${p}/`
      : `${DefaultExtension.BASE}${base}/`;
  }

  _buildUrl(sort, page, cat) {
    if (cat) return this._pageUrl(`/categories/${cat}`, page);
    const sortBase = DefaultExtension.SORT_BASES[sort] || "latest-updates";
    return this._pageUrl(`/${sortBase}`, page);
  }

  // ── Listings ──────────────────────────────────────────────────────────────
  async getPopular(page) {
    const filters = this._currentFilters || [];
    const sort = this._filterSort(filters);
    const cat  = this._filterCategory(filters);
    const url  = this._buildUrl(sort, page, cat);
    extLog('info', `1PornTV.getPopular: sort=${sort} cat=${cat} page=${page} url=${url}`);
    const res  = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, url, page);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = this._pageUrl("/latest-updates", page);
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, url, page);
  }

  async search(query, page, filters) {
    this._currentFilters = filters;
    const sort = this._filterSort(filters);
    const cat  = this._filterCategory(filters);
    const q    = (query || "").trim();

    // No query → browse with sort/category
    if (!q) {
      const url = this._buildUrl(sort, page, cat);
      const res = await new Client().get(url, this.getHeaders(url));
      return this._parseList(res.body, url, page);
    }

    // The search results are a paginated listing at /search/<q>/relevance/<page>/.
    // The old `/search/?q=` form only ever returned page 1.
    const slug = encodeURIComponent(q.replace(/\s+/g, "-"));
    const url = this._pageUrl(`/search/${slug}/relevance`, page);
    extLog('info', `1PornTV.search: q="${q}" page=${page} url=${url}`);
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, url, page);
  }

  // ── List parser ───────────────────────────────────────────────────────────
  _parseList(html, pageUrl, page) {
    const doc   = new Document(html);
    const items = [];
    const seen  = {};

    for (const card of doc.select(".item")) {
      const a = card.selectFirst("a[href*='/videos/']");
      if (!a) continue;
      const href = this._attr(a, "href");
      if (!href) continue;
      const link = this._absolute(href);
      if (seen[link]) continue;
      seen[link] = 1;

      const img = card.selectFirst("img.thumb")
        || card.selectFirst("img.thumb_img")
        || card.selectFirst("img");
      const thumb = this._absolute(this._image(img));
      const title = (this._attr(a, "title") || this._attr(img, "alt") || "").trim();
      const dur   = this._text(card.selectFirst(".duration")).replace(/Full Video/i, "").trim();
      const views = this._text(card.selectFirst(".views"));
      const description = [dur, views ? `${views} vues` : ""].filter(x => !!x).join(" · ");

      items.push({
        name: title || "Unknown",
        imageUrl: thumb,
        link,
        description
      });
    }

    const hasNext = this._hasNextPage(doc, page);
    extLog('info', `1PornTV._parseList: page=${page} items=${items.length} hasNext=${hasNext}`);
    return { list: items, hasNextPage: hasNext };
  }

  // The site renders a real pagination block whose entries are
  // `<li class="page"><a href="/…/<n>/">`. An item-count threshold used to
  // report `hasNextPage` on a 24-item final page and then loop forever on the
  // same content.
  _hasNextPage(doc, page) {
    const next = page + 1;
    const links = doc.select(".pagination a, .pagination-holder a");
    for (const a of links) {
      const href = this._attr(a, "href");
      if (!href) continue;
      if (new RegExp(`/${next}/$`).test(href)) return true;
    }
    return false;
  }

  // ── Detail & video ────────────────────────────────────────────────────────
  async getDetail(url) {
    const res   = await new Client().get(url, this.getHeaders(url));
    const doc   = new Document(res.body);
    const ogTitle = this._attr(doc.selectFirst('meta[property="og:title"]'), "content");
    const h1 = doc.selectFirst("h1");
    const title = this._text(h1)
      || ogTitle.replace(/\s*\|\s*Free Porn\s*$/i, "").trim()
      || "Unknown";

    const ogImg = this._attr(doc.selectFirst('meta[property="og:image"]'), "content");
    const poster = this._attr(doc.selectFirst("video"), "poster");
    const thumb = this._absolute(ogImg || poster);
    const ogDesc = this._attr(doc.selectFirst('meta[property="og:description"]'), "content");

    const genre = [];
    const seenGenre = {};
    // Categories live in `.hidden_tags a[href*='/categories/']`. Matching on
    // the class instead fails: the site emits *duplicate* class attributes
    // (`<a class="btn_tag" class="link" …>`), and a parser keeps only the last
    // one, so `.btn_tag` never matches. The trailing `+` expander is a bare
    // `href="#"` anchor and is skipped by the href filter.
    for (const el of doc.select(".hidden_tags a[href*='/categories/']")) {
      const name = this._text(el);
      if (name && !seenGenre[name]) { seenGenre[name] = 1; genre.push({ name }); }
    }

    const cast = [];
    const seenCast = {};
    // The "Pornstars:" row is a sibling of `.hidden_tags`, both inside
    // `.block-details`, so the selector has to start from there — scoping to
    // `.hidden_tags` returns nothing.
    for (const el of doc.select(".block-details a[href*='/models/']")) {
      const name = this._text(el);
      if (name && !seenCast[name]) {
        seenCast[name] = 1;
        cast.push({ name, link: this._absolute(this._attr(el, "href")) });
      }
    }

    const studio = this._text(doc.selectFirst("a.btn_sponsor"));
    const network = this._text(doc.selectFirst("a.btn_sponsor_group"));

    const meta = [];
    if (studio) meta.push(studio);
    if (network && network !== studio) meta.push(network);
    if (cast.length) meta.push(cast.map(c => c.name).join(", "));

    return {
      name: title,
      imageUrl: thumb,
      description: [ogDesc, meta.join(" · ")].filter(x => !!x).join("\n\n"),
      genre,
      author: studio || network || "",
      artist: cast.map(c => c.name).join(", "),
      status: 1,
      episodes: [{ name: title, url }]
    };
  }

  async getVideoList(url) {
    const res  = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const seen = {};
    // The player emits `<source src='…' type='video/mp4' label="720p">`: the
    // `src` is SINGLE-quoted while `label` is double-quoted. The old
    // double-quote-only regex matched nothing, so the player always received an
    // empty source list and could not play anything.
    const rx = /<source\s+src=["']([^"']+\.mp4\/?)["'][^>]*?(?:label=["']([^"']*)["'])?/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      const src = m[1];
      if (!src || src.includes("?download=") || seen[src]) continue;
      seen[src] = 1;
      const label = (m[2] || "").trim();
      videos.push({
        url: src,
        quality: label || this._qualityFromName(src),
        originalUrl: src,
        headers: this.getHeaders(url)
      });
    }
    extLog('info', `1PornTV.getVideoList: ${videos.length} sources`);
    return videos;
  }

  _qualityFromName(src) {
    const m = src.match(/_(\d{3,4})m\.mp4/);
    return m ? `${m[1]}p` : "Auto";
  }

  async getPageList(url) { return []; }

  // ── Custom lists (UI layout rails) ────────────────────────────────────────
  async getCustomList(listId, page) {
    if (!listId) return { list: [], hasNextPage: false };
    if (listId === "popular") return this.getPopular(page);
    if (listId === "latest") return this.getLatestUpdates(page);
    if (listId === "top-rated") return this._listing("/top-rated", page);
    if (listId === "most-popular") return this._listing("/most-popular", page);
    if (listId === "categories") return this._categoryList(page);
    if (listId === "tags") return this._tagList(page);
    if (listId === "pornstars") return this._modelList(page);
    if (listId === "studios") return this._siteList(page);
    if (listId === "networks") return this._networkList(page);
    if (listId.startsWith("category_")) return this._listing(`/categories/${listId.slice(9)}`, page);
    if (listId.startsWith("tag_")) return this._listing(`/tags/${listId.slice(4)}`, page);
    if (listId.startsWith("model_")) return this._listing(`/models/${listId.slice(6)}`, page);
    if (listId.startsWith("studio_")) return this._listing(`/sites/${listId.slice(7)}`, page);
    if (listId.startsWith("network_")) return this._listing(`/networks/${listId.slice(8)}`, page);
    extLog('warn', `1PornTV.getCustomList: unknown listId=${listId}`);
    return { list: [], hasNextPage: false };
  }

  async _listing(path, page) {
    const url = this._pageUrl(path, page);
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, url, page);
  }

  // Categories / tags / models / studios are collections: their card opens a
  // browse list, not a video. `collectionId` is what tells the app to do that.
  _collectionCard(name, link, imageUrl, collectionId, description) {
    return {
      name,
      link,
      url: link,
      imageUrl: imageUrl || "",
      collectionId,
      description: description || "",
      metadata: { collection: true }
    };
  }

  async _categoryList(page) {
    const url = this._pageUrl("/categories", page);
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const items = [];
    const seen = {};
    // `/categories/` groups the anchors by first letter inside
    // `.list-categories__row`. There are ~360 of them on one page, no covers.
    for (const a of doc.select(".list-categories a.item, .list-categories__row--list a, a.item[href*='/categories/']")) {
      const href = this._attr(a, "href");
      if (!href) continue;
      const link = this._absolute(href);
      if (seen[link]) continue;
      seen[link] = 1;
      const slug = href.replace(/\/+$/, "").split("/").pop();
      const name = (this._attr(a, "title") || this._text(a) || slug).trim();
      items.push(this._collectionCard(name, link, "", `category_${slug}`, `Catégorie ${name}`));
    }
    const hasNext = this._hasNextPage(doc, page);
    extLog('info', `1PornTV._categoryList: page=${page} items=${items.length} hasNext=${hasNext}`);
    return { list: items, hasNextPage: hasNext };
  }

  async _tagList(page) {
    const url = this._pageUrl("/tags", page);
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const items = [];
    const seen = {};
    // `/tags/` is one big `<ul class="item">` list (~1960 tags).
    for (const a of doc.select(".list-tags a, ul.item a")) {
      const href = this._attr(a, "href");
      if (!href || !href.includes("/tags/")) continue;
      const link = this._absolute(href);
      if (seen[link]) continue;
      seen[link] = 1;
      const slug = href.replace(/\/+$/, "").split("/").pop();
      const name = (this._text(a) || slug).trim();
      items.push(this._collectionCard(name, link, "", `tag_${slug}`, `Tag ${name}`));
    }
    const hasNext = this._hasNextPage(doc, page);
    extLog('info', `1PornTV._tagList: page=${page} items=${items.length} hasNext=${hasNext}`);
    return { list: items, hasNextPage: hasNext };
  }

  async _modelList(page) {
    const url = this._pageUrl("/models", page);
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const items = [];
    const seen = {};
    for (const card of doc.select("a.item[href*='/models/'], .list-models a.item")) {
      const href = this._attr(card, "href");
      if (!href) continue;
      const link = this._absolute(href);
      if (seen[link]) continue;
      seen[link] = 1;
      const slug = href.replace(/\/+$/, "").split("/").pop();
      const img = card.selectFirst("img");
      const name = (this._attr(card, "title") || this._text(card.selectFirst("strong.title")) || slug).trim();
      const count = this._text(card.selectFirst(".videos"));
      items.push(this._collectionCard(
        name, link, this._absolute(this._image(img)), `model_${slug}`,
        count ? `${count} vidéos` : "Pornstar"
      ));
    }
    const hasNext = this._hasNextPage(doc, page);
    extLog('info', `1PornTV._modelList: page=${page} items=${items.length} hasNext=${hasNext}`);
    return { list: items, hasNextPage: hasNext };
  }

  async _siteList(page) {
    const url = this._pageUrl("/sites/title-az", page);
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const items = [];
    const seen = {};
    // The studio cards live under `.list-sponsors`, each as a
    // `<div class="headline"><h2>Name</h2><a class="more" href="/sites/slug/">`
    // followed by a `<div class="box">` whose first `.item` is that studio's
    // newest video. The site publishes no per-studio logo, so that video thumb
    // is the only image available for the card — leaving it empty is what made
    // the "Studios" rail render placeholder tiles.
    //
    // Headlines and boxes are walked together in document order (rather than
    // zipped by index) so a studio whose box is missing or extra cannot shift
    // every following cover onto the wrong studio.
    const nodes = doc.select(".list-sponsors .headline, .list-sponsors .box");
    let current = null;
    for (const node of nodes) {
      const className = this._attr(node, "class");
      if (className.indexOf("headline") >= 0) {
        const linkEl = node.selectFirst("a.more");
        const href = this._attr(linkEl, "href");
        if (!href || !href.includes("/sites/")) { current = null; continue; }
        const link = this._absolute(href);
        if (seen[link]) { current = null; continue; }
        seen[link] = 1;
        const slug = href.replace(/\/+$/, "").split("/").pop();
        const name = (this._text(node.selectFirst("h2")) || slug).trim();
        if (!name) { current = null; continue; }
        const count = this._text(linkEl).replace(/See All/i, "").trim();
        current = this._collectionCard(
          name, link, "", `studio_${slug}`,
          count ? `${count} vidéos` : `Studio ${name}`
        );
        items.push(current);
      } else if (current && !current.imageUrl) {
        const img = node.selectFirst("img.thumb")
          || node.selectFirst("img.thumb__img")
          || node.selectFirst("img");
        current.imageUrl = this._absolute(this._image(img));
      }
    }
    const hasNext = this._hasNextPage(doc, page);
    extLog('info', `1PornTV._siteList: page=${page} items=${items.length} hasNext=${hasNext}`);
    return { list: items, hasNextPage: hasNext };
  }

  // `/networks/` itself is a 404, so there is no network index page to parse.
  // The only place the site exposes the network list is the `.sites__list`
  // header dropdown, which every page carries; it is read from the home page.
  // The list is short and not paginated, so `page` beyond the first is empty.
  async _networkList(page) {
    if (page > 1) return { list: [], hasNextPage: false };
    const url = `${DefaultExtension.BASE}/latest-updates/`;
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const items = [];
    const seen = {};
    for (const a of doc.select(".sites__list a.sites__item")) {
      const href = this._attr(a, "href");
      if (!href || href.indexOf("/networks/") < 0) continue;
      const link = this._absolute(href);
      if (seen[link]) continue;
      seen[link] = 1;
      const slug = href.replace(/\/+$/, "").split("/").pop();
      const name = (this._text(a) || slug).trim();
      if (!name) continue;
      items.push(this._collectionCard(name, link, "", `network_${slug}`, `Réseau ${name}`));
    }
    extLog('info', `1PornTV._networkList: items=${items.length}`);
    return { list: items, hasNextPage: false };
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Latest",       value: "latest"      },
          { type_name: "SelectOption", name: "Top Rated",    value: "top-rated"   },
          { type_name: "SelectOption", name: "Most Popular", value: "most-popular"}
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Category",
        state: 0,
        values: DefaultExtension.CATEGORIES.map(([name]) => ({
          type_name: "SelectOption", name, value: name
        }))
      }
    ];
  }

  getSourcePreferences() { return []; }
}
