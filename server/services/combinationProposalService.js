const { query, getClient } = require('../db');
const { getRuleContext, validateCombination, createDraftCombination } = require('./combinationService');

/**
 * FAZ 4B: OTOMATİK KOMBİNASYON ÖNERİ MOTORU
 * 
 * - Açık baskılı ihtiyaç havuzundan geçerli kombinasyon önerileri üretir.
 * - 18 ebat kuralları, montaj grubu sayısı ve ürün tekrar adımı kısıtlarını uygular.
 * - Minimum 1.250 levha baskı kuralı, termin önceliği ve fazla üretim minimizasyonunu hedefler.
 * - Eksik teknik verili veya inceleme gerektiren kalemleri "Öneriye Alınamayanlar" olarak şeffafça listeler.
 * - Kullanıcının seçtiği öneriyi Faz 4A kilitli rezervasyon ve taslak kombinasyon modeline dönüştürür.
 */

/**
 * 1. Yardımcı: Tamsayı Grup Bölüntüleri (Integer Partitions of G)
 * Toplam grup sayısı G'yi (örn: 5) k parçaya böler (sum(g_i) = G, g_i >= 1).
 */
function getIntegerPartitions(targetG, maxParts = 4) {
  const results = [];

  function backtrack(remainingG, currentPartition, maxAllowedVal) {
    if (remainingG === 0) {
      if (currentPartition.length <= maxParts) {
        results.push([...currentPartition]);
      }
      return;
    }
    if (currentPartition.length >= maxParts) return;

    const startVal = Math.min(remainingG, maxAllowedVal);
    for (let val = startVal; val >= 1; val--) {
      currentPartition.push(val);
      backtrack(remainingG - val, currentPartition, val);
      currentPartition.pop();
    }
  }

  backtrack(targetG, [], targetG);
  return results;
}

/**
 * 2. Yardımcı: k Elemanlı Kombinasyon Seçimi (Subsets of size k)
 */
function getSubsets(arr, k) {
  const subsets = [];
  function fork(start, current) {
    if (current.length === k) {
      subsets.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      fork(i + 1, current);
      current.pop();
    }
  }
  fork(0, []);
  return subsets;
}

/**
 * 3. Otomatik Kombinasyon Önerileri Üret
 */
