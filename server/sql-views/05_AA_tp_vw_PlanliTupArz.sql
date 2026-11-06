-- ============================================================================
-- VIEW: AA_tp_vw_PlanliTupArz
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]
-- AÇIKLAMA: Makinede planlanmış aktif tüp üretim arzı (Faz 3A.1 kaynağı)
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_PlanliTupArz] AS
SELECT 
    STOKKODU AS stok_kodu,
    STOKISMI AS urun_adi,
    CAST(ISNULL(ADET, 0) AS NUMERIC(18, 2)) AS planlanan_adet,
    [Başlangıç Tarih] AS baslangic_tarihi,
    [Bitiş Tarih] AS bitis_tarihi,
    [Üretim Tarihi] AS uretim_tarihi,
    [Plana Eklenen Tarih] AS plana_eklenen_tarih,
    ISNULL([Çap ve Boy], '') AS cap_boy,
    ISNULL([İş Kod], '') AS is_kod,
    ISNULL([Seri], '') AS seri,
    ISNULL([Kısa Kod], '') AS kisa_kod,
    ISNULL([Ürün Kodu], '') AS urun_kodu,
    ISNULL([Ürün Adı], '') AS urun_adi_uzun,
    CAST(ISNULL([Kalan], 0) AS NUMERIC(18, 2)) AS kalan_adet,
    CAST(ISNULL([Kesik Stok], 0) AS NUMERIC(18, 2)) AS kesik_stok_kaynak,
    CAST(ISNULL([Baskılı Stok], 0) AS NUMERIC(18, 2)) AS baskili_stok_kaynak,
    CAST(ISNULL([Baskı Talep], 0) AS NUMERIC(18, 2)) AS baski_talep_kaynak,
    ISNULL([Açıklama], '') AS aciklama
FROM [MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim];
