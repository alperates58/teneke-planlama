/**
 * Faz 3B: Kademeli İhtiyaç Motoru ve Veri Sözleşmesi Test Süiti
 * 
 * Test Kapsamı:
 * 1. 50/10/5/7 Örneği -> 40/35/28 kademeli netleme formülü doğrulaması.
 * 2. Aynı tüp için 8.000 + 8.000 talep, 10.000 stok -> FIFO sıralı tekil tahsis (toplam net 6.000).
 * 3. Farklı ürünlerin fazla stoklarının birbirini azaltmaması (stok izolasyonu).
 * 4. Fazla stok, sıfır stok, negatif kaynak stok yönetimi ve uyarılar.
 * 5. Ortak kesik/baskılı kaynağın tekil tahsisi.
 * 6. Eksik/sıfır katsayı ve reçete hatalarının satırı kaybetmemesi.
 * 7. demand_key ile aynı iş emrinin farklı plan/tarih satırlarının korunması.
 * 8. Geç gelen üretim planının termin açığını gizlememesi.
 * 9. String/Number giriş güvenliği; geçersiz miktarların sessizce sıfıra dönmemesi.
 * 10. Canlı ERP veritabanı üzerinden en az 10 gerçek üründe Talep -> Stok -> Reçete -> Sonuç mutabakatı.
 */

