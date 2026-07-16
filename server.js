/**
 * Watchtower Extensions Server
 *
 * Deux rôles :
 *  1. CDN statique  — sert les fichiers JS/JSON/assets du repo
 *  2. API d'exécution — charge et exécute les extensions JS via Node.js vm
 *     GET /api/sources                      → liste toutes les sources
 *     GET /api/sources/:id/popular?page=    → getPopular
 *     GET /api/sources/:id/latest?page=     → getLatestUpdates
 *     GET /api/sources/:id/search?q=&page=  → search
 *     GET /api/sources/:id/detail?url=      → getDetail
 *     GET /api/sources/:id/videos?url=      → getVideoList
 *
 * Fix VM clé : Client et MProvider sont injectés dans le sandbox AVANT
 * vm.createContext → ils sont visibles comme globaux dans toute extension.
 */

'use strict';

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const vm     = require('vm');
const { URL } = require('url');

const PORT = 5000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

// ─── MIME types ──────────────────────────────────────────────────────────────

const MIME = {
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wext': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.apk':  'application/vnd.android.package-archive',
};

// ─── HTTP Client — injecté dans chaque sandbox VM ────────────────────────────

const FETCH_TIMEOUT_MS = 20_000;

class Client {
  async _req(method, url, headers, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const init = { method, headers: headers || {}, redirect: 'follow', signal: ctrl.signal };
      if (body != null) init.body = body;
      const res  = await fetch(url, init);
      const text = await res.text();
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      return { statusCode: res.status, body: text, headers: hdrs, url: res.url };
    } finally {
      clearTimeout(timer);
    }
  }

  async get(url, headers) {
    return this._req('GET', url, headers);
  }

  async post(url, body, headers) {
    let b = body;
    const h = { ...(headers || {}) };
    if (b && typeof b === 'object' && !(b instanceof URLSearchParams)) {
      b = JSON.stringify(b);
      if (!h['Content-Type'] && !h['content-type']) h['Content-Type'] = 'application/json';
    }
    return this._req('POST', url, h, b);
  }

  async head(url, headers) {
    return this._req('HEAD', url, headers);
  }
}

// ─── MProvider base — identique à la spec Watchtower ─────────────────────────

class MProvider {
  constructor() { this.source = null; }
  get supportsLatest() { return false; }
  getHeaders(url)                      { return {}; }
  async getPopular(page)               { throw new Error('getPopular not implemented'); }
  async getLatestUpdates(page)         { throw new Error('getLatestUpdates not implemented'); }
  async search(query, page, filters)   { throw new Error('search not implemented'); }
  async getDetail(url)                 { throw new Error('getDetail not implemented'); }
  async getPageList(url)               { return []; }
  async getVideoList(url)              { throw new Error('getVideoList not implemented'); }
  getFilterList()                      { return []; }
  getSourcePreferences()               { return []; }
  async getRecommendations(url)        { return []; }
  async getComments(url)               { return []; }
}

// ─── SharedPreferences stub ───────────────────────────────────────────────────

class SharedPreferences {
  constructor() { this._data = {}; }
  get(key)        { return this._data[key] ?? null; }
  set(key, value) { this._data[key] = value; }
}

// ─── Document stub (pour extensions qui parsent HTML) ────────────────────────

class Document {
  constructor(html) { this._html = html || ''; }
  select(sel)    { return []; }
  selectFirst(sel) { return null; }
  attr(a)        { return ''; }
  text()         { return ''; }
  outerHtml()    { return this._html; }
}

// ─── Chargement et exécution d'une extension ─────────────────────────────────

/**
 * Charge un fichier JS d'extension dans un contexte VM isolé.
 * Retourne { meta, ExtClass } où ExtClass est la classe DefaultExtension.
 *
 * La clé du fix : Client, MProvider, SharedPreferences et Document sont
 * passés comme propriétés de l'objet sandbox AVANT vm.createContext.
 * Ils deviennent ainsi des variables globales dans le VM, accessibles
 * sans aucune déclaration supplémentaire.
 */
