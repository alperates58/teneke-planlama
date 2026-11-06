const http = require('http');
const XLSX = require('xlsx');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'token_admin_session_v2c';
const VIEWER_TOKEN = 'token_viewer_session_v2c';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    };

    if (options.body && typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
      reqOptions.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let data = buffer;
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            data = buffer.toString('utf8');
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, data, rawBuffer: buffer });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function queryDb(sql) {
  const cmd = `docker exec -i teneke-planlama-db psql -U postgres -d teneke_planlama -t -A -c "${sql.replace(/"/g, '\\"')}"`;
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function runTests() {
  console.log('================================================================');
  console.log('TENEKE PLANLAMA - FAZ 2C ENTEGRASYON VE VERİ KALICILIĞI DOĞRULAMA');
  console.log('================================================================\n');

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
    // TEST 1: Health Check
    // -------------------------------------------------------------
    console.log('--- TEST 1: Sunucu ve Veritabanı Sağlık Kontrolü ---');
    const health = await request('/api/health');
    assert('API /api/health 200 dönüyor', health.status === 200);
    assert('Sunucu durumu healthy', health.data.status === 'healthy');
    assert('Veritabanı durumu sağlıklı (database.ok = true)', health.data.database?.ok === true);

    const migCount = queryDb('SELECT count(*) FROM schema_migrations');
    assert('3 adet migration uygulandı', parseInt(migCount, 10) >= 3, `DB count: ${migCount}`);

    // -------------------------------------------------------------
    // TEST 2: Ürün Ekleme (POST) & Veritabanı Doğrulaması
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Gerçek Ürün Oluşturma & PostgreSQL Kalıcılığı ---');
    const testCode = '511109010910-TEST99';
    // Temizlik
    queryDb(`DELETE FROM product_technicals WHERE stock_code = '${testCode}'`);

    const createRes = await request('/api/definitions/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        stock_code: testCode,
        tube_size: '52x195',
        raw_sheet_code: '500011000004-1206',
        print_surface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        inside_coating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K', '185C'],
        special_parameter: 'Test Entegrasyon Notu',
        is_active: true
      }
    });

    assert('POST /api/definitions/products 201 döndü', createRes.status === 201);
    assert('Kayıt stock_code eşleşiyor', createRes.data.data?.stock_code === testCode);
    assert('Başlangıç version = 1', createRes.data.data?.version === 1);

    // PostgreSQL'den doğrudan SELECT
    const dbRow = queryDb(`SELECT stock_code || '|' || version || '|' || inside_coating FROM product_technicals WHERE stock_code = '${testCode}'`);
    assert('Kayıt doğrudan PostgreSQL SELECT ile doğrulandı', dbRow === `${testCode}|1|GOLD`, `DB: ${dbRow}`);

    // -------------------------------------------------------------
    // TEST 3: Ürün Güncelleme (PUT) & Sürüm Artışı (Optimistic Concurrency)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: İyimser Eşzamanlılık (Optimistic Concurrency) & Sürüm Artışı ---');
    const updateRes = await request(`/api/definitions/products/${testCode}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        version: 1,
        tube_size: '52x195',
        raw_sheet_code: '500011000004-1206',
        print_surface: 'EMAYE',
        varnish: 'MAT',
        lacquer: 'LAKLI',
        inside_coating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K', '185C', '368C'],
        special_parameter: 'Güncellenmiş Entegrasyon Notu',
        is_active: true
      }
    });

    assert('PUT /api/definitions/products/:code 200 döndü', updateRes.status === 200);
    assert('Sürüm 1 -> 2 olarak arttı', updateRes.data.data?.version === 2);

    const dbVersion = queryDb(`SELECT version FROM product_technicals WHERE stock_code = '${testCode}'`);
    assert('PostgreSQL tablosunda sürüm = 2', dbVersion === '2', `DB: ${dbVersion}`);

    // -------------------------------------------------------------
    // TEST 4: Çakışma Denetimi (Stale Version Conflict Detection)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Eski Sürüm ile Güncelleme Çakışması (HTTP 409) ---');
    const staleRes = await request(`/api/definitions/products/${testCode}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: {
        version: 1, // Eski sürüm gönderiliyor (DB'de 2 var)
        tube_size: '52x195',
        raw_sheet_code: '500011000004-1206',
        print_surface: 'EMAYE',
        varnish: 'MAT',
        lacquer: 'LAKLI',
        inside_coating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K'],
        is_active: true
      }
    });

    assert('Eski sürüm isteği HTTP 409 ile reddedildi', staleRes.status === 409);
    assert('Hata kodu ESZAMANLI_DUZENLEME_CAKISMASI', staleRes.data.error?.code === 'ESZAMANLI_DUZENLEME_CAKISMASI');

    // -------------------------------------------------------------
    // TEST 5: Referans Bütünlüğü Koruması (Kullanılan Kart Silinemez)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Referans Bütünlüğü Koruması (HTTP 409) ---');
    // '511109010410-1102' demands tablosunda (DEM-009) aktif referansa sahip
    const refDelRes = await request('/api/definitions/products/511109010410-1102', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });

    assert('Referanslı ürün silme isteği HTTP 409 ile engellendi', refDelRes.status === 409);
    assert('Hata kodu REFERANS_BUTUNLUGU_ENGELI', refDelRes.data.error?.code === 'REFERANS_BUTUNLUGU_ENGELI');
    assert('Hata mesajı pasife almayı öneriyor', refDelRes.data.error?.message.includes('Pasife Al'));

    // -------------------------------------------------------------
    // TEST 6: Yetkilendirme (Viewer Rolü Koruması)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Sunucu Tarafı Yetki Denetimi (Viewer HTTP 403) ---');
    const viewerDelRes = await request(`/api/definitions/products/${testCode}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${VIEWER_TOKEN}` }
    });
    assert('Viewer rolü silme isteği HTTP 403 ile reddedildi', viewerDelRes.status === 403);
    assert('Hata kodu YETKISIZ_ISLEM', viewerDelRes.data.error?.code === 'YETKISIZ_ISLEM');

    const viewerCreateRes = await request('/api/definitions/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${VIEWER_TOKEN}` },
      body: { stock_code: 'TEST-VIEWER-FAIL', tube_size: '52x195', raw_sheet_code: '500011000004-1206' }
    });
    assert('Viewer rolü oluşturma isteği HTTP 403 ile reddedildi', viewerCreateRes.status === 403);

    // -------------------------------------------------------------
    // TEST 7: Gerçek Excel (.xlsx) Şablon İndirme & İçe Aktarma
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Gerçek .xlsx Şablon Üretimi ve İçe Aktarma ---');
    const tplRes = await request('/api/definitions/import/template?token=' + ADMIN_TOKEN);
    assert('Şablon indirme HTTP 200 döndü', tplRes.status === 200);
    assert('Content-Type openxmlformats (.xlsx)', tplRes.headers['content-type'].includes('openxmlformats'));

    const parsedTpl = XLSX.read(tplRes.rawBuffer, { type: 'buffer' });
    assert('Excel çalışma kitabında en az 1 sayfa var', parsedTpl.SheetNames.length > 0);
    assert('İlk sayfa adı Teknik_Kartlar', parsedTpl.SheetNames[0] === 'Teknik_Kartlar');

    // Yeni bir test Excel dosyası oluşturalım
    const testImportCode = '511109010910-IMP88';
    queryDb(`DELETE FROM product_technicals WHERE stock_code = '${testImportCode}'`);

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Stok Kodu', 'Stok İsmi', 'Ham Levha kodu', 'Boy ve Çap', 'Baskı Yüzeyi', 'Vernik', 'Lak', 'İç Kaplama', 'Renk1', 'Renk2', 'Renk3', 'Renk4', 'Parametre 1'],
      [testImportCode, 'TUP-TEST EXCEL AKTARIM', 'HAM LEVHA-017x832x800- (T 61) -52x195', '52x195', 'EMAYE', 'PARLAK', 'LAKLI', 'GOLD', 'C', 'M', 'Y', 'K', 'Excel Entegrasyon Test Satırı'],
      ['', 'TUP-GECERSIZ-KODSUZ', 'HAM LEVHA-017x832x800- (T 61) -52x195', '52x195', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', 'C', 'M', 'Y', 'K', 'HATA BEKLENEN SATIR']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Aktarilacak Kartlar');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Preview
    const previewRes = await request('/api/definitions/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: excelBuffer
    });

    assert('Excel önizleme HTTP 200 döndü', previewRes.status === 200);
    assert('Toplam 2 satır ayrıştırıldı', previewRes.data.data?.total === 2);
    assert('1 yeni geçerli satır algılandı', previewRes.data.data?.newCount === 1);
    assert('1 hatalı satır (boş kod) algılandı', previewRes.data.data?.errorCount === 1);

    // Commit - Adım 7a: Varsayılan Atomik Kabul Denetimi (Hatalı satır varken dosya reddedilmeli)
    const atomicRejectRes = await request('/api/definitions/import/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: {
        rows: previewRes.data.data?.rows,
        policy: 'all',
        allowPartial: false // Varsayılan: atomik dosya kabulü
      }
    });

    assert('Hatalı satır içeren dosya atomik kabul kuralıyla HTTP 400 ile reddedildi', atomicRejectRes.status === 400);
    assert('Hata kodu ATOMIC_IMPORT_REJECTED', atomicRejectRes.data.error?.code === 'ATOMIC_IMPORT_REJECTED');

    // Commit - Adım 7b: Açık Kısmi Aktarım (allowPartial: true) ile Onaylama
    const commitRes = await request('/api/definitions/import/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: {
        rows: previewRes.data.data?.rows,
        policy: 'all',
        allowPartial: true // Kullanıcı açıkça kısmi aktarımı seçti
      }
    });

    assert('Kısmi aktarım onaylama HTTP 200 döndü', commitRes.status === 200);
    assert('1 geçerli satır PostgreSQL\'e eklendi', commitRes.data.data?.appliedCount === 1);
    assert('Hatalı satır skipped olarak raporlandı', commitRes.data.data?.skipped === 1);

    const dbImported = queryDb(`SELECT stock_code || '|' || inside_coating FROM product_technicals WHERE stock_code = '${testImportCode}'`);
    assert('İçe aktarılan kart PostgreSQL\'de bulundu', dbImported === `${testImportCode}|GOLD`);

    // Re-import (Mükerrerlik Testi)
    console.log('\n--- TEST 8: Mükerrer Aktarım Koruması (Aynı Dosya Tekrar Yüklendiğinde) ---');
    const preview2 = await request('/api/definitions/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: excelBuffer
    });

    assert('İkinci önizlemede newCount = 0 (Yeni kart yok)', preview2.data.data?.newCount === 0);
    assert('İkinci önizlemede updateCount = 1 (Güncelleme adayı)', preview2.data.data?.updateCount === 1);

    const commit2 = await request('/api/definitions/import/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: {
        rows: preview2.data.data?.rows,
        policy: 'new_only' // Yalnızca yeniler seçilirse güncellenmemeli
      }
    });
    assert('new_only politikasıyla 0 adet uygulandı', commit2.data.data?.appliedCount === 0);

    const countAfter = queryDb(`SELECT count(*) FROM product_technicals WHERE stock_code = '${testImportCode}'`);
    assert('Veritabanında kayıt sayısı şişmedi (Hala tam 1 adet)', countAfter === '1');

    // -------------------------------------------------------------
    // TEST 9: Konteyner Yeniden Başlatma & Veri Kalıcılığı Testi
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Servis Yeniden Başlatma & Kalıcılık Doğrulaması ---');
    console.log('Konteynerler yeniden başlatılıyor...');
    execSync('docker restart teneke-planlama-app teneke-planlama-db', { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 4500));

    const healthAfter = await request('/api/health');
    assert('Yeniden başlatma sonrası API çalışıyor', healthAfter.status === 200);

    const verifyProd = await request(`/api/definitions/products/${testCode}`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert('Yeniden başlatma sonrası TEST99 ürünü hala mevcut', verifyProd.status === 200);
    assert('Sürüm 2 korunuyor', verifyProd.data.data?.version === 2);

    // Temizlik
    console.log('\n--- TEST 10: Test Kayıtlarının Temizlenmesi ---');
    const del1 = await request(`/api/definitions/products/${testCode}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert('Test ürünü 1 silindi', del1.status === 200);

    const del2 = await request(`/api/definitions/products/${testImportCode}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert('Test ürünü 2 silindi', del2.status === 200);

  } catch (err) {
    console.error('Test yürütme hatası:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST SONUCU: ${passed} BAŞARILI, ${failed} BAŞARISIZ`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
