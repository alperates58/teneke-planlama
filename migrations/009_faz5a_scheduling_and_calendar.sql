-- ============================================================================
-- FAZ 5A: TEK MAKİNE TAKVİMİ, HIZ, HAZIRLIK MATRİSİ VE ÇİZELGELEME ŞEMASI
-- Dosya: migrations/009_faz5a_scheduling_and_calendar.sql
-- Tarih: 07.11.2026
-- ============================================================================

-- 1. Tek Makine Spesifikasyonu ve Parametreleri (Kural: Fabrikada tek tüp hattı vardır)
CREATE TABLE IF NOT EXISTS production_machine_specs (
    machine_code VARCHAR(50) PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    line_type VARCHAR(30) NOT NULL DEFAULT 'tube_body',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    setup_rule_type VARCHAR(50) NOT NULL DEFAULT 'DIAMETER_AND_HEIGHT',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO production_machine_specs (machine_code, machine_name, line_type, is_active, notes)
VALUES ('TUP-HATTI', 'Tüp Gövde Üretim Hattı (Tek Makine)', 'tube_body', TRUE, 'Fabrikadaki tek tüp gövde üretim makinesidir.')
ON CONFLICT (machine_code) DO UPDATE SET
    machine_name = EXCLUDED.machine_name,
    is_active = TRUE;

-- 2. Çalışma Takvimi Ana Yapılandırması
CREATE TABLE IF NOT EXISTS production_calendar_configs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    work_start_time TIME NOT NULL DEFAULT '07:30:00',
    work_end_time TIME NOT NULL DEFAULT '17:30:00',
    shift_end_time TIME NOT NULL DEFAULT '01:30:00',
    speed_unit VARCHAR(30) NOT NULL DEFAULT 'units_per_minute',
    setup_calendar_mode VARCHAR(30) NOT NULL DEFAULT 'WORK_HOURS', -- 'WORK_HOURS' veya 'ANYTIME'
    transit_buffer_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO production_calendar_configs (id, name, work_start_time, work_end_time, shift_end_time, setup_calendar_mode)
VALUES ('DEFAULT', 'Lider Fabrika Standart Takvimi (07:30 - 17:30 / 01:30)', '07:30:00', '17:30:00', '01:30:00', 'WORK_HOURS')
ON CONFLICT (id) DO NOTHING;

-- 3. Vardiya Molaları
CREATE TABLE IF NOT EXISTS production_calendar_breaks (
    id SERIAL PRIMARY KEY,
    calendar_config_id VARCHAR(50) NOT NULL REFERENCES production_calendar_configs(id) ON DELETE CASCADE,
    break_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan Molalar (Excel zaman.vba doğrulanmış aralıkları)
INSERT INTO production_calendar_breaks (calendar_config_id, break_name, start_time, end_time, duration_minutes)
VALUES
    ('DEFAULT', 'Mola 1 (Kuşluk)', '09:15:00', '09:30:00', 15),
    ('DEFAULT', 'Mola 2 (Öğle Yemeği)', '12:00:00', '12:30:00', 30),
    ('DEFAULT', 'Mola 3 (İkindi Çayı)', '15:15:00', '15:30:00', 15),
    ('DEFAULT', 'Mola 4 (Akşam Çayı)', '19:30:00', '19:45:00', 15),
    ('DEFAULT', 'Mola 5 (Akşam Yemeği)', '21:30:00', '22:00:00', 30),
    ('DEFAULT', 'Mola 6 (Gece Çayı)', '23:30:00', '23:45:00', 15)
ON CONFLICT DO NOTHING;

-- 4. Çalışma Takvimi Günlük İstisnaları (Hafta sonu, tatil, mesai, özel vardiya)
CREATE TABLE IF NOT EXISTS production_calendar_exceptions (
    id SERIAL PRIMARY KEY,
    calendar_config_id VARCHAR(50) NOT NULL REFERENCES production_calendar_configs(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    day_type VARCHAR(30) NOT NULL, -- 'WORKING', 'SHIFT', 'VARDİYA1', 'OVERTIME', 'HOLIDAY', 'MAINTENANCE'
    start_time TIME,
    end_time TIME,
    overtime_hours NUMERIC(4, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calendar_config_id, exception_date)
);

-- 5. Ebat Bazında Üretim Hızları (TENEKE DATA adet/dakika parametresi)
CREATE TABLE IF NOT EXISTS tube_production_speeds (
    id SERIAL PRIMARY KEY,
    tube_size VARCHAR(30) NOT NULL UNIQUE,
    diameter_mm INTEGER NOT NULL,
    height_mm INTEGER NOT NULL,
    speed_units_per_minute NUMERIC(10, 4) NOT NULL,
    speed_units_per_hour NUMERIC(12, 2) NOT NULL,
    nominal_shift_hours NUMERIC(4, 2) DEFAULT 9.0,
    nominal_shift_output NUMERIC(14, 2),
    source VARCHAR(50) DEFAULT 'TENEKE DATA',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 29 Ebatın Doğrulanmış Hız Verileri
INSERT INTO tube_production_speeds (tube_size, diameter_mm, height_mm, speed_units_per_minute, speed_units_per_hour, nominal_shift_output)
VALUES
    ('45x100', 45, 100, 185.1852, 11111.11, 100000),
    ('45x105', 45, 105, 185.1852, 11111.11, 100000),
    ('45x125', 45, 125, 185.1852, 11111.11, 100000),
    ('45x140', 45, 140, 185.1852, 11111.11, 100000),
    ('45x150', 45, 150, 185.1852, 11111.11, 100000),
    ('45x158', 45, 158, 185.1852, 11111.11, 100000),
    ('45x175', 45, 175, 185.1852, 11111.11, 100000),
    ('45x190', 45, 190, 185.1852, 11111.11, 100000),
    ('52x90',  52,  90, 185.1852, 11111.11, 100000),
    ('52x105', 52, 105, 185.1852, 11111.11, 100000),
    ('52x112', 52, 112, 185.1852, 11111.11, 100000),
    ('52x132', 52, 132, 185.1852, 11111.11, 100000),
    ('52x161', 52, 161, 185.1852, 11111.11, 100000),
    ('52x165', 52, 165, 185.1852, 11111.11, 100000),
    ('52x180', 52, 180, 185.1852, 11111.11, 100000),
    ('52x195', 52, 195, 185.1852, 11111.11, 100000),
    ('52x214', 52, 214, 185.1852, 11111.11, 100000),
    ('52x234', 52, 234, 185.1852, 11111.11, 100000),
    ('52x245', 52, 245, 185.1852, 11111.11, 100000),
    ('65x98',  65,  98, 185.1852, 11111.11, 100000),
    ('65x99',  65,  99, 185.1852, 11111.11, 100000),
    ('65x104', 65, 104, 185.1852, 11111.11, 100000),
    ('65x157', 65, 157, 185.1852, 11111.11, 100000),
    ('65x165', 65, 165, 185.1852, 11111.11, 100000),
    ('65x195', 65, 195, 185.1852, 11111.11, 100000),
    ('65x234', 65, 234, 185.1852, 11111.11, 100000),
    ('65x240', 65, 240, 185.1852, 11111.11, 100000),
    ('65x260', 65, 260, 148.1481,  8888.89,  80000),
    ('65x270', 65, 270, 100.0000,  6000.00,  54000),
    ('65x300', 65, 300, 100.0000,  6000.00,  54000)
ON CONFLICT (tube_size) DO UPDATE SET
    speed_units_per_minute = EXCLUDED.speed_units_per_minute,
    speed_units_per_hour = EXCLUDED.speed_units_per_hour,
    nominal_shift_output = EXCLUDED.nominal_shift_output;

-- 6. Çap ve Boy Değişimi Hazırlık (Setup) Süreleri Matrisi
CREATE TABLE IF NOT EXISTS production_setup_rules (
    id SERIAL PRIMARY KEY,
    change_type VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    setup_duration_minutes INTEGER NOT NULL,
    target_diameter_mm INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO production_setup_rules (change_type, description, setup_duration_minutes, target_diameter_mm)
VALUES
    ('DIAMETER_TO_45', 'Hedef çap 45 mm olan tüm çap değişimleri', 480, 45),
    ('DIAMETER_OTHER', 'Diğer çap değişimleri (52 <-> 65 mm)', 180, NULL),
    ('HEIGHT_ONLY', 'Aynı çapta boy (yükseklik) değişimi', 60, NULL),
    ('SAME_SIZE', 'Aynı ebat (çap ve boy eşit, ayar gerektirmez)', 0, NULL)
ON CONFLICT (change_type) DO UPDATE SET
    setup_duration_minutes = EXCLUDED.setup_duration_minutes,
    description = EXCLUDED.description;

-- 7. Plan Taslak Satırları Kolon Genişletmeleri (Kaynak vs. Önerilen Tarih Ayrımı ve Durumlar)
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS source_start_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS source_end_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS suggested_start_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS suggested_end_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS setup_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS production_duration_minutes NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS speed_units_per_minute NUMERIC(10, 4);
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS is_start_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS is_sequence_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS delay_days INTEGER DEFAULT 0;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT FALSE;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS material_status VARCHAR(50) DEFAULT 'CONFIRMED';
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS covered_demand_keys JSONB DEFAULT '[]'::jsonb;

-- Mevcut satırlardaki start_date / end_date değerlerini source_* kolonlarına yedekle
UPDATE production_plan_draft_items
SET 
    source_start_date = COALESCE(source_start_date, start_date),
    source_end_date = COALESCE(source_end_date, end_date),
    suggested_start_date = COALESCE(suggested_start_date, start_date),
    suggested_end_date = COALESCE(suggested_end_date, end_date)
WHERE source_start_date IS NULL;

-- 8. Plan Taslak Üstbilgisi Genişletmeleri
ALTER TABLE production_plan_drafts ADD COLUMN IF NOT EXISTS schedule_start_time TIMESTAMPTZ;
ALTER TABLE production_plan_drafts ADD COLUMN IF NOT EXISTS last_scheduled_at TIMESTAMPTZ;
ALTER TABLE production_plan_drafts ADD COLUMN IF NOT EXISTS total_setup_minutes INTEGER DEFAULT 0;
ALTER TABLE production_plan_drafts ADD COLUMN IF NOT EXISTS total_working_minutes INTEGER DEFAULT 0;
ALTER TABLE production_plan_drafts ADD COLUMN IF NOT EXISTS delayed_items_count INTEGER DEFAULT 0;

-- 9. Senaryo Yönetimi ve Sürüm Tarihçesi (Alternatif planlar ve önceki sürüme dönüş)
CREATE TABLE IF NOT EXISTS production_plan_scenarios (
    id VARCHAR(64) PRIMARY KEY,
    draft_id VARCHAR(64) NOT NULL REFERENCES production_plan_drafts(id) ON DELETE CASCADE,
    scenario_name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'planner',
    notes TEXT,
    items_payload JSONB NOT NULL,
    summary_metrics JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_scenarios_draft 
ON production_plan_scenarios(draft_id, version);
