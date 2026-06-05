const watchtowerSources = [{
      "name": "French-Stream",
      "langs": ["fr"],
      "ids": { "fr": 112837465 },
      "baseUrl": "https://french-stream.one",
      "apiUrl": "https://french-stream.one",
      "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.2.0",
      "pkgPath": "watch/fr/frenchstream.js",
      "editableBaseUrl": true,
      "customUserAgent": "",
      "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
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
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Referer": ref || (this.baseUrl + "/"),
              "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          };
      }

      _strip(s) { return (s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&nbsp;/g," ").trim(); }

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

      _extractNewsId(url, html) {
          const fromUrl = url.match(/[?&]newsid=(\d+)/);
          if (fromUrl) return fromUrl[1];
          const fromPath = url.match(/\/([0-9]{4,})-[^/]+\.html/);
          if (fromPath) return fromPath[1];
          if (html) {
              const m = html.match(/data-news-id="([^"]+)"/i)
                       || html.match(/news_id\s*=\s*['"']?(\d+)/i)
                       || html.match(/newsid=(\d+)/i);
              if (m) return m[1];
          }
          return null;
      }

      async _fetchEpisodeData(newsId, pageUrl) {
          const v = Math.floor(Date.now() / 30000);
          const paths = [
              `/static/series/${newsId}.js?v=${v}`,
              `/ep-data.php?id=${newsId}`,
              `/data/eps_${newsId}.txt`,
              `/ajax/series/${newsId}.json`,
          ];
          for (const path of paths) {
              try {
                  const res = await this.client.get(this.baseUrl + path, this._hdrs(pageUrl));
                  if (res.statusCode < 400 && res.body && res.body.trim()) {
                      const body = res.body.trim();
                      const start = body.startsWith("{") ? 0 : body.indexOf("{");
                      if (start >= 0) return JSON.parse(body.substring(start));
                  }
              } catch(e) {}
          }
          return null;
      }

      // ── Extract ALL player embed URLs from movie/episode HTML ─────────────────
      _extractEmbedUrls(html) {
          const urls = []; const seen = new Set();
          const push = (u, label) => {
              if (!u || u.length < 10) return;
              const full = u.startsWith("//") ? "https:" + u : u.startsWith("http") ? u : null;
              if (!full) return;
              if (seen.has(full)) return; seen.add(full);
              // Filter out known non-player URLs
              if (/google\.com|facebook\.com|recaptcha|disqus|ads\.|doubleclick/i.test(full)) return;
              urls.push({ url: full, label: label || _guessLabel(full) });
          };
          const _guessLabel = (u) => {
              if (/netu\.|netuplayer/i.test(u)) return "Netu";
              if (/uqload/i.test(u)) return "Uqload";
              if (/vidzy/i.test(u)) return "Vidzy";
              if (/voe\./i.test(u)) return "Voe";
              if (/upstream/i.test(u)) return "Upstream";
              if (/vidmoly|vidplay|filemoon|streamtape|doodstream/i.test(u)) return u.match(/([a-z0-9]+)\./i)?.[1] || "Stream";
              return "Stream";
          };

          // 1. <iframe src="..."> or <iframe data-src="...">
          let m;
          const ifRe = /<iframe[^>]+(?:data-src|src)="((?:https?:)?\/\/[^"]{8,})"/gi;
          while ((m = ifRe.exec(html)) !== null) push(m[1], null);

          // 2. onclick="loadPlayer('url')" or onclick="load_player('url')" or onclick="ShowPlayer('url')"
          const onclickRe = /onclick\s*=\s*["'][^"']*(?:load[Pp]layer|ShowPlayer|playVideo|openPlayer|setPlayer|showVideo)\s*\(\s*['"]([^'"]{8,})['"]/gi;
          while ((m = onclickRe.exec(html)) !== null) push(m[1], null);

          // 3. data-url="..." or data-src="..." on player buttons/links
          const dataUrlRe = /data-(?:url|src|embed|player|link)\s*=\s*["']((?:https?:)?\/\/[^"']{8,})["']/gi;
          while ((m = dataUrlRe.exec(html)) !== null) push(m[1], null);

          // 4. JavaScript string assignments: var playerUrl = "..."; or src = "...";
          const jsVarRe = /(?:player[Uu]rl|embedUrl|videoUrl|iframeSrc|playerSrc|src)\s*=\s*["']((?:https?:)?\/\/[^"']{12,})["']/g;
          while ((m = jsVarRe.exec(html)) !== null) push(m[1], null);

          // 5. href on <a> tags inside player sections
          const aRe = /class="[^"]*(?:player|stream|embed|watch|link-player)[^"]*"[^>]*href="((?:https?:)?\/\/[^"]{8,})"/gi;
          while ((m = aRe.exec(html)) !== null) push(m[1], null);

          // 6. JSON-like: "url":"...", "link":"...", "file":"..."
          const jsonRe = /"(?:url|link|file|embed|src)"\s*:\s*"((?:https?:)?\\?\/\\?\/[^"\\]{8,})"/g;
          while ((m = jsonRe.exec(html)) !== null) {
              const clean = m[1].replace(/\\\//g, "/");
              push(clean, null);
          }

          return urls;
      }

      // ── Label VF/VOSTFR buttons to detect language context ────────────────────
      _parseTabPlayers(html) {
          const results = [];
          // Pattern: tab containers with language labels and player buttons
          // e.g.: <div class="tab vf"><a href="..." class="player-btn">Netu</a></div>
          const tabRe = /<(?:div|section|ul)[^>]*class="[^"]*(?:tab|lang|version|player-tab|vf-tab|vostfr-tab)[^"]*"[^>]*>([\s\S]{0,2000}?)<\/(?:div|section|ul)>/gi;
          let tabM;
          while ((tabM = tabRe.exec(html)) !== null) {
              const block = tabM[1];
              // Detect language label
              const langM = block.match(/\b(vf|vostfr|vo|vff|vfq)\b/i)
                           || tabM[0].match(/\b(vf|vostfr|vo|vff|vfq)\b/i);
              const lang = langM ? langM[1].toUpperCase() : "VF";
              const embeds = this._extractEmbedUrls(block);
              embeds.forEach(e => results.push({ ...e, label: `${lang} · ${e.label}` }));
          }
          return results;
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
              return { list: this._parse(res.body), hasNextPage: this._parse(res.body).length >= 10 };
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
          const html = res.body || "";

          // ── Title ─────────────────────────────────────────────────────────────
          const nameM = html.match(/<h1[^>]*id="s-title"[^>]*>([\s\S]*?)<\/h1>/i)
                     || html.match(/<h1[^>]*class="[^"]*(?:story|title|film)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
                     || html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
                     || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name = nameM ? this._strip(nameM[1]) : "";

          // ── Description ───────────────────────────────────────────────────────
          const descM = html.match(/<(?:p|div)[^>]*class="[^"]*(?:desc-text|fdesc|synopsis|description|story-desc)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i)
                     || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
                     || html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const description = descM ? this._strip(descM[1]) : "";

          // ── Poster ────────────────────────────────────────────────────────────
          const imgM = html.match(/url\((https?:\/\/image\.tmdb\.org\/[^)]+)\)/i)
                    || html.match(/<img[^>]+(?:data-src|src)="(https?:\/\/image\.tmdb\.org\/[^"]+)"/i)
                    || html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                    || html.match(/<div[^>]+class="[^"]*(?:fposter|dvd-poster|poster)[^"]*"[\s\S]{0,500}?<img[^>]+(?:data-src|src)="([^"]+)"/i);
          const imageUrl = imgM ? imgM[1] : "";

          // ── Year ──────────────────────────────────────────────────────────────
          const yearM = html.match(/class="[^"]*(?:year|date|annee)[^"]*"[^>]*>.*?(\d{4})/i)
                     || html.match(/<span[^>]*>.*?(\d{4}).*?<\/span>/i)
                     || html.match(/["']year["']\s*:\s*(\d{4})/)
                     || html.match(/\b(20[0-2]\d|19[5-9]\d)\b/);
          const year = yearM ? yearM[1] : "";

          // ── Rating (étoiles) ─────────────────────────────────────────────────
          // TMDB vote_average in embedded JSON or meta tags
          const ratingM = html.match(/["']vote_average["']\s*:\s*([\d.]+)/)
                       || html.match(/["']rating["']\s*:\s*([\d.]+)/)
                       || html.match(/class="[^"]*(?:imdb|rating|vote|score)[^"]*"[^>]*>[\s\S]{0,30}?([\d.]+)\s*(?:\/\s*10)?/i)
                       || html.match(/data-(?:vote|rating|score)\s*=\s*["']([\d.]+)["']/i)
                       || html.match(/itemprop="ratingValue"[^>]*>[\s\S]*?([\d.]+)/i);
          const rating = ratingM ? parseFloat(ratingM[1]) : 0;

          // ── Genres ────────────────────────────────────────────────────────────
          const genres = [];
          // Method 1: links inside a genre/category block
          const genreBlockM = html.match(/class="[^"]*(?:cat|genre|categories|tags)[^"]*"[^>]*>([\s\S]{0,800}?)<\/(?:div|ul|p|span)>/i);
          if (genreBlockM) {
              const linkRe = /<a[^>]+>([^<]{2,30})<\/a>/g;
              let gm;
              while ((gm = linkRe.exec(genreBlockM[1])) !== null) {
                  const g = this._strip(gm[1]);
                  if (g.length >= 3 && g.length <= 25 && !/^(voir|plus|all|tous)/i.test(g)) genres.push(g);
              }
          }
          // Method 2: meta keywords
          if (genres.length === 0) {
              const kwM = html.match(/<meta[^>]+name="keywords"[^>]+content="([^"]+)"/i);
              if (kwM) kwM[1].split(/[,|;]/).forEach(k => { const g = k.trim(); if (g.length >= 3 && g.length <= 25) genres.push(g); });
          }

          // ── Duration ─────────────────────────────────────────────────────────
          const durM = html.match(/class="[^"]*(?:dur|time|runtime|duration)[^"]*"[^>]*>[\s\S]{0,30}?([\d]+ ?(?:h|min|mn)[\d ]*(?:min|mn)?)/i)
                    || html.match(/(\d+) ?(?:heure|h)\s*(\d+)?\s*(?:min|mn)?/i)
                    || html.match(/duration['"]\s*:\s*['"]([\d]+)['"]/i);
          const author = year + (durM ? ` · ${durM[1]}` : "");

          // ── Status (série vs film) ────────────────────────────────────────────
          const isSerie = /\b(?:s(?:é|e)rie|saison|season|episode|épisode)\b/i.test(html.substring(0, 3000));
          const status = isSerie ? 1 : 0;

          // ── Episodes ─────────────────────────────────────────────────────────
          const episodes = [];
          const newsId = this._extractNewsId(url, html);

          if (newsId) {
              const epData = await this._fetchEpisodeData(newsId, url);
              if (epData) {
                  const types = ["vf", "vostfr", "vo", "vff", "vfq"].filter(t => epData[t] && Object.keys(epData[t]).length > 0);
                  if (types.length > 0) {
                      const primaryType = types[0];
                      const epNums = Object.keys(epData[primaryType]).map(Number).sort((a, b) => a - b);
                      const basePageUrl = url.split("?")[0] + "?newsid=" + newsId;
                      for (const num of epNums) {
                          const epLabel = epNums.length === 1 ? (name || "Regarder") : `Épisode ${String(num).padStart(2, "0")}`;
                          episodes.push({ name: epLabel, url: `${basePageUrl}&_ep=${num}&_nid=${newsId}`, dateUpload: "" });
                      }
                  }
              }
          }

          if (episodes.length === 0) {
              episodes.push({ name: name || "Regarder", url, dateUpload: "" });
          }

          return {
              name,
              description,
              imageUrl,
              genres,
              status,
              author,
              artist: rating > 0 ? `⭐ ${rating.toFixed(1)}/10` : "",
              chapters: episodes
          };
      }

      async getVideoList(url) {
          const epMatch   = url.match(/[?&]_ep=(\d+)/);
          const nidMatch  = url.match(/[?&]_nid=(\d+)/);
          const nidMatch2 = url.match(/[?&]newsid=(\d+)/);
          const epNum  = epMatch  ? epMatch[1]  : null;
          const newsId = nidMatch ? nidMatch[1] : (nidMatch2 ? nidMatch2[1] : null);

          const videos = [];

          // ── Path A: Série — données d'épisode structurées ─────────────────────
          if (epNum && newsId) {
              const pageUrl = url.replace(/[?&]_ep=[^&]+/g,"").replace(/[?&]_nid=[^&]+/g,"");
              const epData  = await this._fetchEpisodeData(newsId, pageUrl);
              if (epData) {
                  const playerLabels = { vidzy:"Vidzy", uqload:"Uqload", netu:"Netu", voe:"Voe", premium:"Premium", upstream:"Upstream", vidmoly:"Vidmoly", streamtape:"Streamtape" };
                  const playerOrder  = ["vidzy","uqload","netu","voe","upstream","vidmoly","streamtape","premium"];
                  const types = ["vf","vostfr","vo","vff","vfq"];
                  for (const type of types) {
                      if (!epData[type]) continue;
                      const ep = epData[type][epNum] || epData[type][String(epNum)];
                      if (!ep) continue;
                      const typeLabel = type.toUpperCase();
                      for (const player of playerOrder) {
                          const embedUrl = ep[player];
                          if (!embedUrl || !embedUrl.trim() || embedUrl.includes("[xfvalue_")) continue;
                          const full = embedUrl.startsWith("//") ? "https:" + embedUrl : embedUrl;
                          videos.push({ url: full, quality: `${typeLabel} · ${playerLabels[player] || player}`, originalUrl: full });
                      }
                  }
              }
          }

          // ── Path B: Film — scraping direct de la page ─────────────────────────
          if (videos.length === 0) {
              const pageUrl = url.replace(/[?&]_ep=[^&]+/g,"").replace(/[?&]_nid=[^&]+/g,"");
              let html = "";
              try {
                  const res = await this.client.get(pageUrl, this._hdrs(pageUrl));
                  html = res.body || "";
              } catch(e) {}

              if (html) {
                  // B1: Try series data for episode 1 (movie presented as 1-episode série)
                  if (videos.length === 0) {
                      const nid = newsId || this._extractNewsId(pageUrl, html);
                      if (nid) {
                          const epData = await this._fetchEpisodeData(nid, pageUrl);
                          if (epData) {
                              const playerOrder = ["vidzy","uqload","netu","voe","upstream","vidmoly","streamtape","premium"];
                              const playerLabels = { vidzy:"Vidzy", uqload:"Uqload", netu:"Netu", voe:"Voe", upstream:"Upstream", vidmoly:"Vidmoly", streamtape:"Streamtape", premium:"Premium" };
                              const types = ["vf","vostfr","vo","vff","vfq"];
                              for (const type of types) {
                                  if (!epData[type]) continue;
                                  const ep = epData[type]["1"] || epData[type][1] || Object.values(epData[type])[0];
                                  if (!ep) continue;
                                  const typeLabel = type.toUpperCase();
                                  for (const player of playerOrder) {
                                      const embedUrl = ep[player];
                                      if (!embedUrl || !embedUrl.trim() || embedUrl.includes("[xfvalue_")) continue;
                                      const full = embedUrl.startsWith("//") ? "https:" + embedUrl : embedUrl;
                                      videos.push({ url: full, quality: `${typeLabel} · ${playerLabels[player] || player}`, originalUrl: full });
                                  }
                              }
                          }
                      }
                  }

                  // B2: Tab-aware scraping (VF/VOSTFR tabs in HTML)
                  if (videos.length === 0) {
                      const tabPlayers = this._parseTabPlayers(html);
                      tabPlayers.forEach(p => videos.push({ url: p.url, quality: p.label, originalUrl: p.url }));
                  }

                  // B3: Broad embed URL extraction from full page
                  if (videos.length === 0) {
                      const embeds = this._extractEmbedUrls(html);
                      embeds.forEach(p => {
                          if (!videos.some(v => v.originalUrl === p.url))
                              videos.push({ url: p.url, quality: p.label, originalUrl: p.url });
                      });
                  }

                  // B4: Last resort — raw iframes
                  if (videos.length === 0) {
                      let m;
                      const ifrRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
                      while ((m = ifrRe.exec(html)) !== null) {
                          const src = m[1].startsWith("//") ? "https:" + m[1] : m[1];
                          if (!/google|recaptcha|facebook|disqus|ads\.|doubleclick/i.test(src))
                              if (!videos.some(v => v.originalUrl === src))
                                  videos.push({ url: src, quality: "Stream", originalUrl: src });
                      }
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
                  { name: "Thriller", value: "/films/thrillers/" },
                  { name: "Séries", value: "/series/" }
              ]}
          ];
      }

      getSourcePreferences() {
          return [
              { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } }
          ];
      }
  }
