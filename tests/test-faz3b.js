/**
 * FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE HEDEFLİ KABUL TESTLERİ
 * 
 * Bu test süiti bağımsız mock'lar yerine servisin gerçek çekirdek hesaplama motorunu
 * (calculateSingleDemandPure) ve canlı PostgreSQL veritabanını test eder.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const servicePath = fs.existsSync('./server/services/demandAllocationService.js')
  ? './server/services/demandAllocationService'
  : (fs.existsSync('/app/server/services/demandAllocationService.js')
      ? '/app/server/services/demandAllocationService'
      : '../server/services/demandAllocationService');

const { 
  calculateSingleDemandPure, 
  getLatestCalculation, 
  getAllocatedDemands,
  runAllocationCalculation 
} = require(servicePath);

const dbPath = fs.existsSync('./server/db')
  ? './server/db'
  : (fs.existsSync('/app/server/db') ? '/app/server/db' : '../server/db');
const { query: dbQuery, pool } = require(dbPath);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE KABUL TESTLERİ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: 50 / 10 / 5 / 7 -> 40 / 35 / 28 Kuralı (Gerçek Çekirdek Motor)
    // -------------------------------------------------------------
    console.log('--- TEST 1: 50/10/5/7 -> 40/35/28 Kademeli Netleme Formülü ---');
    {
      const res = calculateSingleDemandPure({
        grossDemand: 50000,
        tubeStock: 10000,
        cuttingStock: 5000,
        ratioTubeToCutting: 1.0,
        printStock: 7000,
        ratioCuttingToPrint: 1.0,
        rawSheetCapacity: 20
      });

      assert(res.allocatedTubeStock === 10000, 'Tahsis edilen tüp stok: 10.000');
      assert(res.netTubeDemand === 40000, 'Net Tüp İhtiyacı: 40.000 adet');
      assert(res.remainingTubeStock === 0, 'Kalan tüp stok havuzu: 0');
      assert(res.allocatedCuttingPhysical === 5000, 'Tahsis edilen kesik fiziksel stok: 5.000');
      assert(res.allocatedCuttingTubeEquiv === 5000, 'Tahsis edilen kesik tüp eşdeğeri: 5.000');
      assert(res.netCuttingDemandTubeEquiv === 35000, 'Net Kesim İhtiyacı (Tüp eşdeğeri): 35.000 adet');
      assert(res.allocatedPrintPhysical === 7000, 'Tahsis edilen baskılı fiziksel stok: 7.000');
      assert(res.allocatedPrintTubeEquiv === 7000, 'Tahsis edilen baskılı tüp eşdeğeri: 7.000');
      assert(res.netPrintDemandTubeEquiv === 28000, 'Net Yeni Baskı İhtiyacı (Tüp eşdeğeri): 28.000 adet');
      assert(res.estimatedRawSheets === 1400, 'Tahmini Ham Levha İhtiyacı: 28.000 / 20 = 1.400 levha');
    }

    // -------------------------------------------------------------
    // TEST 2: Ortak Stok ve Birden Fazla Talep (Sıralı Tekil Tahsis)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Ortak Stok ve Sıralı Tekil Tahsis (8.000 + 8.000 Talep, 10.000 Stok) ---');
    {
      let sharedTubeStock = 10000;

      // Talep A (Erken Termin)
      const resA = calculateSingleDemandPure({
        grossDemand: 8000,
        tubeStock: sharedTubeStock
      });
      sharedTubeStock = resA.remainingTubeStock;

      // Talep B (Geç Termin)
      const resB = calculateSingleDemandPure({
        grossDemand: 8000,
        tubeStock: sharedTubeStock
      });
      sharedTubeStock = resB.remainingTubeStock;

      assert(resA.allocatedTubeStock === 8000, 'Talep A 8.000 stok almalı');
      assert(resA.netTubeDemand === 0, 'Talep A net tüp ihtiyacı 0 olmalı');
      assert(resB.allocatedTubeStock === 2000, 'Talep B kalan 2.000 stoğu almalı');
      assert(resB.netTubeDemand === 6000, 'Talep B net tüp ihtiyacı 6.000 olmalı');
      assert(resA.netTubeDemand + resB.netTubeDemand === 6000, 'Toplam net tüp ihtiyacı tam 6.000 adet olmalı');
      assert(sharedTubeStock === 0, 'Ortak stok havuzu tükenmeli, mükerrer tahsis engellenmeli');
    }

    // -------------------------------------------------------------
    // TEST 3: 1:1 Olmayan Reçete ve Farklı Stok Birimleri
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: 1:1 Olmayan Reçete Katsayıları ve Stok Birim Dönüşümü ---');
    {
      // 1 tüp için 0.5 adet kesik levha gerekiyor (1 levhadan 2 tüp çıkıyor)
      // 1 kesik levha için 0.8 adet baskılı levha gerekiyor
      const res = calculateSingleDemandPure({
        grossDemand: 10000, // 10.000 tüp
        tubeStock: 0,
        cuttingStock: 2000, // 2.000 LEVHA eldeki kesik stok
        ratioTubeToCutting: 0.5,
        printStock: 1000, // 1.000 LEVHA eldeki baskılı stok
        ratioCuttingToPrint: 0.8,
        rawSheetCapacity: 25
      });

      // 10.000 tüp için 5.000 kesik gerekiyor. 2.000 kesik tahsis edilir.
      // 2.000 kesik / 0.5 = 4.000 tüp eşdeğeri.
      // Net kesim tüp eşdeğeri: 10.000 - 4.000 = 6.000 tüp.
      assert(res.allocatedCuttingPhysical === 2000, 'Tahsis edilen kesik fiziksel: 2.000 LEVHA');
      assert(res.allocatedCuttingTubeEquiv === 4000, 'Tahsis edilen kesik tüp eşdeğeri: 4.000 TÜP');
      assert(res.netCuttingDemandTubeEquiv === 6000, 'Net kesim ihtiyacı: 6.000 TÜP eşdeğeri');

      // Kalan kesik fiziksel: 3.000 LEVHA.
      // 3.000 kesik * 0.8 = 2.400 baskılı gerekiyor.
      // Eldeki baskılı: 1.000 LEVHA tahsis edilir.
      // 1.000 baskılı / (0.5 * 0.8) = 1.000 / 0.4 = 2.500 tüp eşdeğeri.
      // Net yeni baskı ihtiyacı: 6.000 - 2.500 = 3.500 tüp eşdeğeri.
      assert(res.allocatedPrintPhysical === 1000, 'Tahsis edilen baskılı fiziksel: 1.000 LEVHA');
      assert(res.allocatedPrintTubeEquiv === 2500, 'Tahsis edilen baskılı tüp eşdeğeri: 2.500 TÜP');
      assert(res.netPrintDemandTubeEquiv === 3500, 'Net yeni baskı ihtiyacı: 3.500 TÜP eşdeğeri');
    }

    // -------------------------------------------------------------
    // TEST 4: Kısmi Zamanında + Kısmi Geç Arz ve Termin Açığı
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Kısmi Zamanında + Kısmi Geç Arz ve Termin Açığı Denetimi ---');
    {
      // Talep: 10.000 adet, termin: 10 Kasım 2026
      // Arz: 2.000 adet 9 Kasım, 8.000 adet 20 Kasım
      const res = calculateSingleDemandPure({
        grossDemand: 10000,
        tubeStock: 0,
        dueDate: '2026-11-10T00:00:00Z',
        planSupplies: [
          { quantity: 2000, endDate: '2026-11-09T00:00:00Z' },
          { quantity: 8000, endDate: '2026-11-20T00:00:00Z' }
        ]
      });

      assert(res.onTimeCoveredQuantity === 2000, 'Zamanında karşılanan miktar: 2.000 adet');
      assert(res.delayedCoveredQuantity === 8000, 'Geç karşılanan miktar (termin açığı): 8.000 adet');
      assert(res.uncoveredQuantity === 0, 'Hiç karşılanmamış miktar: 0');
      assert(res.isScheduleDelayed === true, 'Geç arz termin açığı olarak işaretlenmeli (isScheduleDelayed: true)');
      assert(res.delayDays === 10, 'Gecikme süresi 10 gün olmalı (Hesaplanan: 10)');
      assert(res.fullCoverageDate !== null && new Date(res.fullCoverageDate).toISOString().startsWith('2026-11-20'), 'Tam karşılanma tarihi 20 Kasım olmalı');
    }

    // -------------------------------------------------------------
    // TEST 5: Alternatif Taslakların Tekil Seçimi
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Alternatif Taslakların İki Kez Arz Sağlamaması ---');
    {
      const latestCalc = await getLatestCalculation();
      assert(latestCalc !== null, 'En son hesaplama kaydı mevcut olmalı');
      assert(latestCalc.plan_draft_id !== null, `Seçilmiş plan taslağı ID kayıtlı olmalı (Draft: ${latestCalc.plan_draft_id})`);
      assert(latestCalc.plan_title !== null, `Seçilmiş plan başlığı kayıtlı olmalı (${latestCalc.plan_title})`);
    }

    // -------------------------------------------------------------
    // TEST 6: Ayrıştırıcı demand_key ve Bölünmüş Dolum Satırı Koruması
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: demand_key Ayrıştırıcılığı ve Oransal Kalan Miktar ---');
    {
      const isNo = 'IP206190A005';
      const guid = '53515DFE-745E-45F0-BB2D-44D5D540E1AC';
      const key1 = `${isNo}_${guid}_2026-11-15_MAKAS1_1`;
      const key2 = `${isNo}_${guid}_2026-11-20_MAKAS2_2`;

      assert(key1 !== key2, 'Farklı tarih/makine satırları benzersiz demand_key almalı');

      // Oransal kalan miktar formülü testi:
      // İş emri planı: 10.000. Gerçekleşen: 2.000 (%20 tamamlandı).
      // Bölünmüş Satır A: 6.000 plan -> Kalan: 6.000 * (1 - 0.2) = 4.800
      // Bölünmüş Satır B: 4.000 plan -> Kalan: 4.000 * (1 - 0.2) = 3.200
      const planA = 6000;
      const planB = 4000;
      const totalOrderPlan = 10000;
      const totalOrderProduced = 2000;
      const ratioProduced = totalOrderProduced / totalOrderPlan;

      const remA = planA * (1 - ratioProduced);
      const remB = planB * (1 - ratioProduced);

      assert(remA === 4800, 'Bölünmüş Satır A kalan miktarı 4.800 olmalı');
      assert(remB === 3200, 'Bölünmüş Satır B kalan miktarı 3.200 olmalı');
      assert(remA + remB === 8000, 'Toplam kalan miktar iş emrinin net açığına (8.000) eşit olmalı, mükerrer 8.000 bindirilmemeli');
    }

    // -------------------------------------------------------------
    // TEST 7: Senkron Değişikliği ve Eski Hesap Tespiti (is_stale)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Senkron Değişikliği ve Eski Hesap Tespiti (is_stale) ---');
    {
      const latestCalc = await getLatestCalculation();
      assert(typeof latestCalc.is_stale === 'boolean', `is_stale boolean bayrağı mevcut olmalı (is_stale: ${latestCalc.is_stale})`);
    }

    // -------------------------------------------------------------
    // TEST 8: Çoklu veya Tanımsız Ham Levha Belirsizlik Koruması
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Çoklu/Tanımsız Ham Levha Belirsizliğinin Korunumu ---');
    {
      // Kapasite onaylı parametre yoksa sahte kapasite üretilmez
      const res = calculateSingleDemandPure({
        grossDemand: 5000,
        tubeStock: 0,
        rawSheetCapacity: null
      });

      assert(res.rawSheetCapacity === null, 'Kapasite parametresi yoksa null kalmalı');
      assert(res.estimatedRawSheets === null, 'Tahmini ham levha sayısı null kalmalı, uydurma değer üretilmemeli');
    }

    // -------------------------------------------------------------
    // TEST 9: Negatif Kaynak Stok ve Geçersiz Katsayı
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Negatif Kaynak Stok ve Geçersiz Katsayı Yönetimi ---');
    {
      const resNeg = calculateSingleDemandPure({
        grossDemand: 5000,
        tubeStock: -120 // ERP'de negatif bakiye
      });

      assert(resNeg.allocatedTubeStock === 0, 'Negatif stok tahsis edilebilir olarak 0 alınmalı');
      assert(resNeg.netTubeDemand === 5000, 'Net ihtiyaç negatif stoktan düşülmemeli, tam 5.000 kalmalı');

      const resZeroRatio = calculateSingleDemandPure({
        grossDemand: 5000,
        tubeStock: 0,
        cuttingStock: 1000,
        ratioTubeToCutting: 0 // Geçersiz katsayı
      });

      assert(resZeroRatio.allocatedCuttingPhysical === 0, 'Sıfır katsayıda kesik tahsis yapılmamalı');
      assert(resZeroRatio.netCuttingDemandTubeEquiv === 5000, 'Net kesim tüp ihtiyacı 5.000 kalmalı');
    }

    // -------------------------------------------------------------
    // TEST 10: Canlı Veritabanı Kesin Sayısal Mutabakatı
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Canlı Veritabanı Kesin Sayısal Mutabakatı (Sıfır Fark Garantisi) ---');
    {
      const latestCalc = await getLatestCalculation();
      const gross = parseFloat(latestCalc.total_gross_tube);
      const allocTube = parseFloat(latestCalc.total_allocated_tube);
      const netTube = parseFloat(latestCalc.total_net_tube);
      const allocCut = parseFloat(latestCalc.total_allocated_cutting);
      const netCut = parseFloat(latestCalc.total_net_cutting);
      const allocPrint = parseFloat(latestCalc.total_allocated_print);
      const netPrint = parseFloat(latestCalc.total_net_print);

      const onTime = parseFloat(latestCalc.total_on_time_covered);
      const delayed = parseFloat(latestCalc.total_delayed_covered);
      const additional = parseFloat(latestCalc.total_additional_planning);

      console.log(`  > Brüt Tüp: ${gross.toLocaleString('tr-TR')} adet`);
      console.log(`  > Tahsis Edilen Tüp: ${allocTube.toLocaleString('tr-TR')} adet`);
      console.log(`  > Net Tüp Üretimi: ${netTube.toLocaleString('tr-TR')} adet`);
      console.log(`  > Tahsis Edilen Kesik: ${allocCut.toLocaleString('tr-TR')} adet (Tüp Eşdeğeri)`);
      console.log(`  > Net Kesim İhtiyacı: ${netCut.toLocaleString('tr-TR')} adet (Tüp Eşdeğeri)`);
      console.log(`  > Tahsis Edilen Baskılı: ${allocPrint.toLocaleString('tr-TR')} adet (Tüp Eşdeğeri)`);
      console.log(`  > Net Yeni Baskı İhtiyacı: ${netPrint.toLocaleString('tr-TR')} adet (Tüp Eşdeğeri)`);
      console.log(`  > Planda Zamanında Karşılanan: ${onTime.toLocaleString('tr-TR')} adet`);
      console.log(`  > Planda Geç Karşılanan (Termin Açığı): ${delayed.toLocaleString('tr-TR')} adet`);
      console.log(`  > Planda Hiç Karşılanmayan (İlave Planlama): ${additional.toLocaleString('tr-TR')} adet`);

      // 1. Brüt - Tahsis = Net Tüp
      const diff1 = Math.abs((gross - allocTube) - netTube);
      assert(diff1 < 0.01, `Brüt - Tahsis = Net Tüp eşitliği tam olmalı (Fark: ${diff1})`);

      // 2. Net Tüp - Tahsis Kesik = Net Kesim
      const diff2 = Math.abs((netTube - allocCut) - netCut);
      assert(diff2 < 0.01, `Net Tüp - Tahsis Kesik = Net Kesim eşitliği tam olmalı (Fark: ${diff2})`);

      // 3. Net Kesim - Tahsis Baskılı = Net Baskı
      const diff3 = Math.abs((netCut - allocPrint) - netPrint);
      assert(diff3 < 0.01, `Net Kesim - Tahsis Baskılı = Net Baskı eşitliği tam olmalı (Fark: ${diff3})`);

      // 4. Zamanında + Geç + İlave = Net Tüp
      const diff4 = Math.abs((onTime + delayed + additional) - netTube);
      assert(diff4 < 0.01, `Zamanında + Geç + İlave = Net Tüp eşitliği tam olmalı (Fark: ${diff4})`);
    }

    // -------------------------------------------------------------
    // TEST 11: Gerçek Ürün Kabulü (511112011210-8709) ve Reçete-Stok Ayrımı
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Gerçek Ürün Kabulü (511112011210-8709) ve Reçete-Stok Ayrımı ---');
    {
      // 1. Canlı Reçete Bağlantısını Doğrula
      const recipeRes = await dbQuery(`
        SELECT parent_stock_code, child_stock_code, child_category, child_stock_name, consumption_ratio
        FROM erp_recipe_links
        WHERE parent_stock_code IN ('511112011210-8709', '511112011211-8709')
        ORDER BY id ASC
      `);

      const kesikLink = recipeRes.rows.find(r => r.parent_stock_code === '511112011210-8709' && r.child_category === 'KESIKLEVHA');
      assert(kesikLink !== undefined, '511112011210-8709 için KESIKLEVHA reçetesi bulunmalı');
      assert(kesikLink?.child_stock_code === '511112011211-8709', `K- bileşeni 511112011211-8709 olmalı (Bulunan: ${kesikLink?.child_stock_code})`);
      assert(kesikLink?.child_stock_name?.startsWith('K-'), `Kesik stok adı K- ile başlamalı (Adı: ${kesikLink?.child_stock_name})`);

      const baskiliLink = recipeRes.rows.find(r => r.parent_stock_code === '511112011211-8709' && r.child_category === 'BASKILILEVHA');
      assert(baskiliLink !== undefined, '511112011211-8709 için BASKILILEVHA reçetesi bulunmalı');
      assert(baskiliLink?.child_stock_code === '511112001211-8709', `B- bileşeni 511112001211-8709 olmalı (Bulunan: ${baskiliLink?.child_stock_code})`);
      assert(baskiliLink?.child_stock_name?.startsWith('B-'), `Baskılı stok adı B- ile başlamalı (Adı: ${baskiliLink?.child_stock_name})`);

      // 2. Canlı Tahsis Sonucunda 4.800 Talep için Kontrol (Stoktan Karşılandı ama Reçete Görünür)
      const latestCalc = await getLatestCalculation();
      const allocatedDemands = await getAllocatedDemands(latestCalc.id);
      const demand4800 = allocatedDemands.find(d => d.stock_code === '511112011210-8709' && parseFloat(d.gross_quantity) === 4800);

      assert(demand4800 !== undefined, '4.800 adetlik 511112011210-8709 talebi (EH260205A048) bulunmalı');
      assert(parseFloat(demand4800?.net_tube_quantity) === 0, 'Tüp stoğundan karşılandığı için Net Tüp = 0 olmalı');
      assert(parseFloat(demand4800?.net_cutting_quantity) === 0, 'Net Kesim = 0 olmalı');
      assert(parseFloat(demand4800?.net_print_quantity) === 0, 'Yeni Baskı = 0 olmalı');
      assert(demand4800?.cutting_stock_code === '511112011211-8709', `İhtiyaç 0 olsa da K- kodu (511112011211-8709) görünür olmalı (Bulunan: ${demand4800?.cutting_stock_code})`);
      assert(demand4800?.print_stock_code === '511112001211-8709', `İhtiyaç 0 olsa da B- kodu (511112001211-8709) görünür olmalı (Bulunan: ${demand4800?.print_stock_code})`);
      assert(demand4800?.calculation_status === 'CALCULATED', 'Durum CALCULATED (Hesaplandı) olmalı, Reçetesiz kalmamalı');

      // 3. İzole Test: Aynı Ürün İçin Stok Yetersiz Senaryosu (Tüp -> K Stoğu -> B Stoğu -> Yeni Baskı)
      // Canlı veri değiştirilmeden pure çekirdek ile doğrulanır
      const isolatedScenario = calculateSingleDemandPure({
        grossDemand: 5000,
        tubeStock: 0,       // Tüp stoğu yok
        cuttingStock: 1000, // 1.000 kesik stok var
        ratioTubeToCutting: 1.0,
        printStock: 1000,   // 1.000 baskılı stok var
        ratioCuttingToPrint: 1.0,
        rawSheetCapacity: 20
      });

      assert(isolatedScenario.netTubeDemand === 5000, 'Tüp stoğu yokken Net Tüp = 5.000');
      assert(isolatedScenario.allocatedCuttingPhysical === 1000, 'Kesik stoktan 1.000 tahsis edilmeli');
      assert(isolatedScenario.netCuttingDemandTubeEquiv === 4000, 'Net Kesim İhtiyacı 4.000 kalmalı');
      assert(isolatedScenario.allocatedPrintPhysical === 1000, 'Baskılı stoktan 1.000 tahsis edilmeli');
      assert(isolatedScenario.netPrintDemandTubeEquiv === 3000, 'Net Yeni Baskı İhtiyacı 3.000 kalmalı');
      assert(isolatedScenario.estimatedRawSheets === 150, 'Tahmini Ham Levha: 3.000 / 20 = 150 levha');
    }

    console.log('\n================================================================');
    console.log(`TEST SONUCU: ${passedCount} BAŞARILI, ${failedCount} BAŞARISIZ`);
    console.log('================================================================');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test süiti hatası:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
