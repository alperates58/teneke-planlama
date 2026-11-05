/**
 * Teneke Planlama - Domain Tipleri ve Veri Modelleri
 * Faz 0, Faz 1 ve Faz 2
 * "Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir."
 */

export type RecordKind = 'source_transcription' | 'synthetic_demo';

export interface RawSheet {
  short_name: string;
  stock_code: string;
  stock_name: string;
  thickness_source_value: number;
  thickness_unit_confirmed: boolean;
  width_mm: number;
  height_mm: number;
  grade_source: string;
  tube_size: string;
  minimum_print_sheets_source: number | null;
  source?: string;
  record_kind?: RecordKind;
}

export interface TubeCapacity {
  tube_size: string;
  units_per_sheet: number;
  assembly_group_count: number; // Montaj grubu sayısı (eski çeşit alanı)
  repeat_step: number; // Ürün tekrar adımı = units_per_sheet / assembly_group_count
  variety_source: number;
  quantity_source: number;
  single_variety_order_quantity_source: number;
  reference_sheet_count: number;
  distribution_semantics_confirmed: boolean;
  source?: string;
  record_kind?: RecordKind;
}

/**
 * Kullanıcı tanımlı gerçek fiziksel montaj yerleşimi
 * Geometrik sığdırma veya nesting hesabı yapılmaz; hazır kapasite değiştirilmez.
 */
export interface SheetLayout {
  id: string;
  tube_size: string;
  raw_sheet_code: string;
  rows: number;
  cols: number;
  orientation: 'landscape' | 'portrait';
  cell_order: 'row_major' | 'column_major';
  verification_status: 'verified' | 'unverified' | 'provisional' | 'violates_printing_rule';
  margin_mm?: number;
  gap_mm?: number;
  notes?: string;
  record_kind: RecordKind;
}

// ----------------------------------------------------------------------------
// MATBAA YERLEŞİM KURALLARI (Printing Press Layout Rules)
// ----------------------------------------------------------------------------
export type PrintingRuleType = 'SAME_VARIANT_PER_COLUMN' | 'SAME_VARIANT_PER_ROW';

export interface PrintingPressRule {
  id: string;
  code: string;
  name: string;
  rule_type: PrintingRuleType;
  applies_to_diameter: number | null; // e.g. 65 for all 65mm tubes, or null
  applies_to_height: number | null;   // e.g. 100 for 45x100, or null
  applies_to_tube_size: string | null; // e.g. '45x100', '52x105', '65x*', or 'DEFAULT'
  priority: number; // lower number = higher priority (e.g. 10 for specific size, 20 for diameter, 100 for default)
  is_active: boolean;
  description: string;
  is_system_default?: boolean;
}

export interface GridCell {
  rowIndex: number;
  colIndex: number;
  slotIndex: number;
  productId: string | null;
  stockCode: string | null;
  stockName: string | null;
  variantKey: string | null; // Identifier used for strict variant identity (productId / stockCode)
  paletteIndex: number;
  repeatIndex: number; // e.g. 1 of 4
  isViolated: boolean;
  violationMessage?: string;
}

export interface LayoutRuleValidationResult {
  ruleApplied: PrintingPressRule;
  isValid: boolean;
  ruleType: PrintingRuleType;
  isException: boolean;
  homogeneousRowsCount: number;
  homogeneousColsCount: number;
  totalRows: number;
  totalCols: number;
  violatedRowIndices: number[];
  violatedColIndices: number[];
  violationMessages: string[];
  grid: GridCell[][];
}

// ----------------------------------------------------------------------------
// PARAMETRİK LAK VE ÜRÜN KOMBİNASYON KURALLARI (Product & Lacquer Combination Rules)
// ----------------------------------------------------------------------------
export type CombinationRuleType =
  | 'ONLY_WITH_LACQUERED'           // Yalnız laklı ürünlerle kombine edilebilir
  | 'ONLY_WITH_UNLACQUERED'         // Yalnız laksız ürünlerle kombine edilebilir
  | 'ALLOW_MIXED_LACQUER'           // Laklı ve laksız birlikte kullanılabilir (izin)
  | 'FORBID_MIXED_LACQUER'          // Laklı ve laksız aynı levhada bulunamaz (açık yasak)
  | 'FORBIDDEN_WITH_PRODUCTS'       // Belirli ürünlerle kombinasyon yasaktır
  | 'FORBIDDEN_WITH_PRODUCT_GROUPS' // Belirli ürün gruplarıyla kombinasyon yasaktır
  | 'ALLOWED_ONLY_WITH_PRODUCTS'    // Yalnızca belirli ürünlerle kombinasyona izin verilir
  | 'ALLOWED_ONLY_WITH_PRODUCT_GROUPS' // Yalnızca belirli ürün gruplarıyla kombinasyona izin verilir
  | 'EXCLUSIVE_SOLO_ONLY';          // Hiçbir farklı ürünle kombine edilemez (tek başına)

