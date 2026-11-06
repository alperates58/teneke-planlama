const { query, withTransaction } = require('../db');

async function handleMigrationRoutes(req, res, pathname) {
  // POST /api/migration/localstorage/preview
  if (req.method === 'POST' && pathname === '/api/migration/localstorage/preview') {
    const clientData = req.body || {};
    const clientProducts = Array.isArray(clientData.technicalProducts) ? clientData.technicalProducts : [];

    const dbProductsRes = await query('SELECT stock_code, stock_name, tube_size, version FROM product_technicals');
    const dbMap = new Map(dbProductsRes.rows.map(p => [p.stock_code, p]));

    const preview = {
      clientCount: clientProducts.length,
      dbCount: dbProductsRes.rows.length,
      newInClient: [],
      existingInDb: [],
      conflicts: [],
    };

    for (const cp of clientProducts) {
      const code = (cp.stock_code || cp.stockCode || '').trim();
      if (!code) continue;

      if (!dbMap.has(code)) {
        preview.newInClient.push({
          stockCode: code,
          stockName: cp.stock_name || cp.stockName,
          tubeSize: cp.tube_size || cp.tubeSize,
          status: 'WILL_INSERT',
        });
      } else {
        const dbItem = dbMap.get(code);
        preview.existingInDb.push({
          stockCode: code,
          stockName: dbItem.stock_name,
          tubeSize: dbItem.tube_size,
          status: 'ALREADY_IN_DB',
        });
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, data: preview }));
  }

  // POST /api/migration/localstorage/apply
  if (req.method === 'POST' && pathname === '/api/migration/localstorage/apply') {
    if (!req.user || !req.user.permissions?.canEditParameters) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Veri taşıma işlemi için yönetici yetkisi gereklidir.' }
      }));
    }

    const { itemsToMigrate } = req.body || {};
    if (!Array.isArray(itemsToMigrate) || itemsToMigrate.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'NO_ITEMS', message: 'Taşınacak kayıt seçilmedi.' } }));
    }

    try {
      const result = await withTransaction(async (client) => {
        let inserted = 0;
        for (const item of itemsToMigrate) {
          const code = (item.stock_code || item.stockCode || '').trim();
          if (!code) continue;

          const tubeSize = item.tube_size || item.tubeSize || '52x195';
          const parts = tubeSize.split('x');
          const diameter = parseFloat(parts[0]) || 52;
          const height = parseFloat(parts[1]) || 195;
          const rawSheet = item.raw_sheet_code || item.rawSheetCode || '500011000004-1206';

          const colors = Array.isArray(item.colors) ? item.colors : ['C', 'M', 'Y', 'K'];

          await client.query(
            `INSERT INTO product_technicals (
              id, stock_code, stock_name, tube_size, diameter_mm, height_mm,
              raw_sheet_code, print_surface, varnish, lacquer, inside_coating,
              colors, special_parameter_source, source, record_kind,
              is_active, catalog_verified, version, created_by, updated_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'localstorage_migration', 'client_migrated',
              TRUE, TRUE, 1, $14, $14
            ) ON CONFLICT (stock_code) DO NOTHING`,
            [
              'TECH-' + code,
              code,
              item.stock_name || item.stockName || 'Taşınan Ürün',
              tubeSize,
              diameter,
              height,
              rawSheet,
              item.print_surface || item.printSurface || 'EMAYE',
              item.varnish || 'BELİRTİLMEMİŞ',
              item.lacquer || 'BELİRTİLMEMİŞ',
              item.inside_coating || item.insideCoating || 'STANDART',
              colors,
              item.special_parameter_source || item.specialParameter || null,
              req.user.username
            ]
          );
          inserted++;
        }

        await client.query(
          `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details)
           VALUES ($1, $2, 'localstorage_migration', 'BATCH', 'migrate', $3)`,
          [req.user.username, req.user.role, `Tarayıcı localStorage verilerinden ${inserted} adet teknik kart PostgreSQL'e aktarıldı.`]
        );

        return { success: true, migratedCount: inserted };
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'MIGRATION_ERROR', message: err.message } }));
    }
  }

  return false;
}

async function handleAuditRoutes(req, res, pathname, queryParams) {
  if (req.method === 'GET' && pathname === '/api/audit-logs') {
    let limit = parseInt(queryParams.limit || '50', 10);
    if (limit > 200) limit = 200;

    try {
      const result = await query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        count: result.rows.length,
        data: result.rows
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }));
    }
  }

  return false;
}

module.exports = { handleMigrationRoutes, handleAuditRoutes };
