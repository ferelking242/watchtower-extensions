const watchtowerSources = [{
  "name": "Google",
  "lang": "all",
  "baseUrl": "https://www.google.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/favicon.ico",
  "typeSource": "single",
  "isManga": false,
  "version": "1.0.0"
}];

class DefaultExtension extends WatchtowerExtension {
  constructor(source) { super(source); }

  async getPopular(page) {
    return { list: [], hasNextPage: false };
  }

  async getLatestUpdates(page) {
    return { list: [], hasNextPage: false };
  }

  async search(query, page, filters) {
    return {
      list: [{
        name: query || "Recherche Google",
        imageUrl: "https://www.google.com/favicon.ico",
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        genre: ""
      }],
      hasNextPage: false
    };
  }

  async getDetail(url) {
    return {
      name: "Google",
      imageUrl: "https://www.google.com/favicon.ico",
      url,
      episodes: [{
        name: "Ouvrir",
        url,
        dateUpload: ""
      }]
    };
  }

  async getVideoList(url) {
    return [{ url, quality: "WebView", originalUrl: url }];
  }
}

function main(source) {
  return new DefaultExtension(source);
}
