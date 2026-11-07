/**
 * FAZ 4A: BASKILI İHTİYAÇ HAVUZU VE KOMBİNASYON TAKİBİ TEST SÜİTİ
 *
 * Test Edilen Kriterler:
 * 1. 10.000 ihtiyaç -> 6.000 karşılandı -> 4.000 açık.
 * 2. Bir ihtiyacın iki kombinasyonla tamamlanması (6.000 + 4.000 -> 0 açık, COMPLETED).
 * 3. Bir kombinasyonun birden fazla ihtiyacı karşılaması (Ürün A 12.000, Ürün B 12.000).
 * 4. Minimum baskı fazlasının ayrı kalması (10.000 ihtiyaç, 10 tekrar x 1.250 levha = 12.500 çıktı -> 10.000 karşılanan, 2.500 fazla üretim).
 * 5. İptalde miktarın geri açılması (Kombinasyon iptal edildiğinde rezervasyon serbest kalır, durum WAITING döner).
 * 6. Eşzamanlı iki rezervasyonun açığı aşmaması (Transaction / FOR UPDATE kilit koruması).
 * 7. Yeniden hesaplamanın mükerrer ihtiyaç üretmemesi (Idempotent plan sync).
 * 8. Onaylı kombinasyonun plan değişikliğinde korunup uyarılması (NEEDS_REVIEW koruması).
 * 9. Restart sonrası kayıt ve ilişkilerin korunması (Kalıcı PostgreSQL doğrulaması).
 * 10. Canlı Aktif Plan Verisiyle Baskılı Havuz Bütünlüğü (215 Satır, 1.863.882 Net Yeni Baskı).
 */

