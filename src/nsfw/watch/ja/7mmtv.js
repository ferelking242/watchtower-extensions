const watchtowerSources = [{
  "name": "7MMTV",
  "lang": "ja",
  "baseUrl": "https://7mmtv.sx",
  "apiUrl": "",
  "iconUrl": "https://www.7mmtv.sx/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.1",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/7mmtv.js",
  "notes": "7MMTV — censored and uncensored JAV online",
  "isNsfw": true
}];
const BASE_URL = "https://7mmtv.sx";

// Listing families. `censored` = studio releases, `uncensored` = Western/FC2
// style, `amateurjav` = amateur studios, `amateur` = user uploads.
const SECTIONS = {
  censored: "censored_list/all",
  uncensored: "uncensored_list/all",
  amateurjav: "amateurjav_list/all",
  amateur: "amateur_list/all",
  klive: "klive_list/all",
  clive: "clive_list/all"
};

const SECTION_TITLES = {
  censored: "Censored",
  uncensored: "Uncensored",
  amateurjav: "Amateur JAV",
  amateur: "Amateur",
  klive: "Korean Live",
  clive: "Chinese Live"
};

// ── AES-128-CBC for the `content_mv_protect_ofb.js` player payload ───────────
const AES_SBOX = [99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
const AES_INV_SBOX = [82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125];

const xtime = (a) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;

function gmul(a, b) {
  let r = 0;
  while (b) {
    if (b & 1) r ^= a;
    a = xtime(a);
    b >>= 1;
  }
  return r;
}

function aesExpandKey(key) {
  const w = [key.slice(0, 4), key.slice(4, 8), key.slice(8, 12), key.slice(12, 16)];
  const rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
  for (let i = 4; i < 44; i++) {
    let t = w[i - 1].slice();
    if (i % 4 === 0) t = [AES_SBOX[t[1]] ^ rcon[i / 4 - 1], AES_SBOX[t[2]], AES_SBOX[t[3]], AES_SBOX[t[0]]];
    w.push(w[i - 4].map((b, j) => b ^ t[j]));
  }
  return w;
}

function aesDecryptBlock(s, w) {
  const addRoundKey = (r) => {
    for (let c = 0; c < 4; c++) for (let x = 0; x < 4; x++) s[c * 4 + x] ^= w[r * 4 + c][x];
  };
  const invShiftRows = () => {
    for (let r = 1; r < 4; r++) {
      const row = [s[r], s[4 + r], s[8 + r], s[12 + r]];
      for (let c = 0; c < 4; c++) s[c * 4 + r] = row[(c - r + 4) % 4];
    }
  };
  addRoundKey(10);
  for (let round = 9; round >= 1; round--) {
    for (let i = 0; i < 16; i++) s[i] = AES_INV_SBOX[s[i]];
    invShiftRows();
    addRoundKey(round);
    for (let c = 0; c < 4; c++) {
      const a = s[c * 4], b = s[c * 4 + 1], d = s[c * 4 + 2], e = s[c * 4 + 3];
      s[c * 4]     = gmul(a, 14) ^ gmul(b, 11) ^ gmul(d, 13) ^ gmul(e, 9);
      s[c * 4 + 1] = gmul(a, 9)  ^ gmul(b, 14) ^ gmul(d, 11) ^ gmul(e, 13);
      s[c * 4 + 2] = gmul(a, 13) ^ gmul(b, 9)  ^ gmul(d, 14) ^ gmul(e, 11);
      s[c * 4 + 3] = gmul(a, 11) ^ gmul(b, 13) ^ gmul(d, 9)  ^ gmul(e, 14);
    }
  }
  for (let i = 0; i < 16; i++) s[i] = AES_INV_SBOX[s[i]];
  invShiftRows();
  addRoundKey(0);
}

function base64ToBytes(str) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = [];
  let buffer = 0, bits = 0;
  for (const ch of str) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    buffer = buffer * 64 + v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push(Math.floor(buffer / Math.pow(2, bits)) & 0xff);
    }
    buffer &= Math.pow(2, bits) - 1;
  }
  return out;
}

