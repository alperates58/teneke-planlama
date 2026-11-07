/**
 * Teneke Planlama - Client Application (Faz 0, Faz 1 ve Faz 2)
 * ALPER DESIGN OS Workbench — Professional LIGHT Theme
 *
 * İLKE: "Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından
 * tanımlanmış montaj düzeni görselleştirilir."
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function apiRequest(endpoint, options = {}) {
  const token = state?.sessionToken || localStorage.getItem('tp_session_token_v2c') || 'token_admin_session_v2c';
  const headers = {
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + token,
    'X-Session-Token': token,
    ...(options.headers || {})
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof ArrayBuffer)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok || data.success === false) {
      const err = new Error(data.error?.message || ('Sunucu hatası: ' + response.status));
      err.status = response.status;
      err.code = data.error?.code;
      err.details = data.error?.details;
      throw err;
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error('HTTP ' + response.status + ': ' + text);
  }

  return response;
}

async function initBackendSync() {
  try {
    state.isSyncing = true;
    const token = state.sessionToken || localStorage.getItem('tp_session_token_v2c') || 'token_admin_session_v2c';
    state.sessionToken = token;

    // 1. Auth oturumu doğrula
    try {
      const authRes = await apiRequest('/api/auth/me');
      if (authRes && authRes.data && authRes.data.isAuthenticated) {
        state.currentUser = authRes.data;
        state.currentRole = authRes.data.role;
      } else {
        // Oturum yoksa admin ile otomatik giriş dene (yerel demo modu)
        try {
          const loginRes = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: { username: 'admin', password: 'admin123' }
          });
          if (loginRes && loginRes.data) {
            state.sessionToken = loginRes.data.token;
            state.currentUser = loginRes.data;
            state.currentRole = loginRes.data.role;
            localStorage.setItem('tp_session_token_v2c', loginRes.data.token);
          }
        } catch (e) {}
      }
    } catch (authErr) {
      console.warn('[Auth] Oturum kontrolü hatası:', authErr.message);
    }

    // 2. PostgreSQL'den Teknik Kartları Çek
    const prodRes = await apiRequest('/api/definitions/products');
    if (prodRes && Array.isArray(prodRes.data)) {
      state.technicalProducts = prodRes.data;
    }

    // 3. PostgreSQL'den ERP Stok Kataloğunu Çek
    const catRes = await apiRequest('/api/definitions/stock-catalog');
    if (catRes && Array.isArray(catRes.data)) {
      state.stockCatalog = catRes.data;
    }

    // 4. PostgreSQL'den Sözlükleri Çek
    const dictRes = await apiRequest('/api/definitions/dictionaries');
    if (dictRes && dictRes.data) {
      state.dictionaries = dictRes.data;
    }

    // 5. PostgreSQL'den Ham Levhaları Çek
    const rawRes = await apiRequest('/api/definitions/raw-sheets');
    if (rawRes && Array.isArray(rawRes.data)) {
      state.rawSheets = rawRes.data;
    }

    // 6. PostgreSQL'den Ebat/Kapasiteleri Çek
    const capRes = await apiRequest('/api/definitions/capacities');
    if (capRes && Array.isArray(capRes.data)) {
      state.capacities = capRes.data;
    }

    // 7. PostgreSQL'den Denetim İzini Çek
    const auditRes = await apiRequest('/api/audit-logs');
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }

    // 8. PostgreSQL'den Aktif Üretim Planı Taslağını Çek (Faz 3A.1)
    try {
      const draftRes = await apiRequest('/api/plan-sync/draft');
      if (draftRes && draftRes.data && draftRes.data.exists) {
        state.planDraft = draftRes.data;
      }
    } catch (e) {
      console.warn('[Sync] Plan taslağı alınamadı:', e.message);
    }

    // 9. PostgreSQL'den Snapshot Geçmişini Çek (Faz 3A.1)
    try {
      const snapsRes = await apiRequest('/api/plan-sync/snapshots');
      if (snapsRes && Array.isArray(snapsRes.data)) {
        state.planSnapshots = snapsRes.data;
      }
    } catch (e) {
      console.warn('[Sync] Snapshot listesi alınamadı:', e.message);
    }

    // 10. PostgreSQL Staging'den Canlı ERP Brüt Talepleri Çek (Faz 3A.2)
    try {
      const demRes = await apiRequest('/api/erp/demands');
      if (demRes && demRes.success && Array.isArray(demRes.data) && demRes.data.length > 0) {
        state.liveDemands = demRes.data;
        if (state.demandSourceMode !== 'demo') {
          state.demands = demRes.data;
          state.demandSourceMode = 'live_erp';
        }
      }
    } catch (e) {
      console.warn('[Sync] Canlı ERP talepleri alınamadı:', e.message);
    }

    // 11. SQL Server ERP View Durumları ve Bağlantı Kontrolü (Faz 3A.2)
    try {
      const [viewRes, connRes, syncHistRes] = await Promise.all([
        apiRequest('/api/erp/views/status'),
        apiRequest('/api/erp/test-connection'),
        apiRequest('/api/erp/sync-history')
      ]);
      if (viewRes && viewRes.data) state.erpViewsStatus = viewRes.data;
      if (connRes) state.erpConnection = connRes;
      if (syncHistRes && syncHistRes.data) state.erpSyncHistory = syncHistRes.data;
    } catch (e) {
      console.warn('[Sync] ERP durumları alınamadı:', e.message);
    }

    // 12. Son Kademeli İhtiyaç Hesaplama Koşusu (Faz 3B)
    try {
      const calcRes = await apiRequest('/api/erp/latest-calculation');
      if (calcRes && calcRes.success && calcRes.data) {
        state.latestCalculation = calcRes.data;
      }
    } catch (e) {
      console.warn('[Sync] Son hesaplama bilgisi alınamadı:', e.message);
    }

    state.backendConnected = true;
    state.isSyncing = false;
  } catch (err) {
    console.warn('[Sync] Backend ile iletişim kurulamadı, yerel hafızaya dönülüyor:', err.message);
    state.backendConnected = false;
    state.isSyncing = false;
  }
  renderApp();
}

// 1. HAM LEVHALAR (14 Kaynak Kayıt)
const INITIAL_RAW_SHEETS = [
  {"short_name":"90000166","stock_code":"500011000004-1103","stock_name":"HAM LEVHA-018x863x866- (T 57) -45x140","thickness_source_value":18,"width_mm":863,"height_mm":866,"grade_source":"T57","tube_size":"45x140","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000167","stock_code":"500011000004-1104","stock_name":"HAM LEVHA-018x863x898- (T 57) -45x175","thickness_source_value":18,"width_mm":863,"height_mm":898,"grade_source":"T57","tube_size":"45x175","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000170","stock_code":"500011000004-1202","stock_name":"HAM LEVHA-017x835x872- (T 61) -52x105","thickness_source_value":17,"width_mm":835,"height_mm":872,"grade_source":"T61","tube_size":"52x105","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000172","stock_code":"500011000004-1204","stock_name":"HAM LEVHA-017x832x827- (T 61) -52x161","thickness_source_value":17,"width_mm":832,"height_mm":827,"grade_source":"T61","tube_size":"52x161","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000173","stock_code":"500011000004-1205","stock_name":"HAM LEVHA-017x832x847- (T 61) -52x165","thickness_source_value":17,"width_mm":832,"height_mm":847,"grade_source":"T61","tube_size":"52x165","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000174","stock_code":"500011000004-1206","stock_name":"HAM LEVHA-017x832x800- (T 61) -52x195","thickness_source_value":17,"width_mm":832,"height_mm":800,"grade_source":"T61","tube_size":"52x195","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000175","stock_code":"500011000004-1207","stock_name":"HAM LEVHA-017x832x875- (T 61) -52x214","thickness_source_value":17,"width_mm":832,"height_mm":875,"grade_source":"T61","tube_size":"52x214","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000176","stock_code":"500011000004-1208","stock_name":"HAM LEVHA-017x832x720- (T 61) -52x234","thickness_source_value":17,"width_mm":832,"height_mm":720,"grade_source":"T61","tube_size":"52x234","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000179","stock_code":"500011000004-1209","stock_name":"HAM LEVHA-017x835x848- (T 61) -65x165","thickness_source_value":17,"width_mm":835,"height_mm":848,"grade_source":"T61","tube_size":"65x165","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000187","stock_code":"500011000004-1406","stock_name":"HAM LEVHA-017x835x827- (T 61) -65x270","thickness_source_value":17,"width_mm":835,"height_mm":827,"grade_source":"T61","tube_size":"65x270","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000219","stock_code":"500011000004-1408","stock_name":"HAM LEVHA-017x835x864- (T 61) -65x104","thickness_source_value":17,"width_mm":835,"height_mm":864,"grade_source":"T61","tube_size":"65x104","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000234","stock_code":"500011000004-1414","stock_name":"HAM LEVHA-018x835x915- (T 61) -65x300","thickness_source_value":18,"width_mm":835,"height_mm":915,"grade_source":"T61","tube_size":"65x300","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000235","stock_code":"500011000004-1415","stock_name":"HAM LEVHA-017x835x798- (T 61) -65x195","thickness_source_value":17,"width_mm":835,"height_mm":798,"grade_source":"T61","tube_size":"65x195","minimum_print_sheets_source":null,"record_kind":"source_transcription"},
  {"short_name":"90000217","stock_code":"500011000004-1416","stock_name":"HAM LEVHA-017x835x808- (T 61) -65x157","thickness_source_value":17,"width_mm":835,"height_mm":808,"grade_source":"T61","tube_size":"65x157","minimum_print_sheets_source":null,"record_kind":"source_transcription"}
];

// 2. EBAT / KAPASİTE TABLOSU (18 Kaynak Kayıt)
// Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı
const INITIAL_CAPACITIES = [
  {"tube_size":"45x100","units_per_sheet":48,"assembly_group_count":8,"repeat_step":6,"variety_source":8,"quantity_source":7500,"single_variety_order_quantity_source":60000,"record_kind":"source_transcription"},
  {"tube_size":"45x140","units_per_sheet":36,"assembly_group_count":6,"repeat_step":6,"variety_source":6,"quantity_source":7500,"single_variety_order_quantity_source":45000,"record_kind":"source_transcription"},
  {"tube_size":"45x175","units_per_sheet":30,"assembly_group_count":6,"repeat_step":5,"variety_source":6,"quantity_source":6250,"single_variety_order_quantity_source":37500,"record_kind":"source_transcription"},
  {"tube_size":"52x90","units_per_sheet":45,"assembly_group_count":9,"repeat_step":5,"variety_source":9,"quantity_source":6250,"single_variety_order_quantity_source":56250,"record_kind":"source_transcription"},
  {"tube_size":"52x105","units_per_sheet":40,"assembly_group_count":8,"repeat_step":5,"variety_source":8,"quantity_source":6250,"single_variety_order_quantity_source":50000,"record_kind":"source_transcription"},
  {"tube_size":"52x132","units_per_sheet":30,"assembly_group_count":6,"repeat_step":5,"variety_source":6,"quantity_source":6250,"single_variety_order_quantity_source":37500,"record_kind":"source_transcription"},
  {"tube_size":"52x161","units_per_sheet":25,"assembly_group_count":5,"repeat_step":5,"variety_source":5,"quantity_source":6250,"single_variety_order_quantity_source":31250,"record_kind":"source_transcription"},
  {"tube_size":"52x165","units_per_sheet":25,"assembly_group_count":5,"repeat_step":5,"variety_source":5,"quantity_source":6250,"single_variety_order_quantity_source":31250,"record_kind":"source_transcription"},
  {"tube_size":"52x195","units_per_sheet":20,"assembly_group_count":5,"repeat_step":4,"variety_source":5,"quantity_source":5000,"single_variety_order_quantity_source":25000,"record_kind":"source_transcription"},
  {"tube_size":"52x214","units_per_sheet":20,"assembly_group_count":5,"repeat_step":4,"variety_source":5,"quantity_source":5000,"single_variety_order_quantity_source":25000,"record_kind":"source_transcription"},
  {"tube_size":"52x234","units_per_sheet":15,"assembly_group_count":5,"repeat_step":3,"variety_source":5,"quantity_source":3750,"single_variety_order_quantity_source":18750,"record_kind":"source_transcription"},
  {"tube_size":"65x104","units_per_sheet":32,"assembly_group_count":8,"repeat_step":4,"variety_source":8,"quantity_source":5000,"single_variety_order_quantity_source":40000,"record_kind":"source_transcription"},
  {"tube_size":"65x165","units_per_sheet":20,"assembly_group_count":5,"repeat_step":4,"variety_source":5,"quantity_source":5000,"single_variety_order_quantity_source":25000,"record_kind":"source_transcription"},
  {"tube_size":"65x195","units_per_sheet":16,"assembly_group_count":4,"repeat_step":4,"variety_source":4,"quantity_source":5000,"single_variety_order_quantity_source":20000,"record_kind":"source_transcription"},
  {"tube_size":"65x234","units_per_sheet":12,"assembly_group_count":3,"repeat_step":4,"variety_source":3,"quantity_source":5000,"single_variety_order_quantity_source":15000,"record_kind":"source_transcription"},
  {"tube_size":"65x240","units_per_sheet":12,"assembly_group_count":3,"repeat_step":4,"variety_source":3,"quantity_source":5000,"single_variety_order_quantity_source":15000,"record_kind":"source_transcription"},
  {"tube_size":"65x270","units_per_sheet":12,"assembly_group_count":3,"repeat_step":4,"variety_source":3,"quantity_source":5000,"single_variety_order_quantity_source":15000,"record_kind":"source_transcription"},
  {"tube_size":"65x300","units_per_sheet":12,"assembly_group_count":3,"repeat_step":4,"variety_source":3,"quantity_source":5000,"single_variety_order_quantity_source":15000,"record_kind":"source_transcription"}
];

const CAPACITY_STEP_LOOKUP = {
  '45x100': { capacity: 48, groups: 8, step: 6 },
  '45x140': { capacity: 36, groups: 6, step: 6 },
  '45x175': { capacity: 30, groups: 6, step: 5 },
  '52x90':  { capacity: 45, groups: 9, step: 5 },
  '52x105': { capacity: 40, groups: 8, step: 5 },
  '52x132': { capacity: 30, groups: 6, step: 5 },
  '52x161': { capacity: 25, groups: 5, step: 5 },
  '52x165': { capacity: 25, groups: 5, step: 5 },
  '52x195': { capacity: 20, groups: 5, step: 4 },
  '52x214': { capacity: 20, groups: 5, step: 4 },
  '52x234': { capacity: 15, groups: 5, step: 3 },
  '65x104': { capacity: 32, groups: 8, step: 4 },
  '65x165': { capacity: 20, groups: 5, step: 4 },
  '65x195': { capacity: 16, groups: 4, step: 4 },
  '65x234': { capacity: 12, groups: 3, step: 4 },
  '65x240': { capacity: 12, groups: 3, step: 4 },
  '65x270': { capacity: 12, groups: 3, step: 4 },
  '65x300': { capacity: 12, groups: 3, step: 4 },
};

// 3. MONTAJ GÖRÜNÜMÜ DÜZENLERİ (Sheet Layouts - Faz 2)
// Kapasite hesabı yapılmaz; hazır kapasite ile satır x sütun tutarlılığı denetlenir.
const INITIAL_SHEET_LAYOUTS = [
  {
    id: "LAYOUT-52x195",
    tube_size: "52x195",
    raw_sheet_code: "500011000004-1206",
    rows: 4,
    cols: 5,
    orientation: "landscape",
    cell_order: "row_major",
    verification_status: "verified",
    margin_mm: 12,
    gap_mm: 4,
    notes: "Kullanıcı tanımlı montaj düzeni (4 satır x 5 sütun = 20 yuva; Varsayılan Sütun Kuralı ile uyumlu).",
    record_kind: "source_transcription"
  },
  {
    id: "LAYOUT-45x100",
    tube_size: "45x100",
    raw_sheet_code: "500011000004-1103",
    rows: 8,
    cols: 6,
    orientation: "landscape",
    cell_order: "row_major",
    verification_status: "verified",
    margin_mm: 10,
    gap_mm: 4,
    notes: "Kullanıcı tanımlı montaj düzeni (8 satır x 6 sütun = 48 yuva; 45×100 Satır İstisna Kuralı ile uyumlu).",
    record_kind: "source_transcription"
  },
  {
    id: "LAYOUT-52x105",
    tube_size: "52x105",
    raw_sheet_code: "500011000004-1202",
    rows: 8,
    cols: 5,
    orientation: "landscape",
    cell_order: "row_major",
    verification_status: "verified",
    margin_mm: 10,
    gap_mm: 4,
    notes: "Kullanıcı tanımlı montaj düzeni (8 satır x 5 sütun = 40 yuva; 52×105 Satır İstisna Kuralı ile uyumlu).",
    record_kind: "source_transcription"
  },
  {
    id: "LAYOUT-65x104",
    tube_size: "65x104",
    raw_sheet_code: "500011000004-1408",
    rows: 4,
    cols: 8,
    orientation: "landscape",
    cell_order: "row_major",
    verification_status: "verified",
    margin_mm: 10,
    gap_mm: 4,
    notes: "Kullanıcı tanımlı montaj düzeni (4 satır x 8 sütun = 32 yuva; Çap 65mm Satır İstisna Kuralı ile uyumlu).",
    record_kind: "source_transcription"
  },
  {
    id: "LAYOUT-65x300",
    tube_size: "65x300",
    raw_sheet_code: "500011000004-1414",
    rows: 3,
    cols: 4,
    orientation: "landscape",
    cell_order: "row_major",
    verification_status: "verified",
    margin_mm: 12,
    gap_mm: 4,
    notes: "Kullanıcı tanımlı montaj düzeni (3 satır x 4 sütun = 12 yuva; Çap 65mm Satır İstisna Kuralı ile uyumlu).",
    record_kind: "source_transcription"
  }
];

// 4. İHTİYAÇ HAVUZU (Zemin, Vernik, Lak, İç Kaplama 4 ayrı alan)
const INITIAL_DEMANDS = [
  // SOFT ürün grubu (52x195) - Temsili demo kodları (İçi GOLD iç kaplama alanında, lak belirtilmemiş)
  {id:'DEM-001', reference_no:'SIP-2026-SOFT-01', stock_code:'511109010910-1001', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:6200, available_stock:1200, net_quantity:5000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  {id:'DEM-002', reference_no:'SIP-2026-SOFT-02', stock_code:'511109010910-1002', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:11500, available_stock:1500, net_quantity:10000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  {id:'DEM-003', reference_no:'SIP-2026-SOFT-03', stock_code:'511109010910-1003', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:10800, available_stock:800, net_quantity:10000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  {id:'DEM-004', reference_no:'SIP-2026-SOFT-04', stock_code:'511109010910-1004', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-CITRUS', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:5000, available_stock:0, net_quantity:5000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  {id:'DEM-005', reference_no:'SIP-2026-SOFT-05', stock_code:'511109010910-1005', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-ANTİTÜTÜN', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:12000, available_stock:2000, net_quantity:10000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  {id:'DEM-006', reference_no:'SIP-2026-SOFT-06', stock_code:'511109010910-1006', stock_name:'TUP-SOFT ODA SPR 300 ml (52x195)-ROSE', tube_size:'52x195', diameter_mm:52, height_mm:195, due_date:'2026-11-06', gross_quantity:10000, available_stock:0, net_quantity:10000, raw_sheet_code:'500011000004-1206', raw_sheet_desc:'HAM LEVHA-017x832x800- (T 61) -52x195', print_surface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', colors:['C','M','Y','K'], definition_status:'complete', order_type:'RPT', record_kind:'synthetic_demo'},
  // GW Serisi Ürünler
  {id:'DEM-007', reference_no:'SIP-2026-GW-7284', stock_code:'511109010910-7284', stock_name:'TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST', tube_size:'52x234', diameter_mm:52, height_mm:234, due_date:'2026-11-09', gross_quantity:25000, available_stock:6250, net_quantity:18750, raw_sheet_code:'500011000004-1208', raw_sheet_desc:'HAM LEVHA-017x832x720- (T 61) -52x234', print_surface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', colors:['C','M','Y','K','368C','357C'], definition_status:'requires_verification', order_type:'RPT', record_kind:'source_transcription'},
  {id:'DEM-008', reference_no:'SIP-2026-GW-7285', stock_code:'511109010910-7285', stock_name:'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER', tube_size:'52x234', diameter_mm:52, height_mm:234, due_date:'2026-11-09', gross_quantity:22000, available_stock:3250, net_quantity:18750, raw_sheet_code:'500011000004-1208', raw_sheet_desc:'HAM LEVHA-017x832x720- (T 61) -52x234', print_surface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', colors:['C','M','Y','K','368C','357C'], definition_status:'requires_verification', order_type:'RPT', record_kind:'source_transcription'},
  // Mobilya Grubu
  {id:'DEM-009', reference_no:'SIP-2026-MOB-1102', stock_code:'511109010410-1102', stock_name:'TUP-GW MOBILYA 300 ml (52x214)-LEMON', tube_size:'52x214', diameter_mm:52, height_mm:214, due_date:'2026-11-12', gross_quantity:30000, available_stock:5000, net_quantity:25000, raw_sheet_code:'500011000004-1207', raw_sheet_desc:'HAM LEVHA-017x832x875- (T 61) -52x214', print_surface:'METALİK', varnish:'KISMİ', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', colors:['C','M','Y','K','1225C'], definition_status:'requires_verification', order_type:'RPT', record_kind:'source_transcription'},
  {id:'DEM-010', reference_no:'SIP-2026-MOB-7026', stock_code:'511109010410-7026', stock_name:'TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT', tube_size:'52x214', diameter_mm:52, height_mm:214, due_date:'2026-11-12', gross_quantity:28000, available_stock:3000, net_quantity:25000, raw_sheet_code:'500011000004-1207', raw_sheet_desc:'HAM LEVHA-017x832x875- (T 61) -52x214', print_surface:'METALİK', varnish:'KISMİ', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', colors:['C','M','Y','K','1225C'], definition_status:'requires_verification', order_type:'RPT', record_kind:'source_transcription'},
  // Eksik Tanımlı Test
  {id:'DEM-021', reference_no:'SIP-2026-MISC-9901', stock_code:'519999010001', stock_name:'TUP-DENEME ODOR SPR 200 ml (45x100)-MISSING-SHEET', tube_size:'45x100', diameter_mm:45, height_mm:100, due_date:'2026-11-15', gross_quantity:30000, available_stock:0, net_quantity:30000, raw_sheet_code:'', raw_sheet_desc:'TANIMLANMAMIŞ (45x100 ham levha katalogda eksik)', print_surface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'STANDART', colors:['C','M','Y','K'], definition_status:'missing_raw_sheet', order_type:'YENI', record_kind:'synthetic_demo'}
];

// 5. REFERANS ÜRETİM PLANI (20 Satır)
const INITIAL_PRODUCTION_PLAN = [
  {"id":"PLAN-1","week_source":"2026-45-Hafta","finish_date":"2026-11-03","consumption_code":"512031011610-1007","consumption_name":"TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-BAHAR TAZELIGI-YENI","tube_size":"65x104","planned_units":60160,"machine":"HAT-01 (Otomatik Hat)","shift":"Vardiya-1 (08:00 - 16:00)","material_status":"ready","record_kind":"source_transcription"},
  {"id":"PLAN-2","week_source":"2026-45-Hafta","finish_date":"2026-11-04","consumption_code":"512031011610-1009","consumption_name":"TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-PUDRA ETKISI-YENI","tube_size":"65x104","planned_units":40000,"machine":"HAT-02 (Hızlı Hat)","shift":"Vardiya-2 (16:00 - 24:00)","material_status":"awaiting_quality","record_kind":"source_transcription"},
  {"id":"PLAN-3","week_source":"2026-45-Hafta","finish_date":"2026-11-04","consumption_code":"512031011610-1008","consumption_name":"TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-MASAL BAHCE-YENI","tube_size":"65x104","planned_units":54080,"machine":"HAT-01 (Otomatik Hat)","shift":"Vardiya-1 (08:00 - 16:00)","material_status":"ready","record_kind":"source_transcription"},
  {"id":"PLAN-4","week_source":"2026-45-Hafta","finish_date":"2026-11-05","consumption_code":"512011011610-8211","consumption_name":"TUP-RITM YEDEK SPR 300 ml (65x104)-LAVANDER DREAM","tube_size":"65x104","planned_units":16000,"machine":"HAT-02 (Hızlı Hat)","shift":"Vardiya-3 (00:00 - 08:00)","material_status":"ready","record_kind":"source_transcription"},
  {"id":"PLAN-5","week_source":"2026-45-Hafta","finish_date":"2026-11-05","consumption_code":"512011011610-8212","consumption_name":"TUP-RITM YEDEK SPR 300 ml (65x104)-ROSY GARDEN","tube_size":"65x104","planned_units":16000,"machine":"HAT-01 (Otomatik Hat)","shift":"Vardiya-1 (08:00 - 16:00)","material_status":"ready","record_kind":"source_transcription"}
];

// 6. İŞ KURALLARI (Business Rules)
const INITIAL_BUSINESS_RULES = [
  {id:'RULE-001', code:'KRL-RENK-01', title:'Maksimum Benzersiz Renk Sınırı (Varsayılan 6)', scope:'combination', condition_field:'colors', operator:'max_count', parameter_value:'6', rule_type:'strict_block', priority:1, is_active:true, description:'Benzersiz renk kodlarının birleşimi varsayılan en fazla 6 olabilir.', record_kind:'source_transcription'},
  {id:'RULE-002', code:'KRL-EBAT-01', title:'Aynı Ebat Koşulu (Çap x Boy)', scope:'combination', condition_field:'tube_size', operator:'all_same', parameter_value:'tube_size', rule_type:'strict_block', priority:1, is_active:true, description:'Aynı montaja girecek tüm teneke tüpler aynı ebatta olmalıdır.', record_kind:'source_transcription'},
  {id:'RULE-003', code:'KRL-ZEMIN-01', title:'Aynı Zemin Koşulu (Baskı Yüzeyi)', scope:'combination', condition_field:'print_surface', operator:'all_same', parameter_value:'print_surface', rule_type:'strict_block', priority:2, is_active:true, description:'Metalik ve emaye gibi farklı zeminler aynı montajda birleştirilemez.', record_kind:'source_transcription'},
  {id:'RULE-004', code:'KRL-LEVHA-01', title:'Tanımlı Ham Levha Uygunluğu', scope:'combination', condition_field:'raw_sheet_code', operator:'equals', parameter_value:'raw_sheet_code', rule_type:'strict_block', priority:2, is_active:true, description:'Ürünün tanımlı ham levha kodu ile montaj levha kodu birebir uyuşmalıdır.', record_kind:'source_transcription'},
  {id:'RULE-005', code:'KRL-MIN-01', title:'Minimum Baskı Miktarı (1.250 Levha)', scope:'combination', condition_field:'sheet_count', operator:'min_threshold', parameter_value:'1250', rule_type:'requires_approval', priority:3, is_active:true, description:'Varsayılan minimum baskı 1.250 levhadır. Altındaki işler onay gerektirir.', record_kind:'source_transcription'},
  {id:'RULE-006', code:'KRL-LAK-01', title:'Özel Lak: Yalnız Laksızlarla', scope:'combination', condition_field:'lacquer', operator:'only_unlacquered', parameter_value:'LAKSIZ', rule_type:'strict_block', priority:4, is_active:false, description:'Laksız ürünler yalnız laksız ürünlerle basılabilir (taslak operatör).', record_kind:'synthetic_demo'},
  {id:'RULE-007', code:'KRL-LAK-02', title:'Özel Lak: En Az Bir Başka Laklı', scope:'combination', condition_field:'lacquer', operator:'at_least_one_lacquered', parameter_value:'LAKLI', rule_type:'requires_approval', priority:5, is_active:false, description:'Laklı ürün montajında en az bir başka laklı ürün bulunmalıdır.', record_kind:'synthetic_demo'}
];

// 7. HAT VE MAKİNELER (Kural: Tek tüp gövde üretim hattı esastır)
const INITIAL_PRODUCTION_LINES = [
  {id:'LINE-MAKAS-01', code:'MAKAS-01', name:'Hat 01 - Çiftli Otomatik Makas', line_type:'shearing', supported_tube_sizes:['45x100','45x140','45x175','52x105','52x161','52x165','52x195','52x214','52x234','65x104','65x157','65x165','65x195','65x270','65x300'], shifts_per_day:3, speed_units_per_hour:4500, waste_rate_percent:0.5},
  {id:'LINE-TUP-01', code:'TUP-HATTI', name:'Tüp Gövde Üretim Hattı (Tek Makine)', line_type:'tube_body', supported_tube_sizes:['45x100','45x140','45x175','52x105','52x161','52x165','52x195','52x214','52x234','65x104','65x157','65x165','65x195','65x270','65x300'], shifts_per_day:3, speed_units_per_hour:12000, waste_rate_percent:1.2}
];

// 8. DENETİM İZİ (Audit Logs)
const INITIAL_AUDIT_LOGS = [
  {id:'LOG-1', timestamp:'2026-11-05 10:00:00', user_name:'Alper Ateş', user_role:'admin', entity_type:'system', action:'create', details:'Faz 2 kalıcı veri ve montaj düzeni parametreleri başlatıldı.'},
  {id:'LOG-2', timestamp:'2026-11-05 10:30:00', user_name:'Alper Ateş', user_role:'admin', entity_type:'sheet_layout', action:'create', details:'52x195 montaj görünümü (4 satır x 5 sütun, yatay) doğrulandı.'},
  {id:'LOG-3', timestamp:'2026-11-05 11:00:00', user_name:'Sistem', user_role:'admin', entity_type:'product', action:'update', details:'SOFT iç kaplama alanı GOLD olarak ayrıldı, lak bağımsız alana alındı.'}
];

// 9. MATBAA YERLEŞİM KURALLARI (Printing Press Layout Rules)
// Varsayılan: SAME_VARIANT_PER_COLUMN
// İstisnalar: 45x100, 52x105 ve Çap 65mm olan tüm boylar -> SAME_VARIANT_PER_ROW
const INITIAL_PRINTING_PRESS_RULES = [
  {
    id: 'RULE-PRINT-45-100',
    code: 'KRL-MAT-01',
    name: '45×100 Satır Bazında Tek Çeşit (İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 45,
    applies_to_height: 100,
    applies_to_tube_size: '45x100',
    priority: 10,
    is_active: true,
    description: '45×100 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-PRINT-52-105',
    code: 'KRL-MAT-02',
    name: '52×105 Satır Bazında Tek Çeşit (İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 52,
    applies_to_height: 105,
    applies_to_tube_size: '52x105',
    priority: 10,
    is_active: true,
    description: '52×105 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-PRINT-65-ALL',
    code: 'KRL-MAT-03',
    name: 'Çap 65 mm Satır Bazında Tek Çeşit (Boydan Bağımsız İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 65,
    applies_to_height: null,
    applies_to_tube_size: '65x*',
    priority: 20,
    is_active: true,
    description: 'Çapı 65 mm olan tüm kutularda (65×104, 65×165, 65×195, 65×234, 65×240, 65×270, 65×300 vb.) her satır kendi içinde tek çeşitten oluşmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-PRINT-DEFAULT',
    code: 'KRL-MAT-04',
    name: 'Varsayılan Sütun Bazında Tek Çeşit Kuralı',
    rule_type: 'SAME_VARIANT_PER_COLUMN',
    applies_to_diameter: null,
    applies_to_height: null,
    applies_to_tube_size: 'DEFAULT',
    priority: 100,
    is_active: true,
    description: 'İstisnalar dışındaki tüm ebatlarda (örn. 52×195, 52×214, 52×234, 45×140) her sütun kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true
  }
];

// 11. ERP STOK KATALOĞU (Faz 2C - ERP Senkron Ana Kartları - Salt Okunur)
const INITIAL_STOCK_CATALOG = [
  {
    "stock_code": "500011000004-1103",
    "stock_name": "HAM LEVHA-018x863x866- (T 57) -45x140",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "45x140",
    "dimensions": "863x866 - 0.18mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1104",
    "stock_name": "HAM LEVHA-018x863x898- (T 57) -45x175",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "45x175",
    "dimensions": "863x898 - 0.18mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1202",
    "stock_name": "HAM LEVHA-017x835x872- (T 61) -52x105",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x105",
    "dimensions": "835x872 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1204",
    "stock_name": "HAM LEVHA-017x832x827- (T 61) -52x161",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x161",
    "dimensions": "832x827 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1205",
    "stock_name": "HAM LEVHA-017x832x847- (T 61) -52x165",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x165",
    "dimensions": "832x847 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1206",
    "stock_name": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x195",
    "dimensions": "832x800 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1207",
    "stock_name": "HAM LEVHA-017x832x875- (T 61) -52x214",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x214",
    "dimensions": "832x875 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1208",
    "stock_name": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "52x234",
    "dimensions": "832x720 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1209",
    "stock_name": "HAM LEVHA-017x835x848- (T 61) -65x165",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x165",
    "dimensions": "835x848 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1406",
    "stock_name": "HAM LEVHA-017x835x827- (T 61) -65x270",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x270",
    "dimensions": "835x827 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1408",
    "stock_name": "HAM LEVHA-017x835x864- (T 61) -65x104",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x104",
    "dimensions": "835x864 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1414",
    "stock_name": "HAM LEVHA-018x835x915- (T 61) -65x300",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x300",
    "dimensions": "835x915 - 0.18mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1415",
    "stock_name": "HAM LEVHA-017x835x798- (T 61) -65x195",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x195",
    "dimensions": "835x798 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "500011000004-1411",
    "stock_name": "HAM LEVHA-017x835x808- (T 61) -65x157",
    "category": "Ham Levha",
    "unit": "LEVHA",
    "tube_size": "65x157",
    "dimensions": "835x808 - 0.17mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010410-1102",
    "stock_name": "TUP-GW MOBILYA 300 ml (52x214)-LEMON",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x214",
    "dimensions": "Ø52x214 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010410-7026",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x214",
    "dimensions": "Ø52x214 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010410-7025",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-NATURAL SCENT",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x214",
    "dimensions": "Ø52x214 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010410-7024",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-POTPORI SCENT",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x214",
    "dimensions": "Ø52x214 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511115011310-7458",
    "stock_name": "TUP-GW ODA SPR-500 ml (65x195)-CHRISTMAS EDITION",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "65x195",
    "dimensions": "Ø65x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-7284",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-7285",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-7283",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-J.CHERRY BLO.",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4634",
    "stock_name": "TUP-GW-MS SDCM ALKOL B.-400 ml (52x234)-BUBBLE GUM",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4640",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ORANGE",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4630",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ROSE&PEARL",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4631",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-S.BERRY",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4641",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-TOBACCO",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4625",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ANTI TABAC",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4620",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-JASMIN&COT.",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4632",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LILAC&LOTUS",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4623",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LIME&ORANGE",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4624",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-M.FRAN OCEA",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4629",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOSS&SPRING",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4628",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-TUTTI FRUTTI",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4633",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LAVENDER&CHOM",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-4635",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOUNTAIN LAKE",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x234",
    "dimensions": "Ø52x234 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1001",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1002",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1003",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1004",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-LILAC",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1005",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-SPRING",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  },
  {
    "stock_code": "511109010910-1006",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-ROSE",
    "category": "Tüp Mamul",
    "unit": "ADET",
    "tube_size": "52x195",
    "dimensions": "Ø52x195 mm",
    "source_system": "MikroDesktop_LIDER26",
    "status": "active"
  }
];

// 12. TÜP TEKNİK KARTLARI (Faz 2C - Uygulama Tarafında Yönetilen Teknik Veriler)
const INITIAL_TECHNICAL_PRODUCTS = [
  {
    "id": "TECH-1",
    "stock_code": "511109010410-1102",
    "stock_name": "TUP-GW MOBILYA 300 ml (52x214)-LEMON",
    "tube_size": "52x214",
    "diameter_mm": 52,
    "height_mm": 214,
    "raw_sheet_code": "500011000004-1207",
    "raw_sheet_desc": "HAM LEVHA-017x832x875- (T 61) -52x214",
    "print_surface": "METALİK",
    "varnish": "KISMİ",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "1225C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-2",
    "stock_code": "511109010410-7026",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT",
    "tube_size": "52x214",
    "diameter_mm": 52,
    "height_mm": 214,
    "raw_sheet_code": "500011000004-1207",
    "raw_sheet_desc": "HAM LEVHA-017x832x875- (T 61) -52x214",
    "print_surface": "METALİK",
    "varnish": "KISMİ",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "1225C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-3",
    "stock_code": "511109010410-7025",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-NATURAL SCENT",
    "tube_size": "52x214",
    "diameter_mm": 52,
    "height_mm": 214,
    "raw_sheet_code": "500011000004-1207",
    "raw_sheet_desc": "HAM LEVHA-017x832x875- (T 61) -52x214",
    "print_surface": "METALİK",
    "varnish": "KISMİ",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "1225C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-4",
    "stock_code": "511109010410-7024",
    "stock_name": "TUP-GW MOBILYA CIL. 300 ml (52x214)-POTPORI SCENT",
    "tube_size": "52x214",
    "diameter_mm": 52,
    "height_mm": 214,
    "raw_sheet_code": "500011000004-1207",
    "raw_sheet_desc": "HAM LEVHA-017x832x875- (T 61) -52x214",
    "print_surface": "METALİK",
    "varnish": "KISMİ",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "1225C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-5",
    "stock_code": "511115011310-7458",
    "stock_name": "TUP-GW ODA SPR-500 ml (65x195)-CHRISTMAS EDITION",
    "tube_size": "65x195",
    "diameter_mm": 65,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1415",
    "raw_sheet_desc": "HAM LEVHA-017x835x798- (T 61) -65x195",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "7621C",
      "364C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-6",
    "stock_code": "511109010910-7284",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-7",
    "stock_code": "511109010910-7285",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-8",
    "stock_code": "511109010910-7283",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-J.CHERRY BLO.",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-9",
    "stock_code": "511109010910-4634",
    "stock_name": "TUP-GW-MS SDCM ALKOL B.-400 ml (52x234)-BUBBLE GUM",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-10",
    "stock_code": "511109010910-4640",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ORANGE",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-11",
    "stock_code": "511109010910-4630",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ROSE&PEARL",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-12",
    "stock_code": "511109010910-4631",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-S.BERRY",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-13",
    "stock_code": "511109010910-4641",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-TOBACCO",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-14",
    "stock_code": "511109010910-4625",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-ANTI TABAC",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-15",
    "stock_code": "511109010910-4620",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-JASMIN&COT.",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-16",
    "stock_code": "511109010910-4632",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LILAC&LOTUS",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-17",
    "stock_code": "511109010910-4623",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LIME&ORANGE",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-18",
    "stock_code": "511109010910-4624",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-M.FRAN OCEA",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-19",
    "stock_code": "511109010910-4629",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOSS&SPRING",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-20",
    "stock_code": "511109010910-4628",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-TUTTI FRUTTI",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-21",
    "stock_code": "511109010910-4633",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-LAVENDER&CHOM",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-22",
    "stock_code": "511109010910-4635",
    "stock_name": "TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOUNTAIN LAKE",
    "tube_size": "52x234",
    "diameter_mm": 52,
    "height_mm": 234,
    "raw_sheet_code": "500011000004-1208",
    "raw_sheet_desc": "HAM LEVHA-017x832x720- (T 61) -52x234",
    "print_surface": "EMAYE",
    "varnish": "PARLAK",
    "lacquer": "LAKLI",
    "inside_coating": "BELİRTİLMEMİŞ",
    "colors": [
      "C",
      "M",
      "Y",
      "K",
      "368C",
      "357C"
    ],
    "special_parameter": "",
    "is_active": true,
    "record_kind": "source_transcription"
  },
  {
    "id": "TECH-SOFT-1",
    "stock_code": "511109010910-1001",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  },
  {
    "id": "TECH-SOFT-2",
    "stock_code": "511109010910-1002",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  },
  {
    "id": "TECH-SOFT-3",
    "stock_code": "511109010910-1003",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  },
  {
    "id": "TECH-SOFT-4",
    "stock_code": "511109010910-1004",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-LILAC",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  },
  {
    "id": "TECH-SOFT-5",
    "stock_code": "511109010910-1005",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-SPRING",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  },
  {
    "id": "TECH-SOFT-6",
    "stock_code": "511109010910-1006",
    "stock_name": "TUP-SOFT ODA SPR 300 ml (52x195)-ROSE",
    "tube_size": "52x195",
    "diameter_mm": 52,
    "height_mm": 195,
    "raw_sheet_code": "500011000004-1206",
    "raw_sheet_desc": "HAM LEVHA-017x832x800- (T 61) -52x195",
    "print_surface": "EMAYE",
    "varnish": "BELİRTİLMEMİŞ",
    "lacquer": "BELİRTİLMEMİŞ",
    "inside_coating": "GOLD",
    "colors": [
      "C",
      "M",
      "Y",
      "K"
    ],
    "special_parameter": "SOFT REV NO:08 - İçi GOLD",
    "is_active": true,
    "record_kind": "synthetic_demo"
  }
];

// 13. BAĞIMSIZ SÖZLÜKLER (Faz 2C)
const INITIAL_DICTIONARIES = {
  surfaces: [
    { code: 'EMAYE', name: 'Beyaz Emaye Zemin', is_active: true },
    { code: 'METALİK', name: 'Metalik Vernikli Zemin', is_active: true }
  ],
  varnishes: [
    { code: 'PARLAK', name: 'Parlak Dış Vernik', is_active: true },
    { code: 'MAT', name: 'Mat Dış Vernik', is_active: true },
    { code: 'KISMİ', name: 'Kısmi Vernik', is_active: true },
    { code: 'BELİRTİLMEMİŞ', name: 'Belirtilmemiş Vernik', is_active: true }
  ],
  lacquers: [
    { code: 'LAKLI', name: 'Laklı Yüzey (Kurutma Gerekir)', is_active: true, description: 'Özel lak uygulanmış ürünler' },
    { code: 'LAKSIZ', name: 'Laksız Standart Yüzey', is_active: true, description: 'Laksız hat ürünü' },
    { code: 'BILINMIYOR', name: 'Bilinmiyor / Belirtilmemiş', is_active: true, description: 'Boş bırakılan veya netleşmemiş durum; otomatik laklı kabul edilmez' }
  ],
  inside_coatings: [
    { code: 'GOLD', name: 'İçi GOLD Kaplama', is_active: true, description: 'Gıda/özel formül koruyucu sarı lak/kaplama' },
    { code: 'ŞEFFAF', name: 'Şeffaf İç Koruyucu', is_active: true, description: 'Standart şeffaf koruyucu astar' },
    { code: 'STANDART', name: 'Standart Teneke İçi', is_active: true, description: 'Kaplamasız teneke yüzeyi' },
    { code: 'BELİRTİLMEMİŞ', name: 'Belirtilmemiş', is_active: true, description: 'İç kaplama alanı tanımlanmamış' }
  ],
  colors: [
    { code: 'C', name: 'Cyan (Proses Mavi)', hex: '#0284c7' },
    { code: 'M', name: 'Magenta (Proses Kırmızı)', hex: '#ec4899' },
    { code: 'Y', name: 'Yellow (Proses Sarı)', hex: '#eab308' },
    { code: 'K', name: 'Key/Black (Proses Siyah)', hex: '#0f172a' },
    { code: '1225C', name: 'Pantone 1225 C (Sarı)', hex: '#f59e0b' },
    { code: '368C', name: 'Pantone 368 C (Açık Yeşil)', hex: '#22c55e' },
    { code: '357C', name: 'Pantone 357 C (Koyu Yeşil)', hex: '#15803d' },
    { code: '185C', name: 'Pantone 185 C (Kırmızı)', hex: '#dc2626' },
    { code: '2665C', name: 'Pantone 2665 C (Mor)', hex: '#9333ea' },
    { code: '2587C', name: 'Pantone 2587 C (Eflatun)', hex: '#a855f7' },
    { code: '109C', name: 'Pantone 109 C (Parlak Sarı)', hex: '#facc15' }
  ]
};

// 10. PARAMETRİK LAK VE ÜRÜN KOMBİNASYON KURALLARI (Product & Lacquer Combination Rules)
const INITIAL_COMBINATION_RULES = [
  {
    id: 'RULE-KMB-01',
    code: 'KRL-LAK-YASAK',
    name: 'Laklı ve Laksız Karışımı Açık Yasağı (Varsayılan)',
    rule_type: 'FORBID_MIXED_LACQUER',
    target_type: 'GLOBAL',
    priority: 10,
    is_active: true,
    description: 'Fırın kurutma ve vernik/lak hat farklılığı nedeniyle laklı ve laksız ürünler kesinlikle aynı levhada birleştirilemez.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-02',
    code: 'KRL-LAKSIZ-TEK',
    name: 'Laksız Ürünler Yalnız Laksızlarla Kombine Edilebilir',
    rule_type: 'ONLY_WITH_UNLACQUERED',
    target_type: 'LACQUER_STATUS',
    target_lacquer_status: 'LAKSIZ',
    priority: 20,
    is_active: true,
    description: 'Laksız olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laksız olmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-03',
    code: 'KRL-LAKLI-TEK',
    name: 'Laklı Ürünler Yalnız Laklılarla Kombine Edilebilir',
    rule_type: 'ONLY_WITH_LACQUERED',
    target_type: 'LACQUER_STATUS',
    target_lacquer_status: 'LAKLI',
    priority: 20,
    is_active: true,
    description: 'Laklı olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laklı olmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-04',
    code: 'KRL-SOLO-OZEL',
    name: 'Özel Seri Tek Başına Montaj Kuralı (Örnek Solo İş)',
    rule_type: 'EXCLUSIVE_SOLO_ONLY',
    target_type: 'PRODUCT',
    target_product_code: '519999010001',
    priority: 5,
    is_active: false,
    description: 'Bu ürün hassas formülasyona veya özel kalite kontrol şartına sahiptir; başka hiçbir ürünle birleştirilemez, tek başına basılır.',
    is_system_default: false
  },
  {
    id: 'RULE-KMB-05',
    code: 'KRL-CAPRAZ-KORUMA',
    name: 'Çapraz Bulaşma Koruma Yasağı (Oda Spreyi & Fırın Temizleyici)',
    rule_type: 'FORBIDDEN_WITH_PRODUCTS',
    target_type: 'PRODUCT',
    target_product_code: '511109010910-1001',
    param_product_codes: ['511121010410-5004'],
    priority: 15,
    is_active: false,
    description: 'Koku/kimyasal bulaşma riski nedeniyle oda spreyi ile fırın temizleyici formülasyonları aynı levhada basılamaz.',
    is_system_default: false
  }
];

// App State
let state = {
  activePage: 'overview',
  backendConnected: false,
  isSyncing: false,
  sessionToken: localStorage.getItem('tp_session_token_v2c') || 'token_admin_session_v2c',
  currentUser: null,
  demands: JSON.parse(localStorage.getItem('tp_demands_v2')) || INITIAL_DEMANDS,
  capacities: INITIAL_CAPACITIES,
  rawSheets: JSON.parse(localStorage.getItem('tp_raw_sheets_v2')) || INITIAL_RAW_SHEETS,
  sheetLayouts: JSON.parse(localStorage.getItem('tp_sheet_layouts_v2')) || INITIAL_SHEET_LAYOUTS,
  businessRules: JSON.parse(localStorage.getItem('tp_business_rules_v2')) || INITIAL_BUSINESS_RULES,
  printingPressRules: JSON.parse(localStorage.getItem('tp_printing_rules_v2')) || INITIAL_PRINTING_PRESS_RULES,
  combinationRules: JSON.parse(localStorage.getItem('tp_combination_rules_v2')) || INITIAL_COMBINATION_RULES,
  productionLines: INITIAL_PRODUCTION_LINES,
  auditLogs: JSON.parse(localStorage.getItem('tp_audit_logs_v2')) || INITIAL_AUDIT_LOGS,
  productionPlans: JSON.parse(localStorage.getItem('tp_plans_v2')) || INITIAL_PRODUCTION_PLAN,
  currentRole: localStorage.getItem('tp_current_role_v2') || 'admin',
  selectedDemandIds: ['DEM-001', 'DEM-002', 'DEM-003'],

  // Workbench state
  sheetCount: 1250,
  minPrintSheets: 1250,
  maxColors: 6,
  workbenchItems: [
    {productId:'DEM-001', stockCode:'511109010910-1001', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'DEM-002', stockCode:'511109010910-1002', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'DEM-003', stockCode:'511109010910-1003', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ],

  // Faz 2C: Tanımlar Merkezi & Excel İçe Aktarma State
  stockCatalog: INITIAL_STOCK_CATALOG,
  technicalProducts: JSON.parse(localStorage.getItem('tp_technical_products_v2')) || INITIAL_TECHNICAL_PRODUCTS,
  dictionaries: JSON.parse(localStorage.getItem('tp_dictionaries_v2')) || INITIAL_DICTIONARIES,
  technicalSearchQuery: '',
  technicalFilterSize: 'ALL',
  technicalFilterSurface: 'ALL',
  technicalFilterLacquer: 'ALL',
  technicalFilterStatus: 'ALL',
  isProductModalOpen: false,
  editingProduct: null,
  isImportModalOpen: false,
  importStep: 1,
  importRawData: '',
  importParsedRows: [],
  importPolicy: 'all', // 'all' | 'new_only' | 'update_only'
  importValidation: null,

  // Screen filters
  demandFilterSize: 'ALL',
  demandFilterSurface: 'ALL',
  demandFilterStatus: 'ALL',
  demandFilterRecordKind: 'ALL',
  demandSearch: '',
  selectedDemandDetailId: null,
  isMobileSidebarOpen: false,
  technicalTab: 'products',
  planView: 'list',

  // Matbaa & Kombinasyon Yönetimi State
  printingRulesTab: 'layout', // 'layout' | 'combination'
  selectedProductForCompatibilityQuery: '511109010910-1001',
  isPrintingRuleModalOpen: false,
  editingPrintingRule: null,
  isCombinationRuleModalOpen: false,
  editingCombinationRule: null,

  // Faz 3A.1 SQL Plan Snapshot & Taslak Yönetimi
  sqlPlanPreview: null,
  isFetchingSqlPreview: false,
  showSqlPlanModal: false,
  showSnapshotHistoryModal: false,
  planSnapshots: [],
  planDraft: null,
  planSearch: '',

  // Faz 3B: Kademeli İhtiyaç Motoru & Stok Tahsisi
  latestCalculation: null,
  isCalculatingAllocations: false,
  demandCalculationFilter: 'ALL', // 'ALL' | 'CALCULATED' | 'UNRESOLVED' | 'ERROR'

  // Faz 5A: Tek Makine Çizelgeleme ve Takvim State
  scheduleStartTime: '2026-11-06T07:30',
  schedulePreview: null,
  isCalculatingSchedule: false,
  isSavingSchedule: false,
  planScenarios: [],
  showScenarioModal: false,
  scenarioModalMode: 'list', // 'list' | 'save'
  showAddDemandModal: false,
  schedulingParams: null
};

const PRODUCT_PALETTES = [
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-950', chip: 'bg-amber-500 text-white', badge: 'border-amber-400 bg-amber-50 text-amber-900' },
  { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-950', chip: 'bg-sky-500 text-white', badge: 'border-sky-400 bg-sky-50 text-sky-900' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-950', chip: 'bg-purple-500 text-white', badge: 'border-purple-400 bg-purple-50 text-purple-900' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-950', chip: 'bg-emerald-500 text-white', badge: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-950', chip: 'bg-rose-500 text-white', badge: 'border-rose-400 bg-rose-50 text-rose-900' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-950', chip: 'bg-teal-500 text-white', badge: 'border-teal-400 bg-teal-50 text-teal-900' }
];

function formatNum(n, forceDecimals = null) {
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (isNaN(num)) return '0';
  if (forceDecimals !== null) {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: forceDecimals, maximumFractionDigits: forceDecimals });
  }
  const hasDecimals = (num % 1) !== 0;
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  });
}

function logAudit(entity, entityId, action, details) {
  const newLog = {
    id: 'LOG-' + Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    user_name: state.currentRole === 'admin' ? 'Alper Ateş (Yönetici)' : state.currentRole === 'planner' ? 'Planlama Uzmanı' : 'Görüntüleyici',
    user_role: state.currentRole,
    entity_type: entity,
    action: action,
    details: details
  };
  state.auditLogs.unshift(newLog);
  localStorage.setItem('tp_audit_logs_v2', JSON.stringify(state.auditLogs));
}

async function switchRole(role) {
  state.currentRole = role;
  localStorage.setItem('tp_current_role_v2', role);
  try {
    const res = await apiRequest('/api/auth/switch-role', {
      method: 'POST',
      body: { role }
    });
    if (res && res.data) {
      state.sessionToken = res.data.token;
      state.currentRole = res.data.role;
      state.currentUser = res.data;
      localStorage.setItem('tp_session_token_v2c', res.data.token);
    }
    const auditRes = await apiRequest('/api/audit-logs').catch(() => null);
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }
  } catch (err) {
    console.warn('Rol sunucuda güncellenemedi:', err.message);
  }
  renderApp();
}

function renderColorChip(color) {
  const c = (color || '').toUpperCase().trim();
  let bg = '#e2e8f0', fg = '#0f172a';
  if (c === 'C') { bg = '#0284c7'; fg = '#ffffff'; }
  else if (c === 'M') { bg = '#db2777'; fg = '#ffffff'; }
  else if (c === 'Y') { bg = '#eab308'; fg = '#000000'; }
  else if (c === 'K') { bg = '#0f172a'; fg = '#ffffff'; }
  else if (c.includes('368') || c.includes('357')) { bg = '#16a34a'; fg = '#ffffff'; }
  else if (c.includes('185')) { bg = '#dc2626'; fg = '#ffffff'; }
  else if (c.includes('1225') || c.includes('109')) { bg = '#f59e0b'; fg = '#000000'; }
  else if (c.includes('2665') || c.includes('2587')) { bg = '#9333ea'; fg = '#ffffff'; }
  return `<span class="color-chip" style="background-color:${bg}; color:${fg};">${c}</span>`;
}

// SVG İkon Kütüphanesi (Temiz, Tutarlı Vektörler - Emojiler Kaldırıldı)
function getSvgIcon(name, cls = 'w-4 h-4') {
  switch (name) {
    case 'overview':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 13h4v8H3v-8zm7-8h4v16h-4V5zm7 4h4v12h-4V9z"/></svg>`;
    case 'demands':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4a2 2 0 01-2-2V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2a2 2 0 01-2 2H4"/></svg>`;
    case 'workbench':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 5h16M10 4v16"/></svg>`;
    case 'printing_rules':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>`;
    case 'technical':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="1.75"/></svg>`;
    case 'production':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`;
    case 'integration':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>`;
    case 'search':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`;
    case 'arrow-right':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    case 'check':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    case 'x':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    case 'info':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    case 'eye':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    case 'chevron-right':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`;
    case 'menu':
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>`;
    default:
      return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="1.75"/></svg>`;
  }
}

// Navigation items (Faz 2D Sözleşmesi: Emojisiz, standart ikon adları)
const NAV_ITEMS = [
  { id: 'overview', label: 'Planlama Özeti', iconName: 'overview' },
  { id: 'demands', label: 'İhtiyaç Havuzu', iconName: 'demands' },
  { id: 'workbench', label: 'Kombinasyon Masası', iconName: 'workbench' },
  { id: 'printing_rules', label: 'Matbaa & Kombinasyon Kuralları', iconName: 'printing_rules' },
  { id: 'technical', label: 'Teknik Tanımlar & Parametreler', iconName: 'technical' },
  { id: 'production', label: 'Teneke Üretim Planı', iconName: 'production' },
  { id: 'integration', label: 'SQL Entegrasyonu', iconName: 'integration' },
];

function renderSidebar() {
  return `
    ${state.isMobileSidebarOpen ? `
      <div onclick="state.isMobileSidebarOpen = false; renderApp();" class="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"></div>
    ` : ''}
    <aside class="${state.isMobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden md:flex'} w-60 bg-white border-r border-slate-200 flex-col flex-shrink-0 shadow-xs select-none">
      <div class="h-14 flex items-center justify-between px-4 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-sky-700 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-xs">
            TP
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs tracking-tight text-slate-900 truncate">TENEKE PLANLAMA</div>
            <div class="text-[10px] text-slate-500 font-mono">Lider Fabrika Workbench</div>
          </div>
        </div>
        ${state.isMobileSidebarOpen ? `
          <button onclick="state.isMobileSidebarOpen = false; renderApp();" class="md:hidden p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100">
            ${getSvgIcon('x', 'w-4 h-4')}
          </button>
        ` : ''}
      </div>

      <nav class="p-2 space-y-0.5 flex-1 overflow-y-auto">
        ${NAV_ITEMS.map(item => {
          const isActive = state.activePage === item.id;
          return `
            <button
              onclick="state.activePage='${item.id}'; state.isMobileSidebarOpen=false; renderApp();"
              class="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors ${
                isActive
                  ? 'bg-sky-50 text-sky-900 font-semibold border-l-2 border-sky-600 pl-[10px]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }"
            >
              <span class="${isActive ? 'text-sky-700' : 'text-slate-400'}">${getSvgIcon(item.iconName, 'w-4 h-4')}</span>
              <span class="truncate">${item.label}</span>
            </button>
          `;
        }).join('')}
      </nav>

      <div class="p-3 border-t border-slate-200 space-y-2 bg-slate-50/50">
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>KULLANICI ROLÜ</span>
          <span class="uppercase font-semibold text-slate-700">${state.currentRole}</span>
        </div>
        <select onchange="switchRole(this.value);" class="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 outline-none font-sans focus:border-sky-500">
          <option value="admin" ${state.currentRole==='admin'?'selected':''}>Yönetici (Admin)</option>
          <option value="planner" ${state.currentRole==='planner'?'selected':''}>Planlama Uzmanı</option>
          <option value="viewer" ${state.currentRole==='viewer'?'selected':''}>Görüntüleyici (Salt Okunur)</option>
        </select>

        <button
          onclick="if(confirm('Tüm demo verilerini fabrika varsayılanına sıfırlamak istiyor musunuz?')){ localStorage.clear(); location.reload(); }"
          class="w-full py-1 text-[11px] font-mono text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded transition-colors"
        >
          Verileri Sıfırla
        </button>
      </div>
    </aside>
  `;
}

function renderHeader() {
  const activeObj = NAV_ITEMS.find(i => i.id === state.activePage) || NAV_ITEMS[0];
  const roleBadge = state.currentRole === 'admin'
    ? '<span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">ROL: YÖNETİCİ</span>'
    : state.currentRole === 'planner'
    ? '<span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">ROL: PLANLAMA</span>'
    : '<span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">ROL: GÖRÜNTÜLEYİCİ</span>';

  return `
    <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 shadow-xs">
      <div class="flex items-center gap-2 sm:gap-2.5">
        <button
          onclick="state.isMobileSidebarOpen = !state.isMobileSidebarOpen; renderApp();"
          class="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
          title="Menüyü Aç/Kapat"
        >
          ${getSvgIcon('menu', 'w-5 h-5')}
        </button>
        <h1 class="text-sm font-semibold text-slate-900 tracking-tight">${activeObj.label}</h1>
        <span class="text-slate-300 hidden sm:inline">/</span>
        <span class="text-xs text-slate-500 font-normal hidden sm:inline">Lider Aerosol Satış & Dolum Talepleri</span>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        ${roleBadge}
        <div class="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded bg-slate-50">
          <span class="w-2 h-2 rounded-full ${state.backendConnected ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          <span class="font-medium text-[11px] sm:text-xs">${state.backendConnected ? 'PostgreSQL' : 'Demo'}</span>
        </div>
        <span class="text-[11px] font-mono text-slate-400 hidden sm:inline">v5.0 (Faz 5A)</span>
      </div>
    </header>
  `;
}

// Screen 1: Planlama Özeti
function renderOverview() {
  const totalGross = state.demands.reduce((a, b) => a + (Number(b.gross_quantity) || 0), 0);

  // Tekil ürün bazlı ambar stok haritası (aynı ürünün mükerrer toplanması engellenir)
  const uniqueStockMap = new Map();
  state.demands.forEach(d => {
    if (d.stock_code && !uniqueStockMap.has(d.stock_code)) {
      uniqueStockMap.set(d.stock_code, Number(d.available_stock || d.physical_tube_stock) || 0);
    }
  });
  const totalStock = Array.from(uniqueStockMap.values()).reduce((a, b) => a + b, 0);

  // Faz 3B Kademeli İhtiyaç Motoru Sonuçları
  const calc = state.latestCalculation;
  const isCalculated = Boolean(calc && calc.status === 'success');
  const netTube = isCalculated ? Number(calc.total_net_tube) : null;
  const netCutting = isCalculated ? Number(calc.total_net_cutting) : null;
  const netPrint = isCalculated ? Number(calc.total_net_print) : null;

  return `
    <div class="space-y-6">
      <!-- İlke Hatırlatması & Faz 3B Durumu -->
      ${calc && calc.is_stale ? `
        <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-2.5">
          <span class="text-base text-amber-600">⚠️</span>
          <div class="flex-1">
            <div class="font-bold">Hesaplama Eskimiş (Stale Data Uyarısı)</div>
            <div class="text-[11px] text-amber-800 mt-0.5">
              Son stok tahsis hesaplamasından sonra yeni bir ERP senkronizasyonu veya veri güncellemesi gerçekleşti. Gösterilen net ihtiyaçlar güncel veri setini yansıtmayabilir. Lütfen sağdaki butona basarak tahsisi yeniden hesaplayınız.
            </div>
          </div>
          <button
            onclick="triggerCalculateAllocations();"
            ${state.isCalculatingAllocations ? 'disabled' : ''}
            class="px-3 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-colors cursor-pointer flex-shrink-0"
          >
            Tahsisi Yenile
          </button>
        </div>
      ` : ''}

      <div class="p-3.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950 flex items-start gap-2.5">
        <span class="text-base text-sky-600">ℹ</span>
        <div class="flex-1">
          <div class="font-bold">Faz 3B: Kademeli İhtiyaç ve Tekil Stok Tahsis Motoru Aktif</div>
          <div class="text-[11px] text-sky-800 mt-0.5">
            Tüp, kesik levha ve baskılı levha stokları termin sırasına göre tek seferlik tahsis edilerek netlenir. Mükerrer stok kullanımı engellenir.
            Ham levha stoğu yeni baskı ihtiyacını azaltmaz; satın alma gereksinimini etkiler.
          </div>
        </div>
        <button
          onclick="triggerCalculateAllocations();"
          ${state.isCalculatingAllocations ? 'disabled' : ''}
          class="px-3 py-1.5 text-xs font-semibold rounded bg-sky-700 hover:bg-sky-800 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
        >
          ${state.isCalculatingAllocations ? `
            <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            <span>Hesaplanıyor...</span>
          ` : `
            <span>Tahsisi Yeniden Çalıştır</span>
          `}
        </button>
      </div>

      <!-- Kademeli 5 Seviyeli KPI Kartları (Faz 3B) -->
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        <!-- 1. Brüt İhtiyaç -->
        <div class="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase text-slate-500">1. Brüt Talep</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600">Dolum</span>
          </div>
          <div class="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">${formatNum(totalGross)}</div>
          <span class="text-[10px] text-slate-400 font-mono">${state.demands.length} Talep Satırı</span>
        </div>

        <!-- 2. Tekil Ambar Stok -->
        <div class="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase text-slate-500">2. Tekil Tüp Stoğu</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700">Fiziksel</span>
          </div>
          <div class="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">${formatNum(totalStock)}</div>
          <span class="text-[10px] text-slate-400 font-mono">${uniqueStockMap.size} Tekil Ürün Ambarı</span>
        </div>

        <!-- 3. Net Tüp Üretim İhtiyacı -->
        <div class="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase text-slate-500">3. Net Tüp Üretimi</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-50 text-blue-700">Tüp Hattı</span>
          </div>
          <div class="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
            ${netTube !== null ? formatNum(netTube) : '<span class="text-xs text-amber-600 font-normal">Hesaplanıyor...</span>'}
          </div>
          <span class="text-[10px] text-slate-400 font-mono">Tüp stok sonrası kalan</span>
        </div>

        <!-- 4. Net Kesim İhtiyacı -->
        <div class="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase text-slate-500">4. Net Kesim</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-50 text-amber-700">Makas</span>
          </div>
          <div class="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            ${netCutting !== null ? formatNum(netCutting) : '<span class="text-xs text-amber-600 font-normal">Hesaplanıyor...</span>'}
          </div>
          <span class="text-[10px] text-slate-400 font-mono">Kesik stok sonrası kalan</span>
        </div>

        <!-- 5. Net Yeni Baskı İhtiyacı -->
        <div class="p-3.5 bg-white border border-sky-300 bg-sky-50/30 rounded-lg shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase text-sky-800 font-semibold">5. Yeni Baskı</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-100 text-sky-800 font-bold">Matbaa</span>
          </div>
          <div class="text-xl font-bold font-mono text-sky-900 mt-1 tabular-nums">
            ${netPrint !== null ? formatNum(netPrint) : '<span class="text-xs text-amber-600 font-normal">Hesaplanıyor...</span>'}
          </div>
          <span class="text-[10px] text-sky-700 font-mono">Montaja gidecek net</span>
        </div>
      </div>

      <!-- Planlı Arz ve Termin Açığı Bilgi Çubuğu (Faz 3B Kabul Kuralı 1) -->
      ${isCalculated ? `
        <div class="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500">Karşılaştırılan Çizelge:</span>
            <span class="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold">
              ${escapeHtml(calc.selected_draft_title || 'Varsayılan Çizelge (alper_tenekeuretim)')}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-5">
            <div class="flex items-center gap-1.5" title="Dolum termininden önce üretimi biten tüpler">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span class="text-slate-600">Zamanında Karşılanan:</span>
              <strong class="text-emerald-700 tabular-nums font-bold">${formatNum(calc.total_on_time_covered)} adet</strong>
            </div>

            <div class="flex items-center gap-1.5" title="Dolum termininden sonra üretimi tamamlanan tüpler (Termin Açığı!)">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span class="text-slate-600">Geç Karşılanan (Termin Açığı):</span>
              <strong class="text-rose-700 tabular-nums font-bold">${formatNum(calc.total_delayed_covered)} adet</strong>
            </div>

            <div class="flex items-center gap-1.5" title="Mevcut üretim planında hiç yer almayan, ilave açılması gereken üretim miktarı">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span class="text-slate-600">Planda Olmayan (İlave Plan):</span>
              <strong class="text-amber-700 tabular-nums font-bold">${formatNum(calc.total_additional_planning)} adet</strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Hızlı Aksiyonlar -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">HIZLI SENARYOLAR</h3>
          <div class="flex flex-wrap gap-2">
            <button onclick="presetSoft(); state.activePage='workbench'; renderApp();" class="px-3 py-1.5 text-xs font-mono bg-sky-50 text-sky-800 hover:bg-sky-100 rounded border border-sky-300">
              SOFT 4-8-8 (52x195 Doğrulanmış Düzen)
            </button>
            <button onclick="preset6Colors(); state.activePage='workbench'; renderApp();" class="px-3 py-1.5 text-xs font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">
              6 Renk Uygun Montaj
            </button>
            <button onclick="preset7Colors(); state.activePage='workbench'; renderApp();" class="px-3 py-1.5 text-xs font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">
              7 Renk Sınır İhlali
            </button>
            <button onclick="presetUndefinedLayout(); state.activePage='workbench'; renderApp();" class="px-3 py-1.5 text-xs font-mono bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-300">
              Tanımlanmamış Düzen Örneği (45x100)
            </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">SİSTEM DURUMU</h3>
          <div class="text-xs space-y-1 font-mono text-slate-600">
            <div class="flex justify-between"><span>Veritabanı:</span><b class="text-slate-900">PostgreSQL (16-alpine) Schema v2 Hazır</b></div>
            <div class="flex justify-between"><span>Aktif Rol:</span><b class="text-sky-700 uppercase">${state.currentRole}</b></div>
            <div class="flex justify-between"><span>Son Denetim İzi:</span><b class="text-slate-800">${state.auditLogs[0]?.timestamp || '-'}</b></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Screen 2: İhtiyaç Havuzu (Faz 2D Pilot Tasarımı - Impeccable & UI UX Pro Max)
function renderDemands() {
  const searchQuery = (state.demandSearch || '').trim().toLowerCase();
  const filtered = state.demands.filter(d => {
    if (state.demandFilterSize !== 'ALL' && d.tube_size !== state.demandFilterSize) return false;
    if (state.demandFilterSurface !== 'ALL' && d.print_surface !== state.demandFilterSurface) return false;
    if (state.demandFilterStatus !== 'ALL' && d.definition_status !== state.demandFilterStatus) return false;
    if (state.demandFilterRecordKind !== 'ALL' && d.record_kind !== state.demandFilterRecordKind) return false;
    if (state.demandCalculationFilter === 'CALCULATED' && d.calculation_status !== 'CALCULATED') return false;
    if (state.demandCalculationFilter === 'UNRESOLVED' && d.calculation_status !== 'UNRESOLVED') return false;
    if (state.demandCalculationFilter === 'ERROR' && (!d.has_data_error && d.calculation_status !== 'ERROR')) return false;
    if (searchQuery) {
      const matchRef = (d.reference_no || '').toLowerCase().includes(searchQuery);
      const matchCode = (d.stock_code || '').toLowerCase().includes(searchQuery);
      const matchName = (d.stock_name || '').toLowerCase().includes(searchQuery);
      const matchSize = (d.tube_size || '').toLowerCase().includes(searchQuery);
      const matchSheet = (d.raw_sheet_desc || d.raw_sheet_name || '').toLowerCase().includes(searchQuery);
      if (!matchRef && !matchCode && !matchName && !matchSize && !matchSheet) return false;
    }
    return true;
  });

  const sizes = Array.from(new Set(state.demands.map(d => d.tube_size))).filter(Boolean).sort();
  const surfaces = Array.from(new Set(state.demands.map(d => d.print_surface))).filter(Boolean).sort();

  const totalGross = filtered.reduce((a, b) => a + (Number(b.gross_quantity) || 0), 0);
  const totalNetTube = filtered.reduce((a, b) => a + (Number(b.net_tube_quantity !== undefined ? b.net_tube_quantity : b.net_quantity) || 0), 0);
  const totalNetCutting = filtered.reduce((a, b) => a + (Number(b.net_cutting_quantity !== undefined ? b.net_cutting_quantity : b.net_quantity) || 0), 0);
  const totalNetPrint = filtered.reduce((a, b) => a + (Number(b.net_print_quantity !== undefined ? b.net_print_quantity : b.net_quantity) || 0), 0);

  // Tekil ürün bazlı ambar stok haritası (tüp, kesik, baskılı stoğu havuzda mükerrer toplanmaz)
  const uniqueTubeStockMap = new Map();
  const uniqueCutStockMap = new Map();
  const uniquePrintStockMap = new Map();

  filtered.forEach(d => {
    if (d.stock_code && !uniqueTubeStockMap.has(d.stock_code)) {
      uniqueTubeStockMap.set(d.stock_code, Number(d.available_stock || d.physical_tube_stock) || 0);
    }
    if (d.cutting_stock_code && !uniqueCutStockMap.has(d.cutting_stock_code)) {
      uniqueCutStockMap.set(d.cutting_stock_code, Number(d.available_cutting_stock) || 0);
    }
    if (d.print_stock_code && !uniquePrintStockMap.has(d.print_stock_code)) {
      uniquePrintStockMap.set(d.print_stock_code, Number(d.available_print_stock) || 0);
    }
  });

  const totalUniqueTubeStock = Array.from(uniqueTubeStockMap.values()).reduce((a, b) => a + b, 0);
  const totalUniqueCutStock = Array.from(uniqueCutStockMap.values()).reduce((a, b) => a + b, 0);
  const totalUniquePrintStock = Array.from(uniquePrintStockMap.values()).reduce((a, b) => a + b, 0);
  const uniqueItemsCount = uniqueTubeStockMap.size;

  const filteredIds = filtered.map(d => d.id);
  const allFilteredSelected = filtered.length > 0 && filtered.every(d => state.selectedDemandIds.includes(d.id));
  const selectedCount = state.selectedDemandIds.length;
  const isFiltered = Boolean(state.demandSearch || state.demandFilterSize !== 'ALL' || state.demandFilterSurface !== 'ALL' || state.demandFilterRecordKind !== 'ALL' || state.demandCalculationFilter !== 'ALL');

  return `
    <div class="space-y-4">
      <!-- Üst Bilgi ve Aksiyon Kartı -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold text-slate-900 tracking-tight uppercase">Dolum ve Satış Tüp İhtiyaçları (Faz 3B)</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
              ${filtered.length} / ${state.demands.length} Talep
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Kademeli ihtiyaç motoru: Brüt Talep → Tüp Stok Tahsisi (Net Tüp) → Kesik Stok Tahsisi (Net Kesim) → Baskılı Stok Tahsisi (Net Yeni Baskı).
          </p>
          <div class="flex items-center gap-2 mt-2">
            <button
              onclick="switchDemandSource('live_erp');"
              class="px-2.5 py-1 rounded text-xs font-sans transition-colors cursor-pointer ${
                state.demandSourceMode !== 'demo'
                  ? 'bg-sky-50 text-sky-800 border border-sky-300 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }"
            >
              Canlı ERP Talepleri (${state.liveDemands?.length || 443} Kalem)
            </button>
            <button
              onclick="switchDemandSource('demo');"
              class="px-2.5 py-1 rounded text-xs font-sans transition-colors cursor-pointer ${
                state.demandSourceMode === 'demo'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }"
            >
              Temsili Demo Senaryoları (${INITIAL_DEMANDS.length} Kalem)
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-shrink-0">
          <button
            onclick="triggerCalculateAllocations();"
            ${state.isCalculatingAllocations ? 'disabled' : ''}
            class="px-3 py-2 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Kademeli stok tahsisini baştan çalıştır"
          >
            ${state.isCalculatingAllocations ? `
              <svg class="animate-spin h-3.5 w-3.5 text-slate-700" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              <span>Hesaplanıyor...</span>
            ` : `
              <span>Tahsisi Yeniden Hesapla</span>
            `}
          </button>

          <button
            ${selectedCount > 0 ? `onclick="transferSelectedDemandsToWorkbench();"` : 'disabled'}
            class="px-3.5 py-2 text-xs font-semibold rounded transition-colors flex items-center gap-2 shadow-xs ${
              selectedCount > 0
                ? 'bg-sky-700 hover:bg-sky-800 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }"
            title="${selectedCount > 0 ? 'Doğrulanmış net baskı ihtiyacı olan seçili talepleri montaj masasına aktar' : 'Lütfen tablodan en az bir talep seçin'}"
          >
            ${getSvgIcon('arrow-right', 'w-4 h-4')}
            <span>Kombinasyona Aktar</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${selectedCount > 0 ? 'bg-sky-900/60 text-white' : 'bg-slate-200 text-slate-500'}">
              ${selectedCount}
            </span>
          </button>

          <button
            disabled
            title="Faz 5A: Tek Makine Çizelgeleme Entegrasyonu (Gelecek Aşama)"
            class="px-3.5 py-2 text-xs font-medium rounded bg-slate-50 text-slate-400 border border-dashed border-slate-200 cursor-not-allowed flex items-center gap-1.5"
          >
            <span>Tüp Planına Aktar</span>
            <span class="text-[10px] text-slate-400 font-mono">(Faz 5A)</span>
          </button>
        </div>
      </div>

      <!-- Filtreler ve Arama Çubuğu -->
      <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Arama Kutusu -->
          <div class="relative flex-1 min-w-[240px]">
            <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              ${getSvgIcon('search', 'w-4 h-4')}
            </span>
            <input
              type="text"
              placeholder="Stok kodu, ürün adı veya sipariş no ile ara..."
              value="${escapeHtml(state.demandSearch || '')}"
              oninput="state.demandSearch = this.value; renderApp();"
              class="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded focus:outline-none focus:border-sky-500 text-slate-900 font-sans transition-colors"
            />
            ${state.demandSearch ? `
              <button onclick="state.demandSearch=''; renderApp();" class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600">
                ${getSvgIcon('x', 'w-3.5 h-3.5')}
              </button>
            ` : ''}
          </div>

          <!-- Ebat Filtresi -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-500 font-medium">Ebat:</span>
            <select
              onchange="state.demandFilterSize = this.value; renderApp();"
              class="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Tümü (${state.demands.length})</option>
              ${sizes.map(s => {
                const count = state.demands.filter(d => d.tube_size === s).length;
                return `<option value="${s}" ${state.demandFilterSize === s ? 'selected' : ''}>${s} (${count})</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Zemin Filtresi -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-500 font-medium">Zemin:</span>
            <select
              onchange="state.demandFilterSurface = this.value; renderApp();"
              class="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Tümü</option>
              ${surfaces.map(s => `
                <option value="${s}" ${state.demandFilterSurface === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </div>

          <!-- Hesap Durumu Filtresi (Faz 3B) -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-500 font-medium">Hesap Durumu:</span>
            <select
              onchange="state.demandCalculationFilter = this.value; renderApp();"
              class="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-sky-500"
            >
              <option value="ALL" ${state.demandCalculationFilter === 'ALL' ? 'selected' : ''}>Tümü (${state.demands.length})</option>
              <option value="CALCULATED" ${state.demandCalculationFilter === 'CALCULATED' ? 'selected' : ''}>Hesaplandı</option>
              <option value="UNRESOLVED" ${state.demandCalculationFilter === 'UNRESOLVED' ? 'selected' : ''}>Çözümlenemedi</option>
              <option value="ERROR" ${state.demandCalculationFilter === 'ERROR' ? 'selected' : ''}>Veri Hatası</option>
            </select>
          </div>

          <!-- Kayıt Türü Filtresi -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-500 font-medium">Kayıt Türü:</span>
            <select
              onchange="state.demandFilterRecordKind = this.value; renderApp();"
              class="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-sky-500"
            >
              <option value="ALL" ${state.demandFilterRecordKind === 'ALL' ? 'selected' : ''}>Tümü</option>
              <option value="live_erp_sync" ${state.demandFilterRecordKind === 'live_erp_sync' ? 'selected' : ''}>Kaynak Veri (ERP)</option>
              <option value="synthetic_demo" ${state.demandFilterRecordKind === 'synthetic_demo' ? 'selected' : ''}>Demo Senaryo</option>
            </select>
          </div>
        </div>

        <!-- Seçim Durumu ve Sayaç Çubuğu -->
        <div class="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600 gap-2">
          <div class="flex items-center gap-3">
            <div>
              <span class="font-semibold text-slate-900">${selectedCount}</span> / ${state.demands.length} satır seçili
              ${filtered.length !== state.demands.length ? `<span class="text-slate-400 font-mono text-[11px]">(${filtered.length} filtrelendi)</span>` : ''}
            </div>
            <div class="h-3 w-px bg-slate-200"></div>
            <button
              onclick="toggleSelectAllDemands(!${allFilteredSelected}, ${JSON.stringify(filteredIds).replace(/"/g, '&quot;')});"
              class="text-sky-700 hover:text-sky-900 font-medium transition-colors cursor-pointer"
            >
              ${allFilteredSelected ? 'Filtrelenenlerin Seçimini Kaldır' : 'Filtrelenenleri Seç'}
            </button>
            ${selectedCount > 0 ? `
              <button
                onclick="state.selectedDemandIds=[]; renderApp();"
                class="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Seçimi Temizle
              </button>
            ` : ''}
          </div>

          <div class="flex items-center gap-3">
            ${isFiltered ? `
              <button
                onclick="resetDemandFilters();"
                class="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                ${getSvgIcon('x', 'w-3.5 h-3.5')}
                <span>Filtreleri Temizle</span>
              </button>
            ` : ''}
            <div class="text-[11px] font-mono text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Brüt: <strong class="text-slate-800 tabular-nums">${formatNum(totalGross)}</strong></span>
              <span>• Tüp Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(totalUniqueTubeStock)}</strong></span>
              <span>• Net Tüp: <strong class="text-blue-700 tabular-nums">${formatNum(totalNetTube)}</strong></span>
              <span>• Kesik Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(totalUniqueCutStock)}</strong></span>
              <span>• Net Kesim: <strong class="text-amber-700 tabular-nums">${formatNum(totalNetCutting)}</strong></span>
              <span>• Baskılı Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(totalUniquePrintStock)}</strong></span>
              <span>• Yeni Baskı: <strong class="text-sky-900 tabular-nums font-bold">${formatNum(totalNetPrint)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tablo Konteyneri -->
      <div class="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div class="overflow-x-auto max-h-[calc(100vh-270px)]">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold tracking-wider text-[11px] uppercase select-none">
              <tr>
                <th class="py-2 px-2.5 w-9 text-center">
                  <input
                    type="checkbox"
                    ${allFilteredSelected ? 'checked' : ''}
                    onchange="toggleSelectAllDemands(this.checked, ${JSON.stringify(filteredIds).replace(/"/g, '&quot;')});"
                    class="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </th>
                <th class="py-2 px-2.5 min-w-[110px]">Sipariş No</th>
                <th class="py-2 px-2.5 min-w-[220px]">Tüp Adı & Stok Kodu</th>
                <th class="py-2 px-2 min-w-[60px]">Ebat</th>
                <th class="py-2 px-2.5 text-right min-w-[80px]">
                  <div>Brüt Talep</div>
                  <div class="text-[9px] text-slate-400 font-normal lowercase tracking-normal">dolum ihtiyacı</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[90px]">
                  <div>Tüp Stok/Tahsis</div>
                  <div class="text-[9px] text-slate-400 font-normal lowercase tracking-normal">fiziksel / tahsis</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[80px]">
                  <div>Net Tüp</div>
                  <div class="text-[9px] text-blue-700 font-normal lowercase tracking-normal">tüp üretimi</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[110px]">
                  <div>Kesik Stok</div>
                  <div class="text-[9px] text-slate-400 font-normal lowercase tracking-normal">kod / tahsis / stok</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[80px]">
                  <div>Net Kesim</div>
                  <div class="text-[9px] text-amber-700 font-normal lowercase tracking-normal">kesik sonrası</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[110px]">
                  <div>Baskılı Stok</div>
                  <div class="text-[9px] text-slate-400 font-normal lowercase tracking-normal">kod / tahsis / stok</div>
                </th>
                <th class="py-2 px-2.5 text-right min-w-[85px]">
                  <div>Yeni Baskı</div>
                  <div class="text-[9px] text-sky-800 font-bold lowercase tracking-normal">baskı montajına</div>
                </th>
                <th class="py-2 px-2 text-center min-w-[65px]">Zemin</th>
                <th class="py-2 px-2 text-center min-w-[80px]">İç Kaplama</th>
                <th class="py-2 px-2.5 min-w-[110px]">Renkler</th>
                <th class="py-2 px-2 text-center min-w-[85px]">Hesap Durumu</th>
                <th class="py-2 px-2 text-center min-w-[55px]">Detay</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="16" class="py-12 px-4 text-center">
                    <div class="max-w-sm mx-auto space-y-2">
                      <div class="text-slate-400 mx-auto w-8 h-8 flex justify-center">${getSvgIcon('info', 'w-8 h-8')}</div>
                      <div class="font-medium text-slate-900 text-sm">Eşleşen talep bulunamadı</div>
                      <p class="text-slate-500 text-xs">Arama kelimesini veya seçili filtreleri değiştirerek tekrar deneyebilirsiniz.</p>
                      <div class="pt-2">
                        <button
                          onclick="resetDemandFilters();"
                          class="px-3 py-1.5 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Filtreleri Sıfırla
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ` : filtered.map(d => {
                const isSelected = state.selectedDemandIds.includes(d.id);
                const hasAlloc = d.calculation_status === 'CALCULATED';
                const netTubeVal = d.net_tube_quantity !== undefined ? d.net_tube_quantity : d.net_quantity;
                const netCutVal = d.net_cutting_quantity !== undefined ? d.net_cutting_quantity : d.net_quantity;
                const netPrintVal = d.net_print_quantity !== undefined ? d.net_print_quantity : d.net_quantity;
                const physStock = Number(d.physical_tube_stock || d.available_stock || 0);
                const allocTube = Number(d.allocated_tube_stock || 0);

                const allocCut = Number(d.allocated_cutting_stock || d.allocated_cutting_physical || 0);
                const availCut = Number(d.available_cutting_stock || 0);
                const cutUnit = d.cutting_stock_unit || 'ADET';

                const allocPrint = Number(d.allocated_print_stock || d.allocated_print_physical || 0);
                const availPrint = Number(d.available_print_stock || 0);
                const printUnit = d.print_stock_unit || 'ADET';

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-sky-50/50' : ''}">
                    <td class="py-2 px-2.5 text-center">
                      <input
                        type="checkbox"
                        ${isSelected ? 'checked' : ''}
                        onchange="toggleSelectDemand('${d.id}');"
                        class="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>
                    <td class="py-2 px-2.5 font-mono font-medium text-sky-800 text-[11px] whitespace-nowrap">
                      <button onclick="openDemandDetail('${d.id}');" class="hover:underline text-left cursor-pointer font-semibold">
                        ${d.reference_no}
                      </button>
                      ${d.is_no && d.is_no !== d.reference_no ? `<div class="text-[9px] text-slate-400 font-mono">${d.is_no}</div>` : ''}
                    </td>
                    <td class="py-2 px-2.5 min-w-[220px]">
                      <div class="font-medium text-slate-900 line-clamp-1" title="${escapeHtml(d.stock_name)}">
                        ${d.stock_name}
                      </div>
                      <div class="text-[10px] font-mono text-slate-500">${d.stock_code}</div>
                    </td>
                    <td class="py-2 px-2 font-mono text-slate-700 whitespace-nowrap">${d.tube_size}</td>
                    <td class="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      ${formatNum(d.gross_quantity)}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      ${allocTube > 0 ? `
                        <span class="text-emerald-700 font-semibold">${formatNum(allocTube)}</span>
                        <span class="text-[10px] text-slate-400 font-normal"> / ${formatNum(physStock)}</span>
                      ` : `
                        <span class="text-slate-400">0 / ${formatNum(physStock)}</span>
                      `}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-blue-900 whitespace-nowrap">
                      ${hasAlloc ? (netTubeVal === 0 ? '<span class="text-emerald-700 font-semibold">0</span>' : formatNum(netTubeVal)) : '<span class="text-slate-400 font-normal">-</span>'}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono text-xs whitespace-nowrap">
                      ${d.cutting_stock_code ? `
                        <div class="text-[10px] text-slate-700 font-medium truncate max-w-[120px] ml-auto" title="${escapeHtml(d.cutting_stock_name || d.cutting_stock_code)}">
                          ${d.cutting_stock_code}
                        </div>
                        <div class="text-[10px] tabular-nums">
                          ${allocCut > 0 ? `<span class="text-emerald-700 font-semibold">${formatNum(allocCut)}</span>` : `<span class="text-slate-400">0</span>`}
                          <span class="text-[9px] text-slate-400 font-normal"> / ${formatNum(availCut)} ${cutUnit}</span>
                        </div>
                      ` : (hasAlloc && d.calculation_status === 'UNRESOLVED' ? `<span class="text-amber-600 text-[10px] italic">Çözümlenemedi</span>` : `<span class="text-slate-400 text-[10px] italic">Reçetesiz</span>`)}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-amber-800 whitespace-nowrap">
                      ${hasAlloc ? (netTubeVal === 0 ? '<span class="text-emerald-700 font-semibold">0</span>' : (d.cutting_stock_code ? formatNum(netCutVal) : '<span class="text-slate-400 text-[10px] font-normal italic">Reçetesiz</span>')) : '<span class="text-slate-400 font-normal">-</span>'}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono text-xs whitespace-nowrap">
                      ${d.print_stock_code ? `
                        <div class="text-[10px] text-slate-700 font-medium truncate max-w-[120px] ml-auto" title="${escapeHtml(d.print_stock_name || d.print_stock_code)}">
                          ${d.print_stock_code}
                        </div>
                        <div class="text-[10px] tabular-nums">
                          ${allocPrint > 0 ? `<span class="text-emerald-700 font-semibold">${formatNum(allocPrint)}</span>` : `<span class="text-slate-400">0</span>`}
                          <span class="text-[9px] text-slate-400 font-normal"> / ${formatNum(availPrint)} ${printUnit}</span>
                        </div>
                      ` : (hasAlloc && d.calculation_status === 'UNRESOLVED' ? `<span class="text-amber-600 text-[10px] italic">Çözümlenemedi</span>` : `<span class="text-slate-400 text-[10px] italic">Reçetesiz</span>`)}
                    </td>
                    <td class="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-sky-900 whitespace-nowrap bg-sky-50/40">
                      ${hasAlloc ? (netCutVal === 0 || netTubeVal === 0 ? '<span class="text-emerald-700 font-bold">0</span>' : (d.print_stock_code ? formatNum(netPrintVal) : '<span class="text-slate-400 text-[10px] font-normal italic">Reçetesiz</span>')) : '<span class="text-slate-400 font-normal">-</span>'}
                    </td>
                    <td class="py-2 px-2 text-center whitespace-nowrap">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                        d.print_surface === 'METALİK'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }">
                        ${d.print_surface || 'BELİRTİLMEMİŞ'}
                      </span>
                    </td>
                    <td class="py-2 px-2 text-center whitespace-nowrap">
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        d.inside_coating === 'GOLD'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }">
                        ${d.inside_coating || 'STANDART'}
                      </span>
                    </td>
                    <td class="py-2 px-2.5">
                      <div class="flex flex-wrap gap-1">
                        ${(Array.isArray(d.colors) ? d.colors : []).map(renderColorChip).join('')}
                      </div>
                    </td>
                    <td class="py-2 px-2 text-center whitespace-nowrap">
                      ${d.has_data_error ? `
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-800 border border-rose-200" title="${escapeHtml(d.data_error_message || 'Veri hatası')}">
                          VERİ HATASI
                        </span>
                      ` : d.calculation_status === 'CALCULATED' ? `
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          HESAPLANDI
                        </span>
                      ` : d.calculation_status === 'UNRESOLVED' ? `
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-800 border border-amber-200" title="${escapeHtml(d.unresolved_reason || '')}">
                          ÇÖZÜLEMEDİ
                        </span>
                      ` : `
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                          BEKLİYOR
                        </span>
                      `}
                    </td>
                    <td class="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        onclick="openDemandDetail('${d.id}');"
                        class="px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded border border-slate-200 transition-colors cursor-pointer"
                        title="4 seviyeli kademeli netleme zincirini ve üretim planı açığını görüntüle"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slide-Over Detay Çekmecesi -->
      ${state.selectedDemandDetailId ? renderDemandDetailDrawer() : ''}
    </div>
  `;
}

function renderDemandDetailDrawer() {
  const d = state.demands.find(item => item.id === state.selectedDemandDetailId);
  if (!d) return '';

  const hasAlloc = d.calculation_status === 'CALCULATED';
  const netTubeVal = d.net_tube_quantity !== undefined ? d.net_tube_quantity : d.net_quantity;
  const netCutVal = d.net_cutting_quantity !== undefined ? d.net_cutting_quantity : d.net_quantity;
  const netPrintVal = d.net_print_quantity !== undefined ? d.net_print_quantity : d.net_quantity;

  const physTubeStock = Number(d.physical_tube_stock || d.available_stock || 0);
  const allocTube = Number(d.allocated_tube_stock || 0);
  const tubePool = Number(d.remaining_tube_stock_pool || 0);

  const availCutStock = Number(d.available_cutting_stock || 0);
  const allocCut = Number(d.allocated_cutting_stock || 0);
  const cutPool = Number(d.remaining_cutting_stock_pool || 0);

  const availPrintStock = Number(d.available_print_stock || 0);
  const allocPrint = Number(d.allocated_print_stock || 0);
  const printPool = Number(d.remaining_print_stock_pool || 0);

  const availSheetStock = Number(d.available_raw_sheet_stock || 0);

  return `
    <div class="fixed inset-0 z-50 overflow-hidden flex justify-end" style="background-color: rgba(15, 23, 42, 0.35);">
      <div class="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
        <!-- Drawer Header -->
        <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-1 rounded border border-sky-200">
              ${d.reference_no}
            </span>
            ${d.is_no && d.is_no !== d.reference_no ? `
              <span class="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                ${d.is_no}
              </span>
            ` : ''}
            <span class="text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
              d.record_kind === 'live_erp_sync' || d.record_kind === 'source_transcription'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }">
              ${d.record_kind === 'synthetic_demo' ? 'DEMO SENARYO' : 'ERP KAYNAK'}
            </span>
          </div>

          <button
            onclick="closeDemandDetail();"
            class="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title="Kapat"
          >
            ${getSvgIcon('x', 'w-5 h-5')}
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="p-5 flex-1 overflow-y-auto space-y-5">
          <!-- Ürün Başlığı ve Stok Kodu -->
          <div>
            <div class="text-[10px] font-mono uppercase text-slate-400">Ürün Adı & Stok Tanımı</div>
            <h3 class="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
              ${escapeHtml(d.stock_name)}
            </h3>
            <div class="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                Tüp Kodu: <strong class="text-slate-900">${d.stock_code}</strong>
              </span>
              ${d.dolum_mamul_kodu ? `
                <span class="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 text-[11px]" title="${escapeHtml(d.dolum_mamul_adi || '')}">
                  Dolum Mamul: ${d.dolum_mamul_kodu}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- 4 Seviyeli Kademeli Reçete ve Stok Matrisi (Faz 3B Motoru) -->
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <span class="text-xs font-bold text-slate-900 uppercase tracking-tight">Kademeli İhtiyaç & Reçete Şelalesi</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-semibold">Faz 3B Motor</span>
            </div>

            <!-- 1. Aşama: Teneke Tüp -->
            <div class="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-xs font-mono">
              <div class="flex items-center justify-between text-slate-700 font-semibold">
                <span>1. Aşama: Teneke Tüp</span>
                <span class="text-[10px] font-normal text-slate-500">${d.stock_code}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                <div>Brüt Dolum Talebi: <strong class="text-slate-900 tabular-nums">${formatNum(d.gross_quantity)} adet</strong></div>
                <div>Fiziksel Ambar Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(physTubeStock)} adet</strong></div>
                <div>Bu Talebe Tahsis: <strong class="text-emerald-700 tabular-nums">${formatNum(allocTube)} adet</strong></div>
                <div>Kalan Havuz Stoğu: <span class="text-slate-500 tabular-nums">${formatNum(tubePool)} adet</span></div>
              </div>
              <div class="flex justify-between items-center pt-1 border-t border-slate-100 font-semibold text-blue-900 bg-blue-50/50 px-2 py-0.5 rounded">
                <span>Net Tüp Üretim Hedefi:</span>
                <span class="tabular-nums font-bold">${formatNum(netTubeVal)} adet</span>
              </div>
            </div>

            <!-- 2. Aşama: Kesik Levha -->
            <div class="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-xs font-mono">
              <div class="flex items-center justify-between text-slate-700 font-semibold">
                <span>2. Aşama: Kesik Levha</span>
                <span class="text-[10px] font-normal text-slate-500">${d.cutting_stock_code || 'Reçetede Yok'}</span>
              </div>
              ${d.cutting_stock_code ? `
                <div class="text-[11px] text-slate-500 line-clamp-1" title="${escapeHtml(d.cutting_stock_name || '')}">
                  ${escapeHtml(d.cutting_stock_name || '')}
                </div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                  <div>Tüp/Kesik Oranı: <span class="text-slate-800">${d.ratio_tube_to_cutting || '1.00'}</span></div>
                  <div>Eldeki Kesik Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(availCutStock)} ${d.cutting_stock_unit || 'ADET'}</strong></div>
                  <div>Tahsis Fiziksel: <strong class="text-emerald-700 tabular-nums">${formatNum(d.allocated_cutting_physical || 0)} ${d.cutting_stock_unit || 'ADET'}</strong></div>
                  <div>Tahsis Tüp Eşdeğeri: <strong class="text-blue-700 tabular-nums">${formatNum(allocCut)} adet</strong></div>
                  <div class="col-span-2">Kalan Havuz Stoğu: <span class="text-slate-500 tabular-nums">${formatNum(cutPool)} ${d.cutting_stock_unit || 'ADET'}</span></div>
                </div>
                <div class="flex justify-between items-center pt-1 border-t border-slate-100 font-semibold text-amber-900 bg-amber-50/50 px-2 py-0.5 rounded">
                  <span>Net Kesim İhtiyacı:</span>
                  <span class="tabular-nums font-bold">${formatNum(netCutVal)} adet</span>
                </div>
              ` : `
                <div class="text-[11px] text-slate-400 italic">Bu tüp için geçerli reçetede kesik levha bileşeni bulunamadı.</div>
              `}
            </div>

            <!-- 3. Aşama: Baskılı Levha -->
            <div class="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-xs font-mono">
              <div class="flex items-center justify-between text-slate-700 font-semibold">
                <span>3. Aşama: Baskılı Levha (Montaj)</span>
                <span class="text-[10px] font-normal text-slate-500">${d.print_stock_code || 'Reçetede Yok'}</span>
              </div>
              ${d.print_stock_code ? `
                <div class="text-[11px] text-slate-500 line-clamp-1" title="${escapeHtml(d.print_stock_name || '')}">
                  ${escapeHtml(d.print_stock_name || '')}
                </div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                  <div>Kesik/Baskı Oranı: <span class="text-slate-800">${d.ratio_cutting_to_print || '1.00'}</span></div>
                  <div>Eldeki Baskılı Stok: <strong class="text-emerald-700 tabular-nums">${formatNum(availPrintStock)} ${d.print_stock_unit || 'ADET'}</strong></div>
                  <div>Tahsis Fiziksel: <strong class="text-emerald-700 tabular-nums">${formatNum(d.allocated_print_physical || 0)} ${d.print_stock_unit || 'ADET'}</strong></div>
                  <div>Tahsis Tüp Eşdeğeri: <strong class="text-blue-700 tabular-nums">${formatNum(allocPrint)} adet</strong></div>
                  <div class="col-span-2">Kalan Havuz Stoğu: <span class="text-slate-500 tabular-nums">${formatNum(printPool)} ${d.print_stock_unit || 'ADET'}</span></div>
                </div>
                <div class="flex justify-between items-center pt-1 border-t border-slate-100 font-bold text-sky-900 bg-sky-100/70 px-2 py-1 rounded">
                  <span>Net Yeni Baskı İhtiyacı:</span>
                  <span class="tabular-nums">${formatNum(netPrintVal)} adet</span>
                </div>
              ` : `
                <div class="text-[11px] text-slate-400 italic">Bu ürün için geçerli reçetede baskılı levha bileşeni bulunamadı.</div>
              `}
            </div>

            <!-- 4. Aşama: Ham Levha -->
            <div class="p-2.5 bg-white border border-slate-200 rounded space-y-1 text-xs font-mono">
              <div class="flex items-center justify-between text-slate-700 font-semibold">
                <span>4. Aşama: Ham Levha İlişkisi</span>
                <span class="text-[10px] font-normal text-slate-500">${d.raw_sheet_code || 'Tanımsız'}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                <div>Levha Kapasitesi: <strong class="text-slate-800">${d.raw_sheet_capacity ? `${d.raw_sheet_capacity} adet/levha` : 'Bilinmiyor'}</strong></div>
                <div>Tahmini Ham Levha: <strong class="text-slate-900">${d.estimated_raw_sheets ? `${formatNum(d.estimated_raw_sheets)} levha` : '-'}</strong></div>
                <div>Eldeki Ham Stok: <span class="text-slate-700 tabular-nums">${formatNum(availSheetStock)} levha</span></div>
                <div class="col-span-2 text-[10px] text-slate-400 italic pt-1">
                  * Ham levha stoğu yeni baskı ihtiyacını azaltmaz; satın alma gereksinimine etki eder.
                </div>
              </div>
            </div>
          </div>

          <!-- Mevcut Tüp Üretim Planı ve Termin Açığı ([alper_tenekeuretim]) -->
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800 uppercase tracking-tight">Mevcut Üretim Planı ve Termin Durumu</span>
              <span class="text-[10px] font-mono text-slate-500">[alper_tenekeuretim]</span>
            </div>

            <div class="grid grid-cols-3 gap-2 font-mono">
              <div class="p-2 bg-white border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400">Zamanında Karşılanan</div>
                <div class="font-bold text-emerald-700 mt-0.5 tabular-nums">${formatNum(d.on_time_covered_quantity || 0)} adet</div>
              </div>
              <div class="p-2 bg-white border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400">Geç (Termin Açığı)</div>
                <div class="font-bold ${Number(d.delayed_covered_quantity || 0) > 0 ? 'text-rose-700' : 'text-slate-600'} mt-0.5 tabular-nums">
                  ${formatNum(d.delayed_covered_quantity || 0)} adet
                </div>
              </div>
              <div class="p-2 bg-white border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400">İlave Planlanması Gereken</div>
                <div class="font-bold ${Number(d.additional_planning_needed || 0) > 0 ? 'text-amber-700' : 'text-slate-600'} mt-0.5 tabular-nums">
                  ${formatNum(d.additional_planning_needed || 0)} adet
                </div>
              </div>
            </div>

            <div class="p-2 bg-white border border-slate-200 rounded space-y-1 font-mono text-[11px]">
              <div class="flex justify-between">
                <span class="text-slate-500">Dolum Termin Tarihi:</span>
                <strong class="text-slate-800">${d.due_date ? String(d.due_date).substring(0, 10) : 'Belirtilmemiş'}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Plan En Erken Bitiş:</span>
                <strong class="text-slate-800">${d.plan_earliest_finish ? String(d.plan_earliest_finish).substring(0, 10) : 'Plana Alınmamış'}</strong>
              </div>
              ${d.full_coverage_date ? `
                <div class="flex justify-between">
                  <span class="text-slate-500">Tam Karşılanma Tarihi:</span>
                  <strong class="${Number(d.delayed_covered_quantity || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}">${String(d.full_coverage_date).substring(0, 10)}</strong>
                </div>
              ` : ''}
            </div>

            ${Number(d.delayed_covered_quantity || 0) > 0 ? `
              <div class="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs font-semibold flex items-center gap-2">
                <span class="text-rose-600 text-sm">⚠️</span>
                <span>Termin Açığı: Üretim planından ${formatNum(d.delayed_covered_quantity)} adet tüp dolum termininden sonra tamamlanmaktadır (${d.delay_days} gün gecikmeli)!</span>
              </div>
            ` : (d.is_schedule_delayed ? `
              <div class="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs font-semibold flex items-center gap-2">
                <span class="text-rose-600 text-sm">⚠️</span>
                <span>Termin Açığı: Üretim planı dolum termininden ${d.delay_days} gün sonraya kalmaktadır!</span>
              </div>
            ` : '')}
          </div>

          <!-- Teknik Özellikler Grid -->
          <div class="space-y-2.5">
            <div class="text-xs font-semibold text-slate-800">Teknik Tanım ve Baskı Parametreleri</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400 font-mono uppercase">Ebat (Çap x Boy)</div>
                <div class="font-semibold text-slate-800 mt-0.5 font-mono">${d.tube_size}</div>
                <div class="text-[10px] text-slate-500 font-mono">Çap: ${d.diameter_mm || 0} mm • Boy: ${d.height_mm || 0} mm</div>
              </div>

              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400 font-mono uppercase">Zemin Türü</div>
                <div class="font-semibold text-slate-800 mt-0.5 font-mono">${d.print_surface || 'BELİRTİLMEMİŞ'}</div>
                <div class="text-[10px] text-slate-500">Baskı alt yüzeyi</div>
              </div>

              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400 font-mono uppercase">İç Kaplama</div>
                <div class="font-semibold text-slate-800 mt-0.5 font-mono">${d.inside_coating || 'BELİRTİLMEMİŞ'}</div>
                <div class="text-[10px] text-slate-500">Kutu içi lak/koruma</div>
              </div>

              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-400 font-mono uppercase">Vernik / Dış Lak</div>
                <div class="font-semibold text-slate-800 mt-0.5 font-mono">${d.varnish || 'BELİRTİLMEMİŞ'} / ${d.lacquer || 'BELİRTİLMEMİŞ'}</div>
                <div class="text-[10px] text-slate-500">Yüzey koruma ve parlaklık</div>
              </div>
            </div>
          </div>

          <!-- Renkler -->
          <div class="space-y-2">
            <div class="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Baskı Renkleri (${(Array.isArray(d.colors) ? d.colors : []).length} Renk)</span>
              <span class="text-[10px] font-mono text-slate-400">Maks. 6 Renk Sınırı</span>
            </div>
            <div class="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded">
              ${(Array.isArray(d.colors) ? d.colors : []).map(c => `
                <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1 shadow-2xs">
                  ${renderColorChip(c)}
                  <span class="text-xs font-mono font-medium text-slate-700">${c}</span>
                </div>
              `).join('')}
              ${(!d.colors || d.colors.length === 0) ? `
                <span class="text-xs text-slate-400 italic">Tanımlı renk kaydı bulunmuyor.</span>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
          ${(Number(netPrintVal) > 0) ? `
            <button
              onclick="addDemandToWorkbenchWithQuantity(state.demands.find(i=>i.id==='${d.id}'), ${netPrintVal}); state.activePage='workbench'; closeDemandDetail();"
              class="flex-1 py-2 px-3 text-xs font-semibold rounded bg-sky-700 hover:bg-sky-800 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              ${getSvgIcon('arrow-right', 'w-4 h-4')}
              <span>Bu Ürünü Kombinasyona Aktar (${formatNum(netPrintVal)} Adet Yeni Baskı)</span>
            </button>
          ` : `
            <div class="flex-1 py-2 px-3 text-xs rounded bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center gap-1.5 cursor-not-allowed">
              ${getSvgIcon('check', 'w-3.5 h-3.5 text-emerald-600')}
              <span>Stok Yeterli (Yeni Baskı İhtiyacı: 0)</span>
            </div>
          `}
          <button
            onclick="closeDemandDetail();"
            class="py-2 px-4 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MATBAA YERLEŞİM KURALLARI ÇÖZÜMLEME VE DOĞRULAMA MOTORU
// ============================================================================

function parseTubeDimensions(tubeSize) {
  const parts = (tubeSize || '').toLowerCase().replace('çap','').replace('boy','').split('x');
  const d = parseInt(parts[0], 10) || 0;
  const h = parseInt(parts[1], 10) || 0;
  return { diameter: d, height: h };
}

function resolvePrintingRule(tubeSize, diameterParam, heightParam, rules) {
  const activeRules = (rules || state.printingPressRules || INITIAL_PRINTING_PRESS_RULES)
    .filter(r => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  const parsed = parseTubeDimensions(tubeSize);
  const d = (diameterParam != null && diameterParam > 0) ? diameterParam : parsed.diameter;
  const h = (heightParam != null && heightParam > 0) ? heightParam : parsed.height;

  // 1. Ebat tam eşleşmesi (örn: '45x100' veya '52x105')
  const exactSize = activeRules.find(r => r.applies_to_tube_size && r.applies_to_tube_size.toLowerCase() === (tubeSize || '').toLowerCase());
  if (exactSize) return { rule: exactSize, isException: exactSize.rule_type === 'SAME_VARIANT_PER_ROW' };

  // 2. Çap x Boy tam eşleşmesi
  const exactDim = activeRules.find(r => r.applies_to_diameter === d && r.applies_to_height === h);
  if (exactDim) return { rule: exactDim, isException: exactDim.rule_type === 'SAME_VARIANT_PER_ROW' };

  // 3. Yalnız Çap eşleşmesi (örn: Çap 65 mm tüm kutular)
  const diamMatch = activeRules.find(r => {
    if (r.applies_to_diameter === d && (r.applies_to_height == null || r.applies_to_height === 0)) return true;
    if (r.applies_to_tube_size === `${d}x*` || (d === 65 && r.applies_to_tube_size === '65x*')) return true;
    return false;
  });
  if (diamMatch) return { rule: diamMatch, isException: diamMatch.rule_type === 'SAME_VARIANT_PER_ROW' };

  // 4. Varsayılan kural (DEFAULT)
  const def = activeRules.find(r => r.applies_to_tube_size === 'DEFAULT') || activeRules[activeRules.length - 1] || INITIAL_PRINTING_PRESS_RULES[3];
  return { rule: def, isException: def.rule_type === 'SAME_VARIANT_PER_ROW' };
}

function validateAndArrangePrintingGrid(layout, items, rule) {
  const rows = layout.rows;
  const cols = layout.cols;
  const isColRule = rule.rule_type === 'SAME_VARIANT_PER_COLUMN';
  const violationMessages = [];

  // 1. Izgara Matrisi Başlat
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const rowArr = [];
    for (let c = 0; c < cols; c++) {
      rowArr.push({
        rowIndex: r,
        colIndex: c,
        slotIndex: r * cols + c,
        productId: null,
        stockCode: null,
        stockName: null,
        variantKey: null,
        paletteIndex: 0,
        repeatIndex: 0,
        isViolated: false
      });
    }
    grid.push(rowArr);
  }

  // 2. Kural Yönüne Göre Doldurma:
  // SAME_VARIANT_PER_COLUMN -> Sütun sütun doldur (Col 0, Col 1, Col 2...)
  // SAME_VARIANT_PER_ROW -> Satır satır doldur (Row 0, Row 1, Row 2...)
  if (isColRule) {
    let curCol = 0, curRow = 0;
    items.forEach((item, itemIdx) => {
      const pid = item.productId || item.product_id || item.stockCode || `P-${itemIdx}`;
      const scode = item.stockCode || item.stock_code || pid;
      const sname = item.stockName || item.stock_name || scode;
      const reps = Number(item.repeats ?? item.repeatsPerSheet ?? 0);

      for (let rep = 0; rep < reps; rep++) {
        if (curCol < cols && curRow < rows) {
          const cell = grid[curRow][curCol];
          cell.productId = pid;
          cell.stockCode = scode;
          cell.stockName = sname;
          cell.variantKey = pid; // Kesin çeşit kimliği
          cell.paletteIndex = itemIdx;
          cell.repeatIndex = rep + 1;

          curRow++;
          if (curRow >= rows) {
            curRow = 0;
            curCol++;
          }
        }
      }
    });
  } else {
    // SAME_VARIANT_PER_ROW -> Satır satır doldur
    let curRow = 0, curCol = 0;
    items.forEach((item, itemIdx) => {
      const pid = item.productId || item.product_id || item.stockCode || `P-${itemIdx}`;
      const scode = item.stockCode || item.stock_code || pid;
      const sname = item.stockName || item.stock_name || scode;
      const reps = Number(item.repeats ?? item.repeatsPerSheet ?? 0);

      for (let rep = 0; rep < reps; rep++) {
        if (curRow < rows && curCol < cols) {
          const cell = grid[curRow][curCol];
          cell.productId = pid;
          cell.stockCode = scode;
          cell.stockName = sname;
          cell.variantKey = pid; // Kesin çeşit kimliği
          cell.paletteIndex = itemIdx;
          cell.repeatIndex = rep + 1;

          curCol++;
          if (curCol >= cols) {
            curCol = 0;
            curRow++;
          }
        }
      }
    });
  }

  // 3. Kural Doğrulama: Satır veya Sütun Eşitliğini variantKey üzerinden incele
  const violatedCols = [];
  const violatedRows = [];
  let homogeneousCols = 0;
  let homogeneousRows = 0;

  if (isColRule) {
    for (let c = 0; c < cols; c++) {
      const variantsInCol = new Set();
      const namesInCol = new Set();
      for (let r = 0; r < rows; r++) {
        const v = grid[r][c].variantKey;
        if (v) {
          variantsInCol.add(v);
          if (grid[r][c].stockName) namesInCol.add(grid[r][c].stockName);
        }
      }

      if (variantsInCol.size > 1) {
        violatedCols.push(c);
        for (let r = 0; r < rows; r++) {
          grid[r][c].isViolated = true;
          grid[r][c].violationMessage = `Sütun ${c + 1}'de karışık çeşit: ${Array.from(namesInCol).join(', ')}`;
        }
        violationMessages.push(`Sütun ${c + 1} Kural İhlali: Farklı ürün çeşitleri (${Array.from(namesInCol).join(', ')}) aynı sütuna karışmış! Sütun bazında tek çeşit kuralı (${rule.rule_type}) gereği her sütun tek bir çeşitten oluşmalıdır.`);
      } else {
        homogeneousCols++;
      }
    }
  } else {
    // Row rule
    for (let r = 0; r < rows; r++) {
      const variantsInRow = new Set();
      const namesInRow = new Set();
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c].variantKey;
        if (v) {
          variantsInRow.add(v);
          if (grid[r][c].stockName) namesInRow.add(grid[r][c].stockName);
        }
      }

      if (variantsInRow.size > 1) {
        violatedRows.push(r);
        for (let c = 0; c < cols; c++) {
          grid[r][c].isViolated = true;
          grid[r][c].violationMessage = `Satır ${r + 1}'de karışık çeşit: ${Array.from(namesInRow).join(', ')}`;
        }
        violationMessages.push(`Satır ${r + 1} Kural İhlali: Farklı ürün çeşitleri (${Array.from(namesInRow).join(', ')}) aynı satıra karışmış! Satır bazında tek çeşit kuralı (${rule.rule_type}) gereği her satır tek bir çeşitten oluşmalıdır.`);
      } else {
        homogeneousRows++;
      }
    }
  }

  const isValid = isColRule ? (violatedCols.length === 0) : (violatedRows.length === 0);

  return {
    ruleApplied: rule,
    isValid,
    ruleType: rule.rule_type,
    isException: rule.rule_type === 'SAME_VARIANT_PER_ROW',
    homogeneousCols,
    homogeneousRows,
    totalRows: rows,
    totalCols: cols,
    violatedCols,
    violatedRows,
    violationMessages,
    grid
  };
}

function togglePrintingRule(ruleId) {
  state.printingPressRules = state.printingPressRules.map(r => {
    if (r.id === ruleId) {
      const updated = { ...r, is_active: !r.is_active };
      logAudit('printing_press_rule', r.id, 'update', `Matbaa kuralı aktifliği değiştirildi: ${r.code} (${updated.is_active ? 'AKTİF' : 'PASİF'})`);
      return updated;
    }
    return r;
  });
  localStorage.setItem('tp_printing_rules_v2', JSON.stringify(state.printingPressRules));
  renderApp();
}

function changeRulePriority(ruleId, delta) {
  const rule = state.printingPressRules.find(r => r.id === ruleId);
  if (!rule) return;
  const newPriority = Math.max(1, (rule.priority || 100) + delta);
  rule.priority = newPriority;
  state.printingPressRules.sort((a, b) => a.priority - b.priority);
  localStorage.setItem('tp_printing_rules_v2', JSON.stringify(state.printingPressRules));
  logAudit('printing_press_rule', rule.id, 'update', `Kural önceliği güncellendi: ${rule.code} -> Öncelik ${newPriority}`);
  renderApp();
}

function resetPrintingRulesToDefault() {
  if (confirm('Tüm matbaa yerleşim kurallarını fabrika varsayılanına sıfırlamak istiyor musunuz?')) {
    state.printingPressRules = JSON.parse(JSON.stringify(INITIAL_PRINTING_PRESS_RULES));
    localStorage.setItem('tp_printing_rules_v2', JSON.stringify(state.printingPressRules));
    logAudit('printing_press_rule', 'ALL', 'reset', 'Matbaa yerleşim kuralları fabrika varsayılanına sıfırlandı.');
    renderApp();
  }
}

function openPrintingRuleModal(ruleId = null) {
  if (ruleId) {
    const r = state.printingPressRules.find(x => x.id === ruleId);
    state.editingPrintingRule = r ? JSON.parse(JSON.stringify(r)) : null;
  } else {
    state.editingPrintingRule = {
      id: 'RULE-PRINT-' + Date.now(),
      code: 'KRL-MAT-' + String(state.printingPressRules.length + 1).padStart(2, '0'),
      name: 'Yeni Yerleşim Kuralı',
      rule_type: 'SAME_VARIANT_PER_ROW',
      applies_to_diameter: null,
      applies_to_height: null,
      applies_to_tube_size: '',
      priority: 25,
      is_active: true,
      description: '',
      is_system_default: false
    };
  }
  state.isPrintingRuleModalOpen = true;
  renderApp();
}

function closePrintingRuleModal() {
  state.isPrintingRuleModalOpen = false;
  state.editingPrintingRule = null;
  renderApp();
}

function savePrintingRuleForm() {
  const rule = state.editingPrintingRule;
  if (!rule || !rule.code || !rule.name || !rule.rule_type) {
    alert('Lütfen kural kodu, kural adı ve kural tipini eksiksiz giriniz.');
    return;
  }
  const idx = state.printingPressRules.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    state.printingPressRules[idx] = rule;
    logAudit('printing_press_rule', rule.id, 'update', `Matbaa kuralı güncellendi: ${rule.code} - ${rule.name}`);
  } else {
    state.printingPressRules.push(rule);
    logAudit('printing_press_rule', rule.id, 'create', `Yeni matbaa kuralı eklendi: ${rule.code} - ${rule.name}`);
  }
  state.printingPressRules.sort((a, b) => a.priority - b.priority);
  localStorage.setItem('tp_printing_rules_v2', JSON.stringify(state.printingPressRules));
  closePrintingRuleModal();
}

function deletePrintingRule(ruleId) {
  const rule = state.printingPressRules.find(r => r.id === ruleId);
  if (!rule) return;
  if (rule.is_system_default) {
    if (!confirm(`"${rule.name}" fabrika varsayılan kuralıdır. Silmek yerine pasifleştirmeniz önerilir. Yine de silinsin mi?`)) {
      return;
    }
  } else {
    if (!confirm(`"${rule.name}" kuralını silmek istediğinize emin misiniz?`)) {
      return;
    }
  }
  state.printingPressRules = state.printingPressRules.filter(r => r.id !== ruleId);
  localStorage.setItem('tp_printing_rules_v2', JSON.stringify(state.printingPressRules));
  logAudit('printing_press_rule', ruleId, 'delete', `Matbaa kuralı silindi: ${rule.code}`);
  renderApp();
}

// ----------------------------------------------------------------------------
// PARAMETRİK LAK VE KOMBİNASYON KURALLARI MOTORU (Client Engine)
// ----------------------------------------------------------------------------
function normalizeLacquerStatus(val) {
  if (!val) return 'BILINMIYOR';
  const str = String(val).trim().toUpperCase();
  if (str.startsWith('LAKLI')) return 'LAKLI';
  if (str.startsWith('LAKSIZ')) return 'LAKSIZ';
  return 'BILINMIYOR';
}

function doesRuleApplyToProduct(rule, product) {
  if (rule.target_type === 'GLOBAL') return true;
  const pCode = product.stockCode || product.stock_code || product.productId || '';
  if (rule.target_type === 'PRODUCT') {
    return !!(rule.target_product_code && rule.target_product_code === pCode);
  }
  if (rule.target_type === 'PRODUCT_GROUP') {
    const group = product.productGroup || product.customer_or_brand || '';
    return !!(rule.target_product_group && group && rule.target_product_group.toLowerCase() === group.toLowerCase());
  }
  if (rule.target_type === 'TUBE_SIZE') {
    const size = product.tubeSize || product.tube_size || '';
    return !!(rule.target_tube_size && rule.target_tube_size === size);
  }
  if (rule.target_type === 'LACQUER_STATUS') {
    const st = normalizeLacquerStatus(product.lacquer);
    return !!(rule.target_lacquer_status && rule.target_lacquer_status === st);
  }
  return false;
}

function detectRuleConflicts(rules) {
  const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);
  const conflicts = [];
  const forbidMixed = activeRules.find(r => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find(r => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (forbidMixed && allowMixed) {
    conflicts.push({
      ruleACode: forbidMixed.code,
      ruleBCode: allowMixed.code,
      message: `Lak kuralı çakışması: [${forbidMixed.code}] lak karışımını yasaklarken [${allowMixed.code}] izin veriyor.`,
      resolution: `Açık yasak (${forbidMixed.code}) izin kuralından (${allowMixed.code}) önce değerlendirildi; karışım engellendi.`
    });
  }
  return conflicts;
}

function evaluateProductPairCompatibility(productA, productB, rules = state.combinationRules) {
  const codeA = productA.stockCode || productA.stock_code || productA.productId || 'A';
  const codeB = productB.stockCode || productB.stock_code || productB.productId || 'B';

  if (codeA === codeB) {
    return { isCompatible: true, reasons: [], passedRules: ['Aynı ürün çeşidi kendi içinde uyumludur.'], conflicts: [] };
  }

  const conflicts = detectRuleConflicts(rules);
  const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);
  const reasons = [];
  const passedRules = [];

  const statusA = normalizeLacquerStatus(productA.lacquer);
  const statusB = normalizeLacquerStatus(productB.lacquer);

  const hasStrictLacquerRule = activeRules.some(r => r.rule_type === 'FORBID_MIXED_LACQUER' || r.rule_type === 'ONLY_WITH_LACQUERED' || r.rule_type === 'ONLY_WITH_UNLACQUERED');
  if (hasStrictLacquerRule) {
    if (statusA === 'BILINMIYOR') {
      reasons.push(`[${productA.stockName || codeA}] lak durumu BELİRTİLMEMİŞ/BİLİNMİYOR. Güvenlik gereği otomatik laklı/laksız varsayılamaz; montaj engellendi.`);
    }
    if (statusB === 'BILINMIYOR') {
      reasons.push(`[${productB.stockName || codeB}] lak durumu BELİRTİLMEMİŞ/BİLİNMİYOR. Güvenlik gereği otomatik laklı/laksız varsayılamaz; montaj engellendi.`);
    }
  }

  const forbidMixed = activeRules.find(r => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find(r => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (statusA !== 'BILINMIYOR' && statusB !== 'BILINMIYOR') {
    if (statusA !== statusB) {
      if (forbidMixed) {
        reasons.push(`[${forbidMixed.code} - Açık Yasak] Lak Uyuşmazlığı: Biri laklı (${statusA==='LAKLI'?codeA:codeB}), diğeri laksız (${statusA==='LAKSIZ'?codeA:codeB}). Aynı levhada birleştirilemez.`);
      } else if (!allowMixed) {
        reasons.push(`Lak Uyuşmazlığı: ${codeA} (${statusA}) ile ${codeB} (${statusB}) farklı lak durumuna sahip; karışım izni yok.`);
      } else {
        passedRules.push(`[${allowMixed.code}] Lak karışım izni kuralı uygulandı.`);
      }
    } else {
      passedRules.push(`Lak uyumu sağlandı (Her iki ürün de ${statusA}).`);
    }
  }

  for (const p of [productA, productB]) {
    const soloRule = activeRules.find(r => r.rule_type === 'EXCLUSIVE_SOLO_ONLY' && doesRuleApplyToProduct(r, p));
    if (soloRule) {
      reasons.push(`[${soloRule.code} - ${soloRule.name}] Ürün (${p.stockName || p.stockCode}) özel solo montaj kuralına sahiptir; başka ürünle basılamaz.`);
    }
  }

  const evalDirected = (src, tgt) => {
    const sCode = src.stockCode || src.stock_code || src.productId || '';
    const tCode = tgt.stockCode || tgt.stock_code || tgt.productId || '';
    const tGroup = tgt.productGroup || tgt.customer_or_brand || '';

    for (const r of activeRules) {
      if (!doesRuleApplyToProduct(r, src)) continue;

      if (r.rule_type === 'FORBIDDEN_WITH_PRODUCTS') {
        if (r.param_product_codes && r.param_product_codes.includes(tCode)) {
          reasons.push(`[${r.code} - Açık Yasak] ${src.stockName || sCode} ürünü, ${tgt.stockName || tCode} ürünü ile aynı levhada basılamaz.`);
        }
      } else if (r.rule_type === 'FORBIDDEN_WITH_PRODUCT_GROUPS') {
        if (r.param_product_groups && r.param_product_groups.includes(tGroup)) {
          reasons.push(`[${r.code} - Açık Yasak] ${src.stockName || sCode} ürünü, [${tGroup}] grubu ürünlerle basılamaz.`);
        }
      } else if (r.rule_type === 'ALLOWED_ONLY_WITH_PRODUCTS') {
        if (!r.param_product_codes || !r.param_product_codes.includes(tCode)) {
          reasons.push(`[${r.code} - Kısıtlı İzin] ${src.stockName || sCode} ürünü yalnızca izinli ürünlerle basılabilir; ${tgt.stockName || tCode} izinli değil.`);
        }
      } else if (r.rule_type === 'ONLY_WITH_LACQUERED') {
        if (normalizeLacquerStatus(tgt.lacquer) !== 'LAKLI') {
          reasons.push(`[${r.code}] ${src.stockName || sCode} yalnız laklı ürünlerle basılabilir; ${tgt.stockName || tCode} laklı değildir.`);
        }
      } else if (r.rule_type === 'ONLY_WITH_UNLACQUERED') {
        if (normalizeLacquerStatus(tgt.lacquer) !== 'LAKSIZ') {
          reasons.push(`[${r.code}] ${src.stockName || sCode} yalnız laksız ürünlerle basılabilir; ${tgt.stockName || tCode} laksız değildir.`);
        }
      }
    }
  };

  evalDirected(productA, productB);
  evalDirected(productB, productA);

  return { isCompatible: reasons.length === 0, reasons, passedRules, conflicts };
}

function evaluateMultiProductCompatibility(products, rules = state.combinationRules) {
  if (products.length <= 1) {
    return { isCompatible: true, rulesEvaluated: [], conflicts: [], violationReasons: [], passedRules: ['Tek ürün kuralı sağlandı.'], unknownLacquerProducts: [] };
  }

  const conflicts = detectRuleConflicts(rules);
  const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);
  const violationReasons = [];
  const passedRules = [];
  const rulesEvaluated = [];
  const unknownLacquerProducts = [];

  for (const p of products) {
    if (normalizeLacquerStatus(p.lacquer) === 'BILINMIYOR') {
      unknownLacquerProducts.push(p.stockName || p.stockCode || 'Bilinmeyen Ürün');
    }
  }

  for (const p of products) {
    const soloRule = activeRules.find(r => r.rule_type === 'EXCLUSIVE_SOLO_ONLY' && doesRuleApplyToProduct(r, p));
    if (soloRule) {
      violationReasons.push(`[${soloRule.code} - ${soloRule.name}] Ürün [${p.stockName || p.stockCode}] solo üretim kuralına tabidir; başka ürünlerle birleştirilemez.`);
    }
  }

  const lacquerSet = new Set(products.map(p => normalizeLacquerStatus(p.lacquer)));
  const forbidMixed = activeRules.find(r => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find(r => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (lacquerSet.has('LAKLI') && lacquerSet.has('LAKSIZ')) {
    if (forbidMixed) {
      violationReasons.push(`[${forbidMixed.code}] Montajda hem LAKLI hem LAKSIZ ürünler bulunmaktadır. Açık yasak kuralı gereği aynı levhada basılamaz.`);
    } else if (!allowMixed) {
      violationReasons.push(`Montajda hem laklı hem laksız ürünler mevcuttur; lak karışım izni bulunmuyor.`);
    } else {
      passedRules.push(`[${allowMixed.code}] Lak karışım izni uyarınca onaylandı.`);
    }
  }

  if (unknownLacquerProducts.length > 0) {
    const hasStrictLacquer = activeRules.some(r => r.rule_type === 'FORBID_MIXED_LACQUER' || r.rule_type === 'ONLY_WITH_LACQUERED' || r.rule_type === 'ONLY_WITH_UNLACQUERED');
    if (hasStrictLacquer) {
      violationReasons.push(`Bilinmeyen Lak Durumu: ${unknownLacquerProducts.join(', ')} ürünlerinin lak durumu tanımsızdır. Otomatik varsayım yapılmaz; önce tanımlanmalıdır.`);
    }
  }

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const pair = evaluateProductPairCompatibility(products[i], products[j], rules);
      if (!pair.isCompatible) {
        pair.reasons.forEach(r => {
          if (!violationReasons.includes(r)) violationReasons.push(r);
        });
      }
    }
  }

  return {
    isCompatible: violationReasons.length === 0,
    rulesEvaluated,
    conflicts,
    violationReasons,
    passedRules,
    unknownLacquerProducts
  };
}

function queryCompatibleProducts(targetProduct, candidatePool = state.demands, rules = state.combinationRules) {
  return candidatePool.map(candidate => {
    const pair = evaluateProductPairCompatibility(targetProduct, candidate, rules);
    let status = 'COMPATIBLE';
    if (!pair.isCompatible) {
      if (pair.reasons.some(r => r.includes('BİLİNMİYOR') || r.includes('BELİRTİLMEMİŞ'))) {
        status = 'UNKNOWN_LACQUER';
      } else {
        status = 'FORBIDDEN';
      }
    } else if (pair.conflicts && pair.conflicts.length > 0) {
      status = 'CONFLICT';
    }
    return {
      candidate,
      isCompatible: pair.isCompatible,
      status,
      reasons: pair.reasons,
      passedRules: pair.passedRules,
      conflicts: pair.conflicts
    };
  });
}

function toggleCombinationRule(ruleId) {
  state.combinationRules = state.combinationRules.map(r => {
    if (r.id === ruleId) {
      const updated = { ...r, is_active: !r.is_active };
      logAudit('combination_rule', r.id, 'update', `Kombinasyon kuralı aktifliği değiştirildi: ${r.code} (${updated.is_active ? 'AKTİF' : 'PASİF'})`);
      return updated;
    }
    return r;
  });
  localStorage.setItem('tp_combination_rules_v2', JSON.stringify(state.combinationRules));
  renderApp();
}

function changeCombinationRulePriority(ruleId, delta) {
  const rule = state.combinationRules.find(r => r.id === ruleId);
  if (!rule) return;
  const newPriority = Math.max(1, (rule.priority || 50) + delta);
  rule.priority = newPriority;
  state.combinationRules.sort((a, b) => a.priority - b.priority);
  localStorage.setItem('tp_combination_rules_v2', JSON.stringify(state.combinationRules));
  logAudit('combination_rule', rule.id, 'update', `Kombinasyon kuralı önceliği güncellendi: ${rule.code} -> Öncelik ${newPriority}`);
  renderApp();
}

function resetCombinationRulesToDefault() {
  if (confirm('Tüm ürün kombinasyon ve lak kurallarını fabrika varsayılanına sıfırlamak istiyor musunuz?')) {
    state.combinationRules = JSON.parse(JSON.stringify(INITIAL_COMBINATION_RULES));
    localStorage.setItem('tp_combination_rules_v2', JSON.stringify(state.combinationRules));
    logAudit('combination_rule', 'ALL', 'reset', 'Kombinasyon kuralları fabrika varsayılanına sıfırlandı.');
    renderApp();
  }
}

function openCombinationRuleModal(ruleId = null) {
  if (ruleId) {
    const r = state.combinationRules.find(x => x.id === ruleId);
    state.editingCombinationRule = r ? JSON.parse(JSON.stringify(r)) : null;
  } else {
    state.editingCombinationRule = {
      id: 'RULE-KMB-' + Date.now(),
      code: 'KRL-KMB-' + String(state.combinationRules.length + 1).padStart(2, '0'),
      name: 'Yeni Kombinasyon Kuralı',
      rule_type: 'ONLY_WITH_LACQUERED',
      target_type: 'GLOBAL',
      target_product_code: '',
      target_product_group: '',
      target_tube_size: '',
      target_lacquer_status: 'LAKLI',
      param_product_codes: [],
      param_product_groups: [],
      priority: 25,
      is_active: true,
      description: '',
      is_system_default: false
    };
  }
  state.isCombinationRuleModalOpen = true;
  renderApp();
}

function closeCombinationRuleModal() {
  state.isCombinationRuleModalOpen = false;
  state.editingCombinationRule = null;
  renderApp();
}

function saveCombinationRuleForm() {
  const rule = state.editingCombinationRule;
  if (!rule || !rule.code || !rule.name || !rule.rule_type) {
    alert('Lütfen kural kodu, kural adı ve kural tipini eksiksiz giriniz.');
    return;
  }
  const idx = state.combinationRules.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    state.combinationRules[idx] = rule;
    logAudit('combination_rule', rule.id, 'update', `Kombinasyon kuralı güncellendi: ${rule.code} - ${rule.name}`);
  } else {
    state.combinationRules.push(rule);
    logAudit('combination_rule', rule.id, 'create', `Yeni kombinasyon kuralı eklendi: ${rule.code} - ${rule.name}`);
  }
  state.combinationRules.sort((a, b) => a.priority - b.priority);
  localStorage.setItem('tp_combination_rules_v2', JSON.stringify(state.combinationRules));
  closeCombinationRuleModal();
}

function deleteCombinationRule(ruleId) {
  const rule = state.combinationRules.find(r => r.id === ruleId);
  if (!rule) return;
  if (rule.is_system_default) {
    if (!confirm(`"${rule.name}" fabrika varsayılan kuralıdır. Silmek yerine pasifleştirmeniz önerilir. Yine de silinsin mi?`)) {
      return;
    }
  } else {
    if (!confirm(`"${rule.name}" kuralını silmek istediğinize emin misiniz?`)) {
      return;
    }
  }
  state.combinationRules = state.combinationRules.filter(r => r.id !== ruleId);
  localStorage.setItem('tp_combination_rules_v2', JSON.stringify(state.combinationRules));
  logAudit('combination_rule', ruleId, 'delete', `Kombinasyon kuralı silindi: ${rule.code}`);
  renderApp();
}

// Kombinasyon Hesaplayıcı Fonksiyonu (Faz 2)
function calculateCombinationState() {
  const items = state.workbenchItems;
  const activeTubeSize = items.length > 0 ? items[0].tubeSize : '52x195';
  const capObj = state.capacities.find(c => c.tube_size === activeTubeSize);
  const matchedCapacity = capObj ? capObj.units_per_sheet : 20;

  const lookup = CAPACITY_STEP_LOOKUP[activeTubeSize];
  const repeatStep = capObj?.repeat_step || lookup?.step || 0;
  const assemblyGroupCount = capObj?.assembly_group_count || lookup?.groups || 0;

  const rawSheetCode = items.length > 0 ? items[0].rawSheetCode : '500011000004-1206';
  const rawSheet = state.rawSheets.find(r => r.stock_code === rawSheetCode || r.tube_size === activeTubeSize);

  // Layout lookup
  const layout = state.sheetLayouts.find(l => l.tube_size === activeTubeSize);

  const messages = [];

  // Ebat eşitliği
  const sizeMatch = items.every(i => i.tubeSize === items[0].tubeSize);
  if (!sizeMatch) messages.push({ type: 'error', text: 'Ebat Uyuşmazlığı: Farklı ebatlardaki ürünler aynı montaja konamaz. Çap ve boy eşitliği şarttır.' });

  // Ham levha eşitliği
  const rawSheetMatch = items.every(i => i.rawSheetCode === items[0].rawSheetCode);
  if (!rawSheetMatch) messages.push({ type: 'error', text: 'Ham Levha Uyuşmazlığı: Ürünlerin tanımlı ham levhaları eşleşmiyor.' });

  // Zemin eşitliği
  const surfaceMatch = items.every(i => i.printSurface === items[0].printSurface);
  if (!surfaceMatch) messages.push({ type: 'error', text: 'Zemin Uyuşmazlığı: Farklı zeminler (Metalik ve Emaye) birlikte basılamaz.' });

  // Benzersiz renkler
  const uniqueColorSet = new Set();
  items.forEach(i => i.colors.forEach(c => uniqueColorSet.add(c.trim().toUpperCase())));
  const uniqueColors = Array.from(uniqueColorSet);
  const colorLimitSatisfied = uniqueColors.length <= state.maxColors;
  if (!colorLimitSatisfied) {
    messages.push({ type: 'error', text: `Renk Sınırı Aşıldı: Benzersiz renk sayısı ${uniqueColors.length}, sınır ${state.maxColors} renktir! (${uniqueColors.join(', ')})` });
  } else {
    messages.push({ type: 'success', text: `Renk Uygun: Toplam ${uniqueColors.length} / ${state.maxColors} benzersiz renk (${uniqueColors.join(', ')}).` });
  }

  // ÜRÜN TEKRAR ADIMI DENETİMİ (Faz 2 Kesin İş Kuralı)
  const repeatStepErrors = [];
  if (repeatStep <= 0) {
    messages.push({
      type: 'error',
      text: `Montaj Parametreleri Eksik: ${activeTubeSize} ebadı için montaj grubu sayısı ve ürün tekrar adımı parametresi tanımlanmamış.`
    });
  } else {
    items.forEach(item => {
      const r = Number(item.repeatsPerSheet) || 0;
      if (r <= 0) {
        repeatStepErrors.push({
          productId: item.productId,
          message: `${item.stockName}: Tekrar sayısı pozitif bir tam sayı olmalıdır.`
        });
      } else if (r % repeatStep !== 0) {
        repeatStepErrors.push({
          productId: item.productId,
          message: `${item.tubeSize} için ürün tekrarları ${repeatStep}’in katı olmalıdır. Girilen tekrar: ${r}.`
        });
      }
    });
  }

  const repeatStepMatch = repeatStep > 0 && repeatStepErrors.length === 0;
  if (!repeatStepMatch && repeatStep > 0) {
    repeatStepErrors.forEach(err => messages.push({ type: 'error', text: err.message }));
  } else if (repeatStepMatch) {
    messages.push({
      type: 'success',
      text: `Tekrar Adımı Uygun: Tüm ürün tekrarları ${repeatStep} tüplük grup adımının pozitif tam katıdır (${assemblyGroupCount} montaj grubu).`
    });
  }

  // Kapasite
  const totalRepeats = items.reduce((sum, i) => sum + (Number(i.repeatsPerSheet) || 0), 0);
  const remainingCapacity = matchedCapacity - totalRepeats;
  const capacitySatisfied = totalRepeats <= matchedCapacity;
  const isFullCapacity = totalRepeats === matchedCapacity;

  if (totalRepeats > matchedCapacity) {
    messages.push({ type: 'error', text: `Kapasite Aşıldı: Toplam tekrar (${totalRepeats}), levha kapasitesini (${matchedCapacity}) aşıyor! Fazlalık: ${totalRepeats - matchedCapacity} tekrar.` });
  } else if (remainingCapacity > 0) {
    messages.push({ type: 'warning', text: `Boş Kapasite: Levhada ${remainingCapacity} adet boş yuva mevcuttur (${totalRepeats}/${matchedCapacity}). Kısmi dolulukla taslak deneme yapılabilir; ancak üretime onay verilemez.` });
  } else {
    messages.push({ type: 'success', text: `Tam Kapasite: Levha kapasitesi (${matchedCapacity}/${matchedCapacity}) eksiksiz dolduruldu.` });
  }

  // Minimum levha
  const minSheetSatisfied = state.sheetCount >= state.minPrintSheets;
  if (!minSheetSatisfied) {
    messages.push({ type: 'warning', text: `Minimum Baskı Uyarısı: Girilen ${state.sheetCount} levha, minimum ${state.minPrintSheets} altındadır.` });
  }

  // Montaj Düzeni Tutarlılık Denetimi (Faz 2)
  let layoutConsistent = false;
  if (layout) {
    const layoutSlots = layout.rows * layout.cols;
    layoutConsistent = layoutSlots === matchedCapacity;
    if (!layoutConsistent) {
      messages.push({
        type: 'warning',
        text: `Düzen Uyuşmazlığı: Tanımlı montaj düzeni (${layout.rows} × ${layout.cols} = ${layoutSlots} yuva), hazır levha kapasitesi (${matchedCapacity} tüp) ile eşleşmiyor! Kapasite otomatik değiştirilmez.`
      });
    }
  }

  // MATBAA YERLEŞİM KURALI ÇÖZÜMLEME VE IZGARA DOĞRULAMASI
  const { rule: printingRule, isException: isPrintingException } = resolvePrintingRule(
    activeTubeSize,
    items[0]?.diameter_mm,
    items[0]?.height_mm,
    state.printingPressRules
  );

  let gridResult = null;
  if (layout) {
    gridResult = validateAndArrangePrintingGrid(layout, items, printingRule);
    if (!gridResult.isValid) {
      gridResult.violationMessages.forEach(msg => messages.push({ type: 'error', text: msg }));
    } else {
      messages.push({
        type: 'success',
        text: `Matbaa Yerleşim Kuralı Uygun: [${printingRule.code} - ${printingRule.name}] ${
          printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? 'Satır' : 'Sütun'
        } homojenliği tam sağlandı (${
          printingRule.rule_type === 'SAME_VARIANT_PER_ROW'
            ? `${gridResult.homogeneousRows}/${gridResult.totalRows} Satır`
            : `${gridResult.homogeneousCols}/${gridResult.totalCols} Sütun`
        }).`
      });
    }
  }

  // PARAMETRİK LAK VE ÜRÜN KOMBİNASYON KURALLARI DOĞRULAMASI
  const combinationRuleResult = evaluateMultiProductCompatibility(
    items.map(i => ({
      productId: i.productId,
      stockCode: i.stockCode,
      stockName: i.stockName,
      tubeSize: i.tubeSize,
      diameterMm: i.diameter_mm,
      heightMm: i.height_mm,
      lacquer: i.lacquer,
      printSurface: i.printSurface,
      colors: i.colors,
      repeatsPerSheet: i.repeatsPerSheet
    })),
    state.combinationRules
  );

  if (!combinationRuleResult.isCompatible) {
    combinationRuleResult.violationReasons.forEach(vr => {
      messages.push({ type: 'error', text: vr });
    });
  } else {
    combinationRuleResult.passedRules.forEach(pr => {
      messages.push({ type: 'success', text: `Kombinasyon Kuralı Uygun: ${pr}` });
    });
  }

  if (combinationRuleResult.conflicts.length > 0) {
    combinationRuleResult.conflicts.forEach(c => {
      messages.push({
        type: 'warning',
        text: `Kural Çakışması [${c.ruleACode} vs ${c.ruleBCode}]: ${c.resolution}`
      });
    });
  }

  // Genel Geçerlilik: Tüm kurallar + tekrar adımı kuralı + kapasiteyi aşmama + matbaa kuralı + kombinasyon kuralı
  const isValid = sizeMatch && rawSheetMatch && surfaceMatch && colorLimitSatisfied && capacitySatisfied && repeatStepMatch && totalRepeats > 0 && (gridResult ? gridResult.isValid : true) && combinationRuleResult.isCompatible;
  const productionApprovalReady = isValid && isFullCapacity;

  const calculatedItems = items.map(i => {
    const repeats = Number(i.repeatsPerSheet) || 0;
    const theoretical = repeats * state.sheetCount;
    const assigned_groups = (repeatStep > 0 && repeats % repeatStep === 0) ? (repeats / repeatStep) : null;
    const stepValid = repeatStep > 0 && repeats > 0 && repeats % repeatStep === 0;
    return {
      ...i,
      repeats,
      theoretical,
      difference: theoretical - i.netDemand,
      assigned_groups,
      stepValid
    };
  });

  return {
    items,
    calculatedItems,
    matchedCapacity,
    repeatStep,
    assemblyGroupCount,
    rawSheet,
    layout,
    layoutConsistent,
    totalRepeats,
    remainingCapacity,
    isFullCapacity,
    repeatStepMatch,
    repeatStepErrors,
    productionApprovalReady,
    printingRule,
    isPrintingException,
    gridResult,
    combinationRuleResult,
    uniqueColors,
    colorCount: uniqueColors.length,
    colorLimitSatisfied,
    isValid,
    messages
  };
}

// Screen 3: Kombinasyon Çalışma Alanı
function renderWorkbench() {
  const wb = calculateCombinationState();
  const rawSheet = wb.rawSheet;
  const aspectRatio = (rawSheet && rawSheet.height_mm > 0) ? (rawSheet.width_mm / rawSheet.height_mm) : 1.04;

  return `
    <div class="space-y-6">
      <!-- Toolbar & Preset Scenarios -->
      <div class="space-y-2 border-b border-slate-200 pb-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-lg font-bold text-slate-900 tracking-tight">Kombinasyon ve Baskı Masası</h1>
            <p class="text-xs text-slate-500">
              Parametrik Montaj Grubu & Tekrar Adımı Kuralı | Fiziksel levha oranına göre sabit görselleştirme
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              Ebat: ${wb.items[0]?.tubeSize || '52x195'} | Adım: ${wb.repeatStep || 'Tanımsız'} | Kapasite: ${wb.matchedCapacity}
            </span>
          </div>
        </div>

        <!-- Acceptance Scenario Presets -->
        <div class="flex flex-wrap items-center gap-1.5 pt-2">
          <span class="text-[11px] font-mono font-bold text-slate-500 mr-1">YERLEŞİM KABUL SENARYOLARI:</span>
          <button onclick="preset45x100Valid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">45×100 [6+12+30] Geçerli (Satır)</button>
          <button onclick="preset45x100Invalid();" class="px-2 py-0.5 text-[11px] font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">45×100 [5+13+30] Geçersiz</button>
          <button onclick="preset52x105Valid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">52×105 [5+15+20] Geçerli (Satır)</button>
          <button onclick="preset52x105Invalid();" class="px-2 py-0.5 text-[11px] font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">52×105 [6+14+20] Geçersiz</button>
          <button onclick="presetSoft();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">52×195 [4+8+8] Geçerli (Sütun)</button>
          <button onclick="preset52x195Invalid();" class="px-2 py-0.5 text-[11px] font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">52×195 [5+7+8] Geçersiz (Toplam 20)</button>
          <button onclick="preset52x234Valid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">52×234 [3+6+6] Geçerli</button>
          <button onclick="preset65x104Valid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">Çap 65 [8+8+16] Geçerli (Satır)</button>
          <button onclick="preset65x300Valid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">65×300 [4+8] Geçerli (Satır)</button>
          <button onclick="presetDistinctVariantsSameName();" class="px-2 py-0.5 text-[11px] font-mono bg-purple-50 text-purple-800 hover:bg-purple-100 rounded border border-purple-300">Aynı İsim / Farklı Stok Kodu</button>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="text-[11px] font-mono font-bold text-slate-500 mr-1">LAK & KOMBİNASYON SENARYOLARI:</span>
          <button onclick="presetLacquerPureLacqueredValid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">Laklı + Laklı (Geçerli)</button>
          <button onclick="presetLacquerPureUnlacqueredValid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">Laksız + Laksız (Geçerli)</button>
          <button onclick="presetLacquerMixedForbidden();" class="px-2 py-0.5 text-[11px] font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">Laklı + Laksız (Açık Yasak)</button>
          <button onclick="presetLacquerUnknownRejected();" class="px-2 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-300">Bilinmeyen Lak (Red)</button>
          <button onclick="presetForbiddenPair();" class="px-2 py-0.5 text-[11px] font-mono bg-rose-50 text-rose-800 hover:bg-rose-100 rounded border border-rose-300">Yasaklı Ürün Çifti</button>
          <button onclick="presetRuleConflictSafeResolution();" class="px-2 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-300">Kural Çakışması (Yasak Öncelikli)</button>
          <button onclick="presetExclusiveSolo();" class="px-2 py-0.5 text-[11px] font-mono bg-purple-50 text-purple-800 hover:bg-purple-100 rounded border border-purple-300">Solo Kuralı (Tek Başına)</button>
          <button onclick="presetTripleCombinationValid();" class="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-300">3'lü Uygun Kombinasyon</button>
        </div>
      </div>

      <!-- Mandatory Rule Banner -->
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
        <span class="text-amber-600 font-bold">ℹ</span>
        <div class="space-y-0.5">
          <div class="font-bold">İlke: Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir.</div>
          <div class="text-[11px] text-amber-800">
            Bir levhanın toplam tüp kapasitesini doldurmak tek başına montajı geçerli yapmaz. Her ürünün tekrar sayısı, ilgili ebadın <b>Ürün Tekrar Adımı (${wb.repeatStep || '—'})</b> değerinin pozitif tam katı olmalıdır.
            (Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı)
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 Cols -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Parameter Inputs -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-6">
              <div>
                <label class="text-[11px] font-mono text-slate-500 block">Basılacak Levha Adedi:</label>
                <div class="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value="${state.sheetCount}"
                    onchange="state.sheetCount=Math.max(1, parseInt(this.value,10)||1); renderApp();"
                    class="w-28 bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm px-2.5 py-1 rounded outline-none focus:border-sky-500"
                  />
                  <span class="text-xs text-slate-500 font-mono">Levha</span>
                </div>
              </div>

              <div>
                <label class="text-[11px] font-mono text-slate-500 block">Hazır Levha Kapasitesi:</label>
                <div class="mt-0.5">
                  <span class="bg-slate-100 border border-slate-300 text-sky-800 font-mono font-bold text-sm px-3 py-1 rounded inline-block">
                    ${wb.matchedCapacity} Tüp / Levha
                  </span>
                </div>
              </div>

              <div>
                <label class="text-[11px] font-mono text-slate-500 block">Montaj Grubu & Adım:</label>
                <div class="mt-0.5 text-xs font-mono text-slate-700">
                  ${wb.repeatStep > 0 ? `<b>${wb.assemblyGroupCount} Grup</b> × <b>${wb.repeatStep} Tekrar/Grup</b>` : '<span class="text-rose-600 font-bold">Tanımlanmamış</span>'}
                </div>
              </div>

              <div>
                <label class="text-[11px] font-mono text-slate-500 block">Bağlı Ham Levha:</label>
                <div class="mt-0.5 text-xs font-mono text-slate-700">
                  ${rawSheet ? `<b>${rawSheet.width_mm} × ${rawSheet.height_mm} mm</b> (${rawSheet.thickness_source_value} mm)` : '<span class="text-rose-600 font-bold">Tanımsız</span>'}
                </div>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-mono text-slate-500 block">Taleplerden Ekle:</label>
              <select onchange="if(this.value){addDemandToWorkbench(this.value); this.value='';}" class="mt-0.5 w-56 bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 outline-none">
                <option value="">+ İhtiyaç Havuzundan Seç...</option>
                ${state.demands.map(d => `<option value="${d.id}">${d.tube_size} | ${d.stock_name.slice(0,28)}...</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Workbench Table -->
          <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div class="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-800">
                MONTAJDAKİ ÜRÜNLER VE TEKRAR DAĞILIMI (${wb.items.length} Kalem)
              </span>
              <span class="text-[11px] font-mono text-slate-600">
                Toplam Tekrar: <b class="${wb.totalRepeats===wb.matchedCapacity?'text-emerald-700':wb.totalRepeats>wb.matchedCapacity?'text-rose-700':'text-amber-700'}">${wb.totalRepeats}</b> / ${wb.matchedCapacity}
                ${wb.repeatStep > 0 ? `(Grup Adımı: ${wb.repeatStep})` : ''}
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                    <th class="py-2.5 px-3">Ürün / Stok Kodu</th>
                    <th class="py-2.5 px-2">Ebat</th>
                    <th class="py-2.5 px-2">Zemin</th>
                    <th class="py-2.5 px-2">İç Kaplama</th>
                    <th class="py-2.5 px-2">Renkler</th>
                    <th class="py-2.5 px-2 text-right">Net Talep</th>
                    <th class="py-2.5 px-2 text-center w-36">Tekrar / Levha</th>
                    <th class="py-2.5 px-2 text-center">Grup Payı</th>
                    <th class="py-2.5 px-2 text-right">Teorik Çıktı</th>
                    <th class="py-2.5 px-2 text-right">İhtiyaç Farkı</th>
                    <th class="py-2.5 px-2 text-center w-10">Sil</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-sans">
                  ${wb.calculatedItems.map((item, idx) => {
                    const palette = PRODUCT_PALETTES[idx % PRODUCT_PALETTES.length];
                    const step = wb.repeatStep || 1;
                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-3">
                          <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full flex-shrink-0 ${palette.chip}"></span>
                            <span class="font-semibold text-slate-900 line-clamp-1">${item.stockName}</span>
                          </div>
                          <div class="text-[10px] font-mono text-slate-500 pl-5">
                            ${item.stockCode} ${item.record_kind==='synthetic_demo'?'<span class="text-amber-600">(Temsili)</span>':''}
                          </div>
                        </td>
                        <td class="py-2.5 px-2 font-mono text-slate-700">${item.tubeSize}</td>
                        <td class="py-2.5 px-2">
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${item.printSurface==='METALİK'?'bg-purple-50 text-purple-800 border border-purple-200':'bg-slate-100 text-slate-700'}">${item.printSurface}</span>
                        </td>
                        <td class="py-2.5 px-2">
                          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${item.inside_coating==='GOLD'?'bg-amber-100 text-amber-900 border-amber-300 font-bold':'bg-slate-100 text-slate-600 border-slate-200'}">
                            ${item.inside_coating || 'BELİRTİLMEMİŞ'}
                          </span>
                        </td>
                        <td class="py-2.5 px-2"><div class="flex flex-wrap gap-1">${item.colors.map(renderColorChip).join('')}</div></td>
                        <td class="py-2.5 px-2 text-right font-mono text-slate-600">${formatNum(item.netDemand)}</td>
                        <td class="py-2.5 px-2 text-center">
                          <div class="flex items-center justify-center gap-1">
                            <button
                              onclick="updateItemRepeats('${item.productId}', Math.max(0, ${item.repeats} - ${step}));"
                              class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                              title="-${step} Tekrar"
                            >-</button>
                            <input
                              type="number"
                              min="0"
                              step="${step}"
                              value="${item.repeats}"
                              onchange="updateItemRepeats('${item.productId}', parseInt(this.value,10)||0);"
                              class="w-12 bg-white border ${item.stepValid?'border-slate-300 text-sky-700':'border-rose-400 bg-rose-50 text-rose-800 font-bold'} font-mono font-bold text-center rounded py-1 outline-none"
                            />
                            <button
                              onclick="updateItemRepeats('${item.productId}', ${item.repeats} + ${step});"
                              class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                              title="+${step} Tekrar"
                            >+</button>
                          </div>
                          ${!item.stepValid && wb.repeatStep > 0 ? `
                            <div class="text-[9px] font-mono text-rose-600 font-bold mt-0.5">
                              ⚠️ ${item.repeats} (${wb.repeatStep}'in katı değil)
                            </div>
                          ` : ''}
                        </td>
                        <td class="py-2.5 px-2 text-center font-mono text-xs">
                          ${item.assigned_groups !== null ? `
                            <span class="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[10px]">
                              ${item.assigned_groups} Grup
                            </span>
                          ` : '<span class="text-rose-600 text-[10px] font-bold">Geçersiz</span>'}
                        </td>
                        <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-900">${formatNum(item.theoretical)}</td>
                        <td class="py-2.5 px-2 text-right font-mono">
                          ${item.difference > 0
                            ? `<span class="text-amber-700 font-semibold">+${formatNum(item.difference)}</span>`
                            : item.difference < 0
                            ? `<span class="text-rose-700 font-semibold">${formatNum(item.difference)}</span>`
                            : '<span class="text-emerald-700 font-bold">Tam (0)</span>'
                          }
                        </td>
                        <td class="py-2.5 px-2 text-center">
                          <button onclick="removeWorkbenchItem('${item.productId}');" class="text-slate-400 hover:text-rose-600 font-mono">✕</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Table Footer -->
            <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono">
              <div>Toplam Çıktı: <b class="text-slate-900 font-bold">${formatNum(wb.calculatedItems.reduce((a,i)=>a+i.theoretical,0))} Tüp</b></div>
              <div>Toplam Levha: <b class="text-sky-700 font-bold">${formatNum(state.sheetCount)} Adet</b></div>
              <div>Kapasite: <b class="${wb.totalRepeats===wb.matchedCapacity?'text-emerald-700':wb.totalRepeats>wb.matchedCapacity?'text-rose-700':'text-amber-700'}">${wb.totalRepeats} / ${wb.matchedCapacity} Tekrar</b></div>
            </div>
          </div>

          <!-- GERÇEK LEVHA GÖRÜNÜMÜ & MONTAJ GÖRSELLEŞTİRİCİSİ -->
          <div class="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-900">FİZİKSEL LEVHA VE MONTAJ GÖRÜNÜMÜ</span>
                  ${wb.layout ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono ${wb.layout.verification_status==='verified'?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-amber-50 text-amber-800 border border-amber-300'}">
                      ${wb.layout.verification_status==='verified'?'Doğrulanmış Düzen':'Geçici Taslak'}
                    </span>
                  ` : ''}
                </div>
                <div class="text-[11px] font-mono text-slate-500 mt-0.5">
                  ${rawSheet ? `Ölçüler: <b>${rawSheet.width_mm} × ${rawSheet.height_mm} mm</b> (En × Boy) | Oran: <b>${aspectRatio.toFixed(2)}:1</b> | Kalınlık: ${rawSheet.thickness_source_value} mm` : 'Ham levha bulunamadı'}
                </div>
              </div>

              <div class="text-[11px] font-mono text-slate-500">
                ${wb.layout ? `
                  <span class="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    Tanımlı: <b>${wb.layout.rows} Satır × ${wb.layout.cols} Sütun</b> (${wb.layout.rows * wb.layout.cols} Yuva)
                  </span>
                ` : `
                  <span class="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Fiziksel yerleşim tanımı eksik
                  </span>
                `}
              </div>
            </div>

            <!-- Uyuşmazlık Uyarısı -->
            ${wb.layout && !wb.layoutConsistent ? `
              <div class="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start gap-2">
                <span class="text-amber-600 font-bold">⚠️</span>
                <div>
                  <span class="font-bold">Düzen Uyuşmazlığı:</span> Tanımlı montaj düzeni (${wb.layout.rows} × ${wb.layout.cols} = ${wb.layout.rows * wb.layout.cols} yuva), hazır levha kapasitesi (${wb.matchedCapacity} tüp) ile eşleşmiyor! Kapasite değeri değiştirilmez.
                </div>
              </div>
            ` : ''}

            <!-- Physical Sheet Outer Container -->
            <div class="bg-slate-100 p-4 rounded-lg border border-slate-200 overflow-x-auto flex flex-col items-center gap-4">
              ${wb.layout && wb.gridResult ? `
                <div
                  class="relative bg-white border-2 ${wb.gridResult.isValid ? 'border-slate-800' : 'border-rose-500 bg-rose-50/20'} rounded shadow-md p-3 flex flex-col justify-between"
                  style="aspect-ratio: ${aspectRatio}; width: 100%; max-width: 660px; min-width: 440px; min-height: 280px;"
                >
                  <div class="absolute top-1 left-2 text-[9px] font-mono text-slate-500">${rawSheet?.width_mm} mm (En)</div>
                  <div class="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">${rawSheet?.height_mm} mm (Boy)</div>

                  <!-- Header showing orientation and rule -->
                  <div class="flex items-center justify-between pb-1 border-b border-slate-200 text-[10px] font-mono text-slate-600">
                    <span>
                      <b>${wb.printingRule.code}</b>: ${wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? '📐 SATIR BAZINDA TEK ÇEŞİT' : '📐 SÜTUN BAZINDA TEK ÇEŞİT'}
                      ${wb.isPrintingException ? '<span class="text-purple-700 font-bold ml-1">[İSTİSNA]</span>' : '<span class="text-slate-500 ml-1">[VARSAYILAN]</span>'}
                    </span>
                    <span class="font-bold ${wb.gridResult.isValid ? 'text-emerald-700' : 'text-rose-700'}">
                      ${wb.gridResult.isValid ? '✓ Düzen Kurallara Uygun' : '⛔ Kural İhlali Mevcut'}
                    </span>
                  </div>

                  <!-- Fixed Grid: Physical layout does not reflow or change with screen width! -->
                  <div
                    class="w-full h-full pt-2 pb-2"
                    style="display: grid; grid-template-columns: repeat(${wb.layout.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${wb.layout.rows}, minmax(0, 1fr)); gap: ${wb.layout.gap_mm || 4}px;"
                  >
                    ${wb.gridResult.grid.map((row, rIdx) => {
                      return row.map((cell, cIdx) => {
                        if (!cell.productId) {
                          return `
                            <div class="rounded border border-dashed border-slate-300 bg-slate-50 text-center text-slate-400 flex items-center justify-center text-[9px] font-mono">
                              BOŞ
                            </div>
                          `;
                        }
                        const palette = PRODUCT_PALETTES[cell.paletteIndex % PRODUCT_PALETTES.length];
                        const shortName = (cell.stockName || '').split(')-')[1] || (cell.stockName || '').split(' ')[0] || cell.variantKey;
                        const cellViolated = cell.isViolated;

                        return `
                          <div
                            class="rounded border p-1 text-center flex flex-col items-center justify-center transition-all ${
                              cellViolated
                                ? 'border-2 border-rose-500 bg-rose-100 text-rose-950 font-bold'
                                : `${palette.bg} ${palette.border} ${palette.text}`
                            }"
                            title="${cell.stockName} (Slot: R${rIdx+1}:C${cIdx+1}, Tekrar: #${cell.repeatIndex}) ${cellViolated ? ' - KURAL İHLALİ' : ''}"
                          >
                            <div class="text-[10px] font-bold font-mono truncate w-full flex items-center justify-center gap-0.5">
                              ${cellViolated ? '⛔ ' : ''}${shortName}
                            </div>
                            <div class="text-[8px] font-mono opacity-80">
                              #${cell.repeatIndex} | ${wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? `S:${rIdx+1}` : `C:${cIdx+1}`}
                            </div>
                          </div>
                        `;
                      }).join('');
                    }).join('')}
                  </div>
                </div>
              ` : `
                <!-- Undefined Layout: Aspect ratio box without fake slots -->
                <div
                  class="relative bg-white border-2 border-dashed border-slate-400 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-inner"
                  style="aspect-ratio: ${aspectRatio}; width: 100%; max-width: 560px; min-height: 240px;"
                >
                  <div class="text-2xl mb-1">📐</div>
                  <div class="text-xs font-bold text-slate-800 uppercase tracking-wide">Fiziksel Yerleşim Tanımı Eksik</div>
                  <p class="text-[11px] text-slate-500 max-w-sm mt-1">
                    Bu ham levha (${rawSheet?.stock_name || wb.items[0]?.tubeSize || ''}) için kullanıcı tarafından verilmiş satır/sütun kalıp düzeni bulunmamaktadır.
                    Hazır levha kapasitesi <b>${wb.matchedCapacity} tüp/levha</b>, montaj grubu sayısı <b>${wb.assemblyGroupCount || '—'}</b>, ürün tekrar adımı <b>${wb.repeatStep || '—'}</b>'dir.
                    Fiziksel satır/sütun yerleşimi uydurulmaz.
                  </p>
                  <div class="mt-3 text-[10px] font-mono text-sky-800 bg-sky-50 px-3 py-1.5 rounded border border-sky-200">
                    Teknik Tanımlar &gt; Montaj Görünümü sekmesinden kalıp düzeni tanımlayabilirsiniz.
                  </div>
                </div>

                <!-- Schematic Group Distribution Bar -->
                <div class="w-full max-w-lg p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div class="text-[10px] font-mono font-bold text-slate-600 uppercase flex justify-between">
                    <span>Grup Dağılım Şeması (Fiziksel Baskı Düzeni Değildir)</span>
                    <span>${wb.totalRepeats} / ${wb.matchedCapacity} Tüp</span>
                  </div>
                  <div class="h-6 w-full bg-slate-100 rounded overflow-hidden flex border border-slate-200">
                    ${wb.calculatedItems.map((item, idx) => {
                      const palette = PRODUCT_PALETTES[idx % PRODUCT_PALETTES.length];
                      const widthPct = wb.matchedCapacity > 0 ? (item.repeats / wb.matchedCapacity) * 100 : 0;
                      if (widthPct <= 0) return '';
                      return `
                        <div
                          class="h-full flex items-center justify-center text-[9px] font-mono font-bold truncate px-1 ${palette.bg} ${palette.text} border-r border-white/50"
                          style="width: ${widthPct}%;"
                          title="${item.stockName}: ${item.repeats} tekrar (${item.assigned_groups || '?'} grup)"
                        >
                          ${item.repeats} (${item.assigned_groups || '?'}G)
                        </div>
                      `;
                    }).join('')}
                    ${wb.remainingCapacity > 0 ? `
                      <div class="h-full bg-slate-200 text-slate-400 text-[9px] font-mono flex items-center justify-center" style="width: ${(wb.remainingCapacity / wb.matchedCapacity) * 100}%;">
                        ${wb.remainingCapacity} Boş
                      </div>
                    ` : ''}
                  </div>
                </div>
              `}
            </div>

            <!-- Matbaa Kuralı ve Yerleşim Özeti Kartı -->
            <div class="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-xs">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">🖨️ Matbaa Kuralı:</span>
                  <span class="px-2 py-0.5 rounded font-bold ${wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-sky-50 text-sky-800 border border-sky-200'}">
                    ${wb.printingRule.code} — ${wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? 'Satır Bazında Tek Çeşit' : 'Sütun Bazında Tek Çeşit'}
                  </span>
                  ${wb.isPrintingException ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">İSTİSNA</span>' : '<span class="text-slate-400 text-[10px]">VARSAYILAN</span>'}
                </div>
                <div class="text-[11px] text-slate-500">
                  ${wb.printingRule.description}
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-[11px] text-slate-600">
                  ${wb.gridResult ? (wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? `${wb.gridResult.homogeneousRows}/${wb.gridResult.totalRows} Satır Homojen` : `${wb.gridResult.homogeneousCols}/${wb.gridResult.totalCols} Sütun Homojen`) : ''}
                </span>
                <span class="px-2 py-1 rounded text-xs font-bold ${wb.gridResult?.isValid ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'}">
                  ${wb.gridResult?.isValid ? '✓ Kural Sağlandı' : '⛔ Kural İhlali'}
                </span>
              </div>
            </div>

            <!-- Lak & Kombinasyon Uyumluluk Kartı -->
            <div class="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-xs">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">🧪 Lak & Kombinasyon Uyumu:</span>
                  <span class="px-2 py-0.5 rounded font-bold ${wb.combinationRuleResult?.isCompatible ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'}">
                    ${wb.combinationRuleResult?.isCompatible ? '✓ Kombinasyon Uygun' : '⛔ Kombinasyon Engellendi'}
                  </span>
                  ${wb.combinationRuleResult?.conflicts?.length > 0 ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">KURAL ÇAKIŞMASI (AÇIK YASAK UYGULANDI)</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-500">
                  ${wb.combinationRuleResult?.isCompatible
                    ? (wb.combinationRuleResult.passedRules.join(' | ') || 'Tüm ürünler çift yönlü ve lak açısından uyumludur.')
                    : (wb.combinationRuleResult?.violationReasons[0] || 'Kombinasyon kuralı ihlali tespit edildi.')}
                </div>
              </div>

              <div class="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                ${wb.calculatedItems.map(item => {
                  const st = normalizeLacquerStatus(item.lacquer);
                  return `
                    <span class="px-1.5 py-0.5 rounded text-[10px] border ${st==='LAKLI'?'bg-sky-50 text-sky-800 border-sky-300':st==='LAKSIZ'?'bg-slate-100 text-slate-700 border-slate-300':'bg-amber-50 text-amber-800 border-amber-300 font-bold'}" title="${item.stockName}">
                      ${item.stockCode.slice(-4)}: <b>${st}</b>
                    </span>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Legend Key -->
            <div class="pt-2 border-t border-slate-200 space-y-2">
              <div class="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center justify-between">
                <span>AÇIKLAMA ANAHTARI (LEJANT)</span>
                <span class="text-slate-400 font-normal">Görsel temsil amaçlıdır — fiziksel montaj ve bıçak uygunluğu ajans/matbaa CTP onayı ile belirlenir.</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                ${wb.calculatedItems.map((item, idx) => {
                  const palette = PRODUCT_PALETTES[idx % PRODUCT_PALETTES.length];
                  const sharePct = wb.matchedCapacity > 0 ? ((item.repeats / wb.matchedCapacity) * 100).toFixed(0) : '0';
                  return `
                    <div class="p-2 rounded border flex items-center justify-between text-xs ${palette.badge}">
                      <div class="flex items-center gap-2 overflow-hidden">
                        <span class="w-3 h-3 rounded-full flex-shrink-0 ${palette.chip}"></span>
                        <div class="truncate font-semibold text-[11px]">${item.stockName}</div>
                      </div>
                      <div class="text-right font-mono text-[10px] flex-shrink-0 pl-2">
                        <b>${item.repeats}</b>/${wb.matchedCapacity} (%${sharePct})
                        ${item.assigned_groups ? `<div class="text-sky-700 font-bold">${item.assigned_groups} Grup</div>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Right 1 Col -->
        <div class="space-y-4">
          <!-- Validation Status Card -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">MONTAJ UYGUNLUK DENETİMİ</h3>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded ${wb.isValid?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-rose-50 text-rose-800 border border-rose-300'}">
                ${wb.isValid?'GEÇERLİ':'UYGUNSUZ'}
              </span>
            </div>

            <!-- Distinct Status Badges -->
            <div class="grid grid-cols-3 gap-2 text-xs font-mono">
              <div class="p-2 rounded border ${wb.repeatStepMatch?'bg-emerald-50 border-emerald-200 text-emerald-900':'bg-rose-50 border-rose-200 text-rose-900'}">
                <div class="text-[9px] uppercase font-bold text-slate-500">Tekrar Adımı:</div>
                <div class="font-bold text-xs mt-0.5">${wb.repeatStepMatch ? `✓ Uygun (${wb.repeatStep}'in Katı)` : '⛔ Hatalı Katlar'}</div>
              </div>

              <div class="p-2 rounded border ${wb.isFullCapacity?'bg-emerald-50 border-emerald-200 text-emerald-900':wb.totalRepeats>wb.matchedCapacity?'bg-rose-50 border-rose-200 text-rose-900':'bg-amber-50 border-amber-200 text-amber-900'}">
                <div class="text-[9px] uppercase font-bold text-slate-500">Kapasite:</div>
                <div class="font-bold text-xs mt-0.5">
                  ${wb.isFullCapacity ? '✓ Tam Dolu' : wb.totalRepeats > wb.matchedCapacity ? '⛔ Aşıldı' : `⚠️ Eksik (${wb.remainingCapacity})`}
                </div>
              </div>

              <div class="p-2 rounded border ${wb.gridResult?.isValid?'bg-emerald-50 border-emerald-200 text-emerald-900':'bg-rose-50 border-rose-200 text-rose-900'}">
                <div class="text-[9px] uppercase font-bold text-slate-500">Matbaa Kuralı:</div>
                <div class="font-bold text-xs mt-0.5">
                  ${wb.gridResult ? (wb.gridResult.isValid ? (wb.printingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? '✓ Satır Tam' : '✓ Sütun Tam') : '⛔ İhlal') : '—'}
                </div>
              </div>
            </div>

            <!-- Production Approval Readiness Banner -->
            <div class="p-3 rounded border text-xs font-mono ${wb.productionApprovalReady ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-100 border-slate-300 text-slate-700'}">
              <div class="flex items-center gap-2">
                <span>${wb.productionApprovalReady ? '🟢' : '⚪'}</span>
                <div>
                  <div class="font-bold">
                    ${wb.productionApprovalReady ? 'ÜRETİME ONAYLANABİLİR' : 'ÜRETİME ONAYLANAMAZ (TASLAK DENEME)'}
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5">
                    ${wb.productionApprovalReady
                      ? 'Tüm kurallar, tekrar adımları ve matbaa yerleşimi sağlandı; levha tam kapasite doludur.'
                      : !wb.gridResult?.isValid
                      ? 'Matbaa yerleşim kuralı ihlal edilmiştir (aynı satır/sütuna farklı çeşitler karışmış). Düzen doğrulanamaz.'
                      : wb.isValid && !wb.isFullCapacity
                      ? 'Tekrar adımları uygun ancak kısmi doluluk var. Tanımlı politika olmadan üretime aktarılamaz.'
                      : 'Kural ihlali veya geçersiz tekrar adımı mevcuttur.'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              ${wb.messages.map(m => `
                <div class="p-2.5 rounded border text-xs font-mono flex items-start gap-2 ${m.type==='success'?'bg-emerald-50 border-emerald-200 text-emerald-800':m.type==='error'?'bg-rose-50 border-rose-200 text-rose-800':'bg-amber-50 border-amber-200 text-amber-800'}">
                  <span>${m.type==='success'?'✓':m.type==='error'?'⛔':'⚠️'}</span>
                  <span class="flex-1">${m.text}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Unique Colors Card -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-sm">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 flex justify-between">
              <span>BENZERSİZ RENKLER (${wb.colorCount} Renk)</span>
              <span class="text-slate-500 font-mono font-bold">Max ${state.maxColors}</span>
            </div>
            <div class="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border border-slate-200 min-h-[44px] items-center">
              ${wb.uniqueColors.map(renderColorChip).join('')}
            </div>
            <p class="text-[11px] text-slate-500">Ortak renkler (CMYK) tek sefer sayılır. Farklı Pantone'lerin birleşimi 6 benzersiz rengi aşamaz.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Preset Handlers (14 Kullanıcı Kabul Senaryosu)
function preset45x100Valid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P45-1', stockCode:'519945100-01', stockName:'TUP-TEST 45x100 ODA SPR-1', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:7500, repeatsPerSheet:6, record_kind:'synthetic_demo'},
    {productId:'P45-2', stockCode:'519945100-02', stockName:'TUP-TEST 45x100 ODA SPR-2', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'},
    {productId:'P45-3', stockCode:'519945100-03', stockName:'TUP-TEST 45x100 ODA SPR-3', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:37500, repeatsPerSheet:30, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset45x100Invalid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P45-1', stockCode:'519945100-01', stockName:'TUP-TEST 45x100 ODA SPR-1', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:6250, repeatsPerSheet:5, record_kind:'synthetic_demo'},
    {productId:'P45-2', stockCode:'519945100-02', stockName:'TUP-TEST 45x100 ODA SPR-2', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:16250, repeatsPerSheet:13, record_kind:'synthetic_demo'},
    {productId:'P45-3', stockCode:'519945100-03', stockName:'TUP-TEST 45x100 ODA SPR-3', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1103', colors:['C','M','Y','K'], netDemand:37500, repeatsPerSheet:30, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset52x105Valid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P52-1', stockCode:'519952105-01', stockName:'TUP-TEST 52x105 ODA SPR-1', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:6250, repeatsPerSheet:5, record_kind:'synthetic_demo'},
    {productId:'P52-2', stockCode:'519952105-02', stockName:'TUP-TEST 52x105 ODA SPR-2', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:18750, repeatsPerSheet:15, record_kind:'synthetic_demo'},
    {productId:'P52-3', stockCode:'519952105-03', stockName:'TUP-TEST 52x105 ODA SPR-3', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:25000, repeatsPerSheet:20, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset52x105Invalid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P52-1', stockCode:'519952105-01', stockName:'TUP-TEST 52x105 ODA SPR-1', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:7500, repeatsPerSheet:6, record_kind:'synthetic_demo'},
    {productId:'P52-2', stockCode:'519952105-02', stockName:'TUP-TEST 52x105 ODA SPR-2', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:17500, repeatsPerSheet:14, record_kind:'synthetic_demo'},
    {productId:'P52-3', stockCode:'519952105-03', stockName:'TUP-TEST 52x105 ODA SPR-3', tubeSize:'52x105', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1202', colors:['C','M','Y','K'], netDemand:25000, repeatsPerSheet:20, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetSoft() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'DEM-001', stockCode:'511109010910-1001', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'DEM-002', stockCode:'511109010910-1002', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'DEM-003', stockCode:'511109010910-1003', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset52x195Invalid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'DEM-001', stockCode:'511109010910-1001', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:6250, repeatsPerSheet:5, record_kind:'synthetic_demo'},
    {productId:'DEM-002', stockCode:'511109010910-1002', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:8750, repeatsPerSheet:7, record_kind:'synthetic_demo'},
    {productId:'DEM-003', stockCode:'511109010910-1003', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset52x234Valid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P52234-1', stockCode:'511109010910-7284', stockName:'TUP-GW-MS CITRUS FEST (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:3750, repeatsPerSheet:3, record_kind:'source_transcription'},
    {productId:'P52234-2', stockCode:'511109010910-7285', stockName:'TUP-GW-MS ELEGANT AMBER (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:7500, repeatsPerSheet:6, record_kind:'source_transcription'},
    {productId:'P52234-3', stockCode:'511109010910-7283', stockName:'TUP-GW-MS CHERRY (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:7500, repeatsPerSheet:6, record_kind:'source_transcription'}
  ];
  renderApp();
}

function preset52x234Invalid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P52234-1', stockCode:'511109010910-7284', stockName:'TUP-GW-MS CITRUS FEST (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:5000, repeatsPerSheet:4, record_kind:'source_transcription'},
    {productId:'P52234-2', stockCode:'511109010910-7285', stockName:'TUP-GW-MS ELEGANT AMBER (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:6250, repeatsPerSheet:5, record_kind:'source_transcription'},
    {productId:'P52234-3', stockCode:'511109010910-7283', stockName:'TUP-GW-MS CHERRY (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C','357C'], netDemand:7500, repeatsPerSheet:6, record_kind:'source_transcription'}
  ];
  renderApp();
}

function preset65x300Valid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P65300-1', stockCode:'519965300-01', stockName:'TUP-TEST 65x300 ODA SPR-1', tubeSize:'65x300', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1414', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'P65300-2', stockCode:'519965300-02', stockName:'TUP-TEST 65x300 ODA SPR-2', tubeSize:'65x300', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1414', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset65x300Invalid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P65300-1', stockCode:'519965300-01', stockName:'TUP-TEST 65x300 ODA SPR-1', tubeSize:'65x300', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1414', colors:['C','M','Y','K'], netDemand:6250, repeatsPerSheet:5, record_kind:'synthetic_demo'},
    {productId:'P65300-2', stockCode:'519965300-02', stockName:'TUP-TEST 65x300 ODA SPR-2', tubeSize:'65x300', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1414', colors:['C','M','Y','K'], netDemand:8750, repeatsPerSheet:7, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetIncompleteCapacity() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'DEM-001', stockCode:'511109010910-1001', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'DEM-002', stockCode:'511109010910-1002', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', tubeSize:'52x195', printSurface:'EMAYE', varnish:'BELİRTİLMEMİŞ', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetUndefinedSize() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P65157-1', stockCode:'519965157-01', stockName:'TUP-TEST 65x157 TANIMSIZ EBAT', tubeSize:'65x157', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1416', colors:['C','M','Y','K'], netDemand:7500, repeatsPerSheet:6, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset6Colors() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P1', stockCode:'511109010910-7284', stockName:'TUP-GW-MS CITRUS (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C'], netDemand:7500, repeatsPerSheet:6, record_kind:'source_transcription'},
    {productId:'P2', stockCode:'511109010910-7285', stockName:'TUP-GW-MS AMBER (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','357C'], netDemand:11250, repeatsPerSheet:9, record_kind:'source_transcription'}
  ];
  renderApp();
}

function preset7Colors() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P1', stockCode:'511109010910-7284', stockName:'TUP-GW-MS CITRUS (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C'], netDemand:3750, repeatsPerSheet:3, record_kind:'source_transcription'},
    {productId:'P2', stockCode:'511109010910-7285', stockName:'TUP-GW-MS AMBER (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','357C'], netDemand:7500, repeatsPerSheet:6, record_kind:'source_transcription'},
    {productId:'P3', stockCode:'511109010910-7299', stockName:'TUP-GW-MS RED (52x234)', tubeSize:'52x234', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'BELİRTİLMEMİŞ', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','185C'], netDemand:7500, repeatsPerSheet:6, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetUndefinedLayout() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'DEM-021', stockCode:'519999010001', stockName:'TUP-DENEME ODOR SPR 200 ml (45x100)-MISSING-SHEET', tubeSize:'45x100', printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'STANDART', rawSheetCode:'', colors:['C','M','Y','K'], netDemand:36000, repeatsPerSheet:48, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function preset65x104Valid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P65104-1', stockCode:'512031011610-1007', stockName:'TUP-ROOMSTAR BAHAR (65x104)', tubeSize:'65x104', diameter_mm:65, height_mm:104, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'STANDART', rawSheetCode:'500011000004-1408', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'source_transcription'},
    {productId:'P65104-2', stockCode:'512031011610-1009', stockName:'TUP-ROOMSTAR PUDRA (65x104)', tubeSize:'65x104', diameter_mm:65, height_mm:104, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'STANDART', rawSheetCode:'500011000004-1408', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'source_transcription'},
    {productId:'P65104-3', stockCode:'512031011610-1008', stockName:'TUP-ROOMSTAR MASAL (65x104)', tubeSize:'65x104', diameter_mm:65, height_mm:104, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'STANDART', rawSheetCode:'500011000004-1408', colors:['C','M','Y','K'], netDemand:20000, repeatsPerSheet:16, record_kind:'source_transcription'}
  ];
  renderApp();
}

function presetDistinctVariantsSameName() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P-DIFF-01', stockCode:'511109010910-9001', stockName:'TUP-GENEL DEODORANT 150 ml (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'P-DIFF-02', stockCode:'511109010910-9002', stockName:'TUP-GENEL DEODORANT 150 ml (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'P-DIFF-03', stockCode:'511109010910-9003', stockName:'TUP-GENEL DEODORANT 150 ml (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetLacquerPureLacqueredValid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P-LAK-01', stockCode:'511109010910-2001', stockName:'TUP-LAKLI ODA SPR-1 (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-LAK-02', stockCode:'511109010910-2002', stockName:'TUP-LAKLI ODA SPR-2 (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetLacquerPureUnlacqueredValid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P-LAKSIZ-01', stockCode:'511109010910-3001', stockName:'TUP-LAKSIZ ODA SPR-1 (52x234)', tubeSize:'52x234', diameter_mm:52, height_mm:234, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKSIZ', inside_coating:'STANDART', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','368C'], netDemand:7500, repeatsPerSheet:6, record_kind:'synthetic_demo'},
    {productId:'P-LAKSIZ-02', stockCode:'511109010910-3002', stockName:'TUP-LAKSIZ ODA SPR-2 (52x234)', tubeSize:'52x234', diameter_mm:52, height_mm:234, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKSIZ', inside_coating:'STANDART', rawSheetCode:'500011000004-1208', colors:['C','M','Y','K','357C'], netDemand:11250, repeatsPerSheet:9, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetLacquerMixedForbidden() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P-MIX-01', stockCode:'511109010910-2001', stockName:'TUP-LAKLI ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-MIX-02', stockCode:'511109010910-3005', stockName:'TUP-LAKSIZ ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKSIZ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetLacquerUnknownRejected() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P-UNK-01', stockCode:'511109010910-1001', stockName:'TUP-SOFT VANILLA (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'BELİRTİLMEMİŞ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-UNK-02', stockCode:'511109010910-2001', stockName:'TUP-LAKLI ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetForbiddenPair() {
  state.sheetCount = 1250;
  // Ensure KRL-CAPRAZ-KORUMA rule is active for this test
  state.combinationRules = state.combinationRules.map(r => r.code === 'KRL-CAPRAZ-KORUMA' ? {...r, is_active: true} : r);
  state.workbenchItems = [
    {productId:'P-PAIR-01', stockCode:'511109010910-1001', stockName:'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-PAIR-02', stockCode:'511121010410-5004', stockName:'TUP-FIRIN TEMIZLEYICI (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetRuleConflictSafeResolution() {
  state.sheetCount = 1250;
  // Enable BOTH FORBID_MIXED_LACQUER and ALLOW_MIXED_LACQUER to demonstrate conflict resolution
  const hasAllow = state.combinationRules.some(r => r.rule_type === 'ALLOW_MIXED_LACQUER');
  if (!hasAllow) {
    state.combinationRules.push({
      id: 'RULE-KMB-ALLOW-DEMO',
      code: 'KRL-LAK-IZIN-DEMO',
      name: 'Lak Karışım İzni (Çakışma Testi)',
      rule_type: 'ALLOW_MIXED_LACQUER',
      target_type: 'GLOBAL',
      priority: 15,
      is_active: true,
      description: 'Test amacıyla eklenmiş izin kuralı.'
    });
  } else {
    state.combinationRules = state.combinationRules.map(r => r.rule_type === 'ALLOW_MIXED_LACQUER' ? {...r, is_active: true} : r);
  }
  state.combinationRules = state.combinationRules.map(r => r.rule_type === 'FORBID_MIXED_LACQUER' ? {...r, is_active: true} : r);

  state.workbenchItems = [
    {productId:'P-CONF-01', stockCode:'511109010910-2001', stockName:'TUP-LAKLI ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-CONF-02', stockCode:'511109010910-3005', stockName:'TUP-LAKSIZ ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKSIZ', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetExclusiveSolo() {
  state.sheetCount = 1250;
  // Ensure solo rule is active
  state.combinationRules = state.combinationRules.map(r => r.rule_type === 'EXCLUSIVE_SOLO_ONLY' ? {...r, is_active: true, target_product_code: '519999010001'} : r);
  state.workbenchItems = [
    {productId:'P-SOLO-01', stockCode:'519999010001', stockName:'TUP-OZEL SERI SOLO ODA SPR (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P-SOLO-02', stockCode:'511109010910-1002', stockName:'TUP-SOFT OCEANIC (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:15000, repeatsPerSheet:12, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function presetTripleCombinationValid() {
  state.sheetCount = 1250;
  state.workbenchItems = [
    {productId:'P3-1', stockCode:'511109010910-1001', stockName:'TUP-SOFT VANILLA (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:5000, repeatsPerSheet:4, record_kind:'synthetic_demo'},
    {productId:'P3-2', stockCode:'511109010910-1002', stockName:'TUP-SOFT OCEANIC (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'},
    {productId:'P3-3', stockCode:'511109010910-1003', stockName:'TUP-SOFT LAVENDER (52x195)', tubeSize:'52x195', diameter_mm:52, height_mm:195, printSurface:'EMAYE', varnish:'PARLAK', lacquer:'LAKLI', inside_coating:'GOLD', rawSheetCode:'500011000004-1206', colors:['C','M','Y','K'], netDemand:10000, repeatsPerSheet:8, record_kind:'synthetic_demo'}
  ];
  renderApp();
}

function updateItemRepeats(productId, val) {
  state.workbenchItems = state.workbenchItems.map(i => i.productId === productId ? {...i, repeatsPerSheet: Math.max(0, val)} : i);
  renderApp();
}

function removeWorkbenchItem(productId) {
  state.workbenchItems = state.workbenchItems.filter(i => i.productId !== productId);
  renderApp();
}

function addDemandToWorkbench(demandId) {
  const d = state.demands.find(item => item.id === demandId);
  if (!d) return;

  // Faz 3A.2 Koruması: Gerçek ERP taleplerinin doğrudan kombinasyon masasına aktarımı engellenir
  if (d.record_kind !== 'synthetic_demo') {
    alert(
      'KOMBİNASYON AKTARIM KORUMASI (FAZ 3A.2 / FAZ 3B):\\n\\n' +
      'Gerçek ERP talepleri henüz Faz 3B çok seviyeli stok netleme ve baskı levhası hesabından geçmemiştir.\\n\\n' +
      'Mevcut miktar (' + Number(d.net_quantity || d.gross_quantity).toLocaleString('tr-TR') + ' adet) "Net Tüp Üretimi" olup "Yeni Baskı İhtiyacı" DEĞİLDİR.\\n\\n' +
      'Montaj tezgahına yalnız hesaplanmış yeni baskı ihtiyacı aktarılabilir. Faz 3B tamamlanana kadar yalnızca temsili demo senaryoları aktarılabilir.'
    );
    return;
  }

  if (state.workbenchItems.some(i => i.productId === demandId)) return;
  state.workbenchItems.push({
    productId: d.id,
    stockCode: d.stock_code,
    stockName: d.stock_name,
    tubeSize: d.tube_size,
    printSurface: d.print_surface,
    varnish: d.varnish,
    lacquer: d.lacquer,
    inside_coating: d.inside_coating,
    rawSheetCode: d.raw_sheet_code,
    colors: d.colors,
    netDemand: d.net_quantity,
    repeatsPerSheet: 2,
    record_kind: d.record_kind
  });
  renderApp();
}

function toggleSelectDemand(id) {
  if (state.selectedDemandIds.includes(id)) {
    state.selectedDemandIds = state.selectedDemandIds.filter(i => i !== id);
  } else {
    state.selectedDemandIds.push(id);
  }
  renderApp();
}

function toggleSelectAllDemands(checked, filteredIds = null) {
  if (checked) {
    if (filteredIds && Array.isArray(filteredIds) && filteredIds.length > 0) {
      const merged = new Set([...state.selectedDemandIds, ...filteredIds]);
      state.selectedDemandIds = Array.from(merged);
    } else {
      state.selectedDemandIds = state.demands.map(d => d.id);
    }
  } else {
    if (filteredIds && Array.isArray(filteredIds) && filteredIds.length > 0) {
      state.selectedDemandIds = state.selectedDemandIds.filter(id => !filteredIds.includes(id));
    } else {
      state.selectedDemandIds = [];
    }
  }
  renderApp();
}



function transferSelectedDemandsToWorkbench() {
  if (!state.selectedDemandIds || state.selectedDemandIds.length === 0) return;
  const selectedItems = state.demands.filter(d => state.selectedDemandIds.includes(d.id));

  // Kontrol 1: Hesaplanmamış veya hatalı talep var mı?
  const uncalculated = selectedItems.filter(d => d.record_kind !== 'synthetic_demo' && d.calculation_status !== 'CALCULATED');
  if (uncalculated.length > 0) {
    alert(
      'KOMBİNASYON AKTARIM KORUMASI:\\n\\n' +
      'Seçili kalemler arasında ' + uncalculated.length + ' adet kademeli tahsisi henüz hesaplanmamış veya çözümlenememiş talep bulunmaktadır.\\n\\n' +
      'Lütfen önce "Tahsisi Yeniden Hesapla" butonuna basarak hesaplamayı tamamlayınız.'
    );
    return;
  }

  // Kontrol 2: Yeni baskı ihtiyacı sıfır olanlar
  const zeroPrint = selectedItems.filter(d => d.record_kind !== 'synthetic_demo' && Number(d.net_print_quantity || 0) <= 0);
  if (zeroPrint.length === selectedItems.length && selectedItems.every(d => d.record_kind !== 'synthetic_demo')) {
    alert(
      'KOMBİNASYONA AKTARILACAK YENİ BASKI İHTİYACI YOK:\\n\\n' +
      'Seçilen tüm talepler eldeki tüp, kesik ve baskılı levha stoklarıyla tamamen karşılanmaktadır (Yeni Baskı İhtiyacı: 0).\\n\\n' +
      'Yeni bir matbaa baskı montajı açılmasına gerek yoktur.'
    );
    return;
  }

  // Kontrol 3: Eksik teknik tanım kontrolü (Faz 2 & Faz 3 kuralı)
  // Renk/zemin eksikliği tüp planını durdurmaz ancak yeni baskı kombinasyonunu engeller.
  const missingDefs = selectedItems.filter(d => d.record_kind !== 'synthetic_demo' && d.definition_status !== 'complete');
  if (missingDefs.length > 0) {
    alert(
      'TEKNİK TANIM EKSİKLİĞİ (KOMBİNASYON ENGELİ):\\n\\n' +
      'Seçili kalemler arasında ' + missingDefs.length + ' adet ürünün teknik kartı (renk, zemin veya ham levha) eksik veya onaylanmamıştır.\\n\\n' +
      'Örnek: ' + missingDefs[0].stock_code + ' - ' + missingDefs[0].stock_name + '\\n\\n' +
      'Lütfen önce Tanımlar Merkezi ekranından ilgili ürünlerin renk ve teknik tanımlarını tamamlayınız.'
    );
    return;
  }

  // Uygun olanları aktar (netDemand = net_print_quantity)
  let transferredCount = 0;
  selectedItems.forEach(d => {
    if (d.record_kind === 'synthetic_demo') {
      addDemandToWorkbench(d.id);
      transferredCount++;
    } else {
      const netPrint = Number(d.net_print_quantity) || 0;
      if (netPrint > 0) {
        addDemandToWorkbenchWithQuantity(d, netPrint);
        transferredCount++;
      }
    }
  });

  if (transferredCount > 0) {
    state.activePage = 'workbench';
    renderApp();
  }
}

function openDemandDetail(id) {
  state.selectedDemandDetailId = id;
  renderApp();
}

function closeDemandDetail() {
  state.selectedDemandDetailId = null;
  renderApp();
}

function resetDemandFilters() {
  state.demandSearch = '';
  state.demandFilterSize = 'ALL';
  state.demandFilterSurface = 'ALL';
  state.demandFilterStatus = 'ALL';
  state.demandFilterRecordKind = 'ALL';
  renderApp();
}

function switchDemandSource(mode) {
  state.demandSourceMode = mode;
  if (mode === 'demo') {
    state.demands = INITIAL_DEMANDS;
  } else {
    state.demands = state.liveDemands && state.liveDemands.length > 0 ? state.liveDemands : INITIAL_DEMANDS;
  }
  state.selectedDemandIds = [];
  renderApp();
}

async function testErpConnection() {
  state.isTestingConnection = true;
  renderApp();
  try {
    const res = await apiRequest('/api/erp/test-connection');
    state.erpConnection = res;
    if (res && res.connected) {
      alert('BAĞLANTI BAŞARILI:\\n\\nSQL Server: ' + res.serverName + '\\nVeritabanı: ' + res.database + '\\nGecikme: ' + res.latencyMs + ' ms\\nTünel Adresi: ' + res.host + ':' + res.port);
    } else {
      alert('BAĞLANTI HATASI:\\n\\n' + (res.error || 'Bilinmeyen hata'));
    }
  } catch (err) {
    alert('İstek hatası: ' + err.message);
  } finally {
    state.isTestingConnection = false;
    renderApp();
  }
}

async function triggerCalculateAllocations() {
  if (state.isCalculatingAllocations) return;
  state.isCalculatingAllocations = true;
  renderApp();
  try {
    const res = await apiRequest('/api/erp/calculate-allocations', { method: 'POST' });
    if (res && res.success) {
      state.latestCalculation = res.data;
      // Talepleri yeniden çek
      const demRes = await apiRequest('/api/erp/demands');
      if (demRes && demRes.success && Array.isArray(demRes.data)) {
        state.liveDemands = demRes.data;
        if (state.demandSourceMode !== 'demo') {
          state.demands = demRes.data;
        }
      }
      alert(
        'KADEMELİ TAHSİS MOTORU HESAPLANDI (FAZ 3B):\n\n' +
        'Toplam Talep: ' + res.data.total_demands + ' satır\n' +
        'Başarılı Hesaplanan: ' + res.data.calculated_count + ' satır\n' +
        'Brüt Dolum Talebi: ' + formatNum(res.data.total_gross_tube) + ' adet\n' +
        'Net Tüp İhtiyacı: ' + formatNum(res.data.total_net_tube) + ' adet\n' +
        'Net Kesim İhtiyacı: ' + formatNum(res.data.total_net_cutting) + ' adet\n' +
        'Net Yeni Baskı İhtiyacı: ' + formatNum(res.data.total_net_print) + ' adet\n\n' +
        'İhtiyaç Havuzu ve detay matrisleri güncellendi.'
      );
    }
  } catch (err) {
    alert('Hesaplama hatası: ' + err.message);
  } finally {
    state.isCalculatingAllocations = false;
    renderApp();
  }
}

function addDemandToWorkbenchWithQuantity(d, netQuantity) {
  const existing = state.workbenchItems.find(item => (item.productId === d.id || item.stockCode === d.stock_code));
  if (existing) {
    existing.netDemand = netQuantity;
    return;
  }
  state.workbenchItems.push({
    productId: d.id,
    stockCode: d.stock_code,
    stockName: d.stock_name,
    tubeSize: d.tube_size,
    printSurface: d.print_surface,
    varnish: d.varnish || 'BELİRTİLMEMİŞ',
    lacquer: d.lacquer || 'BELİRTİLMEMİŞ',
    inside_coating: d.inside_coating || 'STANDART',
    rawSheetCode: d.raw_sheet_code || '',
    colors: Array.isArray(d.colors) ? d.colors : [],
    netDemand: netQuantity,
    repeatsPerSheet: 0,
    record_kind: d.record_kind || 'live_erp_sync'
  });
}

async function triggerErpSync() {
  if (!confirm('SQL Server üzerinden 5 sözleşme view\'ı (Stok Kartları, Brüt Talepler, Reçete Bağlantıları, Ambar Stokları) PostgreSQL staging tablolarına aktarılacaktır.\\n\\nİşlem yerel teknik kartlarınızı (renk, lak, zemin) bozmaz.\\n\\nDevam etmek istiyor musunuz?')) {
    return;
  }
  state.isErpSyncing = true;
  renderApp();
  try {
    const res = await apiRequest('/api/erp/sync', {
      method: 'POST',
      body: { syncType: 'full' }
    });
    if (res && res.success) {
      const counts = res.data?.counts || {};
      alert(
        'ERP SENKRONİZASYONU TAMAMLANDI:\\n\\n' +
        '• Stok Kataloğu: ' + counts.catalog + ' kart\\n' +
        '• Brüt Tüp Talebi: ' + counts.demands + ' satır\\n' +
        '• Ambar Stok Seviyeleri: ' + counts.stock + ' kalem\\n' +
        '• Reçete Bağlantıları: ' + counts.recipes + ' satır\\n' +
        '• Süre: ' + (res.data?.durationMs / 1000).toFixed(1) + ' sn'
      );
      // Canlı talepleri yeniden yükle
      const demRes = await apiRequest('/api/erp/demands');
      if (demRes && demRes.data) {
        state.liveDemands = demRes.data;
        if (state.demandSourceMode !== 'demo') {
          state.demands = demRes.data;
        }
      }
      const [viewRes, histRes] = await Promise.all([
        apiRequest('/api/erp/views/status'),
        apiRequest('/api/erp/sync-history')
      ]);
      if (viewRes && viewRes.data) state.erpViewsStatus = viewRes.data;
      if (histRes && histRes.data) state.erpSyncHistory = histRes.data;
    } else {
      alert('Senkronizasyon hatası: ' + (res.error?.message || 'Bilinmeyen hata'));
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  } finally {
    state.isErpSyncing = false;
    renderApp();
  }
}

// Screen 4: Teknik Tanımlar ve Parametreler (Faz 2)

// ==============================================================================
// FAZ 2C: TANIMLAR MERKEZİ VE EXCEL İÇE AKTARMA MOTORU
// ==============================================================================

function saveTechnicalProducts() {
  localStorage.setItem('tp_technical_products_v2', JSON.stringify(state.technicalProducts));
}

function openProductModal(productId) {
  if (state.currentRole === 'viewer') return;
  if (!productId) {
    state.editingProduct = {
      id: '',
      stock_code: '',
      stock_name: '',
      tube_size: '52x195',
      diameter_mm: 52,
      height_mm: 195,
      raw_sheet_code: '500011000004-1206',
      raw_sheet_desc: 'HAM LEVHA-017x832x800- (T 61) -52x195',
      print_surface: 'EMAYE',
      varnish: 'BELİRTİLMEMİŞ',
      lacquer: 'LAKLI',
      inside_coating: 'STANDART',
      colors: ['C', 'M', 'Y', 'K'],
      special_parameter: '',
      is_active: true,
      record_kind: 'manual',
      catalog_verified: false
    };
  } else {
    const existing = state.technicalProducts.find(p => p.id === productId || p.stock_code === productId);
    if (existing) {
      state.editingProduct = JSON.parse(JSON.stringify(existing));
      const inCat = state.stockCatalog.find(c => c.stock_code === existing.stock_code);
      state.editingProduct.catalog_verified = !!inCat;
    }
  }
  state.isProductModalOpen = true;
  renderApp();
}

function closeProductModal() {
  state.isProductModalOpen = false;
  state.editingProduct = null;
  renderApp();
}

function onStockCodeChange(val) {
  if (!state.editingProduct) return;
  const cleanCode = (val || '').trim();
  state.editingProduct.stock_code = cleanCode;

  const found = state.stockCatalog.find(c => c.stock_code === cleanCode);
  if (found) {
    state.editingProduct.stock_name = found.stock_name;
    state.editingProduct.catalog_verified = true;
    if (found.tube_size && !state.editingProduct.id) {
      onProductSizeChange(found.tube_size);
    }
  } else {
    state.editingProduct.catalog_verified = false;
    if (!state.editingProduct.id) {
      state.editingProduct.stock_name = cleanCode ? 'Taslak Ürün - ERP Eşleşmesi Bekliyor' : '';
    }
  }
  renderApp();
}

function onProductSizeChange(sizeVal) {
  if (!state.editingProduct) return;
  state.editingProduct.tube_size = sizeVal;
  const cap = state.capacities.find(c => c.tube_size === sizeVal);
  const parts = sizeVal.split('x');
  if (parts.length === 2) {
    state.editingProduct.diameter_mm = parseInt(parts[0], 10) || 52;
    state.editingProduct.height_mm = parseInt(parts[1], 10) || 195;
  }
  // Ham levha adayı bul
  const matchingSheet = state.rawSheets.find(r => r.tube_size === sizeVal);
  if (matchingSheet) {
    state.editingProduct.raw_sheet_code = matchingSheet.stock_code;
    state.editingProduct.raw_sheet_desc = matchingSheet.stock_name;
  }
  renderApp();
}

function toggleColorInEditingProduct(colorCode) {
  if (!state.editingProduct) return;
  const cols = state.editingProduct.colors || [];
  if (cols.includes(colorCode)) {
    state.editingProduct.colors = cols.filter(c => c !== colorCode);
  } else {
    if (cols.length >= 8) {
      alert('En fazla 8 renk seçilebilir (Varsayılan sınır 6 benzersiz renktir).');
      return;
    }
    state.editingProduct.colors = [...cols, colorCode];
  }
  renderApp();
}

function addCustomPantoneToEditingProduct() {
  const input = document.getElementById('custom_pantone_input');
  if (!input) return;
  const val = input.value.trim().toUpperCase();
  if (!val) return;
  const colorCode = val.endsWith('C') ? val : val + 'C';
  toggleColorInEditingProduct(colorCode);
  input.value = '';
}

async function saveProductForm() {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü kart oluşturamaz veya düzenleyemez.');
    return;
  }
  const p = state.editingProduct;
  if (!p) return;

  if (!p.stock_code || !p.stock_code.trim()) {
    alert('Hata: Stok kodu zorunludur!');
    return;
  }

  if (!p.raw_sheet_code) {
    alert('Hata: Onaylı ham levha seçimi zorunludur!');
    return;
  }

  // Ham levha ebat kontrolü
  const selSheet = state.rawSheets.find(r => r.stock_code === p.raw_sheet_code);
  if (selSheet && selSheet.tube_size !== p.tube_size) {
    const confirmMismatch = confirm(
      `Uyarı: Seçilen ham levha ebadı (${selSheet.tube_size}), ürün ebadı (${p.tube_size}) ile uyuşmuyor!\nReçete uyuşmazlığı üretim onayı engelleyebilir.\nYine de devam etmek istiyor musunuz?`
    );
    if (!confirmMismatch) return;
  }

  const isNew = !p.id || !state.technicalProducts.some(x => x.stock_code === p.stock_code.trim());
  const payload = {
    stock_code: p.stock_code.trim(),
    tube_size: p.tube_size,
    raw_sheet_code: p.raw_sheet_code,
    print_surface: p.print_surface || 'EMAYE',
    varnish: p.varnish || 'BELİRTİLMEMİŞ',
    lacquer: p.lacquer || 'BILINMIYOR',
    inside_coating: p.inside_coating || 'BELİRTİLMEMİŞ',
    colors: p.colors || ['C', 'M', 'Y', 'K'],
    special_parameter: p.special_parameter || '',
    is_active: p.is_active !== false,
    version: p.version || 1
  };

  try {
    let result;
    if (isNew) {
      result = await apiRequest('/api/definitions/products', {
        method: 'POST',
        body: payload
      });
      alert(`✅ Teknik kart başarıyla PostgreSQL\'e kaydedildi: ${payload.stock_code}`);
    } else {
      result = await apiRequest('/api/definitions/products/' + encodeURIComponent(payload.stock_code), {
        method: 'PUT',
        body: payload
      });
      alert(`✅ Teknik kart başarıyla güncellendi: ${payload.stock_code} (v${result.data?.version || ''})`);
    }

    const prodRes = await apiRequest('/api/definitions/products');
    if (prodRes && Array.isArray(prodRes.data)) {
      state.technicalProducts = prodRes.data;
    }
    const auditRes = await apiRequest('/api/audit-logs');
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }
    closeProductModal();
  } catch (err) {
    console.error('Kayıt hatası:', err);
    if (err.code === 'ESZAMANLI_DUZENLEME_CAKISMASI') {
      alert(`⚠️ Eşzamanlı Düzenleme Çakışması:\n\n${err.message}\nLütfen sayfayı yenileyip güncel veriyi inceleyiniz.`);
    } else if (err.code === 'YETKISIZ_ISLEM') {
      alert(`🚫 Yetkisiz İşlem:\n\n${err.message}`);
    } else {
      alert(`❌ Kayıt Başarısız:\n\n${err.message}`);
    }
  }
}


async function toggleTechnicalProductActive(productId) {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü kart durumunu değiştiremez.');
    return;
  }
  const item = state.technicalProducts.find(p => p.id === productId || p.stock_code === productId);
  if (!item) return;

  try {
    const res = await apiRequest('/api/definitions/products/' + encodeURIComponent(item.stock_code) + '/toggle-active', {
      method: 'PATCH'
    });
    if (res && res.data) {
      item.is_active = res.data.is_active;
    }
    const auditRes = await apiRequest('/api/audit-logs').catch(() => null);
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }
    renderApp();
  } catch (err) {
    alert('Kart durumu değiştirilemedi: ' + err.message);
  }
}

async function deleteTechnicalProduct(productId) {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü teknik kart silemez.');
    return;
  }
  const item = state.technicalProducts.find(p => p.id === productId || p.stock_code === productId);
  if (!item) return;

  if (!confirm(`"${item.stock_code} - ${item.stock_name}" teknik kartını silmek istediğinizden emin misiniz?`)) {
    return;
  }

  try {
    await apiRequest('/api/definitions/products/' + encodeURIComponent(item.stock_code), {
      method: 'DELETE'
    });
    alert(`✅ "${item.stock_code}" teknik kartı kalıcı olarak silindi.`);

    const prodRes = await apiRequest('/api/definitions/products');
    if (prodRes && Array.isArray(prodRes.data)) {
      state.technicalProducts = prodRes.data;
    }
    const auditRes = await apiRequest('/api/audit-logs');
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }
    renderApp();
  } catch (err) {
    console.error('Silme hatası:', err);
    if (err.code === 'REFERANS_BUTUNLUGU_ENGELI') {
      alert(`🚫 Referans Bütünlüğü Koruması:\n\n${err.message}\n\nGeçmiş ve mevcut planların bozulmaması için lütfen silmek yerine "Pasife Al" özelliğini kullanınız.`);
    } else if (err.code === 'YETKISIZ_ISLEM') {
      alert(`🚫 Yetkisiz İşlem:\n\n${err.message}`);
    } else {
      alert(`❌ Silme işlemi başarısız:\n\n${err.message}`);
    }
  }
}


// ------------------------------------------------------------------------------
// EXCEL İÇE AKTARMA (IMPORT) MOTORU
// ------------------------------------------------------------------------------

function openImportModal() {
  if (state.currentRole === 'viewer') return;
  state.isImportModalOpen = true;
  state.importStep = 1;
  state.importRawData = '';
  state.importParsedRows = [];
  state.importValidation = null;
  state.importPolicy = 'all';
  renderApp();
}

function closeImportModal() {
  state.isImportModalOpen = false;
  state.importStep = 1;
  state.importRawData = '';
  state.importParsedRows = [];
  state.importValidation = null;
  renderApp();
}

function downloadSampleTemplate() {
  const token = state.sessionToken || 'token_admin_session_v2c';
  const url = '/api/definitions/import/template?token=' + encodeURIComponent(token);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Teneke_Teknik_Kart_Sablonu.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function handleExcelFileInput(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  try {
    const buffer = await file.arrayBuffer();
    const token = state.sessionToken || 'token_admin_session_v2c';
    const response = await fetch('/api/definitions/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': 'Bearer ' + token,
        'X-Session-Token': token
      },
      body: buffer
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      alert('Excel dosyası doğrulama hatası:\n\n' + (data.error?.message || response.statusText));
      return;
    }

    state.importValidation = data.data;
    state.importStep = 3;
    renderApp();
  } catch (err) {
    alert('Dosya okunamadı veya sunucuya gönderilemedi: ' + err.message);
  }
}

async function startLocalStorageMigration() {
  const localItems = JSON.parse(localStorage.getItem('tp_technical_products_v2')) || [];
  if (localItems.length === 0) {
    alert('Tarayıcı hafızasında (localStorage) kayıtlı yerel teknik kart bulunamadı.');
    return;
  }

  try {
    const previewRes = await apiRequest('/api/migration/localstorage/preview', {
      method: 'POST',
      body: { technicalProducts: localItems }
    });

    const p = previewRes.data;
    const msg = 'Tarayıcı Veri Önizlemesi:\n\n' +
      '• Tarayıcıdaki Toplam Kart: ' + p.clientCount + '\n' +
      '• Veritabanındaki Mevcut Kart: ' + p.dbCount + '\n' +
      '• Veritabanına Eklenecek Yeni Kart: ' + p.newInClient.length + '\n' +
      '• Zaten DB\'de Bulunan: ' + p.existingInDb.length + '\n\n' +
      (p.newInClient.length > 0
        ? (p.newInClient.length + ' yeni kartı PostgreSQL veritabanına aktarmak istiyor musunuz?')
        : 'Tüm tarayıcı kayıtları zaten veritabanında mevcuttur.');

    if (p.newInClient.length === 0) {
      alert(msg);
      return;
    }

    if (!confirm(msg)) return;

    const applyRes = await apiRequest('/api/migration/localstorage/apply', {
      method: 'POST',
      body: { itemsToMigrate: p.newInClient }
    });

    alert('✅ Başarılı: ' + (applyRes.data?.migratedCount || p.newInClient.length) + ' adet teknik kart veritabanına aktarıldı.');

    const prodRes = await apiRequest('/api/definitions/products');
    if (prodRes && Array.isArray(prodRes.data)) {
      state.technicalProducts = prodRes.data;
    }
    const auditRes = await apiRequest('/api/audit-logs');
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }
    renderApp();
  } catch (err) {
    alert('Veri taşıma başarısız: ' + err.message);
  }
}


function loadSampleImportData() {
  const lines = [
    'Stok Kodu\tStok İsmi\tHam Levha kodu\tBoy ve Çap\tBaskı Yüzeyi\tVernik\tLak\tİç Kaplama\tRenk1\tRenk2\tRenk3\tRenk4\tRenk5\tRenk6\tParametre 1',
    '511109010410-1102\tTUP-GW MOBILYA 300 ml (52x214)-LEMON\tHAM LEVHA-017x832x875- (T 61) -52x214\t52x214\tMETALİK\tKISMİ\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t1225C\t\tKaynak Transkripsiyonu',
    '511109010410-7026\tTUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT\tHAM LEVHA-017x832x875- (T 61) -52x214\t52x214\tMETALİK\tKISMİ\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t1225C\t\tKaynak Transkripsiyonu',
    '511109010910-1007\tTUP-ROOMSTAR YEDEK SPR 260 ml (65x104)-LAVENDER\tHAM LEVHA-017x835x864- (T 61) -65x104\t65x104\tEMAYE\tPARLAK\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t2665C\t\tKaynak Transkripsiyonu',
    '511109010910-7284\tTUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST\tHAM LEVHA-017x832x720- (T 61) -52x234\t52x234\tEMAYE\tPARLAK\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t368C\t357C\tKaynak Transkripsiyonu',
    '511109010910-1004\tTUP-SOFT ODA SPR 300 ml (52x195)-LILAC\tHAM LEVHA-017x832x800- (T 61) -52x195\t52x195\tEMAYE\tBELİRTİLMEMİŞ\tBELİRTİLMEMİŞ\tGOLD\tC\tM\tY\tK\t\t\tSOFT Sipariş Formu',
    '\tTUP-GECERSIZ-KART-KODSUZ\tHAM LEVHA-017x832x800- (T 61) -52x195\t52x195\tEMAYE\tPARLAK\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t\t\tHATA TESTİ (Stok Kodu Yok)',
    '519999010999-TEST\tTUP-TANIMSIZ-LEVHA\tHAM LEVHA-BILINMEYEN-EBAT-999x999\t52x195\tEMAYE\tPARLAK\tLAKLI\tBELİRTİLMEMİŞ\tC\tM\tY\tK\t\t\tHATA TESTİ (Levha Eşleşmedi)'
  ];
  state.importRawData = lines.join('\n');
  renderApp();
}

async function processImportStep1() {
  const textarea = document.getElementById('import_textarea');
  if (textarea) {
    state.importRawData = textarea.value.trim();
  }

  if (!state.importRawData) {
    alert('Lütfen bir Excel (.xlsx / .xlsm) dosyası yükleyin veya TSV/CSV metni yapıştırın!');
    return;
  }

  try {
    const token = state.sessionToken || 'token_admin_session_v2c';
    const response = await fetch('/api/definitions/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Session-Token': token
      },
      body: JSON.stringify({ rawText: state.importRawData })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      alert('Doğrulama hatası:\n\n' + (data.error?.message || response.statusText));
      return;
    }

    state.importValidation = data.data;
    state.importStep = 3;
    renderApp();
  } catch (err) {
    alert('Sunucu isteği başarısız: ' + err.message);
  }
}


function processImportStep2() {
  // Validate rows against business rules & catalogue
  const validRows = [];
  let newCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  state.importParsedRows.forEach((r, idx) => {
    // Column lookups
    const stockCode = (r['Stok Kodu'] || r['stok_kodu'] || r['StokKodu'] || r['STOK KODU'] || '').trim();
    const stockName = (r['Stok İsmi'] || r['stok_adi'] || r['Stok Adı'] || r['STOK ISMI'] || '').trim();
    const rawSheetInput = (r['Ham Levha kodu'] || r['Ham Levha Kodu'] || r['ham_levha'] || r['HAM LEVHA'] || '').trim();
    const tubeSize = (r['Boy ve Çap'] || r['Ebat'] || r['tube_size'] || r['EBAT'] || '52x195').trim();
    const printSurface = (r['Baskı Yüzeyi'] || r['Zemin'] || r['print_surface'] || 'EMAYE').trim().toUpperCase();
    const varnish = (r['Vernik'] || r['varnish'] || 'BELİRTİLMEMİŞ').trim();
    let lacquer = (r['Lak'] || r['lacquer'] || 'BILINMIYOR').trim().toUpperCase();
    const insideCoating = (r['İç Kaplama'] || r['inside_coating'] || 'BELİRTİLMEMİŞ').trim();
    const param1 = (r['Parametre 1'] || r['Özel Parametre'] || r['notes'] || '').trim();

    // Renkler
    const colors = [];
    ['Renk1', 'Renk2', 'Renk3', 'Renk4', 'Renk5', 'Renk6', 'Renk 1', 'Renk 2', 'Renk 3', 'Renk 4', 'Renk 5', 'Renk 6'].forEach(rk => {
      if (r[rk] && r[rk].trim()) {
        const cVal = r[rk].trim().toUpperCase();
        if (!colors.includes(cVal)) colors.push(cVal);
      }
    });
    if (colors.length === 0) {
      ['C', 'M', 'Y', 'K'].forEach(c => colors.push(c));
    }

    // DOĞRULAMA 1: Stok Kodu Zorunluluğu (Kabul Koşulu 1)
    if (!stockCode) {
      validRows.push({
        status: 'ERROR',
        error_message: 'Stok kodu boş olamaz (Kabul Koşulu 1)',
        raw_row: r,
        item: null
      });
      errorCount++;
      return;
    }

    // DOĞRULAMA 2: Ham Levha Açık Kod / Açıklama Eşlemesi (Kabul Koşulu 4)
    let matchedRawSheet = null;
    if (rawSheetInput) {
      // Önce doğrudan stok kodu
      matchedRawSheet = state.rawSheets.find(s => s.stock_code === rawSheetInput);
      // Bulunamazsa isim/açıklama ve ebat üzerinden açık tekil eşleme
      if (!matchedRawSheet) {
        const candidates = state.rawSheets.filter(s => s.stock_name.includes(rawSheetInput) || rawSheetInput.includes(s.stock_name) || s.tube_size === tubeSize);
        if (candidates.length === 1) {
          matchedRawSheet = candidates[0];
        } else if (candidates.length > 1) {
          const sizeMatch = candidates.find(c => c.tube_size === tubeSize);
          if (sizeMatch) matchedRawSheet = sizeMatch;
        }
      }
    }

    if (!matchedRawSheet) {
      validRows.push({
        status: 'ERROR',
        error_message: `Ham levha açıklaması katalogla eşleşmedi: "${rawSheetInput}" (Kabul Koşulu 4)`,
        raw_row: r,
        item: { stock_code: stockCode, stock_name: stockName, tube_size: tubeSize }
      });
      errorCount++;
      return;
    }

    // Lak sözlüğü kontrolü
    if (!['LAKLI', 'LAKSIZ', 'BILINMIYOR'].includes(lacquer)) {
      lacquer = 'BILINMIYOR';
    }

    // ERP Stok Kataloğunda Ad Eşleştirme (Kabul Koşulu 2)
    const inCatalog = state.stockCatalog.find(c => c.stock_code === stockCode);
    const finalStockName = inCatalog ? inCatalog.stock_name : (stockName || 'Taslak Ürün - ERP Eşleşmesi Bekliyor');

    // Mevcut kayıt kontrolü
    const exists = state.technicalProducts.find(p => p.stock_code === stockCode);
    const status = exists ? 'UPDATE' : 'NEW';
    if (status === 'NEW') newCount++;
    else updateCount++;

    const item = {
      id: exists ? exists.id : 'TECH-IMP-' + Date.now() + '-' + idx,
      stock_code: stockCode,
      stock_name: finalStockName,
      tube_size: tubeSize,
      diameter_mm: parseInt(tubeSize.split('x')[0], 10) || 52,
      height_mm: parseInt(tubeSize.split('x')[1], 10) || 195,
      raw_sheet_code: matchedRawSheet.stock_code,
      raw_sheet_desc: matchedRawSheet.stock_name,
      print_surface: printSurface || 'EMAYE',
      varnish: varnish || 'BELİRTİLMEMİŞ',
      lacquer: lacquer,
      inside_coating: insideCoating || 'BELİRTİLMEMİŞ',
      colors: colors,
      special_parameter: param1,
      is_active: true,
      record_kind: 'excel_imported',
      catalog_verified: !!inCatalog
    };

    validRows.push({
      status: status,
      item: item,
      raw_row: r,
      is_catalog_match: !!inCatalog
    });
  });

  state.importValidation = {
    total: state.importParsedRows.length,
    newCount,
    updateCount,
    errorCount,
    rows: validRows
  };

  state.importStep = 3;
  renderApp();
}

async function commitImport() {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü içe aktarma yapamaz.');
    return;
  }
  if (!state.importValidation || !state.importValidation.rows) return;

  const policy = state.importPolicy || 'all';

  try {
    const token = state.sessionToken || 'token_admin_session_v2c';
    const response = await fetch('/api/definitions/import/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Session-Token': token
      },
      body: JSON.stringify({
        rows: state.importValidation.rows,
        policy: policy,
        allowPartial: !!state.allowPartialImport
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      alert('İçe aktarma hatası:\n\n' + (data.error?.message || response.statusText));
      return;
    }

    state.importAppliedCount = data.data.appliedCount;
    state.importStep = 4;

    const prodRes = await apiRequest('/api/definitions/products');
    if (prodRes && Array.isArray(prodRes.data)) {
      state.technicalProducts = prodRes.data;
    }
    const auditRes = await apiRequest('/api/audit-logs');
    if (auditRes && Array.isArray(auditRes.data)) {
      state.auditLogs = auditRes.data;
    }

    renderApp();
  } catch (err) {
    alert('Aktarım kaydedilemedi: ' + err.message);
  }
}


function renderTechnical() {
  const isReadOnly = state.currentRole === 'viewer';

  // Products filtering
  let filteredProducts = state.technicalProducts || [];
  if (state.technicalSearchQuery) {
    const q = state.technicalSearchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      (p.stock_code && p.stock_code.toLowerCase().includes(q)) ||
      (p.stock_name && p.stock_name.toLowerCase().includes(q))
    );
  }
  if (state.technicalFilterSize && state.technicalFilterSize !== 'ALL') {
    filteredProducts = filteredProducts.filter(p => p.tube_size === state.technicalFilterSize);
  }
  if (state.technicalFilterSurface && state.technicalFilterSurface !== 'ALL') {
    filteredProducts = filteredProducts.filter(p => p.print_surface === state.technicalFilterSurface);
  }
  if (state.technicalFilterLacquer && state.technicalFilterLacquer !== 'ALL') {
    filteredProducts = filteredProducts.filter(p => p.lacquer === state.technicalFilterLacquer);
  }
  if (state.technicalFilterStatus && state.technicalFilterStatus !== 'ALL') {
    const isActive = state.technicalFilterStatus === 'ACTIVE';
    filteredProducts = filteredProducts.filter(p => p.is_active === isActive);
  }

  return `
    <div class="space-y-4 font-sans">
      <!-- Tab Navigation -->
      <div class="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-xs">
        <button onclick="state.technicalTab='products'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='products'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📦 Tüp Teknik Kartları (${(state.technicalProducts||[]).length})</button>
        <button onclick="state.technicalTab='stock_catalog'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='stock_catalog'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">🗄️ ERP Stok Kataloğu (${(state.stockCatalog||[]).length})</button>
        <button onclick="state.technicalTab='raw_sheets'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='raw_sheets'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📄 Ham Levhalar (14)</button>
        <button onclick="state.technicalTab='dictionaries'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='dictionaries'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📚 Bağımsız Sözlükler</button>
        <button onclick="state.technicalTab='capacities'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='capacities'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📏 Ebat / Kapasite (18)</button>
        <button onclick="state.technicalTab='layouts'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='layouts'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📐 Montaj Görünümü (${state.sheetLayouts.length})</button>
        <button onclick="state.technicalTab='rules'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='rules'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">⚖️ İş Kuralları (${state.businessRules.length})</button>
        <button onclick="state.technicalTab='lines'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='lines'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">🏭 Hat ve Vardiyalar</button>
        <button onclick="state.technicalTab='audit'; renderApp();" class="px-3 py-1.5 rounded transition-colors ${state.technicalTab==='audit'?'bg-sky-600 text-white font-bold shadow-xs':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">🛡️ Denetim İzi (${state.auditLogs.length})</button>
        <button onclick="state.activePage='printing_rules'; renderApp();" class="px-3 py-1.5 rounded text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 font-bold ml-auto">🖨️ Matbaa & Kombinasyon Kuralları ↗</button>
      </div>

      ${state.technicalTab === 'products' ? `
        <!-- Action & Filter Bar -->
        <div class="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-xs">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📦 Tüp Teknik Kartları</span>
                <span class="text-xs font-mono font-normal text-slate-500">(${filteredProducts.length} listeleniyor / ${(state.technicalProducts||[]).length} toplam)</span>
              </div>
              <div class="text-xs text-slate-500 mt-0.5">
                Stok koduna bağlı renk, lak, zemin, iç kaplama ve onaylı ham levha ilişkileri yerel olarak yönetilir. ERP stok adını ezmez.
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                ${isReadOnly ? 'disabled' : ''}
                onclick="startLocalStorageMigration();"
                class="px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono flex items-center gap-1.5 shadow-2xs"
                title="Tarayıcı localStorage içindeki kartları PostgreSQL veritabanına aktar"
              >
                <span>🔄</span> Tarayıcı Verilerini DB'ye Taşı
              </button>
              <button
                ${isReadOnly ? 'disabled' : ''}
                onclick="downloadSampleTemplate();"
                class="px-3 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono flex items-center gap-1.5 shadow-2xs"
                title="Örnek içe aktarma CSV şablonunu indir"
              >
                <span>📄</span> Şablon İndir
              </button>
              <button
                ${isReadOnly ? 'disabled' : ''}
                onclick="openImportModal();"
                class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-colors ${isReadOnly?'cursor-not-allowed opacity-60':''}"
              >
                <span>📥</span> Excel'den İçe Aktar
              </button>
              <button
                ${isReadOnly ? 'disabled' : ''}
                onclick="openProductModal(null);"
                class="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-colors ${isReadOnly?'cursor-not-allowed opacity-60':''}"
              >
                <span>➕</span> Yeni Teknik Kart Ekle
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div class="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Stok kodu veya mamul adı ile ara..."
                value="${state.technicalSearchQuery || ''}"
                oninput="state.technicalSearchQuery=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-sky-500"
              />
            </div>
            <select
              onchange="state.technicalFilterSize=this.value; renderApp();"
              class="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="ALL">Tüm Ebatlar (${state.capacities.length})</option>
              ${state.capacities.map(c => `<option value="${c.tube_size}" ${state.technicalFilterSize===c.tube_size?'selected':''}>${c.tube_size}</option>`).join('')}
            </select>
            <select
              onchange="state.technicalFilterSurface=this.value; renderApp();"
              class="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="ALL">Tüm Zeminler</option>
              <option value="EMAYE" ${state.technicalFilterSurface==='EMAYE'?'selected':''}>EMAYE</option>
              <option value="METALİK" ${state.technicalFilterSurface==='METALİK'?'selected':''}>METALİK</option>
            </select>
            <select
              onchange="state.technicalFilterLacquer=this.value; renderApp();"
              class="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="ALL">Tüm Lak Durumları</option>
              <option value="LAKLI" ${state.technicalFilterLacquer==='LAKLI'?'selected':''}>LAKLI</option>
              <option value="LAKSIZ" ${state.technicalFilterLacquer==='LAKSIZ'?'selected':''}>LAKSIZ</option>
              <option value="BILINMIYOR" ${state.technicalFilterLacquer==='BILINMIYOR'?'selected':''}>BILINMIYOR</option>
            </select>
            <select
              onchange="state.technicalFilterStatus=this.value; renderApp();"
              class="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="ACTIVE" ${state.technicalFilterStatus==='ACTIVE'?'selected':''}>Aktif Kartlar</option>
              <option value="PASSIVE" ${state.technicalFilterStatus==='PASSIVE'?'selected':''}>Pasif Kartlar</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Stok Kodu</th>
                <th class="py-2.5 px-3">Stok Adı (ERP)</th>
                <th class="py-2.5 px-2">Ebat</th>
                <th class="py-2.5 px-3">Onaylı Ham Levha (FK)</th>
                <th class="py-2.5 px-2">Zemin</th>
                <th class="py-2.5 px-2">Vernik</th>
                <th class="py-2.5 px-2">Lak</th>
                <th class="py-2.5 px-2">İç Kaplama</th>
                <th class="py-2.5 px-3">Renkler</th>
                <th class="py-2.5 px-2 text-center">Durum</th>
                <th class="py-2.5 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              ${filteredProducts.length === 0 ? `
                <tr>
                  <td colSpan="11" class="py-8 text-center text-slate-400 font-mono text-xs">
                    Kriterlere uygun teknik kart bulunamadı.
                  </td>
                </tr>
              ` : filteredProducts.map(p => {
                const inCatalog = (state.stockCatalog||[]).find(c => c.stock_code === p.stock_code);
                const rawSheet = state.rawSheets.find(r => r.stock_code === p.raw_sheet_code);
                return `
                  <tr class="hover:bg-slate-50 transition-colors ${!p.is_active ? 'opacity-60 bg-slate-50/50' : ''}">
                    <td class="py-2.5 px-3">
                      <div class="font-mono font-bold text-sky-700">${p.stock_code}</div>
                      <div class="flex items-center gap-1 mt-0.5">
                        ${inCatalog ? `
                          <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ ERP</span>
                        ` : `
                          <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">⚠️ Taslak</span>
                        `}
                        <span class="text-[9px] font-mono text-slate-400">${p.record_kind || 'manual'}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="font-medium text-slate-900">${p.stock_name}</div>
                      ${p.special_parameter ? `<div class="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-xs">${p.special_parameter}</div>` : ''}
                    </td>
                    <td class="py-2.5 px-2 font-mono font-bold text-slate-700">${p.tube_size}</td>
                    <td class="py-2.5 px-3">
                      <div class="font-mono text-xs text-slate-800 font-semibold">${p.raw_sheet_code}</div>
                      <div class="text-[10px] font-mono text-slate-500 truncate max-w-xs">
                        ${rawSheet ? `${rawSheet.width_mm}x${rawSheet.height_mm} mm (${rawSheet.thickness_source_value/100}mm)` : (p.raw_sheet_desc || 'Katalogda eşleşmemiş')}
                      </div>
                    </td>
                    <td class="py-2.5 px-2 font-mono text-[10px] font-bold text-slate-700">${p.print_surface || 'EMAYE'}</td>
                    <td class="py-2.5 px-2 font-mono text-slate-600">${p.varnish || 'BELİRTİLMEMİŞ'}</td>
                    <td class="py-2.5 px-2">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        p.lacquer === 'LAKLI' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                        p.lacquer === 'LAKSIZ' ? 'bg-sky-50 text-sky-800 border border-sky-300' :
                        'bg-amber-50 text-amber-800 border border-amber-300'
                      }">
                        ${p.lacquer || 'BILINMIYOR'}
                      </span>
                    </td>
                    <td class="py-2.5 px-2">
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        p.inside_coating === 'GOLD' ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }">
                        ${p.inside_coating || 'BELİRTİLMEMİŞ'}
                      </span>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="flex flex-wrap gap-1">
                        ${(p.colors || []).map(renderColorChip).join('')}
                      </div>
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <button
                        ${isReadOnly ? 'disabled' : ''}
                        onclick="toggleTechnicalProductActive('${p.id || p.stock_code}');"
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.is_active ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                          'bg-slate-100 text-slate-400 border border-slate-300'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}"
                        title="Aktif/Pasif durumunu değiştir"
                      >
                        ${p.is_active ? 'AKTİF' : 'PASİF'}
                      </button>
                    </td>
                    <td class="py-2.5 px-3 text-right">
                      <div class="inline-flex items-center gap-1 font-mono text-xs">
                        <button
                          ${isReadOnly ? 'disabled' : ''}
                          onclick="openProductModal('${p.id || p.stock_code}');"
                          class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                          title="Düzenle"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          ${isReadOnly ? 'disabled' : ''}
                          onclick="deleteTechnicalProduct('${p.id || p.stock_code}');"
                          class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-medium transition-colors"
                          title="Sil (Referans Bütünlüğü Korumalı)"
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : state.technicalTab === 'stock_catalog' ? `
        <!-- ERP Master Catalog Tab -->
        <div class="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-xs">
          <div class="flex items-start gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900">
            <span class="text-base select-none">ℹ️</span>
            <div>
              <div class="font-bold">ERP Stok Kataloğu Veri Sahipliği Kuralı (Faz 2C & Faz 3A)</div>
              <div class="text-[11px] text-sky-800 mt-0.5">
                Stok kodu, stok adı, kategori ve temel birim ERP senkronunun (MikroDesktop_LIDER26) kontrolündedir ve salt okunurdur.
                Uygulama ERP ana kartını silemez veya stok adını ezemez. Renk, lak, zemin ve ham levha ilişkileri "Tüp Teknik Kartları" sekmesinde yönetilir.
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="text-xs font-mono font-bold text-slate-700">
              ERP Senkron Stok Kayıtları (${(state.stockCatalog||[]).length} Kart)
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Kaynak: MikroDesktop_LIDER26 (Salt Okunur)
            </span>
          </div>

          <div class="overflow-hidden border border-slate-200 rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                  <th class="py-2.5 px-3">Stok Kodu</th>
                  <th class="py-2.5 px-3">Stok Adı (ERP)</th>
                  <th class="py-2.5 px-2">Kategori</th>
                  <th class="py-2.5 px-2">Birim</th>
                  <th class="py-2.5 px-2">Ölçü / Boyut</th>
                  <th class="py-2.5 px-3">Kaynak Sistem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono">
                ${(state.stockCatalog||[]).map(c => `
                  <tr class="hover:bg-slate-50">
                    <td class="py-2 px-3 font-bold text-sky-700">${c.stock_code}</td>
                    <td class="py-2 px-3 font-sans font-medium text-slate-900">${c.stock_name}</td>
                    <td class="py-2 px-2">
                      <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${c.category==='Ham Levha'?'bg-amber-50 text-amber-800 border border-amber-200':'bg-sky-50 text-sky-800 border border-sky-200'}">
                        ${c.category}
                      </span>
                    </td>
                    <td class="py-2 px-2 text-slate-600 font-bold">${c.unit}</td>
                    <td class="py-2 px-2 text-slate-700">${c.dimensions || c.tube_size}</td>
                    <td class="py-2 px-3 text-slate-500 text-[11px] font-sans">${c.source_system}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : state.technicalTab === 'dictionaries' ? `
        <!-- Dictionaries Tab -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Zemin Sözlüğü -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>🎨</span> Baskı Yüzeyi / Zemin Sözlüğü
              </div>
              <span class="text-[10px] font-mono text-slate-500">2 Tanımlı</span>
            </div>
            <div class="space-y-2 text-xs font-mono">
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-900">EMAYE</div>
                  <div class="text-[11px] text-slate-500 font-sans">Beyaz zemin boyası uygulanmış teneke yüzeyi</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">Aktif</span>
              </div>
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-900">METALİK</div>
                  <div class="text-[11px] text-slate-500 font-sans">Doğal sac yüzeyine şeffaf vernik zemin</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">Aktif</span>
              </div>
            </div>
            <div class="text-[10px] text-slate-500 font-sans italic border-t border-slate-100 pt-2">
              ⚠️ Emaye ve metalik zeminler farklı baskı hattı ve hazırlık gerektirdiğinden aynı montajda birleştirilemez (KRL-ZEMIN-01).
            </div>
          </div>

          <!-- Lak Durumları Sözlüğü -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>🛡️</span> Lak Durumları Sözlüğü
              </div>
              <span class="text-[10px] font-mono text-slate-500">3 Tanımlı</span>
            </div>
            <div class="space-y-2 text-xs font-mono">
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-emerald-800">LAKLI</div>
                  <div class="text-[11px] text-slate-500 font-sans">Ekstra lak uygulanmış yüzey (Kurutma fırını şartı)</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">Aktif</span>
              </div>
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-sky-800">LAKSIZ</div>
                  <div class="text-[11px] text-slate-500 font-sans">Standart laksız yüzey işlemi</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">Aktif</span>
              </div>
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-amber-800">BILINMIYOR</div>
                  <div class="text-[11px] text-slate-500 font-sans">Boş/belirsiz lak durumu (Otomatik laklı sayılmaz!)</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">Onay Bekler</span>
              </div>
            </div>
            <div class="text-[10px] text-slate-500 font-sans italic border-t border-slate-100 pt-2">
              ⚠️ Kesin Kural: Laklı ve Laksız ürünler aynı montaja giremez. Boş değer otomatik onaylanmaz.
            </div>
          </div>

          <!-- İç Kaplama Sözlüğü -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>🥫</span> İç Kaplama Sözlüğü (Bağımsız Alan)
              </div>
              <span class="text-[10px] font-mono text-slate-500">4 Tanımlı</span>
            </div>
            <div class="space-y-2 text-xs font-mono">
              <div class="p-2.5 rounded bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-amber-900">GOLD (İçi Gold)</div>
                  <div class="text-[11px] text-amber-800 font-sans">Korozyon koruyucu sarı altın astar (SOFT vb.)</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">Özel</span>
              </div>
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-800">ŞEFFAF</div>
                  <div class="text-[11px] text-slate-500 font-sans">Standart şeffaf koruyucu kaplama</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Standart</span>
              </div>
              <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="font-bold text-slate-800">STANDART</div>
                  <div class="text-[11px] text-slate-500 font-sans">Kaplamasız teneke sac içi</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Standart</span>
              </div>
            </div>
            <div class="text-[10px] text-slate-500 font-sans italic border-t border-slate-100 pt-2">
              ⚠️ Kesin Kural: "İçi GOLD" bilgisi iç kaplama alanında tutulur, dış lak veya vernik verilerini ezmez.
            </div>
          </div>

          <!-- Renkler Kataloğu -->
          <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>🌈</span> Proses & Pantone Renk Kataloğu
              </div>
              <span class="text-[10px] font-mono text-slate-500">11 Tanımlı Renk</span>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-mono">
              ${(state.dictionaries?.colors || []).map(c => `
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
                  <span class="w-3.5 h-3.5 rounded-full border border-black/10 shadow-inner flex-shrink-0" style="background-color: ${c.hex};"></span>
                  <span class="font-bold text-slate-800">${c.code}</span>
                  <span class="text-[10px] text-slate-500 font-sans">${c.name}</span>
                </div>
              `).join('')}
            </div>
            <div class="text-[10px] text-slate-500 font-sans italic border-t border-slate-100 pt-2">
              ⚠️ Montaj kuralı: Bir montajda yer alan ürünlerin benzersiz renk birleşimi en fazla 6 olmalıdır.
            </div>
          </div>
        </div>
      ` : state.technicalTab === 'layouts' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-3">
          <div class="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            Kullanıcı tanımlı montaj kalıp düzenleri. Kapasite hesaplanmaz; satır × sütun tutarlılığı denetlenir.
          </div>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Ebat</th>
                <th class="py-2.5 px-3">Ham Levha Kodu</th>
                <th class="py-2.5 px-2 text-center">Düzen (Satır × Sütun)</th>
                <th class="py-2.5 px-2 text-center">Toplam Yuva</th>
                <th class="py-2.5 px-2 text-center">Hazır Kapasite</th>
                <th class="py-2.5 px-2">Tutarlılık</th>
                <th class="py-2.5 px-2">Yön / Hücre Sırası</th>
                <th class="py-2.5 px-2">Durum</th>
                <th class="py-2.5 px-3">Notlar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              ${state.sheetLayouts.map(l => {
                const cap = state.capacities.find(c => c.tube_size === l.tube_size)?.units_per_sheet || 0;
                const slots = l.rows * l.cols;
                const isMatch = slots === cap;
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="py-2.5 px-3 font-bold text-slate-900">${l.tube_size}</td>
                    <td class="py-2.5 px-3 text-slate-600">${l.raw_sheet_code}</td>
                    <td class="py-2.5 px-2 text-center font-bold text-slate-800">${l.rows} × ${l.cols}</td>
                    <td class="py-2.5 px-2 text-center font-bold text-sky-700">${slots} Yuva</td>
                    <td class="py-2.5 px-2 text-center text-slate-600">${cap} Tüp</td>
                    <td class="py-2.5 px-2 font-sans">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isMatch?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-rose-50 text-rose-800 border border-rose-300'}">
                        ${isMatch?'Tam Uyumlu':'Uyuşmazlık!'}
                      </span>
                    </td>
                    <td class="py-2.5 px-2 text-[11px] text-slate-600">${l.orientation==='landscape'?'Yatay':'Dikey'} / ${l.cell_order==='row_major'?'Satır':'Sütun'}</td>
                    <td class="py-2.5 px-2 font-sans">
                      <span class="px-1.5 py-0.5 rounded text-[10px] ${l.verification_status==='verified'?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-amber-50 text-amber-800 border border-amber-300'}">
                        ${l.verification_status==='verified'?'Doğrulanmış':'Geçici Taslak'}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 font-sans text-slate-500 text-[11px]">${l.notes}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : state.technicalTab === 'rules' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Kod</th>
                <th class="py-2.5 px-3">Kural Başlığı</th>
                <th class="py-2.5 px-2">Kapsam</th>
                <th class="py-2.5 px-2">Koşul & Operatör</th>
                <th class="py-2.5 px-2">Parametre</th>
                <th class="py-2.5 px-2">Kural Türü</th>
                <th class="py-2.5 px-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              ${state.businessRules.map(r => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-mono font-bold text-slate-900">${r.code}</td>
                  <td class="py-2.5 px-3 font-semibold text-slate-800">${r.title}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-600">${r.scope}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-700">${r.condition_field} : <b>${r.operator}</b></td>
                  <td class="py-2.5 px-2 font-mono font-bold text-sky-800">${r.parameter_value}</td>
                  <td class="py-2.5 px-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${r.rule_type==='strict_block'?'bg-rose-50 text-rose-800 border border-rose-300':r.rule_type==='requires_approval'?'bg-amber-50 text-amber-800 border border-amber-300':'bg-slate-100 text-slate-700'}">
                      ${r.rule_type==='strict_block'?'Kesin Engel':r.rule_type==='requires_approval'?'Onay Gerekir':'Tercih'}
                    </span>
                  </td>
                  <td class="py-2.5 px-2 text-center">
                    <button
                      ${isReadOnly || state.currentRole !== 'admin' ? 'disabled' : ''}
                      onclick="state.businessRules=state.businessRules.map(x=>x.id==='${r.id}'?{...x, is_active:!x.is_active}:x); logAudit('business_rule', '${r.id}', 'update', 'Kural aktifliği değiştirildi'); renderApp();"
                      class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.is_active?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-slate-100 text-slate-400 border border-slate-300'} ${isReadOnly||state.currentRole!=='admin'?'cursor-not-allowed opacity-60':''}"
                    >
                      ${r.is_active?'AKTİF':'PASİF'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : state.technicalTab === 'lines' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Hat Kodu</th>
                <th class="py-2.5 px-3">Hat Tanımı</th>
                <th class="py-2.5 px-2">Hat Türü</th>
                <th class="py-2.5 px-3">Desteklenen Ebatlar</th>
                <th class="py-2.5 px-2 text-center">Vardiya / Gün</th>
                <th class="py-2.5 px-2 text-right">Hız (Adet/Saat)</th>
                <th class="py-2.5 px-2 text-right">Fire Payı</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              ${state.productionLines.map(l => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-bold text-sky-700">${l.code}</td>
                  <td class="py-2.5 px-3 font-sans font-medium text-slate-900">${l.name}</td>
                  <td class="py-2.5 px-2 font-sans">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${l.line_type==='print_press'?'bg-purple-50 text-purple-800 border border-purple-300':'bg-sky-50 text-sky-800 border border-sky-300'}">
                      ${l.line_type==='print_press'?'Ofset Matbaa':'Tüp Gövde Hattı'}
                    </span>
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="flex flex-wrap gap-1">
                      ${l.supported_tube_sizes.map(s => `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">${s}</span>`).join('')}
                    </div>
                  </td>
                  <td class="py-2.5 px-2 text-center font-bold text-slate-800">${l.shifts_per_day} Vardiya</td>
                  <td class="py-2.5 px-2 text-right font-bold text-slate-900">${formatNum(l.speed_units_per_hour)}</td>
                  <td class="py-2.5 px-2 text-right text-amber-700 font-bold">%${l.waste_rate_percent}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : state.technicalTab === 'audit' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Zaman</th>
                <th class="py-2.5 px-3">Kullanıcı & Rol</th>
                <th class="py-2.5 px-2">Varlık</th>
                <th class="py-2.5 px-2">İşlem</th>
                <th class="py-2.5 px-3">Açıklama / Değişiklik Detayı</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
              ${state.auditLogs.map(a => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2 px-3 text-slate-500 whitespace-nowrap">${a.timestamp}</td>
                  <td class="py-2 px-3 font-sans">
                    <span class="font-semibold text-slate-900">${a.user_name}</span>
                    <span class="text-[10px] text-slate-500">(${a.user_role})</span>
                  </td>
                  <td class="py-2 px-2 text-sky-800 font-bold">${a.entity_type}</td>
                  <td class="py-2 px-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      a.action==='create'?'bg-emerald-50 text-emerald-800 border border-emerald-300':
                      a.action==='update'?'bg-sky-50 text-sky-800 border border-sky-300':
                      a.action==='import'?'bg-purple-50 text-purple-800 border border-purple-300':
                      'bg-rose-50 text-rose-800 border border-rose-300'
                    }">
                      ${a.action}
                    </span>
                  </td>
                  <td class="py-2 px-3 font-sans text-slate-700">${a.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : state.technicalTab === 'raw_sheets' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Kısa Kod</th>
                <th class="py-2.5 px-3">Stok Kodu</th>
                <th class="py-2.5 px-3">Ham Levha Tanımı</th>
                <th class="py-2.5 px-2 text-right">Genişlik (mm)</th>
                <th class="py-2.5 px-2 text-right">Yükseklik (mm)</th>
                <th class="py-2.5 px-2 text-right">Kalınlık</th>
                <th class="py-2.5 px-2">Kalite</th>
                <th class="py-2.5 px-2">Bağlı Tüp Ebadı</th>
                <th class="py-2.5 px-2 text-right">Min. Baskı</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              ${state.rawSheets.map(s => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-bold text-sky-700">${s.short_name}</td>
                  <td class="py-2.5 px-3 font-bold text-slate-800">${s.stock_code}</td>
                  <td class="py-2.5 px-3 font-sans font-medium text-slate-900">${s.stock_name}</td>
                  <td class="py-2.5 px-2 text-right font-bold text-slate-800">${s.width_mm}</td>
                  <td class="py-2.5 px-2 text-right font-bold text-slate-800">${s.height_mm}</td>
                  <td class="py-2.5 px-2 text-right text-slate-600">${s.thickness_source_value / 100} mm</td>
                  <td class="py-2.5 px-2 font-sans">
                    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">${s.grade_source}</span>
                  </td>
                  <td class="py-2.5 px-2 font-bold text-indigo-700">${s.tube_size}</td>
                  <td class="py-2.5 px-2 text-right text-slate-500 font-sans text-[11px]">
                    ${s.minimum_print_sheets_source ? `${formatNum(s.minimum_print_sheets_source)} Levha` : '<span class="text-slate-400 font-mono">1.250 (Varsayılan)</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <!-- Capacities tab -->
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Ebat</th>
                <th class="py-2.5 px-2 text-right">Kapasite (Tüp/Levha)</th>
                <th class="py-2.5 px-2 text-right">Montaj Grubu</th>
                <th class="py-2.5 px-2 text-right">Ürün Tekrar Adımı</th>
                <th class="py-2.5 px-2">Formül / Eşitlik</th>
                <th class="py-2.5 px-2 text-right">Grup Başı Tüp</th>
                <th class="py-2.5 px-2 text-right">Tek Çeşit Sipariş (Adet)</th>
                <th class="py-2.5 px-3 font-sans">Kayıt Türü</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${state.capacities.map(c => {
                const formulaValid = (c.assembly_group_count * c.repeat_step) === c.units_per_sheet;
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="py-2.5 px-3 font-bold text-sky-800 text-sm">${c.tube_size}</td>
                    <td class="py-2.5 px-2 text-right font-black text-slate-900">${c.units_per_sheet}</td>
                    <td class="py-2.5 px-2 text-right font-bold text-slate-700">${c.assembly_group_count} Grup</td>
                    <td class="py-2.5 px-2 text-right font-bold text-indigo-700">${c.repeat_step} Adım</td>
                    <td class="py-2.5 px-2 font-sans">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${formulaValid?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-rose-50 text-rose-800 border border-rose-300'}">
                        ${c.assembly_group_count} × ${c.repeat_step} = ${c.units_per_sheet} ${formulaValid?'✓':''}
                      </span>
                    </td>
                    <td class="py-2.5 px-2 text-right text-slate-600">${formatNum(c.quantity_source)}</td>
                    <td class="py-2.5 px-2 text-right font-bold text-slate-900">${formatNum(c.single_variety_order_quantity_source)}</td>
                    <td class="py-2.5 px-3 font-sans">
                      <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px]">Kaynak Tablo</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ------------------------------------------------------------------------------
// MODAL: TÜP TEKNİK KARTI EKLE / DÜZENLE (Faz 2C)
// ------------------------------------------------------------------------------
function renderProductModal() {
  const p = state.editingProduct;
  if (!p) return '';

  const inCatalog = (state.stockCatalog||[]).find(c => c.stock_code === (p.stock_code||'').trim());

  return `
    <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div class="font-bold text-base text-slate-900">${p.id ? 'Tüp Teknik Kartını Düzenle' : 'Yeni Tüp Teknik Kartı Tanımla'}</div>
            <div class="text-xs text-slate-500 font-mono">ERP Stok Kataloğu & Ham Levha FK Entegrasyonu (Faz 2C)</div>
          </div>
          <button onclick="closeProductModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
        </div>

        <div class="space-y-3.5 text-xs font-sans">
          <!-- Stok Kodu & ERP Doğrulama -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="font-mono text-slate-700 font-bold">Stok Kodu (Zorunlu ERP Anahtarı):</label>
              ${inCatalog ? `
                <span class="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <span>✓</span> ERP Kataloğunda Doğrulandı
                </span>
              ` : p.stock_code ? `
                <span class="text-[11px] font-mono text-amber-700 font-bold flex items-center gap-1">
                  <span>⚠️</span> ERP Kataloğunda Bulunamadı (Taslak Kayıt)
                </span>
              ` : ''}
            </div>
            <input
              type="text"
              placeholder="Örn: 511109010410-1102"
              value="${p.stock_code || ''}"
              oninput="onStockCodeChange(this.value);"
              class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold text-sky-800 outline-none focus:border-sky-500 shadow-2xs"
            />
            <div class="text-[10px] text-slate-500 font-sans">
              Kayıtlı kod girildiğinde resmi mamul adı katalogdan otomatik dolar ve değiştirilemez.
            </div>
          </div>

          <!-- Stok Adı (Salt Okunur ERP Adı) -->
          <div class="space-y-1">
            <label class="font-mono text-slate-700 font-bold">Stok Adı (ERP Senkron Alanı — Salt Okunur):</label>
            <input
              type="text"
              readonly
              value="${p.stock_name || ''}"
              class="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-xs font-sans text-slate-700 cursor-not-allowed"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Ebat / Boyut -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Ebat / Boyut (18 Kapasite Kuralı):</label>
              <select
                onchange="onProductSizeChange(this.value);"
                class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-sky-500"
              >
                ${state.capacities.map(c => `
                  <option value="${c.tube_size}" ${p.tube_size===c.tube_size?'selected':''}>
                    ${c.tube_size} (${c.units_per_sheet} tüp/levha, ${c.assembly_group_count} grup x ${c.repeat_step} adım)
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Onaylı Ham Levha Seçimi (FK) -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Onaylı Ham Levha (FK Bağlantısı):</label>
              <select
                onchange="state.editingProduct.raw_sheet_code=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-sky-500"
              >
                ${state.rawSheets.map(r => `
                  <option value="${r.stock_code}" ${p.raw_sheet_code===r.stock_code?'selected':''}>
                    ${r.stock_code} [${r.tube_size}] (${r.width_mm}x${r.height_mm}, ${r.thickness_source_value/100}mm)
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <!-- Baskı Yüzeyi -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Baskı Yüzeyi:</label>
              <select
                onchange="state.editingProduct.print_surface=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
              >
                <option value="EMAYE" ${p.print_surface==='EMAYE'?'selected':''}>EMAYE</option>
                <option value="METALİK" ${p.print_surface==='METALİK'?'selected':''}>METALİK</option>
              </select>
            </div>

            <!-- Vernik -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Vernik:</label>
              <select
                onchange="state.editingProduct.varnish=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
              >
                <option value="PARLAK" ${p.varnish==='PARLAK'?'selected':''}>PARLAK</option>
                <option value="MAT" ${p.varnish==='MAT'?'selected':''}>MAT</option>
                <option value="KISMİ" ${p.varnish==='KISMİ'?'selected':''}>KISMİ</option>
                <option value="BELİRTİLMEMİŞ" ${p.varnish==='BELİRTİLMEMİŞ'?'selected':''}>BELİRTİLMEMİŞ</option>
              </select>
            </div>

            <!-- Lak Durumu -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Lak Durumu:</label>
              <select
                onchange="state.editingProduct.lacquer=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
              >
                <option value="LAKLI" ${p.lacquer==='LAKLI'?'selected':''}>LAKLI</option>
                <option value="LAKSIZ" ${p.lacquer==='LAKSIZ'?'selected':''}>LAKSIZ</option>
                <option value="BILINMIYOR" ${p.lacquer==='BILINMIYOR'?'selected':''}>BILINMIYOR</option>
              </select>
            </div>

            <!-- İç Kaplama -->
            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">İç Kaplama:</label>
              <select
                onchange="state.editingProduct.inside_coating=this.value; renderApp();"
                class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
              >
                <option value="STANDART" ${p.inside_coating==='STANDART'?'selected':''}>STANDART</option>
                <option value="GOLD" ${p.inside_coating==='GOLD'?'selected':''}>GOLD (İçi Gold)</option>
                <option value="ŞEFFAF" ${p.inside_coating==='ŞEFFAF'?'selected':''}>ŞEFFAF</option>
                <option value="BELİRTİLMEMİŞ" ${p.inside_coating==='BELİRTİLMEMİŞ'?'selected':''}>BELİRTİLMEMİŞ</option>
              </select>
            </div>
          </div>

          <!-- Renkler Kataloğu Seçimi -->
          <div class="space-y-1.5 border-t border-slate-100 pt-2.5">
            <div class="flex items-center justify-between">
              <label class="font-mono text-slate-700 font-bold">Renkler (${(p.colors||[]).length} Renk Seçili):</label>
              <span class="text-[11px] font-mono text-slate-500">Maksimum 6-8 Renk</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              ${['C', 'M', 'Y', 'K', '1225C', '368C', '357C', '185C', '2665C', '2587C', '109C'].map(cCode => {
                const isSelected = (p.colors || []).includes(cCode);
                return `
                  <button
                    type="button"
                    onclick="toggleColorInEditingProduct('${cCode}');"
                    class="px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }"
                  >
                    ${isSelected ? '✓ ' : ''}${cCode}
                  </button>
                `;
              }).join('')}
            </div>
            <!-- Custom Pantone Adder -->
            <div class="flex items-center gap-2 pt-1">
              <input
                id="custom_pantone_input"
                type="text"
                placeholder="Özel Pantone (örn. 871C)..."
                class="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-mono outline-none w-48"
              />
              <button
                type="button"
                onclick="addCustomPantoneToEditingProduct();"
                class="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-mono"
              >
                + Ekle
              </button>
            </div>
          </div>

          <!-- Özel Not / Parametre 1 -->
          <div class="space-y-1 border-t border-slate-100 pt-2.5">
            <label class="font-mono text-slate-700 font-bold">Özel Parametre / Not (Parametre 1):</label>
            <textarea
              rows="2"
              onchange="state.editingProduct.special_parameter=this.value;"
              placeholder="Örn: CTP Montaj tarafınıza gönderilecektir / RPT revizyon devamı..."
              class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-sky-500"
            >${p.special_parameter || ''}</textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button onclick="closeProductModal();" class="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono">İptal</button>
          <button onclick="saveProductForm();" class="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-bold shadow-xs">
            ${p.id ? 'Değişiklikleri Kaydet' : 'Teknik Kartı Oluştur'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------------------
// MODAL: EXCEL TEKNİK KART İÇE AKTARMA (IMPORT) SİHİRBAZI (Faz 2C)
// ------------------------------------------------------------------------------
function renderImportModal() {
  if (!state.isImportModalOpen) return '';

  const step = state.importStep || 1;
  const val = state.importValidation;

  return `
    <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-4xl w-full p-6 space-y-4 my-8">
        <!-- Wizard Header -->
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div class="font-bold text-base text-slate-900 flex items-center gap-2">
              <span>📥 Excel Teknik Kart İçe Aktarma Sihirbazı</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                Adım ${step} / 4
              </span>
            </div>
            <div class="text-xs text-slate-500 font-mono mt-0.5">
              ${step === 1 ? 'Adım 1: Veri Yükleme veya Yapıştırma' :
                step === 2 ? 'Adım 2: Kolon Eşleme ve Ayrıştırma' :
                step === 3 ? 'Adım 3: Doğrulama ve Önizleme Tablosu' :
                'Adım 4: İçe Aktarma Raporu'}
            </div>
          </div>
          <button onclick="closeImportModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
        </div>

        ${step === 1 ? `
          <!-- Step 1: Upload / Paste -->
          <div class="space-y-3.5 text-xs font-sans">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div class="font-bold text-slate-800">Veri Giriş Yöntemi:</div>
              <div class="text-slate-600 leading-relaxed">
                Excel tablonuzdaki başlık satırı ve verileri kopyalayıp aşağıdaki alana yapıştırabilir ya da hazır kaynak örneğini yükleyebilirsiniz.
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <label class="cursor-pointer px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold flex items-center gap-1.5 shadow-xs">
                  <span>📁</span> Gerçek Excel (.xlsx / .xlsm) Dosyası Seç
                  <input type="file" id="import_file_input" accept=".xlsx,.xlsm,.csv" class="hidden" onchange="handleExcelFileInput(this)" />
                </label>
                <button
                  type="button"
                  onclick="loadSampleImportData();"
                  class="px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-mono font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span>📋</span> Hazır Kaynak Verisi Yükle (22 Satır Teknik Kart)
                </button>
                <button
                  type="button"
                  onclick="downloadSampleTemplate();"
                  class="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-mono flex items-center gap-1.5 shadow-2xs"
                >
                  <span>📄</span> Boş Excel/CSV Şablonu İndir
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <label class="font-mono text-slate-700 font-bold">Excel Verisi (Tablo / CSV / TSV Metni):</label>
              <textarea
                id="import_textarea"
                rows="10"
                placeholder="Stok Kodu\tStok İsmi\tHam Levha kodu\tBoy ve Çap\tBaskı Yüzeyi\tVernik\tLak\tİç Kaplama\tRenk1...\n511109010410-1102\tTUP-GW MOBILYA 300 ml\tHAM LEVHA-017x832x875...\t52x214\tMETALİK\tKISMİ\tLAKLI...\n"
                class="w-full bg-slate-50 border border-slate-300 rounded p-3 text-xs font-mono text-slate-800 outline-none focus:border-sky-500"
              >${state.importRawData || ''}</textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button onclick="closeImportModal();" class="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono">İptal</button>
            <button onclick="processImportStep1();" class="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-bold shadow-xs">
              Devam Et (Kolon Eşleme) →
            </button>
          </div>
        ` : step === 2 ? `
          <!-- Step 2: Column Mapping -->
          <div class="space-y-3.5 text-xs font-sans">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs">
              Dosyadaki kolonlar algılandı (${state.importParsedRows.length} veri satırı). Sistem alanları ile kolon eşleşmelerini kontrol ediniz:
            </div>

            <div class="grid grid-cols-2 gap-3 font-mono text-xs">
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Stok Kodu (Zorunlu):</span>
                <span class="font-bold text-sky-800 block mt-0.5">✓ [Stok Kodu] Kolonu</span>
              </div>
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Stok İsmi (Karşılaştırma):</span>
                <span class="font-bold text-slate-800 block mt-0.5">✓ [Stok İsmi] Kolonu</span>
              </div>
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Ham Levha Kodu / Açıklaması:</span>
                <span class="font-bold text-slate-800 block mt-0.5">✓ [Ham Levha kodu] (Açık Kod Eşlemesi)</span>
              </div>
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Ebat / Ölçüler:</span>
                <span class="font-bold text-slate-800 block mt-0.5">✓ [Boy ve Çap] Kolonu</span>
              </div>
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Baskı Zemin & Vernik:</span>
                <span class="font-bold text-slate-800 block mt-0.5">✓ [Baskı Yüzeyi] ve [Vernik]</span>
              </div>
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span class="text-slate-500">Lak & İç Kaplama:</span>
                <span class="font-bold text-slate-800 block mt-0.5">✓ [Lak] ve [İç Kaplama]</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-slate-200 pt-3">
            <button onclick="state.importStep=1; renderApp();" class="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono">← Geri</button>
            <button onclick="processImportStep2();" class="px-5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-bold shadow-xs">
              Önizleme ve Doğrulama Yap →
            </button>
          </div>
        ` : step === 3 ? `
          <!-- Step 3: Validation & Preview -->
          <div class="space-y-3.5 text-xs font-sans">
            <!-- Summary KPI Badges -->
            <div class="grid grid-cols-4 gap-2 text-center font-mono">
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div class="text-[10px] text-slate-500 uppercase">Toplam Satır</div>
                <div class="text-base font-black text-slate-800">${val.total}</div>
              </div>
              <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div class="text-[10px] text-emerald-700 uppercase">Yeni Eklenecek</div>
                <div class="text-base font-black text-emerald-700">${val.newCount}</div>
              </div>
              <div class="p-2.5 bg-sky-50 border border-sky-200 rounded-lg">
                <div class="text-[10px] text-sky-700 uppercase">Güncellenecek</div>
                <div class="text-base font-black text-sky-700">${val.updateCount}</div>
              </div>
              <div class="p-2.5 ${val.errorCount>0?'bg-rose-50 border-rose-200 text-rose-700':'bg-slate-50 border-slate-200 text-slate-400'} border rounded-lg">
                <div class="text-[10px] uppercase">Hatalı / Reddedilen</div>
                <div class="text-base font-black">${val.errorCount}</div>
              </div>
            </div>

            <!-- Import Policy Selector -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div class="font-bold text-slate-800">Güncelleme Politikası:</div>
              <div class="flex items-center gap-3 font-mono">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="import_policy" value="all" ${state.importPolicy==='all'?'checked':''} onchange="state.importPolicy='all'; renderApp();" />
                  <span>Tümünü İşle (${val.newCount + val.updateCount})</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="import_policy" value="new_only" ${state.importPolicy==='new_only'?'checked':''} onchange="state.importPolicy='new_only'; renderApp();" />
                  <span>Yalnızca Yeniler (${val.newCount})</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="import_policy" value="update_only" ${state.importPolicy==='update_only'?'checked':''} onchange="state.importPolicy='update_only'; renderApp();" />
                  <span>Yalnızca Güncellemeler (${val.updateCount})</span>
                </label>
              </div>
            </div>

            <!-- Preview Table -->
            <div class="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="sticky top-0 bg-slate-100 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase">
                  <tr>
                    <th class="py-2 px-3">Durum</th>
                    <th class="py-2 px-3">Stok Kodu</th>
                    <th class="py-2 px-3">Stok Adı</th>
                    <th class="py-2 px-2">Ebat</th>
                    <th class="py-2 px-3">Ham Levha (Eşleşen FK)</th>
                    <th class="py-2 px-2">Zemin</th>
                    <th class="py-2 px-2">Lak</th>
                    <th class="py-2 px-2">İç Kaplama</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                  ${val.rows.map(r => {
                    if (r.status === 'ERROR') {
                      return `
                        <tr class="bg-rose-50/70 text-rose-900">
                          <td class="py-2 px-3 font-bold text-rose-700">❌ HATALI</td>
                          <td class="py-2 px-3 font-bold">${r.item?.stock_code || '(BOŞ KOD)'}</td>
                          <td class="py-2 px-3 font-sans" colSpan="6">${r.error_message}</td>
                        </tr>
                      `;
                    }
                    const it = r.item;
                    return `
                      <tr class="hover:bg-slate-50 ${r.status==='NEW'?'bg-emerald-50/30':'bg-sky-50/30'}">
                        <td class="py-2 px-3">
                          ${r.status==='NEW' ? `
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">✓ YENİ</span>
                          ` : `
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">🔄 GÜNCELLE</span>
                          `}
                        </td>
                        <td class="py-2 px-3 font-bold text-slate-900">${it.stock_code}</td>
                        <td class="py-2 px-3 font-sans">${it.stock_name}</td>
                        <td class="py-2 px-2 font-bold">${it.tube_size}</td>
                        <td class="py-2 px-3 font-bold text-indigo-700">${it.raw_sheet_code}</td>
                        <td class="py-2 px-2">${it.print_surface}</td>
                        <td class="py-2 px-2">${it.lacquer}</td>
                        <td class="py-2 px-2">${it.inside_coating}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          ${val.errorCount > 0 ? `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 font-sans mt-3">
              <div class="flex items-center gap-2">
                <span class="text-base">⚠️</span>
                <span>Dosyada <b>${val.errorCount}</b> adet hatalı satır var. Varsayılan kural gereğince dosya bütünüyle reddedilir. Yalnızca geçerli satırları aktarmak için onay kutusunu işaretleyiniz:</span>
              </div>
              <label class="flex items-center gap-2 font-mono font-bold cursor-pointer bg-white px-3 py-1.5 rounded border border-amber-300 text-amber-900">
                <input type="checkbox" onchange="state.allowPartialImport = this.checked;" ${state.allowPartialImport ? 'checked' : ''} class="rounded text-amber-600">
                Kısmi Aktarıma İzin Ver
              </label>
            </div>
          ` : ''}

          <div class="flex items-center justify-between border-t border-slate-200 pt-3 mt-2">
            <button onclick="state.importStep=2; renderApp();" class="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono">← Geri</button>
            <button
              onclick="commitImport();"
              ${(val.newCount + val.updateCount === 0) ? 'disabled' : ''}
              class="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-xs transition-colors"
            >
              İçe Aktarımı Onayla ve Kaydet (${val.newCount + val.updateCount} Kayıt)
            </button>
          </div>
        ` : `
          <!-- Step 4: Success Report -->
          <div class="p-6 text-center space-y-4 font-sans">
            <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
              ✓
            </div>
            <div class="space-y-1">
              <div class="text-base font-bold text-slate-900">İçe Aktarma Başarıyla Tamamlandı!</div>
              <div class="text-xs text-slate-500 font-mono">
                Toplam ${state.importAppliedCount || 0} adet teknik kart sisteme işlendi ve denetim izine kaydedildi.
              </div>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto text-xs text-slate-700 text-left font-mono">
              <div>✓ Mükerrer kayıtlar engellendi.</div>
              <div>✓ Onaylı ham levha stok kodları (FK) bağlandı.</div>
              <div>✓ Kalıcı hafızaya kaydedildi.</div>
            </div>
            <button
              onclick="closeImportModal();"
              class="px-6 py-2.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs shadow-xs"
            >
              Kapat ve Kartları İncele
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================================================
// FAZ 3A.1: MEVCUT SQL PLANI SNAPSHOT VE TASLAK YÖNETİMİ
// ============================================================================

async function openSqlPlanPreviewModal() {
  state.showSqlPlanModal = true;
  state.isFetchingSqlPreview = true;
  state.sqlPlanPreview = null;
  renderApp();

  try {
    const res = await apiRequest('/api/plan-sync/preview');
    if (res && res.success) {
      state.sqlPlanPreview = res.data;
    } else {
      alert('SQL Planı Önizleme Hatası:\n' + (res?.error?.message || 'Bilinmeyen hata'));
      state.showSqlPlanModal = false;
    }
  } catch (err) {
    alert('SQL Planı Önizleme Hatası:\n' + err.message);
    state.showSqlPlanModal = false;
  } finally {
    state.isFetchingSqlPreview = false;
    renderApp();
  }
}

function closeSqlPlanModal() {
  state.showSqlPlanModal = false;
  state.sqlPlanPreview = null;
  renderApp();
}

async function commitSqlPlanSnapshot() {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü plan içeri alamaz.');
    return;
  }

  const notesInput = document.getElementById('sqlSnapNotes');
  const updateDraftInput = document.getElementById('chkUpdateDraft');
  const notes = notesInput ? notesInput.value.trim() : '';
  const updateDraft = updateDraftInput ? updateDraftInput.checked : true;
  let forceOverwrite = false;

  if (updateDraft && state.planDraft?.draft?.is_dirty) {
    const confirmOverwrite = confirm(
      'Mevcut çalışma taslağında kaydedilmemiş sıralama değişiklikleri bulunmaktadır.\n\n' +
      'Yeni snapshot verisiyle mevcut taslağın üzerine yazmak istiyor musunuz?\n\n' +
      '• [Tamam]: Taslak yeni SQL planı ile güncellenir.\n' +
      '• [İptal]: Taslak korunur, snapshot bağımsız arşivlenir.'
    );
    forceOverwrite = confirmOverwrite;
  }

  try {
    const res = await apiRequest('/api/plan-sync/snapshot', {
      method: 'POST',
      body: {
        notes: notes || 'SQL Server alper_tenekeuretim plan alımı',
        createOrUpdateDraft: updateDraft,
        forceOverwrite: forceOverwrite
      }
    });

    if (res && res.success) {
      const snap = res.data.snapshot;
      const draftInfo = res.data.draft;
      let msg = `✓ Mevcut plan başarıyla PostgreSQL'e aktarıldı!\n\n` +
        `• Snapshot ID: ${snap.id}\n` +
        `• Satır Sayısı: ${snap.row_count}\n` +
        `• Toplam Miktar: ${snap.total_quantity.toLocaleString('tr-TR')} adet\n` +
        `• Checksum: ${snap.checksum.slice(0, 16)}...`;

      if (draftInfo && draftInfo.preserved) {
        msg += `\n\n⚠️ Dikkat: ${draftInfo.message}`;
      }

      alert(msg);
      state.showSqlPlanModal = false;
      state.sqlPlanPreview = null;

      // Taslağı ve snapshot geçmişini yeniden yükle
      const draftRes = await apiRequest('/api/plan-sync/draft');
      if (draftRes && draftRes.data && draftRes.data.exists) {
        state.planDraft = draftRes.data;
      }
      const snapsRes = await apiRequest('/api/plan-sync/snapshots');
      if (snapsRes && Array.isArray(snapsRes.data)) {
        state.planSnapshots = snapsRes.data;
      }
      const auditRes = await apiRequest('/api/audit-logs');
      if (auditRes && Array.isArray(auditRes.data)) {
        state.auditLogs = auditRes.data;
      }
      renderApp();
    } else {
      alert('Snapshot Kaydetme Hatası:\n' + (res?.error?.message || 'Bilinmeyen hata'));
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function moveDraftItem(index, direction) {
  if (state.currentRole === 'viewer') return;
  if (!state.planDraft || !state.planDraft.items) return;

  const items = [...state.planDraft.items];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;

  // Sıralamayı yerel olarak takas et
  const temp = items[index];
  items[index] = items[newIndex];
  items[newIndex] = temp;

  // Yeni sequence_order değerlerini ata
  items.forEach((it, idx) => {
    it.sequence_order = idx + 1;
  });

  state.planDraft.items = items;
  if (state.planDraft.draft) {
    state.planDraft.draft.is_dirty = true;
  }
  renderApp();

  try {
    const itemIds = items.map(it => it.id);
    const res = await apiRequest('/api/plan/draft/order', {
      method: 'PUT',
      body: {
        draftId: state.planDraft.draft.id,
        expectedVersion: state.planDraft.draft.version,
        itemIds
      }
    });
    if (res && res.data && res.data.draft) {
      state.planDraft.draft = res.data.draft;
      renderApp();
    } else if (res?.error?.code === 'CONCURRENT_MODIFICATION') {
      alert('EŞZAMANLI DEĞİŞİKLİK UYARISI (HTTP 409):\n\nBu plan başka bir oturumda güncellendi. En son hali getiriliyor.');
      await refreshPlanDraft();
    }
  } catch (err) {
    console.error('Sıralama sunucuya kaydedilemedi:', err);
  }
}

// ----------------------------------------------------------------------------
// FAZ 5A: ÇİZELGELEME, TAKVİM, KİLİT VE SENARYO YÖNETİMİ FONKSİYONLARI
// ----------------------------------------------------------------------------

async function refreshPlanDraft() {
  try {
    const res = await apiRequest('/api/plan/draft');
    if (res && res.data && res.data.exists) {
      state.planDraft = res.data;
      renderApp();
    }
  } catch (e) {
    console.error('Plan taslağı yenilenemedi:', e);
  }
}

async function previewProductionSchedule() {
  if (state.isCalculatingSchedule) return;
  state.isCalculatingSchedule = true;
  renderApp();

  try {
    const res = await apiRequest('/api/plan/schedule-preview', {
      method: 'POST',
      body: {
        draftId: state.planDraft?.draft?.id || 'DRAFT-DEFAULT',
        scheduleStartTime: state.scheduleStartTime || '2026-11-06T07:30:00+03:00'
      }
    });

    if (res && res.success && res.data) {
      state.schedulePreview = res.data;
      const previewMap = new Map((res.data.scheduledItems || []).map(it => [String(it.id), it]));
      if (state.planDraft && Array.isArray(state.planDraft.items)) {
        state.planDraft.items.forEach(it => {
          const p = previewMap.get(String(it.id));
          if (p) {
            it.suggested_start_date = p.suggested_start_date;
            it.suggested_end_date = p.suggested_end_date;
            it.setup_duration_minutes = p.setup_duration_minutes;
            it.production_duration_minutes = p.production_duration_minutes;
            it.speed_units_per_minute = p.speed_units_per_minute;
            it.is_delayed = p.is_delayed;
            it.delay_days = p.delay_days;
            it.is_collision = p.is_collision;
            it.source_diff_minutes = p.source_diff_minutes;
          }
        });
      }
      logAudit('plan_schedule', state.planDraft?.draft?.id, 'preview', `Çizelge önizlendi: ${res.data.totalWorkingMinutes} dk çalışma, ${res.data.totalSetupMinutes} dk hazırlık`);
    } else {
      alert('Çizelgeleme hatası: ' + (res?.error?.message || 'Bilinmeyen hata'));
    }
  } catch (err) {
    console.error('Çizelgeleme önizleme hatası:', err);
    alert('Çizelgeleme önizleme hatası: ' + err.message);
  } finally {
    state.isCalculatingSchedule = false;
    renderApp();
  }
}

async function commitProductionSchedule() {
  if (state.currentRole === 'viewer') {
    alert('Yetkisiz işlem: Görüntüleyici rolü çizelge kaydedemez.');
    return;
  }
  if (!state.planDraft?.draft) return;
  if (state.isSavingSchedule) return;

  if (!confirm(`Tek Makine Çizelgesi Uygulansın mı?\n\nBu işlem hesaplanan başlangıç ve bitiş tarihlerini çalışma taslağına (v${state.planDraft.draft.version}) kalıcı olarak kaydedecektir.`)) {
    return;
  }

  state.isSavingSchedule = true;
  renderApp();

  try {
    const res = await apiRequest('/api/plan/schedule-commit', {
      method: 'POST',
      body: {
        draftId: state.planDraft.draft.id,
        expectedVersion: state.planDraft.draft.version,
        scheduleStartTime: state.scheduleStartTime || '2026-11-06T07:30:00+03:00'
      }
    });

    if (res && res.success && res.data) {
      state.planDraft.draft = res.data.draft;
      state.planDraft.items = res.data.items;
      state.schedulePreview = null;
      alert(`Çizelge başarıyla kaydedildi!\n\nToplam ${res.data.items.length} kalem için üretim takvimi güncellendi (Yeni Sürüm: v${res.data.draft.version}).`);
    } else if (res?.error?.code === 'CONCURRENT_MODIFICATION') {
      alert('EŞZAMANLI DEĞİŞİKLİK UYARISI (HTTP 409):\n\nBu plan başka bir kullanıcı veya oturum tarafından güncellenmiştir. Güncel verileri almak için plan yeniden yükleniyor.');
      await refreshPlanDraft();
    } else {
      alert('Çizelge kaydetme hatası: ' + (res?.error?.message || 'Bilinmeyen hata'));
    }
  } catch (err) {
    alert('Çizelge kaydedilirken hata: ' + err.message);
  } finally {
    state.isSavingSchedule = false;
    renderApp();
  }
}

async function toggleItemStartLock(itemId) {
  if (state.currentRole === 'viewer') return;
  const item = state.planDraft?.items?.find(it => String(it.id) === String(itemId));
  if (!item) return;

  const newLock = !item.is_start_locked;
  item.is_start_locked = newLock;
  renderApp();

  try {
    const res = await apiRequest(`/api/plan/draft/item/${itemId}`, {
      method: 'PUT',
      body: {
        draftId: state.planDraft.draft.id,
        expectedVersion: state.planDraft.draft.version,
        is_start_locked: newLock
      }
    });
    if (res && res.data) {
      if (res.data.draft) state.planDraft.draft = res.data.draft;
      if (res.data.item) {
        const idx = state.planDraft.items.findIndex(it => String(it.id) === String(itemId));
        if (idx !== -1) state.planDraft.items[idx] = res.data.item;
      }
    } else if (res?.error?.code === 'CONCURRENT_MODIFICATION') {
      alert('Eşzamanlı değişiklik tespit edildi. Plan yenileniyor.');
      await refreshPlanDraft();
    }
  } catch (err) {
    console.error('Kilit kaydedilemedi:', err);
    item.is_start_locked = !newLock;
    renderApp();
  }
}

async function toggleItemSequenceLock(itemId) {
  if (state.currentRole === 'viewer') return;
  const item = state.planDraft?.items?.find(it => String(it.id) === String(itemId));
  if (!item) return;

  const newLock = !item.is_sequence_locked;
  item.is_sequence_locked = newLock;
  renderApp();

  try {
    const res = await apiRequest(`/api/plan/draft/item/${itemId}`, {
      method: 'PUT',
      body: {
        draftId: state.planDraft.draft.id,
        expectedVersion: state.planDraft.draft.version,
        is_sequence_locked: newLock
      }
    });
    if (res && res.data) {
      if (res.data.draft) state.planDraft.draft = res.data.draft;
      if (res.data.item) {
        const idx = state.planDraft.items.findIndex(it => String(it.id) === String(itemId));
        if (idx !== -1) state.planDraft.items[idx] = res.data.item;
      }
    } else if (res?.error?.code === 'CONCURRENT_MODIFICATION') {
      alert('Eşzamanlı değişiklik tespit edildi. Plan yenileniyor.');
      await refreshPlanDraft();
    }
  } catch (err) {
    console.error('Sıra kilidi kaydedilemedi:', err);
    item.is_sequence_locked = !newLock;
    renderApp();
  }
}

async function editDraftItemQuantity(itemId) {
  if (state.currentRole === 'viewer') return;
  const item = state.planDraft?.items?.find(it => String(it.id) === String(itemId));
  if (!item) return;

  const currentVal = Math.round(Number(item.quantity) || 0);
  const input = prompt(`[${item.stock_code}] ${item.stock_name}\n\nYeni üretim miktarını giriniz (Adet):`, currentVal);
  if (input === null) return;
  const newQty = parseFloat(input.replace(/\./g, '').replace(',', '.'));
  if (isNaN(newQty) || newQty <= 0) {
    alert('Geçersiz miktar! Lütfen pozitif bir tam sayı giriniz.');
    return;
  }

  const oldQty = item.quantity;
  item.quantity = newQty;
  renderApp();

  try {
    const res = await apiRequest(`/api/plan/draft/item/${itemId}`, {
      method: 'PUT',
      body: {
        draftId: state.planDraft.draft.id,
        expectedVersion: state.planDraft.draft.version,
        quantity: newQty
      }
    });
    if (res && res.data) {
      if (res.data.draft) state.planDraft.draft = res.data.draft;
      if (res.data.item) {
        const idx = state.planDraft.items.findIndex(it => String(it.id) === String(itemId));
        if (idx !== -1) state.planDraft.items[idx] = res.data.item;
      }
    } else if (res?.error?.code === 'CONCURRENT_MODIFICATION') {
      alert('Eşzamanlı değişiklik tespit edildi. Plan yenileniyor.');
      await refreshPlanDraft();
    }
  } catch (err) {
    console.error('Miktar güncellenemedi:', err);
    item.quantity = oldQty;
    alert('Miktar kaydedilemedi: ' + err.message);
  } finally {
    renderApp();
  }
}

async function openScenarioModal() {
  state.showScenarioModal = true;
  state.scenarioModalMode = 'list';
  renderApp();

  try {
    const res = await apiRequest('/api/plan/scenarios');
    if (res && res.success && Array.isArray(res.data)) {
      state.planScenarios = res.data;
      renderApp();
    }
  } catch (err) {
    console.error('Senaryolar alınamadı:', err);
  }
}

function closeScenarioModal() {
  state.showScenarioModal = false;
  renderApp();
}

async function saveCurrentScenario() {
  const nameInput = document.getElementById('txtScenarioName');
  const descInput = document.getElementById('txtScenarioDesc');
  const scenarioName = nameInput ? nameInput.value.trim() : '';
  const description = descInput ? descInput.value.trim() : '';

  if (!scenarioName) {
    alert('Lütfen bir senaryo adı giriniz.');
    return;
  }

  try {
    const res = await apiRequest('/api/plan/scenarios', {
      method: 'POST',
      body: {
        draftId: state.planDraft?.draft?.id || 'DRAFT-DEFAULT',
        scenarioName,
        description
      }
    });
    if (res && res.success) {
      alert(`"${scenarioName}" senaryosu başarıyla kaydedildi!`);
      state.scenarioModalMode = 'list';
      const listRes = await apiRequest('/api/plan/scenarios');
      if (listRes && Array.isArray(listRes.data)) {
        state.planScenarios = listRes.data;
      }
      renderApp();
    }
  } catch (err) {
    alert('Senaryo kaydedilemedi: ' + err.message);
  }
}

async function revertDraftToScenario(scenarioId) {
  if (state.currentRole === 'viewer') return;
  if (!confirm('DİKKAT: Mevcut çalışma taslağınız bu senaryodaki durumuna geri yüklenecektir.\n\nDevam etmek istiyor musunuz?')) {
    return;
  }

  try {
    const res = await apiRequest(`/api/plan/scenarios/${scenarioId}/revert`, {
      method: 'POST',
      body: {
        expectedVersion: state.planDraft?.draft?.version
      }
    });
    if (res && res.success) {
      alert('Taslak seçilen senaryoya başarıyla geri yüklendi!');
      closeScenarioModal();
      await refreshPlanDraft();
    }
  } catch (err) {
    alert('Senaryo geri yükleme hatası: ' + err.message);
  }
}

function openAddDemandModal() {
  state.showAddDemandModal = true;
  renderApp();
}

function closeAddDemandModal() {
  state.showAddDemandModal = false;
  renderApp();
}

async function addDemandToPlan(demandKey, quantity) {
  if (state.currentRole === 'viewer') return;
  try {
    const res = await apiRequest('/api/plan/draft/add-demand', {
      method: 'POST',
      body: {
        draftId: state.planDraft?.draft?.id || 'DRAFT-DEFAULT',
        expectedVersion: state.planDraft?.draft?.version,
        demandKey,
        quantity
      }
    });
    if (res && res.success) {
      alert('Kalem başarıyla üretim planının sonuna eklendi!');
      closeAddDemandModal();
      await refreshPlanDraft();
    }
  } catch (err) {
    alert('Kalem plana eklenirken hata: ' + err.message);
  }
}

async function openSnapshotHistoryModal() {
  state.showSnapshotHistoryModal = true;
  renderApp();

  try {
    const res = await apiRequest('/api/plan-sync/snapshots');
    if (res && Array.isArray(res.data)) {
      state.planSnapshots = res.data;
      renderApp();
    }
  } catch (err) {
    console.error('Snapshot geçmişi alınamadı:', err);
  }
}

function closeSnapshotHistoryModal() {
  state.showSnapshotHistoryModal = false;
  renderApp();
}

function renderProduction() {
  const hasDraft = state.planDraft && Array.isArray(state.planDraft.items) && state.planDraft.items.length > 0;
  const draft = state.planDraft?.draft;
  const items = hasDraft ? state.planDraft.items : [];

  // Filtreleme
  const query = (state.planSearch || '').toLowerCase().trim();
  const filteredItems = items.filter(it => {
    if (!query) return true;
    return (it.stock_code && it.stock_code.toLowerCase().includes(query)) ||
           (it.stock_name && it.stock_name.toLowerCase().includes(query));
  });

  const totalQty = items.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0);
  const snapCount = state.planSnapshots?.length || 0;
  const preview = state.schedulePreview;

  // Çizelge özet metrikleri (Önizleme varsa ondan, yoksa taslak alanlarından)
  const totalSetupMin = preview ? preview.totalSetupMinutes : items.reduce((a, b) => a + (Number(b.setup_duration_minutes) || 0), 0);
  const totalWorkMin = preview ? preview.totalWorkingMinutes : items.reduce((a, b) => a + (Number(b.production_duration_minutes) || 0), 0);
  const delayedItemsCount = preview ? preview.delayedCount : items.filter(it => it.is_delayed).length;
  const collisionItemsCount = preview ? preview.collisionCount : items.filter(it => it.is_collision).length;

  return `
    <div class="space-y-4 font-sans">
      <!-- 1. Üst Bilgi ve Eylem Kartı (Faz 5A Çizelgeleme Konsolu) -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏭</span>
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Tek Tüp Makinesi Üretim Çizelgeleme (Faz 5A)</h2>
              ${hasDraft ? `
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold ${draft?.is_dirty ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">
                  Taslak v${draft?.version || 1} ${draft?.is_dirty ? '● Düzenlendi' : '✓ Kayıtlı'}
                </span>
              ` : `
                <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-300">
                  Taslak Yok
                </span>
              `}
              ${preview ? `
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 animate-pulse">
                  ⚡ Önizleme Aktif
                </span>
              ` : ''}
            </div>
            <div class="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Hat: <b class="text-slate-800">Tüp Gövde Üretim Hattı (Tek Makine)</b></span>
              <span>Kaynak: <b class="text-slate-700">${draft?.snapshot_source || 'MikroDesktop_LIDER26.dbo.alper_tenekeuretim'}</b></span>
              <span>Toplam Satır: <b class="text-slate-900">${items.length}</b></span>
              <span>Toplam Üretim: <b class="text-indigo-700">${totalQty.toLocaleString('tr-TR')} Adet</b></span>
            </div>
          </div>

          <!-- Çizelgeleme ve Senaryo Araç Çubuğu -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Plan Başlangıç Tarihi -->
            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-mono">
              <span class="text-slate-500 text-[10px]">BAŞLANGIÇ:</span>
              <input
                type="datetime-local"
                value="${state.scheduleStartTime ? state.scheduleStartTime.slice(0, 16) : '2026-11-06T07:30'}"
                onchange="state.scheduleStartTime = this.value; renderApp();"
                class="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer"
              />
            </div>

            <!-- Çizelge Önizle Butonu -->
            <button
              onclick="previewProductionSchedule();"
              ${state.isCalculatingSchedule ? 'disabled' : ''}
              class="px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Çalışma takvimi, mola ve ayar sürelerine göre net başlangıç/bitiş tarihlerini önizle"
            >
              <span>⚡</span>
              <span>${state.isCalculatingSchedule ? 'Hesaplanıyor...' : 'Çizelgeyi Önizle'}</span>
            </button>

            <!-- Çizelgeyi Kaydet Butonu -->
            <button
              onclick="commitProductionSchedule();"
              ${state.isSavingSchedule || state.currentRole === 'viewer' ? 'disabled' : ''}
              class="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Hesaplanan önerilen çizelge tarihlerini taslağa uygula ve kaydet"
            >
              <span>💾</span>
              <span>${state.isSavingSchedule ? 'Kaydediliyor...' : 'Çizelgeyi Uygula & Kaydet'}</span>
            </button>

            <!-- Senaryolar Modal Butonu -->
            <button
              onclick="openScenarioModal();"
              class="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Senaryo kaydet, karşılaştır veya geri yükle"
            >
              <span>📁</span>
              <span>Senaryolar</span>
            </button>

            <!-- Havuzdan İlave Ekle Butonu -->
            <button
              onclick="openAddDemandModal();"
              class="px-3 py-2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-xs border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="İhtiyaç Havuzundaki karşılanmamış talepleri üretim planının sonuna ekle"
            >
              <span>➕</span>
              <span>Havuzdan Ekle</span>
            </button>

            <!-- SQL Snapshot Menüsü -->
            <button
              onclick="openSqlPlanPreviewModal();"
              class="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="MikroDesktop_LIDER26.dbo.alper_tenekeuretim tablosundan yeni snapshot al"
            >
              <span>📥</span>
              <span>SQL'den Yenile</span>
            </button>
            <button
              onclick="openSnapshotHistoryModal();"
              class="px-2.5 py-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 font-mono text-xs border border-slate-200 transition-colors flex items-center gap-1"
              title="Snapshot geçmişini görüntüle"
            >
              <span>🕒</span>
              <span>(${snapCount})</span>
            </button>
          </div>
        </div>

        <!-- 2. KPI ve Süre Özeti Şeridi -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs font-mono">
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <div class="text-[10px] text-slate-500 uppercase">Toplam Hazırlık (Ayar)</div>
            <div class="font-bold text-slate-800 text-sm mt-0.5 tabular-nums">
              ${totalSetupMin.toLocaleString('tr-TR')} dk <span class="text-xs text-slate-500 font-normal">(${(totalSetupMin / 60).toFixed(1)} sa)</span>
            </div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <div class="text-[10px] text-slate-500 uppercase">Net Üretim Çalışması</div>
            <div class="font-bold text-indigo-700 text-sm mt-0.5 tabular-nums">
              ${Math.round(totalWorkMin).toLocaleString('tr-TR')} dk <span class="text-xs text-slate-500 font-normal">(${(totalWorkMin / 60).toFixed(1)} sa)</span>
            </div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <div class="text-[10px] text-slate-500 uppercase">Toplam Çizelge Süresi</div>
            <div class="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
              ${((totalSetupMin + totalWorkMin) / 60).toFixed(1)} saat
            </div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <div class="text-[10px] text-slate-500 uppercase">Tahmini Bitiş Tarihi</div>
            <div class="font-bold text-slate-800 text-xs mt-0.5 truncate" title="${preview?.scheduleFinishTime || ''}">
              ${preview?.scheduleFinishTime ? new Date(preview.scheduleFinishTime).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
            </div>
          </div>
          <div class="p-2.5 ${delayedItemsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} border rounded">
            <div class="text-[10px] ${delayedItemsCount > 0 ? 'text-rose-700' : 'text-emerald-700'} uppercase font-bold">Termin Durumu</div>
            <div class="font-bold ${delayedItemsCount > 0 ? 'text-rose-800' : 'text-emerald-800'} text-xs mt-0.5">
              ${delayedItemsCount > 0 ? `⚠️ ${delayedItemsCount} Kalem Gecikmeli` : '✓ Tüm İşler Zamanında'}
            </div>
          </div>
          <div class="p-2.5 ${collisionItemsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} border rounded">
            <div class="text-[10px] ${collisionItemsCount > 0 ? 'text-amber-700' : 'text-slate-500'} uppercase font-bold">Kilit Uyumu</div>
            <div class="font-bold ${collisionItemsCount > 0 ? 'text-amber-800' : 'text-slate-700'} text-xs mt-0.5">
              ${collisionItemsCount > 0 ? `⚠️ ${collisionItemsCount} Kilit Çakışması` : '✓ Kilitler Uyumlu'}
            </div>
          </div>
        </div>

        <!-- Bilgi İpucu -->
        <div class="p-2.5 bg-sky-50/70 border border-sky-200 rounded text-xs text-sky-950 flex items-start gap-2">
          <span class="text-sky-600 font-bold text-sm">ℹ</span>
          <div class="space-y-0.5 text-[11px] leading-relaxed">
            <span class="font-bold">Tek Makine Kuralı & Çalışma Takvimi:</span>
            <span>Fabrikada tek bir tüp gövde üretim hattı bulunur. Vardiya takvimi <b>07:30 - 17:30</b> ve gece uzamasıyla <b>01:30</b>'a kadar çalışır; 6 mola aralığı takvimden otomatik düşülür. Hazırlık matrisi gereği 45 çapa geçiş <b>480 dk</b>, diğer çap değişimleri <b>180 dk</b>, boy değişimi <b>60 dk</b>, aynı ebat <b>0 dk</b> ayar süresi alır. Sırayı <b>▲ / ▼</b> butonlarıyla değiştirip <b>⚡ Çizelgeyi Önizle</b> ile sonuçları anında görebilirsiniz.</span>
          </div>
        </div>
      </div>

      <!-- 3. Arama ve Filtre Çubuğu -->
      <div class="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 shadow-xs">
        <div class="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Stok kodu veya ürün adı ile filtrele..."
            value="${state.planSearch || ''}"
            oninput="state.planSearch = this.value; renderApp();"
            class="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
          <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
        </div>
        <div class="text-xs font-mono text-slate-500 flex items-center gap-3">
          <span>Gösterilen: <b class="text-slate-800">${filteredItems.length}</b> / ${items.length} Kalem</span>
          ${state.planSearch ? `
            <button onclick="state.planSearch=''; renderApp();" class="text-sky-700 hover:underline">Temizle</button>
          ` : ''}
        </div>
      </div>

      <!-- 4. Üretim Planı Tablosu (Yoğun ve Profesyonel Görünüm) -->
      ${hasDraft ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div class="overflow-x-auto max-h-[640px]">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase z-10 select-none">
                <tr>
                  <th class="py-2.5 px-3 w-12 text-center"># Sıra</th>
                  <th class="py-2.5 px-1.5 w-14 text-center">Taşı</th>
                  <th class="py-2.5 px-2 w-16 text-center">Kilitler</th>
                  <th class="py-2.5 px-3">Stok Kodu & Adı</th>
                  <th class="py-2.5 px-2 text-center">Ebat</th>
                  <th class="py-2.5 px-3 text-right">Miktar (Adet)</th>
                  <th class="py-2.5 px-2.5">Kaynak Tarihleri (ERP)</th>
                  <th class="py-2.5 px-2.5">Önerilen Çizelge</th>
                  <th class="py-2.5 px-2 text-center">Ayar (Hazırlık)</th>
                  <th class="py-2.5 px-2 text-center">Net Üretim</th>
                  <th class="py-2.5 px-3 text-center">Termin Durumu</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                ${filteredItems.map((it, idx) => {
                  const originalIndex = items.findIndex(x => x.id === it.id);
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === items.length - 1;

                  // Fark rozeti
                  const diffMin = it.source_diff_minutes;
                  let diffBadge = '';
                  if (diffMin !== undefined && diffMin !== null && diffMin !== 0) {
                    if (diffMin > 0) {
                      diffBadge = `<span class="px-1 py-0.2 rounded text-[9px] bg-rose-100 text-rose-800 font-bold" title="${diffMin} dakika gecikme">+${Math.round(diffMin/60)} sa</span>`;
                    } else {
                      diffBadge = `<span class="px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold" title="${Math.abs(diffMin)} dakika erken">${Math.round(diffMin/60)} sa</span>`;
                    }
                  }

                  return `
                    <tr class="hover:bg-sky-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${it.is_collision ? 'bg-amber-50/60' : ''}">
                      <!-- 1. Sıra -->
                      <td class="py-2 px-3 text-center font-bold text-slate-700 bg-slate-50/50 tabular-nums">
                        #${it.sequence_order}
                      </td>

                      <!-- 2. Taşıma Butonları -->
                      <td class="py-2 px-1 text-center">
                        <div class="inline-flex items-center gap-0.5">
                          <button
                            onclick="moveDraftItem(${originalIndex}, -1);"
                            ${isFirst || state.currentRole === 'viewer' || it.is_sequence_locked ? 'disabled' : ''}
                            title="${it.is_sequence_locked ? 'Sıra kilitli' : 'Yukarı Taşı'}"
                            class="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          >▲</button>
                          <button
                            onclick="moveDraftItem(${originalIndex}, 1);"
                            ${isLast || state.currentRole === 'viewer' || it.is_sequence_locked ? 'disabled' : ''}
                            title="${it.is_sequence_locked ? 'Sıra kilitli' : 'Aşağı Taşı'}"
                            class="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          >▼</button>
                        </div>
                      </td>

                      <!-- 3. Kilitler (Başlangıç ve Sıra) -->
                      <td class="py-2 px-2 text-center">
                        <div class="inline-flex items-center gap-1">
                          <button
                            onclick="toggleItemStartLock('${it.id}');"
                            title="${it.is_start_locked ? 'Başlangıç Tarihi Kilitli (Kaldırmak için tıkla)' : 'Başlangıç Tarihini Kilitle'}"
                            class="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                          >
                            ${it.is_start_locked ? '🔒' : '<span class="opacity-30">🔓</span>'}
                          </button>
                          <button
                            onclick="toggleItemSequenceLock('${it.id}');"
                            title="${it.is_sequence_locked ? 'Sıra Kilitli (Kaldırmak için tıkla)' : 'Sırayı Kilitle'}"
                            class="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                          >
                            ${it.is_sequence_locked ? '📌' : '<span class="opacity-30">📍</span>'}
                          </button>
                        </div>
                      </td>

                      <!-- 4. Stok Kodu ve Açıklama -->
                      <td class="py-2 px-3">
                        <div class="font-bold text-slate-900">${it.stock_code}</div>
                        <div class="font-sans text-[11px] text-slate-600 truncate max-w-[220px]" title="${it.stock_name || ''}">
                          ${it.stock_name || '-'}
                        </div>
                      </td>

                      <!-- 5. Ebat -->
                      <td class="py-2 px-2 text-center font-mono text-[11px] text-slate-700">
                        ${it.tube_size ? `<span class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold">${it.tube_size}</span>` : '-'}
                      </td>

                      <!-- 6. Miktar (Düzenlenebilir) -->
                      <td class="py-2 px-3 text-right">
                        <button
                          onclick="editDraftItemQuantity('${it.id}');"
                          title="Miktarı değiştirmek için tıklayın"
                          class="font-bold text-indigo-700 hover:text-indigo-900 hover:underline tabular-nums cursor-pointer"
                        >
                          ${parseFloat(it.quantity).toLocaleString('tr-TR')}
                        </button>
                      </td>

                      <!-- 7. Kaynak Tarihleri (ERP) -->
                      <td class="py-2 px-2.5 text-slate-600">
                        <div class="text-[10px] space-y-0.5">
                          <div>Baş: <span class="text-slate-800">${it.source_start_date ? new Date(it.source_start_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : (it.start_date ? new Date(it.start_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-')}</span></div>
                          <div>Bit: <span class="text-slate-800">${it.source_end_date ? new Date(it.source_end_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : (it.end_date ? new Date(it.end_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-')}</span></div>
                        </div>
                      </td>

                      <!-- 8. Önerilen Çizelge Tarihleri -->
                      <td class="py-2 px-2.5">
                        ${it.suggested_start_date ? `
                          <div class="text-[10px] space-y-0.5">
                            <div class="flex items-center gap-1">
                              <span>🕒</span>
                              <span class="text-slate-900 font-semibold">${new Date(it.suggested_start_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div class="flex items-center gap-1">
                              <span>🏁</span>
                              <span class="text-emerald-800 font-bold">${new Date(it.suggested_end_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              ${diffBadge}
                            </div>
                          </div>
                        ` : `
                          <span class="text-slate-400 italic text-[10px]">— Hesaplanmadı —</span>
                        `}
                      </td>

                      <!-- 9. Hazırlık (Ayar) Süresi -->
                      <td class="py-2 px-2 text-center font-mono">
                        ${Number(it.setup_duration_minutes) > 0 ? `
                          <span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-bold" title="Kalıp/çap değişimi hazırlık süresi">
                            ${it.setup_duration_minutes} dk
                          </span>
                        ` : `
                          <span class="text-slate-400">0 dk</span>
                        `}
                      </td>

                      <!-- 10. Net Üretim Süresi -->
                      <td class="py-2 px-2 text-center font-mono">
                        ${it.production_duration_minutes ? `
                          <div>
                            <span class="font-bold text-slate-800">${Math.round(it.production_duration_minutes)} dk</span>
                            <div class="text-[9px] text-slate-500">${it.speed_units_per_minute ? Math.round(it.speed_units_per_minute) + ' ad/dk' : ''}</div>
                          </div>
                        ` : '-'}
                      </td>

                      <!-- 11. Termin Durumu -->
                      <td class="py-2 px-3 text-center">
                        ${it.is_collision ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="${it.collision_reason || 'Kilitli başlangıca yetişilemiyor'}">
                            ⚠️ Çakışma
                          </span>
                        ` : (it.is_delayed ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300" title="Termin ${it.delay_days} gün gecikmektedir">
                            ⚠️ +${it.delay_days} gün
                          </span>
                        ` : `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            ✓ Zamanında
                          </span>
                        `)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <!-- Taslak Henüz Yokken Referans Görünümü -->
        <div class="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4 shadow-xs">
          <div class="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto">
            📥
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-slate-900">Mevcut SQL Planı Henüz Alınmadı</h3>
            <p class="text-xs text-slate-500 font-sans max-w-md mx-auto">
              MikroDesktop_LIDER26.dbo.alper_tenekeuretim tablosundaki gerçek üretim planı kayıtlarını PostgreSQL'e aktararak düzenlemeye başlamak için önizleme yapınız.
            </p>
          </div>
          <button
            onclick="openSqlPlanPreviewModal();"
            class="px-5 py-2.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Mevcut SQL Planını Önizle ve İçeri Al
          </button>
        </div>
      `}

      <!-- 5. MODAL: Senaryo Kaydet ve Yönet -->
      ${state.showScenarioModal ? `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="text-lg">📁</span>
                <h3 class="font-bold text-slate-900 text-sm">Üretim Planı Senaryoları</h3>
              </div>
              <button onclick="closeScenarioModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
            </div>

            <!-- Tablar -->
            <div class="flex border-b border-slate-200 px-5 pt-2 gap-4 text-xs font-semibold">
              <button
                onclick="state.scenarioModalMode='list'; renderApp();"
                class="pb-2 border-b-2 ${state.scenarioModalMode==='list' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}"
              >
                Kayıtlı Senaryolar (${state.planScenarios?.length || 0})
              </button>
              <button
                onclick="state.scenarioModalMode='save'; renderApp();"
                class="pb-2 border-b-2 ${state.scenarioModalMode==='save' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}"
              >
                Mevcut Durumu Senaryo Olarak Kaydet
              </button>
            </div>

            <div class="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              ${state.scenarioModalMode === 'save' ? `
                <div class="space-y-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Senaryo Adı:</label>
                    <input
                      type="text"
                      id="txtScenarioName"
                      placeholder="Örn: 10 Kasım Revize Sıralaması (Çap Gruplamalı)"
                      class="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Açıklama / Karar Notu:</label>
                    <textarea
                      id="txtScenarioDesc"
                      rows="3"
                      placeholder="Ayar sürelerini azaltmak için 65 çap ürünler peş peşe toplandı..."
                      class="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                    ></textarea>
                  </div>
                  <button
                    onclick="saveCurrentScenario();"
                    class="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded text-xs transition-colors shadow-xs"
                  >
                    Senaryoyu Kaydet
                  </button>
                </div>
              ` : `
                <!-- Liste Modu -->
                ${state.planScenarios && state.planScenarios.length > 0 ? `
                  <div class="divide-y divide-slate-100 border border-slate-200 rounded">
                    ${state.planScenarios.map(sc => `
                      <div class="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div class="space-y-0.5 min-w-0">
                          <div class="font-bold text-slate-900">${sc.scenario_name}</div>
                          <div class="text-[11px] text-slate-500 font-sans truncate">${sc.description || 'Açıklama yok'}</div>
                          <div class="text-[10px] font-mono text-slate-400">
                            ${new Date(sc.created_at).toLocaleString('tr-TR')} | ${sc.item_count} Kalem | Toplam: ${Number(sc.total_quantity).toLocaleString('tr-TR')} Adet
                          </div>
                        </div>
                        <button
                          onclick="revertDraftToScenario('${sc.id}');"
                          class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded text-[11px] flex-shrink-0 cursor-pointer"
                        >
                          Geri Yükle
                        </button>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="p-8 text-center text-slate-400">Henüz kayıtlı bir senaryo bulunmuyor.</div>
                `}
              `}
            </div>

            <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onclick="closeScenarioModal();" class="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono">
                Kapat
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 6. MODAL: İhtiyaç Havuzundan İlave Plan Ekle -->
      ${state.showAddDemandModal ? `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="text-lg">➕</span>
                <h3 class="font-bold text-slate-900 text-sm">İhtiyaç Havuzundaki Talebi Üretim Planına Ekle</h3>
              </div>
              <button onclick="closeAddDemandModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
            </div>

            <div class="p-4 bg-sky-50 border-b border-sky-200 text-xs text-sky-950">
              Mevcut tüp üretim planında henüz yer almayan veya ilave planlama gerektiren dolum talepleri aşağıda listelenmiştir. Seçtiğiniz talep çalışma taslağının en sonuna yeni bir iş emri satırı olarak eklenecektir.
            </div>

            <div class="p-5 overflow-y-auto flex-1 space-y-2 text-xs font-mono">
              ${(() => {
                const candidates = (state.demands || []).filter(d => Number(d.additional_planning_needed || 0) > 0 || (Number(d.net_tup_ihtiyac || 0) > 0 && !d.plan_earliest_finish));
                if (candidates.length === 0) {
                  return '<div class="p-8 text-center text-slate-400">İhtiyaç havuzunda plana eklenecek açık talep bulunamadı (Tüm talepler karşılanmış veya planlanmış).</div>';
                }
                return `
                  <div class="border border-slate-200 rounded divide-y divide-slate-100">
                    ${candidates.slice(0, 30).map(d => `
                      <div class="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div class="space-y-0.5 min-w-0">
                          <div class="font-bold text-slate-900">${d.stock_code} - ${d.stock_name || ''}</div>
                          <div class="text-[11px] text-slate-600">İş No: ${d.is_no || '-'} | Termin: ${d.termin_tarihi ? String(d.termin_tarihi).slice(0, 10) : 'Belirtilmemiş'} | Ebat: ${d.tube_size || '-'}</div>
                          <div class="text-[10px] text-amber-700 font-bold">
                            İlave Planlama İhtiyacı: ${Number(d.additional_planning_needed || d.net_tup_ihtiyac || 0).toLocaleString('tr-TR')} Adet
                          </div>
                        </div>
                        <button
                          onclick="addDemandToPlan('${d.demand_key}', ${Number(d.additional_planning_needed || d.net_tup_ihtiyac || 0)});"
                          class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded text-xs flex-shrink-0 cursor-pointer"
                        >
                          Plana Ekle
                        </button>
                      </div>
                    `).join('')}
                  </div>
                `;
              })()}
            </div>

            <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onclick="closeAddDemandModal();" class="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono">
                Kapat
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 7. MODAL: SQL Plan Önizleme ve İçeri Alma -->
      ${state.showSqlPlanModal ? `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <!-- Modal Header -->
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="text-lg">📥</span>
                <h3 class="font-bold text-slate-900 text-sm">Mevcut SQL Planını Al (MikroDesktop_LIDER26.dbo.alper_tenekeuretim)</h3>
              </div>
              <button onclick="closeSqlPlanModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
            </div>

            <!-- Modal Body -->
            <div class="p-5 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
              ${state.isFetchingSqlPreview ? `
                <div class="p-12 text-center space-y-3">
                  <div class="inline-block animate-spin text-3xl">⚙️</div>
                  <div class="font-bold text-slate-700">SQL Server salt-okunur taranıyor...</div>
                  <div class="text-[11px] font-mono text-slate-500">MikroDesktop_LIDER26.dbo.alper_tenekeuretim kayıtları okunuyor.</div>
                </div>
              ` : state.sqlPlanPreview ? `
                <!-- Özet İstatistikler -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div class="text-[10px] text-slate-500 uppercase">Kaynak Tablo</div>
                    <div class="text-xs font-bold text-slate-800 truncate" title="${state.sqlPlanPreview.source_table}">${state.sqlPlanPreview.source_table}</div>
                  </div>
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div class="text-[10px] text-slate-500 uppercase">Toplam Kayıt</div>
                    <div class="text-sm font-bold text-indigo-700">${state.sqlPlanPreview.row_count} Satır</div>
                  </div>
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div class="text-[10px] text-slate-500 uppercase">Benzersiz Stok</div>
                    <div class="text-sm font-bold text-sky-700">${state.sqlPlanPreview.distinct_stocks || '-'} Kod</div>
                  </div>
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div class="text-[10px] text-slate-500 uppercase">Toplam Miktar</div>
                    <div class="text-sm font-bold text-emerald-700">${state.sqlPlanPreview.total_quantity.toLocaleString('tr-TR')} Adet</div>
                  </div>
                </div>

                <!-- Önceki Snapshot Karşılaştırması (Varsa) -->
                ${state.sqlPlanPreview.previous_comparison ? `
                  <div class="p-3 bg-indigo-50/70 border border-indigo-200 rounded text-indigo-950 font-mono text-[11px] space-y-1">
                    <div class="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span>📊</span>
                      <span>Önceki Snapshot ile Karşılaştırma:</span>
                      ${state.sqlPlanPreview.previous_comparison.is_source_changed ? `
                        <span class="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">Kaynak Değişti</span>
                      ` : ''}
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>Önceki Kaynak: <b>${state.sqlPlanPreview.previous_comparison.previous_source_table}</b> (${state.sqlPlanPreview.previous_comparison.previous_row_count} satır, ${state.sqlPlanPreview.previous_comparison.previous_total_quantity.toLocaleString('tr-TR')} adet)</div>
                      <div>Yeni Kaynak: <b>${state.sqlPlanPreview.previous_comparison.current_source_table}</b> (${state.sqlPlanPreview.previous_comparison.current_row_count} satır, ${state.sqlPlanPreview.previous_comparison.current_total_quantity.toLocaleString('tr-TR')} adet)</div>
                    </div>
                    <div class="text-slate-600 pt-0.5">
                      Fark: <b>+${state.sqlPlanPreview.previous_comparison.row_count_diff} Satır</b>, <b>+${state.sqlPlanPreview.previous_comparison.total_quantity_diff.toLocaleString('tr-TR')} Adet</b>
                    </div>
                  </div>
                ` : ''}

                <!-- Checksum ve Güvenlik Bilgisi -->
                <div class="p-3 bg-slate-100 rounded border border-slate-200 font-mono text-[11px] space-y-1">
                  <div><b>SHA256 Checksum:</b> <span class="text-indigo-800 font-bold">${state.sqlPlanPreview.checksum}</span></div>
                  <div><b>Kaynak Bağlantı:</b> ${state.sqlPlanPreview.source_host} / ${state.sqlPlanPreview.source_db}</div>
                </div>

                <!-- Analiz Uyarısı -->
                <div class="p-3 bg-sky-50 border border-sky-200 rounded text-sky-950 text-xs">
                  <p class="font-bold mb-1">📋 Sıra ve Veri Analizi:</p>
                  <p class="text-[11px] leading-relaxed">${state.sqlPlanPreview.sequence_analysis.description}</p>
                </div>

                <!-- Örnek Satırlar Önizlemesi -->
                <div class="space-y-1">
                  <div class="font-bold text-slate-800 text-xs">Okunan Satırların İlk 5 Kaydı (Kronolojik Sıra):</div>
                  <div class="border border-slate-200 rounded overflow-hidden">
                    <table class="w-full text-left text-[11px] font-mono">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="py-1.5 px-2">#</th>
                          <th class="py-1.5 px-2">Stok Kodu</th>
                          <th class="py-1.5 px-2">Açıklama</th>
                          <th class="py-1.5 px-2">Ebat</th>
                          <th class="py-1.5 px-2 text-right">Miktar</th>
                          <th class="py-1.5 px-2">Başlangıç</th>
                          <th class="py-1.5 px-2">Bitiş</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${state.sqlPlanPreview.items.slice(0, 5).map(it => `
                          <tr>
                            <td class="py-1 px-2 text-slate-500">${it.source_row_order}</td>
                            <td class="py-1 px-2 font-bold text-slate-800">${it.stock_code}</td>
                            <td class="py-1 px-2 font-sans truncate max-w-[180px]">${it.stock_name}</td>
                            <td class="py-1 px-2 text-slate-600">${it.tube_size || '-'}</td>
                            <td class="py-1 px-2 text-right font-bold text-indigo-700">${parseFloat(it.quantity).toLocaleString('tr-TR')}</td>
                            <td class="py-1 px-2 text-slate-600">${it.start_date ? it.start_date.slice(0, 16).replace('T', ' ') : '-'}</td>
                            <td class="py-1 px-2 text-slate-600">${it.end_date ? it.end_date.slice(0, 16).replace('T', ' ') : '-'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Kayıt Seçenekleri -->
                <div class="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input type="checkbox" id="chkUpdateDraft" checked class="rounded text-indigo-600">
                    <span>Aktif plan taslağını bu snapshot ile güncelle / oluştur</span>
                  </label>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 mb-1">Snapshot Açıklama Notu:</label>
                    <input
                      type="text"
                      id="sqlSnapNotes"
                      value="Kasım 2026 alper_tenekeuretim plan alımı (Faz 3A.1 Düzeltme)"
                      class="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    >
                  </div>
                </div>
              ` : `
                <div class="p-8 text-center text-slate-500">Önizleme verisi alınamadı.</div>
              `}
            </div>

            <!-- Modal Footer -->
            <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onclick="closeSqlPlanModal();"
                class="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono"
              >
                Vazgeç
              </button>
              ${state.sqlPlanPreview ? `
                <button
                  onclick="commitSqlPlanSnapshot();"
                  class="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Snapshot Olarak PostgreSQL'e Kaydet (${state.sqlPlanPreview.row_count} Kayıt)</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 5. MODAL: Snapshot Geçmişi -->
      ${state.showSnapshotHistoryModal ? `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden font-sans">
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="text-lg">🕒</span>
                <h3 class="font-bold text-slate-900 text-sm">Üretim Planı Snapshot Geçmişi</h3>
              </div>
              <button onclick="closeSnapshotHistoryModal();" class="text-slate-400 hover:text-slate-600 text-lg font-mono">✕</button>
            </div>

            <div class="p-5 overflow-y-auto flex-1 space-y-3">
              ${(state.planSnapshots || []).length > 0 ? `
                <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  ${state.planSnapshots.map(s => `
                    <div class="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 text-xs">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2 font-mono">
                          <b class="text-slate-900">${s.id}</b>
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">${s.status}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 font-sans">
                          ${s.notes || 'Açıklama belirtilmedi'}
                        </div>
                        <div class="text-[10px] font-mono text-slate-400">
                          Checksum: ${s.checksum.slice(0, 16)}... | Kullanıcı: ${s.created_by || 'system'}
                        </div>
                      </div>
                      <div class="text-right font-mono space-y-1">
                        <div class="font-bold text-indigo-700">${parseFloat(s.total_quantity).toLocaleString('tr-TR')} Adet</div>
                        <div class="text-[11px] text-slate-500">${s.row_count} Satır</div>
                        <div class="text-[10px] text-slate-400">${new Date(s.fetched_at).toLocaleString('tr-TR')}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="p-8 text-center text-slate-500 text-xs font-mono">
                  Henüz kaydedilmiş bir snapshot bulunmuyor.
                </div>
              `}
            </div>

            <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onclick="closeSnapshotHistoryModal();" class="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono">
                Kapat
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Screen 6: Entegrasyon Ekranı (Faz 3A.2 Gerçek ERP Sözleşmeleri & Staging)
function renderIntegration() {
  const views = state.erpViewsStatus || [
    { viewName: 'AA_tp_vw_StokKartlari', rowCount: 3755, status: 'READY', desc: 'Tüp, kesik, baskılı ve ham levha kartları' },
    { viewName: 'AA_tp_vw_TupBrutIhtiyac', rowCount: 443, status: 'READY', desc: 'Dolum iş emirlerinden gelen brüt talepler (4.998.757 tüp)' },
    { viewName: 'AA_tp_vw_ReceteBaglantilari', rowCount: 8609, status: 'READY', desc: 'Tüp → Kesik → Baskılı → Ham Levha reçete ağacı' },
    { viewName: 'AA_tp_vw_StokDepo', rowCount: 3755, status: 'READY', desc: 'Fiziksel ambar stoku, hariç/bloke ve net kullanılabilir stok' },
    { viewName: 'AA_tp_vw_PlanliTupArz', rowCount: 215, status: 'READY', desc: 'alper_tenekeuretim makine tüp planı (3.134.665 adet)' }
  ];

  const conn = state.erpConnection || { connected: true, latencyMs: 64, serverName: 'ErpSunucusu01', database: 'AA_LIDER' };
  const history = state.erpSyncHistory || [];

  return `
    <div class="space-y-6">
      <!-- Üst Bilgi Kartı -->
      <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-semibold text-slate-900 tracking-tight uppercase">SQL Server ERP Entegrasyon Merkezi</h1>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              Faz 3A.2 Canlı Senkron
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1 max-w-3xl">
            Şirket ERP veritabanı (AA_LIDER / MikroDesktop_LIDER26) ile salt-okunur sözleşme view'ları üzerinden idempotent senkronizasyon.
            ERP tablolarına hiçbir şekilde yazma yapılmaz; veriler PostgreSQL staging katmanına aktarılır.
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-shrink-0">
          <button
            onclick="testErpConnection();"
            ${state.isTestingConnection ? 'disabled' : ''}
            class="px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            ${getSvgIcon('check', 'w-4 h-4 text-emerald-600')}
            <span>${state.isTestingConnection ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
          </button>

          <button
            onclick="triggerErpSync();"
            ${state.isErpSyncing ? 'disabled' : ''}
            class="px-3.5 py-2 text-xs font-semibold rounded bg-sky-700 hover:bg-sky-800 text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            ${getSvgIcon('refresh', 'w-4 h-4')}
            <span>${state.isErpSyncing ? 'Senkronlanıyor...' : 'Canlı ERP\'yi Şimdi Senkronla'}</span>
          </button>
        </div>
      </div>

      <!-- Bağlantı Durumu Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- SQL Server ERP -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 class="font-bold text-slate-900 text-xs font-sans uppercase tracking-wider">SQL Server ERP Kaynağı</h3>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] ${conn.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${conn.connected ? '● Bağlı (Canlı)' : '○ Bağlantı Yok'}
            </span>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Hedef Sunucu / DB:</span>
              <b class="text-slate-900">${conn.serverName || 'lider-server'} / AA_LIDER</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Kaynak ERP DB:</span>
              <b class="text-slate-900">MikroDesktop_LIDER26</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Esas Tüp Plan Kaynağı:</span>
              <b class="text-sky-800 font-mono text-[11px]">[alper_tenekeuretim] (215 Satır)</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Tünel / Gecikme:</span>
              <b class="text-slate-800">11433 → 1433 (${conn.latencyMs || 64} ms)</b>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Erişim Modu:</span>
              <b class="text-emerald-700">Salt Okunur (SELECT) — Yazma Kesinlikle Yasak</b>
            </div>
          </div>
        </div>

        <!-- PostgreSQL Staging -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 class="font-bold text-slate-900 text-xs font-sans uppercase tracking-wider">PostgreSQL Staging & Uygulama DB</h3>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Aktif & Kalıcı
            </span>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Konteyner / DB:</span>
              <b class="text-slate-900">db:5432 / teneke_planlama</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Kalıcı Depolama:</span>
              <b class="text-sky-800">Docker Volume (pgdata)</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Staging Tabloları:</span>
              <b class="text-slate-900">erp_gross_demands, erp_stock_levels</b>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Korumalı Teknik Kartlar:</span>
              <b class="text-emerald-700 font-bold">27 Kart (Ezilmez, Bağımsız)</b>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Migrasyon Sürümü:</span>
              <b class="text-slate-800">006 (Auth & ERP Sync Şeması)</b>
            </div>
          </div>
        </div>
      </div>

      <!-- Sözleşme View'ları Tablosu -->
      <div class="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-900 uppercase tracking-wider">AA_LIDER Sözleşme View'ları (5/5 Doğrulandı)</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200">Sürümlü SQL</span>
          </div>
          <span class="text-[11px] font-mono text-slate-500">Konum: sql/views/*.sql</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
              <tr>
                <th class="py-2.5 px-3">View Sözleşmesi</th>
                <th class="py-2.5 px-3">Kapsam & Amacı</th>
                <th class="py-2.5 px-3 text-right">Kaynak Satır</th>
                <th class="py-2.5 px-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800 font-mono text-xs">
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-semibold text-sky-900">AA_tp_vw_StokKartlari</td>
                <td class="py-2.5 px-3 font-sans text-slate-600">Tüp, kesik, baskılı, ham levha, bombe ve dip stok kartları</td>
                <td class="py-2.5 px-3 text-right font-bold tabular-nums">3.755</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans font-semibold">HAZIR ✓</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-semibold text-sky-900">AA_tp_vw_TupBrutIhtiyac</td>
                <td class="py-2.5 px-3 font-sans text-slate-600">Dolum iş emirlerinden gelen pozitif brüt tüp talepleri (4.998.757 tüp)</td>
                <td class="py-2.5 px-3 text-right font-bold tabular-nums">443</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans font-semibold">HAZIR ✓</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-semibold text-sky-900">AA_tp_vw_ReceteBaglantilari</td>
                <td class="py-2.5 px-3 font-sans text-slate-600">Tüp → Kesik Levha → Baskılı Levha → Ham Levha reçete ağacı</td>
                <td class="py-2.5 px-3 text-right font-bold tabular-nums">8.609</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans font-semibold">HAZIR ✓</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-semibold text-sky-900">AA_tp_vw_StokDepo</td>
                <td class="py-2.5 px-3 font-sans text-slate-600">Eldeki toplam stok - Hariç/Bloke ambarlar = Net kullanılabilir stok</td>
                <td class="py-2.5 px-3 text-right font-bold tabular-nums">3.755</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans font-semibold">HAZIR ✓</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-semibold text-sky-900">AA_tp_vw_PlanliTupArz</td>
                <td class="py-2.5 px-3 font-sans text-slate-600">alper_tenekeuretim aktif tüp üretim planı ve makine çizelgesi</td>
                <td class="py-2.5 px-3 text-right font-bold tabular-nums">215</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans font-semibold">HAZIR ✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Senkron Koşu Geçmişi -->
      <div class="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-900 uppercase tracking-wider">ERP Senkronizasyon Çalıştırma Geçmişi</span>
          <span class="text-[11px] font-mono text-slate-500">Son ${history.length} Çalıştırma</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse font-mono">
            <thead class="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
              <tr>
                <th class="py-2 px-3">Koşu ID</th>
                <th class="py-2 px-3">Başlangıç</th>
                <th class="py-2 px-3">Kullanıcı</th>
                <th class="py-2 px-3 text-right">Katalog</th>
                <th class="py-2 px-3 text-right">Talepler</th>
                <th class="py-2 px-3 text-right">Stok</th>
                <th class="py-2 px-3 text-right">Reçete</th>
                <th class="py-2 px-3 text-center">Sonuç</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">
              ${history.length === 0 ? `
                <tr>
                  <td colspan="8" class="py-6 text-center text-slate-400 font-sans">
                    Henüz kayıtlı senkronizasyon koşusu bulunmuyor.
                  </td>
                </tr>
              ` : history.map(h => `
                <tr class="hover:bg-slate-50/60">
                  <td class="py-2 px-3 font-bold text-sky-800">#${h.id}</td>
                  <td class="py-2 px-3 text-slate-600 whitespace-nowrap">${new Date(h.started_at).toLocaleString('tr-TR')}</td>
                  <td class="py-2 px-3 text-slate-700">${h.triggered_by || 'system'}</td>
                  <td class="py-2 px-3 text-right tabular-nums">${h.catalog_count}</td>
                  <td class="py-2 px-3 text-right tabular-nums">${h.demands_count}</td>
                  <td class="py-2 px-3 text-right tabular-nums">${h.stock_count}</td>
                  <td class="py-2 px-3 text-right tabular-nums">${h.recipes_count}</td>
                  <td class="py-2 px-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${h.status === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
                      ${h.status === 'success' ? 'BAŞARILI' : 'HATA'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Screen 3.5: Matbaa ve Kombinasyon Kuralları Yönetimi
function renderPrintingRules() {
  const isLayoutTab = state.printingRulesTab !== 'combination';

  // Seçili ürün için uyumluluk sorgusu
  const targetStockCode = state.selectedProductForCompatibilityQuery || state.demands[0]?.stock_code;
  const targetProduct = state.demands.find(d => d.stock_code === targetStockCode) || state.demands[0];
  const targetStatus = normalizeLacquerStatus(targetProduct?.lacquer);

  const candidateResults = state.demands.map(candidate => {
    const pair = evaluateProductPairCompatibility(targetProduct, candidate, state.combinationRules);
    let statusBadge = { label: '✓ KOMBİNE EDİLEBİLİR', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    if (!pair.isCompatible) {
      if (pair.reasons.some(r => r.includes('BİLİNMİYOR') || r.includes('BELİRTİLMEMİŞ'))) {
        statusBadge = { label: '⚠️ BİLİNMEYEN LAK (RED)', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      } else {
        statusBadge = { label: '⛔ YASAKLI / ENGELLENDİ', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
      }
    } else if (pair.conflicts && pair.conflicts.length > 0) {
      statusBadge = { label: '⚡ ÇAKIŞMA (YASAK UYGULANDI)', bg: 'bg-orange-50 text-orange-800 border-orange-300' };
    }
    return {
      candidate,
      isCompatible: pair.isCompatible,
      statusBadge,
      reasons: pair.reasons,
      passedRules: pair.passedRules,
      conflicts: pair.conflicts
    };
  });

  return `
    <div class="space-y-6">
      <!-- Header & Sub-Tabs -->
      <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">🖨️</span>
              <h1 class="text-lg font-bold text-slate-900 tracking-tight">Matbaa & Kombinasyon Kuralları Yönetimi</h1>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Fiziksel montaj yerleşim kısıtları (Satır/Sütun) ve kimyasal/teknik kombinasyon kuralları (Lak & Çeşit Uyumu). Kod değiştirmeden yönetilebilir.
            </p>
          </div>

          <div class="flex items-center gap-2">
            ${isLayoutTab ? `
              <button onclick="openPrintingRuleModal();" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-mono font-bold shadow-xs">
                + Yeni Yerleşim Kuralı
              </button>
              <button onclick="resetPrintingRulesToDefault();" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-mono border border-slate-300">
                Varsayılana Sıfırla
              </button>
            ` : `
              <button onclick="openCombinationRuleModal();" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-mono font-bold shadow-xs">
                + Yeni Kombinasyon Kuralı
              </button>
              <button onclick="resetCombinationRulesToDefault();" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-mono border border-slate-300">
                Varsayılana Sıfırla
              </button>
            `}
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="flex border-b border-slate-200 gap-2 pt-2">
          <button
            onclick="state.printingRulesTab='layout'; renderApp();"
            class="px-4 py-2 text-xs font-mono font-bold border-b-2 transition-colors ${isLayoutTab ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}"
          >
            📐 Yerleşim Kuralları (Satır / Sütun) [${state.printingPressRules.length}]
          </button>
          <button
            onclick="state.printingRulesTab='combination'; renderApp();"
            class="px-4 py-2 text-xs font-mono font-bold border-b-2 transition-colors ${!isLayoutTab ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}"
          >
            🧪 Kombinasyon Kuralları (Lak & Çeşit Uyumu) [${state.combinationRules.length}]
          </button>
        </div>
      </div>

      ${isLayoutTab ? `
        <!-- TAB 1: YERLEŞİM KURALLARI -->
        <div class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
              <div class="text-[10px] font-mono text-slate-500 uppercase">Toplam Kural</div>
              <div class="text-xl font-bold font-mono text-slate-900 mt-1">${state.printingPressRules.length} Kural</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Aktif: ${state.printingPressRules.filter(r=>r.is_active).length}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
              <div class="text-[10px] font-mono text-slate-500 uppercase">Varsayılan Kural</div>
              <div class="text-sm font-bold font-mono text-sky-700 mt-1">SÜTUN Bazında Tek Çeşit</div>
              <div class="text-[11px] text-slate-500 mt-0.5">İstisnalar dışındaki tüm ebatlar</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
              <div class="text-[10px] font-mono text-slate-500 uppercase">Satır İstisnası (Kalıp)</div>
              <div class="text-sm font-bold font-mono text-purple-700 mt-1">SATIR Bazında Tek Çeşit</div>
              <div class="text-[11px] text-slate-500 mt-0.5">45×100, 52×105 ve Çap 65mm</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
              <div class="text-[10px] font-mono text-slate-500 uppercase">Kimlik Doğrulama</div>
              <div class="text-sm font-bold font-mono text-emerald-700 mt-1">variantKey Doğrulaması</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Yalnızca isim/renk değil; kod bazlı</div>
            </div>
          </div>

          <!-- Information Banner -->
          <div class="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-start gap-2">
            <span class="text-purple-600 font-bold">ℹ</span>
            <div class="space-y-0.5">
              <div class="font-bold">Fiziksel Matbaa Montaj Kısıtları İlkesi:</div>
              <div class="text-[11px] text-purple-800">
                Matbaa basım ve kesim teknolojisi gereği standart ebatlarda her <b>SÜTUN</b> kendi içinde tek bir ürün çeşidinden oluşmak zorundadır.
                <b>45×100, 52×105 ve Çapı 65 mm olan tüm kutularda</b> ise her <b>SATIR</b> kendi içinde tek çeşitten oluşmalıdır.
                Kuralı ihlal eden bir montaj asla "Doğrulanmış Düzen" veya "Üretime Onaylanabilir" durumuna geçemez.
              </div>
            </div>
          </div>

          <!-- Rules Table -->
          <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-mono">
              <span class="font-bold text-slate-700 uppercase">MATBAA YERLEŞİM KURALLARI LİSTESİ (ÖNCELİK SIRASINA GÖRE ÇÖZÜMLENİR)</span>
              <span class="text-slate-500">Düşük öncelik numarası önce uygulanır</span>
            </div>

            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                  <th class="py-2.5 px-3 text-center w-16">Öncelik</th>
                  <th class="py-2.5 px-3">Kural Kodu & Adı</th>
                  <th class="py-2.5 px-2">Kural Tipi</th>
                  <th class="py-2.5 px-2">Kapsam / Hedef Ölçü</th>
                  <th class="py-2.5 px-3">Açıklama</th>
                  <th class="py-2.5 px-2 text-center w-24">Durum</th>
                  <th class="py-2.5 px-2 text-center w-24">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                ${state.printingPressRules.map(r => `
                  <tr class="hover:bg-slate-50 ${!r.is_active ? 'opacity-60 bg-slate-50/50' : ''}">
                    <td class="py-2.5 px-3 text-center font-mono">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="changeRulePriority('${r.id}', -5);" class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center" title="Önceliği Artır">▲</button>
                        <span class="font-bold text-slate-800 text-xs">${r.priority}</span>
                        <button onclick="changeRulePriority('${r.id}', 5);" class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center" title="Önceliği Düşür">▼</button>
                      </div>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="font-mono font-bold text-sky-700">${r.code}</div>
                      <div class="font-semibold text-slate-900 text-xs">${r.name}</div>
                    </td>
                    <td class="py-2.5 px-2 font-mono">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.rule_type === 'SAME_VARIANT_PER_ROW' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-sky-50 text-sky-800 border border-sky-200'}">
                        ${r.rule_type === 'SAME_VARIANT_PER_ROW' ? 'SATIR BAZINDA' : 'SÜTUN BAZINDA'}
                      </span>
                    </td>
                    <td class="py-2.5 px-2 font-mono text-slate-700 text-xs">
                      ${r.applies_to_tube_size ? `Ebat: <b>${r.applies_to_tube_size}</b>` : ''}
                      ${r.applies_to_diameter ? `Çap: <b>${r.applies_to_diameter} mm</b>` : ''}
                      ${r.applies_to_height ? `Boy: <b>${r.applies_to_height} mm</b>` : ''}
                      ${!r.applies_to_tube_size && !r.applies_to_diameter && !r.applies_to_height ? '<span class="text-slate-400">Tüm Ölçüler (Varsayılan)</span>' : ''}
                    </td>
                    <td class="py-2.5 px-3 text-slate-600 text-[11px] leading-relaxed">
                      ${r.description}
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <button
                        onclick="togglePrintingRule('${r.id}');"
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${r.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-300'}"
                      >
                        ${r.is_active ? 'AKTİF' : 'PASİF'}
                      </button>
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <div class="flex items-center justify-center gap-1 font-mono text-xs">
                        <button onclick="openPrintingRuleModal('${r.id}');" class="text-sky-600 hover:text-sky-800 px-1 py-0.5" title="Düzenle">Düzenle</button>
                        <button onclick="deletePrintingRule('${r.id}');" class="text-rose-600 hover:text-rose-800 px-1 py-0.5" title="Sil">Sil</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <!-- TAB 2: KOMBİNASYON VE LAK KURALLARI -->
        <div class="space-y-6">
          <!-- Interactive Tool: "Bu Ürün Hangi Ürünlerle Kombine Edilebilir?" -->
          <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🔍</span>
                  <span>Bu Ürün Hangi Ürünlerle Kombine Edilebilir? (Akıllı Uyumluluk Sorgusu)</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Seçtiğiniz ürünün mevcut lak durumu ve aktif kombinasyon kurallarına göre diğer tüm ürünlerle karşılıklı eşleşme durumunu test eder.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-slate-600">Hedef Ürün:</span>
                <select
                  onchange="state.selectedProductForCompatibilityQuery=this.value; renderApp();"
                  class="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded px-2.5 py-1.5 font-mono outline-none focus:border-sky-500"
                >
                  ${state.demands.map(d => `
                    <option value="${d.stock_code}" ${d.stock_code === targetStockCode ? 'selected' : ''}>
                      ${d.stock_code} | ${d.stock_name.slice(0, 32)}... (${d.tube_size})
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Target Product Spec Pill -->
            ${targetProduct ? `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span class="text-slate-500">Seçili Ürün:</span>
                  <b class="text-slate-900 ml-1">${targetProduct.stock_name}</b>
                  <span class="text-slate-500 ml-2">(${targetProduct.stock_code})</span>
                </div>
                <div class="flex items-center gap-3">
                  <span>Ebat: <b>${targetProduct.tube_size}</b></span>
                  <span>Zemin: <b>${targetProduct.print_surface}</b></span>
                  <span>İç Kaplama: <b>${targetProduct.inside_coating || 'STANDART'}</b></span>
                  <span>
                    Lak Durumu:
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${targetStatus === 'LAKLI' ? 'bg-sky-50 text-sky-800 border-sky-300' : targetStatus === 'LAKSIZ' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-50 text-amber-800 border-amber-300'}">
                      ${targetStatus}
                    </span>
                  </span>
                </div>
              </div>
            ` : ''}

            <!-- Candidate Evaluation Grid -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                    <th class="py-2.5 px-3">Aday Ürün (Stok Kodu & İsmi)</th>
                    <th class="py-2.5 px-2">Ebat</th>
                    <th class="py-2.5 px-2">Zemin</th>
                    <th class="py-2.5 px-2 text-center">Aday Lak Durumu</th>
                    <th class="py-2.5 px-2 text-center">Eşleşme Durumu</th>
                    <th class="py-2.5 px-3">Kural Doğrulama & Gerekçe Açıklaması</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-sans">
                  ${candidateResults.map(res => {
                    const c = res.candidate;
                    const cStatus = normalizeLacquerStatus(c.lacquer);
                    const isSelf = c.stock_code === targetStockCode;
                    return `
                      <tr class="hover:bg-slate-50 ${isSelf ? 'bg-sky-50/40' : ''}">
                        <td class="py-2.5 px-3">
                          <div class="font-mono text-xs font-semibold text-slate-800">${c.stock_code}</div>
                          <div class="font-medium text-slate-900 line-clamp-1">${c.stock_name} ${isSelf ? '<span class="text-sky-700 font-bold font-mono text-[10px]">(Hedefin Kendisi)</span>' : ''}</div>
                        </td>
                        <td class="py-2.5 px-2 font-mono text-slate-600 text-xs">${c.tube_size}</td>
                        <td class="py-2.5 px-2 font-mono text-slate-600 text-xs">${c.print_surface}</td>
                        <td class="py-2.5 px-2 text-center font-mono">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${cStatus === 'LAKLI' ? 'bg-sky-50 text-sky-800 border-sky-300' : cStatus === 'LAKSIZ' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-50 text-amber-800 border-amber-300'}">
                            ${cStatus}
                          </span>
                        </td>
                        <td class="py-2.5 px-2 text-center font-mono">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${res.statusBadge.bg}">
                            ${res.statusBadge.label}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-[11px] font-mono leading-relaxed">
                          ${res.isCompatible ? `
                            <span class="text-emerald-700">✓ ${res.passedRules.join(' | ') || 'Uyumlu'}</span>
                          ` : `
                            <span class="text-rose-700 font-semibold">${res.reasons.join(' ')}</span>
                          `}
                          ${res.conflicts && res.conflicts.length > 0 ? `
                            <div class="text-amber-700 text-[10px] mt-0.5 font-bold">⚡ ${res.conflicts[0].resolution}</div>
                          ` : ''}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Combination Rules Table -->
          <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-2">
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-mono">
              <span class="font-bold text-slate-700 uppercase">PARAMETRİK LAK VE KOMBİNASYON KURALLARI LİSTESİ</span>
              <span class="text-slate-500">Açık yasaklar izinlerden önce değerlendirilir</span>
            </div>

            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                  <th class="py-2.5 px-3 text-center w-16">Öncelik</th>
                  <th class="py-2.5 px-3">Kod & Kural Başlığı</th>
                  <th class="py-2.5 px-2">Kural Türü</th>
                  <th class="py-2.5 px-2">Kapsam / Hedef</th>
                  <th class="py-2.5 px-2">Parametre Değeri</th>
                  <th class="py-2.5 px-3">Açıklama</th>
                  <th class="py-2.5 px-2 text-center w-24">Durum</th>
                  <th class="py-2.5 px-2 text-center w-24">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                ${state.combinationRules.map(r => `
                  <tr class="hover:bg-slate-50 ${!r.is_active ? 'opacity-60 bg-slate-50/50' : ''}">
                    <td class="py-2.5 px-3 text-center font-mono">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="changeCombinationRulePriority('${r.id}', -5);" class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center" title="Önceliği Artır">▲</button>
                        <span class="font-bold text-slate-800 text-xs">${r.priority}</span>
                        <button onclick="changeCombinationRulePriority('${r.id}', 5);" class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center" title="Önceliği Düşür">▼</button>
                      </div>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="font-mono font-bold text-sky-700">${r.code}</div>
                      <div class="font-semibold text-slate-900 text-xs">${r.name}</div>
                    </td>
                    <td class="py-2.5 px-2 font-mono">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.rule_type === 'FORBID_MIXED_LACQUER' || r.rule_type === 'FORBIDDEN_WITH_PRODUCTS' || r.rule_type === 'FORBIDDEN_WITH_PRODUCT_GROUPS'
                          ? 'bg-rose-50 text-rose-800 border border-rose-300'
                          : r.rule_type === 'ALLOW_MIXED_LACQUER'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : r.rule_type === 'EXCLUSIVE_SOLO_ONLY'
                          ? 'bg-purple-50 text-purple-800 border border-purple-300'
                          : 'bg-sky-50 text-sky-800 border border-sky-200'
                      }">
                        ${r.rule_type}
                      </span>
                    </td>
                    <td class="py-2.5 px-2 font-mono text-slate-700 text-xs">
                      ${r.target_type} ${r.target_product_code ? `(${r.target_product_code})` : ''}
                    </td>
                    <td class="py-2.5 px-2 font-mono text-slate-700 text-xs">
                      ${r.target_lacquer_status ? `Lak: <b>${r.target_lacquer_status}</b>` : ''}
                      ${r.param_product_codes && r.param_product_codes.length > 0 ? `Kodlar: <b>${r.param_product_codes.join(', ')}</b>` : ''}
                      ${!r.target_lacquer_status && (!r.param_product_codes || r.param_product_codes.length === 0) ? '—' : ''}
                    </td>
                    <td class="py-2.5 px-3 text-slate-600 text-[11px] leading-relaxed">
                      ${r.description}
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <button
                        onclick="toggleCombinationRule('${r.id}');"
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${r.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-300'}"
                      >
                        ${r.is_active ? 'AKTİF' : 'PASİF'}
                      </button>
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <div class="flex items-center justify-center gap-1 font-mono text-xs">
                        <button onclick="openCombinationRuleModal('${r.id}');" class="text-sky-600 hover:text-sky-800 px-1 py-0.5" title="Düzenle">Düzenle</button>
                        <button onclick="deleteCombinationRule('${r.id}');" class="text-rose-600 hover:text-rose-800 px-1 py-0.5" title="Sil">Sil</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
}

// Modal 1: Matbaa Yerleşim Kuralı Ekle / Düzenle
function renderPrintingRuleModal() {
  const r = state.editingPrintingRule;
  if (!r) return '';

  return `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg border border-slate-300 shadow-xl max-w-lg w-full p-6 space-y-4 font-sans text-xs">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 class="font-bold text-slate-900 text-sm">🖨️ Matbaa Yerleşim Kuralı Düzenle</h3>
          <button onclick="closePrintingRuleModal();" class="text-slate-400 hover:text-slate-600 text-base">✕</button>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Kodu:</label>
              <input type="text" value="${r.code}" onchange="state.editingPrintingRule.code=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Önceliği (1-100):</label>
              <input type="number" min="1" max="100" value="${r.priority}" onchange="state.editingPrintingRule.priority=parseInt(this.value,10)||50;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Başlığı / Adı:</label>
            <input type="text" value="${r.name}" onchange="state.editingPrintingRule.name=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold" />
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Zorunlu Kural Tipi:</label>
            <select onchange="state.editingPrintingRule.rule_type=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs">
              <option value="SAME_VARIANT_PER_ROW" ${r.rule_type==='SAME_VARIANT_PER_ROW'?'selected':''}>SAME_VARIANT_PER_ROW (Satır Bazında Tek Çeşit)</option>
              <option value="SAME_VARIANT_PER_COLUMN" ${r.rule_type==='SAME_VARIANT_PER_COLUMN'?'selected':''}>SAME_VARIANT_PER_COLUMN (Sütun Bazında Tek Çeşit)</option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[10px] font-mono text-slate-600 mb-1">Tüp Ebadı:</label>
              <input type="text" placeholder="Örn: 45x100" value="${r.applies_to_tube_size || ''}" onchange="state.editingPrintingRule.applies_to_tube_size=this.value||null;" class="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-xs" />
            </div>
            <div>
              <label class="block text-[10px] font-mono text-slate-600 mb-1">Çap (mm):</label>
              <input type="number" placeholder="Örn: 65" value="${r.applies_to_diameter || ''}" onchange="state.editingPrintingRule.applies_to_diameter=parseInt(this.value,10)||null;" class="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-xs" />
            </div>
            <div>
              <label class="block text-[10px] font-mono text-slate-600 mb-1">Boy (mm):</label>
              <input type="number" placeholder="Örn: 100" value="${r.applies_to_height || ''}" onchange="state.editingPrintingRule.applies_to_height=parseInt(this.value,10)||null;" class="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Açıklama / Matbaa Gerekçesi:</label>
            <textarea rows="3" onchange="state.editingPrintingRule.description=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs">${r.description || ''}</textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button onclick="closePrintingRuleModal();" class="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs">İptal</button>
          <button onclick="savePrintingRuleForm();" class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs shadow-xs">Değişiklikleri Kaydet</button>
        </div>
      </div>
    </div>
  `;
}

// Modal 2: Kombinasyon Kuralı Ekle / Düzenle
function renderCombinationRuleModal() {
  const r = state.editingCombinationRule;
  if (!r) return '';

  return `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg border border-slate-300 shadow-xl max-w-lg w-full p-6 space-y-4 font-sans text-xs">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 class="font-bold text-slate-900 text-sm">🧪 Kombinasyon & Lak Kuralı Düzenle</h3>
          <button onclick="closeCombinationRuleModal();" class="text-slate-400 hover:text-slate-600 text-base">✕</button>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Kodu:</label>
              <input type="text" value="${r.code}" onchange="state.editingCombinationRule.code=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Önceliği (1-100):</label>
              <input type="number" min="1" max="100" value="${r.priority}" onchange="state.editingCombinationRule.priority=parseInt(this.value,10)||50;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Başlığı / Adı:</label>
            <input type="text" value="${r.name}" onchange="state.editingCombinationRule.name=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold" />
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Kural Türü (İş Mantığı):</label>
            <select onchange="state.editingCombinationRule.rule_type=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs">
              <option value="FORBID_MIXED_LACQUER" ${r.rule_type==='FORBID_MIXED_LACQUER'?'selected':''}>FORBID_MIXED_LACQUER (Laklı ve Laksız Karışımı Açık Yasağı)</option>
              <option value="ONLY_WITH_LACQUERED" ${r.rule_type==='ONLY_WITH_LACQUERED'?'selected':''}>ONLY_WITH_LACQUERED (Yalnız Laklı Ürünlerle Kombine Edilebilir)</option>
              <option value="ONLY_WITH_UNLACQUERED" ${r.rule_type==='ONLY_WITH_UNLACQUERED'?'selected':''}>ONLY_WITH_UNLACQUERED (Yalnız Laksız Ürünlerle Kombine Edilebilir)</option>
              <option value="ALLOW_MIXED_LACQUER" ${r.rule_type==='ALLOW_MIXED_LACQUER'?'selected':''}>ALLOW_MIXED_LACQUER (Laklı ve Laksız Birlikte Kullanılabilir - İzin)</option>
              <option value="FORBIDDEN_WITH_PRODUCTS" ${r.rule_type==='FORBIDDEN_WITH_PRODUCTS'?'selected':''}>FORBIDDEN_WITH_PRODUCTS (Belirli Ürünlerle Kombinasyon Yasaktır)</option>
              <option value="FORBIDDEN_WITH_PRODUCT_GROUPS" ${r.rule_type==='FORBIDDEN_WITH_PRODUCT_GROUPS'?'selected':''}>FORBIDDEN_WITH_PRODUCT_GROUPS (Belirli Ürün Gruplarıyla Yasaktır)</option>
              <option value="ALLOWED_ONLY_WITH_PRODUCTS" ${r.rule_type==='ALLOWED_ONLY_WITH_PRODUCTS'?'selected':''}>ALLOWED_ONLY_WITH_PRODUCTS (Yalnızca Belirli Ürünlerle İzin Verilir)</option>
              <option value="EXCLUSIVE_SOLO_ONLY" ${r.rule_type==='EXCLUSIVE_SOLO_ONLY'?'selected':''}>EXCLUSIVE_SOLO_ONLY (Hiçbir Farklı Ürünle Kombine Edilemez - Solo)</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Hedef Kapsam:</label>
              <select onchange="state.editingCombinationRule.target_type=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs">
                <option value="GLOBAL" ${r.target_type==='GLOBAL'?'selected':''}>GLOBAL (Tüm Ürünler)</option>
                <option value="LACQUER_STATUS" ${r.target_type==='LACQUER_STATUS'?'selected':''}>LACQUER_STATUS (Lak Durumu)</option>
                <option value="PRODUCT" ${r.target_type==='PRODUCT'?'selected':''}>PRODUCT (Spesifik Ürün)</option>
                <option value="PRODUCT_GROUP" ${r.target_type==='PRODUCT_GROUP'?'selected':''}>PRODUCT_GROUP (Ürün Grubu)</option>
                <option value="TUBE_SIZE" ${r.target_type==='TUBE_SIZE'?'selected':''}>TUBE_SIZE (Ebat)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-mono text-slate-600 mb-1">Hedef Stok / Ürün Kodu:</label>
              <input type="text" placeholder="Örn: 511109010910-1001" value="${r.target_product_code || ''}" onchange="state.editingCombinationRule.target_product_code=this.value||null;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Parametre Ürün Kodları (Virgülle Ayrılmış):</label>
            <input type="text" placeholder="Örn: 511121010410-5004, 511121010410-5005" value="${(r.param_product_codes || []).join(', ')}" onchange="state.editingCombinationRule.param_product_codes=this.value.split(',').map(s=>s.trim()).filter(Boolean);" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs" />
          </div>

          <div>
            <label class="block text-[11px] font-mono text-slate-600 mb-1">Açıklama / Kural Gerekçesi:</label>
            <textarea rows="3" onchange="state.editingCombinationRule.description=this.value;" class="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs">${r.description || ''}</textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button onclick="closeCombinationRuleModal();" class="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs">İptal</button>
          <button onclick="saveCombinationRuleForm();" class="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs shadow-xs">Değişiklikleri Kaydet</button>
        </div>
      </div>
    </div>
  `;
}

// Master Router & Render
function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  let pageContent = '';
  switch (state.activePage) {
    case 'overview': pageContent = renderOverview(); break;
    case 'demands': pageContent = renderDemands(); break;
    case 'workbench': pageContent = renderWorkbench(); break;
    case 'printing_rules': pageContent = renderPrintingRules(); break;
    case 'technical': pageContent = renderTechnical(); break;
    case 'production': pageContent = renderProduction(); break;
    case 'integration': pageContent = renderIntegration(); break;
    default: pageContent = renderOverview();
  }

  app.innerHTML = `
    ${renderSidebar()}
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      ${renderHeader()}
      <main class="flex-1 overflow-y-auto p-6">
        ${pageContent}
      </main>
    </div>
    ${state.isPrintingRuleModalOpen ? renderPrintingRuleModal() : ''}
    ${state.isCombinationRuleModalOpen ? renderCombinationRuleModal() : ''}
    ${state.isProductModalOpen ? renderProductModal() : ''}
    ${state.isImportModalOpen ? renderImportModal() : ''}
  `;
}

// Global router and page functions exposed to window
window.state = state;
window.renderApp = renderApp;
window.renderOverview = renderOverview;
window.renderDemands = renderDemands;
window.renderWorkbench = renderWorkbench;
window.renderPrintingRules = renderPrintingRules;
window.renderTechnical = renderTechnical;
window.renderProduction = renderProduction;
window.renderIntegration = renderIntegration;

// Faz 5A Çizelgeleme ve Plan Yönetimi fonksiyonları
window.previewProductionSchedule = previewProductionSchedule;
window.commitProductionSchedule = commitProductionSchedule;
window.toggleItemStartLock = toggleItemStartLock;
window.toggleItemSequenceLock = toggleItemSequenceLock;
window.editDraftItemQuantity = editDraftItemQuantity;
window.openScenarioModal = openScenarioModal;
window.closeScenarioModal = closeScenarioModal;
window.saveCurrentScenario = saveCurrentScenario;
window.revertDraftToScenario = revertDraftToScenario;
window.openAddDemandModal = openAddDemandModal;
window.closeAddDemandModal = closeAddDemandModal;
window.addDemandToPlan = addDemandToPlan;
window.refreshPlanDraft = refreshPlanDraft;

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  renderApp();
  initBackendSync();
});