function loadExtension(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');

  const sandbox = {
    // Globals Watchtower
    Client,
    MProvider,
    SharedPreferences,
    Document,
    // Globals JS standard
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
    // Placeholders déclarés pour que typeof ne lève pas ReferenceError
    watchtowerSources: undefined,
    mangayomiSources:  undefined,
    DefaultExtension:  undefined,
  };

  vm.createContext(sandbox);

  // On exécute le code de l'extension puis on capture ses exports
  const wrapped = code + `
;this.__exports = {
  sources: typeof watchtowerSources !== 'undefined'
    ? watchtowerSources
    : (typeof mangayomiSources !== 'undefined' ? mangayomiSources : null),
  DefaultExtension: typeof DefaultExtension !== 'undefined' ? DefaultExtension : null,
};`;

  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath), timeout: 10_000 });

  const { sources, DefaultExtension: ExtClass } = sandbox.__exports;
  if (!sources || !ExtClass) throw new Error('Extension invalide : watchtowerSources ou DefaultExtension manquant');

  return { meta: sources[0], ExtClass };
}

// ─── Registre des extensions (cache) ─────────────────────────────────────────

/**
 * Chaque entrée : { meta: {...}, instance: DefaultExtension | null, error: string | null }
 * Chargé une seule fois au démarrage depuis les fichiers locaux.
 */
const registry = new Map(); // id → entry

/**
 * Convertit une sourceCodeUrl jsdelivr en chemin de fichier local.
 * Ex: "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/watch/multi/foo.js"
 *     → "<ROOT>/src/watch/multi/foo.js"
 */
function urlToLocalPath(sourceCodeUrl) {
  if (!sourceCodeUrl) return null;
  const marker = 'watchtower-extensions@main/';
  const idx = sourceCodeUrl.indexOf(marker);
  if (idx === -1) return null;
  const rel = sourceCodeUrl.slice(idx + marker.length);
  return path.join(ROOT, rel);
}

