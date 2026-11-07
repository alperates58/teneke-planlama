-- ============================================================================
-- FAZ 4B: HEDEFLİ KABUL DÜZELTMELERİ (SİMÜLASYON, ÇOKLU REZERVASYON, ONAY)
-- ============================================================================

-- 1. combination_proposal_runs tablosuna simülasyon bayrağı ekle
ALTER TABLE combination_proposal_runs
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. combination_proposals tablosuna simülasyon bayrağı ekle
ALTER TABLE combination_proposals
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. sheet_combinations tablosuna simülasyon, parametre sürümü ve şablon durumu ekle
ALTER TABLE sheet_combinations
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parameter_version VARCHAR(32) DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS template_verification_status VARCHAR(32) DEFAULT 'unverified';

-- 4. sheet_combination_items tablosuna source_demands JSONB kolonu ekle
ALTER TABLE sheet_combination_items
ADD COLUMN IF NOT EXISTS source_demands JSONB DEFAULT '[]'::jsonb;

-- 5. Geçmiş simülasyon koşularını ve önerilerini tespit edip işaretle (silmeden koru)
UPDATE combination_proposal_runs
SET is_simulation = TRUE
WHERE (filters->>'allowUnspecifiedColors')::boolean IS TRUE;

UPDATE combination_proposals cp
SET is_simulation = TRUE
FROM combination_proposal_runs r
WHERE cp.run_id = r.id AND r.is_simulation = TRUE;

UPDATE sheet_combinations sc
SET is_simulation = TRUE
FROM combination_proposals cp
WHERE cp.applied_combination_id = sc.id AND cp.is_simulation = TRUE;
