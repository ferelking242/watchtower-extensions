const watchtowerSources = [
  {
    "id": 748291056,
    "name": "ComicsAll",
    "lang": "en",
    "baseUrl": "https://comics-all.com",
    "apiUrl": "",
    "iconUrl": "https://comics-all.com/templates/creamy-melons7/images/favicon.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "manga/src/en/comics_all.js",
    "isNsfw": false,
    "appMinVerReq": "0.5.0"
  }
];

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
      "Referer": "https://comics-all.com/"
    };
  }

  decodeUrl(url) {
    return (url || "").replace(/&#58;/g, ":").replace(/&#47;/g, "/");
  }

  // Parse a list page HTML into { list, hasNextPage }
  parseList(html) {
    const list = [];
    // Each item: <div class="vidos"><div class="preview-in"><a class="preview-img img-box" href="URL"><img src="COVER"...
    const pattern = /class="preview-img img-box"\s+href="([^"]+)"[\s\S]*?<img\s+src="([^"]+)"[^>]*alt="([^"]+)"/g;
    let m;
    while ((m = pattern.exec(html)) !== null) {
      list.push({
        link: m[1],
        imageUrl: this.decodeUrl(m[2]),
        name: m[3]
      });
    }
    // hasNextPage: navigation exists and current page is not the last one
    const navMatch = html.match(/class="navigation"[^>]*>([\s\S]*?)<\/div>/);
    let hasNextPage = false;
    if (navMatch && list.length > 0) {
      // If there is a link after the current active <span>, there's a next page
      hasNextPage = /class="navigation"[\s\S]*?<a\s+href/.test(navMatch[0]);
    }
    return { list, hasNextPage: hasNextPage || list.length >= 10 };
  }

  // Build publisher URL for a page
  publisherUrl(slug, page) {
    if (!slug) {
      return page <= 1
        ? this.source.baseUrl + "/"
        : `${this.source.baseUrl}/page/${page}/`;
    }
    return page <= 1
      ? `${this.source.baseUrl}/${slug}`
      : `${this.source.baseUrl}/${slug}/page/${page}/`;
  }

  // ─── Core Methods ─────────────────────────────────────────────────────────

  async getPopular(page) {
    const url = this.publisherUrl("", page);
    const res = await this.client.get(url, this.getHeaders());
    return this.parseList(res.body);
  }

  async getLatestUpdates(page) {
    return this.getPopular(page);
  }

  async search(query, page, filterList) {
    let publisher = "";
    let year = "";

    for (const f of filterList) {
      if (f.name === "Publisher" && f.state > 0) {
        publisher = f.values[f.state].value;
      } else if (f.name === "Year" && f.state > 0) {
        year = f.values[f.state].value;
      }
    }

    const tag = this._resolveTag(filterList);

    let url;

    if (query) {
      // Search always returns all results on one page — only show page 1
      if (page > 1) return { list: [], hasNextPage: false };
      url = `${this.source.baseUrl}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
    } else if (tag) {
      const encoded = encodeURIComponent(tag);
      url = page <= 1
        ? `${this.source.baseUrl}/tags/${encoded}/`
        : `${this.source.baseUrl}/tags/${encoded}/page/${page}/`;
    } else if (year) {
      url = page <= 1
        ? `${this.source.baseUrl}/${year}/`
        : `${this.source.baseUrl}/${year}/page/${page}/`;
    } else if (publisher) {
      url = this.publisherUrl(publisher, page);
    } else {
      return this.getPopular(page);
    }

    const res = await this.client.get(url, this.getHeaders());
    const result = this.parseList(res.body);
    if (query) result.hasNextPage = false;
    return result;
  }

  async getDetail(url) {
    const res = await this.client.get(url, this.getHeaders());
    const html = res.body;

    const title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1]?.trim() || "";

    const rawCover = (html.match(/<div class="mc-left"><img\s+src="([^"]+)"/) || [])[1] || "";
    const imageUrl = this.decodeUrl(rawCover);

    const publisher = (html.match(/<b>Publisher:<\/b>\s*<a[^>]+>([^<]+)<\/a>/) || [])[1]?.trim() || "";
    const year      = (html.match(/<b>Year:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const pages     = (html.match(/<b>Pictures:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const language  = (html.match(/<b>Language:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const size      = (html.match(/<b>Size:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";

    // Tags
    const genre = [];
    const tagsSection = html.match(/Tags:([\s\S]*?)<br>/)?.[1] || "";
    const tagPat = /<a[^>]+>([^<]+)<\/a>/g;
    let tm;
    while ((tm = tagPat.exec(tagsSection)) !== null) {
      genre.push(tm[1].trim());
    }

    // Description block
    const descBlock = html.match(/<div class="mc-right"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    // Strip HTML tags and build clean description
    const descClean = descBlock
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const descParts = [
      publisher ? `Publisher: ${publisher}` : "",
      year      ? `Year: ${year}` : "",
      pages     ? `Pages: ${pages}` : "",
      language  ? `Language: ${language}` : "",
      size      ? `File size: ${size}` : "",
    ].filter(Boolean);
    const description = descParts.join("  •  ");

    // Download links — can be multiple (mirrors)
    const chapters = [];
    const dlPat = /href="(https?:\/\/[^"]+)"[^>]*(?:class="button"[^>]*|[^>]*class="button")[^>]*>([^<]*(?:DOWNLOAD|download|Download)[^<]*)</g;
    let dlm;
    let idx = 0;
    while ((dlm = dlPat.exec(html)) !== null) {
      const dlUrl  = dlm[1];
      const dlHost = (() => { try { return new URL(dlUrl).hostname.replace("www.", ""); } catch { return "Download"; } })();
      chapters.push({
        name:        idx === 0 ? `Download via ${dlHost} (${pages ? pages + " pages" : size || "?"})` : `Mirror ${idx + 1} — ${dlHost}`,
        url:         dlUrl,
        dateUpload:  year ? `${year}-01-01` : "",
        scanlator:   language || "English",
        chapterNumber: idx + 1
      });
      idx++;
    }

    // Fallback: find any .button link
    if (chapters.length === 0) {
      const fallback = (html.match(/href="(https?:\/\/[^"]+)"[^>]*class="button"/) ||
                        html.match(/class="button"[^>]*href="(https?:\/\/[^"]+)"/))?.[1];
      if (fallback) {
        const host = (() => { try { return new URL(fallback).hostname.replace("www.", ""); } catch { return "Download"; } })();
        chapters.push({
          name: `Download via ${host} (${pages || "?"} pages)`,
          url: fallback,
          dateUpload: year ? `${year}-01-01` : "",
          scanlator: language || "English",
          chapterNumber: 1
        });
      }
    }

    return {
      name: title,
      imageUrl,
      description,
      genre,
      status: 1,       // completed (single-issue comics)
      author: publisher,
      artist: "",
      chapters
    };
  }

  // getPageList: the "chapter" URL is a file-host download page.
  // Return it as a single external page so the app can open it.
  async getPageList(url) {
    return [{ url, index: 0 }];
  }

  // ─── Filters ─────────────────────────────────────────────────────────────

  getFilterList() {
    const publishers = [
      ["All",                   ""],
      ["Marvel",                "marvels"],
      ["DC",                    "dc"],
      ["IDW",                   "idw"],
      ["Dark Horse",            "dark-horse"],
      ["Dynamite",              "dynamite"],
      ["Vertigo",               "vertigo-comics"],
      ["Boom",                  "boom-comics"],
      ["Valiant",               "valiant-comics"],
      ["Zenescope",             "zenescope"],
      ["Graphic Novels",        "graphic-novels"],
      ["Nonfiction / Picture Book", "nonfiction-picture-book"],
      ["AAM / Markosia",        "aam-markosia"],
      ["Abstract Studio",       "abstract-studi"],
      ["Action Lab",            "action-lab-entertainment"],
      ["Antarctic Press",       "antarctic-press"],
      ["Archaia Studios",       "archaia-studios"],
      ["Archie",                "archie"],
      ["Aspen MLT",             "aspen-mlt"],
      ["Avatar Press",          "avatar-press"],
      ["Big Dog Ink",           "big-dog-ink"],
      ["Bluewater",             "bluewater-productions"],
      ["Bongo",                 "bongo"],
      ["Chaos",                 "chaos"],
      ["Disney",                "disney-comics"],
      ["Epic Comics",           "epic"],
      ["Monkeybrain",           "monkeybrain"],
      ["Oni Press",             "oni-press"],
      ["Titan Comics",          "titan"],
      ["Top Cow",               "top-cow"],
      ["WildStorm",             "wildstorm"],
      ["Magazines",             "magazine"],
      ["Collections",           "collections-of-comic"],
      ["Other Comics",          "comics"],
      ["Adult",                 "adult"],
    ];

    const currentYear = new Date().getFullYear();
    const years = [
      { type_name: "SelectOption", name: "Any", value: "" }
    ];
    for (let y = currentYear; y >= 1938; y--) {
      years.push({ type_name: "SelectOption", name: String(y), value: String(y) });
    }

    return [
      // ── Publisher ──────────────────────────────────────────────────────
      {
        type_name: "SelectFilter",
        name: "Publisher",
        state: 0,
        values: publishers.map(([name, value]) => ({
          type_name: "SelectOption",
          name,
          value
        }))
      },

      // ── Year ──────────────────────────────────────────────────────────
      {
        type_name: "SelectFilter",
        name: "Year",
        state: 0,
        values: years
      },

      // ── Tag (free text, browse /tags/TAG/) ────────────────────────────
      {
        type_name: "HeaderFilter",
        name: "Browse by tag — enter tag name exactly as on the site"
      },
      {
        type_name: "TextFilter",
        name: "Tag",
        state: ""
      },

      // ── Common tags as quick checkboxes ───────────────────────────────
      {
        type_name: "HeaderFilter",
        name: "Common Tags (enter one name above, or use quick picks below)"
      },
      {
        type_name: "GroupFilter",
        name: "Genre Tags",
        state: [
          ["Action",            "Action"],
          ["Adventure",         "Adventure"],
          ["Aliens",            "Aliens"],
          ["Anthology",         "Anthology"],
          ["Comedy",            "Comedy"],
          ["Crime",             "Crime"],
          ["Dark",              "Dark"],
          ["Drama",             "Drama"],
          ["Fantasy",           "Fantasy"],
          ["Historical Fiction","Historical Fiction"],
          ["Horror",            "Horror"],
          ["Humor",             "Humor"],
          ["Military",          "Military"],
          ["Mystery",           "Mystery"],
          ["Romance",           "Romance"],
          ["Sci-Fi",            "Sci-Fi"],
          ["Space Opera",       "Space Opera"],
          ["Steampunk",         "Steampunk"],
          ["Superhero",         "Superhero"],
          ["Supernatural",      "Supernatural"],
          ["Thriller",          "Thrillers"],
          ["Vampires",          "Vampires"],
          ["War",               "War"],
          ["Western",           "Western"],
          ["Zombies",           "Zombies"],
        ].map(([name, value]) => ({
          type_name: "CheckBox",
          name,
          value
        }))
      },

      // ── Publisher as tags ────────────────────────────────────────────
      {
        type_name: "GroupFilter",
        name: "Publisher Tags",
        state: [
          ["Marvel Comics",     "marvel comics"],
          ["DC Comics",         "dc comics"],
          ["IDW",               "IDW"],
          ["Dark Horse",        "Dark Horse"],
          ["Image Comics",      "Image Comics"],
          ["Vertigo",           "Vertigo"],
          ["Boom Studios",      "Boom Studios"],
          ["Dynamite",          "Dynamite"],
          ["Valiant",           "Valiant"],
          ["Wildstorm",         "Wildstorm"],
        ].map(([name, value]) => ({
          type_name: "CheckBox",
          name,
          value
        }))
      },

      // ── Character tags ───────────────────────────────────────────────
      {
        type_name: "GroupFilter",
        name: "Character Tags",
        state: [
          ["Spider-Man",        "Spider-Man"],
          ["Batman",            "Batman"],
          ["Superman",          "Superman"],
          ["X-Men",             "X-Men"],
          ["Wolverine",         "Wolverine"],
          ["Iron Man",          "Iron Man"],
          ["Captain America",   "Captain America"],
          ["Thor",              "Thor"],
          ["Hulk",              "Hulk"],
          ["Deadpool",          "Deadpool"],
          ["Wonder Woman",      "Wonder Woman"],
          ["Flash",             "Flash"],
          ["Green Lantern",     "Green Lantern"],
          ["Avengers",          "Avengers"],
          ["Justice League",    "Justice League"],
          ["Guardians of the Galaxy", "Guardians of the Galaxy"],
          ["Black Panther",     "Black Panther"],
          ["Daredevil",         "Daredevil"],
          ["Venom",             "Venom"],
        ].map(([name, value]) => ({
          type_name: "CheckBox",
          name,
          value
        }))
      },
    ];
  }

  // Handle quick-pick checkboxes: if any checkbox is checked, use it as the Tag value
  _resolveTag(filterList) {
    const tagFilter = filterList.find(f => f.name === "Tag");
    if (tagFilter?.state?.trim()) return tagFilter.state.trim();

    for (const group of filterList) {
      if (group.type_name === "GroupFilter" && Array.isArray(group.state)) {
        for (const cb of group.state) {
          if (cb.state === true || cb.state === 1) {
            return cb.value;
          }
        }
      }
    }
    return "";
  }
}
