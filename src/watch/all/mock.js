// ══════════════════════════════════════════════════════════════
//  Watch Mock  v1.0.0
//  Extension 100 % statique — aucune requête HTTP.
//  Images réelles depuis image.tmdb.org (CDN CORS-enabled).
//  But : tester l'UI home (carousel, sections, catalogue) sur web.
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
  "name": "Watch Mock",
  "lang": "all",
  "id": 9999999901,
  "baseUrl": "https://image.tmdb.org",
  "apiUrl": "",
  "iconUrl": "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb20f684adbe4c1a8dba0ef8a9236e.svg",
  "typeSource": "single",
  "isManga": false,
  "itemType": 1,
  "version": "1.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "isNsfw": false,
  "hasCloudflare": false,
  "pkgPath": "watch/all/mock.js",
  "requiresAccount": false,
  "hasDRM": false,
  "isAggregator": false,
  "paywall": "free",
  "hasSubtitles": false,
  "hasDub": false,
  "notes": "Extension mock statique — images TMDB réelles, zéro requête HTTP. Idéal pour tester l'UI sur web."
}];

// ── Images TMDB (CDN public CORS-friendly) ────────────────────────────────
// Bannières 16:9 (backdrop w1280)
var BD = "https://image.tmdb.org/t/p/w1280";
// Posters portrait (w500)
var P  = "https://image.tmdb.org/t/p/w500";

var MOCK_BANNERS = [
  { name:"Dune : Deuxième Partie",   imageUrl: BD+"/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", link:"mock://1", description:"Paul Atreides s'unit aux Fremen pour mener une guerre sainte.", genre:"Sci-Fi · Aventure" },
  { name:"Avengers : Endgame",        imageUrl: BD+"/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", link:"mock://2", description:"Les Avengers s'unissent pour annuler les actions de Thanos.", genre:"Action · Aventure" },
  { name:"Top Gun : Maverick",        imageUrl: BD+"/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg", link:"mock://3", description:"Maverick repousse ses limites en tant que pilote d'essai.", genre:"Action · Drame" },
  { name:"Interstellar",              imageUrl: BD+"/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg", link:"mock://4", description:"Des explorateurs voyagent à travers un trou de ver dans l'espace.", genre:"Sci-Fi · Drame" },
  { name:"Avatar : La Voie de l'Eau", imageUrl: BD+"/s16H6tpK2utvwpazeGkIWV0AiOY.jpg", link:"mock://5", description:"Jake Sully et Ney'tiri fondent une famille et font tout pour rester ensemble.", genre:"Sci-Fi · Aventure" },
  { name:"Black Panther : Wakanda Forever", imageUrl: BD+"/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg", link:"mock://6", description:"La reine Ramonda, Shuri et les Dora Milaje luttent pour protéger Wakanda.", genre:"Action · Aventure" },
  { name:"The Batman",                imageUrl: BD+"/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", link:"mock://7", description:"Dans sa deuxième année en tant que Batman, Bruce Wayne enquête.", genre:"Action · Crime" },
  { name:"Oppenheimer",               imageUrl: BD+"/feDduqKMl6E3VBB97GPRkv7VuAl.jpg", link:"mock://8", description:"L'histoire du scientifique qui a développé la bombe atomique.", genre:"Drame · Histoire" },
];

