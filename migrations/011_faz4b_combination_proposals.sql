-- ============================================================================
-- FAZ 4B: OTOMATİK KOMBİNASYON ÖNERİ MOTORU VE KALICI ÖNERİ TABLOLARI
-- ============================================================================

-- 1. Kombinasyon Öneri Koşuları (Audit, Filtreler ve Öneriye Alınamayanlar)
CREATE TABLE IF NOT EXISTS combination_proposal_runs (
    id VARCHAR(64) PRIMARY KEY,
    scope VARCHAR(32) NOT NULL DEFAULT 'ACTIVE_PLAN', -- 'ACTIVE_PLAN', 'UNPLANNED_DEMAND', 'ALL'
    tube_size_filter VARCHAR(32) NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_candidates INTEGER NOT NULL DEFAULT 0,
    eligible_candidates INTEGER NOT NULL DEFAULT 0,
    excluded_candidates INTEGER NOT NULL DEFAULT 0,
    proposals_found INTEGER NOT NULL DEFAULT 0,
    search_status VARCHAR(32) NOT NULL DEFAULT 'VALID_PROPOSAL', -- 'VALID_PROPOSAL', 'NO_SOLUTION_FOUND', 'SEARCH_LIMIT_REACHED', 'DATA_INSUFFICIENT'
    search_duration_ms INTEGER NOT NULL DEFAULT 0,
    excluded_demands JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by VARCHAR(64) DEFAULT 'planner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kombinasyon Önerileri (Üretilen Senaryolar)
CREATE TABLE IF NOT EXISTS combination_proposals (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES combination_proposal_runs(id) ON DELETE CASCADE,
    proposal_no VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    tube_size VARCHAR(32) NOT NULL,
    raw_sheet_code VARCHAR(64) NOT NULL,
    raw_sheet_name VARCHAR(255) NULL,
    raw_sheet_capacity INTEGER NOT NULL,
    assembly_group_count INTEGER NOT NULL,
    repeat_step INTEGER NOT NULL,
    total_slots INTEGER NOT NULL,
    used_slots INTEGER NOT NULL,
    sheets_to_print INTEGER NOT NULL DEFAULT 1250,
    total_output_tubes NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_covered_demand NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_overproduction NUMERIC(14,2) NOT NULL DEFAULT 0,
    unique_colors_count INTEGER NOT NULL DEFAULT 0,
    unique_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    template_verification_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
    validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_applied_to_draft BOOLEAN NOT NULL DEFAULT FALSE,
    applied_combination_id VARCHAR(64) REFERENCES sheet_combinations(id) ON DELETE SET NULL,
    applied_at TIMESTAMP WITH TIME ZONE NULL,
    applied_by VARCHAR(64) NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    score NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prop_run ON combination_proposals(run_id);
CREATE INDEX IF NOT EXISTS idx_prop_size ON combination_proposals(tube_size);
CREATE INDEX IF NOT EXISTS idx_prop_applied ON combination_proposals(is_applied_to_draft);
