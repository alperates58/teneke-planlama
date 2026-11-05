-- ============================================================================
-- TENEKE PLANLAMA - FAZ 2 KALICI VERİ MODELİ VE POSTGRESQL ŞEMASI
-- "Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından
-- tanımlanmış montaj düzeni görselleştirilir."
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HAM LEVHALAR (Raw Sheets)
CREATE TABLE IF NOT EXISTS raw_sheets (
    id VARCHAR(64) PRIMARY KEY,
    short_name VARCHAR(32) NOT NULL,
    stock_code VARCHAR(64) NOT NULL UNIQUE,
    stock_name VARCHAR(255) NOT NULL,
    thickness_source_value NUMERIC(6,3) NOT NULL,
    thickness_unit_confirmed BOOLEAN DEFAULT FALSE,
    width_mm NUMERIC(8,2) NOT NULL,
    height_mm NUMERIC(8,2) NOT NULL,
    grade_source VARCHAR(32),
    tube_size VARCHAR(32) NOT NULL,
    minimum_print_sheets_source INTEGER NULL,
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. EBAT / KAPASİTE TABLOSU (Tube Capacities - Hazır Parametreler)
-- Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı
CREATE TABLE IF NOT EXISTS tube_capacities (
    id VARCHAR(64) PRIMARY KEY,
    tube_size VARCHAR(32) NOT NULL UNIQUE,
    units_per_sheet INTEGER NOT NULL,
    assembly_group_count INTEGER NOT NULL, -- Montaj grubu sayısı (eski çeşit alanı)
    repeat_step INTEGER NOT NULL, -- Ürün tekrar adımı
    variety_source INTEGER NOT NULL,
    quantity_source INTEGER NOT NULL,
    single_variety_order_quantity_source INTEGER NOT NULL,
    reference_sheet_count INTEGER DEFAULT 1250,
    distribution_semantics_confirmed BOOLEAN DEFAULT TRUE,
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_capacity_product CHECK (units_per_sheet = assembly_group_count * repeat_step)
);

-- 3. MONTAJ GÖRÜNÜMÜ PARAMETRELERİ (Sheet Layouts - Kullanıcı Tanımlı Düzen)
-- Geometrik sığdırma veya nesting yapılmaz; kullanıcı tanımlı düzenin kapasiteyle tutarlılığı kontrol edilir.
CREATE TABLE IF NOT EXISTS sheet_layouts (
    id VARCHAR(64) PRIMARY KEY,
    tube_size VARCHAR(32) NOT NULL,
    raw_sheet_code VARCHAR(64) REFERENCES raw_sheets(stock_code) ON DELETE RESTRICT,
    rows INTEGER NOT NULL CHECK (rows > 0),
    cols INTEGER NOT NULL CHECK (cols > 0),
    orientation VARCHAR(16) NOT NULL DEFAULT 'landscape', -- 'landscape', 'portrait'
    cell_order VARCHAR(16) NOT NULL DEFAULT 'row_major', -- 'row_major', 'column_major'
    verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified', -- 'verified', 'unverified', 'provisional'
    margin_mm NUMERIC(6,2) DEFAULT 10,
    gap_mm NUMERIC(6,2) DEFAULT 4,
    notes TEXT,
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sheet_layout_tube_raw UNIQUE(tube_size, raw_sheet_code)
);

-- 4. ÜRÜN TEKNİK KARTLARI (Product Technical Definitions)
-- Zemin, Vernik, Lak ve İç Kaplama 4 ayrı alanda tutulur.
CREATE TABLE IF NOT EXISTS product_technicals (
    stock_code VARCHAR(64) PRIMARY KEY,
    stock_name VARCHAR(255) NOT NULL,
    tube_size VARCHAR(32) NOT NULL,
    diameter_mm NUMERIC(6,2) NOT NULL,
    height_mm NUMERIC(6,2) NOT NULL,
    raw_sheet_description_source TEXT,
    raw_sheet_stock_code_candidate VARCHAR(64),
    raw_sheet_code_mapping_status VARCHAR(64) DEFAULT 'matched',
    print_surface VARCHAR(32) NOT NULL, -- METALİK, EMAYE
    varnish VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ', -- PARLAK, MAT, KISMİ, BELİRTİLMEMİŞ
    lacquer VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ', -- LAKLI, LAKSIZ, BELİRTİLMEMİŞ
    inside_coating VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ', -- GOLD, STANDART, BELİRTİLMEMİŞ
    colors TEXT[] NOT NULL,
    special_parameter_source TEXT,
    source VARCHAR(128),
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. İHTİYAÇ / TALEP HAVUZU (Demands)
CREATE TABLE IF NOT EXISTS demands (
    id VARCHAR(64) PRIMARY KEY,
    reference_no VARCHAR(64) NOT NULL,
    stock_code VARCHAR(64) NOT NULL,
    stock_name VARCHAR(255) NOT NULL,
    tube_size VARCHAR(32) NOT NULL,
    diameter_mm NUMERIC(6,2) NOT NULL,
    height_mm NUMERIC(6,2) NOT NULL,
    due_date DATE NOT NULL,
    gross_quantity INTEGER NOT NULL CHECK (gross_quantity >= 0),
    available_stock INTEGER NOT NULL DEFAULT 0,
    net_quantity INTEGER NOT NULL CHECK (net_quantity >= 0),
    raw_sheet_code VARCHAR(64),
    raw_sheet_desc TEXT,
    print_surface VARCHAR(32) NOT NULL,
    varnish VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ',
    lacquer VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ',
    inside_coating VARCHAR(32) NOT NULL DEFAULT 'BELİRTİLMEMİŞ',
    colors TEXT[] NOT NULL,
    definition_status VARCHAR(32) NOT NULL DEFAULT 'complete',
    customer_or_brand VARCHAR(64),
    order_type VARCHAR(16) DEFAULT 'RPT',
    scope_note TEXT,
    record_kind VARCHAR(32) DEFAULT 'synthetic_demo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TENEKE ÜRETİM PLANI (Production Plan)
CREATE TABLE IF NOT EXISTS production_plans (
    id VARCHAR(64) PRIMARY KEY,
    week_source VARCHAR(32) NOT NULL,
    finish_date DATE NOT NULL,
    consumption_code VARCHAR(64) NOT NULL,
    consumption_name VARCHAR(255) NOT NULL,
    tube_size VARCHAR(32) NOT NULL,
    planned_units INTEGER NOT NULL CHECK (planned_units > 0),
    machine VARCHAR(64),
    shift VARCHAR(64),
    material_status VARCHAR(32) NOT NULL DEFAULT 'ready',
    source VARCHAR(128),
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. KURAL YÖNETİMİ (Business Rules Engine Model)
CREATE TABLE IF NOT EXISTS business_rules (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(128) NOT NULL,
    scope VARCHAR(32) NOT NULL, -- combination, production, materials
    condition_field VARCHAR(64) NOT NULL,
    operator VARCHAR(32) NOT NULL, -- equals, all_same, max_count, min_threshold, must_be_lacquered, only_unlacquered, at_least_one_lacquered
    parameter_value TEXT NOT NULL,
    rule_type VARCHAR(32) NOT NULL DEFAULT 'strict_block', -- strict_block, requires_approval, preference
    priority INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    record_kind VARCHAR(32) DEFAULT 'source_transcription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. HAT VE MAKİNE TANIMLARI (Production Lines)
CREATE TABLE IF NOT EXISTS production_lines (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    line_type VARCHAR(32) NOT NULL, -- shearing, tube_body, press
    supported_tube_sizes TEXT[] NOT NULL,
    shifts_per_day INTEGER NOT NULL DEFAULT 3,
    working_hours_per_shift NUMERIC(4,2) NOT NULL DEFAULT 7.5,
    speed_units_per_hour INTEGER NOT NULL,
    setup_time_hours NUMERIC(4,2) NOT NULL DEFAULT 2.0,
    waste_rate_percent NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    capacity_type VARCHAR(16) NOT NULL DEFAULT 'net', -- net, theoretical
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    record_kind VARCHAR(32) DEFAULT 'synthetic_demo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. KULLANICI ROLLERİ VE YETKİLERİ (User Roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(32) PRIMARY KEY,
    role_name VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(64) NOT NULL,
    can_edit_parameters BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_rules BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_plans BOOLEAN NOT NULL DEFAULT FALSE,
    can_import_excel BOOLEAN NOT NULL DEFAULT FALSE
);

-- 10. MATBAA YERLEŞİM KURALLARI (Printing Press Layout Rules)
-- Levha üzerindeki çeşit yerleşiminde satır/sütun matbaa kısıtları
CREATE TABLE IF NOT EXISTS printing_press_rules (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(32) NOT NULL CHECK (rule_type IN ('SAME_VARIANT_PER_COLUMN', 'SAME_VARIANT_PER_ROW')),
    applies_to_diameter NUMERIC(6,2) NULL, -- e.g. 65 for diameter 65mm
    applies_to_height NUMERIC(6,2) NULL,   -- e.g. 100 for 45x100
    applies_to_tube_size VARCHAR(32) NULL, -- e.g. '45x100', '52x105', 'DEFAULT'
    priority INTEGER NOT NULL DEFAULT 100, -- lower number = higher priority
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. PARAMETRİK LAK VE ÜRÜN KOMBİNASYON KURALLARI (Product & Lacquer Combination Rules)
CREATE TABLE IF NOT EXISTS product_combination_rules (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(64) NOT NULL CHECK (rule_type IN (
        'ONLY_WITH_LACQUERED',
        'ONLY_WITH_UNLACQUERED',
        'ALLOW_MIXED_LACQUER',
        'FORBID_MIXED_LACQUER',
        'FORBIDDEN_WITH_PRODUCTS',
        'FORBIDDEN_WITH_PRODUCT_GROUPS',
        'ALLOWED_ONLY_WITH_PRODUCTS',
        'ALLOWED_ONLY_WITH_PRODUCT_GROUPS',
        'EXCLUSIVE_SOLO_ONLY'
    )),
    target_type VARCHAR(32) NOT NULL DEFAULT 'GLOBAL',
    target_product_code VARCHAR(64),
    target_product_group VARCHAR(64),
    target_tube_size VARCHAR(32),
    target_lacquer_status VARCHAR(32),
    param_product_codes TEXT[],
    param_product_groups TEXT[],
    priority INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATE,
    valid_to DATE,
    description TEXT,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. DENETİM İZİ VE DEĞİŞİKLİK GÜNLÜĞÜ (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(64) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    action VARCHAR(32) NOT NULL, -- create, update, delete, reset
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_raw_sheets_tube_size ON raw_sheets(tube_size);
CREATE INDEX IF NOT EXISTS idx_demands_tube_size ON demands(tube_size);
CREATE INDEX IF NOT EXISTS idx_demands_due_date ON demands(due_date);
CREATE INDEX IF NOT EXISTS idx_production_plans_date ON production_plans(finish_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_printing_rules_priority ON printing_press_rules(priority ASC);
CREATE INDEX IF NOT EXISTS idx_comb_rules_priority ON product_combination_rules(priority ASC);
