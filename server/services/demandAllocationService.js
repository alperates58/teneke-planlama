const { query, getClient } = require('../db');

/**
 * FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE ÇOK SEVİYELİ STOK TAHSİS SERVİSİ
 * (Reçete Çözümleme & Stok Tahsisi Ayrımı)
 * 
 * İlkeler:
 *   1) Reçete çözümleme stok tahsisinden bağımsızdır: netTubeDemand = 0 olsa bile
 *      tüm tüplerin K- (kesik) ve B- (baskılı) reçeteleri ve eldeki stokları çözümlenir.
 *   2) K- ve B- stok ADI önekleridir (sayısal koda LIKE 'K-%' uygulanmaz).
 *      Kategori (KESIKLEVHA, BASKILILEVHA) ve isim önekleri kural bazlı doğrulanır.
 *   3) Tel bakır, dip, bombe, lak, hurda gibi diğer bileşenler kesik/baskılı seçilmez.
 *   4) Çoklu aday durumunda rastgele ilk kayıt seçilmez; durum 'UNRESOLVED' işaretlenir.
 *   5) Tüp stoğundan tamamen karşılanan talepte net değerler 0'dır; ancak reçete
 *      kodları ve mevcut stoklar şeffafça görünür kalır.
 */

// Parametrik Reçete Önek ve Kategori Kuralları
const RECIPE_RULES = {
  cuttingPrefix: 'K-',
  printPrefix: 'B-',
  excludedCategories: ['BAKIR', 'DIP', 'BOMBE', 'LAK', 'HURDA']
};

/**
 * 1. Kademeli Hesaplamayı Çalıştır
 */
