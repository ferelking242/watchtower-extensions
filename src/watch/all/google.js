const watchtowerSources = [{
  "name": "Google",
  "lang": "all",
  "id": 1923847560,
  "baseUrl": "https://www.google.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.2"
}];

const BASE_URL = "https://www.google.com";
const ICON = "https://www.google.com/favicon.ico";

class DefaultExtension extends MProvider {
  constructor() { super(); }

  get supportsLatest() { return false; }

  async getPopular(page) {
    return {
      list: [{
        name: "Ouvrir Google",
        imageUrl: ICON,
        link: BASE_URL
      }],
      hasNextPage: false
    };
  }

  async getLatestUpdates(page) {
    return { list: [], hasNextPage: false };
  }

  _searchPrefs() {
    var hl = "";
    var num = 10;
    var safe = "";
    try {
      var l = new SharedPreferences().get("search_lang");
      if (l && l !== "auto") hl = l;
      var n = parseInt(new SharedPreferences().get("results_per_page"), 10);
      if (n && n > 0) num = n;
      if (new SharedPreferences().get("safe_search") === true) safe = "active";
    } catch (_) {}
    return { hl: hl, num: num, safe: safe };
  }

  async search(query, page, filters) {
    const p = this._searchPrefs();
    let url = query
      ? `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      : BASE_URL;
    if (query) {
      url += `&num=${p.num}`;
      if (p.hl) url += `&hl=${p.hl}`;
      if (p.safe) url += `&safe=${p.safe}`;
    }
    return {
      list: [{
        name: query ? `Rechercher "${query}"` : "Ouvrir Google",
        imageUrl: ICON,
        link: url
      }],
      hasNextPage: false
    };
  }

  async getDetail(url) {
    return {
      name: "Google",
      imageUrl: ICON,
      url: url,
      episodes: [{
        name: "Ouvrir dans le WebView",
        url: url,
        dateUpload: ""
      }]
    };
  }

  async getVideoList(url) {
    return [{ url, quality: "WebView", originalUrl: url }];
  }

  getSourcePreferences() {
    return [
      {
        key: "search_lang",
        listPreference: {
          title: "Langue de recherche",
          summary: "Langue des résultats Google (paramètre hl). Auto = langue du téléphone.",
          valueIndex: 0,
          entries: ["Auto", "Français", "English", "Español", "Deutsch", "Italiano", "Português", "Nederlands", "Polski", "Русский", "日本語", "한국어", "中文", "العربية", "Türkçe"],
          entryValues: ["auto", "fr", "en", "es", "de", "it", "pt", "nl", "pl", "ru", "ja", "ko", "zh", "ar", "tr"]
        }
      },
      {
        key: "results_per_page",
        listPreference: {
          title: "Résultats par page",
          summary: "Nombre de résultats demandés à Google (paramètre num)",
          valueIndex: 0,
          entries: ["10", "20", "30", "50"],
          entryValues: ["10", "20", "30", "50"]
        }
      },
      {
        key: "safe_search",
        switchPreferenceCompat: {
          title: "SafeSearch actif",
          summary: "Filtre les résultats explicites (paramètre safe=active)",
          value: false
        }
      }
    ];
  }
}

function main(source) {
  return new DefaultExtension(source);
}
