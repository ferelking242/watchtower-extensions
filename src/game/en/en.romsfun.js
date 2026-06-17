const watchtowerSources = [{
  "name": "RomsFun",
  "id": 6000000001,
  "lang": "en",
  "baseUrl": "https://romsfun.com",
  "apiUrl": "",
  "iconUrl": "https://romsfun.com/favicon.ico",
  "typeSource": "single",
  "itemType": 4,
  "version": "1.0.1",
  "pkgPath": "game/en/en.romsfun.js",
  "notes": "ROM downloads — PSP, PS2, GBA, SNES, N64, NDS and more",
  "isNsfw": false,
  "hasCloudflare": true,
  "isManga": false,
  "isFullData": false,
  "appMinVerReq": "0.6.1",
  "additionalParams": "",
  "sourceCodeLanguage": 1,
  "dateFormat": "",
  "dateFormatLocale": ""
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "Referer": "https://romsfun.com/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    };
  }

  get supportsLatest() { return true; }

  async getPopular(page) {
    const url = `https://romsfun.com/roms/popular${page > 1 ? `?page=${page}` : ""}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://romsfun.com");
  }

  async getLatestUpdates(page) {
    const url = `https://romsfun.com/roms/latest${page > 1 ? `?page=${page}` : ""}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://romsfun.com");
  }

  async search(query, page, filters) {
    const platform = filters && filters.length > 0 ? filters[0].state : "";
    let url;
    if (platform && platform !== "all") {
      url = `https://romsfun.com/roms/${platform}${page > 1 ? `?page=${page}` : ""}`;
      if (query && query.trim()) {
        url = `https://romsfun.com/search?query=${encodeURIComponent(query.trim())}&console=${platform}&page=${page}`;
      }
    } else {
      url = query && query.trim()
        ? `https://romsfun.com/search?query=${encodeURIComponent(query.trim())}&page=${page}`
        : `https://romsfun.com/roms/popular${page > 1 ? `?page=${page}` : ""}`;
    }
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://romsfun.com");
  }

  _parseList(html, base) {
    const doc = new Document(html);
    const items = [];
    const seen = {};

    const selectors = [
      ".games-list .game-item",
      ".rom-item",
      ".game-card",
      "article.game",
      ".roms-list li",
      ".games-grid .item"
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = doc.select(sel);
      if (cards.length > 0) break;
    }

    if (cards.length === 0) {
      cards = doc.select("a[href*='/roms/']");
    }

    for (const card of cards) {
      const a = card.tagName === "A" ? card : card.selectFirst("a[href]");
      if (!a) continue;

      let href = a.attr("href") || "";
      if (!href || href === "#") continue;
      if (!href.startsWith("http")) href = base + href;
      if ((href in seen)) continue;
      (seen[href] = 1);

      const titleEl = card.selectFirst("h3, h2, h4, .title, .name, .game-title");
      const title = (titleEl?.text || a.attr("title") || a.text || "").trim();
      if (!title || title.length < 2) continue;

      const imgEl = card.selectFirst("img");
      const thumb = imgEl?.attr("data-src") || imgEl?.attr("src") || "";

      const consoleEl = card.selectFirst(".console, .platform, .badge");
      const platform = consoleEl?.text?.trim() || "";

      items.push({
        name: title,
        imageUrl: thumb.startsWith("http") ? thumb : (thumb ? base + thumb : ""),
        link: href,
        description: platform ? `Platform: ${platform}` : ""
      });
    }

    const nextPage = doc.selectFirst(
      "a[rel='next'], .pagination .next, .next-page, a.page-link[aria-label='Next']"
    );

    return { list: items, hasNextPage: !!nextPage || items.length >= 20 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);

    const title = (
      doc.selectFirst("h1")?.text ||
      doc.selectFirst('meta[property="og:title"]')?.attr("content") ||
      "Unknown"
    ).trim();

    const thumb =
      doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
      doc.selectFirst(".game-cover img, .cover img, .game-image img")?.attr("src") ||
      "";

    const descEl = doc.selectFirst(".description, .game-description, .summary, .info p");
    const description = descEl?.text?.trim() || "";

    const genres = [];
    const genreEls = doc.select(".genre, .tags a, .tag, .console-name, .platform-name");
    for (const g of genreEls) {
      const t = g.text?.trim();
      if (t) genres.push({ name: t });
    }

    const detailRows = doc.select(".detail-row, .info-row, .game-info li, .game-meta li");
    const extraInfo = [];
    for (const row of detailRows) {
      const t = row.text?.trim();
      if (t) extraInfo.push(t);
    }

    const episodes = [];
    const downloadLinks = doc.select(
      "a[href*='/download'], a[href*='.zip'], a[href*='.7z'], a[href*='.rar'], a[href*='.iso'], .download-btn, .download-link"
    );

    for (const link of downloadLinks) {
      let dlUrl = link.attr("href") || "";
      if (!dlUrl) continue;
      if (!dlUrl.startsWith("http")) dlUrl = "https://romsfun.com" + dlUrl;
      const label = (link.attr("title") || link.text || "Download").trim();
      episodes.push({ name: label, url: dlUrl });
    }

    if (episodes.length === 0) {
      episodes.push({ name: "Download ROM", url: url + (url.includes("?") ? "&" : "?") + "download=1" });
    }

    return {
      name: title,
      imageUrl: thumb,
      description: description || extraInfo.join("\n"),
      genre: genres,
      episodes: episodes.reverse()
    };
  }

  async getVideoList(url) {
    try {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const videos = [];

      const directLinks = doc.select(
        "a[href*='.zip'], a[href*='.7z'], a[href*='.rar'], a[href*='.iso'], a[href*='.rom'], a[href*='.bin'], a[href*='.cue'], a[href*='.nds'], a[href*='.gba'], a[href*='.sfc'], a[href*='.z64']"
      );

      for (const link of directLinks) {
        let dlUrl = link.attr("href") || "";
        if (!dlUrl) continue;
        if (!dlUrl.startsWith("http")) dlUrl = "https://romsfun.com" + dlUrl;
        const label = (link.attr("title") || link.text || "ROM Download").trim();
        videos.push({ url: dlUrl, quality: label, originalUrl: dlUrl, headers: this.getHeaders(url) });
      }

      if (videos.length === 0) {
        videos.push({ url: url, quality: "Download Page", originalUrl: url, headers: this.getHeaders(url) });
      }

      return videos;
    } catch (e) {
      return [{ url: url, quality: "ROM Download", originalUrl: url, headers: this.getHeaders(url) }];
    }
  }

  async getPageList(url) { return []; }

  getFilterList() {
    return [
      {
        type: "SelectFilter",
        name: "Platform",
        state: "all",
        values: [
          { name: "All Platforms", value: "all" },
          { name: "PSP", value: "psp" },
          { name: "PlayStation 2", value: "ps2" },
          { name: "PlayStation 1", value: "ps1" },
          { name: "Game Boy Advance", value: "gba" },
          { name: "Super Nintendo (SNES)", value: "snes" },
          { name: "Nintendo 64", value: "n64" },
          { name: "Nintendo DS", value: "nds" },
          { name: "Nintendo 3DS", value: "3ds" },
          { name: "GameCube", value: "gamecube" },
          { name: "Wii", value: "wii" },
          { name: "Game Boy Color", value: "gbc" },
          { name: "Sega Genesis", value: "genesis" },
          { name: "Dreamcast", value: "dreamcast" },
          { name: "Android", value: "android" }
        ]
      }
    ];
  }

  getSourcePreferences() { return []; }
}
