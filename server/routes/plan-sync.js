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

  // 3. GET /api/plan-sync/draft & /api/plan/draft -> Aktif üretim planı taslağını getir
  if (req.method === 'GET' && (pathname === '/api/plan-sync/draft' || pathname === '/api/plan/draft')) {
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

  // 4. PUT /api/plan-sync/draft/order & /api/plan/draft/order -> Taslak satır sırasını güncelle (Kullanıcı Sıralaması & 409 Koruması)
  if (req.method === 'PUT' && (pathname === '/api/plan-sync/draft/order' || pathname === '/api/plan/draft/order')) {
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
      const expectedVersion = req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : null;

      if (!Array.isArray(targetItemIds) || targetItemIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'INVALID_ORDER_DATA', message: 'Sıralanacak satır ID dizisi geçerli değil.' }
        }));
        return true;
      }

      const result = await planSyncService.updateDraftItemsOrder(targetDraftId, targetItemIds, req.user, expectedVersion);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: result
      }));
      return true;
    } catch (err) {
      if (err.code === 'CONCURRENT_MODIFICATION') {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'CONCURRENT_MODIFICATION', message: err.message, currentVersion: err.currentVersion }
        }));
        return true;
      }
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'DRAFT_ORDER_UPDATE_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // 4.1. PUT /api/plan/draft/item/:id -> Tekil satır güncelle (Miktar, Kilit, Notlar ve 409 Kontrolü)
  if (req.method === 'PUT' && pathname.startsWith('/api/plan/draft/item/')) {
    const itemId = pathname.replace('/api/plan/draft/item/', '');
    try {
      const targetDraftId = req.body?.draftId || 'DRAFT-DEFAULT';
      const expectedVersion = req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : null;
      const updates = req.body?.updates || {};

      const result = await planSyncService.updateDraftItem({
        draftId: targetDraftId,
        itemId,
        updates,
        expectedVersion,
        user: req.user
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: result }));
      return true;
    } catch (err) {
      if (err.code === 'CONCURRENT_MODIFICATION') {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'CONCURRENT_MODIFICATION', message: err.message }
        }));
        return true;
      }
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      return true;
    }
  }

  // 4.2. GET /api/plan/scheduling-parameters -> Takvim, Hız ve Ayar Parametreleri
  if (req.method === 'GET' && pathname === '/api/plan/scheduling-parameters') {
    try {
      const params = await planSyncService.getSchedulingParameters();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: params }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      return true;
    }
  }

  // 4.3. POST /api/plan/schedule-preview -> Çizelgeleme Önizlemesi (Mevcut Planı Değiştirmez)
  if (req.method === 'POST' && pathname === '/api/plan/schedule-preview') {
    try {
      const { draftId, scheduleStartTime, items } = req.body || {};
      const preview = await planSyncService.previewSchedule({
        draftId: draftId || 'DRAFT-DEFAULT',
        scheduleStartTime,
        itemsOverride: items || null
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: preview }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      return true;
    }
  }

  // 4.4. POST /api/plan/schedule-commit -> Çizelgeyi Uygula ve Kaydet (409 Korumalı)
  if (req.method === 'POST' && pathname === '/api/plan/schedule-commit') {
    try {
      const { draftId, scheduleStartTime, scheduledItems, expectedVersion } = req.body || {};
      if (!Array.isArray(scheduledItems) || scheduledItems.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: { message: 'Kaydedilecek çizelgelenmiş iş listesi boş olamaz.' } }));
        return true;
      }

      const result = await planSyncService.commitSchedule({
        draftId: draftId || 'DRAFT-DEFAULT',
        scheduleStartTime,
        scheduledItems,
        expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : null,
        user: req.user
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: result }));
      return true;
    } catch (err) {
      if (err.code === 'CONCURRENT_MODIFICATION') {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'CONCURRENT_MODIFICATION', message: err.message, currentVersion: err.currentVersion }
        }));
        return true;
      }
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      return true;
    }
  }

  // 4.5. POST /api/plan/draft/add-demand -> İhtiyaç Havuzundan İlave Plan Ekle
  if (req.method === 'POST' && pathname === '/api/plan/draft/add-demand') {
    try {
      const { draftId, demandId, expectedVersion } = req.body || {};
      if (!demandId) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: { message: 'demandId parametresi zorunludur.' } }));
        return true;
      }

      const result = await planSyncService.addUncoveredDemandToDraft({
        draftId: draftId || 'DRAFT-DEFAULT',
        demandId,
        user: req.user,
        expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : null
      });

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: result }));
      return true;
    } catch (err) {
      if (err.code === 'CONCURRENT_MODIFICATION') {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: { code: 'CONCURRENT_MODIFICATION', message: err.message } }));
        return true;
      }
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      return true;
    }
  }

  // 4.6. POST & GET /api/plan/scenarios -> Senaryo Kaydet ve Listele
  if (pathname === '/api/plan/scenarios') {
    if (req.method === 'GET') {
      try {
        const scenarios = await planSyncService.getScenariosList('DRAFT-DEFAULT');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, data: scenarios }));
        return true;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: { message: err.message } }));
        return true;
      }
    }

    if (req.method === 'POST') {
      try {
        const { draftId, scenarioName, notes } = req.body || {};
        const saved = await planSyncService.saveDraftScenario({
          draftId: draftId || 'DRAFT-DEFAULT',
          scenarioName,
          notes,
          user: req.user
        });

        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, data: saved }));
        return true;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: { message: err.message } }));
        return true;
      }
    }
  }

  // 4.7. POST /api/plan/scenarios/:id/revert -> Senaryoya Geri Dön
  if (req.method === 'POST' && pathname.startsWith('/api/plan/scenarios/') && pathname.endsWith('/revert')) {
    const scenarioId = pathname.replace('/api/plan/scenarios/', '').replace('/revert', '');
    try {
      const result = await planSyncService.revertDraftToScenario({
        draftId: 'DRAFT-DEFAULT',
        scenarioId,
        user: req.user
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: result }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: err.message } }));
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
