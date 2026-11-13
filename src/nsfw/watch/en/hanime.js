const watchtowerSources = [{
  "name": "hanime",
  "lang": "en",
  "baseUrl": "https://hanime.tv",
  "apiUrl": "https://guest.freeanimehentai.net",
  "iconUrl": "https://hanime.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "2.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/hanime.js",
  "notes": "Adult content (18+) — Hanime hentai streaming. Catalogue browse/search + signed player handshake.",
  "isNsfw": true
}];

// ── Constants ────────────────────────────────────────────────────────────────
const HV_BASE = "https://hanime.tv";
const HV_GUEST = "https://guest.freeanimehentai.net";
const HV_AUTH = "https://auth.hanime.tv";
const HV_CATALOGUE = HV_GUEST + "/api/v11/search_hvs";
const HV_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// The site signs every player handshake with a sha256 over the request time and
// a fixed public secret; the token itself is AES-256-GCM sealed with a key
// derived from a constant. This is the site's own "insecure" scheme.
const HV_SIGN_SECRET = "Xkdi29";
const HV_SIGN_HOST = "https://hanime.tv";
const HV_SIGN_MODE = "mn2";
const HV_GCM_KEY_SEED = "htv-insecure-handshake-v1";
const HV_GCM_AAD = "htv-insecure-v1";

// ── Pure-JS SHA-256 (QuickJS has no WebCrypto) ───────────────────────────────
const HV_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];

function hv_rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

function hv_sha256(bytes) {
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const msg = bytes.slice(0);
  const bitLen = bytes.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0);
  const hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
  msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
  msg.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
  const w = new Array(64);
  for (let off = 0; off < msg.length; off += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = ((msg[off + 4 * t] << 24) | (msg[off + 4 * t + 1] << 16) | (msg[off + 4 * t + 2] << 8) | msg[off + 4 * t + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (hv_rotr(w[t - 15], 7) ^ hv_rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) >>> 0;
      const s1 = (hv_rotr(w[t - 2], 17) ^ hv_rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)) >>> 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = (hv_rotr(e, 6) ^ hv_rotr(e, 11) ^ hv_rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ ((~e) & g)) >>> 0;
      const t1 = (h + S1 + ch + HV_K[t] + w[t]) >>> 0;
      const S0 = (hv_rotr(a, 2) ^ hv_rotr(a, 13) ^ hv_rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = [];
  for (let i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255);
  return out;
}

function hv_utf8(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const cp = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(i + 1) - 0xdc00);
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      i++;
    } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function hv_fromUtf8(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    if (b < 0x80) { s += String.fromCharCode(b); i++; }
    else if (b >= 0xc0 && b < 0xe0) { s += String.fromCharCode(((b & 31) << 6) | (bytes[i + 1] & 63)); i += 2; }
    else if (b >= 0xe0 && b < 0xf0) { s += String.fromCharCode(((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63)); i += 3; }
    else {
      let cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      cp -= 0x10000;
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023));
      i += 4;
    }
  }
  return s;
}

const HV_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function hv_b64u(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = i + 1 < bytes.length ? bytes[i + 1] : 0, b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += HV_B64.charAt(b0 >> 2) + HV_B64.charAt(((b0 & 3) << 4) | (b1 >> 4));
    if (i + 1 < bytes.length) out += HV_B64.charAt(((b1 & 15) << 2) | (b2 >> 6));
    if (i + 2 < bytes.length) out += HV_B64.charAt(b2 & 63);
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hv_unb64u(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/]/g, "");
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const n0 = HV_B64.indexOf(s.charAt(i)), n1 = HV_B64.indexOf(s.charAt(i + 1));
    const n2 = i + 2 < s.length ? HV_B64.indexOf(s.charAt(i + 2)) : -1;
    const n3 = i + 3 < s.length ? HV_B64.indexOf(s.charAt(i + 3)) : -1;
    out.push((n0 << 2) | (n1 >> 4));
    if (n2 >= 0) out.push(((n1 & 15) << 4) | (n2 >> 2));
    if (n3 >= 0) out.push(((n2 & 3) << 6) | n3);
  }
  return out;
}

