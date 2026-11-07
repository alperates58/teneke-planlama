const erpSyncService = require('../services/erpSyncService');
const demandAllocationService = require('../services/demandAllocationService');
const { requireRole } = require('../middleware/auth');

async function handleErpRoutes(req, res, pathname) {
  // 1. SQL Server Bağlantı Testi
  if (req.method === 'GET' && pathname === '/api/erp/test-connection') {
    const result = await erpSyncService.testConnection();
    res.writeHead(result.connected ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(result));
  }

  // 2. Sözleşme View'ları Durumu
  if (req.method === 'GET' && pathname === '/api/erp/views/status') {
    const views = await erpSyncService.checkViewsStatus();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, data: views }));
  }

  // 3. Canlı Önizleme (Salt Okunur)
  if (req.method === 'GET' && pathname === '/api/erp/preview') {
    try {
      const preview = await erpSyncService.fetchPreview();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: preview }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 4. ERP Senkronizasyonu Çalıştırma (Admin Zorunlu!)
  if (req.method === 'POST' && pathname === '/api/erp/sync') {
    return new Promise((resolve) => {
      requireRole(['admin'])(req, res, async () => {
        try {
          const syncType = req.body?.syncType || 'full';
          const result = await erpSyncService.runSync({ user: req.user, syncType });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, data: result }));
          resolve(true);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  // 5. Senkronizasyon Çalıştırma Geçmişi
  if (req.method === 'GET' && pathname === '/api/erp/sync-history') {
    try {
      const history = await erpSyncService.getSyncHistory();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: history }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 6. Kademeli Stok Tahsis Hesaplamasını Yeniden Çalıştır (Faz 3B Motoru)
  if (req.method === 'POST' && pathname === '/api/erp/calculate-allocations') {
    return new Promise((resolve) => {
      requireRole(['admin', 'planner'])(req, res, async () => {
        try {
          const syncRunId = req.body?.syncRunId || null;
          const result = await demandAllocationService.runAllocationCalculation({ user: req.user, syncRunId });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, data: result }));
          resolve(true);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: { message: err.message } }));
          resolve(true);
        }
      });
    });
  }

  // 7. En Son Hesaplama Koşusu ve Özeti (Faz 3B)
  if (req.method === 'GET' && pathname === '/api/erp/latest-calculation') {
    try {
      const latest = await demandAllocationService.getLatestCalculation();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: latest }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  // 8. Canlı Brüt ve Hesaplanmış Kademeli Talepler (/api/erp/demands ve /api/demands)
  if (req.method === 'GET' && (pathname === '/api/erp/demands' || pathname === '/api/demands')) {
    try {
      const demands = await erpSyncService.getLiveDemands();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        count: demands.length,
        synced: demands.length > 0,
        data: demands
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { message: err.message } }));
    }
  }

  return false;
}

module.exports = { handleErpRoutes };