function aesCbcDecrypt(b64, keyStr, ivStr) {
  const ct = base64ToBytes(b64);
  const key = [], iv = [];
  for (let i = 0; i < 16; i++) {
    key.push(keyStr.charCodeAt(i) & 0xff);
    iv.push(ivStr.charCodeAt(i) & 0xff);
  }
  const schedule = aesExpandKey(key);
  const out = [];
  let prev = iv;
  for (let off = 0; off + 16 <= ct.length; off += 16) {
    const block = ct.slice(off, off + 16);
    const state = block.slice();
    aesDecryptBlock(state, schedule);
    for (let i = 0; i < 16; i++) out.push(state[i] ^ prev[i]);
    prev = block;
  }
  const pad = out[out.length - 1];
  return (pad > 0 && pad <= 16) ? out.slice(0, out.length - pad) : out;
}

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE_URL + "/"
    };
  }

  async getPopular(page) {
    return this._listPage(SECTIONS.censored, page);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    return this._listPage(SECTIONS.uncensored, page);
  }

  // The header form POSTs to `searchform_search` and lands on the canonical
  // `searchall_search/<keyword>/<page>.html` listing, which is the only search
  // URL that paginates (`?keyword=` always replays page 1).
  async search(query, page, filters) {
    const q = (query || "").trim();
    if (!q) return { list: [], hasNextPage: false };
    const res = await new Client().get(
      `${BASE_URL}/en/searchall_search/all/${encodeURIComponent(q)}/${page || 1}.html`,
      { headers: this.getHeaders() }
    );
    return this._parseList(res.body, page);
  }

  async getCustomList(id, page) {
    if (id === "categories") {
      const res = await new Client().get(`${BASE_URL}/en/censored_categorylist/list/index.html`, { headers: this.getHeaders() });
      return this._parseDirectory(res.body, /\/en\/censored_category\/\d+\//);
    }
    if (id === "makers") {
      const res = await new Client().get(`${BASE_URL}/en/uncensored_makersr/list/index.html`, { headers: this.getHeaders() });
      return this._parseDirectory(res.body, /\/en\/uncensored_makersr\/\d+\//);
    }
    const path = SECTIONS[id];
    if (!path) throw new Error(`7MMTV: unknown section "${id}"`);
    return this._listPage(path, page);
  }

  async getMainPage() {
    const sections = [];
    for (const key of Object.keys(SECTIONS)) {
      try {
        const res = await new Client().get(`${BASE_URL}/en/${SECTIONS[key]}/1.html`, { headers: this.getHeaders() });
        const parsed = this._parseList(res.body, 1);
        if (parsed.list.length) {
          sections.push({
            title: SECTION_TITLES[key],
            list: parsed.list.slice(0, 20),
            hasNextPage: true,
            customList: key
          });
        }
      } catch (e) {
        // A single unreachable family must not blank the whole home page.
      }
    }
    const genres = await this.getCustomList("categories", 1);
    if (genres.list.length) {
      sections.push({ title: "Genres", list: genres.list.slice(0, 30), hasNextPage: false });
    }
    return { sections };
  }

  async _listPage(path, page) {
    const p = page || 1;
    const res = await new Client().get(`${BASE_URL}/en/${path}/${p}.html`, { headers: this.getHeaders() });
    return this._parseList(res.body, p);
  }

  // Listing markup:
  //   <div class="video">
  //     <figure class="video-preview"><a href=".../censored_content/<id>/<CODE>.html">
  //       <img class="lazyload" data-src=".../censored/m/<id>_<CODE>.jpg" alt="TITLE"></a>
  //     </figure>
  //     <h3 class="video-title"><a href="...">TITLE</a></h3>
  //     <div class="video-channel">CHANNEL</div> ... <span class="small text-muted">DATE</span>
  //   </div>
  _parseList(html, page) {
    const doc = new Document(html);
    const list = [];
    const seen = {};

    for (const card of doc.select("div.video")) {
      const link = card.selectFirst("figure.video-preview a") || card.selectFirst("a[href*='_content/']");
      if (!link) continue;
      const href = link.attr("href") || "";
      if (!href || href.indexOf("_content/") < 0) continue;
      const url = href.startsWith("http") ? href : BASE_URL + href;
      if (seen[url]) continue;

      const img = card.selectFirst("img");
      const titleEl = card.selectFirst("h3.video-title a") || card.selectFirst("h3.video-title");
      const name = (titleEl ? titleEl.text : (img ? img.attr("alt") : "")).trim();
      if (!name) continue;

      seen[url] = true;
      list.push({
        name,
        link: url,
        imageUrl: img ? (img.attr("data-src") || img.attr("src") || "") : "",
        description: this._channelOf(card),
        badges: this._badgesOf(name)
      });
    }

    return { list, hasNextPage: !!doc.selectFirst("a[rel='next']") || list.length >= 20 };
  }

  _channelOf(card) {
    const channel = card.selectFirst("div.video-channel");
    const date = card.selectFirst("span.text-muted");
    const parts = [];
    if (channel) parts.push(channel.text.trim());
    if (date) parts.push(date.text.trim());
    return parts.filter(Boolean).join(" · ");
  }

  // Product codes (IPZZ-995, FC2-PPV-1816328) are the only stable identifiers
  // across the site, so surface them as badges when present.
  _badgesOf(name) {
    const m = /^([A-Z0-9]+(?:-[A-Z0-9]+)+)/.exec(name) || /\b(FC2-?PPV-?\d+)\b/i.exec(name);
    return m ? [m[1].toUpperCase()] : [];
  }

  // Genre / idol / studio indexes are people-and-tag lists rather than videos,
  // but they still honour the `{ list, hasNextPage }` contract.
  _parseDirectory(html, hrefPattern) {
    const doc = new Document(html);
    const list = [];
    const seen = {};
    for (const a of doc.select("a")) {
      const href = a.attr("href") || "";
      if (!hrefPattern.test(href)) continue;
      const name = a.text.trim();
      if (!name || name.length > 80) continue;
      const url = href.startsWith("http") ? href : BASE_URL + href;
      if (seen[url]) continue;
      seen[url] = true;
      list.push({ name, link: url, imageUrl: "", description: "" });
    }
    return { list, hasNextPage: !!doc.selectFirst("a[rel='next']") };
  }

  // Detail pages carry no og: tags, so the title comes from
  // <h1 class="fullvideo-title">. Genre links point at
  // `<lang>/<section>_category/<id>/<name>/1.html`, idols at `_avperformer`
  // and studios at `_makersr`.
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders() });
    const html = res.body;
    const doc = new Document(html);

    const h1 = doc.selectFirst("h1.fullvideo-title");
    const metaTitle = doc.selectFirst("title");
    const title = (h1 ? h1.text : (metaTitle ? metaTitle.text : "")).trim();

    // `content_main_cover` holds the real release poster; every `img.lazyload`
    // further down belongs to the related-videos rail.
    const poster = doc.selectFirst("div.content_main_cover img") || doc.selectFirst("div.content_main_cover a img");
    const imageUrl = poster ? (poster.attr("data-src") || poster.attr("src") || "") : "";

    const code = this._badgesOf(title).join("");
    const description = this._description(html, title, code);

    const genre = [];
    for (const a of doc.select("div.categories a")) {
      const n = a.text.trim();
      if (n) genre.push({ name: n });
    }
    for (const a of doc.select("div.fullvideo-idol a")) {
      const n = a.text.trim();
      if (n) genre.push({ name: n });
    }
    const studio = this._studioOf(doc);
    if (studio) genre.push({ name: studio });

    return {
      name: title,
      imageUrl,
      description,
      genre,
      episodes: [{ name: title || "Watch", url }]
    };
  }

  // The `keywords` meta carries "TITLE, studio, tag, tag, …"; the first field
  // repeats the title, the rest describe the video.
  _description(html, title, code) {
    const keywords = /name='keywords' content='([^']*)'/.exec(html) || /name="keywords" content="([^"]*)"/.exec(html);
    if (!keywords) return code || "";
    const parts = keywords[1].split(",").map(s => s.trim()).filter(Boolean);
    const rest = parts.filter(p => p !== title && p !== code);
    const head = code ? `${code} — ` : "";
    return head + rest.join(" · ");
  }

  _studioOf(doc) {
    const rows = doc.select("div.fullvideo-attr div.row");
    for (const row of rows) {
      const label = row.selectFirst("strong");
      if (!label || !/studio/i.test(label.text)) continue;
      const a = row.selectFirst("a");
      const value = (a ? a.text : row.text).replace(/Studio:?/i, "").trim();
      if (value && value !== "N/A") return value;
    }
    return "";
  }

  // Streams are gated behind `content_mv_protect_ofb.js`: the page ships an
  // obfuscated `mvarr` table whose entries are hex-encoded, XOR-obfuscated and
  // AES-128-CBC encrypted player URLs. The site only ever reads them back
  // through that script, so the same three steps have to be replayed here.
  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders() });
    const html = res.body;
    const videos = [];
    const push = (streamUrl, quality, referer) => {
      if (!streamUrl || !/^https?:/.test(streamUrl)) return;
      if (videos.find(v => v.url === streamUrl)) return;
      videos.push({ url: streamUrl, originalUrl: streamUrl, quality, headers: this.getHeaders(referer || url) });
    };

    // Progressive CDN files are advertised on the page itself and need no
    // decryption, so they stay playable even when embed hosts rotate. The
    // related-videos rail below the player uses the same markup, so only the
    // main player region is scanned.
    for (const m of this._mainPlayerRegion(html).matchAll(/data-src='(https?:\/\/[^']+\.mp4[^']*)'/g)) push(m[1], "MP4", url);

    try {
      for (const stream of await this._playerStreams(html, url)) push(stream.url, stream.quality, stream.referer);
    } catch (e) {
      // A dead embed host must not hide the direct CDN files.
    }

    for (const m of html.matchAll(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,200})["'`]/g)) push(m[1], "Auto", url);
    return videos;
  }

  // The player markup ends where the first sibling content block begins;
  // everything past that point is the related-videos rail.
  _mainPlayerRegion(html) {
    const start = html.search(/<div class="fullvideo"/);
    if (start < 0) return html;
    const rest = html.slice(start);
    const end = rest.search(/<div class="block/);
    return end > 0 ? rest.slice(0, end) : rest;
  }

  async _playerStreams(html, pageUrl) {
    const key = /argdeqweqweqwe\s*=\s*'([^']*)'/.exec(html);
    const iv = /hdddedg252\s*=\s*'([^']*)'/.exec(html);
    if (!key || !iv) return [];

    const streams = [];
    for (const m of html.matchAll(/mvarr\['([^']+)'\]=\[(.*?)\];/gs)) {
      const fields = [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]);
      if (fields.length < 4) continue;
      const prefix = fields[3];
      const suffix = fields[4] || "";
      if (prefix.indexOf("http") !== 0 && prefix.indexOf("//") !== 0) continue;

      const token = this._decodeToken(fields[1], key[1], iv[1], html);
      if (!token) continue;
      const embed = (prefix.startsWith("//") ? "https:" + prefix : prefix) + encodeURIComponent(token) + suffix;
      const quality = /mmsi|mmvh/.test(prefix) ? "Auto" : "Embed";

      for (const s of await this._streamsFromEmbed(embed, pageUrl, quality)) streams.push(s);
    }
    return streams;
  }

  // The obfuscated payload is a list of radix-N integers XORed with a page
  // constant, joined by `String.fromCharCode(radix + 97)`; the radix and the
  // XOR key both change between deployments, so they are read from the same
  // inline block that carries the AES key/IV.
  _decodeToken(field, keyStr, ivStr, html) {
    const baseMatch = /hcdeedg252\s*=\s*(\d+)/.exec(html);
    const xorMatch = /hadeedg252\s*=\s*(\d+)/.exec(html);
    const radix = baseMatch ? (Number(baseMatch[1]) <= 25 ? Number(baseMatch[1]) : Number(baseMatch[1]) % 25) : 16;
    const xor = xorMatch ? Number(xorMatch[1]) : 30;
    const separator = String.fromCharCode(radix + 97);

    const encoded = field.split(separator)
      .map(part => String.fromCharCode((parseInt(part, radix) ^ xor) & 0xff))
      .join("");
    const padded = encoded.replace(/=+$/, "") + "=".repeat((4 - (encoded.replace(/=+$/, "").length % 4)) % 4);

    try {
      const bytes = aesCbcDecrypt(padded, keyStr, ivStr);
      if (!bytes.length) return "";
      return bytes.map(b => String.fromCharCode(b)).join("");
    } catch (e) {
      return "";
    }
  }

  async _streamsFromEmbed(embedUrl, pageUrl, quality) {
    let body;
    try {
      body = (await new Client().get(embedUrl, { headers: this.getHeaders(pageUrl) })).body;
    } catch (e) {
      return [];
    }
    const unpacked = this._unpackEval(body);
    const out = [];

    for (const m of unpacked.matchAll(/https?:\/\/[^"'<>\s\\]+\.m3u8[^"'<>\s\\]*/g)) {
      out.push({ url: m[0], quality, referer: embedUrl });
    }
    if (out.length) return out;

    const file = /file\s*:\s*["']([^"']+)["']/.exec(unpacked);
    if (file) out.push({ url: file[1], quality, referer: embedUrl });
    return out;
  }

  // Several embed hosts ship a Dean Edwards packer
  // (`eval(function(p,a,c,k,e,d)`); unpacking it in place is enough to read the
  // `sources` block back.
  _unpackEval(js) {
    const packed = /eval\(function\(p,a,c,k,e,[dr]\)\{.*?\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s.exec(js);
    if (!packed) return js;
    const payload = packed[1];
    const tokens = packed[4].split("|");
    const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
    const toBase = (str) => {
      let n = 0;
      for (const ch of str) n = n * 36 + digits.indexOf(ch);
      return n;
    };

    let out = "";
    let i = 0;
    while (i < payload.length) {
      if (digits.indexOf(payload[i]) >= 0) {
        let j = i;
        while (j < payload.length && digits.indexOf(payload[j]) >= 0) j++;
        const n = toBase(payload.slice(i, j));
        out += (n >= 0 && n < tokens.length) ? tokens[n] : payload.slice(i, j);
        i = j;
      } else {
        out += payload[i];
        i++;
      }
    }
    return out;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
