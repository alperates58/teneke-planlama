const { query, getClient } = require('../db');

/**
 * FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE ÇOK SEVİYELİ STOK TAHSİS SERVİSİ
 * 
 * Reçete Zinciri:
 *   1) TÜP: Brüt İhtiyaç -> Tüp Kullanılabilir Stok Tahsisi -> Net Tüp Üretim İhtiyacı
 *   2) KESİK LEVHA: Net Tüp Üretimi -> Reçete Oranı -> Kesik Stok Tahsisi -> Net Kesim İhtiyacı
 *   3) BASKILI LEVHA: Net Kesim -> Reçete Oranı -> Baskılı Stok Tahsisi -> Net Yeni Baskı İhtiyacı
 *   4) HAM LEVHA: Net Baskı -> Reçete Oranı -> Tahmini Ham Levha İhtiyacı (Satın Alma)
 *   5) PLANLI ARZ: Mevcut tüp üretim planı ([alper_tenekeuretim]) ile karşılaştırma & termin açığı
 */

/**
 * 1. Kademeli Hesaplamayı Çalıştır
 */
async function runAllocationCalculation({ user, syncRunId = null }) {
  const client = await getClient();
  const startTime = Date.now();

  try {
    // 1. Hedef senkron koşusu (belirtilmemişse son başarılı koşu)
    let targetSyncId = syncRunId;
    if (!targetSyncId) {
      const lastSyncRes = await client.query(`
        SELECT id FROM erp_sync_runs 
        WHERE status = 'success' 
        ORDER BY id DESC LIMIT 1
      `);
      if (lastSyncRes.rows.length === 0) {
        throw new Error('Hesaplama için geçerli bir ERP senkronizasyon kaydı bulunamadı. Önce ERP senkronizasyonu çalıştırılmalıdır.');
      }
      targetSyncId = lastSyncRes.rows[0].id;
    }

    // 2. Yeni calculation_run başlat
    const runRes = await client.query(`
      INSERT INTO calculation_runs (sync_run_id, status, triggered_by, started_at)
      VALUES ($1, 'running', $2, CURRENT_TIMESTAMP)
      RETURNING id, run_id
    `, [targetSyncId, user?.username || 'system']);
    const calcRunId = runRes.rows[0].id;
    const calcRunUuid = runRes.rows[0].run_id;

    // 3. Aktif brüt talepleri çek (Kararlı Sıralama: Termin Tarihi -> Dolum Sırası -> İş No -> Demand Key)
    const demandsRes = await client.query(`
      SELECT 
        d.id as demand_id,
        d.demand_key,
        d.is_no,
        d.siparis_no,
        d.dolum_mamul_kodu,
        d.dolum_mamul_adi,
        d.dolum_plan_miktar,
        d.dolum_kalan_miktar,
        d.ihtiyac_tarihi,
        d.bitis_tarihi,
        d.dolum_makine,
        d.dolum_sira,
        d.tup_stok_kodu,
        d.tup_stok_adi,
        d.brut_tup_ihtiyac,
        d.has_data_error,
        d.data_error_message,
        d.upl_guid
      FROM erp_gross_demands d
      WHERE d.is_active = TRUE
      ORDER BY 
        d.ihtiyac_tarihi ASC NULLS LAST,
        COALESCE(NULLIF(regexp_replace(d.dolum_sira, '[^0-9]', '', 'g'), ''), '999999')::INTEGER ASC,
        d.is_no ASC,
        d.demand_key ASC
    `);
    const demands = demandsRes.rows;

    // 4. Stok seviyelerini in-memory havuza yükle
    const stocksRes = await client.query(`
      SELECT 
        stock_code, stock_name, category_code, unit,
        physical_stock, excluded_quarantine_stock, raw_net_stock, usable_stock,
        has_negative_warning
      FROM erp_stock_levels
    `);
    const stockPool = new Map();
    for (const s of stocksRes.rows) {
      const usable = Math.max(0, parseFloat(s.usable_stock) || 0);
      stockPool.set(s.stock_code, {
        stockCode: s.stock_code,
        stockName: s.stock_name,
        category: s.category_code,
        unit: s.unit || 'ADET',
        physicalStock: parseFloat(s.physical_stock) || 0,
        excludedStock: parseFloat(s.excluded_quarantine_stock) || 0,
        rawNetStock: parseFloat(s.raw_net_stock) || 0,
        usableStock: usable,
        remainingPool: usable, // Tahsis edildikçe azalır
        allocatedTotal: 0,
        hasNegativeWarning: Boolean(s.has_negative_warning)
      });
    }

    // Havuzda olmayan stoklar için güvenli yardımcı
    function getOrCreatePool(stockCode, defaultCategory = 'TENEKETUP') {
      if (!stockPool.has(stockCode)) {
        stockPool.set(stockCode, {
          stockCode,
          stockName: stockCode,
          category: defaultCategory,
          unit: 'ADET',
          physicalStock: 0,
          excludedStock: 0,
          rawNetStock: 0,
          usableStock: 0,
          remainingPool: 0,
          allocatedTotal: 0,
          hasNegativeWarning: false
        });
      }
      return stockPool.get(stockCode);
    }

    // 5. Reçete bağlantılarını çek ve indeksle
    const recipesRes = await client.query(`
      SELECT 
        recete_guid, parent_stock_code, parent_category,
        child_stock_code, child_category, consumption_ratio, unit_no
      FROM erp_recipe_links
      ORDER BY id ASC
    `);

    // Tüp -> Kesik Levha haritası
    const tubeToCuttingMap = new Map();
    // Kesik Levha -> Baskılı Levha haritası
    const cuttingToPrintMap = new Map();
    // Baskılı Levha -> Ham Levha haritası
    const printToSheetMap = new Map();

    for (const r of recipesRes.rows) {
      const ratio = parseFloat(r.consumption_ratio) || 0;
      const item = {
        receteGuid: r.recete_guid,
        parentCode: r.parent_stock_code,
        childCode: r.child_stock_code,
        childCategory: r.child_category,
        ratio,
        unitNo: r.unit_no
      };

      if (r.parent_category === 'TENEKETUP' && r.child_category === 'KESIKLEVHA') {
        if (!tubeToCuttingMap.has(r.parent_stock_code)) tubeToCuttingMap.set(r.parent_stock_code, []);
        tubeToCuttingMap.get(r.parent_stock_code).push(item);
      } else if (r.parent_category === 'KESIKLEVHA' && r.child_category === 'BASKILILEVHA') {
        if (!cuttingToPrintMap.has(r.parent_stock_code)) cuttingToPrintMap.set(r.parent_stock_code, []);
        cuttingToPrintMap.get(r.parent_stock_code).push(item);
      } else if (r.parent_category === 'BASKILILEVHA' && r.child_category === 'HAMLEVHA') {
        if (!printToSheetMap.has(r.parent_stock_code)) printToSheetMap.set(r.parent_stock_code, []);
        printToSheetMap.get(r.parent_stock_code).push(item);
      }
    }

    // 6. Mevcut Tüp Üretim Planını Çek (Faz 3A.1 alper_tenekeuretim snapshot / taslağı)
    const planRes = await client.query(`
      SELECT 
        pi.stock_code,
        pi.quantity,
        COALESCE(pi.end_date, pi.scheduled_date) as end_date,
        pi.sequence_order
      FROM production_plan_draft_items pi
      JOIN production_plan_drafts pd ON pi.draft_id = pd.id
      WHERE pd.status IN ('ACTIVE', 'DRAFT')
      ORDER BY pi.sequence_order ASC
    `);

    // Planlı arz havuzu: stock_code -> array of orders
    const plannedSupplyMap = new Map();
    for (const row of planRes.rows) {
      if (!plannedSupplyMap.has(row.stock_code)) plannedSupplyMap.set(row.stock_code, []);
      plannedSupplyMap.get(row.stock_code).push({
        stockCode: row.stock_code,
        quantity: parseFloat(row.quantity) || 0,
        remainingQty: parseFloat(row.quantity) || 0,
        endDate: row.end_date ? new Date(row.end_date) : null
      });
    }

    // 7. Kademeli Tahsis Döngüsü (Her talep için sıra sıra)
    const allocations = [];
    let calculatedCount = 0;
    let unresolvedCount = 0;
    let errorCount = 0;

    let totalGrossTube = 0;
    let totalAllocatedTube = 0;
    let totalNetTube = 0;
    let totalAllocatedCutting = 0;
    let totalNetCutting = 0;
    let totalAllocatedPrint = 0;
    let totalNetPrint = 0;

    let sortOrder = 1;

    for (const d of demands) {
      const grossDemand = parseFloat(d.brut_tup_ihtiyac);
      totalGrossTube += (isNaN(grossDemand) || grossDemand < 0) ? 0 : grossDemand;

      // Hata durumu kontrolü
      if (d.has_data_error || isNaN(grossDemand) || grossDemand < 0) {
        errorCount++;
        allocations.push({
          demand_id: d.demand_id,
          demand_key: d.demand_key,
          sort_order: sortOrder++,
          tube_stock_code: d.tup_stok_kodu,
          gross_demand: isNaN(grossDemand) ? 0 : grossDemand,
          allocated_tube_stock: 0,
          net_tube_demand: isNaN(grossDemand) ? 0 : grossDemand,
          tube_stock_before: 0,
          tube_stock_after: 0,
          cutting_stock_code: null,
          ratio_tube_to_cutting: null,
          allocated_cutting_stock: 0,
          net_cutting_demand: null,
          cutting_stock_before: 0,
          cutting_stock_after: 0,
          print_stock_code: null,
          ratio_cutting_to_print: null,
          allocated_print_stock: 0,
          net_print_demand: null,
          print_stock_before: 0,
          print_stock_after: 0,
          raw_sheet_code: null,
          ratio_print_to_sheet: null,
          raw_sheet_capacity: null,
          estimated_raw_sheets: null,
          planned_cover_quantity: 0,
          additional_planning_needed: isNaN(grossDemand) ? 0 : grossDemand,
          plan_earliest_finish: null,
          is_schedule_delayed: false,
          delay_days: 0,
          calculation_status: 'ERROR',
          unresolved_reason: d.data_error_message || 'Brüt talep miktarı tanımsız veya geçersiz'
        });
        continue;
      }

      // -------------------------------------------------------------
      // SEVİYE 1: TENEKE TÜP STOK TAHSİSİ
      // -------------------------------------------------------------
      const tubePool = getOrCreatePool(d.tup_stok_kodu, 'TENEKETUP');
      const tubeBefore = tubePool.remainingPool;
      const allocatedTube = Math.min(grossDemand, tubePool.remainingPool);
      tubePool.remainingPool -= allocatedTube;
      tubePool.allocatedTotal += allocatedTube;
      const tubeAfter = tubePool.remainingPool;

      const netTubeDemand = Math.round((grossDemand - allocatedTube) * 100) / 100;
      totalAllocatedTube += allocatedTube;
      totalNetTube += netTubeDemand;

      // -------------------------------------------------------------
      // SEVİYE 2: KESİK LEVHA STOK TAHSİSİ
      // -------------------------------------------------------------
      let cuttingCode = null;
      let ratioTubeToCutting = null;
      let allocatedCutting = 0;
      let netCuttingDemand = 0;
      let cuttingBefore = 0;
      let cuttingAfter = 0;

      // -------------------------------------------------------------
      // SEVİYE 3: BASKILI LEVHA STOK TAHSİSİ
      // -------------------------------------------------------------
      let printCode = null;
      let ratioCuttingToPrint = null;
      let allocatedPrint = 0;
      let netPrintDemand = 0;
      let printBefore = 0;
      let printAfter = 0;

      // -------------------------------------------------------------
      // SEVİYE 4: HAM LEVHA İLİŞKİSİ
      // -------------------------------------------------------------
      let rawSheetCode = null;
      let ratioPrintToSheet = null;
      let rawSheetCapacity = null;
      let estimatedRawSheets = null;

      let calcStatus = 'CALCULATED';
      let unresolvedReason = null;

      if (netTubeDemand <= 0) {
        // Tüp stoğu tamamını karşıladı
        netCuttingDemand = 0;
        netPrintDemand = 0;
      } else {
        // Kesik levha reçetesini bul
        const kesikCandidates = tubeToCuttingMap.get(d.tup_stok_kodu) || [];
        if (kesikCandidates.length === 0) {
          calcStatus = 'UNRESOLVED';
          unresolvedReason = `Tüp [${d.tup_stok_kodu}] için kesik levha reçetesi bulunamadı`;
          netCuttingDemand = null;
          netPrintDemand = null;
        } else if (kesikCandidates.length > 1) {
          calcStatus = 'UNRESOLVED';
          unresolvedReason = `Tüp [${d.tup_stok_kodu}] için birden fazla (${kesikCandidates.length}) kesik levha alternatifi var`;
          netCuttingDemand = null;
          netPrintDemand = null;
        } else {
          const kesikLink = kesikCandidates[0];
          cuttingCode = kesikLink.childCode;
          ratioTubeToCutting = kesikLink.ratio;

          if (ratioTubeToCutting <= 0) {
            calcStatus = 'ERROR';
            unresolvedReason = `Kesik levha reçete oranı geçersiz (${ratioTubeToCutting})`;
            netCuttingDemand = null;
            netPrintDemand = null;
          } else {
            const requiredCuttingUnits = netTubeDemand * ratioTubeToCutting;
            const cuttingPool = getOrCreatePool(cuttingCode, 'KESIKLEVHA');
            cuttingBefore = cuttingPool.remainingPool;
            allocatedCutting = Math.min(requiredCuttingUnits, cuttingPool.remainingPool);
            cuttingPool.remainingPool -= allocatedCutting;
            cuttingPool.allocatedTotal += allocatedCutting;
            cuttingAfter = cuttingPool.remainingPool;

            const remainingCuttingUnits = Math.round((requiredCuttingUnits - allocatedCutting) * 100) / 100;
            netCuttingDemand = Math.round((remainingCuttingUnits / ratioTubeToCutting) * 100) / 100;
            totalAllocatedCutting += allocatedCutting;
            totalNetCutting += netCuttingDemand;

            // Seviye 3: Baskılı Levha
            if (remainingCuttingUnits <= 0) {
              netPrintDemand = 0;
            } else {
              const baskiliCandidates = cuttingToPrintMap.get(cuttingCode) || [];
              if (baskiliCandidates.length === 0) {
                calcStatus = 'UNRESOLVED';
                unresolvedReason = `Kesik Levha [${cuttingCode}] için baskılı levha reçetesi bulunamadı`;
                netPrintDemand = null;
              } else if (baskiliCandidates.length > 1) {
                calcStatus = 'UNRESOLVED';
                unresolvedReason = `Kesik Levha [${cuttingCode}] için birden fazla (${baskiliCandidates.length}) baskılı levha alternatifi var`;
                netPrintDemand = null;
              } else {
                const baskiliLink = baskiliCandidates[0];
                printCode = baskiliLink.childCode;
                ratioCuttingToPrint = baskiliLink.ratio;

                if (ratioCuttingToPrint <= 0) {
                  calcStatus = 'ERROR';
                  unresolvedReason = `Baskılı levha reçete oranı geçersiz (${ratioCuttingToPrint})`;
                  netPrintDemand = null;
                } else {
                  const requiredPrintUnits = remainingCuttingUnits * ratioCuttingToPrint;
                  const printPool = getOrCreatePool(printCode, 'BASKILILEVHA');
                  printBefore = printPool.remainingPool;
                  allocatedPrint = Math.min(requiredPrintUnits, printPool.remainingPool);
                  printPool.remainingPool -= allocatedPrint;
                  printPool.allocatedTotal += allocatedPrint;
                  printAfter = printPool.remainingPool;

                  const remainingPrintUnits = Math.round((requiredPrintUnits - allocatedPrint) * 100) / 100;
                  netPrintDemand = Math.round((remainingPrintUnits / (ratioTubeToCutting * ratioCuttingToPrint)) * 100) / 100;
                  totalAllocatedPrint += allocatedPrint;
                  totalNetPrint += netPrintDemand;

                  // Seviye 4: Ham Levha Tüketimi
                  const hamCandidates = printToSheetMap.get(printCode) || [];
                  if (hamCandidates.length > 0) {
                    const hamLink = hamCandidates[0];
                    rawSheetCode = hamLink.childCode;
                    ratioPrintToSheet = hamLink.ratio;
                    rawSheetCapacity = ratioPrintToSheet > 0 ? Math.round(1 / ratioPrintToSheet) : 0;
                    estimatedRawSheets = rawSheetCapacity > 0 ? Math.ceil(netPrintDemand / rawSheetCapacity) : 0;
                  }
                }
              }
            }
          }
        }
      }

      if (calcStatus === 'CALCULATED') calculatedCount++;
      else if (calcStatus === 'UNRESOLVED') unresolvedCount++;
      else if (calcStatus === 'ERROR') errorCount++;

      // -------------------------------------------------------------
      // MEVCUT ÜRETİM PLANIYLA KARŞILAŞTIRMA (Planlı Arz & Termin Açığı)
      // -------------------------------------------------------------
      let plannedCoverQuantity = 0;
      let additionalPlanningNeeded = netTubeDemand;
      let planEarliestFinish = null;
      let isScheduleDelayed = false;
      let delayDays = 0;

      if (netTubeDemand > 0 && plannedSupplyMap.has(d.tup_stok_kodu)) {
        const planList = plannedSupplyMap.get(d.tup_stok_kodu);
        let neededFromPlan = netTubeDemand;

        for (const p of planList) {
          if (p.remainingQty <= 0) continue;
          const take = Math.min(neededFromPlan, p.remainingQty);
          p.remainingQty -= take;
          neededFromPlan -= take;
          plannedCoverQuantity += take;

          if (!planEarliestFinish || (p.endDate && p.endDate < planEarliestFinish)) {
            planEarliestFinish = p.endDate;
          }

          if (neededFromPlan <= 0) break;
        }

        additionalPlanningNeeded = Math.round(neededFromPlan * 100) / 100;

        // Termin Açığı Kontrolü
        if (d.ihtiyac_tarihi && planEarliestFinish) {
          const demandDueDate = new Date(d.ihtiyac_tarihi);
          if (planEarliestFinish > demandDueDate) {
            isScheduleDelayed = true;
            const diffMs = planEarliestFinish.getTime() - demandDueDate.getTime();
            delayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
      }

      allocations.push({
        demand_id: d.demand_id,
        demand_key: d.demand_key,
        sort_order: sortOrder++,
        tube_stock_code: d.tup_stok_kodu,
        gross_demand: grossDemand,
        allocated_tube_stock: allocatedTube,
        net_tube_demand: netTubeDemand,
        tube_stock_before: tubeBefore,
        tube_stock_after: tubeAfter,
        cutting_stock_code: cuttingCode,
        ratio_tube_to_cutting: ratioTubeToCutting,
        allocated_cutting_stock: allocatedCutting,
        net_cutting_demand: netCuttingDemand,
        cutting_stock_before: cuttingBefore,
        cutting_stock_after: cuttingAfter,
        print_stock_code: printCode,
        ratio_cutting_to_print: ratioCuttingToPrint,
        allocated_print_stock: allocatedPrint,
        net_print_demand: netPrintDemand,
        print_stock_before: printBefore,
        print_stock_after: printAfter,
        raw_sheet_code: rawSheetCode,
        ratio_print_to_sheet: ratioPrintToSheet,
        raw_sheet_capacity: rawSheetCapacity,
        estimated_raw_sheets: estimatedRawSheets,
        planned_cover_quantity: plannedCoverQuantity,
        additional_planning_needed: additionalPlanningNeeded,
        plan_earliest_finish: planEarliestFinish,
        is_schedule_delayed: isScheduleDelayed,
        delay_days: delayDays,
        calculation_status: calcStatus,
        unresolved_reason: unresolvedReason
      });
    }

    // 8. DB'ye Yazma (Atomik Transaction)
    await client.query('BEGIN');

    // Önceki bu run'a ait allocation varsa temizle
    await client.query('DELETE FROM demand_allocations WHERE calculation_run_id = $1', [calcRunId]);

    // Batch insert demand_allocations
    for (const alloc of allocations) {
      await client.query(`
        INSERT INTO demand_allocations (
          calculation_run_id, demand_id, demand_key, sort_order, tube_stock_code, gross_demand,
          allocated_tube_stock, net_tube_demand, tube_stock_before, tube_stock_after,
          cutting_stock_code, ratio_tube_to_cutting, allocated_cutting_stock, net_cutting_demand,
          cutting_stock_before, cutting_stock_after,
          print_stock_code, ratio_cutting_to_print, allocated_print_stock, net_print_demand,
          print_stock_before, print_stock_after,
          raw_sheet_code, ratio_print_to_sheet, raw_sheet_capacity, estimated_raw_sheets,
          planned_cover_quantity, additional_planning_needed, plan_earliest_finish,
          is_schedule_delayed, delay_days, calculation_status, unresolved_reason
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16,
          $17, $18, $19, $20,
          $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29,
          $30, $31, $32, $33
        )
      `, [
        calcRunId, alloc.demand_id, alloc.demand_key, alloc.sort_order, alloc.tube_stock_code, alloc.gross_demand,
        alloc.allocated_tube_stock, alloc.net_tube_demand, alloc.tube_stock_before, alloc.tube_stock_after,
        alloc.cutting_stock_code, alloc.ratio_tube_to_cutting, alloc.allocated_cutting_stock, alloc.net_cutting_demand,
        alloc.cutting_stock_before, alloc.cutting_stock_after,
        alloc.print_stock_code, alloc.ratio_cutting_to_print, alloc.allocated_print_stock, alloc.net_print_demand,
        alloc.print_stock_before, alloc.print_stock_after,
        alloc.raw_sheet_code, alloc.ratio_print_to_sheet, alloc.raw_sheet_capacity, alloc.estimated_raw_sheets,
        alloc.planned_cover_quantity, alloc.additional_planning_needed, alloc.plan_earliest_finish,
        alloc.is_schedule_delayed, alloc.delay_days, alloc.calculation_status, alloc.unresolved_reason
      ]);
    }

    // Calculation run başlığını tamamla
    await client.query(`
      UPDATE calculation_runs SET
        status = 'success',
        finished_at = CURRENT_TIMESTAMP,
        total_demands = $1,
        calculated_count = $2,
        unresolved_count = $3,
        error_count = $4,
        total_gross_tube = $5,
        total_allocated_tube = $6,
        total_net_tube = $7,
        total_allocated_cutting = $8,
        total_net_cutting = $9,
        total_allocated_print = $10,
        total_net_print = $11,
        parameters = $12
      WHERE id = $13
    `, [
      allocations.length, calculatedCount, unresolvedCount, errorCount,
      totalGrossTube, totalAllocatedTube, totalNetTube,
      totalAllocatedCutting, totalNetCutting,
      totalAllocatedPrint, totalNetPrint,
      JSON.stringify({ durationMs: Date.now() - startTime }),
      calcRunId
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      calculationRunId: calcRunId,
      calculationRunUuid: calcRunUuid,
      durationMs: Date.now() - startTime,
      summary: {
        totalDemands: allocations.length,
        calculatedCount,
        unresolvedCount,
        errorCount,
        totalGrossTube,
        totalAllocatedTube,
        totalNetTube,
        totalAllocatedCutting,
        totalNetCutting,
        totalAllocatedPrint,
        totalNetPrint
      }
    };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[DemandAllocation] HATA:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 2. En Son Başarılı Hesaplama Koşusunu Getir
 */
async function getLatestCalculation() {
  const res = await query(`
    SELECT * FROM calculation_runs
    WHERE status = 'success'
    ORDER BY id DESC
    LIMIT 1
  `);
  return res.rows[0] || null;
}

/**
 * 3. İhtiyaç Havuzu İçin Kademeli Hesaplanmış Talep Listesi (Detaylı Bilgilerle)
 */
async function getAllocatedDemands(options = {}) {
  const { calculationRunId = null } = options;

  let targetCalcId = calculationRunId;
  if (!targetCalcId) {
    const latest = await getLatestCalculation();
    if (!latest) {
      // Henüz hesaplama çalışmamışsa, hesaplanmamış talepleri PENDING durumuyla döndür
      return getPendingDemands();
    }
    targetCalcId = latest.id;
  }

  const res = await query(`
    SELECT 
      CONCAT('ERP-', d.id) as id,
      d.id as erp_demand_id,
      d.demand_key,
      d.is_no,
      d.siparis_no as reference_no,
      d.dolum_mamul_kodu,
      d.dolum_mamul_adi,
      d.dolum_plan_miktar,
      d.dolum_gerceklesen_miktar,
      d.dolum_kalan_miktar,
      d.ihtiyac_tarihi as due_date,
      d.bitis_tarihi,
      d.dolum_makine,
      d.dolum_sira,
      d.dolum_seri,
      d.tup_stok_kodu as stock_code,
      d.tup_stok_adi as stock_name,
      d.brut_tup_ihtiyac as gross_quantity,
      
      -- Tahsis Seviyeleri (demand_allocations)
      a.sort_order,
      a.calculation_status,
      a.unresolved_reason,
      
      -- Tüp
      a.allocated_tube_stock,
      a.net_tube_demand as net_tube_quantity,
      stk_tube.usable_stock as available_tube_stock,
      stk_tube.physical_stock as physical_tube_stock,
      a.tube_stock_after as remaining_tube_stock_pool,
      
      -- Kesik
      a.cutting_stock_code,
      stk_cut.stock_name as cutting_stock_name,
      a.ratio_tube_to_cutting,
      a.allocated_cutting_stock,
      a.net_cutting_demand as net_cutting_quantity,
      stk_cut.usable_stock as available_cutting_stock,
      a.cutting_stock_after as remaining_cutting_stock_pool,
      
      -- Baskılı
      a.print_stock_code,
      stk_print.stock_name as print_stock_name,
      a.ratio_cutting_to_print,
      a.allocated_print_stock,
      a.net_print_demand as net_print_quantity,
      stk_print.usable_stock as available_print_stock,
      a.print_stock_after as remaining_print_stock_pool,
      
      -- Ham Levha
      a.raw_sheet_code,
      stk_raw.stock_name as raw_sheet_name,
      a.ratio_print_to_sheet,
      a.raw_sheet_capacity,
      a.estimated_raw_sheets,
      stk_raw.usable_stock as available_raw_sheet_stock,
      
      -- Mevcut Plan & Termin Açığı
      a.planned_cover_quantity,
      a.additional_planning_needed,
      a.plan_earliest_finish,
      a.is_schedule_delayed,
      a.delay_days,
      
      -- Teknik Kart Özellikleri (product_technicals)
      COALESCE(pt.tube_size, 'BELİRTİLMEMİŞ') as tube_size,
      COALESCE(pt.diameter_mm, 0) as diameter_mm,
      COALESCE(pt.height_mm, 0) as height_mm,
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
      a.calculation_run_id,
      d.synced_at
    FROM erp_gross_demands d
    LEFT JOIN demand_allocations a ON d.id = a.demand_id AND a.calculation_run_id = $1
    LEFT JOIN erp_stock_levels stk_tube ON d.tup_stok_kodu = stk_tube.stock_code
    LEFT JOIN erp_stock_levels stk_cut ON a.cutting_stock_code = stk_cut.stock_code
    LEFT JOIN erp_stock_levels stk_print ON a.print_stock_code = stk_print.stock_code
    LEFT JOIN erp_stock_levels stk_raw ON a.raw_sheet_code = stk_raw.stock_code
    LEFT JOIN product_technicals pt ON d.tup_stok_kodu = pt.stock_code
    WHERE d.is_active = TRUE
    ORDER BY a.sort_order ASC NULLS LAST, d.ihtiyac_tarihi ASC, d.id ASC
  `, [targetCalcId]);

  return res.rows.map(row => ({
    ...row,
    gross_quantity: parseFloat(row.gross_quantity) || 0,
    allocated_tube_stock: row.allocated_tube_stock !== null ? parseFloat(row.allocated_tube_stock) : 0,
    net_tube_quantity: row.net_tube_quantity !== null ? parseFloat(row.net_tube_quantity) : null,
    available_tube_stock: parseFloat(row.available_tube_stock) || 0,
    
    allocated_cutting_stock: row.allocated_cutting_stock !== null ? parseFloat(row.allocated_cutting_stock) : 0,
    net_cutting_quantity: row.net_cutting_quantity !== null ? parseFloat(row.net_cutting_quantity) : null,
    available_cutting_stock: parseFloat(row.available_cutting_stock) || 0,
    
    allocated_print_stock: row.allocated_print_stock !== null ? parseFloat(row.allocated_print_stock) : 0,
    net_print_quantity: row.net_print_quantity !== null ? parseFloat(row.net_print_quantity) : null,
    available_print_stock: parseFloat(row.available_print_stock) || 0,
    
    raw_sheet_capacity: parseInt(row.raw_sheet_capacity, 10) || null,
    estimated_raw_sheets: parseInt(row.estimated_raw_sheets, 10) || null,
    available_raw_sheet_stock: parseFloat(row.available_raw_sheet_stock) || 0,
    
    planned_cover_quantity: parseFloat(row.planned_cover_quantity) || 0,
    additional_planning_needed: row.additional_planning_needed !== null ? parseFloat(row.additional_planning_needed) : null,
    delay_days: parseInt(row.delay_days, 10) || 0,
    
    // Eski uyumluluk: net_quantity artık doğrulanmış YENİ BASKI İHTİYACI'dır (eğer hesaplanmışsa)
    net_quantity: row.net_print_quantity !== null ? parseFloat(row.net_print_quantity) : null,
    calculation_status: row.calculation_status || 'PENDING'
  }));
}

/**
 * 4. Henüz Hesaplanmamış (PENDING) Talepleri Getir
 */
async function getPendingDemands() {
  const res = await query(`
    SELECT 
      CONCAT('ERP-', d.id) as id,
      d.id as erp_demand_id,
      d.demand_key,
      d.is_no,
      d.siparis_no as reference_no,
      d.dolum_mamul_kodu,
      d.dolum_mamul_adi,
      d.dolum_plan_miktar,
      d.ihtiyac_tarihi as due_date,
      d.bitis_tarihi,
      d.dolum_makine,
      d.dolum_sira,
      d.dolum_seri,
      d.tup_stok_kodu as stock_code,
      d.tup_stok_adi as stock_name,
      d.brut_tup_ihtiyac as gross_quantity,
      COALESCE(stk.usable_stock, 0) as available_stock,
      COALESCE(stk.usable_stock, 0) as available_tube_stock,
      NULL as net_quantity, -- Motor hesaplayana kadar NULL
      NULL as net_tube_quantity,
      NULL as net_cutting_quantity,
      NULL as net_print_quantity,
      'PENDING' as calculation_status,
      'Kademeli stok tahsis motoru henüz çalıştırılmadı' as unresolved_reason,
      COALESCE(pt.tube_size, 'BELİRTİLMEMİŞ') as tube_size,
      COALESCE(pt.diameter_mm, 0) as diameter_mm,
      COALESCE(pt.height_mm, 0) as height_mm,
      COALESCE(pt.raw_sheet_code, '') as raw_sheet_code,
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
    WHERE d.is_active = TRUE
    ORDER BY d.ihtiyac_tarihi ASC, d.id ASC
  `);

  return res.rows.map(row => ({
    ...row,
    gross_quantity: parseFloat(row.gross_quantity) || 0,
    available_stock: parseFloat(row.available_stock) || 0,
    available_tube_stock: parseFloat(row.available_tube_stock) || 0,
    net_quantity: null,
    net_tube_quantity: null,
    net_cutting_quantity: null,
    net_print_quantity: null
  }));
}

module.exports = {
  runAllocationCalculation,
  getLatestCalculation,
  getAllocatedDemands,
  getPendingDemands
};
