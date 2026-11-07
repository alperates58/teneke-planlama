-- ============================================================================
-- MIGRATION 008: FAZ 3B KABUL DÜZELTMELERİ (ZAMAN/TERMİN BAZLI ARZ VE BİRİM DÖNÜŞÜMLERİ)
-- ============================================================================

-- 1. calculation_runs tablosuna seçilmiş plan ve termin toplamları
ALTER TABLE calculation_runs 
ADD COLUMN IF NOT EXISTS plan_draft_id VARCHAR(64) REFERENCES production_plan_drafts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS plan_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_on_time_covered NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_delayed_covered NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_additional_planning NUMERIC(18, 2) DEFAULT 0;

-- 2. demand_allocations tablosuna zaman bazlı karşılama ve fiziksel/eşdeğer birim kolonları
ALTER TABLE demand_allocations
ADD COLUMN IF NOT EXISTS on_time_covered_quantity NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delayed_covered_quantity NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uncovered_quantity NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS full_coverage_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cutting_stock_unit VARCHAR(32) DEFAULT 'ADET',
ADD COLUMN IF NOT EXISTS allocated_cutting_tube_equiv NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS print_stock_unit VARCHAR(32) DEFAULT 'ADET',
ADD COLUMN IF NOT EXISTS allocated_print_tube_equiv NUMERIC(18, 2) DEFAULT 0;
