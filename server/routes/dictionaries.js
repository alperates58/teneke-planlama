const { query } = require('../db');

async function handleDictionaryRoutes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/definitions/dictionaries') {
    try {
      const result = await query(
        'SELECT * FROM dictionaries WHERE is_active = TRUE ORDER BY category ASC, display_order ASC, label ASC'
      );

      // Kategorilerine göre grupla
      const grouped = {};
      for (const row of result.rows) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        data: grouped,
        rawList: result.rows
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }));
    }
  }

  return false;
}

module.exports = { handleDictionaryRoutes };
