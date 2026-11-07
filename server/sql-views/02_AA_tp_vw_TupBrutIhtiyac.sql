-- ============================================================================
-- VIEW: AA_tp_vw_TupBrutIhtiyac
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[alper_terminler], [URETIM_MALZEME_PLANLAMA], [STOKLAR], [ISEMRI_MALZEME_DURUMLARI]
-- AÇIKLAMA: Dolum planı ve iş emirlerinden gelen brüt teneke tüp ihtiyaçları
-- FORMÜL: (upl_miktar / NULLIF(upl_uret_miktar, 0)) * dolum_kalan_miktar
-- GÜNCELLEME (FAZ 3B):
--  1) upl_uretim_tuket = 0 (tüketim) ve upl_iptal = 0 filtreleri eklendi.
--  2) Kalan dolum miktarı: ISEMRI_MALZEME_DURUMLARI üzerinden (ish_planuretim - ish_uret_miktar).
--  3) Sıfır veya eksik upl_uret_miktar durumunda brut_tup_ihtiyac NULL yapılır, satır kaybolmaz, has_recipe_error = 1 ile işaretlenir.
--  4) Kararlı talep kimliği: demand_key = CONCAT(t.ISNO, '_', u.upl_Guid).
--  5) Tarih/saat bütünlüğü: TRY_CAST(t.IHTIYACTARIH AS DATETIME) ile saat bilgisi korunur.
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_TupBrutIhtiyac] AS
SELECT 
    CONCAT(t.ISNO, '_', CAST(u.upl_Guid AS NVARCHAR(36))) AS demand_key,
    t.ISNO AS is_no,
    t.SIPARISNO AS siparis_no,
    t.URUNKOD AS dolum_mamul_kodu,
    t.URUNAD AS dolum_mamul_adi,
    t.PLANMIKTAR AS dolum_plan_miktar,
    ISNULL(i.ish_uret_miktar, 0) AS dolum_gerceklesen_miktar,
    CAST(
        CASE 
            WHEN i.ish_isemri IS NOT NULL THEN 
                CASE WHEN (i.ish_planuretim - i.ish_uret_miktar) < 0 THEN 0 
                     ELSE (i.ish_planuretim - i.ish_uret_miktar) 
                END
            ELSE t.PLANMIKTAR 
        END AS NUMERIC(18, 2)
    ) AS dolum_kalan_miktar,
    TRY_CAST(t.IHTIYACTARIH AS DATETIME) AS ihtiyac_tarihi,
    t.bittarih AS bitis_tarihi,
    t.Tarih AS plan_tarihi,
    t.MAKINE AS dolum_makine,
    t.SIRA AS dolum_sira,
    t.SERI AS dolum_seri,
    u.upl_kodu AS tup_stok_kodu,
    s.sto_isim AS tup_stok_adi,
    s.sto_kategori_kodu AS tup_kategori,
    u.upl_miktar AS recete_upl_miktar,
    u.upl_uret_miktar AS recete_upl_uret_miktar,
    CAST(
        CASE 
            WHEN ISNULL(u.upl_uret_miktar, 0) <= 0 THEN NULL
            ELSE (u.upl_miktar / u.upl_uret_miktar) * (
                CASE 
                    WHEN i.ish_isemri IS NOT NULL THEN 
                        CASE WHEN (i.ish_planuretim - i.ish_uret_miktar) < 0 THEN 0 
                             ELSE (i.ish_planuretim - i.ish_uret_miktar) 
                        END
                    ELSE t.PLANMIKTAR 
                END
            )
        END AS NUMERIC(18, 2)
    ) AS brut_tup_ihtiyac,
    CASE 
        WHEN ISNULL(u.upl_uret_miktar, 0) <= 0 THEN 1 
        ELSE 0 
    END AS has_recipe_error,
    CASE 
        WHEN ISNULL(u.upl_uret_miktar, 0) <= 0 THEN 'RECETE_URET_MIKTAR_SIFIR'
        ELSE NULL 
    END AS error_message,
    u.upl_Guid AS upl_guid,
    u.upl_satirno AS upl_satirno,
    u.upl_lastup_date AS guncelleme_tarihi
FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler] t
INNER JOIN [MikroDesktop_LIDER26].[dbo].[URETIM_MALZEME_PLANLAMA] u 
    ON t.ISNO = u.upl_isemri
INNER JOIN [MikroDesktop_LIDER26].[dbo].[STOKLAR] s 
    ON u.upl_kodu = s.sto_kod
LEFT JOIN [MikroDesktop_LIDER26].[dbo].[ISEMRI_MALZEME_DURUMLARI] i 
    ON u.upl_isemri = i.ish_isemri AND t.URUNKOD = i.ish_stokhizm_gid_kod
WHERE s.sto_kategori_kodu = 'TENEKETUP'
  AND u.upl_uretim_tuket = 0
  AND u.upl_iptal = 0;
