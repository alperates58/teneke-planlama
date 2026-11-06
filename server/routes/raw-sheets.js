const { query } = require('../db');

async function handleRawSheetRoutes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/definitions/raw-sheets') {
    try {
      const result = await query('SELECT * FROM raw_sheets ORDER BY tube_size ASC, stock_code ASC');
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

  return false;
}

async function handleCapacityRoutes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/definitions/capacities') {
    try {
      const result = await query('SELECT * FROM tube_capacities ORDER BY tube_size ASC');
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

  return false;
}

module.exports = { handleRawSheetRoutes, handleCapacityRoutes };
