const { query, getClient } = require('../db');
const { getActiveDraft } = require('./plan-sync-service');

const RECIPE_RULES = {
  cuttingPrefix: 'K-',
  printPrefix: 'B-',
  excludedCategories: ['BAKIR', 'DIP', 'BOMBE', 'LAK', 'HURDA']
};

/**
 * 1. Baskılı İhtiyaç Havuzunu Aktif Tüp Planından Senkronize Et
 *
 * İş Kuralı:
 * - Esas kaynak seçili aktif tüp planı (production_plan_draft_items).
 * - Plan satırı miktarı zaten tüp stoğundan sonra üretilecek net tüp miktarıdır.
 * - Tüp stoğu tekrar düşülmez!
 * - Üretilecek miktarın reçetesinden K- kesik, onun reçetesinden B- baskılı bulunur.
 * - Ortak stok tablosundan (erp_stock_levels) kesik ve baskılı ambar stokları tahsis edilir.
 * - Malzeme ihtiyaç tarihi tüpün üretim başlangıç anına (suggested_start_date / source_start_date) bağlanır.
 * - Hazırlık/tedarik süresi tam olarak bilinmiyorsa uyarı bayrağı eklenir.
 * - Var olan taslak rezervasyonları ve onaylı karşılamalar korunur.
 */
