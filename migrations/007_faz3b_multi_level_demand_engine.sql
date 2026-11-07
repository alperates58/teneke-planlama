-- ============================================================================
-- MIGRATION 007: FAZ 3B KADEMELİ İHTİYAÇ MOTORU VE STOK TAHSİS ŞEMASI
-- ============================================================================

-- 0. Schema Migrations Takip
INSERT INTO schema_migrations (version, name)
VALUES ('007', '007_faz3b_multi_level_demand_engine.sql')
ON CONFLICT (version) DO NOTHING;

-- 1. erp_gross_demands tablosu genişletmeleri ve tekil anahtar düzeltmesi
ALTER TABLE erp_gross_demands
    ADD COLUMN IF NOT EXISTS demand_key VARCHAR(128),
    ADD COLUMN IF NOT EXISTS has_data_error BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS data_error_message TEXT,
    ADD COLUMN IF NOT EXISTS dolum_kalan_miktar NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS dolum_gerceklesen_miktar NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Eski talep kayıtları için demand_key doldur
UPDATE erp_gross_demands
SET demand_key = CONCAT(is_no, '_', COALESCE(upl_guid, tup_stok_kodu))
WHERE demand_key IS NULL;

ALTER TABLE erp_gross_demands
    ALTER COLUMN demand_key SET NOT NULL;

-- Eski kısıtı güvenle kaldır ve demand_key üzerine unique index kur
ALTER TABLE erp_gross_demands
    DROP CONSTRAINT IF EXISTS uq_erp_gross_demands_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_erp_gross_demands_demand_key'
    ) THEN
        ALTER TABLE erp_gross_demands
            ADD CONSTRAINT uq_erp_gross_demands_demand_key UNIQUE (demand_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_erp_gross_demands_status ON erp_gross_demands(status);
CREATE INDEX IF NOT EXISTS idx_erp_gross_demands_sync_id ON erp_gross_demands(source_sync_id);

-- 2. erp_stock_levels tablosu negatif stok ve mod kolonları
ALTER TABLE erp_stock_levels
    ADD COLUMN IF NOT EXISTS raw_net_stock NUMERIC(18, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS has_negative_warning BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS scope_mode VARCHAR(64) DEFAULT 'ONCEDEN_NETLENMIS_KULLANILABILIR_STOK';

-- 3. erp_recipe_links tablosu tekillik kuralı (recete_guid koruması)
ALTER TABLE erp_recipe_links
    DROP CONSTRAINT IF EXISTS uq_erp_recipe_parent_child;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_erp_recipe_guid'
    ) THEN
        ALTER TABLE erp_recipe_links
            ADD CONSTRAINT uq_erp_recipe_guid UNIQUE (recete_guid);
    END IF;
END $$;

-- 4. Kademeli Hesaplama Koşuları (calculation_runs)
CREATE TABLE IF NOT EXISTS calculation_runs (
    id SERIAL PRIMARY KEY,
    run_id UUID DEFAULT gen_random_uuid(),
    sync_run_id INTEGER REFERENCES erp_sync_runs(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
    total_demands INTEGER DEFAULT 0,
    calculated_count INTEGER DEFAULT 0,
    unresolved_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_gross_tube NUMERIC(18, 2) DEFAULT 0,
    total_allocated_tube NUMERIC(18, 2) DEFAULT 0,
    total_net_tube NUMERIC(18, 2) DEFAULT 0,
    total_allocated_cutting NUMERIC(18, 2) DEFAULT 0,
    total_net_cutting NUMERIC(18, 2) DEFAULT 0,
    total_allocated_print NUMERIC(18, 2) DEFAULT 0,
    total_net_print NUMERIC(18, 2) DEFAULT 0,
    parameters JSONB,
    triggered_by VARCHAR(64) DEFAULT 'system',
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_calc_runs_started ON calculation_runs(started_at DESC);

-- 5. Talep Bazlı Tahsis Detayı (demand_allocations)
CREATE TABLE IF NOT EXISTS demand_allocations (
    id SERIAL PRIMARY KEY,
    calculation_run_id INTEGER NOT NULL REFERENCES calculation_runs(id) ON DELETE CASCADE,
    demand_id INTEGER NOT NULL REFERENCES erp_gross_demands(id) ON DELETE CASCADE,
    demand_key VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL,
    tube_stock_code VARCHAR(64) NOT NULL,
    gross_demand NUMERIC(18, 2) NOT NULL,
    
    -- Seviye 1: Tüp Stok Tahsisi
    allocated_tube_stock NUMERIC(18, 2) DEFAULT 0,
    net_tube_demand NUMERIC(18, 2) DEFAULT 0,
    tube_stock_before NUMERIC(18, 2) DEFAULT 0,
    tube_stock_after NUMERIC(18, 2) DEFAULT 0,
    
    -- Seviye 2: Kesik Levha Tahsisi
    cutting_stock_code VARCHAR(64),
    ratio_tube_to_cutting NUMERIC(18, 6),
    allocated_cutting_stock NUMERIC(18, 2) DEFAULT 0,
    net_cutting_demand NUMERIC(18, 2) DEFAULT 0,
    cutting_stock_before NUMERIC(18, 2) DEFAULT 0,
    cutting_stock_after NUMERIC(18, 2) DEFAULT 0,
    
    -- Seviye 3: Baskılı Levha Tahsisi
    print_stock_code VARCHAR(64),
    ratio_cutting_to_print NUMERIC(18, 6),
    allocated_print_stock NUMERIC(18, 2) DEFAULT 0,
    net_print_demand NUMERIC(18, 2) DEFAULT 0,
    print_stock_before NUMERIC(18, 2) DEFAULT 0,
    print_stock_after NUMERIC(18, 2) DEFAULT 0,
    
    -- Seviye 4: Ham Levha İlişkisi
    raw_sheet_code VARCHAR(64),
    ratio_print_to_sheet NUMERIC(18, 6),
    raw_sheet_capacity INTEGER,
    estimated_raw_sheets INTEGER,
    
    -- Mevcut Üretim Planı ve Termin Açığı
    planned_cover_quantity NUMERIC(18, 2) DEFAULT 0,
    additional_planning_needed NUMERIC(18, 2) DEFAULT 0,
    plan_earliest_finish TIMESTAMP WITH TIME ZONE,
    is_schedule_delayed BOOLEAN DEFAULT FALSE,
    delay_days INTEGER DEFAULT 0,
    
    -- Durum ve Teşhis
    calculation_status VARCHAR(32) NOT NULL, -- 'CALCULATED', 'UNRESOLVED', 'ERROR'
    unresolved_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_run_demand UNIQUE(calculation_run_id, demand_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_run_sort ON demand_allocations(calculation_run_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_allocations_demand_id ON demand_allocations(demand_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON demand_allocations(calculation_status);
