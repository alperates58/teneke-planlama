-- ============================================================================
-- FAZ 3A.1: MEVCUT SQL PLANI SNAPSHOT VE TASLAK SÜRÜMLEME ŞEMASI
-- Dosya: migrations/004_faz3a1_production_plan_snapshot.sql
-- Tarih: 06.11.2026
-- Amaç: AA_LIDER.dbo.meltem_teneke tablosundaki mevcut planı kayıpsız, değişmez
--       snapshot olarak saklamak ve PostgreSQL üzerinde düzenlenebilir taslak
--       olarak korumak. Kaynak SQL'e yazma yapmaz; versiyonlama ve checksum tutar.
-- ============================================================================

-- 1. Değişmez Kaynak Plan Snapshot Başlık Tablosu
CREATE TABLE IF NOT EXISTS production_plan_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    source_table VARCHAR(50) NOT NULL DEFAULT 'dbo.meltem_teneke',
    source_host VARCHAR(100) NOT NULL DEFAULT '172.17.0.6:1433',
    source_db VARCHAR(50) NOT NULL DEFAULT 'AA_LIDER',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_count INTEGER NOT NULL,
    total_quantity NUMERIC(14, 2) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by VARCHAR(50) DEFAULT 'system',
    raw_payload JSONB
);

-- 2. Snapshot Satırları (Her snapshot için değişmez satır dökümü)
CREATE TABLE IF NOT EXISTS production_plan_snapshot_items (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES production_plan_snapshots(id) ON DELETE CASCADE,
    source_row_order INTEGER NOT NULL,
    order_no VARCHAR(50),
    stock_code VARCHAR(50) NOT NULL,
    stock_name TEXT,
    quantity NUMERIC(14, 2) NOT NULL,
    tube_size VARCHAR(30),
    scheduled_date TIMESTAMPTZ,
    extra_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_snapshot_items_snap
ON production_plan_snapshot_items(snapshot_id, source_row_order);

-- 3. Düzenlenebilir Plan Taslağı (Kullanıcının uygulama içinde yönettiği plan)
CREATE TABLE IF NOT EXISTS production_plan_drafts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    snapshot_id VARCHAR(64) REFERENCES production_plan_snapshots(id),
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
    is_dirty BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- 4. Plan Taslak Satırları (Kullanıcının sıra değiştirdiği, not eklediği satırlar)
CREATE TABLE IF NOT EXISTS production_plan_draft_items (
    id BIGSERIAL PRIMARY KEY,
    draft_id VARCHAR(64) NOT NULL REFERENCES production_plan_drafts(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    stock_code VARCHAR(50) NOT NULL,
    stock_name TEXT,
    quantity NUMERIC(14, 2) NOT NULL,
    order_no VARCHAR(50),
    tube_size VARCHAR(30),
    scheduled_date TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    source_snapshot_item_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_draft_items_draft
ON production_plan_draft_items(draft_id, sequence_order);

-- 5. Denetim İzi (audit_logs) için yeni varlık tipleri ve referans desteği
-- (audit_logs tablosu migration 001'den itibaren mevcuttur)