function loadCatalog(jsonFile) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'index', jsonFile), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[catalog] Erreur lecture ${jsonFile} :`, e.message);
    return [];
  }
}

function buildRegistry() {
  const catalogs = [
    loadCatalog('watch.json'),
    loadCatalog('manga.json'),
    loadCatalog('novel.json'),
    loadCatalog('music.json'),
  ];

  let loaded = 0, failed = 0;

  for (const catalog of catalogs) {
    for (const entry of catalog) {
      const id = entry.id;
      if (!id || registry.has(id)) continue;

      const filePath = urlToLocalPath(entry.sourceCodeUrl);
      if (!filePath || !fs.existsSync(filePath)) {
        registry.set(id, { meta: entry, instance: null, error: 'fichier source introuvable' });
        failed++;
        continue;
      }

      try {
        const { meta, ExtClass } = loadExtension(filePath);
        const instance = new ExtClass();
        instance.source = { ...meta, prefs: [] };
        // Merge index metadata (id, name, lang, etc.) sur la meta de l'extension
        const merged = { ...entry, ...meta, id };
        registry.set(id, { meta: merged, instance, error: null });
        loaded++;
      } catch (e) {
        registry.set(id, { meta: entry, instance: null, error: e.message });
        failed++;
      }
    }
  }

  console.log(`[registry] ${loaded} extensions chargées, ${failed} en erreur`);
}

// ─── Helpers API ─────────────────────────────────────────────────────────────

const API_TIMEOUT_MS = 25_000;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

function findEntry(sourceId) {
  // Par ID numérique
  const numId = parseInt(sourceId, 10);
  if (!isNaN(numId) && registry.has(numId)) return registry.get(numId);
  // Par nom (insensible à la casse)
  const lower = sourceId.toLowerCase();
  for (const entry of registry.values()) {
    if ((entry.meta.name || '').toLowerCase() === lower) return entry;
  }
  return null;
}

function jsonRes(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function errorRes(res, status, message) {
  jsonRes(res, status, { error: message });
}

// ─── Routes API ───────────────────────────────────────────────────────────────

async function handleApi(req, res, urlObj) {
  const parts = urlObj.pathname.replace(/^\/api\//, '').split('/');
  const q     = urlObj.searchParams;

  // GET /api/sources
  if (parts[0] === 'sources' && parts.length === 1) {
    const sources = [];
    for (const { meta, error } of registry.values()) {
      sources.push({
        id:          meta.id,
        name:        meta.name,
        lang:        meta.lang,
        iconUrl:     meta.iconUrl,
        baseUrl:     meta.baseUrl,
        itemType:    meta.itemType ?? 1,
        isNsfw:      meta.isNsfw ?? false,
        version:     meta.version,
        available:   error === null,
        error:       error,
      });
    }
    return jsonRes(res, 200, { sources });
  }

  // GET /api/sources/:id/popular|latest|search|detail|videos
  if (parts[0] === 'sources' && parts.length === 3) {
    const sourceId = parts[1];
    const action   = parts[2];
    const entry    = findEntry(sourceId);

    if (!entry) return errorRes(res, 404, `Source "${sourceId}" introuvable`);
    if (!entry.instance) return errorRes(res, 503, `Source non disponible : ${entry.error}`);

    const ext  = entry.instance;
    const page = parseInt(q.get('page') || '1', 10) || 1;

    try {
      let result;
      switch (action) {
        case 'popular':
          result = await withTimeout(ext.getPopular(page), API_TIMEOUT_MS, 'getPopular');
          return jsonRes(res, 200, {
            list:        result?.list ?? [],
            hasNextPage: result?.hasNextPage ?? false,
          });

        case 'latest':
          result = await withTimeout(ext.getLatestUpdates(page), API_TIMEOUT_MS, 'getLatestUpdates');
          return jsonRes(res, 200, {
            list:        result?.list ?? [],
            hasNextPage: result?.hasNextPage ?? false,
          });

        case 'search': {
          const query = q.get('q') || '';
          result = await withTimeout(ext.search(query, page, []), API_TIMEOUT_MS, 'search');
          return jsonRes(res, 200, {
            list:        result?.list ?? [],
            hasNextPage: result?.hasNextPage ?? false,
          });
        }

        case 'detail': {
          const url = q.get('url');
          if (!url) return errorRes(res, 400, 'Paramètre url requis');
          result = await withTimeout(ext.getDetail(decodeURIComponent(url)), API_TIMEOUT_MS, 'getDetail');
          return jsonRes(res, 200, result ?? {});
        }

        case 'videos': {
          const url = q.get('url');
          if (!url) return errorRes(res, 400, 'Paramètre url requis');
          result = await withTimeout(ext.getVideoList(decodeURIComponent(url)), API_TIMEOUT_MS, 'getVideoList');
          return jsonRes(res, 200, { videos: Array.isArray(result) ? result : [] });
        }

        default:
          return errorRes(res, 404, `Action "${action}" inconnue`);
      }
    } catch (e) {
      console.error(`[api] ${entry.meta.name} / ${action} : ${e.message}`);
      return errorRes(res, 500, e.message);
    }
  }

  // GET /api/ping
  if (parts[0] === 'ping') {
    return jsonRes(res, 200, { ok: true, sources: registry.size });
  }

  return errorRes(res, 404, 'Route API inconnue');
}

// ─── Serveur HTTP ─────────────────────────────────────────────────────────────

function safeJoin(base, target) {
  const rel = path.posix.normalize('/' + target).replace(/^\/+/, '');
  const abs = path.join(base, rel);
  return abs.startsWith(base) ? abs : null;
}

function listDir(dirPath, urlPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
  const items = entries.map(e => {
    const name = e.name + (e.isDirectory() ? '/' : '');
    const href = encodeURIComponent(e.name) + (e.isDirectory() ? '/' : '');
    return `<li><a href="${href}">${name}</a></li>`;
  }).join('');
  const up = urlPath !== '/' ? '<li><a href="../">../</a></li>' : '';
  return `<!doctype html><meta charset="utf-8"><title>Watchtower Extensions — ${urlPath}</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}
h1{font-size:1.2rem}a{text-decoration:none}li{list-style:none;padding:.15rem 0}</style>
<h1>Watchtower Extensions — ${urlPath}</h1><ul>${up}${items}</ul>`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const urlObj  = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const urlPath = decodeURIComponent(urlObj.pathname);

    // Routes API
    if (urlPath.startsWith('/api/')) {
      return await handleApi(req, res, urlObj);
    }

    // Fichiers statiques (CDN)
    const filePath = safeJoin(ROOT, urlPath);
    if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }
    if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('Not found'); }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      if (fs.existsSync(index)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(fs.readFileSync(index));
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(listDir(filePath, urlPath.endsWith('/') ? urlPath : urlPath + '/'));
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type':  MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
    fs.createReadStream(filePath).pipe(res);

  } catch (err) {
    console.error('[server]', err.message);
    if (!res.headersSent) { res.writeHead(500); res.end('Server error: ' + err.message); }
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

console.log('[startup] Chargement des extensions...');
buildRegistry();

server.listen(PORT, HOST, () => {
  console.log(`[ready] Watchtower Extensions sur http://${HOST}:${PORT}`);
  console.log(`[ready] API : http://localhost:${PORT}/api/sources`);
});