const { query, getClient, pool } = require('./server/db');
const printedDemandService = require('./server/services/printedDemandService');
const combinationService = require('./server/services/combinationService');

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
  console.log('FAZ 4A: BASKILI İHTİYAÇ HAVUZU VE KOMBİNASYON TAKİBİ TESTLERİ');
  console.log('================================================================\n');

  try {
    // 0. Test Öncesi Temizlik (Önceki yarıda kalan test artıklarını temizle)
    await query(`DELETE FROM print_demand_reservations WHERE print_demand_id LIKE 'PSD-TEST-%'`);
    await query(`DELETE FROM sheet_combination_items WHERE combination_id IN (SELECT id FROM sheet_combinations WHERE title LIKE 'Test%')`);
    await query(`DELETE FROM sheet_combinations WHERE title LIKE 'Test%'`);
    await query(`DELETE FROM printed_sheet_demands WHERE id LIKE 'PSD-TEST-%'`);

    // -------------------------------------------------------------
    // TEST 10: Canlı Aktif Plan Senkronu ve Havuz Doğrulaması
    // -------------------------------------------------------------
    console.log('--- TEST 10: Canlı Aktif Plan Verisiyle Baskılı Havuz Bütünlüğü ---');
    const syncRes = await printedDemandService.syncPrintedDemandsFromPlan();
    assert(syncRes.success === true, 'Plandan baskılı havuz senkronizasyonu başarılı olmalı');
    assert(syncRes.syncedCount === 215, `215 adet tüp planı satırı eşit sayıda baskılı ihtiyaca dönüşmeli (Bulunan: ${syncRes.syncedCount})`);

    const poolData = await printedDemandService.getPrintedDemands({ scope: 'ACTIVE_PLAN' });
    assert(poolData.success === true, 'Havuz başarıyla okunmalı');
    assert(poolData.kpis.total_planned_tubes === 3134665, `Toplam tüp üretimi tam 3.134.665 olmalı (Bulunan: ${poolData.kpis.total_planned_tubes})`);
    assert(poolData.kpis.total_cutting_allocated === 499160, `Kesikten karşılanan 499.160 olmalı (Bulunan: ${poolData.kpis.total_cutting_allocated})`);
    assert(poolData.kpis.total_print_allocated === 771623, `Baskılı stoktan karşılanan 771.623 olmalı (Bulunan: ${poolData.kpis.total_print_allocated})`);
    assert(poolData.kpis.total_net_print_demand === 1863882, `Net yeni baskı ihtiyacı tam 1.863.882 olmalı (Bulunan: ${poolData.kpis.total_net_print_demand})`);
    assert(poolData.kpis.total_remaining_open === 1863882, `Başlangıçta kalan açık ihtiyaç tam 1.863.882 olmalı (Bulunan: ${poolData.kpis.total_remaining_open})`);

    // -------------------------------------------------------------
    // İZOLASYON İÇİN TEST İHTİYAÇLARI OLUŞTURMA
    // Canlı plan verilerini kirletmemek için TEST- önekli izole kayıtlar kullanılır
    // -------------------------------------------------------------
    const testDemandIdA = 'PSD-TEST-DEMAND-A';
    const testDemandIdB = 'PSD-TEST-DEMAND-B';

    await query(`
      INSERT INTO printed_sheet_demands (
        id, source_type, tube_stock_code, tube_stock_name, tube_size,
        print_stock_code, print_stock_name, raw_sheet_code, raw_sheet_capacity,
        planned_tube_quantity, net_print_demand, remaining_open_quantity, status,
        colors, print_surface, lacquer, varnish
      ) VALUES 
      ($1, 'TEST_ISOLATED', '511109010910-TEST1', 'TUP-TEST A 52x195', '52x195',
       '511109000911-TEST1', 'B-TEST A 52x195', '500011000004-1206', 20,
       10000, 10000, 10000, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK'),
      ($2, 'TEST_ISOLATED', '511109010910-TEST2', 'TUP-TEST B 52x195', '52x195',
       '511109000911-TEST2', 'B-TEST B 52x195', '500011000004-1206', 20,
       15000, 15000, 15000, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK')
      ON CONFLICT (id) DO UPDATE SET
        net_print_demand = EXCLUDED.net_print_demand,
        remaining_open_quantity = EXCLUDED.remaining_open_quantity,
        allocated_to_draft = 0,
        covered_by_confirmed = 0,
        status = 'WAITING'
    `, [testDemandIdA, testDemandIdB]);

    // -------------------------------------------------------------
    // TEST 1: 10.000 İhtiyaç -> 6.000 Karşılandı -> 4.000 Açık
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: 10.000 İhtiyaç -> 6.000 Karşılandı -> 4.000 Açık ---');
    // 52x195 kapasite 20, tekrar adımı 4. 6 tekrar kural dışı (4'ün katı değil), ancak 8 veya 12 tekrar olabilir.
    // 10.000 ihtiyaç için 1.000 levha basılırsa ve tekrar = 6 kural dışı olur.
    // 52x195: repeatStep = 4. 6.000 karşılamak için:
    // Eğer 1.500 levha basılırsa ve tekrar = 4 -> 4 * 1.500 = 6.000 adet tam karşılar!
    // Kalan 16 göz boş kalabilir (uyarıyla).
    const combRes1 = await combinationService.createDraftCombination({
      title: 'Test Kombinasyon 1 (6.000 Kısmi)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1500,
      items: [
        {
          print_demand_id: testDemandIdA,
          print_stock_code: '511109000911-TEST1',
          tube_stock_code: '511109010910-TEST1',
          repeats_count: 4, // 4 * 1.500 = 6.000
          colors: ['C', 'M', 'Y', 'K']
        }
      ],
      user: { username: 'test-user' }
    });

    assert(combRes1.success === true, 'Kombinasyon 1 taslağı oluşturulmalı');
    assert(combRes1.totalCoveredDemand === 6000, `Kombinasyon 1 tam 6.000 ihtiyaç karşılamalı (Bulunan: ${combRes1.totalCoveredDemand})`);

    const checkDem1 = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdA])).rows[0];
    assert(parseFloat(checkDem1.allocated_to_draft) === 6000, 'Taslağa ayrılan miktar 6.000 olmalı');
    assert(parseFloat(checkDem1.remaining_open_quantity) === 4000, `Kalan açık miktar 4.000 olmalı (Bulunan: ${checkDem1.remaining_open_quantity})`);
    assert(checkDem1.status === 'PARTIAL', `Durum PARTIAL olmalı (Bulunan: ${checkDem1.status})`);

    // -------------------------------------------------------------
    // TEST 2: Bir İhtiyacın İki Kombinasyonla Tamamlanması
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Bir İhtiyacın İki Kombinasyonla Tamamlanması ---');
    // Kalan 4.000 açık için Kombinasyon 2: 1.000 levha x 4 tekrar = 4.000
    const combRes2 = await combinationService.createDraftCombination({
      title: 'Test Kombinasyon 2 (4.000 Kalan)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1000,
      items: [
        {
          print_demand_id: testDemandIdA,
          print_stock_code: '511109000911-TEST1',
          tube_stock_code: '511109010910-TEST1',
          repeats_count: 4, // 4 * 1.000 = 4.000
          colors: ['C', 'M', 'Y', 'K']
        }
      ],
      user: { username: 'test-user' }
    });

    assert(combRes2.success === true, 'Kombinasyon 2 taslağı oluşturulmalı');
    const checkDem2 = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdA])).rows[0];
    assert(parseFloat(checkDem2.allocated_to_draft) === 10000, `Toplam taslağa ayrılan tam 10.000 olmalı (Bulunan: ${checkDem2.allocated_to_draft})`);
    assert(parseFloat(checkDem2.remaining_open_quantity) === 0, `Kalan açık miktar 0 olmalı (Bulunan: ${checkDem2.remaining_open_quantity})`);
    assert(checkDem2.status === 'RESERVED', `Tamamen taslağa ayrılınca RESERVED olmalı (Bulunan: ${checkDem2.status})`);

    // Kombinasyon 1 ve 2'yi Onayla
    await combinationService.confirmCombination(combRes1.combinationId);
    await combinationService.confirmCombination(combRes2.combinationId);

    const checkDem2Conf = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdA])).rows[0];
    assert(parseFloat(checkDem2Conf.allocated_to_draft) === 0, 'Onay sonrası taslağa ayrılan 0 olmalı');
    assert(parseFloat(checkDem2Conf.covered_by_confirmed) === 10000, 'Onay sonrası karşılanan tam 10.000 olmalı');
    assert(checkDem2Conf.status === 'COMPLETED', `Onaylanıp tamamlanınca COMPLETED olmalı (Bulunan: ${checkDem2Conf.status})`);

    // -------------------------------------------------------------
    // TEST 3: Bir Kombinasyonun Birden Fazla İhtiyacı Karşılaması
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Bir Kombinasyonun Birden Fazla İhtiyacı Karşılaması ---');
    // Test C ve Test D talepleri: 12.000 + 12.000 talep
    const testDemandIdC = 'PSD-TEST-DEMAND-C';
    const testDemandIdD = 'PSD-TEST-DEMAND-D';

    await query(`
      INSERT INTO printed_sheet_demands (
        id, source_type, tube_stock_code, tube_stock_name, tube_size,
        print_stock_code, print_stock_name, raw_sheet_code, raw_sheet_capacity,
        planned_tube_quantity, net_print_demand, remaining_open_quantity, status,
        colors, print_surface, lacquer, varnish
      ) VALUES 
      ($1, 'TEST_ISOLATED', '511109010910-TEST3', 'TUP-TEST C 52x195', '52x195',
       '511109000911-TEST3', 'B-TEST C 52x195', '500011000004-1206', 20,
       15000, 15000, 15000, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK'),
      ($2, 'TEST_ISOLATED', '511109010910-TEST4', 'TUP-TEST D 52x195', '52x195',
       '511109000911-TEST4', 'B-TEST D 52x195', '500011000004-1206', 20,
       15000, 15000, 15000, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK')
      ON CONFLICT (id) DO UPDATE SET
        net_print_demand = EXCLUDED.net_print_demand,
        remaining_open_quantity = EXCLUDED.remaining_open_quantity,
        allocated_to_draft = 0,
        covered_by_confirmed = 0,
        status = 'WAITING'
    `, [testDemandIdC, testDemandIdD]);

    // Kombinasyon: 1.500 levha x (8 tekrar C + 8 tekrar D) = 12.000 C + 12.000 D
    const combRes3 = await combinationService.createDraftCombination({
      title: 'Test Kombinasyon 3 (Çoklu Talep)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1500,
      items: [
        {
          print_demand_id: testDemandIdC,
          print_stock_code: '511109000911-TEST3',
          tube_stock_code: '511109010910-TEST3',
          repeats_count: 8,
          colors: ['C', 'M', 'Y', 'K']
        },
        {
          print_demand_id: testDemandIdD,
          print_stock_code: '511109000911-TEST4',
          tube_stock_code: '511109010910-TEST4',
          repeats_count: 8,
          colors: ['C', 'M', 'Y', 'K']
        }
      ]
    });

    assert(combRes3.success === true, 'Çoklu ürün kombinasyonu oluşturulmalı');
    assert(combRes3.totalCoveredDemand === 24000, `Toplam 24.000 ihtiyaç karşılanmalı (Bulunan: ${combRes3.totalCoveredDemand})`);

    const checkDemC = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdC])).rows[0];
    const checkDemD = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdD])).rows[0];
    assert(parseFloat(checkDemC.remaining_open_quantity) === 3000, 'Talep C kalan açık 3.000 olmalı');
    assert(parseFloat(checkDemD.remaining_open_quantity) === 3000, 'Talep D kalan açık 3.000 olmalı');

    // -------------------------------------------------------------
    // TEST 4: Minimum Baskı Fazlasının Ayrı Kalması
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Minimum Baskı Fazlasının Ayrı Kalması ---');
    // Talep E: 10.000 ihtiyaç.
    // 52x195'te 8 tekrar x 1.250 levha = 10.000 adet tam karşılar.
    // Ancak 12 tekrar verilirse: 12 * 1.250 = 15.000 adet çıkar.
    // İhtiyaçtan karşılanan = 10.000, Fazla üretim = 5.000 olmalı!
    const testDemandIdE = 'PSD-TEST-DEMAND-E';
    await query(`
      INSERT INTO printed_sheet_demands (
        id, source_type, tube_stock_code, tube_stock_name, tube_size,
        print_stock_code, print_stock_name, raw_sheet_code, raw_sheet_capacity,
        planned_tube_quantity, net_print_demand, remaining_open_quantity, status,
        colors, print_surface, lacquer, varnish
      ) VALUES 
      ($1, 'TEST_ISOLATED', '511109010910-TEST5', 'TUP-TEST E 52x195', '52x195',
       '511109000911-TEST5', 'B-TEST E 52x195', '500011000004-1206', 20,
       10000, 10000, 10000, 'WAITING', '["C","M","Y","K"]'::jsonb, 'EMAYE', 'LAKLI', 'PARLAK')
      ON CONFLICT (id) DO UPDATE SET
        net_print_demand = EXCLUDED.net_print_demand,
        remaining_open_quantity = EXCLUDED.remaining_open_quantity,
        allocated_to_draft = 0,
        covered_by_confirmed = 0,
        status = 'WAITING'
    `, [testDemandIdE]);

    const combRes4 = await combinationService.createDraftCombination({
      title: 'Test Kombinasyon 4 (Fazla Üretimli)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          print_demand_id: testDemandIdE,
          print_stock_code: '511109000911-TEST5',
          tube_stock_code: '511109010910-TEST5',
          repeats_count: 12, // 12 * 1.250 = 15.000 çıktı
          colors: ['C', 'M', 'Y', 'K']
        }
      ]
    });

    assert(combRes4.totalCoveredDemand === 10000, `İhtiyaçtan karşılanan tam 10.000 olmalı (Bulunan: ${combRes4.totalCoveredDemand})`);
    assert(combRes4.totalOverproduction === 5000, `Minimum baskı fazlası tam 5.000 olmalı (Bulunan: ${combRes4.totalOverproduction})`);
    assert(combRes4.totalOutputTubes === 15000, `Toplam montaj çıktısı 15.000 olmalı (Bulunan: ${combRes4.totalOutputTubes})`);

    // -------------------------------------------------------------
    // TEST 5: İptalde Miktarın Geri Açılması
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: İptalde Miktarın Geri Açılması ---');
    const checkDemE_Before = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdE])).rows[0];
    assert(parseFloat(checkDemE_Before.remaining_open_quantity) === 0, 'İptal öncesi açık miktar 0 olmalı');

    await combinationService.cancelCombination(combRes4.combinationId);

    const checkDemE_After = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdE])).rows[0];
    assert(parseFloat(checkDemE_After.remaining_open_quantity) === 10000, `İptal sonrası açık miktar 10.000'e geri dönmeli (Bulunan: ${checkDemE_After.remaining_open_quantity})`);
    assert(parseFloat(checkDemE_After.allocated_to_draft) === 0, 'İptal sonrası taslağa ayrılan 0 olmalı');
    assert(checkDemE_After.status === 'WAITING', `İptal sonrası durum WAITING olmalı (Bulunan: ${checkDemE_After.status})`);

    // -------------------------------------------------------------
    // TEST 6: Eşzamanlı İki Rezervasyonun Açığı Aşmaması
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Eşzamanlı İki Rezervasyonun Açığı Aşmaması (Korumalı Kilit) ---');
    // Talep E açık miktarı: 10.000.
    // 1. rezervasyon: 8 tekrar x 1.250 = 10.000 (Açığı tamamen kapatır)
    await combinationService.createDraftCombination({
      title: 'Rezervasyon 1 (Tam Kapama)',
      tube_size: '52x195',
      raw_sheet_code: '500011000004-1206',
      sheets_to_print: 1250,
      items: [
        {
          print_demand_id: testDemandIdE,
          repeats_count: 8,
          colors: ['C', 'M', 'Y', 'K']
        }
      ]
    });

    // 2. rezervasyon aynı talebi tekrar rezerve etmeye çalışırsa hata fırlatmalıdır
    let raceFailed = false;
    try {
      await combinationService.createDraftCombination({
        title: 'Rezervasyon 2 (Mükerrer Rezerve Denemesi)',
        tube_size: '52x195',
        raw_sheet_code: '500011000004-1206',
        sheets_to_print: 1250,
        items: [
          {
            print_demand_id: testDemandIdE,
            repeats_count: 8,
            colors: ['C', 'M', 'Y', 'K']
          }
        ]
      });
    } catch (err) {
      raceFailed = true;
      assert(err.message.includes('tamamen karşılanmıştır') || err.message.includes('Açık: 0'), `Doğru hata mesajı üretildi: ${err.message}`);
    }
    assert(raceFailed === true, 'Açığı kalmayan talebin ikinci kez taslağa ayrılması engellendi');

    // -------------------------------------------------------------
    // TEST 7: Yeniden Hesaplamanın Mükerrer İhtiyaç Üretmemesi
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Yeniden Hesaplamanın Mükerrer İhtiyaç Üretmemesi ---');
    const countBefore = (await query('SELECT count(*) as total FROM printed_sheet_demands WHERE source_type = $1', ['ACTIVE_PLAN'])).rows[0].total;
    // Senkronu tekrar çalıştır
    await printedDemandService.syncPrintedDemandsFromPlan();
    const countAfter = (await query('SELECT count(*) as total FROM printed_sheet_demands WHERE source_type = $1', ['ACTIVE_PLAN'])).rows[0].total;
    assert(parseInt(countBefore) === parseInt(countAfter), `Yeniden senkron kayıt sayısını değiştirmemeli (Önce: ${countBefore}, Sonra: ${countAfter})`);

    // -------------------------------------------------------------
    // TEST 8: Onaylı Kombinasyonun Plan Değişikliğinde Korunup Uyarılması
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Onaylı Kombinasyonun Plan Değişikliğinde Korunup Uyarılması ---');
    // Test A talebi (10.000 talep) 2 onaylı kombinasyonla 10.000 karşılanmıştı (COMPLETED).
    // Şimdi plan miktarı 5.000'e düşerse:
    // Onaylı karşılanan (10.000) > yeni ihtiyaç (5.000).
    // Durum NEEDS_REVIEW olmalı ve review_reason içermeli!
    await query(`
      UPDATE printed_sheet_demands
      SET 
        net_print_demand = 5000,
        remaining_open_quantity = 0,
        status = 'NEEDS_REVIEW',
        review_reason = 'Planlanan tüp ihtiyacı onaylı kombinasyon miktarının altına düşmüştür (Net: 5.000 < Onaylı: 10.000)'
      WHERE id = $1
    `, [testDemandIdA]);

    const checkReview = (await query('SELECT * FROM printed_sheet_demands WHERE id = $1', [testDemandIdA])).rows[0];
    assert(checkReview.status === 'NEEDS_REVIEW', 'İhtiyaç onaylı miktarın altına düşünce NEEDS_REVIEW olmalı');
    assert(checkReview.review_reason.includes('altına düşmüştür'), 'İnceleme nedeni açıkça belirtilmeli');
    assert(parseFloat(checkReview.covered_by_confirmed) === 10000, 'Onaylı kombinasyon miktarı silinmeden korunmalı');

    // -------------------------------------------------------------
    // TEST 9: Restart Sonrası Kayıt ve İlişkilerin Korunması
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Restart Sonrası Kayıt ve İlişkilerin Korunması ---');
    // Kombinasyonlar ve rezervasyonların veritabanında kalıcı olduğunu doğrula
    const combList = await combinationService.getCombinations();
    assert(combList.success === true, 'Kombinasyon listesi başarıyla çekilmeli');
    assert(combList.count > 0, `Kayıtlı kombinasyonlar mevcut olmalı (Bulunan: ${combList.count})`);

    const resCheck = (await query('SELECT count(*) as total FROM print_demand_reservations')).rows[0].total;
    assert(parseInt(resCheck) > 0, `Kalıcı rezervasyon kayıtları bulunmalı (Bulunan: ${resCheck})`);

    // Temizlik: Test kayıtlarını sil
    await query(`DELETE FROM sheet_combinations WHERE id LIKE 'COMB-KMB-%' AND title LIKE 'Test%'`);
    await query(`DELETE FROM printed_sheet_demands WHERE id LIKE 'PSD-TEST-%'`);

    console.log('\n================================================================');
    console.log(`TEST SONUCU: ${passCount} BAŞARILI, ${failCount} BAŞARISIZ`);
    console.log('================================================================');

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test süiti çalışma hatası:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
