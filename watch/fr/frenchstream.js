const watchtowerSources = [{
      "name": "French-Stream",
      "langs": ["fr"],
      "ids": { "fr": 112837465 },
      "baseUrl": "https://french-stream.one",
      "apiUrl": "https://french-stream.one",
      "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.frenchstream.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.8",
      "pkgPath": "watch/fr/frenchstream.js",
      "editableBaseUrl": true,
      "customUserAgent": "",
      "videoQualities": ["AUTO", "vidzy", "uqload", "netu", "voe"],
      "contentSubtype": ["film", "serie"]
  }];

  class DefaultExtension extends MProvider {
      constructor() { super(); this.client = new Client(); }

      get baseUrl() {
          const p = this.source.prefs?.find(x => x.key === "base_url");
          return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
      }

      _hdrs(ref) {
          return {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": ref || (this.baseUrl + "/"),
              "Accept-Language": "fr-FR,fr;q=0.9"
          };
      }

      _parse(html) {
          const list = []; const seen = new Set();
          const re = /class="short-poster[^"]*"\s+href="([^"]+)"\s+alt="([^"]+)"[\s\S]{0,600}?<img[^>]+(?:data-src|src)="([^"]+)"/gi;
          let m;
          while ((m = re.exec(html)) !== null) {
              const href = m[1];
              const url = href.startsWith("http") ? href : (this.baseUrl + href);
              if (seen.has(url)) continue; seen.add(url);
              list.push({ link: url, imageUrl: m[3], name: m[2].trim() });
          }
          return list;
      }

      // Extract newsId from page URL or HTML
      _extractNewsId(url, html) {
          // From URL: ?newsid=123 or &newsid=123
          const fromUrl = url.match(/[?&]newsid=(\d+)/);
          if (fromUrl) return fromUrl[1];
          // From URL path: /12345-slug.html
          const fromPath = url.match(/\/([0-9]{4,})-[^/]+\.html/);
          if (fromPath) return fromPath[1];
          // From HTML data-news-id attribute (most reliable)
          if (html) {
              const fromHtml = html.match(/data-news-id="([^"]+)"/);
              if (fromHtml) return fromHtml[1];
          }
          return null;
      }

      // Fetch episode data from /static/series/{newsId}.js
      async _fetchEpisodeData(newsId, pageUrl) {
          const v = Math.floor(Date.now() / 30000);
          const paths = [
              `/static/series/${newsId}.js?v=${v}`,
              `/ep-data.php?id=${newsId}`,
              `/data/eps_${newsId}.txt`,
          ];
          for (const path of paths) {
              try {
                  const res = await this.client.get(
                      this.baseUrl + path,
                      this._hdrs(pageUrl)
                  );
                  if (res.statusCode < 400 && res.body && res.body.trim().startsWith("{")) {
                      return JSON.parse(res.body);
                  }
              } catch(e) {}
          }
          return null;
      }

      async getPopular(page) {
          const res = await this.client.get(`${this.baseUrl}/films/page/${page}/`, this._hdrs());
          const list = this._parse(res.body);
          return { list, hasNextPage: list.length >= 10 };
      }

      async getLatestUpdates(page) {
          const res = await this.client.get(`${this.baseUrl}/?do=lastupdate&page=${page}`, this._hdrs());
          const list = this._parse(res.body);
          return { list, hasNextPage: list.length >= 10 };
      }

      async search(query, page, filterList) {
          const gf = (filterList || []).find(f => f && f.name === "Genre");
          const genrePath = (gf && gf.values && gf.state > 0) ? gf.values[gf.state].value : "";
          if (!query && genrePath) {
              const res = await this.client.get(`${this.baseUrl}${genrePath}page/${page}/`, this._hdrs());
              const list = this._parse(res.body);
              return { list, hasNextPage: list.length >= 10 };
          }
          const from = (page - 1) * 10;
          const res = await this.client.get(
              `${this.baseUrl}/?do=search&subaction=search&story=${encodeURIComponent(query)}&from_page=${from}&full_search=0`,
              this._hdrs()
          );
          const list = this._parse(res.body);
          return { list, hasNextPage: list.length >= 10 };
      }

      async getDetail(url) {
          const res = await this.client.get(url, this._hdrs());
          const html = res.body;

          // Title
          const nameM = html.match(/<h1[^>]*id="s-title"[^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
                        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

          // Description
          const descM = html.match(/<p[^>]*class="[^"]*desc-text[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                        html.match(/<div[^>]+class="[^"]*fdesc[^"]*"[^>]*>\s*<p>([\s\S]*?)<\/p>/i) ||
                        html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                        html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

          // Poster
          const imgM = html.match(/url\((https?:\/\/image\.tmdb\.org\/[^)]+)\)/i) ||
                       html.match(/<img[^>]+(?:data-src|src)="(https?:\/\/image\.tmdb\.org\/[^"]+)"/i) ||
                       html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                       html.match(/<div[^>]+class="[^"]*(?:fposter|dvd-poster)[^"]*"[\s\S]{0,400}?<img[^>]+(?:data-src|src)="([^"]+)"/i);
          const imageUrl = imgM ? imgM[1] : "";

          const episodes = [];

          // Extract newsId from HTML data-news-id attribute or URL
          const newsId = this._extractNewsId(url, html);

          if (newsId) {
              // Fetch episode data from /static/series/{newsId}.js
              const epData = await this._fetchEpisodeData(newsId, url);

              if (epData) {
                  // Determine available types and preferred order
                  const types = ["vf", "vostfr", "vo"].filter(t => epData[t] && Object.keys(epData[t]).length > 0);

                  if (types.length > 0) {
                      // Build episode list: show each episode once.
                      // Use first available type for the episode list.
                      // getVideoList will expose all types as quality options.
                      const primaryType = types[0];
                      const epNums = Object.keys(epData[primaryType]).map(Number).sort((a, b) => a - b);

                      const basePageUrl = url.split("?")[0] + "?newsid=" + newsId;

                      for (const num of epNums) {
                          const epLabel = epNums.length === 1 ? (name || "Regarder") : (`Épisode ${String(num).padStart(2, "0")}`);
                          // Encode newsId, ep num, and available types into the URL
                          // getVideoList will decode this to fetch correct player URLs
                          episodes.push({
                              name: epLabel,
                              url: `${basePageUrl}&_ep=${num}&_nid=${newsId}`,
                              dateUpload: ""
                          });
                      }
                  }
              }
          }

          // Fallback: single episode (movie without serie-config or fetch failed)
          if (episodes.length === 0) {
              episodes.push({ name: name || "Regarder", url, dateUpload: "" });
          }

          return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
      }

      async getVideoList(url) {
          // Parse episode params from URL
          const epMatch = url.match(/[?&]_ep=(\d+)/);
          const nidMatch = url.match(/[?&]_nid=(\d+)/);
          const newsidMatch = url.match(/[?&]newsid=(\d+)/);

          const epNum = epMatch ? epMatch[1] : null;
          const newsId = nidMatch ? nidMatch[1] : (newsidMatch ? newsidMatch[1] : null);

          const videos = [];

          if (epNum && newsId) {
              // Fetch episode data and return all player URLs as quality options
              const pageUrl = url.replace(/[?&]_ep=[^&]+/g, "").replace(/[?&]_nid=[^&]+/g, "");
              const epData = await this._fetchEpisodeData(newsId, pageUrl);

              if (epData) {
                  const playerLabels = { vidzy: "Vidzy", uqload: "Uqload", netu: "Netu", voe: "Voe", premium: "Premium" };
                  const playerOrder = ["vidzy", "uqload", "netu", "voe", "premium"];
                  const types = ["vf", "vostfr", "vo", "vff", "vfq"];

                  for (const type of types) {
                      if (!epData[type]) continue;
                      const ep = epData[type][epNum] || epData[type][String(epNum)];
                      if (!ep) continue;
                      const typeLabel = type.toUpperCase();
                      for (const player of playerOrder) {
                          const embedUrl = ep[player];
                          if (!embedUrl || embedUrl.trim() === "" || embedUrl.includes("[xfvalue_")) continue;
                          const quality = `${typeLabel} · ${playerLabels[player] || player}`;
                          videos.push({ url: embedUrl, quality, originalUrl: embedUrl });
                      }
                  }
              }
          }

          // Fallback: broad extraction from page (for plain movie URLs or old cached URLs)
          if (videos.length === 0) {
              const pageUrl = url.replace(/[?&]_ep=[^&]+/g, "").replace(/[?&]_nid=[^&]+/g, "");
              const res = await this.client.get(pageUrl, this._hdrs(pageUrl));
              const html = res.body || "";

              // Try to get newsId from page and fetch ep 1 directly
              const nid = this._extractNewsId(pageUrl, html);
              if (nid) {
                  const epData = await this._fetchEpisodeData(nid, pageUrl);
                  if (epData) {
                      const playerLabels = { vidzy: "Vidzy", uqload: "Uqload", netu: "Netu", voe: "Voe", premium: "Premium" };
                      const playerOrder = ["vidzy", "uqload", "netu", "voe", "premium"];
                      const types = ["vf", "vostfr", "vo"];
                      for (const type of types) {
                          if (!epData[type]) continue;
                          const ep = epData[type]["1"] || epData[type][1];
                          if (!ep) continue;
                          const typeLabel = type.toUpperCase();
                          for (const player of playerOrder) {
                              const embedUrl = ep[player];
                              if (!embedUrl || embedUrl.trim() === "" || embedUrl.includes("[xfvalue_")) continue;
                              videos.push({ url: embedUrl, quality: `${typeLabel} · ${playerLabels[player] || player}`, originalUrl: embedUrl });
                          }
                      }
                  }
              }

              // Last resort: scrape iframes from page
              if (videos.length === 0) {
                  let m;
                  const ifrRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
                  while ((m = ifrRe.exec(html)) !== null) {
                      const src = m[1].startsWith("//") ? ("https:" + m[1]) : m[1];
                      if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook") && !src.includes("disqus"))
                          if (!videos.some(v => v.originalUrl === src))
                              videos.push({ url: src, quality: "Stream", originalUrl: src });
                  }
              }
          }

          return videos;
      }

      getFilterList() {
          return [
              { type: "SelectFilter", name: "Genre", state: 0, values: [
                  { name: "Tous", value: "" },
                  { name: "Action", value: "/films/actions/" },
                  { name: "Aventure", value: "/films/aventures/" },
                  { name: "Animation", value: "/films/animations/" },
                  { name: "Comédie", value: "/films/comedies/" },
                  { name: "Crime", value: "/films/policiers/" },
                  { name: "Documentaire", value: "/films/documentaires/" },
                  { name: "Drame", value: "/films/drames/" },
                  { name: "Famille", value: "/films/familles/" },
                  { name: "Fantastique", value: "/films/fantastiques/" },
                  { name: "Guerre", value: "/films/guerres/" },
                  { name: "Histoire", value: "/films/historiques/" },
                  { name: "Horreur", value: "/films/epouvante-horreurs/" },
                  { name: "Romance", value: "/films/romances/" },
                  { name: "Science-Fiction", value: "/films/science-fictions/" },
                  { name: "Thriller", value: "/films/thrillers/" }
              ]}
          ];
      }

      getSourcePreferences() {
          return [
              { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } }
          ];
      }
  }
  