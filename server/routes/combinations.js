const { requireAuth, requireRole } = require('../middleware/auth');
const printedDemandService = require('../services/printedDemandService');
const combinationService = require('../services/combinationService');

async function handleCombinationRoutes(req, res, pathname, queryParams = {}) {
  // 1. Baskılı İhtiyaç Havuzunu Getir
  if (req.method === 'GET' && pathname === '/api/print-demands') {
    try {
      const scope = queryParams.scope || 'ACTIVE_PLAN';
      const status = queryParams.status || 'ALL';
      const tubeSize = queryParams.tubeSize || 'ALL';
      const search = queryParams.search || '';
      const grouped = queryParams.grouped === 'true';

      const result = await printedDemandService.getPrintedDemands({
        scope,
        status,
        tubeSize,
        search,
        grouped
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[API] /api/print-demands hatası:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 2. Baskılı İhtiyaç Havuzunu Aktif Plandan Senkronize Et
  if (req.method === 'POST' && pathname === '/api/print-demands/sync') {
    return new Promise((resolve) => {
      requireRole(['admin', 'planner'])(req, res, async () => {
        try {
          const draftId = req.body?.draftId || null;
          const result = await printedDemandService.syncPrintedDemandsFromPlan({
            draftId,
            user: req.user
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
          resolve(true);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  // 3. Kombinasyon Doğrulama (Dry-run / Validate)
  if (req.method === 'POST' && pathname === '/api/combinations/validate') {
    try {
      const validation = await combinationService.validateCombination(req.body || {});
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: validation }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 4. Taslak Kombinasyon Oluştur (Rezervasyonlu)
  if (req.method === 'POST' && pathname === '/api/combinations/draft') {
    return new Promise((resolve) => {
      requireRole(['admin', 'planner'])(req, res, async () => {
        try {
          const result = await combinationService.createDraftCombination({
            ...(req.body || {}),
            user: req.user
          });
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, data: result }));
          resolve(true);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  // 5. Kombinasyonları Listele
  if (req.method === 'GET' && pathname === '/api/combinations') {
    try {
      const status = queryParams.status || 'ALL';
      const tubeSize = queryParams.tubeSize || 'ALL';
      const result = await combinationService.getCombinations({ status, tubeSize });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 6. Tekil Kombinasyon Detayı
  const matchId = pathname.match(/^\/api\/combinations\/([^\/]+)$/);
  if (req.method === 'GET' && matchId) {
    try {
      const combId = matchId[1];
      const data = await combinationService.getCombinationById(combId);
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: false, error: { message: 'Kombinasyon bulunamadı.' } }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 7. Kombinasyonu Onayla
  const matchConfirm = pathname.match(/^\/api\/combinations\/([^\/]+)\/confirm$/);
  if (req.method === 'POST' && matchConfirm) {
    return new Promise((resolve) => {
      requireRole(['admin', 'planner'])(req, res, async () => {
        try {
          const combId = matchConfirm[1];
          const result = await combinationService.confirmCombination(combId, req.user);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, data: result }));
          resolve(true);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  // 8. Kombinasyonu İptal Et
  const matchCancel = pathname.match(/^\/api\/combinations\/([^\/]+)\/cancel$/);
  if (req.method === 'POST' && matchCancel) {
    return new Promise((resolve) => {
      requireRole(['admin', 'planner'])(req, res, async () => {
        try {
          const combId = matchCancel[1];
          const result = await combinationService.cancelCombination(combId, req.user);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, data: result }));
          resolve(true);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  return false;
}

module.exports = { handleCombinationRoutes };
