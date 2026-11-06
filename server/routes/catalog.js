const { query } = require('../db');

async function handleCatalogRoutes(req, res, pathname, queryParams) {
  // GET /api/definitions/stock-catalog
  if (req.method === 'GET' && pathname === '/api/definitions/stock-catalog') {
    let sql = 'SELECT * FROM erp_stock_catalog WHERE 1=1';
    const params = [];
    let idx = 1;

    if (queryParams.search) {
      sql += ` AND (stock_code ILIKE $${idx} OR stock_name ILIKE $${idx})`;
      params.push(`%${queryParams.search}%`);
      idx++;
    }

    if (queryParams.category) {
      sql += ` AND category = $${idx}`;
      params.push(queryParams.category);
      idx++;
    }

    sql += ' ORDER BY stock_code ASC';

    if (queryParams.limit) {
      sql += ` LIMIT $${idx}`;
      params.push(parseInt(queryParams.limit, 10));
      idx++;
    }

    try {
      const result = await query(sql, params);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        count: result.rows.length,
        data: result.rows
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }));
    }
  }

  // GET /api/definitions/stock-catalog/:code
  const match = pathname.match(/^\/api\/definitions\/stock-catalog\/([^\/]+)$/);
  if (req.method === 'GET' && match) {
    const code = decodeURIComponent(match[1]);
    try {
      const result = await query('SELECT * FROM erp_stock_catalog WHERE stock_code = $1', [code]);
      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: `'${code}' stok kartı ERP kataloğunda bulunamadı.` }
        }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: result.rows[0] }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }));
    }
  }

  return false;
}

module.exports = { handleCatalogRoutes };
