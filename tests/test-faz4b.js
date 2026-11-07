/**
 * FAZ 4B: HEDEFLİ KABUL DÜZELTMELERİ TEST SÜİTİ
 * 
 * 6 Temel Kabul Senaryosu:
 * 1. Simülasyon önerisinin API/servis üzerinden rezervasyonu kesinlikle reddedilir.
 * 2. Çoklu ihtiyaç bağlantıları: Aynı baskılı koda bağlı 6.000 + 4.000 ihtiyaç, 10.000 karşılamada
 *    iki ayrı rezervasyonla kapanır; iptalde ikisi de eksiksiz açığa döner.
 * 3. 18 ebat için doğrulama, öneri ve kayıt kapasite/adımları tek kaynak (tube_capacities) ile birebir aynı kalır.
 * 4. Bilinmeyen lak, solo ve ürün/grup yasakları sunucuda engellenir.
 * 5. Onaysız veya satır/sütun kuralını bozan şablon onaylanamaz.
 * 6. Taslaktan sonra teknik kart/kural değişirse veya NEEDS_REVIEW oluşursa eski taslak sessiz onaylanamaz.
 */

const { query, getClient } = require('./server/db');
const combinationService = require('./server/services/combinationService');
const combinationProposalService = require('./server/services/combinationProposalService');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('FAZ 4B: HEDEFLİ KABUL DÜZELTMELERİ TEST SÜİTİ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Simülasyon Önerisinin Rezervasyonu Kesinlikle Reddedilir
    // -------------------------------------------------------------
    console.log('--- TEST 1: Simülasyon Önerisinin Rezervasyonu Kesinlikle Reddedilir ---');
    const simRunId = `RUN-SIM-${Date.now()}`;
    const simPropId = `PROP-SIM-${Date.now()}`;

    // Simülasyon koşusu ve önerisi oluştur
    await query(`
      INSERT INTO combination_proposal_runs (
        id, scope, tube_size_filter, filters, total_candidates, eligible_candidates,
        excluded_candidates, proposals_found, search_status, is_simulation
      ) VALUES ($1, 'ACTIVE_PLAN', '52x195', '{"allowUnspecifiedColors": true}'::jsonb, 4, 4, 0, 1, 'VALID_PROPOSAL', true)
    `, [simRunId]);

    await query(`
      INSERT INTO combination_proposals (
        id, run_id, proposal_no, title, tube_size, raw_sheet_code, raw_sheet_name,
        raw_sheet_capacity, assembly_group_count, repeat_step, total_slots, used_slots,
        sheets_to_print, total_output_tubes, total_covered_demand, total_overproduction,
        is_simulation, items
      ) VALUES (
        $1, $2, 'PROP-SIM-0001', 'Simülasyon Önerisi', '52x195', '500011000004-1206', 'HAM LEVHA 52x195',
        20, 5, 4, 20, 20, 1250, 25000, 25000, 0, true, '[]'::jsonb
      )
    `, [simPropId, simRunId]);

    let simApplyBlocked = false;
    let simErrorCode = null;
    try {
      await combinationProposalService.applyProposalToDraft({
        proposalId: simPropId,
        user: { username: 'test-user' }
      });
    } catch (err) {
      simApplyBlocked = true;
      simErrorCode = err.code || err.message;
    }

    assert(simApplyBlocked, 'Simülasyon önerisinin taslağa dönüştürülmesi engellenmeli');
    assert(
      simErrorCode && (simErrorCode === 'SIMULATION_CANNOT_BE_APPLIED' || simErrorCode.includes('SIMULATION_CANNOT_BE_APPLIED')),
      `Doğru hata kodu dönmeli (Dönen: ${simErrorCode})`
    );

    const simCheck = (await query('SELECT is_applied_to_draft FROM combination_proposals WHERE id = $1', [simPropId])).rows[0];
    assert(simCheck.is_applied_to_draft === false, 'Simülasyon önerisi is_applied_to_draft = false kalmalı');


    // -------------------------------------------------------------
    // TEST 2: Çoklu İhtiyaç Bağlantıları (6.000 + 4.000 -> 10.000 İki Ayrı Rezervasyon & İptal)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Çoklu İhtiyaç Bağlantıları (6.000 + 4.000 -> 10.000 İki Ayrı Rezervasyon & İptal) ---');
    const demMultiA = `PSD-TEST-MA-${Date.now()}`;
    const demMultiB = `PSD-TEST-MB-${Date.now()}`;
    const sharedPrintCode = `511109000911-MULTI-${Date.now()}`;
    const sharedTubeCode = `511109010910-MULTI-${Date.now()}`;

    // İki açık talep ekle (Demand A: 6.000, Demand B: 4.000)
    await query(`
      INSERT INTO printed_sheet_demands (
        id, tube_stock_code, tube_stock_name, tube_size, print_stock_code, print_stock_name,
        raw_sheet_code, raw_sheet_capacity, net_print_demand, remaining_open_quantity,
        allocated_to_draft, covered_by_confirmed, status, colors, print_surface, lacquer, varnish
      ) VALUES 
        ($1, $3, 'MULTI ÜRÜN A', '52x195', $4, 'B-MULTI ÜRÜN', '500011000004-1206', 20, 6000, 6000, 0, 0, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK'),
        ($2, $3, 'MULTI ÜRÜN B', '52x195', $4, 'B-MULTI ÜRÜN', '500011000004-1206', 20, 4000, 4000, 0, 0, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK')
    `, [demMultiA, demMultiB, sharedTubeCode, sharedPrintCode]);

    // 8 tekrar x 1.250 levha = 10.000 montaj çıktısı
    // source_demands listesinde hem Demand A (6.000) hem Demand B (4.000) bulunuyor
    const combMultiRes = await combinationService.createDraftCombination({
      title: 'Çoklu İhtiyaç Taslak Kombinasyonu (6.000 + 4.000)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          print_stock_code: sharedPrintCode,
          tube_stock_code: sharedTubeCode,
          repeats_count: 8, // 8 * 1.250 = 10.000
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI',
          source_demands: [
            { print_demand_id: demMultiA, allocated_quantity: 6000 },
            { print_demand_id: demMultiB, allocated_quantity: 4000 }
          ]
        }
      ],
      user: { username: 'test-planner' }
    });

    assert(combMultiRes.success === true, 'Çoklu ihtiyaç içeren taslak kombinasyon başarıyla oluşturulmalı');
    assert(combMultiRes.totalCoveredDemand === 10000, `Toplam karşılanan ihtiyaç tam 10.000 olmalı (Bulunan: ${combMultiRes.totalCoveredDemand})`);
    assert(combMultiRes.totalOverproduction === 0, `Fazla üretim tam 0 olmalı (Bulunan: ${combMultiRes.totalOverproduction})`);

    // Rezervasyon defterinde (print_demand_reservations) iki ayrı kayıt olmalı
    const resvRows = (await query(`
      SELECT print_demand_id, reserved_quantity, reservation_type
      FROM print_demand_reservations
      WHERE combination_id = $1
      ORDER BY reserved_quantity DESC
    `, [combMultiRes.combinationId])).rows;

    assert(resvRows.length === 2, `Rezervasyon defterinde tam 2 ayrı bağlantı kaydı bulunmalı (Bulunan: ${resvRows.length})`);
    assert(resvRows[0].print_demand_id === demMultiA && parseFloat(resvRows[0].reserved_quantity) === 6000, 'Bağlantı 1: Demand A için 6.000 rezerve edilmeli');
    assert(resvRows[1].print_demand_id === demMultiB && parseFloat(resvRows[1].reserved_quantity) === 4000, 'Bağlantı 2: Demand B için 4.000 rezerve edilmeli');

    // İhtiyaç havuzundaki durumları kontrol et
    const demACheck = (await query('SELECT allocated_to_draft, remaining_open_quantity, status FROM printed_sheet_demands WHERE id = $1', [demMultiA])).rows[0];
    const demBCheck = (await query('SELECT allocated_to_draft, remaining_open_quantity, status FROM printed_sheet_demands WHERE id = $1', [demMultiB])).rows[0];

    assert(parseFloat(demACheck.allocated_to_draft) === 6000 && parseFloat(demACheck.remaining_open_quantity) === 0 && demACheck.status === 'RESERVED', 'Talep A: 6.000 ayrıldı, kalan 0, durum RESERVED');
    assert(parseFloat(demBCheck.allocated_to_draft) === 4000 && parseFloat(demBCheck.remaining_open_quantity) === 0 && demBCheck.status === 'RESERVED', 'Talep B: 4.000 ayrıldı, kalan 0, durum RESERVED');

    // Şimdi İptal Et ve Her İki Talebin de Eksiksiz Açığa Döndüğünü Doğrula
    const cancelRes = await combinationService.cancelCombination(combMultiRes.combinationId);
    assert(cancelRes.success === true, 'Kombinasyon başarıyla iptal edilmeli');

    const demARestored = (await query('SELECT allocated_to_draft, remaining_open_quantity, status FROM printed_sheet_demands WHERE id = $1', [demMultiA])).rows[0];
    const demBRestored = (await query('SELECT allocated_to_draft, remaining_open_quantity, status FROM printed_sheet_demands WHERE id = $1', [demMultiB])).rows[0];

    assert(parseFloat(demARestored.allocated_to_draft) === 0 && parseFloat(demARestored.remaining_open_quantity) === 6000 && demARestored.status === 'WAITING', 'İptal Sonrası Talep A: Açık miktar 6.000 olarak eksiksiz geri döndü');
    assert(parseFloat(demBRestored.allocated_to_draft) === 0 && parseFloat(demBRestored.remaining_open_quantity) === 4000 && demBRestored.status === 'WAITING', 'İptal Sonrası Talep B: Açık miktar 4.000 olarak eksiksiz geri döndü');


    // -------------------------------------------------------------
    // TEST 3: 18 Ebat İçin Tek Kapasite Kaynağı Sözleşmesi
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: 18 Ebat İçin Tek Kapasite Kaynağı Sözleşmesi ---');
    const dbCaps = (await query('SELECT tube_size, units_per_sheet, assembly_group_count, repeat_step FROM tube_capacities WHERE units_per_sheet > 0')).rows;
    assert(dbCaps.length === 18, `tube_capacities tablosunda tam 18 ebat bulunmalı (Bulunan: ${dbCaps.length})`);

    const ruleContext = await combinationService.getRuleContext(true);
    assert(ruleContext.capacities && Object.keys(ruleContext.capacities).length === 18, 'Kural bağlamı tam 18 ebat taşımalı');

    let all18Match = true;
    for (const r of dbCaps) {
      const c = ruleContext.capacities[r.tube_size];
      if (!c || c.capacity !== r.units_per_sheet || c.groupCount !== r.assembly_group_count || c.repeatStep !== r.repeat_step) {
        all18Match = false;
        console.error(`Ebat uyumsuzluğu: ${r.tube_size}`);
      }
    }
    assert(all18Match, '18 ebadın tümü (kapasite, montaj grubu, tekrar adımı) DB tablosuyla birebir mutabık');

    // 65x195 için eski hatalı (12 / 3) değer yerine DB onaylı (16 / 4 / 4) değeri doğrula
    const cap65 = ruleContext.capacities['65x195'];
    assert(cap65.capacity === 16 && cap65.repeatStep === 4 && cap65.groupCount === 4, `65x195 kapasitesi onaylı 16 olmalı (Bulunan: ${cap65.capacity}, Adım: ${cap65.repeatStep})`);

    // 45x175 için eski hatalı (32 / 4) yerine DB onaylı (30 / 5 / 6) değeri doğrula
    const cap45 = ruleContext.capacities['45x175'];
    assert(cap45.capacity === 30 && cap45.repeatStep === 5 && cap45.groupCount === 6, `45x175 kapasitesi onaylı 30 olmalı (Bulunan: ${cap45.capacity}, Adım: ${cap45.repeatStep})`);


    // -------------------------------------------------------------
    // TEST 4: Bilinmeyen Lak, Solo ve Ürün/Grup Yasakları Sunucuda Engellenir
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Bilinmeyen Lak, Solo ve Ürün/Grup Yasakları Sunucuda Engellenir ---');

    // 4.1 Bilinmeyen Lak Denetimi: "Bilinmeyen lakı laksız sayma."
    const unkLacquerVal = await combinationService.validateCombination({
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: 'TEST-UNK-LACQUER',
          repeats_count: 4,
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'BİLİNMİYOR' // Bilinmeyen lak
        }
      ],
      options: { skipDbCheck: true }
    });

    assert(unkLacquerVal.isValid === false, 'Bilinmeyen lak içeren kombinasyon sunucuda kesinlikle reddedilmeli');
    assert(
      unkLacquerVal.errors.some(e => e.includes('LAK_DURUMU_BELIRSIZ')),
      'LAK_DURUMU_BELIRSIZ hata kodu üretilmeli'
    );

    // 4.2 Özel Seri Solo İş Kuralı (EXCLUSIVE_SOLO_ONLY)
    // Geçici olarak KRL-SOLO-OZEL kuralını aktif et
    await query(`UPDATE product_combination_rules SET is_active = true WHERE code = 'KRL-SOLO-OZEL'`);
    await combinationService.getRuleContext(true); // Önbelleği yenile

    const soloVal = await combinationService.validateCombination({
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: '519999010001', // Solo hedef ürün
          repeats_count: 4,
          colors: ['C', 'M'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        },
        {
          tube_stock_code: '511109010910-1001', // Başka ürün
          repeats_count: 4,
          colors: ['Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ],
      options: { skipDbCheck: true }
    });

    assert(soloVal.isValid === false, 'Solo kuralı olan ürünün başka ürünlerle birleştirilmesi engellenmeli');
    assert(soloVal.errors.some(e => e.includes('SOLO_URUN_IHLALI')), 'SOLO_URUN_IHLALI hatası üretilmeli');

    // 4.3 Çapraz Bulaşma Koruma Yasağı (FORBIDDEN_WITH_PRODUCTS - Çift Yönlü)
    await query(`UPDATE product_combination_rules SET is_active = true WHERE code = 'KRL-CAPRAZ-KORUMA'`);
    await combinationService.getRuleContext(true);

    const crossVal = await combinationService.validateCombination({
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: '511109010910-1001',
          repeats_count: 4,
          colors: ['C', 'M'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        },
        {
          tube_stock_code: '511121010410-5004', // Yasaklı eşleşen
          repeats_count: 4,
          colors: ['Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ],
      options: { skipDbCheck: true }
    });

    assert(crossVal.isValid === false, 'Çapraz bulaşma riski olan ürünlerin birleştirilmesi engellenmeli');
    assert(crossVal.errors.some(e => e.includes('CAPRAZ_BULASMA_YASAGI')), 'CAPRAZ_BULASMA_YASAGI hatası üretilmeli');

    // Kuralları tekrar orijinal durumuna getir
    await query(`UPDATE product_combination_rules SET is_active = false WHERE code IN ('KRL-SOLO-OZEL', 'KRL-CAPRAZ-KORUMA')`);
    await combinationService.getRuleContext(true);


    // -------------------------------------------------------------
    // TEST 5: Onaysız veya Satır/Sütun Kuralını Bozan Şablon Onaylanamaz
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Onaysız veya Satır/Sütun Kuralını Bozan Şablon Onaylanamaz ---');

    // 5.1 Onaysız Şablon (Provisional veya Unverified) Üretim Onayı Alamaz
    // 65x104 ebadı sheet_layouts tablosunda 'provisional' durumundadır
    const unverifiedCombRes = await combinationService.createDraftCombination({
      title: 'Geçici Şablon Taslağı (65x104)',
      tube_size: '65x104',
      raw_sheet_code: '500011000004-1408',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: 'URUN-65-TEST',
          repeats_count: 4, // 65x104 tekrar adımı 4
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ],
      options: { skipDbCheck: true }
    });

    assert(unverifiedCombRes.success === true, 'Geçici şablonlu kombinasyon taslak olarak incelenebilmeli');
    assert(unverifiedCombRes.templateVerificationStatus === 'provisional', 'Durum provisional olarak kaydedilmeli');

    let confirmBlocked = false;
    let confirmErrorMsg = '';
    try {
      await combinationService.confirmCombination(unverifiedCombRes.combinationId);
    } catch (err) {
      confirmBlocked = true;
      confirmErrorMsg = err.message;
    }

    assert(confirmBlocked, 'Onaylanmamış (provisional/unverified) şablonlu kombinasyon üretim onayı alamamalı');
    assert(confirmErrorMsg.includes('URETIM_ONAYI_ENGELLENDI'), `URETIM_ONAYI_ENGELLENDI hatası üretilmeli (Dönen: ${confirmErrorMsg})`);

    // 5.2 Satır / Sütun Kuralını Bozan Tekrar Adımı
    const stepBreakVal = await combinationService.validateCombination({
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: 'TEST-STEP-BREAK',
          repeats_count: 5, // 52x195 adımı 4'tür, 5 tekrar kuralı bozar!
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ],
      options: { skipDbCheck: true }
    });

    assert(stepBreakVal.isValid === false, 'Tekrar adımını bozan (5 tekrar) montaj geçersiz sayılmalı');
    assert(stepBreakVal.errors.some(e => e.includes('SATIR_SUTUN_HOMOJENLIK_HATASI') || e.includes('tekrar adımının')), 'Adım ihlal hatası üretilmeli');


    // -------------------------------------------------------------
    // TEST 6: Taslaktan Sonra Kural/Teknik Değişirse Eski Taslak Sessiz Onaylanamaz
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Taslaktan Sonra Kural/Teknik Değişirse Eski Taslak Sessiz Onaylanamaz ---');

    // 52x195 verified şablonuyla geçerli bir taslak oluştur
    // 511109010910-1001 (4 renk: C, M, Y, K)
    const validDraftRes = await combinationService.createDraftCombination({
      title: 'Geçerli Doğrulanmış Taslak (52x195)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          tube_stock_code: '511109010910-1001',
          repeats_count: 4,
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ]
    });

    assert(validDraftRes.success === true, 'Doğrulanmış şablonlu geçerli taslak oluşturulabilmeli');

    // 6.1 Taslak oluşturulduktan sonra maxColors sınırını 3'e düşür (Kural değişikliği simülasyonu)
    await query(`UPDATE business_rules SET parameter_value = '3' WHERE condition_field = 'colors' AND operator = 'max_count'`);
    await combinationService.getRuleContext(true); // Önbelleği yenile

    let staleConfirmBlocked = false;
    let staleErrMsg = '';
    try {
      await combinationService.confirmCombination(validDraftRes.combinationId);
    } catch (err) {
      staleConfirmBlocked = true;
      staleErrMsg = err.message;
    }

    assert(staleConfirmBlocked, 'Kural değişiminden sonra eski taslağın sessiz onaylanması engellenmeli');
    assert(staleErrMsg.includes('URETIM_ONAYI_ENGELLENDI') && staleErrMsg.includes('Renk sınırı aşıldı'), 'Onay sırasında güncel kural ihlali (Renk sınırı aşıldı) fırlatılmalı');

    // Kuralı orijinal 6 değerine geri al
    await query(`UPDATE business_rules SET parameter_value = '6' WHERE condition_field = 'colors' AND operator = 'max_count'`);
    await combinationService.getRuleContext(true);

    // 6.2 Bağlı talep NEEDS_REVIEW durumuna düşerse onayın engellendiğini doğrula
    const demReviewTest = `PSD-TEST-REV-${Date.now()}`;
    await query(`
      INSERT INTO printed_sheet_demands (
        id, tube_stock_code, tube_stock_name, tube_size, print_stock_code, print_stock_name,
        raw_sheet_code, raw_sheet_capacity, net_print_demand, remaining_open_quantity,
        allocated_to_draft, covered_by_confirmed, status, colors, print_surface, lacquer, varnish
      ) VALUES ($1, '511109010910-1001', 'TUP-SOFT VANILLA', '52x195', '511109000911-1001', 'B-SOFT VANILLA',
                '500011000004-1206', 20, 5000, 5000, 0, 0, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK')
    `, [demReviewTest]);

    const reviewDraft = await combinationService.createDraftCombination({
      title: 'İnceleme Uyarısı Test Taslağı',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          print_demand_id: demReviewTest,
          tube_stock_code: '511109010910-1001',
          repeats_count: 4,
          colors: ['C', 'M', 'Y', 'K'],
          print_surface: 'EMAYE',
          lacquer: 'LAKLI'
        }
      ]
    });

    // Talebi plandan ötürü NEEDS_REVIEW yap
    await query(`UPDATE printed_sheet_demands SET status = 'NEEDS_REVIEW', review_reason = 'Plan miktarı düştü' WHERE id = $1`, [demReviewTest]);

    let reviewConfirmBlocked = false;
    let reviewErrMsg = '';
    try {
      await combinationService.confirmCombination(reviewDraft.combinationId);
    } catch (err) {
      reviewConfirmBlocked = true;
      reviewErrMsg = err.message;
    }

    assert(reviewConfirmBlocked, 'NEEDS_REVIEW durumundaki talep içeren taslak onaylanamamalı');
    assert(reviewErrMsg.includes('NEEDS_REVIEW_BLOCKED'), `NEEDS_REVIEW_BLOCKED hatası fırlatılmalı (Dönen: ${reviewErrMsg})`);

    // Temizlik: Test kombinasyonlarını sil
    await query(`DELETE FROM sheet_combinations WHERE title LIKE 'Çoklu İhtiyaç%' OR title LIKE 'Geçici Şablon%' OR title LIKE 'Geçerli Doğrulanmış%'`);
    await query(`DELETE FROM printed_sheet_demands WHERE id LIKE 'PSD-TEST-M%'`);
    await query(`DELETE FROM combination_proposals WHERE id LIKE 'PROP-SIM-%'`);
    await query(`DELETE FROM combination_proposal_runs WHERE id LIKE 'RUN-SIM-%'`);

  } catch (err) {
    console.error('Test süiti beklenmeyen hata:', err);
    failCount++;
  }

  console.log('\n================================================================');
  console.log(`TEST SONUCU: ${passCount} BAŞARILI, ${failCount} BAŞARISIZ (Toplam: ${passCount + failCount})`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