async function syncPrintedDemandsFromPlan({ draftId = null, user = null } = {}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Hedef Plan Taslağını Belirle
    let targetDraftId = draftId;
    if (!targetDraftId) {
      const draftData = await getActiveDraft();
      if (!draftData || !draftData.exists || !draftData.draft) {
        throw new Error('Aktif bir tüp üretim planı taslağı bulunamadı.');
      }
      targetDraftId = draftData.draft.id;
    }

    // 2. Aktif Plan Kalemlerini Oku
    const planItemsRes = await client.query(`
      SELECT 
        pi.id,
        pi.draft_id,
        pi.sequence_order,
        pi.stock_code,
        pi.stock_name,
        pi.quantity,
        pi.order_no,
        pi.tube_size,
        COALESCE(pi.suggested_start_date, pi.source_start_date, pi.scheduled_date) as start_date,
        COALESCE(pi.suggested_end_date, pi.source_end_date, pi.scheduled_date) as end_date,
        pi.material_status,
        pi.covered_demand_keys
      FROM production_plan_draft_items pi
      WHERE pi.draft_id = $1
      ORDER BY pi.sequence_order ASC, pi.id ASC
    `, [targetDraftId]);

    const planItems = planItemsRes.rows;
    if (planItems.length === 0) {
      await client.query('COMMIT');
      return { success: true, count: 0, message: 'Plan taslağında satır bulunamadı.' };
    }

    // 3. Reçete Zincirlerini Oku
    const recipesRes = await client.query(`
      SELECT 
        recete_guid,
        parent_stock_code,
        parent_stock_name,
        child_stock_code,
        child_stock_name,
        child_category,
        consumption_ratio,
        unit_no
      FROM erp_recipe_links
      ORDER BY id ASC
    `);

    const tubeToCuttingMap = new Map();
    const cuttingToPrintMap = new Map();
    const printToSheetMap = new Map();

    for (const r of recipesRes.rows) {
      const parentName = (r.parent_stock_name || '').trim();
      const childName = (r.child_stock_name || '').trim();
      const childCat = (r.child_category || '').toUpperCase().trim();
      const ratio = parseFloat(r.consumption_ratio) || 1.0;

      // Dışlanan yardımcı malzemeleri atla
      if (RECIPE_RULES.excludedCategories.includes(childCat)) continue;
      const isAuxName = RECIPE_RULES.excludedCategories.some(cat => childName.toUpperCase().includes(cat));
      if (isAuxName) continue;

      const item = {
        receteGuid: r.recete_guid,
        parentCode: r.parent_stock_code,
        parentName: r.parent_stock_name,
        childCode: r.child_stock_code,
        childName: r.child_stock_name,
        childCategory: r.child_category,
        ratio,
        unitNo: r.unit_no
      };

      const isCuttingCat = childCat === 'KESIKLEVHA';
      const isCuttingName = childName.toUpperCase().startsWith(RECIPE_RULES.cuttingPrefix);
      if (isCuttingCat || isCuttingName) {
        if (!tubeToCuttingMap.has(r.parent_stock_code)) tubeToCuttingMap.set(r.parent_stock_code, []);
        tubeToCuttingMap.get(r.parent_stock_code).push(item);
      } else if (childCat === 'BASKILILEVHA' || childName.toUpperCase().startsWith(RECIPE_RULES.printPrefix)) {
        if (!cuttingToPrintMap.has(r.parent_stock_code)) cuttingToPrintMap.set(r.parent_stock_code, []);
        cuttingToPrintMap.get(r.parent_stock_code).push(item);
      } else if (childCat === 'HAMLEVHA') {
        if (!printToSheetMap.has(r.parent_stock_code)) printToSheetMap.set(r.parent_stock_code, []);
        printToSheetMap.get(r.parent_stock_code).push(item);
      }
    }

    // 4. Güncel Ambar Stoklarını Oku (Fiziksel Stok Havuzu)
    const stockRes = await client.query(`
      SELECT stock_code, physical_stock, unit 
      FROM erp_stock_levels
    `);
    const stockPool = new Map();
    const stockUnitMap = new Map();
    for (const s of stockRes.rows) {
      stockPool.set(s.stock_code, Math.max(0, parseFloat(s.physical_stock) || 0));
      stockUnitMap.set(s.stock_code, s.unit || 'ADET');
    }

    // 5. Kapasite Tablosunu Oku
    const capRes = await client.query('SELECT tube_size, units_per_sheet, repeat_step, assembly_group_count FROM tube_capacities');
    const capMap = new Map();
    for (const c of capRes.rows) {
      capMap.set(c.tube_size, {
        unitsPerSheet: c.units_per_sheet,
        repeatStep: c.repeat_step,
        groupCount: c.assembly_group_count
      });
    }

    // 6. Teknik Kart Özelliklerini Oku
    const techRes = await client.query(`
      SELECT 
        stock_code, 
        tube_size, 
        print_surface, 
        lacquer, 
        varnish, 
        inside_coating, 
        colors, 
        raw_sheet_code
      FROM product_technicals
    `);
    const techMap = new Map();
    for (const t of techRes.rows) {
      techMap.set(t.stock_code, t);
    }

    // 7. Mevcut Rezervasyon ve Karşılamaları Oku (Silinmemesi gereken durumlar)
    const existingDemandRes = await client.query(`
      SELECT 
        id, 
        plan_item_id, 
        allocated_to_draft, 
        covered_by_confirmed,
        version
      FROM printed_sheet_demands
      WHERE plan_draft_id = $1
    `, [targetDraftId]);
    const existingMap = new Map();
    for (const row of existingDemandRes.rows) {
      existingMap.set(String(row.plan_item_id), row);
    }

    // 8. Plan Satırları Üzerinde Kademeli Tahsis ve Havuz Üretimi
    let syncCount = 0;

    for (const item of planItems) {
      const planItemId = item.id;
      const tubeCode = item.stock_code;
      const tubeName = item.stock_name;
      const tubeQty = Math.max(0, parseFloat(item.quantity) || 0);
      const tubeSize = item.tube_size || '52x195';
      const orderNo = item.order_no || '';
      const startDate = item.start_date ? new Date(item.start_date) : null;

      // Reçete Çözümleme
      const cuttingCandidates = tubeToCuttingMap.get(tubeCode) || [];
      const cuttingCandidate = cuttingCandidates.length === 1 ? cuttingCandidates[0] : null;
      const cuttingCode = cuttingCandidate ? cuttingCandidate.childCode : null;
      const cuttingName = cuttingCandidate ? cuttingCandidate.childName : null;
      const ratioTubeToCutting = cuttingCandidate ? cuttingCandidate.ratio : 1.0;

      let printCandidate = null;
      if (cuttingCode) {
        const printCandidates = cuttingToPrintMap.get(cuttingCode) || [];
        if (printCandidates.length === 1) printCandidate = printCandidates[0];
      }
      const printCode = printCandidate ? printCandidate.childCode : (cuttingCode || tubeCode);
      const printName = printCandidate ? printCandidate.childName : (cuttingName || tubeName);
      const ratioCuttingToPrint = printCandidate ? printCandidate.ratio : 1.0;

      // Ham Levha Parametresi
      let rawSheetCode = null;
      if (printCode) {
        const rawCandidates = printToSheetMap.get(printCode) || [];
        if (rawCandidates.length === 1) rawSheetCode = rawCandidates[0].childCode;
      }
      const tech = techMap.get(tubeCode) || {};
      if (!rawSheetCode && tech.raw_sheet_code) {
        rawSheetCode = tech.raw_sheet_code;
      }

      const capInfo = capMap.get(tubeSize) || capMap.get(tech.tube_size) || null;
      const rawSheetCapacity = capInfo ? capInfo.unitsPerSheet : null;

      // Stok Tahsisi:
      // Kesik Stok Tahsisi (Tüp miktarı üzerinden)
      let allocatedCuttingEquiv = 0;
      let netCuttingNeeded = tubeQty;

      if (cuttingCode && stockPool.has(cuttingCode) && ratioTubeToCutting > 0) {
        const currentCutStock = stockPool.get(cuttingCode);
        const neededCutPhys = tubeQty / ratioTubeToCutting;
        const takeCutPhys = Math.min(currentCutStock, neededCutPhys);
        const takeCutEquiv = Math.round(takeCutPhys * ratioTubeToCutting * 100) / 100;

        allocatedCuttingEquiv = takeCutEquiv;
        netCuttingNeeded = Math.max(0, Math.round((tubeQty - takeCutEquiv) * 100) / 100);
        stockPool.set(cuttingCode, currentCutStock - takeCutPhys);
      }

      // Baskılı Stok Tahsisi (Kalan kesim gereksinimi üzerinden)
      let allocatedPrintEquiv = 0;
      let netPrintNeeded = netCuttingNeeded;
      let netPrintPhys = netCuttingNeeded;

      if (printCode && stockPool.has(printCode) && ratioCuttingToPrint > 0) {
        const currentPrintStock = stockPool.get(printCode);
        const neededPrintPhys = netCuttingNeeded / ratioCuttingToPrint;
        const takePrintPhys = Math.min(currentPrintStock, neededPrintPhys);
        const takePrintEquiv = Math.round(takePrintPhys * ratioCuttingToPrint * 100) / 100;

        allocatedPrintEquiv = takePrintEquiv;
        netPrintNeeded = Math.max(0, Math.round((netCuttingNeeded - takePrintEquiv) * 100) / 100);
        netPrintPhys = Math.round((netPrintNeeded / ratioCuttingToPrint) * 100) / 100;
        stockPool.set(printCode, currentPrintStock - takePrintPhys);
      }

      // Rezervasyon ve Karşılama Durumu
      const existing = existingMap.get(String(planItemId));
      const allocatedToDraft = existing ? parseFloat(existing.allocated_to_draft) || 0 : 0;
      const coveredByConfirmed = existing ? parseFloat(existing.covered_by_confirmed) || 0 : 0;
      const currentVersion = existing ? existing.version + 1 : 1;

      // Kalan Açık İhtiyaç Hesabı
      const remainingOpen = Math.max(0, Math.round((netPrintNeeded - allocatedToDraft - coveredByConfirmed) * 100) / 100);

      // Durum Tespiti
      let status = 'WAITING';
      let reviewReason = null;

      if (netPrintNeeded < coveredByConfirmed) {
        status = 'NEEDS_REVIEW';
        reviewReason = `Planlanan tüp ihtiyacı (${tubeQty} adet, net baskı: ${netPrintNeeded}), onaylı kombinasyon (${coveredByConfirmed} adet) miktarının altına düşmüştür. Fazla üretim mevcuttur.`;
      } else if (remainingOpen === 0 && coveredByConfirmed > 0) {
        status = 'COMPLETED';
      } else if (remainingOpen === 0 && allocatedToDraft > 0) {
        status = 'RESERVED';
      } else if ((allocatedToDraft + coveredByConfirmed) > 0 && remainingOpen > 0) {
        status = 'PARTIAL';
      } else {
        status = 'WAITING';
      }

      const demandId = `PSD-PLAN-${planItemId}`;
      const demandKey = `PLAN-${targetDraftId}-${planItemId}`;

      // Upsert into printed_sheet_demands
      await client.query(`
        INSERT INTO printed_sheet_demands (
          id, source_type, plan_draft_id, plan_item_id, demand_key, order_no,
          tube_stock_code, tube_stock_name, tube_size,
          cutting_stock_code, cutting_stock_name, cutting_stock_unit,
          print_stock_code, print_stock_name, print_stock_unit,
          raw_sheet_code, raw_sheet_name, raw_sheet_capacity,
          material_due_date, sales_due_date, is_lead_time_estimated, lead_time_warning,
          planned_tube_quantity, allocated_cutting_stock, allocated_print_stock,
          net_print_demand, net_print_physical,
          allocated_to_draft, covered_by_confirmed, remaining_open_quantity,
          status, review_reason, definition_status,
          colors, print_surface, lacquer, varnish, inside_coating,
          version, updated_at
        ) VALUES (
          $1, 'ACTIVE_PLAN', $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24,
          $25, $26,
          $27, $28, $29,
          $30, $31, $32,
          $33, $34, $35, $36, $37,
          $38, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          planned_tube_quantity = EXCLUDED.planned_tube_quantity,
          allocated_cutting_stock = EXCLUDED.allocated_cutting_stock,
          allocated_print_stock = EXCLUDED.allocated_print_stock,
          net_print_demand = EXCLUDED.net_print_demand,
          net_print_physical = EXCLUDED.net_print_physical,
          remaining_open_quantity = GREATEST(0, EXCLUDED.net_print_demand - printed_sheet_demands.allocated_to_draft - printed_sheet_demands.covered_by_confirmed),
          status = CASE 
            WHEN EXCLUDED.net_print_demand < printed_sheet_demands.covered_by_confirmed THEN 'NEEDS_REVIEW'
            WHEN GREATEST(0, EXCLUDED.net_print_demand - printed_sheet_demands.allocated_to_draft - printed_sheet_demands.covered_by_confirmed) = 0 AND printed_sheet_demands.covered_by_confirmed > 0 THEN 'COMPLETED'
            WHEN GREATEST(0, EXCLUDED.net_print_demand - printed_sheet_demands.allocated_to_draft - printed_sheet_demands.covered_by_confirmed) = 0 AND printed_sheet_demands.allocated_to_draft > 0 THEN 'RESERVED'
            WHEN (printed_sheet_demands.allocated_to_draft + printed_sheet_demands.covered_by_confirmed) > 0 THEN 'PARTIAL'
            ELSE 'WAITING'
          END,
          review_reason = CASE 
            WHEN EXCLUDED.net_print_demand < printed_sheet_demands.covered_by_confirmed 
            THEN CONCAT('Planlanan tüp ihtiyacı onaylı kombinasyon miktarının altına düşmüştür. (Net:', EXCLUDED.net_print_demand, ' < Onaylı:', printed_sheet_demands.covered_by_confirmed, ')')
            ELSE NULL
          END,
          material_due_date = EXCLUDED.material_due_date,
          version = printed_sheet_demands.version + 1,
          updated_at = CURRENT_TIMESTAMP
      `, [
        demandId, targetDraftId, planItemId, demandKey, orderNo,
        tubeCode, tubeName, tubeSize,
        cuttingCode, cuttingName, stockUnitMap.get(cuttingCode) || 'ADET',
        printCode, printName, stockUnitMap.get(printCode) || 'ADET',
        rawSheetCode, rawSheetCode, rawSheetCapacity,
        startDate, null, true, 'Matbaa termin ve tedarik süresi tanımsız; malzeme ihtiyaç tarihi tüp üretim başlangıç anı olarak kilitlenmiştir.',
        tubeQty, allocatedCuttingEquiv, allocatedPrintEquiv,
        netPrintNeeded, netPrintPhys,
        allocatedToDraft, coveredByConfirmed, remainingOpen,
        status, reviewReason, tech.stock_code ? 'complete' : 'missing_technical_card',
        JSON.stringify(tech.colors || []), tech.print_surface || 'BELİRTİLMEMİŞ', tech.lacquer || 'BELİRTİLMEMİŞ', tech.varnish || 'BELİRTİLMEMİŞ', tech.inside_coating || 'BELİRTİLMEMİŞ',
        currentVersion
      ]);

      syncCount++;
    }

    await client.query('COMMIT');
    return {
      success: true,
      draftId: targetDraftId,
      syncedCount: syncCount,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[printedDemandService] syncPrintedDemandsFromPlan hatası:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 2. Baskılı İhtiyaç Havuzunu Getir (Filtreleme, Gruplama ve KPI'lar)
 */
async function getPrintedDemands({
  scope = 'ACTIVE_PLAN', // 'ACTIVE_PLAN', 'UNPLANNED_DEMAND', 'ALL'
  status = 'ALL',
  tubeSize = 'ALL',
  search = '',
  grouped = false
} = {}) {
  // Eğer havuzda hiç kayıt yoksa önce aktif plandan senkronize et
  const countCheck = await query('SELECT count(*) as total FROM printed_sheet_demands');
  if (parseInt(countCheck.rows[0].total) === 0) {
    try {
      await syncPrintedDemandsFromPlan();
    } catch (err) {
      console.warn('[printedDemandService] Otomatik ilk senkron atlandı:', err.message);
    }
  }

  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (scope !== 'ALL') {
    conditions.push(`psd.source_type = $${pIdx++}`);
    params.push(scope);
  }

  if (status !== 'ALL') {
    conditions.push(`psd.status = $${pIdx++}`);
    params.push(status);
  }

  if (tubeSize !== 'ALL') {
    conditions.push(`psd.tube_size = $${pIdx++}`);
    params.push(tubeSize);
  }

  if (search && search.trim()) {
    conditions.push(`(
      psd.print_stock_code ILIKE $${pIdx} OR 
      psd.print_stock_name ILIKE $${pIdx} OR 
      psd.tube_stock_code ILIKE $${pIdx} OR 
      psd.tube_stock_name ILIKE $${pIdx} OR 
      psd.order_no ILIKE $${pIdx}
    )`);
    params.push(`%${search.trim()}%`);
    pIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Liste Sorgusu
  const listSql = `
    SELECT 
      psd.*,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'combination_id', sc.id,
            'combination_no', sc.combination_no,
            'status', sc.status,
            'reserved_quantity', pdr.reserved_quantity,
            'reservation_type', pdr.reservation_type
          ))
          FROM print_demand_reservations pdr
          JOIN sheet_combinations sc ON pdr.combination_id = sc.id
          WHERE pdr.print_demand_id = psd.id
        ), '[]'::jsonb
      ) as combinations
    FROM printed_sheet_demands psd
    ${whereClause}
    ORDER BY psd.material_due_date ASC NULLS LAST, psd.id ASC
  `;

  const listRes = await query(listSql, params);
  const rows = listRes.rows;

  // 2. KPI / Sayaçlar (Mükerrersiz stok ve toplamlar)
  const kpiSql = `
    SELECT 
      COALESCE(SUM(planned_tube_quantity), 0) as total_planned_tubes,
      COALESCE(SUM(allocated_cutting_stock), 0) as total_cutting_allocated,
      COALESCE(SUM(allocated_print_stock), 0) as total_print_allocated,
      COALESCE(SUM(net_print_demand), 0) as total_net_print_demand,
      COALESCE(SUM(allocated_to_draft), 0) as total_allocated_to_draft,
      COALESCE(SUM(covered_by_confirmed), 0) as total_covered_by_confirmed,
      COALESCE(SUM(remaining_open_quantity), 0) as total_remaining_open,
      COUNT(DISTINCT print_stock_code) as unique_print_codes,
      COUNT(*) as total_items
    FROM printed_sheet_demands psd
    ${whereClause}
  `;
  const kpiRes = await query(kpiSql, params);
  const kpis = kpiRes.rows[0];

  // 3. Gruplu Görünüm (print_stock_code + tube_stock_code bazında)
  let groupedData = null;
  if (grouped) {
    const groupMap = new Map();
    for (const r of rows) {
      const gKey = r.print_stock_code;
      if (!groupMap.has(gKey)) {
        groupMap.set(gKey, {
          print_stock_code: r.print_stock_code,
          print_stock_name: r.print_stock_name,
          print_stock_unit: r.print_stock_unit,
          tube_stock_code: r.tube_stock_code,
          tube_stock_name: r.tube_stock_name,
          tube_size: r.tube_size,
          raw_sheet_code: r.raw_sheet_code,
          raw_sheet_capacity: r.raw_sheet_capacity,
          colors: r.colors,
          print_surface: r.print_surface,
          varnish: r.varnish,
          lacquer: r.lacquer,
          inside_coating: r.inside_coating,
          definition_status: r.definition_status,
          earliest_material_date: r.material_due_date,
          latest_material_date: r.material_due_date,
          planned_tube_quantity: 0,
          allocated_cutting_stock: 0,
          allocated_print_stock: 0,
          net_print_demand: 0,
          allocated_to_draft: 0,
          covered_by_confirmed: 0,
          remaining_open_quantity: 0,
          item_count: 0,
          combination_numbers: new Set(),
          items: []
        });
      }

      const g = groupMap.get(gKey);
      g.planned_tube_quantity += parseFloat(r.planned_tube_quantity) || 0;
      g.allocated_cutting_stock += parseFloat(r.allocated_cutting_stock) || 0;
      g.allocated_print_stock += parseFloat(r.allocated_print_stock) || 0;
      g.net_print_demand += parseFloat(r.net_print_demand) || 0;
      g.allocated_to_draft += parseFloat(r.allocated_to_draft) || 0;
      g.covered_by_confirmed += parseFloat(r.covered_by_confirmed) || 0;
      g.remaining_open_quantity += parseFloat(r.remaining_open_quantity) || 0;
      g.item_count++;

      if (r.material_due_date) {
        if (!g.earliest_material_date || new Date(r.material_due_date) < new Date(g.earliest_material_date)) {
          g.earliest_material_date = r.material_due_date;
        }
        if (!g.latest_material_date || new Date(r.material_due_date) > new Date(g.latest_material_date)) {
          g.latest_material_date = r.material_due_date;
        }
      }

      const combs = Array.isArray(r.combinations) ? r.combinations : [];
      combs.forEach(c => g.combination_numbers.add(c.combination_no));
      g.items.push(r);
    }

    groupedData = Array.from(groupMap.values()).map(g => ({
      ...g,
      combination_numbers: Array.from(g.combination_numbers),
      status: g.remaining_open_quantity === 0 && g.covered_by_confirmed > 0
        ? 'COMPLETED'
        : g.remaining_open_quantity === 0 && g.allocated_to_draft > 0
          ? 'RESERVED'
          : (g.allocated_to_draft + g.covered_by_confirmed) > 0
            ? 'PARTIAL'
            : 'WAITING'
    }));
  }

  return {
    success: true,
    count: rows.length,
    kpis: {
      total_planned_tubes: parseFloat(kpis.total_planned_tubes) || 0,
      total_cutting_allocated: parseFloat(kpis.total_cutting_allocated) || 0,
      total_print_allocated: parseFloat(kpis.total_print_allocated) || 0,
      total_net_print_demand: parseFloat(kpis.total_net_print_demand) || 0,
      total_allocated_to_draft: parseFloat(kpis.total_allocated_to_draft) || 0,
      total_covered_by_confirmed: parseFloat(kpis.total_covered_by_confirmed) || 0,
      total_remaining_open: parseFloat(kpis.total_remaining_open) || 0,
      unique_print_codes: parseInt(kpis.unique_print_codes) || 0,
      total_items: parseInt(kpis.total_items) || 0
    },
    data: rows,
    groupedData
  };
}

module.exports = {
  syncPrintedDemandsFromPlan,
  getPrintedDemands,
  RECIPE_RULES
};
