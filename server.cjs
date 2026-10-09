const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || process.argv[2] || 4173);
const files = new Set(['index.html','style.css','commerce.js','engine.js','play-guide.js','city.js','app.js','world.css','world-model.js','world-host.js','world3d.mjs','vendor/three.module.js','vendor/three.core.min.js','vendor/OrbitControls.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html'; }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  if (!files.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read application file'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is occupied. Set PORT to another local port, or open index.html directly.` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`SEOUL ZERO ready: http://127.0.0.1:${port}`));