var MOCK_TRENDING = [
  { name:"Inception",          imageUrl: P+"/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",  link:"mock://11", genre:"Sci-Fi · Thriller" },
  { name:"The Dark Knight",    imageUrl: P+"/qJ2tW6WMUDux911r6m7haRef0WH.jpg",  link:"mock://12", genre:"Action · Crime" },
  { name:"Parasite",           imageUrl: P+"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",  link:"mock://13", genre:"Thriller · Drame" },
  { name:"Spider-Man: NWH",    imageUrl: P+"/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",  link:"mock://14", genre:"Action · Aventure" },
  { name:"Everything Everywhere", imageUrl: P+"/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg", link:"mock://15", genre:"Action · Comédie" },
  { name:"The Shawshank Redemption", imageUrl: P+"/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg", link:"mock://16", genre:"Drame · Crime" },
  { name:"The Godfather",      imageUrl: P+"/3bhkrj58Vtu7enYsLegiokantuP.jpg",  link:"mock://17", genre:"Crime · Drame" },
  { name:"Pulp Fiction",       imageUrl: P+"/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",  link:"mock://18", genre:"Crime · Drame" },
  { name:"Fight Club",         imageUrl: P+"/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",  link:"mock://19", genre:"Thriller · Drame" },
  { name:"Goodfellas",         imageUrl: P+"/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",  link:"mock://20", genre:"Crime · Biopic" },
];

var MOCK_ANIME = [
  { name:"Demon Slayer",           imageUrl: P+"/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg", link:"mock://21", genre:"Anime · Action" },
  { name:"Attack on Titan",        imageUrl: P+"/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", link:"mock://22", genre:"Anime · Action" },
  { name:"Jujutsu Kaisen",         imageUrl: P+"/oMeuaBKBdOGzGj66jIl7vnzUMuW.jpg", link:"mock://23", genre:"Anime · Action" },
  { name:"One Piece",              imageUrl: P+"/e3NBGiAifW9Xt8xD5tpARskjccO.jpg", link:"mock://24", genre:"Anime · Aventure" },
  { name:"Naruto Shippuden",       imageUrl: P+"/xppeysfvDKVx775MCV9Le04bsCC.jpg", link:"mock://25", genre:"Anime · Action" },
  { name:"Sword Art Online",       imageUrl: P+"/yXMd0lJHkTjqJ1a0OqGCUQQoGJN.jpg", link:"mock://26", genre:"Anime · Fantaisie" },
  { name:"My Hero Academia",       imageUrl: P+"/mMCkAhPeFvjlfMopGcPaRz4TCBV.jpg", link:"mock://27", genre:"Anime · Super-héros" },
  { name:"Hunter x Hunter",        imageUrl: P+"/kpKm1Z7JzHzYkNbS0MevNDFCFbi.jpg", link:"mock://28", genre:"Anime · Aventure" },
];

var MOCK_RANKED = [
  { name:"The Shawshank Redemption", imageUrl: P+"/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg", link:"mock://31" },
  { name:"The Godfather",           imageUrl: P+"/3bhkrj58Vtu7enYsLegiokantuP.jpg",  link:"mock://32" },
  { name:"The Dark Knight",         imageUrl: P+"/qJ2tW6WMUDux911r6m7haRef0WH.jpg",  link:"mock://33" },
  { name:"Pulp Fiction",            imageUrl: P+"/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",  link:"mock://34" },
  { name:"Inception",               imageUrl: P+"/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",  link:"mock://35" },
  { name:"Interstellar",            imageUrl: P+"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",  link:"mock://36" },
  { name:"Parasite",                imageUrl: P+"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",  link:"mock://37" },
  { name:"Goodfellas",              imageUrl: P+"/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",  link:"mock://38" },
  { name:"Fight Club",              imageUrl: P+"/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",  link:"mock://39" },
  { name:"The Matrix",              imageUrl: P+"/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",  link:"mock://40" },
  { name:"Schindler's List",        imageUrl: P+"/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",  link:"mock://41" },
  { name:"The Silence of the Lambs",imageUrl: P+"/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg", link:"mock://42" },
  { name:"Forrest Gump",            imageUrl: P+"/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",  link:"mock://43" },
  { name:"The Lord of the Rings",   imageUrl: P+"/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",  link:"mock://44" },
  { name:"12 Angry Men",            imageUrl: P+"/ppd84D2i9W8jXmsyInGyihiSyqz.jpg",  link:"mock://45" },
];

