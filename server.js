/**
 * ============================================================================
 * AstroSee — Local Dev Server + 7Timer! CORS Bridge (server.js)
 * Avvia con: node server.js  -->  http://localhost:8080
 * ============================================================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // 1. Local CORS Proxy Endpoint for 7Timer! (/api/7timer?lon=...&lat=...)
  if (parsedUrl.pathname === '/api/7timer') {
    const lon = parsedUrl.searchParams.get('lon') || '11.5268';
    const lat = parsedUrl.searchParams.get('lat') || '45.8665';
    const targetUrl = `https://www.7timer.info/bin/api.pl?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}&product=astro&output=json`;

    https
      .get(targetUrl, (apiRes) => {
        // Follow 301/302 redirects if 7Timer redirects
        if (apiRes.statusCode >= 300 && apiRes.statusCode < 400 && apiRes.headers.location) {
          https.get(apiRes.headers.location, (redirectRes) => {
            pipeSevenTimerResponse(redirectRes, res);
          }).on('error', (err) => sendJsonError(res, err));
          return;
        }
        pipeSevenTimerResponse(apiRes, res);
      })
      .on('error', (err) => sendJsonError(res, err));
    return;
  }

  // 2. Serve Static PWA Files
  let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, safePath);

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

function pipeSevenTimerResponse(apiRes, clientRes) {
  let body = '';
  apiRes.on('data', (chunk) => (body += chunk));
  apiRes.on('end', () => {
    clientRes.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    clientRes.end(body);
  });
}

function sendJsonError(res, err) {
  res.writeHead(502, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({ error: '7Timer upstream error', details: err.message }));
}

server.listen(PORT, () => {
  console.log(`\n🔭 AstroSee Server & 7Timer! Proxy attivo su: http://localhost:${PORT}\n`);
});
