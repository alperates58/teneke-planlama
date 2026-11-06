-- ============================================================================
-- VIEW: AA_tp_vw_StokKartlari
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[STOKLAR]
-- AÇIKLAMA: Teneke üretim ve planlamaya konu stok kartları (TÜP, KESİK, BASKILI, HAM LEVHA, BOMBE, DIP)
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_StokKartlari] AS
SELECT 
    sto_kod AS stok_kodu,
    sto_isim AS stok_adi,
    sto_kisa_ismi AS kisa_isim,
    sto_kategori_kodu AS kategori_kodu,
    sto_anagrup_kod AS anagrup_kodu,
    sto_altgrup_kod AS altgrup_kodu,
    sto_birim1_ad AS temel_birim,
    sto_birim2_ad AS ikincil_birim,
    sto_pasif_fl AS pasif_mi,
    sto_create_date AS olusturma_tarihi,
    sto_lastup_date AS guncelleme_tarihi
FROM [MikroDesktop_LIDER26].[dbo].[STOKLAR]
WHERE sto_kategori_kodu IN ('TENEKETUP', 'KESIKLEVHA', 'BASKILILEVHA', 'HAMLEVHA', 'BOMBE', 'DIP');
