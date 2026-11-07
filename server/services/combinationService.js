const { query, getClient } = require('../db');

/**
 * Montaj Tekrar Kuralı Tablosu (18 Ebat - AGENTS.md ve capacities.json ile kilitli)
 * Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı
 */
const CAPACITY_RULES = {
  '45x100': { capacity: 48, repeatStep: 6, groupCount: 8 },
  '45x120': { capacity: 40, repeatStep: 5, groupCount: 8 },
  '45x140': { capacity: 36, repeatStep: 6, groupCount: 6 },
  '45x175': { capacity: 32, repeatStep: 4, groupCount: 8 },
  '45x200': { capacity: 28, repeatStep: 4, groupCount: 7 },
  '52x105': { capacity: 35, repeatStep: 5, groupCount: 7 },
  '52x128': { capacity: 30, repeatStep: 5, groupCount: 6 },
  '52x140': { capacity: 25, repeatStep: 5, groupCount: 5 },
  '52x161': { capacity: 25, repeatStep: 5, groupCount: 5 },
  '52x165': { capacity: 25, repeatStep: 5, groupCount: 5 },
  '52x195': { capacity: 20, repeatStep: 4, groupCount: 5 },
  '52x214': { capacity: 20, repeatStep: 4, groupCount: 5 },
  '52x234': { capacity: 15, repeatStep: 5, groupCount: 3 },
  '65x104': { capacity: 24, repeatStep: 4, groupCount: 6 },
  '65x165': { capacity: 16, repeatStep: 4, groupCount: 4 },
  '65x195': { capacity: 12, repeatStep: 3, groupCount: 4 },
  '65x240': { capacity: 12, repeatStep: 3, groupCount: 4 },
  '65x270': { capacity: 10, repeatStep: 2, groupCount: 5 },
  '65x300': { capacity: 8,  repeatStep: 2, groupCount: 4 }
};

/**
 * 1. Kombinasyon Kurallarını ve Geçerliliğini Doğrula (Backend Validasyonu)
 */
async function validateCombination({
  tube_size,
  raw_sheet_code,
  sheets_to_print = 1250,
  items = []
}) {
  const errors = [];
  const warnings = [];

  if (!tube_size) errors.push('Ebat (tube_size) belirtilmelidir.');
  if (!raw_sheet_code) errors.push('Ham levha kodu belirtilmelidir.');
  if (!items || items.length === 0) errors.push('Kombinasyona en az bir ürün eklenmelidir.');

  const capRule = CAPACITY_RULES[tube_size];
  if (!capRule) {
    errors.push(`Tanımsız veya geçersiz ebat: ${tube_size}`);
  }

  const capacity = capRule ? capRule.capacity : 20;
  const repeatStep = capRule ? capRule.repeatStep : 1;
  const minSheets = 1250;

  if (sheets_to_print < minSheets) {
    warnings.push(`Minimum baskı kuralı 1.250 levhadır. Belirtilen miktar (${sheets_to_print}) minimumun altındadır.`);
  }

  // Ebat ve Ham Levha Doğrulaması
  let totalRepeats = 0;
  const colorSet = new Set();
  const surfaces = new Set();
  const varnishes = new Set();
  const lacquers = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemSize = item.tube_size || tube_size;
    if (itemSize !== tube_size) {
      errors.push(`Satır ${i + 1} (${item.tube_stock_code}): Ebat uyuşmazlığı (${itemSize} !== ${tube_size}). Aynı montajda farklı çap/boy birleştirilemez.`);
    }

    const repeats = parseInt(item.repeats_count) || 0;
    if (repeats <= 0) {
      errors.push(`Satır ${i + 1} (${item.tube_stock_code}): Tekrar sayısı pozitif tam sayı olmalıdır.`);
    } else if (repeats % repeatStep !== 0) {
      errors.push(`Satır ${i + 1} (${item.tube_stock_code}): Tekrar sayısı (${repeats}), ebadın tekrar adımının (${repeatStep}) tam katı olmalıdır.`);
    }

    totalRepeats += repeats;

    // Renkler
    const colors = Array.isArray(item.colors) ? item.colors : [];
    colors.forEach(c => colorSet.add(c.trim().toUpperCase()));

    if (item.print_surface) surfaces.add(item.print_surface);
    if (item.varnish) varnishes.add(item.varnish);
    if (item.lacquer) lacquers.add(item.lacquer);
  }

  // Toplam Kapasite Kontrolü
  if (totalRepeats > capacity) {
    errors.push(`Kapasite aşımı: Montajdaki toplam tekrar (${totalRepeats}), levha kapasitesini (${capacity}) aşamaz.`);
  } else if (totalRepeats < capacity) {
    warnings.push(`Eksik kapasite: Montajda ${capacity - totalRepeats} göz boş kalmıştır (Dolu: ${totalRepeats}/${capacity}).`);
  }

  // Renk Sınırı Kontrolü (Varsayılan max 6 benzersiz renk)
  const uniqueColors = Array.from(colorSet);
  if (uniqueColors.length > 6) {
    errors.push(`Renk sınırı aşıldı: Montajda ${uniqueColors.length} benzersiz renk bulunmaktadır (${uniqueColors.join(', ')}). Matbaa kuralı gereği en fazla 6 renk izin verilir.`);
  }

  // Yüzey ve Lak Uyum Kontrolleri
  if (surfaces.size > 1) {
    warnings.push(`Farklı zemin/yüzey türleri birleştirildi: ${Array.from(surfaces).join(', ')}`);
  }
  if (lacquers.has('LAKLI') && lacquers.has('LAKSIZ')) {
    warnings.push('Laklı ve laksız ürünler aynı montajda birleştirilmiştir.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      tube_size,
      raw_sheet_code,
      capacity,
      repeatStep,
      usedSlots: totalRepeats,
      emptySlots: Math.max(0, capacity - totalRepeats),
      uniqueColorsCount: uniqueColors.length,
      uniqueColors,
      sheetsToPrint: sheets_to_print,
      totalOutputTubes: totalRepeats * sheets_to_print
    }
  };
}

