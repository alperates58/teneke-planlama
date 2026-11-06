const { Client } = require('pg');
const fs = require('fs');

async function seedDemands() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgrespassword@localhost:5432/teneke_planlama' });
  await client.connect();

  const content = fs.readFileSync('public/app.js', 'utf8');
  const start = content.indexOf('const INITIAL_DEMANDS = [');
  const end = content.indexOf('];', start);
  const arrStr = content.substring(start + 'const INITIAL_DEMANDS = '.length, end + 1);
  const demands = eval(arrStr);

  console.log('Seeding', demands.length, 'demands...');
  for (const d of demands) {
    await client.query(`
      INSERT INTO demands (
        id, reference_no, stock_code, stock_name, tube_size, diameter_mm, height_mm,
        due_date, gross_quantity, available_stock, net_quantity, raw_sheet_code,
        raw_sheet_desc, print_surface, varnish, lacquer, inside_coating, colors,
        definition_status, customer_or_brand, order_type, scope_note, record_kind
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (id) DO UPDATE SET
        stock_code = EXCLUDED.stock_code,
        net_quantity = EXCLUDED.net_quantity
    `, [
      d.id, d.reference_no, d.stock_code, d.stock_name, d.tube_size, d.diameter_mm, d.height_mm,
      d.due_date, d.gross_quantity, d.available_stock, d.net_quantity, d.raw_sheet_code,
      d.raw_sheet_desc, d.print_surface, d.varnish || 'BELİRTİLMEMİŞ', d.lacquer || 'BELİRTİLMEMİŞ',
      d.inside_coating || 'BELİRTİLMEMİŞ', d.colors, d.definition_status || 'complete',
      d.customer_or_brand || null, d.order_type || 'RPT', d.scope_note || null, d.record_kind || 'synthetic_demo'
    ]);
  }

  const res = await client.query('SELECT count(*) FROM demands');
  console.log('Total demands in DB:', res.rows[0].count);
  await client.end();
}

seedDemands().catch(console.error);