function hv_hex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
  return s;
}

// ── AES-256-GCM (block cipher + GHASH) ───────────────────────────────────────
const HV_SBOX = [
99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,
183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,
9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,
208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,
205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,
224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,
186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,
225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];

function hv_xtime(x) { x <<= 1; if (x & 0x100) x ^= 0x11b; return x & 255; }
function hv_gmul(a, b) { let p = 0; for (let i = 0; i < 8; i++) { if (b & 1) p ^= a; b >>= 1; a = hv_xtime(a); } return p & 255; }

function hv_expandKey(key) {
  const Nk = 8, Nr = 14, w = [];
  for (let i = 0; i < Nk; i++) w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  let rcon = 1;
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let t = w[i - 1].slice(0);
    if (i % Nk === 0) {
      t = [t[1], t[2], t[3], t[0]];
      for (let j = 0; j < 4; j++) t[j] = HV_SBOX[t[j]];
      t[0] ^= rcon; rcon = hv_xtime(rcon);
    } else if (i % Nk === 4) {
      for (let j = 0; j < 4; j++) t[j] = HV_SBOX[t[j]];
    }
    const prev = w[i - Nk];
    w.push([prev[0] ^ t[0], prev[1] ^ t[1], prev[2] ^ t[2], prev[3] ^ t[3]]);
  }
  return w;
}

function hv_addRoundKey(s, w, round) {
  for (let c = 0; c < 4; c++) {
    const word = w[round * 4 + c];
    for (let r = 0; r < 4; r++) s[4 * c + r] ^= word[r];
  }
}

function hv_encryptBlock(w, block) {
  const s = block.slice(0);
  hv_addRoundKey(s, w, 0);
  for (let round = 1; round <= 13; round++) {
    for (let i = 0; i < 16; i++) s[i] = HV_SBOX[s[i]];
    const t = s.slice(0);
    s[0] = t[0]; s[1] = t[5]; s[2] = t[10]; s[3] = t[15];
    s[4] = t[4]; s[5] = t[9]; s[6] = t[14]; s[7] = t[3];
    s[8] = t[8]; s[9] = t[13]; s[10] = t[2]; s[11] = t[7];
    s[12] = t[12]; s[13] = t[1]; s[14] = t[6]; s[15] = t[11];
    for (let c = 0; c < 4; c++) {
      const a0 = s[4 * c], a1 = s[4 * c + 1], a2 = s[4 * c + 2], a3 = s[4 * c + 3];
      s[4 * c] = hv_gmul(a0, 2) ^ hv_gmul(a1, 3) ^ a2 ^ a3;
      s[4 * c + 1] = a0 ^ hv_gmul(a1, 2) ^ hv_gmul(a2, 3) ^ a3;
      s[4 * c + 2] = a0 ^ a1 ^ hv_gmul(a2, 2) ^ hv_gmul(a3, 3);
      s[4 * c + 3] = hv_gmul(a0, 3) ^ a1 ^ a2 ^ hv_gmul(a3, 2);
    }
    hv_addRoundKey(s, w, round);
  }
  for (let i = 0; i < 16; i++) s[i] = HV_SBOX[s[i]];
  const u = s.slice(0);
  s[0] = u[0]; s[1] = u[5]; s[2] = u[10]; s[3] = u[15];
  s[4] = u[4]; s[5] = u[9]; s[6] = u[14]; s[7] = u[3];
  s[8] = u[8]; s[9] = u[13]; s[10] = u[2]; s[11] = u[7];
  s[12] = u[12]; s[13] = u[1]; s[14] = u[6]; s[15] = u[11];
  hv_addRoundKey(s, w, 14);
  return s;
}

