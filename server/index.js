// ES2024 Promise.withResolvers polyfill for Node.js 20 compatibility
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const { runMigrations } = require('./db/migrator');
const { authenticateRequest } = require('./middleware/auth');
const { parseBody } = require('./middleware/body-parser');

// Route modülleri
const { handleAuthRoutes } = require('./routes/auth');
const { handleProductRoutes } = require('./routes/products');
const { handleCatalogRoutes } = require('./routes/catalog');
const { handleDictionaryRoutes } = require('./routes/dictionaries');
const { handleRawSheetRoutes, handleCapacityRoutes } = require('./routes/raw-sheets');
const { handleImportRoutes } = require('./routes/import');
const { handleMigrationRoutes, handleAuditRoutes } = require('./routes/migration');
const { handlePlanSyncRoutes } = require('./routes/plan-sync');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

async function startServer() {
  // 1. Veritabanı migrasyonlarını çalıştır
  try {
    await runMigrations();
  } catch (err) {
    console.error('[Startup] Migrasyon hatası oluştu, ancak sunucu başlatılmaya devam ediyor:', err.message);
  }

  // 2. HTTP Sunucusunu oluştur
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

    // Healthcheck endpoint
    if (pathname === '/api/health') {
      const dbStatus = await db.checkHealth();
      res.writeHead(dbStatus.ok ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        status: dbStatus.ok ? 'healthy' : 'degraded',
        project: 'Teneke Planlama',
        active_phase: '2C (Gerçek Backend & Kalıcı PostgreSQL)',
        database: dbStatus,
        time: new Date().toISOString()
      }));
    }

    // API İstekleri
    if (pathname.startsWith('/api/')) {
      try {
        // Oturum ve yetki analizi
        req.user = await authenticateRequest(req);

        // İstek gövdesi ayrıştırma (JSON / Multipart / Raw)
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const parsed = await parseBody(req);
          req.body = parsed.body;
          req.rawBuffer = parsed.rawBuffer;
          req.isMultipart = parsed.isMultipart;
          req.contentType = parsed.contentType;
        } else {
          req.body = {};
        }

        // Modüler yönlendirme
        let handled = false;

        handled = await handleAuthRoutes(req, res, pathname);
        if (!handled) handled = await handleProductRoutes(req, res, pathname, queryParams);
        if (!handled) handled = await handleCatalogRoutes(req, res, pathname, queryParams);
        if (!handled) handled = await handleDictionaryRoutes(req, res, pathname);
        if (!handled) handled = await handleRawSheetRoutes(req, res, pathname);
        if (!handled) handled = await handleCapacityRoutes(req, res, pathname);
        if (!handled) handled = await handleImportRoutes(req, res, pathname);
        if (!handled) handled = await handleMigrationRoutes(req, res, pathname);
        if (!handled) handled = await handleAuditRoutes(req, res, pathname, queryParams);
        if (!handled) handled = await handlePlanSyncRoutes(req, res, pathname);

        if (!handled) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            success: false,
            error: { code: 'ENDPOINT_NOT_FOUND', message: `Bilinmeyen API uç noktası: ${req.method} ${pathname}` }
          }));
        }
        return;
      } catch (err) {
        console.error(`[API ERROR] ${req.method} ${pathname}:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', message: err.message }
        }));
      }
    }

    // Statik Dosya Sunumu (Public Klasörü)
    let relativePath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(config.PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(config.PUBLIC_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Dosya bulunamadı');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  });

  server.listen(config.PORT, config.HOST, () => {
    console.log(`[Teneke Planlama] Sunucu devrede: http://${config.HOST}:${config.PORT}`);
    console.log(`[Teneke Planlama] Hedef DB: ${config.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Fatal] Sunucu başlatılamadı:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
