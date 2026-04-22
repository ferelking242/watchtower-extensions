const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
};

function safeJoin(base, target) {
  const targetPath = path.posix.normalize('/' + target).replace(/^\/+/, '');
  return path.join(base, targetPath);
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
  return `<!doctype html><meta charset="utf-8"><title>Index of ${urlPath}</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}h1{font-size:1.2rem}a{text-decoration:none}li{list-style:none;padding:.15rem 0}</style>
<h1>Watchtower Extensions — Index of ${urlPath}</h1><ul>${up}${items}</ul>`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = safeJoin(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('Not found'); }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexHtml = path.join(filePath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(indexHtml));
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(listDir(filePath, urlPath.endsWith('/') ? urlPath : urlPath + '/'));
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500); res.end('Server error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Watchtower Extensions catalog serving at http://${HOST}:${PORT}`);
});
