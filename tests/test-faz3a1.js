/**
 * TENEKE PLANLAMA — FAZ 3A.1 DOĞRULAMA VE ENTEGRASYON TESTİ (DÜZELTİLMİŞ KAYNAK)
 *
 * Kapsam:
 * 1. Sunucu sağlığı ve PostgreSQL Migration 004 & 005 kontrolü.
 * 2. MikroDesktop_LIDER26.dbo.alper_tenekeuretim canlı önizleme:
 *    - 215 satır, 3.134.665 adet, 205 tekil stok kodu, 10 mükerrer satır kontrolü.
 *    - Başlangıç/Bitiş Tarihi aralıkları ve kronolojik sıra analizi.
 *    - Önceki snapshot (meltem_teneke) ile kaynak farkı karşılaştırması.
 * 3. PostgreSQL Değişmez Snapshot ve Taslak Oluşturma.
 * 4. İkinci Senkronizasyon (Aynı veri için mükerrer tespiti).
 * 5. Kullanıcı taslağını (is_dirty) koruma kontrolü.
 * 6. Kullanıcı sıra düzenlemesi (updateDraftItemsOrder) ve sürüm artışı.
 * 7. Sunucu tarafı rol güvenliği (Viewer rolüne HTTP 403).
 * 8. Faz 2C Atomik Kabul ve Kısmi Aktarım Denetimi (allowPartial).
 * 9. Kaynak SQL Server sıfır değişiklik kanıtı.
 */

const http = require('http');
const { execSync } = require('child_process');
const XLSX = require('xlsx');