async function runAllocationCalculation({ user, syncRunId = null, planDraftId = null }) {
  const client = await getClient();
  const startTime = Date.now();

  try {
    // 1. ERP Senkronizasyonu çakışma kontrolü
    const runningSyncRes = await client.query(`
      SELECT id FROM erp_sync_runs 
      WHERE status = 'running' 
      LIMIT 1
    `);
    if (runningSyncRes.rows.length > 0) {
      const err = new Error('ERP senkronizasyonu devam ederken kademeli tahsis hesaplaması çalıştırılamaz.');
      err.status = 409;
      err.code = 'SYNC_IN_PROGRESS';
      throw err;
    }

    // 2. Hedef senkron koşusu (belirtilmemişse son başarılı koşu)
    const lastSyncRes = await client.query(`
      SELECT id FROM erp_sync_runs 
      WHERE status = 'success' 
      ORDER BY id DESC LIMIT 1
    `);
    if (lastSyncRes.rows.length === 0) {
      const err = new Error('Hesaplama için geçerli bir ERP senkronizasyon kaydı bulunamadı. Önce ERP senkronizasyonu çalıştırılmalıdır.');
      err.status = 400;
      err.code = 'NO_SYNC_DATA';
      throw err;
    }
    const latestSyncId = lastSyncRes.rows[0].id;

    if (syncRunId && parseInt(syncRunId, 10) !== latestSyncId) {
      const err = new Error(`Belirtilen senkronizasyon sürümü (#${syncRunId}) artık aktif staging katmanında bulunmuyor. Yalnızca en güncel senkronizasyon (#${latestSyncId}) hesaplanabilir.`);
      err.status = 400;
      err.code = 'STALE_SYNC_REQUESTED';
      throw err;
    }
    const targetSyncId = latestSyncId;

    // 3. Tekil ve Onaylı Plan Taslağını Seç (Alternatif taslakların mükerrer arz üretmesi engellenir)
    let selectedDraft = null;
    if (planDraftId) {
      const draftRes = await client.query(`
        SELECT id, name, version, status 
        FROM production_plan_drafts 
        WHERE id = $1
      `, [planDraftId]);
      if (draftRes.rows.length > 0) selectedDraft = draftRes.rows[0];
    }
    if (!selectedDraft) {
      // Önce aktif onaylı plan taslağını ara
      const activeDraftRes = await client.query(`
        SELECT id, name, version, status 
        FROM production_plan_drafts 
        WHERE status = 'ACTIVE' 
        ORDER BY updated_at DESC LIMIT 1
      `);
      if (activeDraftRes.rows.length > 0) selectedDraft = activeDraftRes.rows[0];
    }
    if (!selectedDraft) {
      // Yoksa en son düzenlenen taslağı seç
      const latestDraftRes = await client.query(`
        SELECT id, name, version, status 
        FROM production_plan_drafts 
        ORDER BY updated_at DESC LIMIT 1
      `);
      if (latestDraftRes.rows.length > 0) selectedDraft = latestDraftRes.rows[0];
    }

    const selectedDraftId = selectedDraft ? selectedDraft.id : null;
    const selectedDraftTitle = selectedDraft ? `${selectedDraft.name} (v${selectedDraft.version})` : 'Plan Taslağı Yok';

    // 4. Yeni calculation_run kaydı başlat
    const runRes = await client.query(`
      INSERT INTO calculation_runs (
        sync_run_id, plan_draft_id, plan_title, status, triggered_by, started_at
      ) VALUES ($1, $2, $3, 'running', $4, CURRENT_TIMESTAMP)
      RETURNING id, run_id
    `, [targetSyncId, selectedDraftId, selectedDraftTitle, user?.username || 'system']);
    const calcRunId = runRes.rows[0].id;
    const calcRunUuid = runRes.rows[0].run_id;

    // 5. Aktif brüt talepleri çek (Kararlı Sıralama: Termin Tarihi -> Dolum Sırası -> İş No -> Demand Key)
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
      WHERE d.is_active = TRUE AND d.status != 'cancelled'
      ORDER BY 
        d.ihtiyac_tarihi ASC NULLS LAST,
        COALESCE(NULLIF(regexp_replace(d.dolum_sira, '[^0-9]', '', 'g'), ''), '999999')::INTEGER ASC,
        d.is_no ASC,
        d.demand_key ASC
    `);
    const demands = demandsRes.rows;

    // 6. Stok seviyelerini in-memory havuza yükle
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
        unit: (s.unit || 'ADET').toUpperCase(),
        physicalStock: parseFloat(s.physical_stock) || 0,
        excludedStock: parseFloat(s.excluded_quarantine_stock) || 0,
        rawNetStock: parseFloat(s.raw_net_stock) || 0,
        usableStock: usable,
        remainingPool: usable, // Tahsis edildikçe azalır
        allocatedTotal: 0,
        hasNegativeWarning: Boolean(s.has_negative_warning)
      });
    }

    function getOrCreatePool(stockCode, defaultCategory = 'TENEKETUP', defaultUnit = 'ADET') {
      if (!stockPool.has(stockCode)) {
        stockPool.set(stockCode, {
          stockCode,
          stockName: stockCode,
          category: defaultCategory,
          unit: defaultUnit,
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

    // 7. Onaylı Ebat / Kapasite Parametrelerini Yükle (Kapasite hesaplanmaz, parametredir!)
    const capacitiesRes = await client.query(`
      SELECT tube_size, units_per_sheet, assembly_group_count, repeat_step 
      FROM tube_capacities
    `);
    const capacityMap = new Map();
    for (const c of capacitiesRes.rows) {
      capacityMap.set(c.tube_size, {
        unitsPerSheet: parseInt(c.units_per_sheet, 10),
        groups: parseInt(c.assembly_group_count, 10),
        step: parseInt(c.repeat_step, 10)
      });
    }

    // 8. Teknik Kartları ve Onaylı Ham Levha Eşleşmelerini Yükle
    const techRes = await client.query(`
      SELECT stock_code, tube_size, raw_sheet_code, print_surface, colors 
      FROM product_technicals 
      WHERE is_active = TRUE
    `);
    const techCardMap = new Map();
    for (const t of techRes.rows) {
      techCardMap.set(t.stock_code, {
        tubeSize: t.tube_size,
        rawSheetCode: t.raw_sheet_code || null,
        printSurface: t.print_surface,
        colors: t.colors || []
      });
    }

    // 9. Reçete bağlantılarını çek ve indeksle
    const recipesRes = await client.query(`
      SELECT 
        recete_guid, parent_stock_code, parent_stock_name, parent_category,
        child_stock_code, child_stock_name, child_category, consumption_ratio, unit_no
      FROM erp_recipe_links
      ORDER BY id ASC
    `);

    const tubeToCuttingMap = new Map();
    const cuttingToPrintMap = new Map();
    const printToSheetMap = new Map();

    for (const r of recipesRes.rows) {
      const ratio = parseFloat(r.consumption_ratio) || 0;
      const childCat = (r.child_category || '').toUpperCase().trim();
      const childName = (r.child_stock_name || '').trim();
      const parentCat = (r.parent_category || '').toUpperCase().trim();

      // Dışlanan yardımcı malzemeleri kesinlikle kesik/baskılı seçme
      if (RECIPE_RULES.excludedCategories.includes(childCat)) {
        continue;
      }

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

      // Tüp -> Kesik Levha (K- ile başlayan stok adı veya KESIKLEVHA kategorisi)
      const isCuttingCat = childCat === 'KESIKLEVHA';
      const isCuttingName = childName.toUpperCase().startsWith(RECIPE_RULES.cuttingPrefix);
      if (parentCat === 'TENEKETUP' && (isCuttingCat || isCuttingName)) {
        if (!tubeToCuttingMap.has(r.parent_stock_code)) tubeToCuttingMap.set(r.parent_stock_code, []);
        tubeToCuttingMap.get(r.parent_stock_code).push(item);
      } 
      // Kesik Levha -> Baskılı Levha (B- ile başlayan stok adı veya BASKILILEVHA kategorisi)
      else if ((parentCat === 'KESIKLEVHA' || isCuttingCat) && (childCat === 'BASKILILEVHA' || childName.toUpperCase().startsWith(RECIPE_RULES.printPrefix))) {
        if (!cuttingToPrintMap.has(r.parent_stock_code)) cuttingToPrintMap.set(r.parent_stock_code, []);
        cuttingToPrintMap.get(r.parent_stock_code).push(item);
      } 
      // Baskılı Levha -> Ham Levha
      else if ((parentCat === 'BASKILILEVHA' || childCat === 'HAMLEVHA') && childCat === 'HAMLEVHA') {
        if (!printToSheetMap.has(r.parent_stock_code)) printToSheetMap.set(r.parent_stock_code, []);
        printToSheetMap.get(r.parent_stock_code).push(item);
      }
    }

    // 10. Seçilmiş Tek Plan Taslağından Planlı Arzı Çek
    const plannedSupplyMap = new Map();
    if (selectedDraftId) {
      const planRes = await client.query(`
        SELECT 
          pi.stock_code,
          pi.quantity,
          COALESCE(pi.end_date, pi.scheduled_date) as end_date,
          pi.sequence_order
        FROM production_plan_draft_items pi
        WHERE pi.draft_id = $1
        ORDER BY pi.sequence_order ASC, pi.id ASC
      `, [selectedDraftId]);

      for (const row of planRes.rows) {
        if (!plannedSupplyMap.has(row.stock_code)) plannedSupplyMap.set(row.stock_code, []);
        plannedSupplyMap.get(row.stock_code).push({
          stockCode: row.stock_code,
          quantity: parseFloat(row.quantity) || 0,
          remainingQty: parseFloat(row.quantity) || 0,
          endDate: row.end_date ? new Date(row.end_date) : null
        });
      }
    }

    // 11. Kademeli Tahsis Döngüsü
    const allocations = [];
    let calculatedCount = 0;
    let unresolvedCount = 0;
    let errorCount = 0;

    let sortOrder = 1;

    for (const d of demands) {
      const grossDemand = parseFloat(d.brut_tup_ihtiyac);

      // Veri hatası kontrolü
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
          allocated_cutting_tube_equiv: 0,
          cutting_stock_unit: 'ADET',
          net_cutting_demand: null,
          cutting_stock_before: 0,
          cutting_stock_after: 0,
          print_stock_code: null,
          ratio_cutting_to_print: null,
          allocated_print_stock: 0,
          allocated_print_tube_equiv: 0,
          print_stock_unit: 'ADET',
          net_print_demand: null,
          print_stock_before: 0,
          print_stock_after: 0,
          raw_sheet_code: null,
          ratio_print_to_sheet: null,
          raw_sheet_capacity: null,
          estimated_raw_sheets: null,
          planned_cover_quantity: 0,
          on_time_covered_quantity: 0,
          delayed_covered_quantity: 0,
          uncovered_quantity: isNaN(grossDemand) ? 0 : grossDemand,
          additional_planning_needed: isNaN(grossDemand) ? 0 : grossDemand,
          full_coverage_date: null,
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
      const tubePool = getOrCreatePool(d.tup_stok_kodu, 'TENEKETUP', 'ADET');
      const tubeBefore = tubePool.remainingPool;
      const allocatedTube = Math.min(grossDemand, tubePool.remainingPool);
      tubePool.remainingPool -= allocatedTube;
      tubePool.allocatedTotal += allocatedTube;
      const tubeAfter = tubePool.remainingPool;

      // Net tüp ihtiyacı (Decimal koruma: Math.round ile 2 basamak)
      const netTubeDemand = Math.round((grossDemand - allocatedTube) * 100) / 100;

      // =============================================================
      // AŞAMA 0: REÇETE VE BİLEŞEN ÇÖZÜMLEME (İhtiyaçtan Bağımsız)
      // =============================================================
      // İlke: Her tüp için, brüt/net ihtiyaç sıfır olsa dahi reçete zinciri çözümlenir.
      // Kesik (K-) ve Baskılı (B-) kodları ve havuz stokları her zaman belirlenir.
      let cuttingCode = null;
      let ratioTubeToCutting = null;
      let printCode = null;
      let ratioCuttingToPrint = null;
      let rawSheetCode = null;
      let ratioPrintToSheet = null;
      let rawSheetCapacity = null;
      let estimatedRawSheets = null;

      let recipeStatus = 'RESOLVED'; // 'RESOLVED', 'NO_CUTTING_RECIPE', 'AMBIGUOUS_CUTTING', 'NO_PRINT_RECIPE', 'AMBIGUOUS_PRINT', 'INVALID_RATIO'
      let recipeMessage = null;

      // 1. Kesik Levha Reçetesi Çözümleme
      const kesikCandidates = tubeToCuttingMap.get(d.tup_stok_kodu) || [];
      if (kesikCandidates.length === 0) {
        recipeStatus = 'NO_CUTTING_RECIPE';
        recipeMessage = `Tüp [${d.tup_stok_kodu}] için geçerli kesik levha reçetesi bulunamadı`;
      } else if (kesikCandidates.length > 1) {
        recipeStatus = 'AMBIGUOUS_CUTTING';
        recipeMessage = `Tüp [${d.tup_stok_kodu}] için birden fazla (${kesikCandidates.length}) alternatif kesik levha var`;
      } else {
        const kesikLink = kesikCandidates[0];
        cuttingCode = kesikLink.childCode;
        ratioTubeToCutting = kesikLink.ratio;

        if (ratioTubeToCutting <= 0) {
          recipeStatus = 'INVALID_RATIO';
          recipeMessage = `Kesik levha reçete katsayısı geçersiz (${ratioTubeToCutting})`;
        } else {
          // 2. Baskılı Levha Reçetesi Çözümleme
          const baskiliCandidates = cuttingToPrintMap.get(cuttingCode) || [];
          if (baskiliCandidates.length === 0) {
            recipeStatus = 'NO_PRINT_RECIPE';
            recipeMessage = `Kesik Levha [${cuttingCode}] için geçerli baskılı levha reçetesi bulunamadı`;
          } else if (baskiliCandidates.length > 1) {
            recipeStatus = 'AMBIGUOUS_PRINT';
            recipeMessage = `Kesik Levha [${cuttingCode}] için birden fazla (${baskiliCandidates.length}) alternatif baskılı levha var`;
          } else {
            const baskiliLink = baskiliCandidates[0];
            printCode = baskiliLink.childCode;
            ratioCuttingToPrint = baskiliLink.ratio;

            if (ratioCuttingToPrint <= 0) {
              recipeStatus = 'INVALID_RATIO';
              recipeMessage = `Baskılı levha reçete katsayısı geçersiz (${ratioCuttingToPrint})`;
            } else {
              // 3. Ham Levha ve Kapasite Parametresi Çözümleme
              const techInfo = techCardMap.get(d.tup_stok_kodu);
              const candidateSheetCode = techInfo?.rawSheetCode || null;
              const tubeSize = techInfo?.tubeSize || null;

              if (tubeSize && capacityMap.has(tubeSize)) {
                rawSheetCapacity = capacityMap.get(tubeSize).unitsPerSheet;
              }

              const hamCandidates = printToSheetMap.get(printCode) || [];
              if (candidateSheetCode) {
                rawSheetCode = candidateSheetCode;
              } else if (hamCandidates.length === 1) {
                rawSheetCode = hamCandidates[0].childCode;
                ratioPrintToSheet = hamCandidates[0].ratio;
              }
            }
          }
        }
      }

      // Reçete çözümlendikten sonra stok havuzu nesnelerini al
      let cuttingPool = null;
      let cuttingUnit = 'ADET';
      let cuttingBefore = 0;
      let cuttingAfter = 0;
      if (cuttingCode) {
        cuttingPool = getOrCreatePool(cuttingCode, 'KESIKLEVHA', 'ADET');
        cuttingUnit = cuttingPool.unit || 'ADET';
        cuttingBefore = cuttingPool.remainingPool;
        cuttingAfter = cuttingBefore;
      }

      let printPool = null;
      let printUnit = 'ADET';
      let printBefore = 0;
      let printAfter = 0;
      if (printCode) {
        printPool = getOrCreatePool(printCode, 'BASKILILEVHA', 'ADET');
        printUnit = printPool.unit || 'ADET';
        printBefore = printPool.remainingPool;
        printAfter = printBefore;
      }

      // =============================================================
      // AŞAMA 2 & 3: ÇOK SEVİYELİ STOK TAHSİSİ
      // =============================================================
      let allocatedCuttingPhysical = 0;
      let allocatedCuttingTubeEquiv = 0;
      let netCuttingDemandTubeEquiv = 0;

      let allocatedPrintPhysical = 0;
      let allocatedPrintTubeEquiv = 0;
      let netPrintDemandTubeEquiv = 0;

      let calcStatus = 'CALCULATED';
      let unresolvedReason = null;

      if (netTubeDemand <= 0) {
        // Talep tüp stoğundan tamamen karşılandı!
        // Kesik ve baskılı net ihtiyaç 0, tahsis 0; ama reçete ve eldeki stoklar kayıtlı kalır.
        netCuttingDemandTubeEquiv = 0;
        netPrintDemandTubeEquiv = 0;
        calcStatus = 'CALCULATED';
        if (recipeStatus !== 'RESOLVED') {
          // Reçetesi olmasa da tüp stoğundan karşılandığı için planlama engellenmez, bilgi verilir
          unresolvedReason = `Tüp stoğundan karşılandı (${recipeMessage})`;
        }
      } else {
        // Net tüp üretimi gerekiyor: Kesik ve baskılı kademeli tahsisini çalıştır
        if (recipeStatus === 'NO_CUTTING_RECIPE' || recipeStatus === 'AMBIGUOUS_CUTTING') {
          calcStatus = 'UNRESOLVED';
          unresolvedReason = recipeMessage;
          netCuttingDemandTubeEquiv = null;
          netPrintDemandTubeEquiv = null;
        } else if (recipeStatus === 'INVALID_RATIO') {
          calcStatus = 'ERROR';
          unresolvedReason = recipeMessage;
          netCuttingDemandTubeEquiv = null;
          netPrintDemandTubeEquiv = null;
        } else {
          // Kesik Levha Fiziksel İhtiyacı ve Stok Tahsisi
          const requiredCuttingPhysical = netTubeDemand * ratioTubeToCutting;
          allocatedCuttingPhysical = Math.min(requiredCuttingPhysical, cuttingPool.remainingPool);
          cuttingPool.remainingPool -= allocatedCuttingPhysical;
          cuttingPool.allocatedTotal += allocatedCuttingPhysical;
          cuttingAfter = cuttingPool.remainingPool;

          allocatedCuttingTubeEquiv = Math.round((allocatedCuttingPhysical / ratioTubeToCutting) * 100) / 100;
          netCuttingDemandTubeEquiv = Math.round((netTubeDemand - allocatedCuttingTubeEquiv) * 100) / 100;

          const remainingCuttingPhysical = Math.round((requiredCuttingPhysical - allocatedCuttingPhysical) * 100) / 100;

          // Baskılı Levha Fiziksel İhtiyacı ve Stok Tahsisi
          if (remainingCuttingPhysical <= 0 || netCuttingDemandTubeEquiv <= 0) {
            netPrintDemandTubeEquiv = 0;
          } else {
            if (recipeStatus === 'NO_PRINT_RECIPE' || recipeStatus === 'AMBIGUOUS_PRINT') {
              calcStatus = 'UNRESOLVED';
              unresolvedReason = recipeMessage;
              netPrintDemandTubeEquiv = null;
            } else {
              const requiredPrintPhysical = remainingCuttingPhysical * ratioCuttingToPrint;
              allocatedPrintPhysical = Math.min(requiredPrintPhysical, printPool.remainingPool);
              printPool.remainingPool -= allocatedPrintPhysical;
              printPool.allocatedTotal += allocatedPrintPhysical;
              printAfter = printPool.remainingPool;

              allocatedPrintTubeEquiv = Math.round((allocatedPrintPhysical / (ratioTubeToCutting * ratioCuttingToPrint)) * 100) / 100;
              netPrintDemandTubeEquiv = Math.round((netCuttingDemandTubeEquiv - allocatedPrintTubeEquiv) * 100) / 100;

              // Ham Levha Satın Alma İhtiyacı Tahmini (Kapasite Parametresi ile)
              if (rawSheetCapacity && rawSheetCapacity > 0 && netPrintDemandTubeEquiv > 0) {
                estimatedRawSheets = Math.ceil(netPrintDemandTubeEquiv / rawSheetCapacity);
              }
            }
          }
        }
      }

      if (calcStatus === 'CALCULATED') calculatedCount++;
      else if (calcStatus === 'UNRESOLVED') unresolvedCount++;
      else if (calcStatus === 'ERROR') errorCount++;

      // -------------------------------------------------------------
      // MEVCUT PLANLI ARZ VE ZAMAN/TERMİN BAZLI KARŞILAMA
      // -------------------------------------------------------------
      let plannedCoverQuantity = 0;
      let onTimeCoveredQuantity = 0;
      let delayedCoveredQuantity = 0;
      let uncoveredQuantity = netTubeDemand;
      let fullCoverageDate = null;
      let planEarliestFinish = null;
      let isScheduleDelayed = false;
      let delayDays = 0;

      const demandDueDate = d.ihtiyac_tarihi ? new Date(d.ihtiyac_tarihi) : null;

      if (netTubeDemand > 0 && plannedSupplyMap.has(d.tup_stok_kodu)) {
        const planList = plannedSupplyMap.get(d.tup_stok_kodu);
        let needed = netTubeDemand;
        let latestDelayedFinish = null;

        for (const p of planList) {
          if (p.remainingQty <= 0) continue;
          const take = Math.min(needed, p.remainingQty);
          p.remainingQty -= take;
          needed -= take;
          plannedCoverQuantity += take;

          if (!planEarliestFinish || (p.endDate && p.endDate < planEarliestFinish)) {
            planEarliestFinish = p.endDate;
          }

          // Zamanında vs Geç Karşılama Kontrolü
          const isTakeDelayed = Boolean(demandDueDate && p.endDate && (p.endDate > demandDueDate));
          if (isTakeDelayed) {
            delayedCoveredQuantity += take;
            if (!latestDelayedFinish || p.endDate > latestDelayedFinish) {
              latestDelayedFinish = p.endDate;
            }
          } else {
            onTimeCoveredQuantity += take;
          }

          if (needed <= 0) {
            fullCoverageDate = p.endDate;
            break;
          }
        }

        uncoveredQuantity = Math.round(needed * 100) / 100;

        // Geç arz termin açığıdır!
        if (delayedCoveredQuantity > 0 && latestDelayedFinish && demandDueDate) {
          isScheduleDelayed = true;
          const diffMs = latestDelayedFinish.getTime() - demandDueDate.getTime();
          delayDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
        allocated_cutting_stock: allocatedCuttingPhysical,
        allocated_cutting_tube_equiv: allocatedCuttingTubeEquiv,
        cutting_stock_unit: cuttingUnit,
        net_cutting_demand: netCuttingDemandTubeEquiv,
        cutting_stock_before: cuttingBefore,
        cutting_stock_after: cuttingAfter,
        print_stock_code: printCode,
        ratio_cutting_to_print: ratioCuttingToPrint,
        allocated_print_stock: allocatedPrintPhysical,
        allocated_print_tube_equiv: allocatedPrintTubeEquiv,
        print_stock_unit: printUnit,
        net_print_demand: netPrintDemandTubeEquiv,
        print_stock_before: printBefore,
        print_stock_after: printAfter,
        raw_sheet_code: rawSheetCode,
        ratio_print_to_sheet: ratioPrintToSheet,
        raw_sheet_capacity: rawSheetCapacity,
        estimated_raw_sheets: estimatedRawSheets,
        planned_cover_quantity: plannedCoverQuantity,
        on_time_covered_quantity: onTimeCoveredQuantity,
        delayed_covered_quantity: delayedCoveredQuantity,
        uncovered_quantity: uncoveredQuantity,
        additional_planning_needed: uncoveredQuantity,
        full_coverage_date: fullCoverageDate,
        plan_earliest_finish: planEarliestFinish,
        is_schedule_delayed: isScheduleDelayed,
        delay_days: delayDays,
        calculation_status: calcStatus,
        unresolved_reason: unresolvedReason
      });
    }

    // 12. Batch Insert: demand_allocations
    await client.query('BEGIN');

    // Eski kayıtları temizle
    await client.query(`DELETE FROM demand_allocations WHERE calculation_run_id = $1`, [calcRunId]);

    const insertSql = `
      INSERT INTO demand_allocations (
        calculation_run_id, demand_id, demand_key, sort_order,
        tube_stock_code, gross_demand, allocated_tube_stock, net_tube_demand,
        tube_stock_before, tube_stock_after,
        cutting_stock_code, ratio_tube_to_cutting, allocated_cutting_stock,
        allocated_cutting_tube_equiv, cutting_stock_unit, net_cutting_demand,
        cutting_stock_before, cutting_stock_after,
        print_stock_code, ratio_cutting_to_print, allocated_print_stock,
        allocated_print_tube_equiv, print_stock_unit, net_print_demand,
        print_stock_before, print_stock_after,
        raw_sheet_code, ratio_print_to_sheet, raw_sheet_capacity, estimated_raw_sheets,
        planned_cover_quantity, on_time_covered_quantity, delayed_covered_quantity,
        uncovered_quantity, additional_planning_needed,
        full_coverage_date, plan_earliest_finish, is_schedule_delayed, delay_days,
        calculation_status, unresolved_reason
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
      )
    `;

    for (const a of allocations) {
      await client.query(insertSql, [
        calcRunId, a.demand_id, a.demand_key, a.sort_order,
        a.tube_stock_code, a.gross_demand, a.allocated_tube_stock, a.net_tube_demand,
        a.tube_stock_before, a.tube_stock_after,
        a.cutting_stock_code, a.ratio_tube_to_cutting, a.allocated_cutting_stock,
        a.allocated_cutting_tube_equiv, a.cutting_stock_unit, a.net_cutting_demand,
        a.cutting_stock_before, a.cutting_stock_after,
        a.print_stock_code, a.ratio_cutting_to_print, a.allocated_print_stock,
        a.allocated_print_tube_equiv, a.print_stock_unit, a.net_print_demand,
        a.print_stock_before, a.print_stock_after,
        a.raw_sheet_code, a.ratio_print_to_sheet, a.raw_sheet_capacity, a.estimated_raw_sheets,
        a.planned_cover_quantity, a.on_time_covered_quantity, a.delayed_covered_quantity,
        a.uncovered_quantity, a.additional_planning_needed,
        a.full_coverage_date, a.plan_earliest_finish, a.is_schedule_delayed, a.delay_days,
        a.calculation_status, a.unresolved_reason
      ]);
    }

    // 13. Kesin Toplamları Veritabanından Hesapla (Yuvarlama ve float farkını sıfırlar)
    const totalsRes = await client.query(`
      SELECT 
        COALESCE(SUM(gross_demand), 0) as total_gross,
        COALESCE(SUM(allocated_tube_stock), 0) as total_alloc_tube,
        COALESCE(SUM(net_tube_demand), 0) as total_net_tube,
        COALESCE(SUM(allocated_cutting_tube_equiv), 0) as total_alloc_cutting_equiv,
        COALESCE(SUM(net_cutting_demand), 0) as total_net_cutting,
        COALESCE(SUM(allocated_print_tube_equiv), 0) as total_alloc_print_equiv,
        COALESCE(SUM(net_print_demand), 0) as total_net_print,
        COALESCE(SUM(on_time_covered_quantity), 0) as total_on_time,
        COALESCE(SUM(delayed_covered_quantity), 0) as total_delayed,
        COALESCE(SUM(additional_planning_needed), 0) as total_additional
      FROM demand_allocations 
      WHERE calculation_run_id = $1
    `, [calcRunId]);
    const totals = totalsRes.rows[0];

    const durationMs = Date.now() - startTime;

    // 14. calculation_runs güncelle
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
        total_on_time_covered = $12,
        total_delayed_covered = $13,
        total_additional_planning = $14,
        parameters = $15
      WHERE id = $16
    `, [
      allocations.length, calculatedCount, unresolvedCount, errorCount,
      totals.total_gross, totals.total_alloc_tube, totals.total_net_tube,
      totals.total_alloc_cutting_equiv, totals.total_net_cutting,
      totals.total_alloc_print_equiv, totals.total_net_print,
      totals.total_on_time, totals.total_delayed, totals.total_additional,
      JSON.stringify({ 
        durationMs, 
        selectedDraftId, 
        selectedDraftTitle,
        syncRunId: targetSyncId
      }),
      calcRunId
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      calculationRunId: calcRunId,
      calculationRunUuid: calcRunUuid,
      syncRunId: targetSyncId,
      selectedDraftId,
      selectedDraftTitle,
      totalDemands: allocations.length,
      calculatedCount,
      unresolvedCount,
      errorCount,
      totals: {
        totalGrossTube: parseFloat(totals.total_gross),
        totalAllocatedTube: parseFloat(totals.total_alloc_tube),
        totalNetTube: parseFloat(totals.total_net_tube),
        totalAllocatedCutting: parseFloat(totals.total_alloc_cutting_equiv),
        totalNetCutting: parseFloat(totals.total_net_cutting),
        totalAllocatedPrint: parseFloat(totals.total_alloc_print_equiv),
        totalNetPrint: parseFloat(totals.total_net_print),
        totalOnTimeCovered: parseFloat(totals.total_on_time),
        totalDelayedCovered: parseFloat(totals.total_delayed),
        totalAdditionalPlanning: parseFloat(totals.total_additional)
      },
      durationMs
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DemandAllocationService] Hesaplama hatası:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 2. En Son Hesaplama Koşusunu Getir (Özet & Durum & Bayatlar Kontrolü)
 */
async function getLatestCalculation() {
  const runRes = await query(`
    SELECT 
      cr.*,
      (
        SELECT MAX(id) FROM erp_sync_runs WHERE status = 'success'
      ) as latest_sync_id,
      d.version as current_draft_version,
      d.updated_at as current_draft_updated_at
    FROM calculation_runs cr
    LEFT JOIN production_plan_drafts d ON d.id = cr.plan_draft_id
    WHERE cr.status = 'success'
    ORDER BY cr.id DESC
    LIMIT 1
  `);

  if (runRes.rows.length === 0) return null;
  const row = runRes.rows[0];

  const syncStale = Boolean(row.latest_sync_id && row.sync_run_id && row.latest_sync_id > row.sync_run_id);
  const draftStale = Boolean(row.current_draft_updated_at && row.started_at && new Date(row.current_draft_updated_at) > new Date(row.started_at));
  const isStale = syncStale || draftStale;

  return {
    ...row,
    is_stale: isStale,
    stale_reason: syncStale ? 'YENI_ERP_SENKRONU' : (draftStale ? 'PLAN_TASLAK_DEGISIKLIGI' : null)
  };
}

/**
 * 3. Kademeli Tahsis Sonuçlarını Taleplerle Birleştirerek Getir
 */
async function getAllocatedDemands(calculationRunId = null) {
  let targetRunId = calculationRunId;
  if (!targetRunId) {
    const latest = await getLatestCalculation();
    if (!latest) return [];
    targetRunId = latest.id;
  }

  const res = await query(`
    SELECT 
      d.id as erp_demand_id,
      CONCAT('ERP-', d.id) as id,
      d.demand_key,
      d.is_no,
      d.siparis_no as reference_no,
      d.dolum_mamul_kodu,
      d.dolum_mamul_adi,
      d.dolum_plan_miktar,
      d.dolum_kalan_miktar,
      d.ihtiyac_tarihi as due_date,
      d.bitis_tarihi,
      d.dolum_makine,
      d.dolum_sira,
      d.dolum_seri,
      d.tup_stok_kodu as stock_code,
      d.tup_stok_adi as stock_name,
      d.brut_tup_ihtiyac as gross_quantity,
      
      -- Tahsis Seviyeleri (Faz 3B)
      da.sort_order,
      da.calculation_status,
      da.unresolved_reason,
      
      -- Seviye 1: Tüp
      da.allocated_tube_stock,
      da.net_tube_demand as net_tube_quantity,
      da.tube_stock_before as available_tube_stock,
      s.physical_stock as physical_tube_stock,
      da.tube_stock_after as remaining_tube_stock_pool,
      
      -- Seviye 2: Kesik Levha
      da.cutting_stock_code,
      COALESCE(sc.stock_name, cat_c.stock_name, da.cutting_stock_code) as cutting_stock_name,
      da.ratio_tube_to_cutting,
      da.allocated_cutting_stock as allocated_cutting_physical,
      da.allocated_cutting_tube_equiv as allocated_cutting_stock,
      da.cutting_stock_unit,
      da.net_cutting_demand as net_cutting_quantity,
      da.cutting_stock_before as available_cutting_stock,
      da.cutting_stock_after as remaining_cutting_stock_pool,
      
      -- Seviye 3: Baskılı Levha
      da.print_stock_code,
      COALESCE(sp.stock_name, cat_p.stock_name, da.print_stock_code) as print_stock_name,
      da.ratio_cutting_to_print,
      da.allocated_print_stock as allocated_print_physical,
      da.allocated_print_tube_equiv as allocated_print_stock,
      da.print_stock_unit,
      da.net_print_demand as net_print_quantity,
      da.print_stock_before as available_print_stock,
      da.print_stock_after as remaining_print_stock_pool,
      
      -- Seviye 4: Ham Levha Parametresi
      da.raw_sheet_code,
      COALESCE(sh.stock_name, cat_h.stock_name, da.raw_sheet_code) as raw_sheet_name,
      da.ratio_print_to_sheet,
      da.raw_sheet_capacity,
      da.estimated_raw_sheets,
      COALESCE(sh.physical_stock, 0) as available_raw_sheet_stock,
      
      -- Mevcut Planlı Arz & Termin Açığı
      da.planned_cover_quantity,
      da.on_time_covered_quantity,
      da.delayed_covered_quantity,
      da.uncovered_quantity,
      da.additional_planning_needed,
      da.full_coverage_date,
      da.plan_earliest_finish,
      da.is_schedule_delayed,
      da.delay_days,
      
      -- Teknik Kart Özellikleri
      COALESCE(pt.tube_size, 'BELİRTİLMEMİŞ') as tube_size,
      COALESCE(pt.diameter_mm, 0) as diameter_mm,
      COALESCE(pt.height_mm, 0) as height_mm,
      COALESCE(pt.print_surface, 'BELİRTİLMEMİŞ') as print_surface,
      COALESCE(pt.varnish, 'BELİRTİLMEMİŞ') as varnish,
      COALESCE(pt.lacquer, 'BELİRTİLMEMİŞ') as lacquer,
      COALESCE(pt.inside_coating, 'BELİRTİLMEMİŞ') as inside_coating,
      COALESCE(pt.colors, '{}') as colors,
      CASE 
        WHEN pt.stock_code IS NULL THEN 'missing_technical_card'
        WHEN pt.raw_sheet_code IS NULL THEN 'missing_raw_sheet'
        ELSE 'complete'
      END as definition_status,
      
      'RPT' as order_type,
      'live_erp_sync' as record_kind,
      da.calculation_run_id,
      d.synced_at,
      
      -- Kombinasyona gidecek net miktar (Doğrulanmış yeni baskı ihtiyacı)
      COALESCE(da.net_print_demand, 0) as net_quantity
    FROM demand_allocations da
    JOIN erp_gross_demands d ON da.demand_id = d.id
    LEFT JOIN erp_stock_levels s ON d.tup_stok_kodu = s.stock_code
    LEFT JOIN erp_stock_levels sc ON da.cutting_stock_code = sc.stock_code
    LEFT JOIN erp_stock_catalog cat_c ON da.cutting_stock_code = cat_c.stock_code
    LEFT JOIN erp_stock_levels sp ON da.print_stock_code = sp.stock_code
    LEFT JOIN erp_stock_catalog cat_p ON da.print_stock_code = cat_p.stock_code
    LEFT JOIN erp_stock_levels sh ON da.raw_sheet_code = sh.stock_code
    LEFT JOIN erp_stock_catalog cat_h ON da.raw_sheet_code = cat_h.stock_code
    LEFT JOIN product_technicals pt ON d.tup_stok_kodu = pt.stock_code
    WHERE da.calculation_run_id = $1
    ORDER BY da.sort_order ASC
  `, [targetRunId]);

  return res.rows;
}

/**
 * 4. Çekirdek Tahsis Fonksiyonu (Birim Testleri ve İzolasyon İçin)
 */
function calculateSingleDemandPure({
  grossDemand,
  tubeStock = 0,
  cuttingStock = 0,
  ratioTubeToCutting = 1.0,
  printStock = 0,
  ratioCuttingToPrint = 1.0,
  rawSheetCapacity = null,
  planSupplies = [], // [{ quantity, endDate }]
  dueDate = null
}) {
  const gross = Math.max(0, parseFloat(grossDemand) || 0);

  // Aşama 1: Tüp
  const availTube = Math.max(0, parseFloat(tubeStock) || 0);
  const allocTube = Math.min(gross, availTube);
  const netTube = Math.round((gross - allocTube) * 100) / 100;
  const remTubeStock = Math.round((availTube - allocTube) * 100) / 100;

  // Aşama 2: Kesik Levha (Fiziksel stok & Tüp eşdeğeri)
  let allocCutPhys = 0;
  let allocCutTubeEquiv = 0;
  let netCutDemandTubeEquiv = netTube;
  let remCutStock = Math.max(0, parseFloat(cuttingStock) || 0);

  if (netTube > 0 && ratioTubeToCutting > 0) {
    const reqCutPhys = netTube * ratioTubeToCutting;
    allocCutPhys = Math.min(reqCutPhys, remCutStock);
    remCutStock = Math.round((remCutStock - allocCutPhys) * 100) / 100;
    allocCutTubeEquiv = Math.round((allocCutPhys / ratioTubeToCutting) * 100) / 100;
    netCutDemandTubeEquiv = Math.round((netTube - allocCutTubeEquiv) * 100) / 100;
  }

  // Aşama 3: Baskılı Levha (Fiziksel stok & Tüp eşdeğeri)
  let allocPrintPhys = 0;
  let allocPrintTubeEquiv = 0;
  let netPrintDemandTubeEquiv = netCutDemandTubeEquiv;
  let remPrintStock = Math.max(0, parseFloat(printStock) || 0);

  if (netCutDemandTubeEquiv > 0 && ratioTubeToCutting > 0 && ratioCuttingToPrint > 0) {
    const reqPrintPhys = (netCutDemandTubeEquiv * ratioTubeToCutting) * ratioCuttingToPrint;
    allocPrintPhys = Math.min(reqPrintPhys, remPrintStock);
    remPrintStock = Math.round((remPrintStock - allocPrintPhys) * 100) / 100;
    allocPrintTubeEquiv = Math.round((allocPrintPhys / (ratioTubeToCutting * ratioCuttingToPrint)) * 100) / 100;
    netPrintDemandTubeEquiv = Math.round((netCutDemandTubeEquiv - allocPrintTubeEquiv) * 100) / 100;
  }

  // Aşama 4: Ham Levha İhtiyacı
  let estimatedRawSheets = null;
  if (rawSheetCapacity && rawSheetCapacity > 0 && netPrintDemandTubeEquiv > 0) {
    estimatedRawSheets = Math.ceil(netPrintDemandTubeEquiv / rawSheetCapacity);
  }

  // Aşama 5: Planlı Arz & Zamanında/Geç Karşılama
  let onTimeCovered = 0;
  let delayedCovered = 0;
  let needed = netTube;
  let fullCoverageDate = null;
  let latestDelayedFinish = null;

  const due = dueDate ? new Date(dueDate) : null;

  for (const p of planSupplies) {
    if (p.quantity <= 0) continue;
    const take = Math.min(needed, p.quantity);
    needed -= take;

    const pDate = p.endDate ? new Date(p.endDate) : null;
    const isDelayed = Boolean(due && pDate && (pDate > due));
    if (isDelayed) {
      delayedCovered += take;
      if (!latestDelayedFinish || pDate > latestDelayedFinish) {
        latestDelayedFinish = pDate;
      }
    } else {
      onTimeCovered += take;
    }

    if (needed <= 0) {
      fullCoverageDate = pDate;
      break;
    }
  }

  const uncoveredQty = Math.round(needed * 100) / 100;
  let delayDays = 0;
  const isScheduleDelayed = delayedCovered > 0;
  if (isScheduleDelayed && latestDelayedFinish && due) {
    const diffMs = latestDelayedFinish.getTime() - due.getTime();
    delayDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    grossDemand: gross,
    allocatedTubeStock: allocTube,
    netTubeDemand: netTube,
    remainingTubeStock: remTubeStock,

    allocatedCuttingPhysical: allocCutPhys,
    allocatedCuttingTubeEquiv: allocCutTubeEquiv,
    netCuttingDemandTubeEquiv: netCutDemandTubeEquiv,
    remainingCuttingStock: remCutStock,

    allocatedPrintPhysical: allocPrintPhys,
    allocatedPrintTubeEquiv: allocPrintTubeEquiv,
    netPrintDemandTubeEquiv: netPrintDemandTubeEquiv,
    remainingPrintStock: remPrintStock,

    rawSheetCapacity,
    estimatedRawSheets,

    onTimeCoveredQuantity: onTimeCovered,
    delayedCoveredQuantity: delayedCovered,
    uncoveredQuantity: uncoveredQty,
    fullCoverageDate,
    isScheduleDelayed,
    delayDays
  };
}

module.exports = {
  runAllocationCalculation,
  getLatestCalculation,
  getAllocatedDemands,
  calculateSingleDemandPure
};
