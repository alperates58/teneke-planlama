-- ============================================================================
-- FAZ 4A: BASKILI İHTİYAÇ HAVUZU VE KALICI KOMBİNASYON TAKİBİ
-- ============================================================================

-- 1. Baskılı İhtiyaç Havuzu Tablosu (printed_sheet_demands)
CREATE TABLE IF NOT EXISTS printed_sheet_demands (
    id VARCHAR(64) PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL DEFAULT 'ACTIVE_PLAN', -- 'ACTIVE_PLAN', 'UNPLANNED_DEMAND'
    plan_draft_id VARCHAR(64) REFERENCES production_plan_drafts(id) ON DELETE SET NULL,
    plan_item_id BIGINT REFERENCES production_plan_draft_items(id) ON DELETE SET NULL,
    erp_demand_id BIGINT REFERENCES erp_gross_demands(id) ON DELETE SET NULL,
    demand_key VARCHAR(150),
    order_no VARCHAR(50),
    
    -- Ürün Tanımları
    tube_stock_code VARCHAR(50) NOT NULL,
    tube_stock_name TEXT,
    tube_size VARCHAR(30),
    cutting_stock_code VARCHAR(50),
    cutting_stock_name TEXT,
    cutting_stock_unit VARCHAR(20) DEFAULT 'ADET',
    print_stock_code VARCHAR(50) NOT NULL,
    print_stock_name TEXT,
    print_stock_unit VARCHAR(20) DEFAULT 'ADET',
    raw_sheet_code VARCHAR(50),
    raw_sheet_name TEXT,
    raw_sheet_capacity INTEGER,
    
    -- Tarihler
    material_due_date TIMESTAMPTZ, -- Tüp üretiminin başlangıç anı / malzemenin hatta olması gereken zaman
    sales_due_date TIMESTAMPTZ,    -- Dolum / müşteri termin tarihi
    is_lead_time_estimated BOOLEAN DEFAULT TRUE,
    lead_time_warning TEXT,
    
    -- Miktar Kademeleri (Tüp Eşdeğeri)
    planned_tube_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    allocated_cutting_stock NUMERIC(14, 2) NOT NULL DEFAULT 0,
    allocated_print_stock NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_print_demand NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_print_physical NUMERIC(14, 2) NOT NULL DEFAULT 0,
    
    -- Kombinasyon Rezervasyon ve Karşılama Durumu
    allocated_to_draft NUMERIC(14, 2) NOT NULL DEFAULT 0,
    covered_by_confirmed NUMERIC(14, 2) NOT NULL DEFAULT 0,
    remaining_open_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'RESERVED', 'PARTIAL', 'COMPLETED', 'NEEDS_REVIEW'
    review_reason TEXT,
    
    -- Teknik Kart Özellikleri
    definition_status VARCHAR(30) DEFAULT 'complete',
    colors JSONB DEFAULT '[]'::jsonb,
    print_surface VARCHAR(50),
    lacquer VARCHAR(50),
    varnish VARCHAR(50),
    inside_coating VARCHAR(50),
    
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_psd_source ON printed_sheet_demands(source_type, plan_draft_id);
CREATE INDEX IF NOT EXISTS idx_psd_status ON printed_sheet_demands(status);
CREATE INDEX IF NOT EXISTS idx_psd_print_code ON printed_sheet_demands(print_stock_code);
CREATE INDEX IF NOT EXISTS idx_psd_tube_code ON printed_sheet_demands(tube_stock_code);
CREATE INDEX IF NOT EXISTS idx_psd_plan_item ON printed_sheet_demands(plan_item_id);

-- 2. Baskı Kombinasyonları Tablosu (sheet_combinations)
CREATE TABLE IF NOT EXISTS sheet_combinations (
    id VARCHAR(64) PRIMARY KEY,
    combination_no VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(150),
    tube_size VARCHAR(30) NOT NULL,
    raw_sheet_code VARCHAR(50) NOT NULL,
    raw_sheet_name TEXT,
    raw_sheet_capacity INTEGER NOT NULL,
    assembly_group_count INTEGER NOT NULL DEFAULT 1,
    repeat_step INTEGER NOT NULL DEFAULT 1,
    total_slots INTEGER NOT NULL,
    used_slots INTEGER NOT NULL DEFAULT 0,
    sheets_to_print INTEGER NOT NULL DEFAULT 1250,
    minimum_sheet_rule INTEGER NOT NULL DEFAULT 1250,
    total_output_tubes NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_covered_demand NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_overproduction NUMERIC(14, 2) NOT NULL DEFAULT 0,
    unique_colors_count INTEGER DEFAULT 0,
    unique_colors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'CONFIRMED', 'CANCELLED'
    validation_warnings JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by VARCHAR(100),
    confirmed_by VARCHAR(100),
    confirmed_at TIMESTAMPTZ,
    cancelled_by VARCHAR(100),
    cancelled_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kmb_status ON sheet_combinations(status);
CREATE INDEX IF NOT EXISTS idx_kmb_tube_size ON sheet_combinations(tube_size);

-- 3. Kombinasyon Ürün Gözleri / Kalemleri (sheet_combination_items)
CREATE TABLE IF NOT EXISTS sheet_combination_items (
    id BIGSERIAL PRIMARY KEY,
    combination_id VARCHAR(64) NOT NULL REFERENCES sheet_combinations(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL DEFAULT 1,
    print_demand_id VARCHAR(64) REFERENCES printed_sheet_demands(id) ON DELETE SET NULL,
    print_stock_code VARCHAR(50) NOT NULL,
    print_stock_name TEXT,
    tube_stock_code VARCHAR(50) NOT NULL,
    tube_stock_name TEXT,
    repeats_count INTEGER NOT NULL,
    allocated_demand_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    overproduction_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_item_output NUMERIC(14, 2) NOT NULL DEFAULT 0,
    colors JSONB DEFAULT '[]'::jsonb,
    varnish VARCHAR(50),
    lacquer VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kmbi_comb_id ON sheet_combination_items(combination_id);
CREATE INDEX IF NOT EXISTS idx_kmbi_print_demand ON sheet_combination_items(print_demand_id);

-- 4. İhtiyaç ile Kombinasyon Arasındaki Miktarlı Bağlantı (print_demand_reservations)
CREATE TABLE IF NOT EXISTS print_demand_reservations (
    id BIGSERIAL PRIMARY KEY,
    print_demand_id VARCHAR(64) NOT NULL REFERENCES printed_sheet_demands(id) ON DELETE CASCADE,
    combination_id VARCHAR(64) NOT NULL REFERENCES sheet_combinations(id) ON DELETE CASCADE,
    combination_item_id BIGINT REFERENCES sheet_combination_items(id) ON DELETE CASCADE,
    reservation_type VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'CONFIRMED'
    reserved_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_demand_comb UNIQUE (print_demand_id, combination_id)
);

CREATE INDEX IF NOT EXISTS idx_pdr_demand ON print_demand_reservations(print_demand_id);
CREATE INDEX IF NOT EXISTS idx_pdr_comb ON print_demand_reservations(combination_id);
