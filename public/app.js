/**
 * Teneke Planlama - Client Application (Faz 0, Faz 1 ve Faz 2)
 * ALPER DESIGN OS Workbench — Professional LIGHT Theme
 *
 * İLKE: "Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından
 * tanımlanmış montaj düzeni görselleştirilir."
 */

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

// 7. HAT VE MAKİNELER
const INITIAL_PRODUCTION_LINES = [
  {id:'LINE-MAKAS-01', code:'MAKAS-01', name:'Hat 01 - Çiftli Otomatik Makas', line_type:'shearing', supported_tube_sizes:['52x195','52x214','65x104','65x195'], shifts_per_day:3, speed_units_per_hour:4500, waste_rate_percent:0.5},
  {id:'LINE-TUP-01', code:'HAT-01', name:'Tüp Gövde Üretim Hattı 1 (Otomatik)', line_type:'tube_body', supported_tube_sizes:['52x195','52x214','65x104','65x195'], shifts_per_day:3, speed_units_per_hour:12000, waste_rate_percent:1.2},
  {id:'LINE-TUP-02', code:'HAT-02', name:'Tüp Gövde Üretim Hattı 2 (Hızlı)', line_type:'tube_body', supported_tube_sizes:['45x140','45x175','52x165','52x234'], shifts_per_day:3, speed_units_per_hour:10000, waste_rate_percent:1.5}
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

  // Screen filters
  demandFilterSize: 'ALL',
  demandFilterSurface: 'ALL',
  demandFilterStatus: 'ALL',
  technicalTab: 'products',
  planView: 'list',

  // Matbaa & Kombinasyon Yönetimi State
  printingRulesTab: 'layout', // 'layout' | 'combination'
  selectedProductForCompatibilityQuery: '511109010910-1001',
  isPrintingRuleModalOpen: false,
  editingPrintingRule: null,
  isCombinationRuleModalOpen: false,
  editingCombinationRule: null
};