var MOCK_CATALOGUE = [
  { name:"Avengers: Endgame",  imageUrl: P+"/or06FN3Dka5tukK1e9sl16pB3iy.jpg",  link:"mock://51" },
  { name:"Dune",               imageUrl: P+"/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",  link:"mock://52" },
  { name:"Top Gun: Maverick",  imageUrl: P+"/62HCnUTGFIF1I7jqy5GL9ftHc43.jpg",  link:"mock://53" },
  { name:"Avatar 2",           imageUrl: P+"/t6HIqrRAclMCA60NsSbj3Z5cdkx.jpg",  link:"mock://54" },
  { name:"Black Panther",      imageUrl: P+"/uxzzxijgPIY7slzFvMotPv8wjKA.jpg",  link:"mock://55" },
  { name:"Oppenheimer",        imageUrl: P+"/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",  link:"mock://56" },
  { name:"Barbie",             imageUrl: P+"/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",  link:"mock://57" },
  { name:"The Batman",         imageUrl: P+"/74xTEgt7R36Fpooo50r9T25onhq.jpg",  link:"mock://58" },
  { name:"Doctor Strange 2",   imageUrl: P+"/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg",  link:"mock://59" },
  { name:"Thor: Love Thunder", imageUrl: P+"/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",  link:"mock://60" },
  { name:"Spider-Man: NWH",    imageUrl: P+"/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",  link:"mock://61" },
  { name:"Shang-Chi",          imageUrl: P+"/1BIoJGKbXjdFDAqUEiA2VHqkMXZ.jpg",  link:"mock://62" },
  { name:"Eternals",           imageUrl: P+"/bcCBq9N1EMo3daNbbe2J3M4s5qZ.jpg",  link:"mock://63" },
  { name:"Black Widow",        imageUrl: P+"/qAZ0pzat24kLdO0cOy4aTtERE9A.jpg",  link:"mock://64" },
  { name:"Guardians 3",        imageUrl: P+"/r2J02Z2OpNTctfOSN1Ydgd2xLR1.jpg",  link:"mock://65" },
  { name:"Ant-Man 3",          imageUrl: P+"/Dkdk7PdOoHGcLiXYoFhKhMrHEk.jpg",  link:"mock://66" },
  { name:"Wakanda Forever",    imageUrl: P+"/sv1xJUazXoQuIDQqQp8CyxCTKNQ.jpg",  link:"mock://67" },
  { name:"Captain Marvel",     imageUrl: P+"/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg",  link:"mock://68" },
  { name:"Loki",               imageUrl: P+"/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg",  link:"mock://69" },
  { name:"WandaVision",        imageUrl: P+"/glKDfE6btIRcmuj2mFw58Op38Dg.jpg",  link:"mock://70" },
  { name:"Falcon & WS",        imageUrl: P+"/6kbAMLteGO8yyewYau6bJ683sw7.jpg",  link:"mock://71" },
  { name:"Hawkeye",            imageUrl: P+"/4Md3RKlLvnBLJhf8FFm0OXOBSYF.jpg",  link:"mock://72" },
  { name:"Ms. Marvel",         imageUrl: P+"/RlRSMqVCAQaGYZSJYCWETh7LGz.jpg",  link:"mock://73" },
  { name:"She-Hulk",           imageUrl: P+"/hJfI6AGrmr4uSHRccfJuSsapvOb.jpg",  link:"mock://74" },
  { name:"Moon Knight",        imageUrl: P+"/x6FsYvt33846IQnDt7HOBNwvu5x.jpg",  link:"mock://75" },
  { name:"Secret Invasion",    imageUrl: P+"/4m4kWbR3JMSXNj6u9BbNF9zUKpK.jpg",  link:"mock://76" },
];

// ── MProvider Implementation ──────────────────────────────────────────────────

class DefaultExtension extends MProvider {
  constructor() { super(); this.client.headers = {}; }

  get supportsLatest() { return false; }

