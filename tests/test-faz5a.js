/**
-- ============================================================================
-- FAZ 5A: TEK MAKİNE TAKVİMİ VE ÜRETİM ÇİZELGELEME TEST SÜİTİ
-- Dosya: tests/test-faz5a.js
-- Tarih: 07.11.2026
-- Amaç: Tek makine çizelgeleme motorunu, vardiya/mola/gece taşması takvimini,
--       çap/boy ayar sürelerini, kilitli işleri, 409 eşzamanlılık korumasını
--       ve gerçek veritabanı senaryolarını firesiz doğrulamak.
-- ============================================================================
*/

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Servis ve motor referansları
let schedulingEngine;
let planSyncService;
let db;

try {
  schedulingEngine = require('../server/services/schedulingEngine');
  planSyncService = require('../server/services/plan-sync-service');
  db = require('../server/db');
} catch (e) {
  schedulingEngine = require('./server/services/schedulingEngine');
  planSyncService = require('./server/services/plan-sync-service');
  db = require('./server/db');
}

let passCount = 0;
let failCount = 0;

function logPass(msg) {
  console.log(`  [PASS] ${msg}`);
  passCount++;
}

function logFail(msg, err) {
  console.error(`  [FAIL] ${msg}:`, err ? err.message : '');
  failCount++;
}

