-- ============================================================================
-- VIEW: AA_tp_vw_StokDepo
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[STOKLAR], [AA_LIDER].[dbo].[AA_alper_vw_EldekiMiktar], [AA_LIDER].[dbo].[AA_alper_vw_HaricDepolarToplam]
-- AÇIKLAMA: Ambar bazlı fiziksel, bloke/hariç ve net kullanılabilir stok
-- KURAL: Net Kullanılabilir Stok = Eldeki Toplam Stok - Hariç/Bloke Depolar Toplamı
-- GÜNCELLEME (FAZ 3B):
--  1) ham_net_stok: Negatif ham bakiye korunur, clamp yapılmaz.
--  2) net_kullanilabilir_stok: Tahsis motoru için en az 0 (negatif ihtiyaç üretmez).
--  3) is_negative_stock: Negatif veri uyarısı bayrağı eklendi.
--  4) depo_kapsam_modu: 'ONCEDEN_NETLENMIS_KULLANILABILIR_STOK' sözleşmesi eklendi.
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_StokDepo] AS
SELECT 
    s.sto_kod AS stok_kodu,
    s.sto_isim AS stok_adi,
    s.sto_kategori_kodu AS kategori_kodu,
    s.sto_birim1_ad AS temel_birim,
    CAST(ISNULL(e.ToplamStok, 0) AS NUMERIC(18, 3)) AS toplam_fiziksel_stok,
    CAST(ISNULL(h.HaricDepoToplam, 0) AS NUMERIC(18, 3)) AS haric_bloke_stok,
    CAST((ISNULL(e.ToplamStok, 0) - ISNULL(h.HaricDepoToplam, 0)) AS NUMERIC(18, 3)) AS ham_net_stok,
    CAST(
        CASE 
            WHEN (ISNULL(e.ToplamStok, 0) - ISNULL(h.HaricDepoToplam, 0)) < 0 THEN 0
            ELSE (ISNULL(e.ToplamStok, 0) - ISNULL(h.HaricDepoToplam, 0))
        END AS NUMERIC(18, 3)
    ) AS net_kullanilabilir_stok,
    CAST(
        CASE 
            WHEN (ISNULL(e.ToplamStok, 0) - ISNULL(h.HaricDepoToplam, 0)) < 0 THEN 1
            ELSE 0
        END AS BIT
    ) AS is_negative_stock,
    'ONCEDEN_NETLENMIS_KULLANILABILIR_STOK' AS depo_kapsam_modu
FROM [MikroDesktop_LIDER26].[dbo].[STOKLAR] s
LEFT JOIN [AA_LIDER].[dbo].[AA_alper_vw_EldekiMiktar] e 
    ON s.sto_kod = e.sho_StokKodu
LEFT JOIN [AA_LIDER].[dbo].[AA_alper_vw_HaricDepolarToplam] h 
    ON s.sto_kod = h.sto_kod
WHERE s.sto_kategori_kodu IN ('TENEKETUP', 'KESIKLEVHA', 'BASKILILEVHA', 'HAMLEVHA', 'BOMBE', 'DIP');