function hv_gfMul(X, Y) {
  const Z = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const V = X.slice(0);
  for (let i = 0; i < 128; i++) {
    if ((Y[Math.floor(i / 8)] >> (7 - (i % 8))) & 1) {
      for (let j = 0; j < 16; j++) Z[j] ^= V[j];
    }
    const lsb = V[15] & 1;
    for (let j = 15; j > 0; j--) V[j] = ((V[j] >> 1) | ((V[j - 1] & 1) << 7)) & 255;
    V[0] = (V[0] >> 1) & 255;
    if (lsb) V[0] ^= 0xe1;
  }
  return Z;
}

function hv_gcmTag(keyW, aad, ct) {
  const H = hv_encryptBlock(keyW, [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
  let Y = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const absorb = (data) => {
    for (let i = 0; i < data.length; i += 16) {
      const blk = data.slice(i, i + 16);
      while (blk.length < 16) blk.push(0);
      for (let j = 0; j < 16; j++) Y[j] ^= blk[j];
      Y = hv_gfMul(H, Y);
    }
  };
  absorb(aad || []);
  absorb(ct);
  const lenBlock = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  const aadBits = (aad ? aad.length : 0) * 8, ctBits = ct.length * 8;
  lenBlock[4] = (aadBits >>> 24) & 255; lenBlock[5] = (aadBits >>> 16) & 255; lenBlock[6] = (aadBits >>> 8) & 255; lenBlock[7] = aadBits & 255;
  lenBlock[12] = (ctBits >>> 24) & 255; lenBlock[13] = (ctBits >>> 16) & 255; lenBlock[14] = (ctBits >>> 8) & 255; lenBlock[15] = ctBits & 255;
  for (let k = 0; k < 16; k++) Y[k] ^= lenBlock[k];
  return hv_gfMul(H, Y);
}

function hv_ctrNext(counter) {
  for (let k = 15; k >= 12; k--) { counter[k] = (counter[k] + 1) & 255; if (counter[k] !== 0) break; }
}

function hv_gcmEncrypt(key, iv, aad, plaintext) {
  const w = hv_expandKey(key);
  const J0 = iv.concat([0, 0, 0, 1]);
  const ct = [], counter = J0.slice(0);
  for (let i = 0; i < plaintext.length; i += 16) {
    hv_ctrNext(counter);
    const ks = hv_encryptBlock(w, counter);
    const blk = plaintext.slice(i, i + 16);
    for (let j = 0; j < blk.length; j++) ct.push(blk[j] ^ ks[j]);
  }
  const S = hv_gcmTag(w, aad, ct);
  const ek = hv_encryptBlock(w, J0);
  const tag = [];
  for (let t = 0; t < 16; t++) tag.push(S[t] ^ ek[t]);
  return { ct, tag };
}

function hv_gcmDecrypt(key, iv, aad, ct, tag) {
  const w = hv_expandKey(key);
  const J0 = iv.concat([0, 0, 0, 1]);
  const pt = [], counter = J0.slice(0);
  for (let i = 0; i < ct.length; i += 16) {
    hv_ctrNext(counter);
    const ks = hv_encryptBlock(w, counter);
    const blk = ct.slice(i, i + 16);
    for (let j = 0; j < blk.length; j++) pt.push(blk[j] ^ ks[j]);
  }
  const S = hv_gcmTag(w, aad, ct);
  const ek = hv_encryptBlock(w, J0);
  for (let t = 0; t < 16; t++) if ((S[t] ^ ek[t]) !== tag[t]) throw new Error("handshake token auth failed");
  return pt;
}

// ── Extension ────────────────────────────────────────────────────────────────
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": HV_UA,
      "Referer": HV_BASE + "/",
      "Origin": HV_BASE,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _jsonHeaders(url) {
    return {
      "User-Agent": HV_UA,
      "Referer": url || (HV_BASE + "/"),
      "Origin": HV_BASE,
      "Accept": "application/json"
    };
  }

  // ── HTML list parsing ─────────────────────────────────────────────────────
  _cleanTitle(raw) {
    let t = String(raw || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    t = t.replace(/^Watch\s+/i, "");
    const cut = t.search(/\s+hentai\b/i);
    if (cut > 0) t = t.slice(0, cut);
    return t.trim();
  }

  _itemsFromHtml(html) {
    const items = [];
    const seen = {};
    // Cards are anchors whose poster carries the cover. The title may live in
    // an <h3>, a plain span (related grids) or an alt attribute, so read all of
    // them; a card without any of those is skipped rather than guessed at.
    const re = /<a href="(\/videos\/hentai\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      const inner = m[2];
      const img = inner.match(/<img[^>]*\bsrc="([^"]+)"/);
      if (!img) continue;
      const h3 = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      const alt = inner.match(/<img[^>]*\balt="([^"]*)"/);
      const span = inner.match(/<span[^>]*class="[^"]*line-clamp-2[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const raw = h3 ? h3[1] : span ? span[1] : alt ? alt[1] : "";
      const title = String(raw).replace(/<[^>]*>/g, "").replace(/ thumbnail$/i, "").trim();
      if (!title) continue;
      const link = HV_BASE + href;
      if (seen[link]) continue;
      seen[link] = true;
      items.push({ name: this._cleanTitle(title), imageUrl: img[1], link });
    }
    return items;
  }

  // The site groups a franchise's episodes in a "More from <group>" section.
  // Those siblings are the real episodes of one title, so the detail page lists
  // them together instead of a single entry.
  _siblingsFromHtml(html) {
    const at = html.indexOf("More from");
    if (at < 0) return [];
    const section = html.slice(at, at + 12000);
    const items = [];
    const seen = {};
    const re = /<a href="(\/videos\/hentai\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(section)) !== null) {
      const img = m[2].match(/<img[^>]*\bsrc="([^"]+)"/);
      if (!img) continue;
      const title = m[2].match(/<span[^>]*class="[^"]*line-clamp-2[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const name = (title ? title[1] : "").replace(/<[^>]*>/g, "").trim();
      if (!name) continue;
      const link = HV_BASE + m[1];
      if (seen[link]) continue;
      seen[link] = true;
      items.push({ name: this._cleanTitle(name), imageUrl: img[1], link });
    }
    return items;
  }

  _brandFromHtml(html) {
    const m = html.match(/href="\/browse\/brands\/([^"?#]+)"[^>]*title="Browse more [^"]* videos"/);
    return m ? m[1] : "";
  }

  async _getHtml(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    return res && typeof res.body === "string" ? res.body : "";
  }

  // ── Catalogue (the site's own search database) ────────────────────────────
  async _catalogue() {
    // The catalogue is a ~4 MB download and every catalogue-backed list needs
    // it, so keep it for the session.
    if (this._catalogueCache) return this._catalogueCache;
    const res = await new Client().get(HV_CATALOGUE, this._jsonHeaders(HV_BASE + "/"));
    const data = JSON.parse(res.body);
    const rows = Array.isArray(data) ? data : (data.data || []);
    const items = [];
    for (const row of rows) {
      if (!row || !row.slug) continue;
      items.push({
        name: row.name || row.slug,
        slug: row.slug,
        imageUrl: row.cover_url || row.poster_url || "",
        created: Number(row.created_at_unix || 0),
        released: Number(row.released_at_unix || 0),
        views: Number(row.views || 0),
        haystack: ((row.name || "") + " " + (row.search_titles || "") + " " + row.slug).toLowerCase(),
        tags: Array.isArray(row.tags) ? row.tags : [],
        brand: row.brand || ""
      });
    }
    this._catalogueCache = items;
    return items;
  }

  _fromCatalogItem(it) {
    return { name: it.name, imageUrl: it.imageUrl, link: HV_BASE + "/videos/hentai/" + it.slug };
  }

  _pageOf(items, page, per) {
    const p = Number(page) > 1 ? Number(page) : 1;
    const start = (p - 1) * per;
    const slice = items.slice(start, start + per);
    return { list: slice.map((it) => this._fromCatalogItem(it)), hasNextPage: start + per < items.length };
  }

  // ── Popular / Latest ──────────────────────────────────────────────────────
  async getPopular(page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    const html = await this._getHtml(HV_BASE + "/browse/trending?page=" + p);
    const list = this._itemsFromHtml(html);
    return { list, hasNextPage: list.length >= 20 };
  }

  async getLatestUpdates(page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    try {
      const catalog = await this._catalogue();
      catalog.sort((a, b) => (b.created - a.created) || (b.released - a.released));
      return this._pageOf(catalog, p, 36);
    } catch (e) {
      // The catalogue is a large download; the home page's own "Recent Uploads"
      // rail is enough to cover the first page.
      if (p === 1) {
        const html = await this._getHtml(HV_BASE + "/");
        const list = this._itemsFromHtml(html).slice(0, 36);
        if (list.length) return { list, hasNextPage: false };
      }
      return { list: [], hasNextPage: false };
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  _filterValue(filters, index) {
    if (!filters || !filters[index]) return "";
    const f = filters[index];
    const values = f.values || [];
    const opt = values[Number(f.state || 0)];
    if (!opt) return "";
    return String(opt.value !== undefined ? opt.value : "").trim();
  }

  async search(query, page, filters) {
    const q = String(query || "").trim().toLowerCase();
    let items = await this._catalogue();
    if (q) items = items.filter((it) => it.haystack.indexOf(q) >= 0);

    const tag = this._filterValue(filters, 0).toLowerCase();
    if (tag) items = items.filter((it) => it.tags.join(" ").toLowerCase().indexOf(tag) >= 0);

    const sort = this._filterValue(filters, 1).toLowerCase();
    if (sort === "views") items = items.slice(0).sort((a, b) => b.views - a.views);
    else if (sort === "released") items = items.slice(0).sort((a, b) => b.released - a.released);
    else items = items.slice(0).sort((a, b) => (b.created - a.created) || (b.released - a.released));

    return this._pageOf(items, page, 36);
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  async getDetail(url) {
    const html = await this._getHtml(url);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const ogTitle = html.match(/property="og:title"\s+content="([^"]*)"/);
    const ogImage = html.match(/property="og:image"\s+content="([^"]*)"/);
    const name = this._cleanTitle(h1 ? h1[1].replace(/<[^>]*>/g, "") : (ogTitle ? ogTitle[1] : ""));

    let description = "";
    const synopsis = html.match(/data-expand-panel[^>]*>([\s\S]*?)<\/div><\/div>/);
    if (synopsis) description = synopsis[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!description) {
      const ogDesc = html.match(/property="og:description"\s+content="([^"]*)"/);
      if (ogDesc) description = ogDesc[1];
    }

    const genre = [];
    const seenTags = {};
    // Real tag chips carry title="Browse more videos with <tag> tag"; the
    // footer repeats the same hrefs without it, so match the marker to avoid
    // pulling SEO links into the genre list.
    const tagRe = /<a href="\/browse\/tags\/([^"]+)"[^>]*title="Browse more videos with[^"]*"[^>]*>([^<]*)<\/a>/g;
    let tm;
    while ((tm = tagRe.exec(html)) !== null) {
      const label = (tm[2] || "").replace(/&amp;/g, "&").trim() || decodeURIComponent(tm[1]);
      const key = label.toLowerCase();
      if (!label || seenTags[key]) continue;
      seenTags[key] = true;
      genre.push({ name: label });
    }

    // Prefer the site's own franchise grouping: "More from <group>" lists every
    // episode of this title, so they all appear as selectable episodes. When
    // the page has no such group, the video is a one-off and stays a single
    // episode.
    let siblings = this._siblingsFromHtml(html);
    if (!siblings.some((s) => s.link === url)) siblings.push({ name, link: url });
    const order = (s) => {
      const m = String(s).match(/(\d+)\s*$/);
      return m ? Number(m[1]) : 9999;
    };
    siblings.sort((a, b) => order(a.name) - order(b.name));
    const episodes = siblings.map((s) => ({ name: s.name, url: s.link }));

    const brand = this._brandFromHtml(html);
    const brandName = brand ? brand.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
    if (brandName && genre.filter((g) => g.name === brandName).length === 0) {
      genre.push({ name: brandName });
    }

    return {
      name,
      imageUrl: ogImage ? ogImage[1] : "",
      description,
      genre,
      episodes
    };
  }

  // ── Video list (signed player handshake) ──────────────────────────────────
  _slugFromUrl(url) {
    const m = String(url || "").match(/\/videos\/hentai\/([^/?#]+)/);
    return m ? m[1] : String(url || "").replace(/.*\//, "").replace(/[/?#].*$/, "");
  }

  _sealToken(slug, ts) {
    const key = hv_sha256(hv_utf8(HV_GCM_KEY_SEED));
    const iv = [];
    for (let i = 0; i < 12; i++) iv.push(Math.floor(Math.random() * 256));
    const body = { timestamp_unix: ts, directive: "htv_player_handshake", slug };
    const sealed = hv_gcmEncrypt(key, iv, hv_utf8(HV_GCM_AAD), hv_utf8(JSON.stringify(body)));
    const envelope = {
      v: 1,
      alg: "AES-256-GCM",
      iv: hv_b64u(iv),
      tag: hv_b64u(sealed.tag),
      data: hv_b64u(sealed.ct)
    };
    return hv_b64u(hv_utf8(JSON.stringify(envelope)));
  }

  _openToken(token) {
    const key = hv_sha256(hv_utf8(HV_GCM_KEY_SEED));
    const envelope = JSON.parse(hv_fromUtf8(hv_unb64u(token)));
    return JSON.parse(hv_fromUtf8(hv_gcmDecrypt(
      key,
      hv_unb64u(envelope.iv),
      hv_utf8(HV_GCM_AAD),
      hv_unb64u(envelope.data),
      hv_unb64u(envelope.tag)
    )));
  }

  _headerOf(headers, name) {
    if (!headers) return "";
    const wanted = name.toLowerCase();
    for (const k in headers) if (k.toLowerCase() === wanted) return headers[k];
    return "";
  }

  _handshakeHeaders(pageUrl, ts) {
    const signature = hv_hex(hv_sha256(hv_utf8(ts + "," + HV_SIGN_SECRET + "," + HV_SIGN_HOST + "," + HV_SIGN_MODE + "," + ts)));
    return {
      "User-Agent": HV_UA,
      "Referer": pageUrl,
      "Origin": HV_BASE,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-signature-version": "web2",
      "x-signature": signature,
      "x-time": String(ts)
    };
  }

  async _handshakeHttp(token, headers) {
    try {
      // The runtime serialises a Map body to JSON itself (and would
      // double-encode a pre-stringified one), so pass the object.
      const res = await new Client().post(HV_AUTH + "/api/v11/handshake", headers, { token });
      const xt = this._headerOf(res.headers, "x-token");
      if (xt) return xt;
      extLog("warn", "hanime: handshake HTTP refused (status " + (res.statusCode || "?") + ")");
    } catch (e) {
      extLog("warn", "hanime: handshake HTTP failed: " + (e && e.message ? e.message : e));
    }
    return "";
  }
  async getVideoList(url) {
    const slug = this._slugFromUrl(url);
    if (!slug) return [];

    const pageUrl = HV_BASE + "/videos/hentai/" + slug;
    const ts = Math.floor(Date.now() / 1000);
    const token = this._sealToken(slug, ts);
    const headers = this._handshakeHeaders(pageUrl, ts);

    const xToken = await this._handshakeHttp(token, headers);
    if (!xToken) {
      extLog("warn", "hanime.getVideoList: no player token");
      return [];
    }

    let sources = [];
    try {
      sources = (this._openToken(xToken).sources) || [];
    } catch (e) {
      extLog("warn", "hanime.getVideoList: token decode failed: " + (e && e.message ? e.message : e));
      return [];
    }

    const videos = [];
    for (const src of sources) {
      if (!src || !src.src) continue;
      if (src.kind && src.kind !== "normal") continue;
      const quality = src.label || (src.height ? src.height + "p" : "HLS");
      videos.push({
        url: src.src.charAt(0) === "/" ? HV_BASE + src.src : src.src,
        quality,
        originalUrl: src.src,
        headers: this.getHeaders(pageUrl),
        height: Number(src.height || 0)
      });
    }
    videos.sort((a, b) => b.height - a.height);
    return videos;
  }

  // ── Home sections (layout ids) ────────────────────────────────────────────
  async getCustomList(listId, page) {
    const id = String(listId || "");
    const p = Number(page) > 1 ? Number(page) : 1;

    if (id === "tags") {
      const html = await this._getHtml(HV_BASE + "/browse/tags");
      const out = [];
      const seen = {};
      const re = /<a href="\/browse\/tags\/([^"]+)"[^>]*class="tile[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const slug = m[1];
        const inner = m[2];
        const title = inner.match(/tile-title[^>]*>([\s\S]*?)<\/div>/);
        const art = inner.match(/--tile-art-wide:url\('([^']+)'\)/);
        if (seen[slug]) continue;
        seen[slug] = true;
        out.push({
          name: title ? title[1].replace(/<[^>]*>/g, "").trim() : decodeURIComponent(slug),
          imageUrl: art ? art[1] : "",
          collectionId: "tag_" + slug
        });
      }
      return { list: out, hasNextPage: false };
    }

    if (id.indexOf("tag_") === 0) {
      const slug = id.slice(4);
      const html = await this._getHtml(HV_BASE + "/browse/tags/" + slug + "?page=" + p);
      const list = this._itemsFromHtml(html);
      return { list, hasNextPage: list.length >= 20 };
    }

    if (id === "brands") {
      const html = await this._getHtml(HV_BASE + "/browse/brands");
      const out = [];
      const seen = {};
      const re = /<a href="\/browse\/brands\/([^"?]+)"[^>]*class="group inline-flex[^"]*"[^>]*>\s*<span class="[^"]*font-medium[^"]*"[^>]*>([^<]+)<\/span>/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const slug = m[1];
        if (seen[slug]) continue;
        seen[slug] = true;
        out.push({
          name: m[2].replace(/&amp;/g, "&").trim(),
          imageUrl: "",
          link: HV_BASE + "/browse/brands/" + slug,
          collectionId: "brand_" + slug
        });
      }
      return { list: out, hasNextPage: false };
    }

    if (id.indexOf("brand_") === 0) {
      const slug = id.slice(6);
      const html = await this._getHtml(HV_BASE + "/browse/brands/" + slug + "?page=" + p);
      const list = this._itemsFromHtml(html);
      return { list, hasNextPage: list.length >= 20 };
    }

    if (id === "recent" || id === "new" || id === "top") {
      let catalog = await this._catalogue();
      if (id === "top") catalog = catalog.sort((a, b) => b.views - a.views);
      else if (id === "new") catalog = catalog.sort((a, b) => b.released - a.released);
      else catalog = catalog.sort((a, b) => (b.created - a.created) || (b.released - a.released));
      return this._pageOf(catalog, p, 36);
    }

    throw new Error("Unknown custom list: " + id);
  }

  getFilterList() {
    const tags = [
      "anal","bdsm","bondage","censored","comedy","creampie","dark","fantasy","futanari",
      "gangbang","harem","hd","incest","lactation","maid","milf","monster","nekomimi","ntr",
      "nurse","orgy","plot","pov","pregnant","public","school","softcore","swimsuit","teacher",
      "tentacle","threesome","toys","trap","tsundere","ugly","uncensored","vanilla","virgin",
      "watersports","yaoi","yuri"
    ];
    return [
      {
        type: "SelectFilter",
        name: "Tag",
        state: 0,
        values: [{ type_name: "SelectOption", name: "All", value: "" }].concat(tags.map((t) => ({ type_name: "SelectOption", name: t, value: t })))
      },
      {
        type: "SelectFilter",
        name: "Sort",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Newest", value: "newest" },
          { type_name: "SelectOption", name: "Most viewed", value: "views" },
          { type_name: "SelectOption", name: "Recently released", value: "released" }
        ]
      }
    ];
  }

  getSourcePreferences() { return []; }
}
