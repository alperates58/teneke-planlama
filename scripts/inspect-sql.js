const { executeSqlReadOnly } = require('./server/services/plan-sync-service');

const viewSql = `
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
`;

async function run() {
  try {
    console.log("Updating view AA_tp_vw_StokDepo on AA_LIDER...");
    await executeSqlReadOnly(viewSql, 'AA_LIDER');
    console.log("View updated successfully!");

    const testRes = await executeSqlReadOnly(`
      SELECT 
        COUNT(*) as total_stocks,
        SUM(CASE WHEN is_negative_stock = 1 THEN 1 ELSE 0 END) as negative_stock_count,
        SUM(toplam_fiziksel_stok) as sum_physical,
        SUM(haric_bloke_stok) as sum_excluded,
        SUM(net_kullanilabilir_stok) as sum_usable
      FROM [AA_LIDER].[dbo].[AA_tp_vw_StokDepo]
    `, 'AA_LIDER');
    console.log("=== AA_tp_vw_StokDepo test results ===", testRes);

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