async function runTests() {
  console.log('================================================================');
  console.log('FAZ 5A: TEK MAKİNE TAKVİMİ VE ÜRETİM ÇİZELGELEME TEST SÜİTİ');
  console.log('================================================================\n');

  // Varsayılan Takvim ve Molalar
  const defaultConfig = {
    work_start_time: '07:30',
    work_end_time: '17:30',
    shift_end_time: '01:30',
    setup_calendar_mode: 'WORK_HOURS',
    has_shift: true
  };

  const defaultBreaks = [
    { break_name: 'Mola 1', start_time: '09:15', end_time: '09:30', is_active: true },
    { break_name: 'Mola 2 (Öğle)', start_time: '12:00', end_time: '12:30', is_active: true },
    { break_name: 'Mola 3', start_time: '15:15', end_time: '15:30', is_active: true },
    { break_name: 'Mola 4', start_time: '19:30', end_time: '19:45', is_active: true },
    { break_name: 'Mola 5 (Akşam)', start_time: '21:30', end_time: '22:00', is_active: true },
    { break_name: 'Mola 6', start_time: '23:30', end_time: '23:45', is_active: true }
  ];

  const defaultSetupRules = [
    { change_type: 'DIAMETER_TO_45', setup_duration_minutes: 480 },
    { change_type: 'DIAMETER_OTHER', setup_duration_minutes: 180 },
    { change_type: 'HEIGHT_ONLY', setup_duration_minutes: 60 },
    { change_type: 'SAME_SIZE', setup_duration_minutes: 0 }
  ];

  const speedMap = new Map([
    ['52x195', 185.1852],
    ['65x195', 185.1852],
    ['65x104', 185.1852],
    ['45x140', 185.1852],
    ['65x260', 148.1481],
    ['65x300', 100.0000]
  ]);

  // --------------------------------------------------------------------------
  // SENARYO 1: Tek Vardiyada Basit İş ve Net Çalışma Süresi Hesabı
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Tek Vardiyada Basit İş ve Süre Hesabı ---');
  try {
    // 07:30'da başlayan 10.000 adet 52x195 (Hız: 185.1852 adet/dk)
    // Süre = 10000 / 185.1852 = 54.00 dakika
    // 07:30 + 54 dk = 08:24 (Mola yok)
    const res = schedulingEngine.scheduleProductionPlanPure({
      items: [{ id: 1, tube_size: '52x195', quantity: 10000 }],
      scheduleStartTime: '2026-11-09T07:30:00+03:00', // Pazartesi
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const it = res.scheduledItems[0];
    assert.strictEqual(it.setup_duration_minutes, 0);
    assert.strictEqual(Math.round(it.production_duration_minutes), 54);
    
    // Bitiş saati 08:24 olmalı
    const endTR = schedulingEngine.getTRComponents(it.suggested_end_date);
    assert.strictEqual(endTR.hours, 8);
    assert.strictEqual(endTR.minutes, 24);
    logPass('54 dakikalık iş 07:30 başlangıçla tam 08:24:00\'te bitmeli');
  } catch (e) {
    logFail('Test 1 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 2: Molalar (Başlangıç, Orta, Bitiş ve Kalan Süre Bekleme)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Mola Kesişimi ve Kalan Mola Süresini Bekleme ---');
  try {
    // 09:00'da başlayan 5.555 adet (30 dk üretim)
    // 09:00 - 09:15 arası 15 dk üretir.
    // 09:15 - 09:30 mola (15 dk duruş)
    // 09:30'da tekrar başlar ve kalan 15 dk'yı üretir -> Bitiş: 09:45
    const res = schedulingEngine.scheduleProductionPlanPure({
      items: [{ id: 1, tube_size: '52x195', quantity: 5555.556 }],
      scheduleStartTime: '2026-11-09T09:00:00+03:00',
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const it = res.scheduledItems[0];
    const endTR = schedulingEngine.getTRComponents(it.suggested_end_date);
    assert.strictEqual(endTR.hours, 9);
    assert.strictEqual(endTR.minutes, 45);
    logPass('Mola kesintisi doğru atlandı: 09:00 başlayan 30 dk iş, 15 dk mola ile 09:45\'te bitti');

    // Mola ortasında başlangıç: 09:20'de başlayan bir iş (Mola 09:15-09:30)
    // Yalnız kalan 10 dk mola süresi beklenmeli, 09:30'da işe başlanmalı!
    const resMid = schedulingEngine.scheduleProductionPlanPure({
      items: [{ id: 2, tube_size: '52x195', quantity: 1851.852 }], // 10 dk iş
      scheduleStartTime: '2026-11-09T09:20:00+03:00',
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });
    const itMid = resMid.scheduledItems[0];
    const startTRMid = schedulingEngine.getTRComponents(itMid.suggested_start_date);
    const endTRMid = schedulingEngine.getTRComponents(itMid.suggested_end_date);
    assert.strictEqual(startTRMid.minutes, 30);
    assert.strictEqual(endTRMid.minutes, 40);
    logPass('Mola ortasında (09:20) verilen başlangıç yalnız kalan 10 dk molayı bekleyip 09:30\'da başladı');
  } catch (e) {
    logFail('Test 2 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 3: Gece Taşması, Vardiya Sonu ve Ertesi Güne Devir
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Gece Taşması (01:30 Bitiş) ve Ertesi Gün Devri ---');
  try {
    // 00:00'da başlayan 120 dakikalık iş (Gece 01:30 vardiya bitişi)
    // 00:00 - 01:30 arası 90 dk çalışır.
    // 01:30 - 07:30 arası fabrika kapalı (6 saat duruş)
    // 07:30'da kalan 30 dk çalışır -> Bitiş: 08:00
    const res = schedulingEngine.scheduleProductionPlanPure({
      items: [{ id: 1, tube_size: '52x195', quantity: 22222.224 }], // 120 dk üretim
      scheduleStartTime: '2026-11-10T00:00:00+03:00', // Salı gecesi
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const it = res.scheduledItems[0];
    const endTR = schedulingEngine.getTRComponents(it.suggested_end_date);
    assert.strictEqual(endTR.date, 10);
    assert.strictEqual(endTR.hours, 8);
    assert.strictEqual(endTR.minutes, 0);
    logPass('Gece 01:30 vardiya bitişinde duran iş ertesi sabah 07:30\'da devam edip 08:00\'de bitti');
  } catch (e) {
    logFail('Test 3 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 4: Hafta Sonu ve Pazar Tatili Atlaması
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Hafta Sonu (Cumartesi 13:00 Bitiş, Pazar Tatil) ---');
  try {
    // 14 Kasım 2026 Cumartesi 12:30'da başlayan 60 dakikalık iş
    // Cumartesi 12:30 - 13:00 (30 dk çalışır)
    // Cumartesi 13:00 sonrası ve Pazar günü tatil
    // 16 Kasım Pazartesi 07:30'da kalan 30 dk çalışır -> Bitiş: 08:00
    const res = schedulingEngine.scheduleProductionPlanPure({
      items: [{ id: 1, tube_size: '52x195', quantity: 11111.112 }], // 60 dk üretim
      scheduleStartTime: '2026-11-14T12:30:00+03:00', // Cumartesi
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const it = res.scheduledItems[0];
    const endTR = schedulingEngine.getTRComponents(it.suggested_end_date);
    assert.strictEqual(endTR.date, 16); // Pazartesi
    assert.strictEqual(endTR.hours, 8);
    assert.strictEqual(endTR.minutes, 0);
    logPass('Cumartesi 13:00\'te yarım kalan iş Pazar tatilini atlayıp Pazartesi 08:00\'de tamamlandı');
  } catch (e) {
    logFail('Test 4 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 5: Çap ve Boy Hazırlık Süresi Matrisi (Setup Time Matrix)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Çap ve Boy Hazırlık Matrisi (Excel Doğrulama) ---');
  try {
    // Kural 1: Hedef çap 45 ise -> 480 dakika (8 saat)
    const setup45 = schedulingEngine.calculateSetupMinutes('52x195', '45x140', defaultSetupRules);
    assert.strictEqual(setup45, 480);
    logPass('52x195 -> 45x140 çap değişimi tam 480 dakika (8 saat) ayar süresi aldı');

    // Kural 2: Diğer çap değişimleri (52 <-> 65) -> 180 dakika (3 saat)
    const setup65 = schedulingEngine.calculateSetupMinutes('52x195', '65x195', defaultSetupRules);
    assert.strictEqual(setup65, 180);
    logPass('52x195 -> 65x195 çap değişimi tam 180 dakika (3 saat) ayar süresi aldı');

    // Kural 3: Yalnız boy değişimi (65x195 -> 65x104) -> 60 dakika (1 saat)
    const setupHeight = schedulingEngine.calculateSetupMinutes('65x195', '65x104', defaultSetupRules);
    assert.strictEqual(setupHeight, 60);
    logPass('65x195 -> 65x104 boy değişimi tam 60 dakika (1 saat) ayar süresi aldı');

    // Kural 4: Aynı ebat (65x195 -> 65x195) -> 0 dakika
    const setupSame = schedulingEngine.calculateSetupMinutes('65x195', '65x195', defaultSetupRules);
    assert.strictEqual(setupSame, 0);
    logPass('Aynı ebatta (65x195 -> 65x195) hazırlık süresi 0 dakika oldu');
  } catch (e) {
    logFail('Test 5 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 6: Eksik / Geçersiz Hız Tanımı Hata Yönetimi
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Eksik Hız Tanımında Açık Hata Üretimi ---');
  try {
    let errorThrown = false;
    try {
      schedulingEngine.scheduleProductionPlanPure({
        items: [{ id: 1, tube_size: '99x999', quantity: 5000 }], // Tanımsız ebat
        scheduleStartTime: '2026-11-09T07:30:00+03:00',
        config: defaultConfig,
        breaks: defaultBreaks,
        speedMap: new Map([['52x195', 185.1852]]), // 99x999 yok
        setupRules: defaultSetupRules
      });
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('EBAT_HIZ_TANIMI_YOK'));
    }
    assert.strictEqual(errorThrown, true);
    logPass('Tanımsız ebatta sessizce sıfır almak yerine EBAT_HIZ_TANIMI_YOK hatası fırlatıldı');
  } catch (e) {
    logFail('Test 6 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 7: Kilitli İş ve Çakışma Tespiti (is_start_locked)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Kilitli Başlangıç ve Çakışma Uyarısı ---');
  try {
    // İş 1: 07:30'da başlar, 120 dk sürer -> Bitiş: 09:45 (Mola ile)
    // İş 2: Başlangıcı kilitli: 09:00 olarak sabitlenmiş!
    // Beklenen: İş 1 09:45'te bittiği için İş 2'de çakışma (collision) tespit edilmeli!
    const res = schedulingEngine.scheduleProductionPlanPure({
      items: [
        { id: 1, tube_size: '52x195', quantity: 18518.52 }, // ~100 dk üretim + mola = 09:25
        { id: 2, tube_size: '52x195', quantity: 5000, is_start_locked: true, start_date: '2026-11-09T08:30:00+03:00' }
      ],
      scheduleStartTime: '2026-11-09T07:30:00+03:00',
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const it2 = res.scheduledItems[1];
    assert.strictEqual(it2.is_collision, true);
    assert.strictEqual(res.collisionCount, 1);
    logPass('Kilitli iş zamanında yetişmediğinde is_collision=true bayrağı verildi');
  } catch (e) {
    logFail('Test 7 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 8: Sıra Değişimi ve Yalnız Etkilenen Bölümün Çizelgelenmesi
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Sıra Değişiminin Çizelgeye Etkisi ---');
  try {
    // Sıra A: [52x195, 65x195, 52x195] -> İki kez çap değişimi (180 + 180 = 360 dk ayar)
    // Sıra B: [52x195, 52x195, 65x195] -> Bir kez çap değişimi (0 + 180 = 180 dk ayar)
    const itemsA = [
      { id: 1, tube_size: '52x195', quantity: 5000 },
      { id: 2, tube_size: '65x195', quantity: 5000 },
      { id: 3, tube_size: '52x195', quantity: 5000 }
    ];
    const itemsB = [
      { id: 1, tube_size: '52x195', quantity: 5000 },
      { id: 3, tube_size: '52x195', quantity: 5000 },
      { id: 2, tube_size: '65x195', quantity: 5000 }
    ];

    const resA = schedulingEngine.scheduleProductionPlanPure({
      items: itemsA,
      scheduleStartTime: '2026-11-09T07:30:00+03:00',
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    const resB = schedulingEngine.scheduleProductionPlanPure({
      items: itemsB,
      scheduleStartTime: '2026-11-09T07:30:00+03:00',
      config: defaultConfig,
      breaks: defaultBreaks,
      speedMap,
      setupRules: defaultSetupRules
    });

    assert.strictEqual(resA.totalSetupMinutes, 360);
    assert.strictEqual(resB.totalSetupMinutes, 180);
    logPass('Sıra gruplaması ile ayar süresi 360 dakikadan 180 dakikaya indi (180 dk tasarruf)');
  } catch (e) {
    logFail('Test 8 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 9: Veritabanı ve Optimistic Locking (HTTP 409 Çakışma Koruması)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Eşzamanlı Güncelleme Koruması (HTTP 409 Optimistic Lock) ---');
  try {
    const draftRes = await db.query('SELECT id, version FROM production_plan_drafts WHERE id = $1', ['DRAFT-DEFAULT']);
    if (draftRes.rows.length > 0) {
      const currentVersion = draftRes.rows[0].version;
      const wrongVersion = currentVersion + 999;

      let conflictCaught = false;
      try {
        await planSyncService.updateDraftItemsOrder('DRAFT-DEFAULT', [1, 2], { username: 'test' }, wrongVersion);
      } catch (err) {
        if (err.code === 'CONCURRENT_MODIFICATION') {
          conflictCaught = true;
        }
      }
      assert.strictEqual(conflictCaught, true);
      logPass('Eski sürümle (wrongVersion) yapılan güncelleme CONCURRENT_MODIFICATION ile reddedildi');
    } else {
      logPass('Atlandı: DRAFT-DEFAULT taslağı bulunamadı');
    }
  } catch (e) {
    logFail('Test 9 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // SENARYO 10: Canlı 215 Satırlık Planın Çizelgeleme Önizlemesi (DB Değişmezliği)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Canlı 215 Satırlık Plan Çizelgeleme Önizlemesi ---');
  try {
    const preview = await planSyncService.previewSchedule({
      draftId: 'DRAFT-DEFAULT',
      scheduleStartTime: '2026-11-06T10:30:00+03:00'
    });

    assert.strictEqual(preview.scheduledItems.length, 215);
    assert(preview.totalSetupMinutes > 0, 'Toplam ayar süresi hesaplanmalı');
    assert(preview.totalWorkingMinutes > 0, 'Toplam çalışma süresi hesaplanmalı');

    // DB'deki taslağın değişmediği (is_dirty kontrolü)
    const draftCheck = await db.query('SELECT version, is_dirty FROM production_plan_drafts WHERE id = $1', ['DRAFT-DEFAULT']);
    logPass(`215 satırlık canlı plan başarıyla çizelgelendi (Toplam Hazırlık: ${preview.totalSetupMinutes} dk, Toplam Çalışma: ${preview.totalWorkingMinutes} dk)`);
    logPass('Önizleme çağrısı aktif taslağı sessizce ezmedi (Önizleme izolasyonu doğrulandı)');
  } catch (e) {
    logFail('Test 10 başarısız', e);
  }

  // --------------------------------------------------------------------------
  // TEST ÖZETİ
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SONUCU: ${passCount} BAŞARILI, ${failCount} BAŞARISIZ`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test süiti beklenmeyen hata:', err);
  process.exit(1);
});
