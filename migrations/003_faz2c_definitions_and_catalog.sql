-- ============================================================================
-- MIGRATION 003: Faz 2C Tanimlar Merkezi, ERP Stok Katalogu ve Sozlukler
-- ============================================================================

-- 0. Schema Migrations Takip Tablosu
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gecmis migration'lari kaydet
INSERT INTO schema_migrations (version, name)
VALUES 
  ('001', '001_initial_schema.sql'),
  ('002', '002_seed_data.sql')
ON CONFLICT (version) DO NOTHING;

-- 1. ERP Stok Katalogu (Salt-Okunur Katalog, Faz 3A'da SQL'den Senkronlanacak)
CREATE TABLE IF NOT EXISTS erp_stock_catalog (
    stock_code VARCHAR(64) PRIMARY KEY,
    stock_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    unit VARCHAR(32) NOT NULL DEFAULT 'ADET',
    tube_size VARCHAR(32) NULL,
    dimensions VARCHAR(64) NULL,
    source_system VARCHAR(64) DEFAULT 'MikroDesktop_LIDER26',
    status VARCHAR(32) DEFAULT 'active',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_erp_catalog_category ON erp_stock_catalog(category);
CREATE INDEX IF NOT EXISTS idx_erp_catalog_tube_size ON erp_stock_catalog(tube_size);

-- 2. Bagimsiz Sozlukler (Zemin, Vernik, Lak, Ic Kaplama, Urun Grubu)
CREATE TABLE IF NOT EXISTS dictionaries (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(32) NOT NULL,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(128) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 10,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dictionary_category_code UNIQUE (category, code)
);
CREATE INDEX IF NOT EXISTS idx_dictionaries_category ON dictionaries(category, is_active);

-- 3. product_technicals Tablosunu Faz 2C Seviyesine Yukselt
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS id VARCHAR(64);
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS catalog_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS raw_sheet_code VARCHAR(64);
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);
ALTER TABLE product_technicals ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_product_technicals_raw_sheet'
    ) THEN
        ALTER TABLE product_technicals 
        ADD CONSTRAINT fk_product_technicals_raw_sheet 
        FOREIGN KEY (raw_sheet_code) REFERENCES raw_sheets(stock_code) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_technicals_is_active ON product_technicals(is_active);
CREATE INDEX IF NOT EXISTS idx_product_technicals_raw_sheet ON product_technicals(raw_sheet_code);

