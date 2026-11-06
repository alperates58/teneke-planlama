-- ============================================================================
-- FAZ 3A.1 DÜZELTME: ÜRETİM PLANI ESAS KAYNAĞI MikroDesktop_LIDER26.dbo.alper_tenekeuretim
-- Dosya: migrations/005_faz3a1_correct_source_alper_tenekeuretim.sql
-- Tarih: 06.11.2026
-- Amaç: Gerçek üretim planı kaynağı olan MikroDesktop_LIDER26.dbo.alper_tenekeuretim
--       tablosundaki Başlangıç Tarih, Bitiş Tarih, Seri ve Çap-Boy bilgilerini
--       snapshot ve taslak tablolarında birinci sınıf kolonlar olarak desteklemek.
-- ============================================================================

-- 1. Snapshot üst bilgisi kolon genişletmeleri
ALTER TABLE production_plan_snapshots ALTER COLUMN source_table TYPE VARCHAR(100);
ALTER TABLE production_plan_snapshots ALTER COLUMN source_db TYPE VARCHAR(100);

-- 2. Snapshot satırlarına başlangıç/bitiş tarihleri ve seri ekleme
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS series VARCHAR(50);

-- 3. Taslak satırlarına başlangıç/bitiş tarihleri ve seri ekleme
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS series VARCHAR(50);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_plan_snapshot_items_dates
ON production_plan_snapshot_items(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_plan_draft_items_dates
ON production_plan_draft_items(start_date, end_date);