const BASE_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'token_admin_session_v2c';
const VIEWER_TOKEN = 'token_viewer_session_v2c';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    let body = options.body;

    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          data = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function queryPg(sql) {
  const cmd = `docker exec -i teneke-planlama-db psql -U postgres -d teneke_planlama -t -A -c "${sql}"`;
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('TENEKE PLANLAMA - FAZ 3A.1 DOĞRULAMA TESTİ (KAYNAK: alper_tenekeuretim)');
  console.log('Tarih: 06.11.2026 | Kapsam: MikroDesktop_LIDER26.dbo.alper_tenekeuretim');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc} -> ${detail}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Sunucu ve Veritabanı Sağlığı & Migration 004 & 005
    // -------------------------------------------------------------
    console.log('--- TEST 1: Sunucu Sağlığı & Migration 004 ve 005 Doğrulaması ---');
    const health = await request('/api/health');
    assert('API /api/health 200 dönüyor', health.status === 200);
    assert('Sunucu healthy', health.data.status === 'healthy');
    assert('PostgreSQL veritabanı aktif', health.data.database?.ok === true);

    const mig004 = queryPg("SELECT count(*) FROM schema_migrations WHERE version = '004'");
    assert('Migration 004 (production_plan_snapshot) uygulanmış', parseInt(mig004, 10) >= 1);

    const mig005 = queryPg("SELECT count(*) FROM schema_migrations WHERE version = '005'");
    assert('Migration 005 (alper_tenekeuretim kolonları) uygulanmış', parseInt(mig005, 10) >= 1);

    // -------------------------------------------------------------
    // TEST 2: Kaynak SQL Planı Önizleme (GET /api/plan-sync/preview)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Kaynak SQL Planı Önizleme (alper_tenekeuretim) ---');
    const previewRes = await request('/api/plan-sync/preview', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });

    assert('Plan önizleme HTTP 200 döndü', previewRes.status === 200);
    assert('Başarılı yanıt döndü (success: true)', previewRes.data.success === true);
    assert('Kaynak tablo MikroDesktop_LIDER26.dbo.alper_tenekeuretim', previewRes.data.data?.source_table === 'MikroDesktop_LIDER26.dbo.alper_tenekeuretim');
    assert('Kaynak satır sayısı tam 215', previewRes.data.data?.row_count === 215, `Alınan: ${previewRes.data.data?.row_count}`);
    assert('Toplam miktar tam 3.134.665 adet', Math.abs(previewRes.data.data?.total_quantity - 3134665) < 0.01, `Alınan: ${previewRes.data.data?.total_quantity}`);
    assert('Tekil stok sayısı 205', previewRes.data.data?.distinct_stocks === 205);
    assert('Tekrarlanan stok satır sayısı 10', previewRes.data.data?.duplicate_stock_count === 10);
    assert('SHA256 checksum üretildi (64 karakter)', previewRes.data.data?.checksum?.length === 64);
    assert('Sıra analizi kronolojik çizelgeyi belirtiyor', previewRes.data.data?.sequence_analysis?.ordering_basis === 'chronological_schedule');
    assert('Tarih aralıkları eksiksiz dolu', !!previewRes.data.data?.sequence_analysis?.date_range?.start_min && !!previewRes.data.data?.sequence_analysis?.date_range?.end_max);
    assert('Önceki snapshot ile karşılaştırma mevcut', !!previewRes.data.data?.previous_comparison);
    assert('Karşılaştırma sayısal farkları doğru raporluyor', typeof previewRes.data.data?.previous_comparison?.row_count_diff === 'number');

    // -------------------------------------------------------------
    // TEST 3: Kaynak Planın PostgreSQL'e Değişmez Snapshot Alınması
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: PostgreSQL Snapshot ve Taslak Oluşturma (/api/plan-sync/snapshot) ---');
    const snapRes = await request('/api/plan-sync/snapshot', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        notes: 'Otomatik Test Snapshot Kaydı (alper_tenekeuretim)',
        createOrUpdateDraft: true,
        forceOverwrite: true
      }
    });

    assert('Snapshot kaydı HTTP 201 döndü', snapRes.status === 201);
    assert('Snapshot ID SNAP-* formatında', snapRes.data.data?.snapshot?.id?.startsWith('SNAP-'));
    assert('Snapshot satır sayısı 215', snapRes.data.data?.snapshot?.row_count === 215);
    assert('Snapshot toplam miktar 3.134.665', Math.abs(snapRes.data.data?.snapshot?.total_quantity - 3134665) < 0.01);
    assert('Taslak oluşturuldu / güncellendi', !!snapRes.data.data?.draft?.draft_id);

    // PostgreSQL kalıcılığını doğrula
    const snapId = snapRes.data.data.snapshot.id;
    const pgSnapCheck = queryPg(`SELECT row_count || '|' || total_quantity FROM production_plan_snapshots WHERE id = '${snapId}'`);
    assert('Snapshot PostgreSQL production_plan_snapshots tablosunda doğrulandı', pgSnapCheck === '215|3134665.00', `PG: ${pgSnapCheck}`);

    const pgItemCount = queryPg(`SELECT count(*) FROM production_plan_snapshot_items WHERE snapshot_id = '${snapId}'`);
    assert('Snapshot satırları production_plan_snapshot_items içinde tam 215 adet', parseInt(pgItemCount, 10) === 215);

    const pgDatesCheck = queryPg(`SELECT count(*) FROM production_plan_snapshot_items WHERE snapshot_id = '${snapId}' AND start_date IS NOT NULL`);
    assert('Snapshot satırlarında start_date birinci sınıf kolon olarak dolu (215 adet)', parseInt(pgDatesCheck, 10) === 215);

    // -------------------------------------------------------------
    // TEST 4: İkinci Senkronizasyon (Mükerrer Snapshot Algılama)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: İkinci Senkronizasyon & Mükerrer Koruma ---');
    const snapRes2 = await request('/api/plan-sync/snapshot', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        notes: 'İkinci Senkronizasyon Kontrolü',
        createOrUpdateDraft: true
      }
    });

    assert('İkinci snapshot HTTP 201 döndü', snapRes2.status === 201);
    assert('Aynı checksum için is_duplicate_of_previous = true algılandı', snapRes2.data.data?.snapshot?.is_duplicate_of_previous === true);

    // -------------------------------------------------------------
    // TEST 5: Kullanıcı Taslak Koruma (Dirty Draft Protection)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Düzenlenen Kullanıcı Taslağını Koruma (is_dirty) ---');
    queryPg("UPDATE production_plan_drafts SET is_dirty = TRUE WHERE id = 'DRAFT-DEFAULT'");

    const snapRes3 = await request('/api/plan-sync/snapshot', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        notes: 'Kirli Taslak Koruma Denemesi',
        createOrUpdateDraft: true,
        forceOverwrite: false
      }
    });

    assert('Snapshot alındı ancak kullanıcı taslağı ezilmedi (preserved: true)', snapRes3.data.data?.draft?.preserved === true);
    assert('Uyarı mesajı kaydedilmemiş değişiklikleri koruduğunu belirtiyor', snapRes3.data.data?.draft?.message?.includes('kaydedilmemiş değişiklikler'));

    // -------------------------------------------------------------
    // TEST 6: Kullanıcı Sıra Düzenlemesi ve Sürüm Artışı
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Kullanıcı Sıra Düzenlemesi ve Sürüm Artışı ---');
    const draftRes = await request('/api/plan-sync/draft');
    assert('Taslak GET HTTP 200 döndü', draftRes.status === 200);
    assert('Taslak satır sayısı 215', draftRes.data.data?.items?.length === 215);

    const items = draftRes.data.data?.items || [];
    if (items.length >= 2) {
      // 1. ve 2. elemanın yerini değiştir
      const reorderedIds = [items[1].id, items[0].id, ...items.slice(2).map(x => x.id)];
      const reorderRes = await request('/api/plan-sync/draft/order', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
        body: {
          draft_id: 'DRAFT-DEFAULT',
          ordered_item_ids: reorderedIds
        }
      });

      assert('Sıra güncelleme HTTP 200 döndü', reorderRes.status === 200);
      assert('Taslak sürümü arttı (version = version + 1)', reorderRes.data.data?.draft?.version > draftRes.data.data?.draft?.version);
      assert('Taslak is_dirty = true oldu', reorderRes.data.data?.draft?.is_dirty === true);

      // Yeni sırayı doğrula
      const updatedDraftRes = await request('/api/plan-sync/draft');
      assert('Yeni 1. sıra elemanı güncellendi', updatedDraftRes.data.data?.items?.[0]?.id === items[1].id);
    }

    // -------------------------------------------------------------
    // TEST 7: Sunucu Tarafı Rol Güvenliği (Viewer HTTP 403)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Rol Güvenliği (Viewer HTTP 403 Koruması) ---');
    const viewerSnapRes = await request('/api/plan-sync/snapshot', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${VIEWER_TOKEN}` },
      body: { notes: 'Viewer Snapshot Denemesi' }
    });

    assert('Viewer rolü snapshot isteği HTTP 403 ile reddedildi', viewerSnapRes.status === 403);
    assert('Hata kodu YETKISIZ_ISLEM', viewerSnapRes.data.error?.code === 'YETKISIZ_ISLEM');

    const viewerOrderRes = await request('/api/plan-sync/draft/order', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${VIEWER_TOKEN}` },
      body: { draft_id: 'DRAFT-DEFAULT', ordered_item_ids: [1, 2] }
    });
    assert('Viewer rolü sıra düzenleme isteği HTTP 403 ile reddedildi', viewerOrderRes.status === 403);

    // -------------------------------------------------------------
    // TEST 8: Faz 2C Atomik Kabul ve Kısmi Aktarım Denetimi
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Faz 2C Atomik Kabul ve Kısmi Aktarım Denetimi ---');
    const testImportCode = '511109010910-ATOMIC99';
    queryPg(`DELETE FROM product_technicals WHERE stock_code = '${testImportCode}'`);

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Stok Kodu', 'Stok İsmi', 'Ham Levha kodu', 'Boy ve Çap', 'Baskı Yüzeyi', 'Vernik', 'Lak', 'İç Kaplama', 'Renk1', 'Renk2', 'Renk3', 'Renk4', 'Parametre 1'],
      [testImportCode, 'TUP-TEST ATOMIK KABUL', 'HAM LEVHA-017x832x800- (T 61) -52x195', '52x195', 'EMAYE', 'PARLAK', 'LAKLI', 'GOLD', 'C', 'M', 'Y', 'K', 'Atomik Test'],
      ['', 'TUP-KODSUZ-HATALI-SATIR', 'HAM LEVHA-017x832x800- (T 61) -52x195', '52x195', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', 'C', 'M', 'Y', 'K', 'HATA SATIRI']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Kartlar');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Önizleme
    const prevRes = await request('/api/definitions/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: excelBuffer
    });

    assert('Önizleme 1 geçerli ve 1 hatalı satır buldu', prevRes.data.data?.validRows === 1 && prevRes.data.data?.errorRows === 1);

    // 8a: Varsayılan Atomik Kabul (allowPartial = false) -> HTTP 400 ile REDDEDİLMELİ
    const atomicRejectRes = await request('/api/definitions/import/commit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        rows: prevRes.data.data?.rows,
        policy: 'all',
        allowPartial: false
      }
    });

    assert('Varsayılan atomik kabul kuralıyla dosya bütünüyle reddedildi (HTTP 400)', atomicRejectRes.status === 400);
    assert('Hata kodu ATOMIC_IMPORT_REJECTED', atomicRejectRes.data.error?.code === 'ATOMIC_IMPORT_REJECTED');

    // 8b: Açık Kısmi Aktarım (allowPartial = true) -> HTTP 200 ile YALNIZCA GEÇERLİ OLAN KAYDEDİLMELİ
    const partialCommitRes = await request('/api/definitions/import/commit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        rows: prevRes.data.data?.rows,
        policy: 'all',
        allowPartial: true
      }
    });

    assert('Açık kısmi aktarım HTTP 200 ile onaylandı', partialCommitRes.status === 200);
    assert('Yalnızca 1 geçerli satır kaydedildi', partialCommitRes.data.data?.appliedCount === 1);
    assert('1 hatalı satır skipped olarak raporlandı', partialCommitRes.data.data?.skipped === 1);
    assert('Rapor atlanan hatalı satır detaylarını içeriyor', partialCommitRes.data.data?.skippedRows?.length === 1);

    // Temizlik
    queryPg(`DELETE FROM product_technicals WHERE stock_code = '${testImportCode}'`);

    // -------------------------------------------------------------
    // TEST 9: Sıfır SQL Kaynak Değişikliği (Final Kanıt)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Sıfır SQL Kaynak Değişikliği Kanıtı ---');
    // Doğrudan SQL Server'dan tekrar sorgula
    const finalPreview = await request('/api/plan-sync/preview', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });

    assert('Kaynak alper_tenekeuretim satır sayısı hala 215 (Değişmedi)', finalPreview.data.data?.row_count === 215);
    assert('Kaynak alper_tenekeuretim toplam miktar hala 3.134.665 (Değişmedi)', Math.abs(finalPreview.data.data?.total_quantity - 3134665) < 0.01);
    assert('Kaynak checksum hala aynı (Veri tahrifatı yok)', finalPreview.data.data?.checksum === previewRes.data.data?.checksum);

    // Temizlik: Test amaçlı oluşturulan snapshotları temizle, ana snapshotı koru
    queryPg("DELETE FROM production_plan_snapshots WHERE notes LIKE '%Test%'");
    queryPg("UPDATE production_plan_drafts SET is_dirty = FALSE WHERE id = 'DRAFT-DEFAULT'");

    console.log('\n========================================================================');
    console.log(`TEST SONUCU: ${passed} BAŞARILI, ${failed} BAŞARISIZ (%${Math.round(passed / (passed + failed) * 100)})`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Test süreci beklenmeyen bir hata ile karşılaştı:', err);
  }
}

runTestSuite();
