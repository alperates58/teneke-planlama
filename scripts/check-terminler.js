const { executeSqlReadOnly } = require('../server/services/plan-sync-service');

async function test() {
  // 1. alper_terminler kolonları
  const cols = await executeSqlReadOnly(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM [MikroDesktop_LIDER26].INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'alper_terminler'
    ORDER BY ORDINAL_POSITION
  `);
  console.log('alper_terminler columns:', cols.map(c => c.COLUMN_NAME).join(', '));

  // 2. ISNO tekrar eden satırlar var mı?
  const duplicates = await executeSqlReadOnly(`
    SELECT ISNO, COUNT(*) as cnt, SUM(PLANMIKTAR) as total_plan
    FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler]
    GROUP BY ISNO
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `);
  console.log('Duplicates count in alper_terminler (ISNO bazında):', duplicates.length);
  if (duplicates.length > 0) {
    console.log('Sample duplicates:', duplicates.slice(0, 5));

    // İlk duplicate'ın detayını çekelim
    const sampleIsno = duplicates[0].ISNO;
    const details = await executeSqlReadOnly(`
      SELECT * FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler] WHERE ISNO = '${sampleIsno}'
    `);
    console.log('Details of sample duplicate ISNO:', details);
  }

  // 3. alper_terminler tekil anahtarı ne olabilir?
  // Hangi kolonlar birleşimi tekildir?
  const totalCount = await executeSqlReadOnly(`
    SELECT COUNT(*) as total FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler]
  `);
  console.log('Total rows in alper_terminler:', totalCount[0].total);

  // 4. URETIM_MALZEME_PLANLAMA (upl_isemri) ile alper_terminler ilişkisi
  const uplJoin = await executeSqlReadOnly(`
    SELECT 
      t.ISNO, 
      COUNT(DISTINCT t.Tarih) as distinct_tarih,
      COUNT(DISTINCT t.MAKINE) as distinct_makine,
      COUNT(DISTINCT t.SIRA) as distinct_sira,
      COUNT(u.upl_Guid) as upl_count,
      COUNT(*) as total_joined_rows
    FROM [MikroDesktop_LIDER26].[dbo].[alper_terminler] t
    JOIN [MikroDesktop_LIDER26].[dbo].[URETIM_MALZEME_PLANLAMA] u ON t.ISNO = u.upl_isemri
    JOIN [MikroDesktop_LIDER26].[dbo].[STOKLAR] s ON u.upl_kodu = s.sto_kod
    WHERE s.sto_kategori_kodu = 'TENEKETUP' AND u.upl_uretim_tuket = 0 AND u.upl_iptal = 0
    GROUP BY t.ISNO
    HAVING COUNT(DISTINCT t.Tarih) > 1 OR COUNT(DISTINCT t.MAKINE) > 1 OR COUNT(DISTINCT t.SIRA) > 1
  `);
  console.log('ISNO with multiple terminler rows joined with UPL:', uplJoin.length);
  if (uplJoin.length > 0) {
    console.log('Sample multiple join:', uplJoin.slice(0, 3));
  }
}

test().catch(console.error);
