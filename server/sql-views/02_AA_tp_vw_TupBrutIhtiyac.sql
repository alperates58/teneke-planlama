-- ============================================================================
-- VIEW: AA_tp_vw_TupBrutIhtiyac
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[alper_terminler], [URETIM_MALZEME_PLANLAMA], [STOKLAR]
-- AÇIKLAMA: Dolum planı ve iş emirlerinden gelen brüt teneke tüp ihtiyaçları
-- FORMÜL: (upl_miktar / NULLIF(upl_uret_miktar, 0)) * PLANMIKTAR
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_TupBrutIhtiyac] AS
SELECT 
    t.ISNO AS is_no,
    t.SIPARISNO AS siparis_no,
    t.URUNKOD AS dolum_mamul_kodu,
    t.URUNAD AS dolum_mamul_adi,
    t.PLANMIKTAR AS dolum_plan_miktar,
    t.IHTIYACTARIH AS ihtiyac_tarihi,
    t.bittarih AS bitis_tarihi,
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
            WHEN ISNULL(u.upl_uret_miktar, 0) = 0 THEN u.upl_miktar
            ELSE (u.upl_miktar / u.upl_uret_miktar) * t.PLANMIKTAR
        END AS NUMERIC(18, 2)
    ) AS brut_tup_ihtiyac,
    u.upl_Guid AS upl_guid,
    u.upl_lastup_date AS guncelleme_tarihi
FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler] t
INNER JOIN [MikroDesktop_LIDER26].[dbo].[URETIM_MALZEME_PLANLAMA] u 
    ON t.ISNO = u.upl_isemri
INNER JOIN [MikroDesktop_LIDER26].[dbo].[STOKLAR] s
    ON u.upl_kodu = s.sto_kod
WHERE s.sto_kategori_kodu = 'TENEKETUP';