-- 4. Sunucu Tarafi Guvenli Oturum Tablosu (Server Sessions)
CREATE TABLE IF NOT EXISTS app_sessions (
    token VARCHAR(128) PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL REFERENCES user_roles(role_name) ON UPDATE CASCADE,
    display_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON app_sessions(expires_at);

-- 5. ERP Stok Katalogu Seed Verisi (42 Kart)
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1103', 'HAM LEVHA-018x863x866- (T 57) -45x140', 'Ham Levha', 'LEVHA', '45x140', '863x866 - 0.18mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1104', 'HAM LEVHA-018x863x898- (T 57) -45x175', 'Ham Levha', 'LEVHA', '45x175', '863x898 - 0.18mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1202', 'HAM LEVHA-017x835x872- (T 61) -52x105', 'Ham Levha', 'LEVHA', '52x105', '835x872 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1204', 'HAM LEVHA-017x832x827- (T 61) -52x161', 'Ham Levha', 'LEVHA', '52x161', '832x827 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1205', 'HAM LEVHA-017x832x847- (T 61) -52x165', 'Ham Levha', 'LEVHA', '52x165', '832x847 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1206', 'HAM LEVHA-017x832x800- (T 61) -52x195', 'Ham Levha', 'LEVHA', '52x195', '832x800 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1207', 'HAM LEVHA-017x832x875- (T 61) -52x214', 'Ham Levha', 'LEVHA', '52x214', '832x875 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1208', 'HAM LEVHA-017x832x720- (T 61) -52x234', 'Ham Levha', 'LEVHA', '52x234', '832x720 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1209', 'HAM LEVHA-017x835x848- (T 61) -65x165', 'Ham Levha', 'LEVHA', '65x165', '835x848 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1406', 'HAM LEVHA-017x835x827- (T 61) -65x270', 'Ham Levha', 'LEVHA', '65x270', '835x827 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1408', 'HAM LEVHA-017x835x864- (T 61) -65x104', 'Ham Levha', 'LEVHA', '65x104', '835x864 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1414', 'HAM LEVHA-018x835x915- (T 61) -65x300', 'Ham Levha', 'LEVHA', '65x300', '835x915 - 0.18mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1415', 'HAM LEVHA-017x835x798- (T 61) -65x195', 'Ham Levha', 'LEVHA', '65x195', '835x798 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('500011000004-1411', 'HAM LEVHA-017x835x808- (T 61) -65x157', 'Ham Levha', 'LEVHA', '65x157', '835x808 - 0.17mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010410-1102', 'TUP-GW MOBILYA 300 ml (52x214)-LEMON', 'Tüp Mamul', 'ADET', '52x214', 'Ø52x214 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010410-7026', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT', 'Tüp Mamul', 'ADET', '52x214', 'Ø52x214 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010410-7025', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-NATURAL SCENT', 'Tüp Mamul', 'ADET', '52x214', 'Ø52x214 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010410-7024', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-POTPORI SCENT', 'Tüp Mamul', 'ADET', '52x214', 'Ø52x214 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511115011310-7458', 'TUP-GW ODA SPR-500 ml (65x195)-CHRISTMAS EDITION', 'Tüp Mamul', 'ADET', '65x195', 'Ø65x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-7284', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-7285', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-7283', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-J.CHERRY BLO.', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4634', 'TUP-GW-MS SDCM ALKOL B.-400 ml (52x234)-BUBBLE GUM', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4640', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ORANGE', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4630', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ROSE&PEARL', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4631', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-S.BERRY', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4641', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-TOBACCO', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4625', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ANTI TABAC', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4620', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-JASMIN&COT.', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4632', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LILAC&LOTUS', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4623', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LIME&ORANGE', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4624', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-M.FRAN OCEA', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4629', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOSS&SPRING', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4628', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-TUTTI FRUTTI', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4633', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LAVENDER&CHOM', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-4635', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOUNTAIN LAKE', 'Tüp Mamul', 'ADET', '52x234', 'Ø52x234 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1001', 'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1002', 'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1003', 'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1004', 'TUP-SOFT ODA SPR 300 ml (52x195)-LILAC', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1005', 'TUP-SOFT ODA SPR 300 ml (52x195)-SPRING', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;
INSERT INTO erp_stock_catalog (stock_code, stock_name, category, unit, tube_size, dimensions, source_system, status)
VALUES ('511109010910-1006', 'TUP-SOFT ODA SPR 300 ml (52x195)-ROSE', 'Tüp Mamul', 'ADET', '52x195', 'Ø52x195 mm', 'MikroDesktop_LIDER26', 'active')
ON CONFLICT (stock_code) DO UPDATE SET
  stock_name = EXCLUDED.stock_name,
  category = EXCLUDED.category,
  tube_size = EXCLUDED.tube_size,
  dimensions = EXCLUDED.dimensions;

-- 6. Sozluk Seed Verileri
INSERT INTO dictionaries (id, category, code, label, is_default, is_active, display_order)
VALUES
  ('DICT-SRF-01', 'print_surface', 'EMAYE', 'Emaye Zemin (Beyaz)', TRUE, TRUE, 10),
  ('DICT-SRF-02', 'print_surface', 'METALİK', 'Metalik Zemin (Doğal Teneke)', FALSE, TRUE, 20),
  
  ('DICT-VRN-01', 'varnish', 'PARLAK', 'Parlak Vernik', TRUE, TRUE, 10),
  ('DICT-VRN-02', 'varnish', 'MAT', 'Mat Vernik', FALSE, TRUE, 20),
  ('DICT-VRN-03', 'varnish', 'KISMİ', 'Kısmi Vernik', FALSE, TRUE, 30),
  ('DICT-VRN-04', 'varnish', 'BELİRTİLMEMİŞ', 'Belirtilmemiş / Standart', FALSE, TRUE, 40),

  ('DICT-LAK-01', 'lacquer', 'LAKLI', 'Laklı (Dış Koruma Lakı Var)', TRUE, TRUE, 10),
  ('DICT-LAK-02', 'lacquer', 'LAKSIZ', 'Laksız (Dış Lak Yok)', FALSE, TRUE, 20),
  ('DICT-LAK-03', 'lacquer', 'BILINMIYOR', 'Bilinmiyor (Onay Bekliyor)', FALSE, TRUE, 30),
  ('DICT-LAK-04', 'lacquer', 'BELİRTİLMEMİŞ', 'Belirtilmemiş', FALSE, TRUE, 40),

  ('DICT-CPT-01', 'inside_coating', 'STANDART', 'Standart İç Koruma', TRUE, TRUE, 10),
  ('DICT-CPT-02', 'inside_coating', 'GOLD', 'İçi GOLD Laklı', FALSE, TRUE, 20),
  ('DICT-CPT-03', 'inside_coating', 'ŞEFFAF', 'Şeffaf İç Kaplama', FALSE, TRUE, 30),
  ('DICT-CPT-04', 'inside_coating', 'BELİRTİLMEMİŞ', 'Belirtilmemiş', FALSE, TRUE, 40),

  ('DICT-GRP-01', 'product_group', 'ODA_SPREYI', 'Oda Spreyi (Air Freshener)', TRUE, TRUE, 10),
  ('DICT-GRP-02', 'product_group', 'INSEKTISIT', 'İnsektisit / Sinek İlacı', FALSE, TRUE, 20),
  ('DICT-GRP-03', 'product_group', 'MOBILYA_CILASI', 'Mobilya Cilası', FALSE, TRUE, 30),
  ('DICT-GRP-04', 'product_group', 'OTO_BAKIM', 'Oto Bakım Ürünleri', FALSE, TRUE, 40),
  ('DICT-GRP-05', 'product_group', 'DIGER', 'Diğer Aerosol Ürünler', FALSE, TRUE, 50)
ON CONFLICT (category, code) DO NOTHING;

-- 7. product_technicals Seed Verileri (22 Teknik Kart)
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010410-1102', '511109010410-1102', 'TUP-GW MOBILYA 300 ml (52x214)-LEMON', '52x214', 52, 214, 'HAM LEVHA-017x832x875- (T 61) -52x214', '500011000004-1207', 'description_and_size_match_requires_ERP_verification', '500011000004-1207', 'METALİK', 'KISMİ', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','1225C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010410-7026', '511109010410-7026', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT', '52x214', 52, 214, 'HAM LEVHA-017x832x875- (T 61) -52x214', '500011000004-1207', 'description_and_size_match_requires_ERP_verification', '500011000004-1207', 'METALİK', 'KISMİ', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','1225C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010410-7025', '511109010410-7025', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-NATURAL SCENT', '52x214', 52, 214, 'HAM LEVHA-017x832x875- (T 61) -52x214', '500011000004-1207', 'description_and_size_match_requires_ERP_verification', '500011000004-1207', 'METALİK', 'KISMİ', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','1225C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010410-7024', '511109010410-7024', 'TUP-GW MOBILYA CIL. 300 ml (52x214)-POTPORI SCENT', '52x214', 52, 214, 'HAM LEVHA-017x832x875- (T 61) -52x214', '500011000004-1207', 'description_and_size_match_requires_ERP_verification', '500011000004-1207', 'METALİK', 'KISMİ', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','1225C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511115011310-7458', '511115011310-7458', 'TUP-GW ODA SPR-500 ml (65x195)-CHRISTMAS EDITION', '65x195', 65, 195, 'HAM LEVHA-017x835x798- (T 61) -65x195', '500011000004-1415', 'description_and_size_match_requires_ERP_verification', '500011000004-1415', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','7621C','364C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-7284', '511109010910-7284', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-7285', '511109010910-7285', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-7283', '511109010910-7283', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-J.CHERRY BLO.', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4634', '511109010910-4634', 'TUP-GW-MS SDCM ALKOL B.-400 ml (52x234)-BUBBLE GUM', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4640', '511109010910-4640', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ORANGE', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4630', '511109010910-4630', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ROSE&PEARL', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4631', '511109010910-4631', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-S.BERRY', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4641', '511109010910-4641', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-TOBACCO', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4625', '511109010910-4625', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ANTI TABAC', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4620', '511109010910-4620', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-JASMIN&COT.', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4632', '511109010910-4632', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LILAC&LOTUS', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4623', '511109010910-4623', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LIME&ORANGE', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4624', '511109010910-4624', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-M.FRAN OCEA', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4629', '511109010910-4629', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOSS&SPRING', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4628', '511109010910-4628', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-TUTTI FRUTTI', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4633', '511109010910-4633', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-LAVENDER&CHOM', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;
INSERT INTO product_technicals (id, stock_code, stock_name, tube_size, diameter_mm, height_mm, raw_sheet_description_source, raw_sheet_stock_code_candidate, raw_sheet_code_mapping_status, raw_sheet_code, print_surface, varnish, lacquer, inside_coating, colors, special_parameter_source, source, record_kind, is_active, catalog_verified, version)
VALUES ('TECH-511109010910-4635', '511109010910-4635', 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOUNTAIN LAKE', '52x234', 52, 234, 'HAM LEVHA-017x832x720- (T 61) -52x234', '500011000004-1208', 'description_and_size_match_requires_ERP_verification', '500011000004-1208', 'EMAYE', 'PARLAK', 'LAKLI', 'STANDART', ARRAY['C','M','Y','K','368C','357C']::TEXT[], NULL, 'image(20261105-112000).png', 'source_transcription', TRUE, TRUE, 1)
ON CONFLICT (stock_code) DO UPDATE SET
  id = EXCLUDED.id,
  stock_name = EXCLUDED.stock_name,
  tube_size = EXCLUDED.tube_size,
  raw_sheet_code = EXCLUDED.raw_sheet_code,
  print_surface = EXCLUDED.print_surface,
  varnish = EXCLUDED.varnish,
  lacquer = EXCLUDED.lacquer,
  colors = EXCLUDED.colors,
  catalog_verified = TRUE,
  is_active = TRUE;

UPDATE product_technicals
SET inside_coating = 'GOLD'
WHERE stock_name LIKE '%SOFT%' OR special_parameter_source LIKE '%SOFT%';

-- 8. Standart Oturumlar (Demo/Varsayilan Oturumlar)
INSERT INTO app_sessions (token, username, role, display_name, expires_at)
VALUES 
  ('token_admin_session_v2c', 'admin', 'admin', 'Sistem Yöneticisi', CURRENT_TIMESTAMP + INTERVAL '30 days'),
  ('token_planner_session_v2c', 'planner', 'planner', 'Üretim Planlama Uzmanı', CURRENT_TIMESTAMP + INTERVAL '30 days'),
  ('token_viewer_session_v2c', 'viewer', 'viewer', 'Görüntüleyici (Salt Okunur)', CURRENT_TIMESTAMP + INTERVAL '30 days')
ON CONFLICT (token) DO UPDATE SET
  expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
  last_seen_at = CURRENT_TIMESTAMP;

-- 9. Migration 003 Kaydi
INSERT INTO schema_migrations (version, name)
VALUES ('003', '003_faz2c_definitions_and_catalog.sql')
ON CONFLICT (version) DO NOTHING;