  // Called synchronously — returns section descriptors
async getCustomList(listId, page) {
    // Carousel — bannières 16:9
    if (listId === "carousel") {
      return { list: MOCK_BANNERS.map(m => this._item(m)), hasNextPage: false };
    }
    // Category chips — redirige vers spotlight
    if (listId.startsWith("cat_")) {
      return { list: MOCK_TRENDING.map(m => this._item(m)), hasNextPage: false };
    }
    // Trending spotlight
    if (listId === "trending") {
      return { list: MOCK_TRENDING.map(m => this._item(m)), hasNextPage: false };
    }
    // Anime spotlight
    if (listId === "anime") {
      return { list: MOCK_ANIME.map(m => this._item(m)), hasNextPage: false };
    }
    // Ranked top 15
    if (listId === "top15") {
      return { list: MOCK_RANKED.map(m => this._item(m)), hasNextPage: false };
    }
    // Catalogue paginé (items / page)
    if (listId === "catalogue") {
      const perPage = this._pageSize();
      const start = (page - 1) * perPage;
      const slice = MOCK_CATALOGUE.slice(start, start + perPage);
      return { list: slice.map(m => this._item(m)), hasNextPage: start + perPage < MOCK_CATALOGUE.length };
    }
    return { list: [], hasNextPage: false };
  }

  _pageSize() {
    try {
      const v = parseInt(new SharedPreferences().get("page_size"), 10);
      if (v && v > 0) return v;
    } catch (_) {}
    return 10;
  }

  async getPopular(page) {
    const perPage = this._pageSize();
    const all = [...MOCK_BANNERS, ...MOCK_TRENDING];
    const start = (page - 1) * perPage;
    return {
      list: all.slice(start, start + perPage).map(m => this._item(m)),
      hasNextPage: start + perPage < all.length
    };
  }

  async getLatestUpdates(page) {
    return { list: MOCK_ANIME.map(m => this._item(m)), hasNextPage: false };
  }

  async search(query, page, filters) {
    const q = (query || "").toLowerCase();
    const all = [...MOCK_BANNERS, ...MOCK_TRENDING, ...MOCK_ANIME, ...MOCK_RANKED];
    const results = q
      ? all.filter(m => m.name.toLowerCase().includes(q))
      : all;
    return { list: results.slice(0, this._pageSize()).map(m => this._item(m)), hasNextPage: false };
  }

  async getDetail(url) {
    const all = [...MOCK_BANNERS, ...MOCK_TRENDING, ...MOCK_ANIME, ...MOCK_RANKED, ...MOCK_CATALOGUE];
    const found = all.find(m => m.link === url) || { name: "Mock Item", imageUrl: "", link: url, genre: "Mock", description: "" };
    return {
      name:        found.name,
      imageUrl:    found.imageUrl,
      description: found.description || "Contenu de démonstration — extension mock.",
      genre:       found.genre ? [found.genre] : ["Mock"],
      status:      1,
      episodes: [{
        name:        "Épisode 1 — Demo",
        url:         url,
        dateUpload:  "2024-01-01"
      }]
    };
  }

  async getVideoList(url) {
    // No real video — return an empty list (web test only)
    return [];
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  _item(m) {
    return {
      name:        m.name,
      imageUrl:    m.imageUrl,
      link:        m.link,
      description: m.description || "",
      genre:       m.genre || "Mock",
      author:      "",
      artist:      "",
      status:      1,
    };
  }

  getSourcePreferences() {
    return [
      {
        key: "page_size",
        listPreference: {
          title: "Résultats par page",
          summary: "Nombre d'éléments mock affichés par liste (catalogue, populaire, recherche)",
          valueIndex: 1,
          entries: ["5", "10 (recommandé)", "20", "30"],
          entryValues: ["5", "10", "20", "30"]
        }
      }
    ];
  }
}

function main(source) {
  return new DefaultExtension(source);
}