const PRODUCT_PALETTES = [
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-950', chip: 'bg-amber-500 text-white', badge: 'border-amber-400 bg-amber-50 text-amber-900' },
  { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-950', chip: 'bg-sky-500 text-white', badge: 'border-sky-400 bg-sky-50 text-sky-900' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-950', chip: 'bg-purple-500 text-white', badge: 'border-purple-400 bg-purple-50 text-purple-900' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-950', chip: 'bg-emerald-500 text-white', badge: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-950', chip: 'bg-rose-500 text-white', badge: 'border-rose-400 bg-rose-50 text-rose-900' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-950', chip: 'bg-teal-500 text-white', badge: 'border-teal-400 bg-teal-50 text-teal-900' }
];

function formatNum(n) {
  return (n || 0).toLocaleString('tr-TR');
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

function switchRole(role) {
  state.currentRole = role;
  localStorage.setItem('tp_current_role_v2', role);
  logAudit('user_role', role, 'update', `Aktif kullanıcı rolü değiştirildi: ${role}`);
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

// Navigation items
const NAV_ITEMS = [
  { id: 'overview', label: 'Planlama Özeti', icon: '📊' },
  { id: 'demands', label: 'İhtiyaç Havuzu', icon: '📥' },
  { id: 'workbench', label: 'Kombinasyon Masası', icon: '🧩' },
  { id: 'printing_rules', label: 'Matbaa & Kombinasyon Kuralları', icon: '🖨️' },
  { id: 'technical', label: 'Teknik Tanımlar & Parametreler', icon: '⚙️' },
  { id: 'production', label: 'Teneke Üretim Planı', icon: '🏭' },
  { id: 'integration', label: 'SQL Entegrasyonu', icon: '🔌' },
];

function renderSidebar() {
  return `
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-xs">
      <div class="h-16 flex items-center px-4 border-b border-slate-200 gap-3">
        <div class="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
          TP
        </div>
        <div>
          <div class="font-bold text-xs tracking-tight text-slate-900">TENEKE PLANLAMA</div>
          <div class="text-[10px] font-mono text-sky-700">Lider Fabrika Faz 2</div>
        </div>
      </div>

      <nav class="p-3 space-y-1 flex-1">
        ${NAV_ITEMS.map(item => `
          <button
            onclick="state.activePage='${item.id}'; renderApp();"
            class="w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all ${
              state.activePage === item.id
                ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }"
          >
            <span class="text-sm">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>

      <div class="p-3 border-t border-slate-200 space-y-2">
        <div class="text-[10px] font-mono text-slate-500">KULLANICI ROLÜ:</div>
        <select onchange="switchRole(this.value);" class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 outline-none font-mono">
          <option value="admin" ${state.currentRole==='admin'?'selected':''}>Yönetici (Admin)</option>
          <option value="planner" ${state.currentRole==='planner'?'selected':''}>Planlama Uzmanı</option>
          <option value="viewer" ${state.currentRole==='viewer'?'selected':''}>Görüntüleyici (Salt Okunur)</option>
        </select>

        <button
          onclick="if(confirm('Tüm demo verilerini fabrika varsayılanına sıfırlamak istiyor musunuz?')){ localStorage.clear(); location.reload(); }"
          class="w-full py-1 text-[11px] font-mono text-slate-500 hover:text-rose-600 border border-slate-200 rounded hover:bg-rose-50"
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
    ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-50 text-sky-800 border border-sky-300 font-bold">ROL: YÖNETİCİ</span>'
    : state.currentRole === 'planner'
    ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">ROL: PLANLAMA</span>'
    : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-800 border border-rose-300 font-bold">ROL: GÖRÜNTÜLEYİCİ</span>';

  return `
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-xs">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-bold text-slate-900 tracking-tight">${activeObj.label}</h2>
        <span class="text-xs text-slate-400 font-mono">/</span>
        <span class="text-xs text-slate-500 font-mono">Lider Aerosol Workbench</span>
      </div>

      <div class="flex items-center gap-3">
        ${roleBadge}
        <span class="px-2.5 py-1 text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200 rounded">
          Faz 2 Aktif
        </span>
      </div>
    </header>
  `;
}

// Screen 1: Planlama Özeti
function renderOverview() {
  const totalGross = state.demands.reduce((a, b) => a + b.gross_quantity, 0);
  const totalStock = state.demands.reduce((a, b) => a + b.available_stock, 0);
  const totalNet = state.demands.reduce((a, b) => a + b.net_quantity, 0);

  return `
    <div class="space-y-6">
      <!-- İlke Hatırlatması -->
      <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <span class="text-base text-amber-600">ℹ</span>
        <div>
          <div class="font-bold">Faz 2 İlkesi: Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir.</div>
          <div class="text-[11px] text-amber-800 mt-0.5">Fiziksel levha düzeni ekran genişliğine göre değişmez; tanımlı satır ve sütunlar sabit kalır.</div>
        </div>
      </div>

      <!-- KPI Kartları -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span class="text-[11px] font-mono uppercase text-slate-500">Brüt İhtiyaç Havuzu</span>
          <div class="text-2xl font-bold font-mono text-slate-900 mt-1">${formatNum(totalGross)}</div>
          <span class="text-[10px] text-slate-400 font-mono">Tüm dolum siparişleri</span>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span class="text-[11px] font-mono uppercase text-slate-500">Kullanılabilir Stok</span>
          <div class="text-2xl font-bold font-mono text-emerald-700 mt-1">${formatNum(totalStock)}</div>
          <span class="text-[10px] text-slate-400 font-mono">Teneke ambar stokları</span>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span class="text-[11px] font-mono uppercase text-slate-500">Net Üretim İhtiyacı</span>
          <div class="text-2xl font-bold font-mono text-sky-700 mt-1">${formatNum(totalNet)}</div>
          <span class="text-[10px] text-slate-400 font-mono">Montaja gidecek net tüp</span>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span class="text-[11px] font-mono uppercase text-slate-500">Tanımlı Montaj Düzenleri</span>
          <div class="text-2xl font-bold font-mono text-purple-700 mt-1">${state.sheetLayouts.length} / 18</div>
          <span class="text-[10px] text-slate-400 font-mono">Doğrulanmış fiziksel düzenler</span>
        </div>
      </div>

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

// Screen 2: İhtiyaç Havuzu
function renderDemands() {
  const filtered = state.demands.filter(d => {
    if (state.demandFilterSize !== 'ALL' && d.tube_size !== state.demandFilterSize) return false;
    if (state.demandFilterSurface !== 'ALL' && d.print_surface !== state.demandFilterSurface) return false;
    if (state.demandFilterStatus !== 'ALL' && d.definition_status !== state.demandFilterStatus) return false;
    return true;
  });

  const sizes = Array.from(new Set(state.demands.map(d => d.tube_size)));
  const surfaces = Array.from(new Set(state.demands.map(d => d.print_surface)));

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900">DOLUM VE SATIŞ TÜP İHTİYAÇLARI</h2>
          <p class="text-xs text-slate-500 mt-0.5">Zemin, vernik, lak ve iç kaplama 4 bağımsız alandır. Satırları seçip kombinasyona aktarabilirsiniz.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="state.activePage='workbench'; renderApp();" class="px-3.5 py-1.5 text-xs font-bold rounded bg-sky-600 text-white hover:bg-sky-700 shadow-sm flex items-center gap-1.5">
            <span>🧩 Kombinasyona Aktar</span>
            <span class="bg-sky-800 px-1.5 py-0.2 rounded text-[10px] font-mono">${state.selectedDemandIds.length}</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-sm">
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-semibold">EBAT:</span>
          <select onchange="state.demandFilterSize=this.value; renderApp();" class="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs">
            <option value="ALL">Tümü (${state.demands.length})</option>
            ${sizes.map(s => `<option value="${s}" ${state.demandFilterSize===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-semibold">ZEMİN:</span>
          <select onchange="state.demandFilterSurface=this.value; renderApp();" class="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs">
            <option value="ALL">Tümü</option>
            ${surfaces.map(s => `<option value="${s}" ${state.demandFilterSurface===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
              <th class="py-2.5 px-3 w-10 text-center"><input type="checkbox" onchange="toggleSelectAllDemands(this.checked);" /></th>
              <th class="py-2.5 px-3">Sipariş No</th>
              <th class="py-2.5 px-3">Tüp Adı & Stok Kodu</th>
              <th class="py-2.5 px-2">Ebat</th>
              <th class="py-2.5 px-2 text-right">Brüt İhtiyaç</th>
              <th class="py-2.5 px-2 text-right">Ambar Stok</th>
              <th class="py-2.5 px-2 text-right">Net İhtiyaç</th>
              <th class="py-2.5 px-2">Zemin</th>
              <th class="py-2.5 px-2">İç Kaplama</th>
              <th class="py-2.5 px-2">Renkler</th>
              <th class="py-2.5 px-2">Kayıt Türü</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${filtered.map(d => {
              const isSelected = state.selectedDemandIds.includes(d.id);
              return `
                <tr class="hover:bg-slate-50 ${isSelected ? 'bg-sky-50/50' : ''}">
                  <td class="py-2.5 px-3 text-center">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectDemand('${d.id}');" />
                  </td>
                  <td class="py-2.5 px-3 font-mono font-bold text-sky-700">${d.reference_no}</td>
                  <td class="py-2.5 px-3">
                    <div class="font-medium text-slate-900 line-clamp-1">${d.stock_name}</div>
                    <div class="text-[10px] font-mono text-slate-500">${d.stock_code}</div>
                  </td>
                  <td class="py-2.5 px-2 font-mono text-slate-700">${d.tube_size}</td>
                  <td class="py-2.5 px-2 text-right font-mono text-slate-500">${formatNum(d.gross_quantity)}</td>
                  <td class="py-2.5 px-2 text-right font-mono text-emerald-700 font-semibold">${d.available_stock > 0 ? `-${formatNum(d.available_stock)}` : '0'}</td>
                  <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-900">${formatNum(d.net_quantity)}</td>
                  <td class="py-2.5 px-2"><span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${d.print_surface==='METALİK'?'bg-purple-50 text-purple-800 border border-purple-200':'bg-slate-100 text-slate-700'}">${d.print_surface}</span></td>
                  <td class="py-2.5 px-2">
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${d.inside_coating==='GOLD'?'bg-amber-100 text-amber-900 border-amber-300 font-bold':'bg-slate-100 text-slate-600 border-slate-200'}">
                      ${d.inside_coating || 'BELİRTİLMEMİŞ'}
                    </span>
                  </td>
                  <td class="py-2.5 px-2"><div class="flex flex-wrap gap-1">${d.colors.map(renderColorChip).join('')}</div></td>
                  <td class="py-2.5 px-2">
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded ${d.record_kind==='source_transcription'?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-amber-50 text-amber-800 border border-amber-300'}">
                      ${d.record_kind==='source_transcription'?'KAYNAK':'DEMO'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
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

function toggleSelectAllDemands(checked) {
  state.selectedDemandIds = checked ? state.demands.map(d => d.id) : [];
  renderApp();
}

// Screen 4: Teknik Tanımlar ve Parametreler (Faz 2)
function renderTechnical() {
  const isReadOnly = state.currentRole === 'viewer';

  return `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-xs">
        <button onclick="state.technicalTab='products'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='products'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📦 Tüp Kartları</button>
        <button onclick="state.technicalTab='layouts'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='layouts'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📐 Montaj Görünümü (${state.sheetLayouts.length})</button>
        <button onclick="state.technicalTab='rules'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='rules'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">⚖️ İş Kuralları (${state.businessRules.length})</button>
        <button onclick="state.technicalTab='raw_sheets'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='raw_sheets'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📄 Ham Levhalar (14)</button>
        <button onclick="state.technicalTab='capacities'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='capacities'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">📏 Ebat / Kapasite (18)</button>
        <button onclick="state.technicalTab='lines'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='lines'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">🏭 Hat ve Vardiyalar</button>
        <button onclick="state.technicalTab='audit'; renderApp();" class="px-3 py-1.5 rounded ${state.technicalTab==='audit'?'bg-sky-600 text-white font-bold':'text-slate-600 bg-slate-100 hover:bg-slate-200'}">🛡️ Denetim İzi (${state.auditLogs.length})</button>
        <button onclick="state.activePage='printing_rules'; renderApp();" class="px-3 py-1.5 rounded text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 font-bold ml-auto">🖨️ Matbaa & Kombinasyon Kuralları ↗</button>
      </div>

      ${state.technicalTab === 'products' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Stok Kodu</th>
                <th class="py-2.5 px-3">Stok Adı</th>
                <th class="py-2.5 px-2">Ebat</th>
                <th class="py-2.5 px-2">Zemin</th>
                <th class="py-2.5 px-2">Vernik</th>
                <th class="py-2.5 px-2">Lak</th>
                <th class="py-2.5 px-2">İç Kaplama</th>
                <th class="py-2.5 px-2">Kayıt Türü</th>
                <th class="py-2.5 px-3">Renkler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              ${state.demands.map(p => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-mono font-semibold text-sky-700">${p.stock_code}</td>
                  <td class="py-2.5 px-3 font-medium text-slate-900">${p.stock_name}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-700">${p.tube_size}</td>
                  <td class="py-2.5 px-2 font-mono text-[10px] font-semibold text-slate-700">${p.print_surface}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-600">${p.varnish}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-600">${p.lacquer}</td>
                  <td class="py-2.5 px-2">
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${p.inside_coating==='GOLD'?'bg-amber-100 text-amber-900 border-amber-300 font-bold':'bg-slate-100 text-slate-600 border-slate-200'}">
                      ${p.inside_coating || 'BELİRTİLMEMİŞ'}
                    </span>
                  </td>
                  <td class="py-2.5 px-2">
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded ${p.record_kind==='source_transcription'?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-amber-50 text-amber-800 border border-amber-300'}">
                      ${p.record_kind==='source_transcription'?'KAYNAK VERİ':'TEMSİLİ DEMO'}
                    </span>
                  </td>
                  <td class="py-2.5 px-3"><div class="flex flex-wrap gap-1">${p.colors.map(renderColorChip).join('')}</div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${state.productionLines.map(line => `
            <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2">
              <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span class="font-bold text-slate-900 font-mono">${line.code}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">${line.line_type==='shearing'?'Makas':'Tüp Gövde'}</span>
              </div>
              <div class="text-xs font-semibold text-slate-800">${line.name}</div>
              <div class="text-xs font-mono space-y-1 text-slate-600">
                <div class="flex justify-between"><span>Vardiya:</span><b>${line.shifts_per_day} Vardiya</b></div>
                <div class="flex justify-between"><span>Hız:</span><b class="text-sky-700">${formatNum(line.speed_units_per_hour)} birim/saat</b></div>
                <div class="flex justify-between"><span>Fire:</span><b class="text-rose-700">%${line.waste_rate_percent}</b></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : state.technicalTab === 'audit' ? `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-2">
          <div class="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>SİSTEM DENETİM İZİ (AUDIT LOG - ${state.auditLogs.length} Kayıt)</span>
            <span class="font-mono text-slate-500">Kritik değişiklikler kayıt altındadır</span>
          </div>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Zaman</th>
                <th class="py-2.5 px-3">Kullanıcı & Rol</th>
                <th class="py-2.5 px-2">Varlık Türü</th>
                <th class="py-2.5 px-2">İşlem</th>
                <th class="py-2.5 px-3">Detay Açıklama</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
              ${state.auditLogs.map(l => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2 px-3 text-slate-500">${l.timestamp}</td>
                  <td class="py-2 px-3 font-semibold text-slate-800">${l.user_name} <span class="text-[9px] text-slate-400">(${l.user_role})</span></td>
                  <td class="py-2 px-2 text-slate-700">${l.entity_type}</td>
                  <td class="py-2 px-2"><span class="px-1.5 py-0.2 rounded font-bold text-[10px] bg-slate-100 text-slate-700">${l.action.toUpperCase()}</span></td>
                  <td class="py-2 px-3 font-sans text-slate-700">${l.details}</td>
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
                <th class="py-2.5 px-3">Kısa İsim</th>
                <th class="py-2.5 px-3">Stok Kodu</th>
                <th class="py-2.5 px-3">Stok İsmi</th>
                <th class="py-2.5 px-2">Ebat</th>
                <th class="py-2.5 px-2 text-center">Kalınlık</th>
                <th class="py-2.5 px-2 text-right">En (mm)</th>
                <th class="py-2.5 px-2 text-right">Boy (mm)</th>
                <th class="py-2.5 px-2 text-center">Kalite</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              ${state.rawSheets.map(r => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-bold text-sky-700">${r.short_name}</td>
                  <td class="py-2.5 px-3 text-slate-700">${r.stock_code}</td>
                  <td class="py-2.5 px-3 text-slate-900">${r.stock_name}</td>
                  <td class="py-2.5 px-2 text-slate-700">${r.tube_size}</td>
                  <td class="py-2.5 px-2 text-center text-slate-600">${r.thickness_source_value}</td>
                  <td class="py-2.5 px-2 text-right text-slate-600 font-bold">${r.width_mm}</td>
                  <td class="py-2.5 px-2 text-right text-slate-600 font-bold">${r.height_mm}</td>
                  <td class="py-2.5 px-2 text-center text-slate-600">${r.grade_source}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-3">
          <div class="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex justify-between items-center">
            <span>
              <b>EBAT / KAPASİTE VE MONTAJ GRUBU PARAMETRELERİ (18 Ebat)</b> — Kural: <code>Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı</code>
            </span>
            <span class="text-emerald-700 font-mono font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              ✓ 18 Ebat Tam Doğrulandı
            </span>
          </div>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
                <th class="py-2.5 px-3">Kutu Ebadı</th>
                <th class="py-2.5 px-3 text-right">Kapasite (Tüp/Levha)</th>
                <th class="py-2.5 px-2 text-center">Montaj Grubu</th>
                <th class="py-2.5 px-2 text-center">Ürün Tekrar Adımı</th>
                <th class="py-2.5 px-2 text-center">Eşitlik Doğrulaması</th>
                <th class="py-2.5 px-2 text-center">Kaynak Çeşit</th>
                <th class="py-2.5 px-2 text-right">Adet (1.250 için)</th>
                <th class="py-2.5 px-3 text-right">Tek Çeşit Sipariş Miktarı</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              ${state.capacities.map(c => {
                const groups = c.assembly_group_count || c.variety_source;
                const step = c.repeat_step || (groups > 0 ? c.units_per_sheet / groups : 0);
                const isMatch = c.units_per_sheet === groups * step;
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="py-2.5 px-3 font-bold text-sky-700">${c.tube_size}</td>
                    <td class="py-2.5 px-3 text-right font-bold text-slate-900">${c.units_per_sheet} Tüp</td>
                    <td class="py-2.5 px-2 text-center font-bold text-slate-800">${groups} Grup</td>
                    <td class="py-2.5 px-2 text-center font-bold text-sky-700">${step} Tekrar</td>
                    <td class="py-2.5 px-2 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isMatch ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'}">
                        ${isMatch ? `✓ ${groups} × ${step} = ${c.units_per_sheet}` : '⛔ Uyuşmazlık'}
                      </span>
                    </td>
                    <td class="py-2.5 px-2 text-center text-slate-500">${c.variety_source}</td>
                    <td class="py-2.5 px-2 text-right text-slate-700">${formatNum(c.quantity_source)}</td>
                    <td class="py-2.5 px-3 text-right font-bold text-slate-900">${formatNum(c.single_variety_order_quantity_source)}</td>
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

// Screen 5: Teneke Üretim Planı
function renderProduction() {
  return `
    <div class="space-y-4">
      <div class="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between text-xs shadow-sm">
        <div class="flex items-center gap-2">
          <span class="text-base">🏭</span>
          <div>
            <span class="font-bold text-sky-800">REFERANS ÜRETİM PLANI: </span>
            <span class="text-slate-700">Kaynak görseldeki 20 adet 2026 Kasım plan satırıdır. Hat ve termin optimizasyonu Faz 5 konusudur.</span>
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase">
              <th class="py-2.5 px-3">Hafta</th>
              <th class="py-2.5 px-3">Bitiş Tarihi</th>
              <th class="py-2.5 px-3">Tüketim Kodu</th>
              <th class="py-2.5 px-3">Tüketim Adı</th>
              <th class="py-2.5 px-2">Ebat</th>
              <th class="py-2.5 px-2 text-right">Üretilecek Miktar</th>
              <th class="py-2.5 px-2">Hat</th>
              <th class="py-2.5 px-2">Malzeme Durumu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-sans">
            ${state.productionPlans.map(p => `
              <tr class="hover:bg-slate-50">
                <td class="py-2.5 px-3 font-mono font-semibold text-slate-600">${p.week_source}</td>
                <td class="py-2.5 px-3 font-mono text-slate-800">${p.finish_date}</td>
                <td class="py-2.5 px-3 font-mono font-semibold text-sky-700">${p.consumption_code}</td>
                <td class="py-2.5 px-3 font-medium text-slate-900">${p.consumption_name}</td>
                <td class="py-2.5 px-2 font-mono text-slate-700">${p.tube_size}</td>
                <td class="py-2.5 px-2 text-right font-mono font-bold text-slate-900">${formatNum(p.planned_units)}</td>
                <td class="py-2.5 px-2 font-mono text-slate-600 text-[11px]">${p.machine || 'HAT-01'}</td>
                <td class="py-2.5 px-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono ${p.material_status==='ready'?'bg-emerald-50 text-emerald-800 border border-emerald-300':'bg-amber-50 text-amber-800 border border-amber-300'}">
                    ${p.material_status==='ready'?'Hazır':'Kalite Bekliyor'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Screen 6: Entegrasyon Ekranı
function renderIntegration() {
  return `
    <div class="space-y-6">
      <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
        <span class="text-amber-600 font-bold">ℹ</span>
        <div>
          <b>Faz 2 Kalıcı Veri & Gelecek Faz 3 ERP Entegrasyon Taslağı:</b>
          Faz 2 veritabanı PostgreSQL (16-alpine) olarak modellenmiştir ve container yeniden başlatmalarında veriler korunur.
          SQL Server ERP entegrasyonu Faz 3 kapsamındadır.
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 font-mono text-xs">
          <h3 class="font-bold text-slate-900 text-sm font-sans">PostgreSQL Bağlantı Durumu (Faz 2)</h3>
          <div class="space-y-2">
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Sunucu / Host:</span><b class="text-slate-800">db:5432</b></div>
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Veritabanı:</span><b class="text-slate-800">teneke_planlama</b></div>
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Kullanıcı:</span><b class="text-slate-800">postgres</b></div>
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Volume Diski:</span><b class="text-sky-700">pgdata (Kalıcı Volume)</b></div>
            <div class="flex justify-between py-1"><span>Durum:</span><b class="text-emerald-700 font-bold">Aktif & Korunuyor ✓</b></div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 font-mono text-xs">
          <h3 class="font-bold text-slate-900 text-sm font-sans">SQL Server ERP View Eşleme Taslağı (Faz 3)</h3>
          <div class="space-y-2">
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Sunucu:</span><b class="text-slate-500">sql01.fabrika.local:1433</b></div>
            <div class="flex justify-between py-1 border-b border-slate-100"><span>İhtiyaç View'ı:</span><b class="text-slate-500">VW_DOLUM_TUP_TALEP</b></div>
            <div class="flex justify-between py-1 border-b border-slate-100"><span>Stok View'ı:</span><b class="text-slate-500">VW_TENEKE_STOK_DURUM</b></div>
            <div class="flex justify-between py-1"><span>Durum:</span><b class="text-amber-700 font-bold">Faz 3 İçin Beklemede (Uydurma Yapılmaz)</b></div>
          </div>
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
  `;
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
