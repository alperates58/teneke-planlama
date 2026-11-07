const { query, getClient } = require('../db');

/**
 * Dinamik Kural ve Parametre Bağlamı Önbelleği
 */
let cachedRuleContext = null;
let cachedRuleTimestamp = 0;
const RULE_CACHE_TTL_MS = 15000; // 15 saniye önbellek

/**
 * Dinamik Kural ve Parametre Bağlamını Veritabanından Oku (Tek Kaynak Sözleşmesi)
 */
async function getRuleContext(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedRuleContext && (now - cachedRuleTimestamp) < RULE_CACHE_TTL_MS) {
    return cachedRuleContext;
  }

  try {
    // 1. Ebat Kapasiteleri (tube_capacities) - Tek Onaylı Kaynak
    const capRes = await query(`
      SELECT tube_size, units_per_sheet, assembly_group_count, repeat_step, reference_sheet_count
      FROM tube_capacities
      WHERE units_per_sheet > 0
    `);

    if (!capRes || capRes.rows.length === 0) {
      throw new Error('KAPASITE_PARAMETRELERI_BULUNAMADI: Veritabanında onaylı tube_capacities kaydı bulunamadı.');
    }

    const capacities = {};
    for (const r of capRes.rows) {
      const cap = parseInt(r.units_per_sheet, 10);
      const grp = parseInt(r.assembly_group_count, 10);
      const step = parseInt(r.repeat_step, 10);
      const minS = parseInt(r.reference_sheet_count, 10) || 1250;

      // Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı eşitliğini doğrula
      if (cap !== grp * step) {
        console.warn(`[combinationService] tube_capacities tutarsızlığı: ${r.tube_size} için ${cap} !== ${grp} * ${step}`);
      }

      capacities[r.tube_size] = {
        capacity: cap,
        groupCount: grp,
        repeatStep: step,
        minSheets: minS,
        version: 'v1'
      };
    }

    // 2. İş Kuralları (business_rules)
    const bizRes = await query(`
      SELECT code, condition_field, operator, parameter_value, is_active
      FROM business_rules
      WHERE is_active = true
    `);
    let maxColors = 6;
    let minSheets = 1250;
    for (const b of bizRes.rows) {
      if (b.condition_field === 'colors' && b.operator === 'max_count') {
        const val = parseInt(b.parameter_value, 10);
        if (!isNaN(val) && val > 0) maxColors = val;
      }
      if (b.condition_field === 'sheet_count' && b.operator === 'min_threshold') {
        const val = parseInt(b.parameter_value, 10);
        if (!isNaN(val) && val > 0) minSheets = val;
      }
    }

    // 3. Ürün Kombinasyon ve Lak Kuralları (product_combination_rules)
    const comboRes = await query(`
      SELECT code, name, rule_type, target_type, target_product_code, target_product_group,
             target_tube_size, target_lacquer_status, param_product_codes, param_product_groups,
             priority, is_active, valid_from, valid_to
      FROM product_combination_rules
      WHERE is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
      ORDER BY priority ASC
    `);

    // 4. Matbaa Yerleşim Kuralları (printing_press_rules)
    const pressRes = await query(`
      SELECT code, name, rule_type, applies_to_diameter, applies_to_height, applies_to_tube_size, priority
      FROM printing_press_rules
      WHERE is_active = true
      ORDER BY priority ASC
    `);

    // 5. Montaj Görünümü ve Şablon Doğrulamaları (sheet_layouts) - Tam Ebat ve Ham Levha Eşleşmesi
    const layoutRes = await query(`
      SELECT tube_size, raw_sheet_code, rows, cols, orientation, cell_order, verification_status
      FROM sheet_layouts
    `);
    const layouts = new Map();
    for (const l of layoutRes.rows) {
      // Şablonlar kesinlikle (tube_size + raw_sheet_code) anahtarıyla saklanır; sessiz genel fallback yapılmaz!
      if (l.raw_sheet_code) {
        const exactKey = `${l.tube_size}__${l.raw_sheet_code}`;
        layouts.set(exactKey, l);
      }
    }

    cachedRuleContext = {
      capacities,
      maxColors,
      minSheets,
      combinationRules: comboRes.rows,
      hasForbidMixedLacquer: comboRes.rows.some(r => r.rule_type === 'FORBID_MIXED_LACQUER'),
      hasOnlyWithUnlacquered: comboRes.rows.some(r => r.rule_type === 'ONLY_WITH_UNLACQUERED'),
      hasOnlyWithLacquered: comboRes.rows.some(r => r.rule_type === 'ONLY_WITH_LACQUERED'),
      pressRules: pressRes.rows,
      layouts,
      versionTimestamp: now
    };
    cachedRuleTimestamp = now;
    return cachedRuleContext;
  } catch (err) {
    if (cachedRuleContext) {
      console.warn('[combinationService] Dinamik DB kural okuma uyarısı, önbellekteki kurallar kullanılıyor:', err.message);
      return cachedRuleContext;
    }
    console.error('[combinationService] Dinamik DB kural okuma kritik hatası:', err.message);
    throw err;
  }
}