export type LacquerStatus = 'LAKLI' | 'LAKSIZ' | 'BILINMIYOR';

export interface ProductCombinationRule {
  id: string;
  code: string;
  name: string;
  rule_type: CombinationRuleType;
  target_type: 'GLOBAL' | 'PRODUCT' | 'PRODUCT_GROUP' | 'TUBE_SIZE' | 'LACQUER_STATUS';
  target_product_code?: string | null;     // Spesifik stok kodu
  target_product_group?: string | null;    // Ürün kategorisi / grubu
  target_tube_size?: string | null;        // Ebat filtresi
  target_lacquer_status?: string | null;   // 'LAKLI' | 'LAKSIZ' | 'BILINMIYOR'
  param_product_codes?: string[];          // İlgili yasaklı/izinli ürün kodları
  param_product_groups?: string[];         // İlgili ürün grupları
  priority: number;                        // Düşük sayı = yüksek öncelik
  is_active: boolean;
  valid_from?: string | null;              // YYYY-MM-DD
  valid_to?: string | null;                // YYYY-MM-DD
  description: string;
  is_system_default?: boolean;
}

export interface RuleConflictInfo {
  ruleACode: string;
  ruleBCode: string;
  message: string;
  resolution: string; // e.g. 'Açık yasak izin kuralından önce değerlendirildi.'
}

export interface CombinationRuleEvaluationResult {
  isCompatible: boolean;
  rulesEvaluated: Array<{
    ruleId: string;
    ruleCode: string;
    ruleName: string;
    ruleType: CombinationRuleType;
    status: 'passed' | 'violated' | 'warning' | 'conflict';
    message: string;
  }>;
  conflicts: RuleConflictInfo[];
  violationReasons: string[];
  passedRules: string[];
  unknownLacquerProducts: string[];
}

export interface ProductTechnical {
  stock_code: string;
  stock_name: string;
  tube_size: string;
  diameter_mm: number;
  height_mm: number;
  raw_sheet_description_source: string;
  raw_sheet_stock_code_candidate: string | null;
  raw_sheet_code_mapping_status: 'matched' | 'description_and_size_match_requires_ERP_verification' | 'unmapped';
  print_surface: 'METALİK' | 'EMAYE' | string;
  varnish: 'PARLAK' | 'MAT' | 'KISMİ' | 'BELİRTİLMEMİŞ' | string;
  lacquer: 'LAKLI' | 'LAKSIZ' | 'BELİRTİLMEMİŞ' | string;
  inside_coating: 'GOLD' | 'STANDART' | 'BELİRTİLMEMİŞ' | string;
  colors: string[];
  special_parameter_source: string | null;
  source?: string;
  record_kind: RecordKind;
  notes?: string;
}

export interface DemandItem {
  id: string;
  reference_no: string;
  stock_code: string;
  stock_name: string;
  tube_size: string;
  diameter_mm: number;
  height_mm: number;
  due_date: string; // YYYY-MM-DD
  gross_quantity: number;
  available_stock: number;
  net_quantity: number;
  raw_sheet_code: string;
  raw_sheet_desc: string;
  print_surface: string;
  varnish: string;
  lacquer: string;
  inside_coating: string;
  colors: string[];
  definition_status: 'complete' | 'missing_raw_sheet' | 'requires_verification';
  customer_or_brand?: string;
  order_type?: 'RPT' | 'REVIZE' | 'YENI';
  scope_note?: string;
  record_kind: RecordKind;
}

export interface ProductionPlanItem {
  id: string;
  week_source: string;
  finish_date: string; // YYYY-MM-DD
  consumption_code: string;
  consumption_name: string;
  tube_size: string;
  planned_units: number;
  machine: string | null;
  shift: string | null;
  material_status: 'ready' | 'awaiting_quality' | 'awaiting_print' | 'missing_raw_sheet';
  source?: string;
  record_kind?: RecordKind;
}

