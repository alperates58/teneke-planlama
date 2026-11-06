-- ============================================================================
-- VIEW: AA_tp_vw_ReceteBaglantilari
-- VERİTABANI: AA_LIDER
-- KAYNAK: [MikroDesktop_LIDER26].[dbo].[URUN_RECETELERI], [STOKLAR]
-- AÇIKLAMA: Tüp -> Kesik Levha -> Baskılı Levha -> Ham Levha kademeli reçete bağı
-- ============================================================================
CREATE OR ALTER VIEW [dbo].[AA_tp_vw_ReceteBaglantilari] AS
SELECT 
    r.rec_Guid AS recete_guid,
    r.rec_anakod AS ana_stok_kodu,
    sa.sto_isim AS ana_stok_adi,
    sa.sto_kategori_kodu AS ana_kategori,
    r.rec_tuketim_kod AS tuketim_stok_kodu,
    st.sto_isim AS tuketim_stok_adi,
    st.sto_kategori_kodu AS tuketim_kategori,
    r.rec_anamiktar AS ana_miktar,
    r.rec_tuketim_miktar AS tuketim_miktar,
    CAST(
        CASE 
            WHEN ISNULL(r.rec_anamiktar, 0) = 0 THEN 0
            ELSE r.rec_tuketim_miktar / r.rec_anamiktar
        END AS NUMERIC(18, 6)
    ) AS birim_tuketim_orani,
    r.rec_tuketim_birim AS tuketim_birim_no,
    r.rec_satirno AS satir_no,
    r.rec_lastup_date AS guncelleme_tarihi
FROM [MikroDesktop_LIDER26].[dbo].[URUN_RECETELERI] r
INNER JOIN [MikroDesktop_LIDER26].[dbo].[STOKLAR] sa 
    ON r.rec_anakod = sa.sto_kod
INNER JOIN [MikroDesktop_LIDER26].[dbo].[STOKLAR] st 
    ON r.rec_tuketim_kod = st.sto_kod
WHERE sa.sto_kategori_kodu IN ('TENEKETUP', 'KESIKLEVHA', 'BASKILILEVHA')
  AND st.sto_kategori_kodu IN ('KESIKLEVHA', 'BASKILILEVHA', 'HAMLEVHA', 'BOMBE', 'DIP', 'LAK', 'BAKIR');
