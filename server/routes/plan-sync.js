const planSyncService = require('../services/plan-sync-service');

async function handlePlanSyncRoutes(req, res, pathname) {
  // 1. GET /api/plan-sync/preview -> Canlı SQL planını önizle (Salt Okunur)
  if (req.method === 'GET' && pathname === '/api/plan-sync/preview') {
    try {
      const preview = await planSyncService.fetchSourcePlanPreview();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: preview
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'SQL_PLAN_PREVIEW_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 2. POST /api/plan-sync/snapshot -> Canlı SQL planını PostgreSQL'e Snapshot olarak al
  if (req.method === 'POST' && pathname === '/api/plan-sync/snapshot') {
    const canEditPlan = req.user && (req.user.permissions?.canApprovePlans || req.user.permissions?.canEditParameters || req.user.role === 'admin' || req.user.role === 'planner');
    if (!canEditPlan) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Üretim planını içeri alma ve düzenleme yetkisi gereklidir.' }
      }));
      return true;
    }

    try {
      const { notes, createOrUpdateDraft, forceOverwrite } = req.body || {};
      const result = await planSyncService.commitSourcePlanSnapshot({
        user: req.user,
        notes: notes || '',
        createOrUpdateDraft: createOrUpdateDraft !== false,
        forceOverwrite: forceOverwrite === true
      });

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: result
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'SQL_SNAPSHOT_COMMIT_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 3. GET /api/plan-sync/draft -> Aktif üretim planı taslağını getir
  if (req.method === 'GET' && pathname === '/api/plan-sync/draft') {
    try {
      const draftData = await planSyncService.getActiveDraft();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: draftData
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'DRAFT_FETCH_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 4. PUT /api/plan-sync/draft/order -> Taslak satır sırasını güncelle (Kullanıcı Sıralaması)
  if (req.method === 'PUT' && pathname === '/api/plan-sync/draft/order') {
    const canEditPlan = req.user && (req.user.permissions?.canApprovePlans || req.user.permissions?.canEditParameters || req.user.role === 'admin' || req.user.role === 'planner');
    if (!canEditPlan) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Plan sırasını düzenleme yetkisi gereklidir.' }
      }));
      return true;
    }

    try {
      const targetDraftId = req.body?.draftId || req.body?.draft_id || 'DRAFT-DEFAULT';
      const targetItemIds = req.body?.itemIds || req.body?.ordered_item_ids || [];
      if (!Array.isArray(targetItemIds) || targetItemIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'INVALID_ORDER_DATA', message: 'Sıralanacak satır ID dizisi geçerli değil.' }
        }));
        return true;
      }

      const result = await planSyncService.updateDraftItemsOrder(targetDraftId, targetItemIds, req.user);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: result
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'DRAFT_ORDER_UPDATE_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 5. GET /api/plan-sync/snapshots -> Snapshot geçmişi listesi
  if (req.method === 'GET' && pathname === '/api/plan-sync/snapshots') {
    try {
      const snapshots = await planSyncService.getSnapshotsList();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: snapshots
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'SNAPSHOTS_LIST_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 6. GET /api/plan-sync/snapshots/:id -> Snapshot detayları
  if (req.method === 'GET' && pathname.startsWith('/api/plan-sync/snapshots/')) {
    const snapId = pathname.replace('/api/plan-sync/snapshots/', '');
    try {
      const details = await planSyncService.getSnapshotDetails(snapId);
      if (!details) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'SNAPSHOT_NOT_FOUND', message: `Snapshot bulunamadı: ${snapId}` }
        }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: details
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'SNAPSHOT_DETAILS_ERROR', message: err.message }
      }));
      return true;
    }
  }

  return false;
}

module.exports = {
  handlePlanSyncRoutes
};
