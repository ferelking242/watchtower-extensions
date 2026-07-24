const watchtowerSources = [
  {
    "id": 748291056,
    "name": "ComicsAll",
    "lang": "en",
    "baseUrl": "https://comics-all.com",
    "apiUrl": "",
    "iconUrl": "https://comics-all.com/templates/creamy-melons7/images/favicon.png",
    "typeSource": "single",
    "itemType": 0,
    "isManga": true,
    "version": "0.1.4",
    "pkgPath": "manga/en/comics_all.js",
    "isNsfw": false,
    "appMinVerReq": "0.5.0",
    "notes": "Download-only — .cbz/.cbr files via external hosts (florenfile, etc.)"
  }
];

const BASE_URL = "https://comics-all.com";

class DefaultExtension extends MProvider {
  constructor() {
    super();
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

  fixUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return BASE_URL + url;
    return BASE_URL + "/" + url;
  }

  parseList(html) {
    const list = [];
    const pattern = /class="preview-img img-box"\s+href="([^"]+)"[\s\S]*?<img\s+src="([^"]+)"[^>]*alt="([^"]+)"/g;
    let m;
    while ((m = pattern.exec(html)) !== null) {
      list.push({
        link:     this.fixUrl(m[1]),
        imageUrl: this.fixUrl(this.decodeUrl(m[2])),
        name:     m[3]
      });
    }
    const navMatch = html.match(/class="navigation"[^>]*>([\s\S]*?)<\/div>/);
    let hasNextPage = false;
    if (navMatch && list.length > 0) {
      hasNextPage = /class="navigation"[\s\S]*?<a\s+href/.test(navMatch[0]);
    }
    return { list, hasNextPage: hasNextPage || list.length >= 10 };
  }

  publisherUrl(slug, page) {
    if (!slug) {
      return page <= 1 ? BASE_URL + "/" : `${BASE_URL}/page/${page}/`;
    }
    return page <= 1
      ? `${BASE_URL}/${slug}`
      : `${BASE_URL}/${slug}/page/${page}/`;
  }

  // ─── Core Methods ─────────────────────────────────────────────────────────

  async getPopular(page) {
    const url = this.publisherUrl("", page);
    const res = await new Client().get(url, this.getHeaders());
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
      if (page > 1) return { list: [], hasNextPage: false };
      url = `${BASE_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
    } else if (tag) {
      const encoded = encodeURIComponent(tag);
      url = page <= 1
        ? `${BASE_URL}/tags/${encoded}/`
        : `${BASE_URL}/tags/${encoded}/page/${page}/`;
    } else if (year) {
      url = page <= 1
        ? `${BASE_URL}/${year}/`
        : `${BASE_URL}/${year}/page/${page}/`;
    } else if (publisher) {
      url = this.publisherUrl(publisher, page);
    } else {
      return this.getPopular(page);
    }

    const res = await new Client().get(url, this.getHeaders());
    const result = this.parseList(res.body);
    if (query) result.hasNextPage = false;
    return result;
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders());
    const html = res.body;

    const title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1]?.trim() || "";

    const rawCover = (html.match(/<div class="mc-left"><img\s+src="([^"]+)"/) || [])[1] || "";
    const imageUrl = this.fixUrl(this.decodeUrl(rawCover));

    const publisher = (html.match(/<b>Publisher:<\/b>\s*<a[^>]+>([^<]+)<\/a>/) || [])[1]?.trim() || "";
    const year      = (html.match(/<b>Year:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const pages     = (html.match(/<b>Pictures:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const language  = (html.match(/<b>Language:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";
    const size      = (html.match(/<b>Size:<\/b>\s*([^<\n]+?)\s*<br>/) || [])[1]?.trim() || "";

    // Tags — collect from the Tags: section
    const genre = [];
    const tagsSection = html.match(/Tags:([\s\S]*?)<br>/)?.[1] || "";
    const tagPat = /<a[^>]+>([^<]+)<\/a>/g;
    let tm;
    while ((tm = tagPat.exec(tagsSection)) !== null) {
      genre.push(tm[1].trim());
    }

    // Description — rich multiline block with all metadata + tags
    const descLines = [
      publisher ? `📦  Publisher: ${publisher}` : "",
      year      ? `📅  Year: ${year}` : "",
      pages     ? `📄  Issues / Pages: ${pages}` : "",
      language  ? `🌐  Language: ${language}` : "",
      size      ? `💾  Size: ${size}` : "",
      genre.length > 0 ? `🏷️  Tags: ${genre.join(" · ")}` : "",
      "",
      "⬇️  Download-only source — tap a chapter link to download the .cbz/.cbr file.",
    ].filter(l => l !== undefined);

    // Remove leading empty lines, collapse multiple blanks
    const description = descLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // Download links — treat each external button as a "chapter" (download entry)
    const chapters = [];
    const dlPat = /href="(https?:\/\/[^"]+)"[^>]*(?:class="button"[^>]*|[^>]*class="button")[^>]*>([^<]*(?:DOWNLOAD|download|Download)[^<]*)</g;
    let dlm;
    let idx = 0;
    while ((dlm = dlPat.exec(html)) !== null) {
      const dlUrl  = dlm[1];
      const dlHost = (() => {
        try { return new URL(dlUrl).hostname.replace("www.", ""); }
        catch { return "Download"; }
      })();
      const label = idx === 0
        ? `⬇️  Download — ${dlHost}${pages ? "  (" + pages + " issues)" : size ? "  (" + size + ")" : ""}`
        : `⬇️  Mirror ${idx + 1} — ${dlHost}`;
      chapters.push({
        name:          label,
        url:           dlUrl,
        dateUpload:    year ? `${year}-01-01` : "",
        scanlator:     language || "English",
        chapterNumber: idx + 1
      });
      idx++;
    }

    // Fallback: any button link
    if (chapters.length === 0) {
      const fallback = (
        html.match(/href="(https?:\/\/[^"]+)"[^>]*class="button"/) ||
        html.match(/class="button"[^>]*href="(https?:\/\/[^"]+)"/)
      )?.[1];
      if (fallback) {
        const host = (() => {
          try { return new URL(fallback).hostname.replace("www.", ""); }
          catch { return "Download"; }
        })();
        chapters.push({
          name:          `⬇️  Download — ${host}${pages ? "  (" + pages + " issues)" : size ? "  (" + size + ")" : ""}`,
          url:           fallback,
          dateUpload:    year ? `${year}-01-01` : "",
          scanlator:     language || "English",
          chapterNumber: 1
        });
      }
    }

    return {
      name:        title,
      imageUrl,
      description,
      genre,
      status:      1,
      author:      publisher,
      artist:      "",
      chapters
    };
  }

  // ─── Page List — Download-only toast ─────────────────────────────────────
  // ComicsAll provides .cbz/.cbr download links, not readable image pages.
  // Throwing here causes the app to surface a toast instead of opening
  // a broken reader with a non-image URL.
  async getPageList(url) {
    throw new Error(
      "⬇️  Download only\n\nThis extension does not support in-app reading.\nTap the chapter link to open the download page."
    );
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
      {
        type_name: "SelectFilter",
        name: "Year",
        state: 0,
        values: years
      },
      {
        type_name: "TextFilter",
        name: "Tag",
        state: ""
      },
      {
        type_name: "GroupFilter",
        name: "Genre Tags",
        state: [
          ["Action",            "Action"],
          ["Adventure",         "Adventure"],
          ["Anthology",         "Anthology"],
          ["Biographical",      "Biographical"],
          ["Comedy",            "Comedy"],
          ["Crime",             "Crime"],
          ["Drama",             "Drama"],
          ["Fantasy",           "Fantasy"],
          ["Historical",        "Historical"],
          ["Horror",            "Horror"],
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

async getCustomList(listId, page) {
    if (listId === "popular") {
      return this.getPopular(page);
    }
    return this.getLatestUpdates(page);
  }
}