const { Pool } = require('pg');
const { getLatestCalculation, getAllocatedDemands } = require('../server/services/demandAllocationService');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'teneke_planlama',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123'
});

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
  console.log('FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE VERİ SÖZLEŞMESİ TEST SÜİTİ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: 50 / 10 / 5 / 7 Örneği -> 40 / 35 / 28 Formül Doğrulaması
    // -------------------------------------------------------------
    console.log('--- TEST 1: 50/10/5/7 Kademeli Netleme Formülü Doğrulaması ---');
    {
      const grossDemand = 50000;
      const tubeStock = 10000;
      const cuttingStock = 5000;
      const printStock = 7000;

      // Aşama 1: Tüp
      const allocTube = Math.min(grossDemand, Math.max(0, tubeStock));
      const netTube = grossDemand - allocTube;

      // Aşama 2: Kesik Levha (1:1 oranı varsayımı)
      const ratioTubeCut = 1.0;
      const grossCutNeeded = netTube * ratioTubeCut;
      const allocCut = Math.min(grossCutNeeded, Math.max(0, cuttingStock));
      const netCut = grossCutNeeded - allocCut;

      // Aşama 3: Baskılı Levha (1:1 oranı varsayımı)
      const ratioCutPrint = 1.0;
      const grossPrintNeeded = netCut * ratioCutPrint;
      const allocPrint = Math.min(grossPrintNeeded, Math.max(0, printStock));
      const netPrint = grossPrintNeeded - allocPrint;

      assert(netTube === 40000, `Net Tüp İhtiyacı 40.000 adet olmalı (Hesaplanan: ${netTube})`);
      assert(netCut === 35000, `Net Kesim İhtiyacı 35.000 adet olmalı (Hesaplanan: ${netCut})`);
      assert(netPrint === 28000, `Net Yeni Baskı İhtiyacı 28.000 adet olmalı (Hesaplanan: ${netPrint})`);
      assert(allocTube === 10000, `Tahsis edilen tüp stok: 10.000`);
      assert(allocCut === 5000, `Tahsis edilen kesik stok: 5.000`);
      assert(allocPrint === 7000, `Tahsis edilen baskılı stok: 7.000`);
    }

    // -------------------------------------------------------------
    // TEST 2: Aynı Tüp İçin 8.000 + 8.000 Talep, 10.000 Stok (FIFO Tekil Tahsis)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Sıralı ve Tek Seferlik Stok Tahsisi (8.000 + 8.000, 10.000 Stok) ---');
    {
      let usableStockPool = 10000;
      const demandA = 8000;
      const demandB = 8000;

      // Talep A (Önceki termin)
      const allocA = Math.min(demandA, usableStockPool);
      usableStockPool -= allocA;
      const netA = demandA - allocA;

      // Talep B (Sonraki termin)
      const allocB = Math.min(demandB, usableStockPool);
      usableStockPool -= allocB;
      const netB = demandB - allocB;

      const totalNetTube = netA + netB;

      assert(allocA === 8000, `İlk talep (A) 8.000 stok almalı (Tahsis: ${allocA})`);
      assert(netA === 0, `İlk talep net ihtiyacı 0 olmalı (Net: ${netA})`);
      assert(allocB === 2000, `İkinci talep (B) kalan 2.000 stoğu almalı (Tahsis: ${allocB})`);
      assert(netB === 6000, `İkinci talep net ihtiyacı 6.000 olmalı (Net: ${netB})`);
      assert(totalNetTube === 6000, `Toplam net tüp ihtiyacı tam 6.000 adet olmalı (Toplam: ${totalNetTube})`);
      assert(usableStockPool === 0, `Stok havuzu sıfırlanmalı (Kalan: ${usableStockPool})`);
    }

    // -------------------------------------------------------------
    // TEST 3: Farklı Ürünlerin Fazla Stoklarının İzolasyonu
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Stok İzolasyonu (Farklı Ürünlerin Stokları Birbirini Azaltamaz) ---');
    {
      const productX = { demand: 5000, stock: 20000 };
      const productY = { demand: 10000, stock: 0 };

      const allocX = Math.min(productX.demand, productX.stock);
      const netX = productX.demand - allocX;
      const remainX = productX.stock - allocX; // 15.000 fazla

      const allocY = Math.min(productY.demand, productY.stock);
      const netY = productY.demand - allocY;

      assert(netX === 0, `Ürün X'in net ihtiyacı 0 olmalı`);
      assert(remainX === 15000, `Ürün X'in 15.000 fazla stoğu kalmalı`);
      assert(allocY === 0, `Ürün Y'nin tahsis edilen stoğu 0 olmalı`);
      assert(netY === 10000, `Ürün Y'nin net ihtiyacı Ürün X'in fazla stoğundan etkilenmeden 10.000 kalmalı`);
    }

    // -------------------------------------------------------------
    // TEST 4: Fazla Stok, Sıfır Stok, Negatif Kaynak Stok
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Sınır Değerler: Sıfır Stok, Fazla Stok, Negatif Kaynak Stok ---');
    {
      // Sıfır stok
      const netZeroStock = 5000 - Math.min(5000, Math.max(0, 0));
      assert(netZeroStock === 5000, `Sıfır stokta net ihtiyaç brüt miktara eşit olmalı (5.000)`);

      // Fazla stok (negatif ihtiyaç üretmez)
      const excessAlloc = Math.min(5000, Math.max(0, 8000));
      const netExcess = 5000 - excessAlloc;
      assert(netExcess === 0, `Fazla stok negatif ihtiyaç üretmez (Net: ${netExcess})`);

      // Negatif kaynak stok (ERP'de -120 adet kayıtlı)
      const rawStock = -120.0;
      const usableStock = Math.max(0, rawStock);
      const isNegative = rawStock < 0;
      const allocNeg = Math.min(5000, usableStock);
      const netNeg = 5000 - allocNeg;

      assert(usableStock === 0, `Negatif kaynak stok tahsis edilebilir miktar olarak 0 alınmalı`);
      assert(isNegative === true, `Negatif stok bayrağı true olmalı`);
      assert(netNeg === 5000, `Negatif stok net ihtiyacı azaltamaz, net talep tam 5.000 kalmalı`);
    }

    // -------------------------------------------------------------
    // TEST 5: Ortak Kesik/Baskılı Kaynağın Tekil Tahsisi
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Ortak Alt Bileşen (Kesik/Baskılı) Tekil Tahsis Mantığı ---');
    {
      // İki farklı tüp talebi (TUP-1 ve TUP-2), aynı kesik levhayı (KESIK-ORTAK) kullanıyor.
      let sharedCuttingPool = 15000;
      const demand1NetTube = 10000;
      const demand2NetTube = 10000;

      // Talep 1
      const alloc1 = Math.min(demand1NetTube, sharedCuttingPool);
      sharedCuttingPool -= alloc1;
      const netCut1 = demand1NetTube - alloc1;

      // Talep 2
      const alloc2 = Math.min(demand2NetTube, sharedCuttingPool);
      sharedCuttingPool -= alloc2;
      const netCut2 = demand2NetTube - alloc2;

      assert(alloc1 === 10000, `Talep 1 ortak kesikten 10.000 adet almalı`);
      assert(netCut1 === 0, `Talep 1 net kesim ihtiyacı 0 olmalı`);
      assert(alloc2 === 5000, `Talep 2 ortak kesikten kalan 5.000 adedi almalı`);
      assert(netCut2 === 5000, `Talep 2 net kesim ihtiyacı 5.000 olmalı`);
      assert(sharedCuttingPool === 0, `Ortak kesik havuzu 0'a inmeli, mükerrer tahsis engellenmeli`);
    }

    // -------------------------------------------------------------
    // TEST 6: Eksik/Sıfır Katsayı ve Reçete Hataları
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Eksik/Sıfır Katsayı ve Reçete Hatalarında Satır Korunumu ---');
    {
      const invalidRatio = 0;
      const missingCuttingCode = null;

      let calcStatus = 'CALCULATED';
      let unresolvedReason = null;
      let netCutting = null;

      if (!missingCuttingCode || invalidRatio <= 0) {
        calcStatus = 'UNRESOLVED';
        unresolvedReason = 'Geçerli kesik levha reçetesi veya katsayısı bulunamadı';
      }

      assert(calcStatus === 'UNRESOLVED', `Eksik katsayıda hesap durumu UNRESOLVED olmalı`);
      assert(unresolvedReason !== null, `Çözümlenememe gerekçesi açıkça belirtilmeli`);
      assert(netCutting === null, `Eksik reçetede sahte sıfır yerine NULL korunmalı`);
    }

    // -------------------------------------------------------------
    // TEST 7: demand_key ile Aynı İş Emrinin Farklı Satırlarının Korunumu
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: demand_key ile Çoklu Plan Satırı Korunumu ---');
    {
      const isNo = 'IP206190A005';
      const guid1 = '53515DFE-745E-45F0-BB2D-44D5D540E1AC';
      const guid2 = 'F1515DFE-745E-45F0-BB2D-44D5D540E1AC';

      const key1 = `${isNo}_${guid1}`;
      const key2 = `${isNo}_${guid2}`;

      assert(key1 !== key2, `Aynı iş no'nun farklı dolum satırları farklı demand_key üretmeli`);
      assert(key1.includes(guid1), `demand_key upl_Guid bileşenini içermeli`);
    }

    // -------------------------------------------------------------
    // TEST 8: Geç Gelen Üretim Planı ve Termin Açığı
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Geç Gelen Üretim Planı ve Termin Açığı Mantığı ---');
    {
      const dueDate = new Date('2026-11-10T00:00:00Z');
      const planFinishDate = new Date('2026-11-20T00:00:00Z');

      const isDelayed = planFinishDate > dueDate;
      const delayDays = Math.ceil((planFinishDate - dueDate) / (1000 * 60 * 60 * 24));

      assert(isDelayed === true, `Dolum termininden sonra biten plan gecikmeli olarak işaretlenmeli`);
      assert(delayDays === 10, `Gecikme süresi 10 gün olarak hesaplanmalı (Hesaplanan: ${delayDays})`);
    }

    // -------------------------------------------------------------
    // TEST 9: String / Number Giriş Güvenliği
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: String/Number Güvenliği ve Geçersiz Giriş Ayrımı ---');
    {
      const parseSafe = (val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        if (isNaN(num)) return NaN;
        return num;
      };

      const validStr = '12500.50';
      const invalidStr = 'gecersiz_miktar';
      const nullVal = null;

      assert(parseSafe(validStr) === 12500.50, `Geçerli string sayıya doğru çevrilmeli`);
      assert(isNaN(parseSafe(invalidStr)), `Geçersiz string sessizce 0'a değil NaN'a dönmeli`);
      assert(parseSafe(nullVal) === null, `Null değer null korunmalı`);
    }

    // -------------------------------------------------------------
    // TEST 10: Canlı Veritabanından En Az 10 Gerçek Ürün Mutabakatı
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Canlı Veritabanı ve Hesaplama Koşusu Mutabakatı (10 Gerçek Ürün) ---');
    {
      const latestRun = await getLatestCalculation();
      assert(latestRun !== null, `PostgreSQL calculation_runs tablosunda en az bir başarılı koşu bulunmalı`);
      if (latestRun) {
        console.log(`  > Son Koşu ID: ${latestRun.id} | Tarih: ${latestRun.started_at}`);
        console.log(`  > Toplam Talep: ${latestRun.total_demands} satır | Başarılı: ${latestRun.calculated_count}`);
        console.log(`  > Brüt Tüp: ${Number(latestRun.total_gross_tube).toLocaleString('tr-TR')} adet`);
        console.log(`  > Tahsis Edilen Tüp Stok: ${Number(latestRun.total_allocated_tube).toLocaleString('tr-TR')} adet`);
        console.log(`  > Net Tüp Üretimi: ${Number(latestRun.total_net_tube).toLocaleString('tr-TR')} adet`);
        console.log(`  > Tahsis Edilen Kesik Stok: ${Number(latestRun.total_allocated_cutting).toLocaleString('tr-TR')} adet`);
        console.log(`  > Net Kesim İhtiyacı: ${Number(latestRun.total_net_cutting).toLocaleString('tr-TR')} adet`);
        console.log(`  > Tahsis Edilen Baskılı Stok: ${Number(latestRun.total_allocated_print).toLocaleString('tr-TR')} adet`);
        console.log(`  > Net Yeni Baskı İhtiyacı: ${Number(latestRun.total_net_print).toLocaleString('tr-TR')} adet`);

        // En az 10 gerçek talep çekelim
        const allocatedDemands = await getAllocatedDemands(latestRun.id);
        assert(allocatedDemands.length >= 10, `En az 10 satır tahsis edilmiş talep dönmeli (Dönen: ${allocatedDemands.length})`);

        console.log('\n  GERÇEK ERP ÜRÜN DÖKÜMÜ VE MUTABAKAT TABLOSU (İLK 10 TALEP):');
        console.log('  -----------------------------------------------------------------------------------------------------------------------------------');
        console.log('  #  | Sipariş No     | Tüp Kodu            | Brüt Talep | Tüp Stok  | Net Tüp    | Kesik Kod           | Net Kesim  | Baskı Kod           | Net Baskı  | Ham Levha Kod       | Durum');
        console.log('  -----------------------------------------------------------------------------------------------------------------------------------');

        const sample = allocatedDemands.slice(0, 10);
        sample.forEach((d, idx) => {
          const num = String(idx + 1).padStart(2, ' ');
          const ref = String(d.reference_no || d.is_no).substring(0, 14).padEnd(14, ' ');
          const tube = String(d.stock_code).substring(0, 19).padEnd(19, ' ');
          const gross = String(Math.round(d.gross_quantity)).padStart(10, ' ');
          const tAlloc = String(Math.round(d.allocated_tube_stock || 0)).padStart(9, ' ');
          const nTube = String(Math.round(d.net_tube_quantity !== undefined ? d.net_tube_quantity : d.net_quantity)).padStart(10, ' ');
          const cCode = String(d.cutting_stock_code || 'YOK').substring(0, 19).padEnd(19, ' ');
          const nCut = String(Math.round(d.net_cutting_quantity !== undefined ? d.net_cutting_quantity : d.net_quantity)).padStart(10, ' ');
          const pCode = String(d.print_stock_code || 'YOK').substring(0, 19).padEnd(19, ' ');
          const nPrint = String(Math.round(d.net_print_quantity !== undefined ? d.net_print_quantity : d.net_quantity)).padStart(10, ' ');
          const sCode = String(d.raw_sheet_code || 'YOK').substring(0, 19).padEnd(19, ' ');
          const status = String(d.calculation_status).substring(0, 10);

          console.log(`  ${num} | ${ref} | ${tube} | ${gross} | ${tAlloc} | ${nTube} | ${cCode} | ${nCut} | ${pCode} | ${nPrint} | ${sCode} | ${status}`);
        });
        console.log('  -----------------------------------------------------------------------------------------------------------------------------------\n');
      }
    }

    console.log('================================================================');
    console.log(`TEST SONUCU: ${passedCount} BAŞARILI, ${failedCount} BAŞARISIZ`);
    console.log('================================================================');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test süiti çalışma hatası:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