/**
 * 1. Ortak Sunucu Doğrulayıcısı (Backend Validasyonu)
 * Öneri üretimi, manuel taslak ve onay aynı doğrulayıcıyı kullanır.
 */
async function validateCombination({
  tube_size,
  raw_sheet_code,
  sheets_to_print = 1250,
  items = [],
  options = {}
}) {
  const errors = [];
  const warnings = [];

  const isConfirm = !!options.isConfirm;
  const isSimulation = !!options.isSimulation;
  const dbClient = options.client || null;

  if (!tube_size) errors.push('Ebat (tube_size) belirtilmelidir.');
  if (!raw_sheet_code) errors.push('Ham levha kodu belirtilmelidir.');
  if (!items || items.length === 0) errors.push('Kombinasyona en az bir ürün eklenmelidir.');

  // 1. Dinamik Kural Bağlamını Yükle
  const ruleContext = await getRuleContext();
  const capRule = ruleContext.capacities ? ruleContext.capacities[tube_size] : null;
  if (!capRule) {
    errors.push(`EBAT_KAPASITE_TANIMSIZ: ${tube_size} ebadı için onaylı kapasite parametresi bulunamadı.`);
  }

  const capacity = capRule ? capRule.capacity : 0;
  const repeatStep = capRule ? capRule.repeatStep : 1;
  const minSheets = ruleContext.minSheets || 1250;
  const maxColors = ruleContext.maxColors || 6;

  if (sheets_to_print < minSheets) {
    warnings.push(`Minimum baskı kuralı ${minSheets.toLocaleString('tr-TR')} levhadır. Belirtilen miktar (${sheets_to_print}) minimumun altındadır.`);
  }

  // 2. Teknik Kartları Veritabanından Doğrula (İstemci payload'ına güvenme)
  const stockCodes = items
    .map(it => it.tube_stock_code || it.stock_code || it.print_stock_code)
    .filter(Boolean);

  const demandIds = items
    .map(it => it.print_demand_id || (it.source_demands?.[0]?.print_demand_id || it.sourceDemands?.[0]?.printDemandId))
    .filter(Boolean);

  let techMap = new Map();
  let recipeRawSheetMap = new Map();

  if (!options.skipDbCheck && (stockCodes.length > 0 || demandIds.length > 0)) {
    try {
      const q = dbClient ? dbClient.query.bind(dbClient) : query;

      if (demandIds.length > 0) {
        const demTechRes = await q(`
          SELECT id, tube_stock_code, print_stock_code, tube_size, raw_sheet_code,
                 colors, print_surface, lacquer, varnish
          FROM printed_sheet_demands
          WHERE id = ANY($1)
        `, [demandIds]);

        for (const dr of demTechRes.rows) {
          const sKey = dr.tube_stock_code || dr.print_stock_code;
          const cardData = {
            stock_code: sKey,
            stock_name: dr.tube_stock_code,
            tube_size: dr.tube_size,
            raw_sheet_code: dr.raw_sheet_code,
            colors: Array.isArray(dr.colors) ? dr.colors : JSON.parse(dr.colors || '[]'),
            print_surface: dr.print_surface,
            lacquer: dr.lacquer,
            varnish: dr.varnish
          };
          techMap.set(dr.id, cardData);
          if (sKey) techMap.set(sKey, cardData);
        }
      }

      if (stockCodes.length > 0) {
        const techRes = await q(`
          SELECT stock_code, stock_name, tube_size, diameter_mm, height_mm,
                 raw_sheet_code, raw_sheet_stock_code_candidate,
                 print_surface, varnish, lacquer, inside_coating, colors, is_active
          FROM product_technicals
          WHERE stock_code = ANY($1)
        `, [stockCodes]);

        for (const row of techRes.rows) {
          techMap.set(row.stock_code, row);
        }
      }

      // Reçetedeki ham levha ilişkisini oku (çelişki denetimi için)
      if (stockCodes.length > 0) {
        const recipeRes = await q(`
          SELECT parent_stock_code, child_stock_code
          FROM erp_recipe_links
          WHERE parent_stock_code = ANY($1)
            AND child_category = 'HAMLEVHA'
        `, [stockCodes]);

        for (const r of recipeRes.rows) {
          recipeRawSheetMap.set(r.parent_stock_code, r.child_stock_code);
        }
      }
    } catch (dbErr) {
      if (!isSimulation) {
        console.warn('[combinationService] Teknik kart doğrulama sorgusu uyarısı:', dbErr.message);
      }
    }
  }

  // 3. Ebat, Ham Levha, Tekrar Adımı ve Satır/Sütun Homojenliği
  let totalRepeats = 0;
  const colorSet = new Set();
  const surfaces = new Set();
  const lacquers = new Set();
  const productCodesInComb = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sCode = item.tube_stock_code || item.stock_code || item.print_stock_code || `URUN-${i + 1}`;
    productCodesInComb.push(sCode);

    const techCard = techMap.get(sCode) || (item.print_demand_id ? techMap.get(item.print_demand_id) : null);

    // Eksik teknik kart kontrolü (Simülasyonda esnek, gerçek süreçte kesin ret)
    if (!techCard && !isSimulation && !options.skipDbCheck) {
      errors.push(`EKSIK_TEKNIK_KART: ${sCode} için kayıtlı onaylı teknik kart bulunamadı.`);
    }

    // Gerçek teknik verileri öncelikle kayıtlı karttan al
    const actualRawSheet = techCard
      ? (techCard.raw_sheet_code || techCard.raw_sheet_stock_code_candidate)
      : (item.raw_sheet_code || raw_sheet_code);

    const actualColors = (techCard && techCard.colors && techCard.colors.length > 0)
      ? techCard.colors
      : (item.colors || []);

    const actualSurface = (techCard && techCard.print_surface && techCard.print_surface !== 'BELİRTİLMEMİŞ')
      ? techCard.print_surface
      : (item.print_surface || 'EMAYE');

    const actualLacquer = (techCard && techCard.lacquer && techCard.lacquer !== 'BELİRTİLMEMİŞ')
      ? techCard.lacquer
      : (item.lacquer || null);

    // Ebat Denetimi
    const itemSize = (techCard && techCard.tube_size) ? techCard.tube_size : (item.tube_size || tube_size);
    if (itemSize !== tube_size) {
      errors.push(`Satır ${i + 1} (${sCode}): Ebat uyuşmazlığı (${itemSize} !== ${tube_size}). Aynı montajda farklı çap/boy birleştirilemez.`);
    }

    // Onaylı Ham Levha Uyumu Denetimi
    if (actualRawSheet && raw_sheet_code && actualRawSheet !== raw_sheet_code) {
      errors.push(`HAM_LEVHA_UYUMSUZ: ${sCode} için onaylı ham levha (${actualRawSheet}), kombinasyonun ham levhası (${raw_sheet_code}) ile uyuşmuyor.`);
    }

    // Teknik Kart ve Reçete Ham Levha Çelişkisi Denetimi
    const recipeRawSheet = recipeRawSheetMap.get(sCode);
    if (recipeRawSheet && actualRawSheet && recipeRawSheet !== actualRawSheet) {
      errors.push(`RECETE_HAM_LEVHA_CELISKISI: ${sCode} için teknik kart ham levhası (${actualRawSheet}) ile reçetedeki ham levha (${recipeRawSheet}) çelişmektedir.`);
    }

    // Tekrar Sayısı ve Adım Denetimi
    const repeats = parseInt(item.repeats_count, 10) || 0;
    if (repeats <= 0) {
      errors.push(`Satır ${i + 1} (${sCode}): Tekrar sayısı pozitif tam sayı olmalıdır.`);
    } else if (repeatStep > 0 && repeats % repeatStep !== 0) {
      errors.push(`Satır ${i + 1} (${sCode}): Tekrar sayısı (${repeats}), ebadın tekrar adımının (${repeatStep}) tam katı olmalıdır.`);
    }

    totalRepeats += repeats;

    // Renkler
    actualColors.forEach(c => {
      if (typeof c === 'string' && c.trim()) colorSet.add(c.trim().toUpperCase());
    });

    if (actualSurface) surfaces.add(actualSurface.toUpperCase());

    // Bilinmeyen Lak Kuralı: "Bilinmeyen lakı laksız sayma. Açık yasak izinden üstün olsun."
    if (!actualLacquer || actualLacquer === 'BELİRTİLMEMİŞ' || actualLacquer === 'BİLİNMİYOR' || actualLacquer === 'TANIMSIZ') {
      errors.push(`LAK_DURUMU_BELIRSIZ: ${sCode} ürününün lak durumu tanımlanmamış / belirsizdir. Bilinmeyen lak laksız kabul edilemez.`);
    } else {
      lacquers.add(actualLacquer.toUpperCase());
    }
  }

  // 4. Toplam Kapasite Kontrolü
  if (capacity > 0) {
    if (totalRepeats > capacity) {
      errors.push(`Kapasite aşımı: Montajdaki toplam tekrar (${totalRepeats}), levha kapasitesini (${capacity}) aşamaz.`);
    } else if (totalRepeats < capacity) {
      warnings.push(`Eksik kapasite: Montajda ${capacity - totalRepeats} göz boş kalmıştır (Dolu: ${totalRepeats}/${capacity}).`);
    }
  }

  // 5. Renk Sınırı Kontrolü (Dinamik maxColors)
  const uniqueColors = Array.from(colorSet);
  if (uniqueColors.length > maxColors) {
    errors.push(`Renk sınırı aşıldı: Montajda ${uniqueColors.length} benzersiz renk bulunmaktadır (${uniqueColors.join(', ')}). Matbaa kuralı gereği en fazla ${maxColors} renk izin verilir.`);
  }

  // 6. Zemin / Yüzey Türü Uyumu
  if (surfaces.size > 1) {
    errors.push(`Farklı zemin/yüzey türleri aynı montajda birleştirilemez: ${Array.from(surfaces).join(', ')}`);
  }

  // 7. Dokümante Edilmiş Tüm Ürün/Lak Kombinasyon Kurallarının Değerlendirilmesi
  const activeRules = ruleContext.combinationRules || [];

  // A. Lak Kuralları
  if (lacquers.has('LAKLI') && lacquers.has('LAKSIZ')) {
    errors.push('KRL-LAK-YASAK: Laklı ve laksız ürünlerin aynı montajda birleştirilmesi kural gereği kesinlikle yasaktır.');
  }

  for (const rule of activeRules) {
    if (rule.rule_type === 'ONLY_WITH_UNLACQUERED') {
      if (lacquers.has('LAKSIZ') && lacquers.size > 1) {
        errors.push(`KRL-LAKSIZ-TEK: Laksız ürünler yalnız laksız ürünlerle kombine edilebilir (${rule.name || rule.code}).`);
      }
    }
    if (rule.rule_type === 'ONLY_WITH_LACQUERED') {
      if (lacquers.has('LAKLI') && (lacquers.size > 1 || lacquers.has('LAKSIZ'))) {
        errors.push(`KRL-LAKLI-TEK: Laklı ürünler yalnız laklı ürünlerle kombine edilebilir (${rule.name || rule.code}).`);
      }
    }

    // B. Özel Seri Solo İş Kuralı (EXCLUSIVE_SOLO_ONLY)
    if (rule.rule_type === 'EXCLUSIVE_SOLO_ONLY') {
      const soloTarget = rule.target_product_code;
      if (soloTarget && productCodesInComb.includes(soloTarget)) {
        const uniqueProducts = new Set(productCodesInComb);
        if (uniqueProducts.size > 1) {
          errors.push(`SOLO_URUN_IHLALI: ${soloTarget} ürünü özel seri kuralı (${rule.code}) gereği yalnız tek başına basılabilir, başka ürünlerle birleştirilemez.`);
        }
      }
    }

    // C. Çapraz Bulaşma / Yasaklı Ürün Çiftleri (FORBIDDEN_WITH_PRODUCTS - Çift Yönlü Denetim)
    if (rule.rule_type === 'FORBIDDEN_WITH_PRODUCTS') {
      const target = rule.target_product_code;
      const forbiddenList = Array.isArray(rule.param_product_codes)
        ? rule.param_product_codes
        : (typeof rule.param_product_codes === 'string' ? JSON.parse(rule.param_product_codes || '[]') : []);

      for (const forb of forbiddenList) {
        // Çift yönlü: Target ve Forb aynı montajda bulunamaz
        if (productCodesInComb.includes(target) && productCodesInComb.includes(forb)) {
          errors.push(`CAPRAZ_BULASMA_YASAGI: ${target} ile ${forb} ürünleri kural (${rule.code}: ${rule.name}) gereği aynı montajda birleştirilemez.`);
        }
      }
    }
  }

  // 8. Fiziksel Montaj Şablonu ve Yerleşim Doğrulaması (sheet_layouts)
  // KESİN KURAL: Başka levhanın şablonuna sessiz fallback yapma!
  const exactLayoutKey = `${tube_size}__${raw_sheet_code}`;
  const layout = ruleContext.layouts ? ruleContext.layouts.get(exactLayoutKey) : null;
  let templateVerificationStatus = 'unverified';

  if (!layout) {
    templateVerificationStatus = 'unverified';
    warnings.push(`Bu ebat (${tube_size}) ve ham levha (${raw_sheet_code}) için kayıtlı fiziksel montaj şablonu bulunamadı; taslak olarak incelenebilir ancak üretim onayı alamaz.`);
    if (isConfirm) {
      errors.push(`URETIM_ONAYI_ENGELLENDI: ${tube_size} ebadı ve ${raw_sheet_code} ham levhası için onaylı (verified) montaj şablonu bulunamamıştır.`);
    }
  } else {
    templateVerificationStatus = layout.verification_status || 'unverified';

    // Şablon hücre homojenliği kontrolü
    const totalCells = layout.rows * layout.cols;
    if (capacity > 0 && totalCells !== capacity) {
      errors.push(`Şablon hücre uyuşmazlığı: Şablondaki hücre sayısı (${layout.rows}x${layout.cols}=${totalCells}), levha kapasitesi (${capacity}) ile uyuşmuyor.`);
    }

    // Üretim onayı için şablonun kesinlikle 'verified' olması şarttır
    if (isConfirm && templateVerificationStatus !== 'verified') {
      errors.push(`URETIM_ONAYI_ENGELLENDI: Fiziksel montaj şablonu onaylanmamış (${templateVerificationStatus}) kombinasyonlar üretim onayı alamaz.`);
    }
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
      groupCount: capRule ? capRule.groupCount : 1,
      usedSlots: totalRepeats,
      emptySlots: Math.max(0, capacity - totalRepeats),
      uniqueColorsCount: uniqueColors.length,
      uniqueColors,
      sheetsToPrint: sheets_to_print,
      totalOutputTubes: totalRepeats * sheets_to_print,
      templateVerificationStatus,
      ruleVersionTimestamp: ruleContext.versionTimestamp
    }
  };
}