async function generateCombinationProposals({
  scope = 'ACTIVE_PLAN', // 'ACTIVE_PLAN', 'UNPLANNED_DEMAND', 'ALL'
  selectedDemandIds = [], // Belirli seçilen kalem ID'leri
  tubeSize = null,        // Filtre: ebat (örn: '52x195')
  dateFrom = null,        // Filtre: ihtiyaç tarihi başlangıç
  dateTo = null,          // Filtre: ihtiyaç tarihi bitiş
  maxProposals = 5,       // En fazla kaç öneri üretilsin
  maxSeconds = 5,         // Arama zaman aşımı (saniye)
  allowUnspecifiedColors = false, // Renk tanımsız olanları CMYK simülasyonuyla dene
  user = null
}) {
  const startTime = Date.now();
  const ruleContext = await getRuleContext();

  // 1. Açık İhtiyaçları Veritabanından Oku
  const whereClauses = ['remaining_open_quantity > 0'];
  const params = [];
  let paramIdx = 1;

  if (scope === 'ACTIVE_PLAN') {
    whereClauses.push(`source_type = $${paramIdx++}`);
    params.push('ACTIVE_PLAN');
  } else if (scope === 'UNPLANNED_DEMAND') {
    whereClauses.push(`source_type = $${paramIdx++}`);
    params.push('UNPLANNED_DEMAND');
  }

  if (tubeSize) {
    whereClauses.push(`tube_size = $${paramIdx++}`);
    params.push(tubeSize);
  }

  if (selectedDemandIds && selectedDemandIds.length > 0) {
    whereClauses.push(`id = ANY($${paramIdx++})`);
    params.push(selectedDemandIds);
  }

  if (dateFrom) {
    whereClauses.push(`material_due_date >= $${paramIdx++}`);
    params.push(new Date(dateFrom));
  }
  if (dateTo) {
    whereClauses.push(`material_due_date <= $${paramIdx++}`);
    params.push(new Date(dateTo));
  }

  const queryStr = `
    SELECT 
      id, source_type, plan_draft_id, plan_item_id, demand_key, order_no,
      tube_stock_code, tube_stock_name, tube_size,
      print_stock_code, print_stock_name, print_stock_unit,
      raw_sheet_code, raw_sheet_name, raw_sheet_capacity,
      material_due_date, planned_tube_quantity,
      net_print_demand, allocated_to_draft, covered_by_confirmed,
      remaining_open_quantity, status, review_reason,
      colors, print_surface, lacquer, varnish, inside_coating,
      version
    FROM printed_sheet_demands
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY material_due_date ASC NULLS LAST, id ASC
  `;

  const demandsRes = await query(queryStr, params);
  const rawDemands = demandsRes.rows;

  // 2. Teknik Kart Kataloğunu Oku (Eksik tanımları zenginleştirmek için)
  const techRes = await query(`
    SELECT stock_code, tube_size, print_surface, lacquer, varnish, inside_coating, colors, raw_sheet_code
    FROM product_technicals
  `);
  const techMap = new Map();
  for (const t of techRes.rows) {
    techMap.set(t.stock_code, t);
  }

  // 3. Eksiklik ve Kural Uygunluğu Denetimi ("Öneriye Alınamayanlar" Listesi)
  const eligibleDemands = [];
  const excludedDemands = [];

  for (const d of rawDemands) {
    const openQty = parseFloat(d.remaining_open_quantity) || 0;
    if (openQty <= 0) continue;

    // Teknik kart zenginleştirmesi
    const tech = techMap.get(d.tube_stock_code) || techMap.get(d.print_stock_code) || {};
    const dColors = (Array.isArray(d.colors) && d.colors.length > 0) ? d.colors : (Array.isArray(tech.colors) ? tech.colors : []);
    const dSurface = (d.print_surface && d.print_surface !== 'BELİRTİLMEMİŞ') ? d.print_surface : (tech.print_surface || 'BELİRTİLMEMİŞ');
    const dLacquer = (d.lacquer && d.lacquer !== 'BELİRTİLMEMİŞ') ? d.lacquer : (tech.lacquer || 'BELİRTİLMEMİŞ');
    const dVarnish = (d.varnish && d.varnish !== 'BELİRTİLMEMİŞ') ? d.varnish : (tech.varnish || 'BELİRTİLMEMİŞ');
    const dInsideCoating = (d.inside_coating && d.inside_coating !== 'BELİRTİLMEMİŞ') ? d.inside_coating : (tech.inside_coating || 'BELİRTİLMEMİŞ');
    const dRawSheet = d.raw_sheet_code || tech.raw_sheet_code || null;

    // Denetim 1: İnceleme durumu (NEEDS_REVIEW)
    if (d.status === 'NEEDS_REVIEW') {
      excludedDemands.push({
        printDemandId: d.id,
        orderNo: d.order_no,
        tubeStockCode: d.tube_stock_code,
        tubeStockName: d.tube_stock_name,
        printStockCode: d.print_stock_code,
        tubeSize: d.tube_size,
        remainingOpenQuantity: openQty,
        reasonCode: 'INCELEME_GEREKLI',
        reasonMessage: d.review_reason || 'İhtiyaç onaylı kombinasyonun altına düşmüş veya plan uyuşmazlığı var.'
      });
      continue;
    }

    // Denetim 2: Ebat Kapasitesi Tanımlı mı?
    const capRule = ruleContext.capacities[d.tube_size];
    if (!capRule) {
      excludedDemands.push({
        printDemandId: d.id,
        orderNo: d.order_no,
        tubeStockCode: d.tube_stock_code,
        tubeStockName: d.tube_stock_name,
        printStockCode: d.print_stock_code,
        tubeSize: d.tube_size,
        remainingOpenQuantity: openQty,
        reasonCode: 'EBAT_TANIMSIZ',
        reasonMessage: `Ebat (${d.tube_size}) kapasite tablosunda tanımlı değil.`
      });
      continue;
    }

    // Denetim 3: Onaylı Ham Levha Tanımlı mı?
    if (!dRawSheet) {
      excludedDemands.push({
        printDemandId: d.id,
        orderNo: d.order_no,
        tubeStockCode: d.tube_stock_code,
        tubeStockName: d.tube_stock_name,
        printStockCode: d.print_stock_code,
        tubeSize: d.tube_size,
        remainingOpenQuantity: openQty,
        reasonCode: 'HAM_LEVHA_TANIMSIZ',
        reasonMessage: 'Ürünün onaylı ham levha kodu tanımlanmamıştır.'
      });
      continue;
    }

    // Denetim 4: Renk ve Baskı Yüzeyi Tanımlı mı?
    if (dColors.length === 0) {
      if (!allowUnspecifiedColors) {
        excludedDemands.push({
          printDemandId: d.id,
          orderNo: d.order_no,
          tubeStockCode: d.tube_stock_code,
          tubeStockName: d.tube_stock_name,
          printStockCode: d.print_stock_code,
          tubeSize: d.tube_size,
          remainingOpenQuantity: openQty,
          reasonCode: 'EKSIK_TEKNIK_KART',
          reasonMessage: 'Renk tanımları eksik (Tanımlar Merkezi teknik kartı bekleniyor).'
        });
        continue;
      }
    }

    if (dSurface === 'BELİRTİLMEMİŞ' && !allowUnspecifiedColors) {
      excludedDemands.push({
        printDemandId: d.id,
        orderNo: d.order_no,
        tubeStockCode: d.tube_stock_code,
        tubeStockName: d.tube_stock_name,
        printStockCode: d.print_stock_code,
        tubeSize: d.tube_size,
        remainingOpenQuantity: openQty,
        reasonCode: 'EKSIK_TEKNIK_KART',
        reasonMessage: 'Baskı yüzeyi (metalik/emaye) tanımsız.'
      });
      continue;
    }

    eligibleDemands.push({
      ...d,
      raw_sheet_code: dRawSheet,
      colors: dColors.length > 0 ? dColors : ['C', 'M', 'Y', 'K'], // allowUnspecifiedColors simülasyonu
      print_surface: dSurface !== 'BELİRTİLMEMİŞ' ? dSurface : 'EMAYE',
      lacquer: dLacquer,
      varnish: dVarnish,
      inside_coating: dInsideCoating,
      remaining_open_quantity: openQty
    });
  }

  // 4. Aynı Baskılı Stok Koduna Sahip Talepleri Çoklu Kaynak Olarak Birleştir
  // Kaynak plan/talep bağını sourceDemands listesinde koru
  const productAggregates = new Map();
  for (const dem of eligibleDemands) {
    const key = `${dem.tube_size}__${dem.raw_sheet_code}__${dem.print_stock_code}`;
    if (!productAggregates.has(key)) {
      productAggregates.set(key, {
        tubeSize: dem.tube_size,
        rawSheetCode: dem.raw_sheet_code,
        printStockCode: dem.print_stock_code,
        printStockName: dem.print_stock_name,
        tubeStockCode: dem.tube_stock_code,
        tubeStockName: dem.tube_stock_name,
        printSurface: dem.print_surface,
        lacquer: dem.lacquer,
        varnish: dem.varnish,
        insideCoating: dem.inside_coating,
        colors: dem.colors,
        totalOpenQuantity: 0,
        earliestDueDate: dem.material_due_date,
        sourceDemands: []
      });
    }

    const agg = productAggregates.get(key);
    agg.totalOpenQuantity += dem.remaining_open_quantity;
    agg.sourceDemands.push({
      printDemandId: dem.id,
      orderNo: dem.order_no,
      materialDueDate: dem.material_due_date,
      openQuantity: dem.remaining_open_quantity
    });

    if (dem.material_due_date && (!agg.earliestDueDate || new Date(dem.material_due_date) < new Date(agg.earliestDueDate))) {
      agg.earliestDueDate = dem.material_due_date;
    }
  }

  // 5. Uyumlu Kümeleri (Clusters) Oluştur
  // Aynı çap/boy, ham levha, zemin, lak kuralı ve iç kaplama
  const clusters = new Map();
  for (const [prodKey, prod] of productAggregates.entries()) {
    let lacquerKey = 'ANY_LACQUER';
    if (ruleContext.hasForbidMixedLacquer) {
      lacquerKey = prod.lacquer === 'LAKLI' ? 'LAKLI' : 'LAKSIZ';
    }

    const clusterKey = `${prod.tubeSize}__${prod.rawSheetCode}__${prod.printSurface}__${lacquerKey}__${prod.insideCoating}`;
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey).push(prod);
  }

  // 6. Kombinasyon Arama Motoru
  const candidateProposals = [];
  let isTimeoutReached = false;
  const maxSearchMs = Math.max(1, maxSeconds) * 1000;

  for (const [clusterKey, products] of clusters.entries()) {
    if (Date.now() - startTime > maxSearchMs) {
      isTimeoutReached = true;
      break;
    }

    // Ürünleri termin tarihine göre sırala (Önce erken terminler)
    products.sort((a, b) => {
      if (!a.earliestDueDate) return 1;
      if (!b.earliestDueDate) return -1;
      return new Date(a.earliestDueDate) - new Date(b.earliestDueDate);
    });

    const sample = products[0];
    const tubeSize = sample.tubeSize;
    const rawSheetCode = sample.rawSheetCode;
    const capRule = ruleContext.capacities[tubeSize] || { capacity: 20, repeatStep: 4, groupCount: 5 };
    const capacity = capRule.capacity;
    const repeatStep = capRule.repeatStep;
    const groupCount = capRule.groupCount;
    const minSheets = ruleContext.minSheets || 1250;
    const maxColors = ruleContext.maxColors || 6;

    // Şablon ve matbaa kuralları
    const layoutKey = `${tubeSize}__${rawSheetCode}`;
    const layout = ruleContext.layouts.get(layoutKey) || ruleContext.layouts.get(tubeSize);
    const templateVerificationStatus = layout ? (layout.verification_status || 'unverified') : 'unverified';

    // Grup bölüntülerini üret (1..min(groupCount, products.length) ürünlü)
    const maxK = Math.min(groupCount, products.length, 4);

    for (let k = 1; k <= maxK; k++) {
      if (Date.now() - startTime > maxSearchMs) {
        isTimeoutReached = true;
        break;
      }

      // k adet ürün seç
      const productSubsets = getSubsets(products, k);

      for (const subset of productSubsets) {
        if (Date.now() - startTime > maxSearchMs) {
          isTimeoutReached = true;
          break;
        }

        // Renk kontrolü
        const combinedColors = new Set();
        for (const p of subset) {
          (p.colors || []).forEach(c => combinedColors.add(c.toUpperCase()));
        }
        if (combinedColors.size > maxColors) {
          continue; // Renk sınırı aşıldı
        }

        // Matbaa kuralı: Satır/Sütun homojenliği
        // 45x100, 52x105 ve 65x kutularda her satır aynı çeşit olmalı (SAME_VARIANT_PER_ROW)
        let isLayoutHomogeneous = true;
        if (tubeSize.startsWith('65x') || tubeSize === '45x100' || tubeSize === '52x105') {
          if (layout && layout.rows && subset.length > layout.rows) {
            isLayoutHomogeneous = false; // Satır sayısından fazla çeşit birleşemez
          }
        }
        if (!isLayoutHomogeneous) continue;

        // Tamsayı grup bölüntülerini dene (Örn: G=5 için 1+4, 2+3, 1+2+2)
        const partitions = getIntegerPartitions(groupCount, k);

        for (const partition of partitions) {
          if (partition.length !== k) continue;

          // Permütasyonlar: büyük açık ihtiyaca daha büyük grup vermek mantıklıdır
          // İhtiyaçları büyüklüğe göre sırala, partition'ı büyükten küçüğe ver
          const sortedItems = [...subset].sort((a, b) => b.totalOpenQuantity - a.totalOpenQuantity);
          const sortedG = [...partition].sort((a, b) => b - a);

          const itemAllocations = [];
          let idealSheetsMin = Infinity;
          let idealSheetsMax = 0;

          for (let idx = 0; idx < sortedItems.length; idx++) {
            const it = sortedItems[idx];
            const g = sortedG[idx];
            const repeats = g * repeatStep;
            const targetS = Math.ceil(it.totalOpenQuantity / repeats);

            if (targetS < idealSheetsMin) idealSheetsMin = targetS;
            if (targetS > idealSheetsMax) idealSheetsMax = targetS;

            itemAllocations.push({
              product: it,
              groupMultiplier: g,
              repeatsCount: repeats,
              targetSheets: targetS
            });
          }

          // Aday levha adetlerini belirle (S >= minSheets)
          const sheetCandidates = new Set();
          sheetCandidates.add(minSheets);
          if (idealSheetsMin >= minSheets) sheetCandidates.add(idealSheetsMin);
          if (idealSheetsMax >= minSheets && idealSheetsMax <= minSheets * 10) sheetCandidates.add(idealSheetsMax);

          // Ara adımlar (Örn: en küçük ihtiyacı tam kapama)
          const minCoverS = Math.max(minSheets, idealSheetsMin);
          sheetCandidates.add(minCoverS);

          // 250'lik yuvarlama adımı
          const roundedAvg = Math.max(minSheets, Math.round((idealSheetsMin + idealSheetsMax) / 2 / 250) * 250);
          sheetCandidates.add(roundedAvg);

          for (const sheets of sheetCandidates) {
            let totalOutputTubes = 0;
            let totalCoveredDemand = 0;
            let totalOverproduction = 0;
            const proposalItems = [];

            for (const alloc of itemAllocations) {
              const it = alloc.product;
              const repeats = alloc.repeatsCount;
              const output = repeats * sheets;
              const covered = Math.min(it.totalOpenQuantity, output);
              const overprod = Math.max(0, output - covered);
              const remaining = Math.max(0, it.totalOpenQuantity - covered);

              totalOutputTubes += output;
              totalCoveredDemand += covered;
              totalOverproduction += overprod;

              // Kaynak taleplere orantılı / FIFO dağıtımı hesapla
              let allocRemaining = covered;
              const sourceAllocations = [];

              for (const sd of it.sourceDemands) {
                if (allocRemaining <= 0) break;
                const take = Math.min(allocRemaining, sd.openQuantity);
                allocRemaining -= take;
                sourceAllocations.push({
                  printDemandId: sd.printDemandId,
                  orderNo: sd.orderNo,
                  materialDueDate: sd.materialDueDate,
                  allocatedQuantity: take,
                  remainingOpen: Math.max(0, sd.openQuantity - take)
                });
              }

              proposalItems.push({
                printDemandId: it.sourceDemands[0]?.printDemandId || null,
                tubeStockCode: it.tubeStockCode,
                tubeStockName: it.tubeStockName,
                printStockCode: it.printStockCode,
                printStockName: it.printStockName,
                tubeSize,
                repeatsCount: repeats,
                groupMultiplier: alloc.groupMultiplier,
                totalOutput: output,
                allocatedDemand: covered,
                overproduction: overprod,
                remainingOpen: remaining,
                colors: it.colors,
                printSurface: it.printSurface,
                lacquer: it.lacquer,
                varnish: it.varnish,
                insideCoating: it.insideCoating,
                sourceDemands: sourceAllocations
              });
            }

            // Puanlama (Skor) Modeli
            // 1. Karşılanan İhtiyaç (+1 puan/adet)
            // 2. Fazla Üretim Cezası (-0.6 puan/adet)
            // 3. Şablon Onay Bonusu (verified: +10.000 puan)
            // 4. Çeşit Sayısı Bonusu (Tek montajda çok çeşit: +5.000 puan)
            const templateBonus = templateVerificationStatus === 'verified' ? 10000 : (templateVerificationStatus === 'provisional' ? 3000 : 0);
            const multiProductBonus = k > 1 ? (k * 2500) : 0;
            const score = totalCoveredDemand - (totalOverproduction * 0.6) + templateBonus + multiProductBonus;

            // Fazla üretim toleransı: Karşılananın 3 katından fazla ve 50.000 adetten fazla olamaz
            if (totalOverproduction > 50000 && totalOverproduction > totalCoveredDemand * 3) {
              continue;
            }

            const uniqueColors = Array.from(combinedColors);
            const validationWarnings = [];
            if (templateVerificationStatus !== 'verified') {
              validationWarnings.push('Fiziksel montaj şablonu henüz doğrulanmamıştır; taslak öneridir.');
            }
            if (sheets === minSheets && totalOverproduction > 0) {
              validationWarnings.push(`Minimum 1.250 levha baskı kuralından ötürü ${totalOverproduction.toLocaleString('tr-TR')} adet fazla üretim oluşmaktadır.`);
            }

            candidateProposals.push({
              tubeSize,
              rawSheetCode,
              rawSheetName: rawSheetCode,
              rawSheetCapacity: capacity,
              assemblyGroupCount: groupCount,
              repeatStep,
              totalSlots: capacity,
              usedSlots: capacity,
              sheetsToPrint: sheets,
              totalOutputTubes,
              totalCoveredDemand,
              totalOverproduction,
              uniqueColorsCount: uniqueColors.length,
              uniqueColors,
              templateVerificationStatus,
              validationWarnings,
              items: proposalItems,
              score: Math.round(score * 100) / 100
            });
          }
        }
      }
    }
  }

  // 7. Önerileri Tekilleştir ve Sırala
  // Aynı ürünler, aynı tekrarlar ve aynı levha sayısına sahip önerileri tekilleştir
  const uniqueProposalMap = new Map();
  for (const prop of candidateProposals) {
    const itemSig = prop.items
      .map(it => `${it.printStockCode}:${it.repeatsCount}`)
      .sort()
      .join('|');
    const sig = `${prop.tubeSize}__${prop.rawSheetCode}__${prop.sheetsToPrint}__${itemSig}`;

    if (!uniqueProposalMap.has(sig) || uniqueProposalMap.get(sig).score < prop.score) {
      uniqueProposalMap.set(sig, prop);
    }
  }

  const sortedProposals = Array.from(uniqueProposalMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxProposals));

  // 8. Öneri Numaraları ve Başlıklarını Ata
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  sortedProposals.forEach((p, idx) => {
    const pNo = `PROP-${ym}-${String(idx + 1).padStart(4, '0')}`;
    p.proposalId = pNo;
    p.proposalNo = pNo;
    p.title = `${p.tubeSize} Montaj Önerisi #${idx + 1} (${p.items.length} Çeşit, ${p.sheetsToPrint.toLocaleString('tr-TR')} Levha)`;
  });

  // 9. Koşu Durumu (Search Status) Tespiti
  let searchStatus = 'VALID_PROPOSAL';
  if (sortedProposals.length === 0) {
    if (eligibleDemands.length === 0 && excludedDemands.length > 0) {
      searchStatus = 'DATA_INSUFFICIENT';
    } else if (isTimeoutReached) {
      searchStatus = 'SEARCH_LIMIT_REACHED';
    } else {
      searchStatus = 'NO_SOLUTION_FOUND';
    }
  } else if (isTimeoutReached) {
    searchStatus = 'SEARCH_LIMIT_REACHED';
  }

  const durationMs = Date.now() - startTime;
  const runId = `RUN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 10. Öneri Koşusu ve Önerileri Veritabanına Kaydet (Kalıcılık)
  try {
    await query(`
      INSERT INTO combination_proposal_runs (
        id, scope, tube_size_filter, filters,
        total_candidates, eligible_candidates, excluded_candidates,
        proposals_found, search_status, search_duration_ms,
        excluded_demands, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      runId, scope, tubeSize,
      JSON.stringify({ dateFrom, dateTo, selectedDemandIds, allowUnspecifiedColors }),
      rawDemands.length, eligibleDemands.length, excludedDemands.length,
      sortedProposals.length, searchStatus, durationMs,
      JSON.stringify(excludedDemands),
      user?.username || 'planner'
    ]);

    for (const prop of sortedProposals) {
      const propId = `PROP-${runId}-${prop.proposalNo}`;
      prop.id = propId;
      await query(`
        INSERT INTO combination_proposals (
          id, run_id, proposal_no, title, tube_size,
          raw_sheet_code, raw_sheet_name, raw_sheet_capacity,
          assembly_group_count, repeat_step,
          total_slots, used_slots, sheets_to_print,
          total_output_tubes, total_covered_demand, total_overproduction,
          unique_colors_count, unique_colors,
          template_verification_status, validation_warnings,
          items, score
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18,
          $19, $20,
          $21, $22
        )
      `, [
        propId, runId, prop.proposalNo, prop.title, prop.tubeSize,
        prop.rawSheetCode, prop.rawSheetName, prop.rawSheetCapacity,
        prop.assemblyGroupCount, prop.repeatStep,
        prop.totalSlots, prop.usedSlots, prop.sheetsToPrint,
        prop.totalOutputTubes, prop.totalCoveredDemand, prop.totalOverproduction,
        prop.uniqueColorsCount, JSON.stringify(prop.uniqueColors),
        prop.templateVerificationStatus, JSON.stringify(prop.validationWarnings),
        JSON.stringify(prop.items), prop.score
      ]);
    }
  } catch (err) {
    console.error('[combinationProposalService] Öneri kaydetme hatası:', err.message);
  }

  return {
    success: true,
    runId,
    searchStatus,
    durationMs,
    stats: {
      totalCandidates: rawDemands.length,
      eligibleCandidates: eligibleDemands.length,
      excludedCandidates: excludedDemands.length,
      proposalsFound: sortedProposals.length
    },
    proposals: sortedProposals,
    excludedDemands
  };
}

