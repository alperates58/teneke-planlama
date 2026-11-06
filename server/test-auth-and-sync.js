const http = require('http');
const { query } = require('./db');
const { executeSqlReadOnly } = require('./services/plan-sync-service');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('FAZ 3A.2 ENTEGRASYON VE GÜVENLİK DOĞRULAMA TESTLERİ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Role elevation guard
  const switchRes = await request('POST', '/api/auth/switch-role', { role: 'admin' });
  assert(switchRes.status === 403 && switchRes.body?.error?.code === 'ROLE_SWITCH_DISABLED',
    '1. switch-role yetki yükseltmesi varsayılan olarak kapalıdır (403 ROLE_SWITCH_DISABLED)');

  // 2. Anonymous access guard on sync
  const anonSync = await request('POST', '/api/erp/sync', { syncType: 'full' });
  assert(anonSync.status === 401 && anonSync.body?.error?.code === 'OTURUM_GEREKLI',
    '2. Kimliksiz kullanıcı sync yapamaz (401 OTURUM_GEREKLI)');

  // 3. Viewer login and authorization check
  const viewerLogin = await request('POST', '/api/auth/login', { username: 'misafir', password: 'guest123' });
  assert(viewerLogin.status === 200 && viewerLogin.body?.data?.role === 'viewer',
    '3. Misafir (viewer) başarıyla oturum açar ve rastgele token alır');
  const viewerToken = viewerLogin.body?.data?.token;

  const viewerSync = await request('POST', '/api/erp/sync', { syncType: 'full' }, {
    'Authorization': `Bearer ${viewerToken}`
  });
  assert(viewerSync.status === 403 && viewerSync.body?.error?.code === 'YETKISIZ_ISLEM',
    '4. Viewer rolü admin yetkisi gerektiren sync işlemini çalıştıramaz (403 YETKISIZ_ISLEM)');

  // 4. Admin login and sync execution
  const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(adminLogin.status === 200 && adminLogin.body?.data?.role === 'admin',
    '5. Admin kullanıcısı oturum açar ve yetkileri tamdır');
  const adminToken = adminLogin.body?.data?.token;

  // 5. Views verification in AA_LIDER
  const viewsStatus = await request('GET', '/api/erp/views/status');
  const allViewsReady = viewsStatus.body?.data?.every(v => v.exists && v.status === 'READY' && v.rowCount > 0);
  assert(viewsStatus.status === 200 && allViewsReady,
    '6. Beş sözleşme view\'ı (AA_tp_vw_*) AA_LIDER üzerinde doğrulanmıştır');

  // 6. Preview endpoint verification
  const preview = await request('GET', '/api/erp/preview');
  const demandSummary = preview.body?.data?.demands?.summary;
  assert(preview.status === 200 && demandSummary?.total_demand_lines === 443 && demandSummary?.total_gross_tubes === 4998757,
    '7. Önizleme motoru 443 talep satırını ve 4.998.757 brüt tüp ihtiyacını teyit eder');

  // 7. Idempotent sync execution
  const syncExec = await request('POST', '/api/erp/sync', { syncType: 'full' }, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert(syncExec.status === 200 && syncExec.body?.data?.success === true,
    '8. Admin yetkisiyle ERP senkronizasyonu hatasız çalışır');

  // 8. Row counts in PostgreSQL
  const [demandsPg, stockPg, recipesPg] = await Promise.all([
    query('SELECT COUNT(*) as c FROM erp_gross_demands'),
    query('SELECT COUNT(*) as c FROM erp_stock_levels'),
    query('SELECT COUNT(*) as c FROM erp_recipe_links')
  ]);
  assert(parseInt(demandsPg.rows[0].c, 10) === 443,
    '9. erp_gross_demands tablosunda tam 443 satır staging yapılmıştır (mükerrerlik yok)');
  assert(parseInt(stockPg.rows[0].c, 10) === 3755,
    '10. erp_stock_levels tablosunda tam 3.755 stok seviyesi saklanmaktadır');
  assert(parseInt(recipesPg.rows[0].c, 10) === 8609,
    '11. erp_recipe_links tablosunda 8.609 reçete bağı mevcuttur');

  // 9. Technical cards preservation check
  const technicalsPg = await query('SELECT COUNT(*) as c FROM product_technicals');
  assert(parseInt(technicalsPg.rows[0].c, 10) === 27,
    '12. product_technicals tablosundaki 27 adet yerel teknik kart korunmuştur (ezilmemiştir)');

  // 10. Production plan snapshot preservation check
  const snapshotsPg = await query('SELECT COUNT(*) as c FROM production_plan_snapshots');
  assert(parseInt(snapshotsPg.rows[0].c, 10) >= 13,
    '13. Faz 3A.1 alper_tenekeuretim snapshot ve taslakları korunmuştur');

  // 11. Positive usable stock check (no negative stocks)
  const negativeStockCheck = await query('SELECT COUNT(*) as c FROM erp_stock_levels WHERE usable_stock < 0');
  assert(parseInt(negativeStockCheck.rows[0].c, 10) === 0,
    '14. Kullanılabilir ambar stoklarında negatif değer yoktur (usable_stock >= 0)');

  // 12. Combined live demands API check
  const liveDemandsRes = await request('GET', '/api/erp/demands');
  assert(liveDemandsRes.status === 200 && liveDemandsRes.body?.count === 443 && liveDemandsRes.body?.data?.[0]?.record_kind === 'live_erp_sync',
    '15. GET /api/erp/demands canlı ERP verilerini ve doğru record_kind etiketini döner');

  console.log('\n========================================================');
  console.log(`TEST SONUCU: ${passed} GEÇTİ, ${failed} KALDI (Toplam ${passed + failed})`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test çalışma hatası:', err);
  process.exit(1);
});
