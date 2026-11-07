const { executeSqlReadOnly } = require('../server/services/plan-sync-service');
const fs = require('fs');

async function deploy() {
  const sql = fs.readFileSync('server/sql-views/02_AA_tp_vw_TupBrutIhtiyac.sql', 'utf8');
  await executeSqlReadOnly(sql);
  console.log('02_AA_tp_vw_TupBrutIhtiyac view deployed successfully to SQL Server (AA_LIDER)');

  // Test edelim
  const res = await executeSqlReadOnly('SELECT TOP 3 demand_key, is_no, dolum_kalan_miktar, brut_tup_ihtiyac FROM [dbo].[AA_tp_vw_TupBrutIhtiyac]');
  console.log('Sample rows from deployed view:', res);
}

deploy().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