/**
 * 4. Seçilen Öneriyi Taslağa Al ve Rezerve Et (Idempotency ve Concurrency Korumalı)
 */
async function applyProposalToDraft({
  proposalId,
  idempotencyToken = null,
  notes = null,
  user = null
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Öneriyi Oku
    const propRes = await client.query(`
      SELECT * FROM combination_proposals
      WHERE id = $1 OR proposal_no = $1
      FOR UPDATE
    `, [proposalId]);

    if (propRes.rows.length === 0) {
      throw new Error(`Öneri kaydı bulunamadı: ${proposalId}`);
    }

    const proposal = propRes.rows[0];

    // Idempotency: Daha önce uygulandıysa doğrudan mevcut kombinasyonu dön
    if (proposal.is_applied_to_draft && proposal.applied_combination_id) {
      await client.query('COMMIT');
      return {
        success: true,
        alreadyApplied: true,
        combinationId: proposal.applied_combination_id,
        message: 'Bu öneri zaten taslağa alınmış ve rezerve edilmiştir.'
      };
    }

    const items = typeof proposal.items === 'string' ? JSON.parse(proposal.items) : (proposal.items || []);

    // 2. Eşzamanlılık Koruması: Açık Talepleri Kilitle ve Açık Miktar Denetimi Yap
    for (const it of items) {
      const sourceDemands = it.sourceDemands || [];
      for (const sd of sourceDemands) {
        if (!sd.printDemandId) continue;

        const demRes = await client.query(`
          SELECT id, remaining_open_quantity, status, version 
          FROM printed_sheet_demands 
          WHERE id = $1 
          FOR UPDATE
        `, [sd.printDemandId]);

        if (demRes.rows.length === 0) {
          throw new Error(`Açık talep bulunamadı: ${sd.printDemandId}`);
        }

        const curOpen = parseFloat(demRes.rows[0].remaining_open_quantity) || 0;
        const requiredQty = parseFloat(sd.allocatedQuantity) || 0;

        if (curOpen < requiredQty) {
          throw new Error(
            `CONFLICT_DEMAND_CHANGED: Talep ${sd.printDemandId} için açık miktar (${curOpen.toLocaleString('tr-TR')}), ` +
            `önerilen miktar olan (${requiredQty.toLocaleString('tr-TR')}) adedin altına düşmüştür. ` +
            `Başka bir kullanıcı veya işlem bu ihtiyacı rezerve etmiş olabilir.`
          );
        }
      }
    }

    // 3. Kombinasyon Kalemlerini Hazırla ve Taslak Oluştur
    const draftItems = items.map((it, idx) => ({
      slot_index: idx + 1,
      print_demand_id: it.printDemandId || it.sourceDemands?.[0]?.printDemandId || null,
      tube_stock_code: it.tubeStockCode,
      tube_stock_name: it.tubeStockName,
      print_stock_code: it.printStockCode,
      print_stock_name: it.printStockName,
      tube_size: it.tubeSize,
      repeats_count: it.repeatsCount,
      colors: it.colors,
      varnish: it.varnish,
      lacquer: it.lacquer,
      print_surface: it.printSurface
    }));

    // Mevcut createDraftCombination fonksiyonunu çağır (Rezervasyonlar ve sheet_combinations üretilir)
    const draftResult = await createDraftCombination({
      title: `${proposal.tube_size} Otomatik Öneri Taslağı (${proposal.proposal_no})`,
      tube_size: proposal.tube_size,
      raw_sheet_code: proposal.raw_sheet_code,
      sheets_to_print: proposal.sheets_to_print,
      items: draftItems,
      notes: notes || `Otomatik öneriden (${proposal.proposal_no}) dönüştürülmüştür.`,
      user,
      client
    });

    const combId = draftResult.combinationId || draftResult.id;
    const combNo = draftResult.combinationNo || draftResult.combination_no;

    // 4. Öneri Kaydını Güncelle (Uygulandı olarak işaretle)
    await client.query(`
      UPDATE combination_proposals
      SET 
        is_applied_to_draft = true,
        applied_combination_id = $1,
        applied_at = CURRENT_TIMESTAMP,
        applied_by = $2
      WHERE id = $3
    `, [combId, user?.username || 'planner', proposal.id]);

    await client.query('COMMIT');

    return {
      success: true,
      alreadyApplied: false,
      combination: {
        id: combId,
        combination_no: combNo,
        ...draftResult
      },
      message: `Öneri (${proposal.proposal_no}) başarıyla taslak kombinasyona (${combNo}) dönüştürüldü ve havuzda rezerve edildi.`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[combinationProposalService] applyProposalToDraft hatası:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 5. Son Öneri Koşularını ve Önerileri Listele
 */
async function getProposalRuns({ limit = 10 } = {}) {
  const res = await query(`
    SELECT * FROM combination_proposal_runs
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

async function getProposalById(proposalId) {
  const res = await query(`
    SELECT * FROM combination_proposals
    WHERE id = $1 OR proposal_no = $1
  `, [proposalId]);
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

module.exports = {
  generateCombinationProposals,
  applyProposalToDraft,
  getProposalRuns,
  getProposalById
};
