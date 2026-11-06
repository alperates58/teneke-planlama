const productService = require('../services/product-service');

async function handleProductRoutes(req, res, pathname, queryParams) {
  // GET /api/definitions/products
  if (req.method === 'GET' && pathname === '/api/definitions/products') {
    try {
      const items = await productService.listProducts(queryParams);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        count: items.length,
        data: items
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message }
      }));
    }
  }

  // GET /api/definitions/products/:code
  const matchGet = pathname.match(/^\/api\/definitions\/products\/([^\/]+)$/);
  if (req.method === 'GET' && matchGet) {
    const stockCode = decodeURIComponent(matchGet[1]);
    try {
      const item = await productService.getProductByCode(stockCode);
      if (!item) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: `'${stockCode}' kodlu teknik kart bulunamadı.` }
        }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: item }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }));
    }
  }

  // POST /api/definitions/products (Yeni Ekle)
  if (req.method === 'POST' && pathname === '/api/definitions/products') {
    if (!req.user || !req.user.permissions?.canEditParameters) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Teknik kart eklemek için düzenleme yetkisi (admin veya planner) gereklidir.' }
      }));
    }

    try {
      const created = await productService.createProduct(req.body, req.user);
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: created }));
    } catch (err) {
      const statusCode = err.code === 'MUKERRER_KAYIT' ? 409 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: err.code || 'CREATE_ERROR', message: err.message, details: err.details }
      }));
    }
  }

  // PUT /api/definitions/products/:code (Güncelle)
  const matchPut = pathname.match(/^\/api\/definitions\/products\/([^\/]+)$/);
  if (req.method === 'PUT' && matchPut) {
    if (!req.user || !req.user.permissions?.canEditParameters) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Teknik kart güncellemek için yetki gereklidir.' }
      }));
    }

    const stockCode = decodeURIComponent(matchPut[1]);
    try {
      const updated = await productService.updateProduct(stockCode, req.body, req.user);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: updated }));
    } catch (err) {
      const statusCode = err.code === 'BULUNAMADI' ? 404 : err.code === 'ESZAMANLI_DUZENLEME_CAKISMASI' ? 409 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: err.code || 'UPDATE_ERROR', message: err.message, details: err.details }
      }));
    }
  }

  // PATCH /api/definitions/products/:code/toggle-active
  const matchToggle = pathname.match(/^\/api\/definitions\/products\/([^\/]+)\/toggle-active$/);
  if (req.method === 'PATCH' && matchToggle) {
    if (!req.user || !req.user.permissions?.canEditParameters) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Kart durumunu değiştirmek için yetki gereklidir.' }
      }));
    }

    const stockCode = decodeURIComponent(matchToggle[1]);
    try {
      const toggled = await productService.toggleActive(stockCode, req.user);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: toggled }));
    } catch (err) {
      const statusCode = err.code === 'BULUNAMADI' ? 404 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: err.code || 'TOGGLE_ERROR', message: err.message }
      }));
    }
  }

  // DELETE /api/definitions/products/:code (Sil)
  const matchDelete = pathname.match(/^\/api\/definitions\/products\/([^\/]+)$/);
  if (req.method === 'DELETE' && matchDelete) {
    if (!req.user || !req.user.permissions?.canEditParameters) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Teknik kart silmek için yetki gereklidir.' }
      }));
    }

    const stockCode = decodeURIComponent(matchDelete[1]);
    try {
      const result = await productService.deleteProduct(stockCode, req.user);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      const statusCode = err.code === 'BULUNAMADI' ? 404 : err.code === 'REFERANS_BUTUNLUGU_ENGELI' ? 409 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: err.code || 'DELETE_ERROR', message: err.message, references: err.references }
      }));
    }
  }

  return false;
}

module.exports = { handleProductRoutes };
