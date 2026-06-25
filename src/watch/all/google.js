const watchtowerSources = [{
  "name": "Google",
  "lang": "all",
  "id": 1923847560,
  "baseUrl": "https://www.google.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1"
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

  async search(query, page, filters) {
    const url = query
      ? `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      : BASE_URL;
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
}

function main(source) {
  return new DefaultExtension(source);
}
