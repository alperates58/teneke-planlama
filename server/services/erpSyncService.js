const { executeSqlReadOnly } = require('./plan-sync-service');
const { query, getClient } = require('../db');
const config = require('../config');

/**
 * 1. SQL Server Bağlantı Testi
 */
async function testConnection() {
  const startTime = Date.now();
  try {
    const res = await executeSqlReadOnly('SELECT @@SERVERNAME as server_name, DB_NAME() as db_name, GETDATE() as server_time', 'AA_LIDER');
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      connected: true,
      latencyMs,
      serverName: res[0]?.server_name,
      database: res[0]?.db_name,
      serverTime: res[0]?.server_time,
      host: config.ERP_SQL.host,
      port: config.ERP_SQL.port
    };
  } catch (err) {
    return {
      success: false,
      connected: false,
      error: err.message,
      host: config.ERP_SQL.host,
      port: config.ERP_SQL.port
    };
  }
}

/**
 * 2. Sözleşme View'larının Durum Kontrolü
 */
async function checkViewsStatus() {
  const viewNames = [
    'AA_tp_vw_StokKartlari',
    'AA_tp_vw_TupBrutIhtiyac',
    'AA_tp_vw_ReceteBaglantilari',
    'AA_tp_vw_StokDepo',
    'AA_tp_vw_PlanliTupArz'
  ];

  const results = [];
  for (const name of viewNames) {
    try {
      const countRes = await executeSqlReadOnly(`SELECT COUNT(*) as cnt FROM [AA_LIDER].[dbo].[${name}]`, 'AA_LIDER');
      results.push({
        viewName: name,
        exists: true,
        rowCount: countRes[0]?.cnt || 0,
        status: 'READY'
      });
    } catch (err) {
      results.push({
        viewName: name,
        exists: false,
        rowCount: 0,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  return results;
}

/**
 * 3. Canlı ERP Önizleme (Preview) - DB'ye yazmaz
 */
async function fetchPreview() {
  // A) Brüt Talep Özeti
  const demandSummaryRes = await executeSqlReadOnly(`
    SELECT 
      COUNT(*) as total_demand_lines,
      COUNT(DISTINCT siparis_no) as distinct_orders,
      COUNT(DISTINCT tup_stok_kodu) as distinct_tube_codes,
      SUM(brut_tup_ihtiyac) as total_gross_tubes,
      MIN(ihtiyac_tarihi) as min_date,
      MAX(ihtiyac_tarihi) as max_date
    FROM [AA_LIDER].[dbo].[AA_tp_vw_TupBrutIhtiyac]
  `, 'AA_LIDER');

  // Örnek 5 talep satırı
  const sampleDemands = await executeSqlReadOnly(`
    SELECT TOP 5
      is_no, siparis_no, dolum_mamul_kodu, dolum_mamul_adi,
      dolum_plan_miktar, ihtiyac_tarihi, bitis_tarihi,
      dolum_makine, dolum_sira, tup_stok_kodu, tup_stok_adi,
      brut_tup_ihtiyac
    FROM [AA_LIDER].[dbo].[AA_tp_vw_TupBrutIhtiyac]
    ORDER BY ihtiyac_tarihi ASC
  `, 'AA_LIDER');

  // B) Stok Kartları Özeti
  const catalogSummary = await executeSqlReadOnly(`
    SELECT kategori_kodu, COUNT(*) as item_count
    FROM [AA_LIDER].[dbo].[AA_tp_vw_StokKartlari]
    GROUP BY kategori_kodu
    ORDER BY item_count DESC
  `, 'AA_LIDER');

  // C) Stok Seviyeleri Özeti
  const stockSummary = await executeSqlReadOnly(`
    SELECT 
      kategori_kodu,
      COUNT(*) as total_items,
      SUM(CASE WHEN net_kullanilabilir_stok > 0 THEN 1 ELSE 0 END) as items_with_stock,
      SUM(net_kullanilabilir_stok) as total_usable_stock,
      SUM(haric_bloke_stok) as total_quarantine_stock
    FROM [AA_LIDER].[dbo].[AA_tp_vw_StokDepo]
    GROUP BY kategori_kodu
  `, 'AA_LIDER');

  // D) Planlı Tüp Arzı (alper_tenekeuretim) Özeti
  const planSummary = await executeSqlReadOnly(`
    SELECT 
      COUNT(*) as total_plan_rows,
      COUNT(DISTINCT stok_kodu) as distinct_plan_tubes,
      SUM(planlanan_adet) as total_planned_tubes,
      MIN(baslangic_tarihi) as min_plan_date,
      MAX(bitis_tarihi) as max_plan_date
    FROM [AA_LIDER].[dbo].[AA_tp_vw_PlanliTupArz]
  `, 'AA_LIDER');

  return {
    demands: {
      summary: demandSummaryRes[0] || {},
      sample: sampleDemands || []
    },
    catalog: catalogSummary || [],
    stock: stockSummary || [],
    productionPlan: planSummary[0] || {}
  };
}

/**
 * 4. Idempotent ERP Senkronizasyonu (Staging & Catalog)
 * - app_users rol kontrolünden geçen kullanıcı çalıştırır
 * - product_technicals tablosundaki yerel teknik alanları (renk, zemin, lak, ham levha) ASLA ezmez
 * - Aynı satırlar tekrar eklendiğinde patlamaz (ON CONFLICT DO UPDATE)
 */
async function runSync({ user, syncType = 'full' }) {
  const client = await getClient();
  const startTime = Date.now();

  // 1. Senkronizasyon koşusunu başlat
  const runRes = await client.query(
    `INSERT INTO erp_sync_runs (sync_type, status, triggered_by, started_at)
     VALUES ($1, 'running', $2, CURRENT_TIMESTAMP)
     RETURNING id, run_id`,
    [syncType, user?.username || 'system']
  );
  const syncRunId = runRes.rows[0].id;
  const syncRunUuid = runRes.rows[0].run_id;

  let catalogCount = 0;
  let stockCount = 0;
  let demandsCount = 0;
  let recipesCount = 0;

  try {
    // A) Stok Kartları Senkronizasyonu (erp_stock_catalog)
    console.log(`[ERP Sync #${syncRunId}] Stok kartları çekiliyor...`);
    const erpCatalog = await executeSqlReadOnly(`
      SELECT 
        stok_kodu, stok_adi, kategori_kodu, temel_birim, pasif_mi
      FROM [AA_LIDER].[dbo].[AA_tp_vw_StokKartlari]
    `, 'AA_LIDER');

    await client.query('BEGIN');

    for (const item of erpCatalog) {
      await client.query(`
        INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, source_system, status, synced_at)
        VALUES ($1, $2, $3, $4, 'MikroDesktop_LIDER26', $5, CURRENT_TIMESTAMP)
        ON CONFLICT (stock_code) DO UPDATE SET
          stock_name = EXCLUDED.stock_name,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          status = EXCLUDED.status,
          synced_at = CURRENT_TIMESTAMP
      `, [
        item.stok_kodu,
        item.stok_adi,
        item.kategori_kodu,
        item.temel_birim || 'ADET',
        item.pasif_mi ? 'passive' : 'active'
      ]);
      catalogCount++;
    }

    // B) Ambar Stok Seviyeleri (erp_stock_levels)
    console.log(`[ERP Sync #${syncRunId}] Stok seviyeleri çekiliyor...`);
    const erpStocks = await executeSqlReadOnly(`
      SELECT 
        stok_kodu, stok_adi, kategori_kodu, temel_birim,
        toplam_fiziksel_stok, haric_bloke_stok, net_kullanilabilir_stok
      FROM [AA_LIDER].[dbo].[AA_tp_vw_StokDepo]
    `, 'AA_LIDER');

    for (const stk of erpStocks) {
      await client.query(`
        INSERT INTO erp_stock_levels (
          stock_code, stock_name, category_code, unit,
          physical_stock, excluded_quarantine_stock, usable_stock,
          source_sync_id, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (stock_code) DO UPDATE SET
          stock_name = EXCLUDED.stock_name,
          category_code = EXCLUDED.category_code,
          unit = EXCLUDED.unit,
          physical_stock = EXCLUDED.physical_stock,
          excluded_quarantine_stock = EXCLUDED.excluded_quarantine_stock,
          usable_stock = EXCLUDED.usable_stock,
          source_sync_id = EXCLUDED.source_sync_id,
          synced_at = CURRENT_TIMESTAMP
      `, [
        stk.stok_kodu,
        stk.stok_adi,
        stk.kategori_kodu,
        stk.temel_birim || 'ADET',
        stk.toplam_fiziksel_stok || 0,
        stk.haric_bloke_stok || 0,
        stk.net_kullanilabilir_stok || 0,
        syncRunId
      ]);
      stockCount++;
    }

    // C) Brüt Tüp İhtiyaçları (erp_gross_demands)
    console.log(`[ERP Sync #${syncRunId}] Brüt tüp talepleri çekiliyor...`);
    const erpDemands = await executeSqlReadOnly(`
      SELECT 
        is_no, siparis_no, dolum_mamul_kodu, dolum_mamul_adi,
        dolum_plan_miktar, ihtiyac_tarihi, bitis_tarihi,
        dolum_makine, dolum_sira, dolum_seri,
        tup_stok_kodu, tup_stok_adi, tup_kategori,
        recete_upl_miktar, recete_upl_uret_miktar,
        brut_tup_ihtiyac, upl_guid
      FROM [AA_LIDER].[dbo].[AA_tp_vw_TupBrutIhtiyac]
    `, 'AA_LIDER');

    for (const d of erpDemands) {
      await client.query(`
        INSERT INTO erp_gross_demands (
          is_no, siparis_no, dolum_mamul_kodu, dolum_mamul_adi,
          dolum_plan_miktar, ihtiyac_tarihi, bitis_tarihi,
          dolum_makine, dolum_sira, dolum_seri,
          tup_stok_kodu, tup_stok_adi, tup_kategori,
          recete_upl_miktar, recete_upl_uret_miktar,
          brut_tup_ihtiyac, upl_guid, source_sync_id, synced_at, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, TRUE
        )
        ON CONFLICT (is_no, tup_stok_kodu) DO UPDATE SET
          siparis_no = EXCLUDED.siparis_no,
          dolum_mamul_kodu = EXCLUDED.dolum_mamul_kodu,
          dolum_mamul_adi = EXCLUDED.dolum_mamul_adi,
          dolum_plan_miktar = EXCLUDED.dolum_plan_miktar,
          ihtiyac_tarihi = EXCLUDED.ihtiyac_tarihi,
          bitis_tarihi = EXCLUDED.bitis_tarihi,
          dolum_makine = EXCLUDED.dolum_makine,
          dolum_sira = EXCLUDED.dolum_sira,
          dolum_seri = EXCLUDED.dolum_seri,
          tup_stok_adi = EXCLUDED.tup_stok_adi,
          recete_upl_miktar = EXCLUDED.recete_upl_miktar,
          recete_upl_uret_miktar = EXCLUDED.recete_upl_uret_miktar,
          brut_tup_ihtiyac = EXCLUDED.brut_tup_ihtiyac,
          source_sync_id = EXCLUDED.source_sync_id,
          synced_at = CURRENT_TIMESTAMP,
          is_active = TRUE
      `, [
        d.is_no,
        d.siparis_no,
        d.dolum_mamul_kodu,
        d.dolum_mamul_adi,
        d.dolum_plan_miktar,
        d.ihtiyac_tarihi,
        d.bitis_tarihi,
        d.dolum_makine,
        d.dolum_sira,
        d.dolum_seri,
        d.tup_stok_kodu,
        d.tup_stok_adi,
        d.tup_kategori || 'TENEKETUP',
        d.recete_upl_miktar,
        d.recete_upl_uret_miktar,
        d.brut_tup_ihtiyac,
        d.upl_guid ? String(d.upl_guid) : null,
        syncRunId
      ]);
      demandsCount++;
    }

    // D) Reçete Bağlantıları (erp_recipe_links)
    console.log(`[ERP Sync #${syncRunId}] Reçete bağlantıları çekiliyor...`);
    const erpRecipes = await executeSqlReadOnly(`
      SELECT 
        recete_guid, ana_stok_kodu, ana_stok_adi, ana_kategori,
        tuketim_stok_kodu, tuketim_stok_adi, tuketim_kategori,
        ana_miktar, tuketim_miktar, birim_tuketim_orani,
        tuketim_birim_no
      FROM [AA_LIDER].[dbo].[AA_tp_vw_ReceteBaglantilari]
    `, 'AA_LIDER');

    for (const r of erpRecipes) {
      await client.query(`
        INSERT INTO erp_recipe_links (
          recete_guid, parent_stock_code, parent_stock_name, parent_category,
          child_stock_code, child_stock_name, child_category,
          parent_quantity, child_quantity, consumption_ratio,
          unit_no, source_sync_id, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (parent_stock_code, child_stock_code) DO UPDATE SET
          recete_guid = EXCLUDED.recete_guid,
          parent_stock_name = EXCLUDED.parent_stock_name,
          parent_category = EXCLUDED.parent_category,
          child_stock_name = EXCLUDED.child_stock_name,
          child_category = EXCLUDED.child_category,
          parent_quantity = EXCLUDED.parent_quantity,
          child_quantity = EXCLUDED.child_quantity,
          consumption_ratio = EXCLUDED.consumption_ratio,
          unit_no = EXCLUDED.unit_no,
          source_sync_id = EXCLUDED.source_sync_id,
          synced_at = CURRENT_TIMESTAMP
      `, [
        r.recete_guid ? String(r.recete_guid) : null,
        r.ana_stok_kodu,
        r.ana_stok_adi,
        r.ana_kategori,
        r.tuketim_stok_kodu,
        r.tuketim_stok_adi,
        r.tuketim_kategori,
        r.ana_miktar,
        r.tuketim_miktar,
        r.birim_tuketim_orani,
        r.tuketim_birim_no,
        syncRunId
      ]);
      recipesCount++;
    }

    // Başarıyla tamamlandı
    await client.query(`
      UPDATE erp_sync_runs SET
        status = 'success',
        finished_at = CURRENT_TIMESTAMP,
        catalog_count = $1,
        stock_count = $2,
        demands_count = $3,
        recipes_count = $4
      WHERE id = $5
    `, [catalogCount, stockCount, demandsCount, recipesCount, syncRunId]);

    // Denetim izi
    await client.query(`
      INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details)
      VALUES ($1, $2, 'erp_sync', $3, 'sync_completed', $4)
    `, [
      user?.username || 'system',
      user?.role || 'admin',
      String(syncRunId),
      JSON.stringify({
        durationMs: Date.now() - startTime,
        catalogCount,
        stockCount,
        demandsCount,
        recipesCount
      })
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      syncRunId,
      syncRunUuid,
      durationMs: Date.now() - startTime,
      counts: {
        catalog: catalogCount,
        stock: stockCount,
        demands: demandsCount,
        recipes: recipesCount
      }
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.query(`
      UPDATE erp_sync_runs SET
        status = 'failed',
        finished_at = CURRENT_TIMESTAMP,
        error_message = $1
      WHERE id = $2
    `, [err.message, syncRunId]).catch(() => {});

    console.error(`[ERP Sync #${syncRunId}] HATA:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 5. Senkron Geçmişini Getir
 */
async function getSyncHistory() {
  const res = await query(`
    SELECT id, run_id, sync_type, status, started_at, finished_at,
           catalog_count, demands_count, stock_count, recipes_count,
           triggered_by, error_message
    FROM erp_sync_runs
    ORDER BY started_at DESC
    LIMIT 20
  `);
  return res.rows;
}

/**
 * 6. İhtiyaç Havuzu İçin Birleştirilmiş Canlı Talep Listesi
 * - erp_gross_demands staging tablosundan brüt talepler
 * - erp_stock_levels tablosundan pozitif eldeki net kullanılabilir stok
 * - product_technicals tablosundan yerel teknik kart özellikleri
 */
async function getLiveDemands() {
  const res = await query(`
    SELECT 
      CONCAT('ERP-', d.id) as id,
      d.id as erp_demand_id,
      d.is_no,
      d.siparis_no as reference_no,
      d.dolum_mamul_kodu,
      d.dolum_mamul_adi,
      d.dolum_plan_miktar,
      d.ihtiyac_tarihi as due_date,
      d.bitis_tarihi,
      d.dolum_makine,
      d.dolum_sira,
      d.tup_stok_kodu as stock_code,
      d.tup_stok_adi as stock_name,
      d.brut_tup_ihtiyac as gross_quantity,
      COALESCE(stk.usable_stock, 0) as available_stock,
      d.brut_tup_ihtiyac as net_quantity, -- Faz 3B'de netlenecek
      COALESCE(pt.tube_size, 'BELİRTİLMEMİŞ') as tube_size,
      COALESCE(pt.diameter_mm, 0) as diameter_mm,
      COALESCE(pt.height_mm, 0) as height_mm,
      COALESCE(pt.raw_sheet_code, '') as raw_sheet_code,
      COALESCE(rs.stock_name, '') as raw_sheet_desc,
      COALESCE(pt.print_surface, 'BELİRTİLMEMİŞ') as print_surface,
      COALESCE(pt.varnish, 'BELİRTİLMEMİŞ') as varnish,
      COALESCE(pt.lacquer, 'BELİRTİLMEMİŞ') as lacquer,
      COALESCE(pt.inside_coating, 'BELİRTİLMEMİŞ') as inside_coating,
      COALESCE(pt.colors, ARRAY[]::VARCHAR[]) as colors,
      CASE 
        WHEN pt.stock_code IS NULL THEN 'missing_technical_card'
        WHEN pt.raw_sheet_code IS NULL OR pt.raw_sheet_code = '' THEN 'missing_raw_sheet'
        ELSE 'complete'
      END as definition_status,
      'RPT' as order_type,
      'live_erp_sync' as record_kind,
      d.synced_at
    FROM erp_gross_demands d
    LEFT JOIN erp_stock_levels stk ON d.tup_stok_kodu = stk.stock_code
    LEFT JOIN product_technicals pt ON d.tup_stok_kodu = pt.stock_code
    LEFT JOIN raw_sheets rs ON pt.raw_sheet_code = rs.stock_code
    WHERE d.is_active = TRUE
    ORDER BY d.ihtiyac_tarihi ASC, d.id ASC
  `);
  return res.rows.map(row => ({
    ...row,
    dolum_plan_miktar: parseFloat(row.dolum_plan_miktar) || 0,
    gross_quantity: parseFloat(row.gross_quantity) || 0,
    available_stock: parseFloat(row.available_stock) || 0,
    net_quantity: parseFloat(row.net_quantity) || 0,
    diameter_mm: parseFloat(row.diameter_mm) || 0,
    height_mm: parseFloat(row.height_mm) || 0
  }));
}

module.exports = {
  testConnection,
  checkViewsStatus,
  fetchPreview,
  runSync,
  getSyncHistory,
  getLiveDemands
};