/**
 * 2. Taslak Kombinasyon Oluştur (Rezervasyonlu & Eşzamanlılık Korumalı)
 */
async function createDraftCombination({
  title = null,
  tube_size,
  raw_sheet_code,
  sheets_to_print = 1250,
  items = [],
  notes = null,
  user = null
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Backend Validasyonu
    const validation = await validateCombination({
      tube_size,
      raw_sheet_code,
      sheets_to_print,
      items
    });

    if (!validation.isValid) {
      throw new Error(`Kombinasyon doğrulama hatası:\n- ${validation.errors.join('\n- ')}`);
    }

    const capRule = CAPACITY_RULES[tube_size] || { capacity: 20, repeatStep: 1, groupCount: 1 };
    const sheetsCount = Math.max(1, parseInt(sheets_to_print) || 1250);

    // 2. Kombinasyon Numarası Türet (Örn: KMB-202611-0001)
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `KMB-${ym}-%`;
    const seqRes = await client.query(`
      SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(combination_no, '^.*-', ''), '') AS INTEGER)), 0) + 1 as next_seq
      FROM sheet_combinations
      WHERE combination_no LIKE $1
    `, [prefix]);
    const seq = parseInt(seqRes.rows[0].next_seq) || 1;
    const combNo = `KMB-${ym}-${String(seq).padStart(4, '0')}`;
    const combId = `COMB-${combNo}`;

    // 3. İhtiyaçları SELECT FOR UPDATE ile Kilitle ve Rezervasyon Hesapla
    let totalOutputTubes = 0;
    let totalCoveredDemand = 0;
    let totalOverproduction = 0;
    const itemPlans = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const repeats = parseInt(it.repeats_count) || 0;
      const itemOutput = repeats * sheetsCount;
      totalOutputTubes += itemOutput;

      let demandRow = null;
      let allocatedDemandQty = 0;
      let overprodQty = itemOutput;

      if (it.print_demand_id) {
        // Eşzamanlılık ve Çift Rezervasyon Koruması: SELECT FOR UPDATE
        const demRes = await client.query(`
          SELECT * FROM printed_sheet_demands 
          WHERE id = $1 
          FOR UPDATE
        `, [it.print_demand_id]);

        if (demRes.rows.length === 0) {
          throw new Error(`Baskılı ihtiyaç kaydı bulunamadı: ${it.print_demand_id}`);
        }

        demandRow = demRes.rows[0];
        const openQty = parseFloat(demandRow.remaining_open_quantity) || 0;

        if (openQty <= 0) {
          throw new Error(`Talep ${demandRow.order_no || demandRow.tube_stock_code} zaten tamamen karşılanmıştır (Kalan Açık: 0).`);
        }

        // İhtiyaçtan karşılanan miktar: min(kalan açık, ürün çıktısı)
        allocatedDemandQty = Math.min(openQty, itemOutput);
        overprodQty = Math.max(0, itemOutput - allocatedDemandQty);

        totalCoveredDemand += allocatedDemandQty;
        totalOverproduction += overprodQty;

        // İhtiyaç kaydını güncelle: taslağa ayır
        const newAllocatedToDraft = (parseFloat(demandRow.allocated_to_draft) || 0) + allocatedDemandQty;
        const newRemainingOpen = Math.max(0, (parseFloat(demandRow.net_print_demand) || 0) - newAllocatedToDraft - (parseFloat(demandRow.covered_by_confirmed) || 0));

        let newStatus = 'PARTIAL';
        if (newRemainingOpen === 0) {
          newStatus = 'RESERVED';
        }

        await client.query(`
          UPDATE printed_sheet_demands
          SET 
            allocated_to_draft = $1,
            remaining_open_quantity = $2,
            status = $3,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newAllocatedToDraft, newRemainingOpen, newStatus, demandRow.id]);
      } else {
        totalOverproduction += itemOutput;
      }

      itemPlans.push({
        slotIndex: i + 1,
        printDemandId: demandRow ? demandRow.id : null,
        printStockCode: it.print_stock_code || (demandRow ? demandRow.print_stock_code : ''),
        printStockName: it.print_stock_name || (demandRow ? demandRow.print_stock_name : ''),
        tubeStockCode: it.tube_stock_code || (demandRow ? demandRow.tube_stock_code : ''),
        tubeStockName: it.tube_stock_name || (demandRow ? demandRow.tube_stock_name : ''),
        repeatsCount: repeats,
        allocatedDemandQuantity: allocatedDemandQty,
        overproductionQuantity: overprodQty,
        totalItemOutput: itemOutput,
        colors: it.colors || (demandRow ? demandRow.colors : []),
        varnish: it.varnish || (demandRow ? demandRow.varnish : null),
        lacquer: it.lacquer || (demandRow ? demandRow.lacquer : null)
      });
    }

    // 4. Kombinasyon Üst Kaydını Ekle (sheet_combinations)
    const combTitle = title || `${tube_size} Montajı (${combNo}) - ${validation.summary.usedSlots}/${capRule.capacity} Göz`;
    await client.query(`
      INSERT INTO sheet_combinations (
        id, combination_no, title, tube_size,
        raw_sheet_code, raw_sheet_name, raw_sheet_capacity,
        assembly_group_count, repeat_step,
        total_slots, used_slots, sheets_to_print, minimum_sheet_rule,
        total_output_tubes, total_covered_demand, total_overproduction,
        unique_colors_count, unique_colors,
        status, validation_warnings, notes,
        created_by, version
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18,
        'DRAFT', $19, $20,
        $21, 1
      )
    `, [
      combId, combNo, combTitle, tube_size,
      raw_sheet_code, raw_sheet_code, capRule.capacity,
      capRule.groupCount, capRule.repeatStep,
      capRule.capacity, validation.summary.usedSlots, sheetsCount, 1250,
      totalOutputTubes, totalCoveredDemand, totalOverproduction,
      validation.summary.uniqueColorsCount, JSON.stringify(validation.summary.uniqueColors),
      JSON.stringify(validation.warnings), notes,
      user?.username || 'planner'
    ]);

    // 5. Kombinasyon Kalemleri ve Rezervasyon Bağlantılarını Ekle
    for (const plan of itemPlans) {
      const itemRes = await client.query(`
        INSERT INTO sheet_combination_items (
          combination_id, slot_index, print_demand_id,
          print_stock_code, print_stock_name,
          tube_stock_code, tube_stock_name,
          repeats_count, allocated_demand_quantity, overproduction_quantity,
          total_item_output, colors, varnish, lacquer
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14
        ) RETURNING id
      `, [
        combId, plan.slotIndex, plan.printDemandId,
        plan.printStockCode, plan.printStockName,
        plan.tubeStockCode, plan.tubeStockName,
        plan.repeatsCount, plan.allocatedDemandQuantity, plan.overproductionQuantity,
        plan.totalItemOutput, JSON.stringify(plan.colors), plan.varnish, plan.lacquer
      ]);

      const itemId = itemRes.rows[0].id;

      if (plan.printDemandId && plan.allocatedDemandQuantity > 0) {
        await client.query(`
          INSERT INTO print_demand_reservations (
            print_demand_id, combination_id, combination_item_id,
            reservation_type, reserved_quantity
          ) VALUES ($1, $2, $3, 'DRAFT', $4)
        `, [plan.printDemandId, combId, itemId, plan.allocatedDemandQuantity]);
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      combinationId: combId,
      combinationNo: combNo,
      status: 'DRAFT',
      totalCoveredDemand,
      totalOverproduction,
      totalOutputTubes,
      itemCount: itemPlans.length
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[combinationService] createDraftCombination hatası:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 3. Kombinasyonu Onayla (Taslaktan Onaylıya Geçiş)
 *
 * - Rezervasyon tipi DRAFT -> CONFIRMED olur.
 * - İhtiyaç havuzunda allocated_to_draft düşer, covered_by_confirmed artar.
 * - Kalan açık = 0 ise durum COMPLETED olur.
 */
async function confirmCombination(combinationId, user = null) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const combRes = await client.query(`
      SELECT * FROM sheet_combinations 
      WHERE id = $1 
      FOR UPDATE
    `, [combinationId]);

    if (combRes.rows.length === 0) {
      throw new Error(`Kombinasyon bulunamadı: ${combinationId}`);
    }

    const comb = combRes.rows[0];
    if (comb.status === 'CONFIRMED') {
      await client.query('COMMIT');
      return { success: true, message: 'Kombinasyon zaten onaylanmış.' };
    }
    if (comb.status === 'CANCELLED') {
      throw new Error('İptal edilmiş bir kombinasyon onaylanamaz.');
    }

    // Rezervasyonları Oku
    const resRes = await client.query(`
      SELECT * FROM print_demand_reservations 
      WHERE combination_id = $1
    `, [combinationId]);

    for (const r of resRes.rows) {
      const demandId = r.print_demand_id;
      const qty = parseFloat(r.reserved_quantity) || 0;

      const demRes = await client.query(`
        SELECT * FROM printed_sheet_demands 
        WHERE id = $1 
        FOR UPDATE
      `, [demandId]);

      if (demRes.rows.length > 0) {
        const d = demRes.rows[0];
        const draftAlloc = Math.max(0, (parseFloat(d.allocated_to_draft) || 0) - qty);
        const confCover = (parseFloat(d.covered_by_confirmed) || 0) + qty;
        const openQty = Math.max(0, (parseFloat(d.net_print_demand) || 0) - draftAlloc - confCover);

        let newStatus = 'PARTIAL';
        if (openQty === 0) {
          newStatus = 'COMPLETED';
        }

        await client.query(`
          UPDATE printed_sheet_demands
          SET 
            allocated_to_draft = $1,
            covered_by_confirmed = $2,
            remaining_open_quantity = $3,
            status = $4,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [draftAlloc, confCover, openQty, newStatus, demandId]);
      }
    }

    // Rezervasyon tiplerini güncelle
    await client.query(`
      UPDATE print_demand_reservations 
      SET reservation_type = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
      WHERE combination_id = $1
    `, [combinationId]);

    // Kombinasyonu onayla
    await client.query(`
      UPDATE sheet_combinations
      SET 
        status = 'CONFIRMED',
        confirmed_by = $1,
        confirmed_at = CURRENT_TIMESTAMP,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [user?.username || 'planner', combinationId]);

    await client.query('COMMIT');
    return { success: true, combinationId, status: 'CONFIRMED' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[combinationService] confirmCombination hatası:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 4. Kombinasyonu İptal Et (Rezervasyonları ve Karşılamaları Serbest Bırak)
 */
async function cancelCombination(combinationId, user = null) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const combRes = await client.query(`
      SELECT * FROM sheet_combinations 
      WHERE id = $1 
      FOR UPDATE
    `, [combinationId]);

    if (combRes.rows.length === 0) {
      throw new Error(`Kombinasyon bulunamadı: ${combinationId}`);
    }

    const comb = combRes.rows[0];
    if (comb.status === 'CANCELLED') {
      await client.query('COMMIT');
      return { success: true, message: 'Kombinasyon zaten iptal edilmiş.' };
    }

    const isConfirmed = comb.status === 'CONFIRMED';

    // Rezervasyonları Geri Çek
    const resRes = await client.query(`
      SELECT * FROM print_demand_reservations 
      WHERE combination_id = $1
    `, [combinationId]);

    for (const r of resRes.rows) {
      const demandId = r.print_demand_id;
      const qty = parseFloat(r.reserved_quantity) || 0;

      const demRes = await client.query(`
        SELECT * FROM printed_sheet_demands 
        WHERE id = $1 
        FOR UPDATE
      `, [demandId]);

      if (demRes.rows.length > 0) {
        const d = demRes.rows[0];
        let draftAlloc = parseFloat(d.allocated_to_draft) || 0;
        let confCover = parseFloat(d.covered_by_confirmed) || 0;

        if (isConfirmed || r.reservation_type === 'CONFIRMED') {
          confCover = Math.max(0, confCover - qty);
        } else {
          draftAlloc = Math.max(0, draftAlloc - qty);
        }

        const openQty = Math.max(0, (parseFloat(d.net_print_demand) || 0) - draftAlloc - confCover);

        let newStatus = 'WAITING';
        if ((draftAlloc + confCover) > 0) {
          newStatus = openQty === 0 ? (confCover > 0 ? 'COMPLETED' : 'RESERVED') : 'PARTIAL';
        }

        await client.query(`
          UPDATE printed_sheet_demands
          SET 
            allocated_to_draft = $1,
            covered_by_confirmed = $2,
            remaining_open_quantity = $3,
            status = $4,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [draftAlloc, confCover, openQty, newStatus, demandId]);
      }
    }

    // Rezervasyon kayıtlarını sil
    await client.query(`
      DELETE FROM print_demand_reservations 
      WHERE combination_id = $1
    `, [combinationId]);

    // Kombinasyonu iptal et
    await client.query(`
      UPDATE sheet_combinations
      SET 
        status = 'CANCELLED',
        cancelled_by = $1,
        cancelled_at = CURRENT_TIMESTAMP,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [user?.username || 'planner', combinationId]);

    await client.query('COMMIT');
    return { success: true, combinationId, status: 'CANCELLED' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[combinationService] cancelCombination hatası:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 5. Kombinasyonları Listele
 */
async function getCombinations({ status = 'ALL', tubeSize = 'ALL' } = {}) {
  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (status !== 'ALL') {
    conditions.push(`sc.status = $${pIdx++}`);
    params.push(status);
  }

  if (tubeSize !== 'ALL') {
    conditions.push(`sc.tube_size = $${pIdx++}`);
    params.push(tubeSize);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      sc.*,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', sci.id,
            'slot_index', sci.slot_index,
            'print_demand_id', sci.print_demand_id,
            'print_stock_code', sci.print_stock_code,
            'print_stock_name', sci.print_stock_name,
            'tube_stock_code', sci.tube_stock_code,
            'tube_stock_name', sci.tube_stock_name,
            'repeats_count', sci.repeats_count,
            'allocated_demand_quantity', sci.allocated_demand_quantity,
            'overproduction_quantity', sci.overproduction_quantity,
            'total_item_output', sci.total_item_output,
            'colors', sci.colors,
            'varnish', sci.varnish,
            'lacquer', sci.lacquer
          ) ORDER BY sci.slot_index ASC)
          FROM sheet_combination_items sci
          WHERE sci.combination_id = sc.id
        ), '[]'::jsonb
      ) as items
    FROM sheet_combinations sc
    ${whereClause}
    ORDER BY sc.created_at DESC
  `;

  const res = await query(sql, params);
  return {
    success: true,
    count: res.rows.length,
    data: res.rows
  };
}

/**
 * 6. Tek Kombinasyon Detayı Getir
 */
async function getCombinationById(combinationId) {
  const res = await query(`
    SELECT 
      sc.*,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', sci.id,
            'slot_index', sci.slot_index,
            'print_demand_id', sci.print_demand_id,
            'print_stock_code', sci.print_stock_code,
            'print_stock_name', sci.print_stock_name,
            'tube_stock_code', sci.tube_stock_code,
            'tube_stock_name', sci.tube_stock_name,
            'repeats_count', sci.repeats_count,
            'allocated_demand_quantity', sci.allocated_demand_quantity,
            'overproduction_quantity', sci.overproduction_quantity,
            'total_item_output', sci.total_item_output,
            'colors', sci.colors,
            'varnish', sci.varnish,
            'lacquer', sci.lacquer
          ) ORDER BY sci.slot_index ASC)
          FROM sheet_combination_items sci
          WHERE sci.combination_id = sc.id
        ), '[]'::jsonb
      ) as items
    FROM sheet_combinations sc
    WHERE sc.id = $1
  `, [combinationId]);

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

module.exports = {
  CAPACITY_RULES,
  validateCombination,
  createDraftCombination,
  confirmCombination,
  cancelCombination,
  getCombinations,
  getCombinationById
};