/**
 * 2. Taslak Kombinasyon Oluştur (Rezervasyonlu & Çoklu İhtiyaç Bağlantılı)
 */
async function createDraftCombination({
  title = null,
  tube_size,
  raw_sheet_code,
  sheets_to_print = 1250,
  items = [],
  notes = null,
  user = null,
  is_simulation = false,
  client: passedClient = null,
  options = {}
}) {
  const client = passedClient || await getClient();
  const shouldManageTransaction = !passedClient;
  try {
    if (shouldManageTransaction) await client.query('BEGIN');

    // 1. Ortak Sunucu Doğrulayıcısı (Backend Validasyonu)
    const validation = await validateCombination({
      tube_size,
      raw_sheet_code,
      sheets_to_print,
      items,
      options: {
        isConfirm: false,
        isSimulation: !!is_simulation,
        skipDbCheck: !!options.skipDbCheck,
        client
      }
    });

    if (!validation.isValid) {
      throw new Error(`Kombinasyon doğrulama hatası:\n- ${validation.errors.join('\n- ')}`);
    }

    const ruleContext = await getRuleContext();
    const capRule = ruleContext.capacities[tube_size];
    if (!capRule) {
      throw new Error(`EBAT_KAPASITE_TANIMSIZ: ${tube_size} ebadı için onaylı kapasite parametresi bulunamadı.`);
    }

    const sheetsCount = Math.max(1, parseInt(sheets_to_print, 10) || 1250);

    // 2. Kombinasyon Numarası Türet (Örn: KMB-202611-0001)
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `KMB-${ym}-%`;
    const seqRes = await client.query(`
      SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(combination_no, '^.*-', ''), '') AS INTEGER)), 0) + 1 as next_seq
      FROM sheet_combinations
      WHERE combination_no LIKE $1
    `, [prefix]);
    const seq = parseInt(seqRes.rows[0].next_seq, 10) || 1;
    const combNo = `KMB-${ym}-${String(seq).padStart(4, '0')}`;
    const combId = `COMB-${combNo}`;

    // 3. Çoklu İhtiyaç Bağlantılarını Koru ve Rezervasyon Defterine Kaydet
    let totalOutputTubes = 0;
    let totalCoveredDemand = 0;
    let totalOverproduction = 0;
    const itemPlans = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const repeats = parseInt(it.repeats_count, 10) || 0;
      const itemOutput = repeats * sheetsCount;
      totalOutputTubes += itemOutput;

      let itemAllocatedDemand = 0;
      let itemOverprod = itemOutput;
      const itemReservations = [];

      const sourceDemands = it.source_demands || it.sourceDemands || [];

      if (sourceDemands.length > 0) {
        // Çoklu İhtiyaç Bağlantısı: Her kaynak ihtiyacı ayrı ayrı kilitle ve rezerve et
        for (const sd of sourceDemands) {
          const demId = sd.print_demand_id || sd.printDemandId;
          if (!demId) continue;

          const demRes = await client.query(`
            SELECT * FROM printed_sheet_demands 
            WHERE id = $1 
            FOR UPDATE
          `, [demId]);

          if (demRes.rows.length === 0) {
            throw new Error(`Baskılı ihtiyaç kaydı bulunamadı: ${demId}`);
          }

          const demandRow = demRes.rows[0];
          const curOpen = parseFloat(demandRow.remaining_open_quantity) || 0;
          const reqAlloc = parseFloat(sd.allocated_quantity || sd.allocatedQuantity) || 0;

          if (curOpen < reqAlloc) {
            throw new Error(
              `CONFLICT_DEMAND_CHANGED: Talep ${demandRow.order_no || demandRow.tube_stock_code || demId} için açık miktar ` +
              `(${curOpen.toLocaleString('tr-TR')}), ayrılmak istenen (${reqAlloc.toLocaleString('tr-TR')}) adedin altına düşmüştür.`
            );
          }

          itemAllocatedDemand += reqAlloc;

          // İhtiyaç kaydını güncelle: taslağa ayır
          const newAllocatedToDraft = (parseFloat(demandRow.allocated_to_draft) || 0) + reqAlloc;
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

          itemReservations.push({
            printDemandId: demandRow.id,
            reservedQuantity: reqAlloc
          });
        }

        itemOverprod = Math.max(0, itemOutput - itemAllocatedDemand);
        totalCoveredDemand += itemAllocatedDemand;
        totalOverproduction += itemOverprod;
      } else if (it.print_demand_id) {
        // Tekil İhtiyaç Bağlantısı (Fallback)
        const demRes = await client.query(`
          SELECT * FROM printed_sheet_demands 
          WHERE id = $1 
          FOR UPDATE
        `, [it.print_demand_id]);

        if (demRes.rows.length === 0) {
          throw new Error(`Baskılı ihtiyaç kaydı bulunamadı: ${it.print_demand_id}`);
        }

        const demandRow = demRes.rows[0];
        const openQty = parseFloat(demandRow.remaining_open_quantity) || 0;

        if (openQty <= 0) {
          throw new Error(`Talep ${demandRow.order_no || demandRow.tube_stock_code} zaten tamamen karşılanmıştır (Kalan Açık: 0).`);
        }

        const allocatedDemandQty = Math.min(openQty, itemOutput);
        const overprodQty = Math.max(0, itemOutput - allocatedDemandQty);

        totalCoveredDemand += allocatedDemandQty;
        totalOverproduction += overprodQty;
        itemAllocatedDemand = allocatedDemandQty;
        itemOverprod = overprodQty;

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

        itemReservations.push({
          printDemandId: demandRow.id,
          reservedQuantity: allocatedDemandQty
        });
      } else {
        totalOverproduction += itemOutput;
      }

      itemPlans.push({
        slotIndex: i + 1,
        printDemandId: it.print_demand_id || (sourceDemands[0] ? (sourceDemands[0].print_demand_id || sourceDemands[0].printDemandId) : null),
        sourceDemands: sourceDemands,
        reservations: itemReservations,
        printStockCode: it.print_stock_code || '',
        printStockName: it.print_stock_name || '',
        tubeStockCode: it.tube_stock_code || '',
        tubeStockName: it.tube_stock_name || '',
        repeatsCount: repeats,
        allocatedDemandQuantity: itemAllocatedDemand,
        overproductionQuantity: itemOverprod,
        totalItemOutput: itemOutput,
        colors: it.colors || [],
        varnish: it.varnish || null,
        lacquer: it.lacquer || null
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
        created_by, is_simulation, parameter_version, template_verification_status, version
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18,
        'DRAFT', $19, $20,
        $21, $22, $23, $24, 1
      )
    `, [
      combId, combNo, combTitle, tube_size,
      raw_sheet_code, raw_sheet_code, capRule.capacity,
      capRule.groupCount, capRule.repeatStep,
      capRule.capacity, validation.summary.usedSlots, sheetsCount, 1250,
      totalOutputTubes, totalCoveredDemand, totalOverproduction,
      validation.summary.uniqueColorsCount, JSON.stringify(validation.summary.uniqueColors),
      JSON.stringify(validation.warnings), notes,
      user?.username || 'planner',
      !!is_simulation,
      String(capRule.version || 'v1'),
      validation.summary.templateVerificationStatus || 'unverified'
    ]);

    // 5. Kombinasyon Kalemleri ve Ayrı Rezervasyon Bağlantılarını Kaydet
    for (const plan of itemPlans) {
      const itemRes = await client.query(`
        INSERT INTO sheet_combination_items (
          combination_id, slot_index, print_demand_id,
          print_stock_code, print_stock_name,
          tube_stock_code, tube_stock_name,
          repeats_count, allocated_demand_quantity, overproduction_quantity,
          total_item_output, colors, varnish, lacquer, source_demands
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14, $15
        ) RETURNING id
      `, [
        combId, plan.slotIndex, plan.printDemandId,
        plan.printStockCode, plan.printStockName,
        plan.tubeStockCode, plan.tubeStockName,
        plan.repeatsCount, plan.allocatedDemandQuantity, plan.overproductionQuantity,
        plan.totalItemOutput, JSON.stringify(plan.colors), plan.varnish, plan.lacquer,
        JSON.stringify(plan.sourceDemands || [])
      ]);

      const itemId = itemRes.rows[0].id;

      // Her kaynak talep için rezervasyon defterine (print_demand_reservations) ayrı bağlantı ekle
      for (const resv of plan.reservations) {
        if (resv.printDemandId && resv.reservedQuantity > 0) {
          await client.query(`
            INSERT INTO print_demand_reservations (
              print_demand_id, combination_id, combination_item_id,
              reservation_type, reserved_quantity
            ) VALUES ($1, $2, $3, 'DRAFT', $4)
          `, [resv.printDemandId, combId, itemId, resv.reservedQuantity]);
        }
      }
    }

    if (shouldManageTransaction) {
      await client.query('COMMIT');
    }

    return {
      success: true,
      combinationId: combId,
      combinationNo: combNo,
      status: 'DRAFT',
      totalCoveredDemand,
      totalOverproduction,
      totalOutputTubes,
      itemCount: itemPlans.length,
      isSimulation: !!is_simulation,
      parameterVersion: String(capRule.version || 'v1'),
      templateVerificationStatus: validation.summary.templateVerificationStatus
    };
  } catch (err) {
    if (shouldManageTransaction) {
      await client.query('ROLLBACK');
    }
    console.error('[combinationService] createDraftCombination hatası:', err.message);
    throw err;
  } finally {
    if (shouldManageTransaction) {
      client.release();
    }
  }
}

/**
 * 3. Kombinasyonu Onayla (Üretim Onayı & Nihai Doğrulama)
 */
async function confirmCombination(combinationId, user = null, options = {}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Kombinasyonu Oku ve Kilitle
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

    // 2. Simülasyon Koruması: Simülasyon kombinasyonları kesinlikle onaylanamaz!
    if (comb.is_simulation) {
      throw new Error('SIMULATION_CANNOT_BE_CONFIRMED: Simülasyon önerisinden üretilen kombinasyonlar üretim onayı alamaz ve siparişe dönüştürülemez.');
    }

    // 3. Bağlı Talepleri ve Rezervasyonları Oku
    const resRes = await client.query(`
      SELECT * FROM print_demand_reservations 
      WHERE combination_id = $1
    `, [combinationId]);

    // İnceleme Uyarısı Kontrolü: NEEDS_REVIEW durumundaki talep varsa onayı engelle
    for (const r of resRes.rows) {
      const demRes = await client.query(`
        SELECT id, status, remaining_open_quantity, net_print_demand, tube_stock_code
        FROM printed_sheet_demands 
        WHERE id = $1 
        FOR UPDATE
      `, [r.print_demand_id]);

      if (demRes.rows.length > 0) {
        const d = demRes.rows[0];
        if (d.status === 'NEEDS_REVIEW') {
          throw new Error(
            `NEEDS_REVIEW_BLOCKED: Kombinasyona bağlı talep (${d.id} - ${d.tube_stock_code}) ` +
            `plan değişikliği veya eksiklik nedeniyle 'NEEDS_REVIEW' durumundadır. İnceleme tamamlanmadan üretim onayı verilemez.`
          );
        }
      }
    }

    // 4. Kombinasyon Kalemlerini Oku ve Güncel Kurallarla Yeniden Doğrula
    const itemRowsRes = await client.query(`
      SELECT * FROM sheet_combination_items
      WHERE combination_id = $1
      ORDER BY slot_index ASC
    `, [combinationId]);

    const itemsForValidation = itemRowsRes.rows.map(r => ({
      slot_index: r.slot_index,
      print_demand_id: r.print_demand_id,
      source_demands: typeof r.source_demands === 'string' ? JSON.parse(r.source_demands || '[]') : (r.source_demands || []),
      tube_stock_code: r.tube_stock_code,
      print_stock_code: r.print_stock_code,
      tube_size: comb.tube_size,
      repeats_count: r.repeats_count,
      colors: Array.isArray(r.colors) ? r.colors : JSON.parse(r.colors || '[]'),
      varnish: r.varnish,
      lacquer: r.lacquer,
      print_surface: r.print_surface
    }));

    const finalValidation = await validateCombination({
      tube_size: comb.tube_size,
      raw_sheet_code: comb.raw_sheet_code,
      sheets_to_print: comb.sheets_to_print,
      items: itemsForValidation,
      options: {
        isConfirm: true, // Onay kriterleri: Doğrulanmış şablon zorunlu, kural/teknik kart güncelliği
        skipDbCheck: !!options.skipDbCheck,
        client
      }
    });

    if (!finalValidation.isValid) {
      throw new Error(
        `URETIM_ONAYI_ENGELLENDI: Kombinasyon güncel kurallara veya teknik tanımlara artık uymamaktadır:\n- ` +
        finalValidation.errors.join('\n- ')
      );
    }

    // 5. Talepleri Güncelle: Taslaktan Onaylı Karşılamaya Aktar
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

    // 6. Rezervasyon Tiplerini CONFIRMED Yap
    await client.query(`
      UPDATE print_demand_reservations 
      SET reservation_type = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
      WHERE combination_id = $1
    `, [combinationId]);

    // 7. Kombinasyonu Onayla
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
    console.error('[combinationService] confirmCombination hatası:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 4. Kombinasyonu İptal Et (Tüm Çoklu Bağlantıları ve Açık Miktarları Eksiksiz İade Et)
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

    // Rezervasyonları Defterden Oku ve Her Bağlantıyı Geri Aç
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

    // Rezervasyon Kayıtlarını Sil
    await client.query(`
      DELETE FROM print_demand_reservations
      WHERE combination_id = $1
    `, [combinationId]);

    // Kombinasyon Durumunu CANCELLED Yap
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
    console.error('[combinationService] cancelCombination hatası:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 5. Kombinasyon Listesini Getir
 */
async function getCombinationsList(filters = {}) {
  const { status = 'ALL', tube_size = 'ALL' } = filters;
  const whereClauses = [];
  const params = [];

  if (status !== 'ALL') {
    params.push(status);
    whereClauses.push(`c.status = $${params.length}`);
  }

  if (tube_size !== 'ALL') {
    params.push(tube_size);
    whereClauses.push(`c.tube_size = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      c.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ci.id,
            'slot_index', ci.slot_index,
            'print_demand_id', ci.print_demand_id,
            'print_stock_code', ci.print_stock_code,
            'print_stock_name', ci.print_stock_name,
            'tube_stock_code', ci.tube_stock_code,
            'tube_stock_name', ci.tube_stock_name,
            'repeats_count', ci.repeats_count,
            'allocated_demand_quantity', ci.allocated_demand_quantity,
            'overproduction_quantity', ci.overproduction_quantity,
            'total_item_output', ci.total_item_output,
            'colors', ci.colors,
            'varnish', ci.varnish,
            'lacquer', ci.lacquer,
            'source_demands', ci.source_demands
          ) ORDER BY ci.slot_index ASC
        ) FILTER (WHERE ci.id IS NOT NULL), '[]'::json
      ) as items
    FROM sheet_combinations c
    LEFT JOIN sheet_combination_items ci ON c.id = ci.combination_id
    ${whereSql}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const res = await query(sql, params);
  return {
    success: true,
    count: res.rows.length,
    data: res.rows
  };
}

/**
 * 6. Tek Kombinasyon Detayı ve Rezervasyonlarını Getir
 */
async function getCombinationById(combinationId) {
  const combRes = await query(`
    SELECT * FROM sheet_combinations WHERE id = $1
  `, [combinationId]);

  if (combRes.rows.length === 0) return null;
  const combination = combRes.rows[0];

  const itemsRes = await query(`
    SELECT * FROM sheet_combination_items 
    WHERE combination_id = $1 
    ORDER BY slot_index ASC
  `, [combinationId]);

  const reservationsRes = await query(`
    SELECT r.*, d.tube_stock_code, d.print_stock_code, d.order_no, d.net_print_demand, d.remaining_open_quantity
    FROM print_demand_reservations r
    JOIN printed_sheet_demands d ON r.print_demand_id = d.id
    WHERE r.combination_id = $1
  `, [combinationId]);

  return {
    combination,
    items: itemsRes.rows,
    reservations: reservationsRes.rows
  };
}

module.exports = {
  getRuleContext,
  validateCombination,
  createDraftCombination,
  confirmCombination,
  cancelCombination,
  getCombinationsList,
  getCombinations: getCombinationsList,
  getCombinationById
};