export interface PrintOrderItem {
  name: string;
  repeats_per_sheet: number;
  theoretical_units: number;
}

export interface PrintOrderReference {
  sequence: number;
  tube_size: string;
  product_group: string;
  items: PrintOrderItem[];
  inside: string; // İç kaplama (örn. GOLD)
  outside: string; // Zemin (örn. EMAYE)
  colors: string[];
  raw_sheet_dimensions_source: string;
  sheet_count: number;
  order_date: string;
  delivery_date: string;
  product_revision_source: string;
  note_source: string;
  printer: string;
  prepared_by_source: string;
  form_number: string;
  form_publication_date: string;
  form_revision: string;
  form_revision_date: string;
  source: string;
  record_kind: RecordKind;
}

export interface CombinationWorkbenchItem {
  product_id: string;
  stock_code: string;
  stock_name: string;
  tube_size: string;
  print_surface: string;
  varnish?: string;
  lacquer?: string;
  inside_coating?: string;
  colors: string[];
  net_demand: number;
  repeats_per_sheet: number;
  assigned_groups?: number; // repeats_per_sheet / repeat_step
  theoretical_units: number;
  difference: number;
  record_kind: RecordKind;
}

export interface CombinationValidationResult {
  isValid: boolean;
  sizeMatch: boolean;
  surfaceMatch: boolean;
  rawSheetMatch: boolean;
  colorCount: number;
  colorLimitSatisfied: boolean;
  uniqueColors: string[];
  capacity: number;
  totalRepeats: number;
  capacitySatisfied: boolean;
  isFullCapacity: boolean;
  remainingCapacity: number;
  minSheetSatisfied: boolean;
  repeatStep: number;
  assemblyGroupCount: number;
  repeatStepMatch: boolean;
  repeatStepErrors: Array<{
    productId: string;
    stockName: string;
    repeats: number;
    expectedStep: number;
    message: string;
  }>;
  productionApprovalReady: boolean;
  printingRuleResult?: LayoutRuleValidationResult;
  combinationRuleResult?: CombinationRuleEvaluationResult;
  layoutStatus?: {
    isDefined: boolean;
    layout?: SheetLayout;
    isConsistentWithCapacity: boolean;
    layoutSlots: number;
    message: string;
  };
  messages: Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  }>;
}

export interface BusinessRule {
  id: string;
  code: string;
  title: string;
  scope: 'combination' | 'production' | 'materials';
  condition_field: string;
  operator: 'equals' | 'all_same' | 'max_count' | 'min_threshold' | 'must_be_lacquered' | 'only_unlacquered' | 'at_least_one_lacquered';
  parameter_value: string | number;
  rule_type: 'strict_block' | 'requires_approval' | 'preference';
  priority: number;
  is_active: boolean;
  description: string;
  record_kind: RecordKind;
}

export interface ProductionLine {
  id: string;
  code: string;
  name: string;
  line_type: 'shearing' | 'tube_body' | 'press';
  supported_tube_sizes: string[];
  shifts_per_day: number;
  working_hours_per_shift: number;
  speed_units_per_hour: number;
  setup_time_hours: number;
  waste_rate_percent: number;
  capacity_type: 'net' | 'theoretical';
  is_active: boolean;
  record_kind: RecordKind;
}

export interface UserRole {
  id: string;
  name: 'admin' | 'planner' | 'viewer';
  title: string;
  can_edit_parameters: boolean;
  can_edit_rules: boolean;
  can_approve_plans: boolean;
  can_import_excel: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_name: string;
  user_role: 'admin' | 'planner' | 'viewer';
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'reset';
  details: string;
  previous_value?: string | null;
  new_value?: string | null;
}

export interface IntegrationSettings {
  server_host: string;
  server_port: number;
  database_name: string;
  username: string;
  encrypted_connection: boolean;
  demand_view_name: string;
  stock_view_name: string;
  production_order_view_name: string;
  demand_calculation_mode: 'net_already_deducted' | 'gross_needs_system_netting';
  last_sync_timestamp: string | null;
  sync_status: 'idle' | 'testing' | 'disabled_for_phase_1';
}
