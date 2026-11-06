-- ============================================================================
-- MIGRATION 006: Faz 3A.2 Kimlik Doğrulama, Kullanıcı Modeli ve ERP Senkronizasyon Şeması
-- ============================================================================

-- 0. Schema Migrations Takip
INSERT INTO schema_migrations (version, name)
VALUES ('006', '006_faz3a2_auth_and_erp_sync.sql')
ON CONFLICT (version) DO NOTHING;

-- 1. Kullanıcılar Tablosu (app_users)
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL REFERENCES user_roles(role_name) ON UPDATE CASCADE,
    display_name VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Kullanıcılar (admin, planlama, misafir)
INSERT INTO app_users (username, password_hash, role, display_name, is_active)
VALUES 
  ('admin', 'somesaltadmin001:ca10dd3c7b26026cd5a81612965de1c56b1e5fc5357df1b9260d869c60e1d30dc047e606ce7f259325395bf1a7f4ca1c53145fb0c987049d0bde986d51637948', 'admin', 'Sistem Yöneticisi', TRUE),
  ('planlama', 'somesaltplan001:c3a21db5001769647632048ec8c3577fec3a30aef217a80931288cc3e6ac1c971b2fb273244cd3992dbc76c826652f199906d84eba10cc6310bb41de3d53aeb7', 'planner', 'Üretim Planlama Uzmanı', TRUE),
  ('misafir', 'somesaltguest01:bfe8dc5e6cdf4812549d590f3c10079d00124844d62c14be6012c29e0f1bbcc9a0e5c52260fed928d45f2229d0a07f54f8dcd15d61e5bd8e8f7516537e3ef9f0', 'viewer', 'Görüntüleyici (Salt Okunur)', TRUE)
ON CONFLICT (username) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active;

-- 2. ERP Senkronizasyon Çalıştırma Geçmişi (erp_sync_runs)
CREATE TABLE IF NOT EXISTS erp_sync_runs (
    id SERIAL PRIMARY KEY,
    run_id UUID DEFAULT gen_random_uuid(),
    sync_type VARCHAR(32) NOT NULL DEFAULT 'full',
    status VARCHAR(32) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    catalog_count INTEGER DEFAULT 0,
    demands_count INTEGER DEFAULT 0,
    stock_count INTEGER DEFAULT 0,
    recipes_count INTEGER DEFAULT 0,
    triggered_by VARCHAR(64) DEFAULT 'system',
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON erp_sync_runs(started_at DESC);

-- 3. ERP Brüt Talepleri Staging Tablosu (erp_gross_demands)
-- Dolum iş emirlerinden gelen pozitif brüt tüp talepleri
CREATE TABLE IF NOT EXISTS erp_gross_demands (
    id SERIAL PRIMARY KEY,
    is_no VARCHAR(64) NOT NULL,
    siparis_no VARCHAR(64) NOT NULL,
    dolum_mamul_kodu VARCHAR(64),
    dolum_mamul_adi VARCHAR(255),
    dolum_plan_miktar NUMERIC(18,2),
    ihtiyac_tarihi DATE,
    bitis_tarihi DATE,
    dolum_makine VARCHAR(64),
    dolum_sira VARCHAR(32),
    dolum_seri VARCHAR(32),
    tup_stok_kodu VARCHAR(64) NOT NULL,
    tup_stok_adi VARCHAR(255) NOT NULL,
    tup_kategori VARCHAR(32) DEFAULT 'TENEKETUP',
    recete_upl_miktar NUMERIC(18,4),
    recete_upl_uret_miktar NUMERIC(18,4),
    brut_tup_ihtiyac NUMERIC(18,2) NOT NULL CHECK (brut_tup_ihtiyac >= 0),
    upl_guid VARCHAR(64),
    source_sync_id INTEGER REFERENCES erp_sync_runs(id) ON DELETE SET NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_erp_gross_demands_key UNIQUE(is_no, tup_stok_kodu)
);
CREATE INDEX IF NOT EXISTS idx_erp_gross_demands_tup ON erp_gross_demands(tup_stok_kodu);
CREATE INDEX IF NOT EXISTS idx_erp_gross_demands_siparis ON erp_gross_demands(siparis_no);
CREATE INDEX IF NOT EXISTS idx_erp_gross_demands_tarih ON erp_gross_demands(ihtiyac_tarihi);

-- 4. ERP Stok Seviyeleri Staging Tablosu (erp_stock_levels)
-- Net kullanılabilir stok = Fiziksel Stok - Hariç/Bloke Ambarlar
CREATE TABLE IF NOT EXISTS erp_stock_levels (
    stock_code VARCHAR(64) PRIMARY KEY,
    stock_name VARCHAR(255) NOT NULL,
    category_code VARCHAR(32) NOT NULL,
    unit VARCHAR(32) DEFAULT 'ADET',
    physical_stock NUMERIC(18,3) DEFAULT 0,
    excluded_quarantine_stock NUMERIC(18,3) DEFAULT 0,
    usable_stock NUMERIC(18,3) DEFAULT 0 CHECK (usable_stock >= 0),
    source_sync_id INTEGER REFERENCES erp_sync_runs(id) ON DELETE SET NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_erp_stock_category ON erp_stock_levels(category_code);

-- 5. ERP Reçete Bağlantıları Tablosu (erp_recipe_links)
-- Tüp -> Kesik Levha -> Baskılı Levha -> Ham Levha
CREATE TABLE IF NOT EXISTS erp_recipe_links (
    id SERIAL PRIMARY KEY,
    recete_guid VARCHAR(64),
    parent_stock_code VARCHAR(64) NOT NULL,
    parent_stock_name VARCHAR(255),
    parent_category VARCHAR(32) NOT NULL,
    child_stock_code VARCHAR(64) NOT NULL,
    child_stock_name VARCHAR(255),
    child_category VARCHAR(32) NOT NULL,
    parent_quantity NUMERIC(18,4),
    child_quantity NUMERIC(18,6),
    consumption_ratio NUMERIC(18,6),
    unit_no INTEGER,
    source_sync_id INTEGER REFERENCES erp_sync_runs(id) ON DELETE SET NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_erp_recipe_parent_child UNIQUE (parent_stock_code, child_stock_code)
);
CREATE INDEX IF NOT EXISTS idx_erp_recipe_parent ON erp_recipe_links(parent_stock_code);
CREATE INDEX IF NOT EXISTS idx_erp_recipe_child ON erp_recipe_links(child_stock_code);
