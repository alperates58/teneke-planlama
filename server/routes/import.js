const importService = require('../services/import-service');

function extractMultipartFile(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryBuffer = Buffer.from('--' + boundary);

  let start = buffer.indexOf(boundaryBuffer);
  if (start === -1) return null;

  start += boundaryBuffer.length;
  const end = buffer.indexOf(boundaryBuffer, start);
  if (end === -1) return null;

  const part = buffer.slice(start, end);
  const headerEnd = part.indexOf('\r\n\r\n');
  if (headerEnd === -1) return null;

  const fileData = part.slice(headerEnd + 4);
  // Trailing \r\n temizle
  if (fileData.length >= 2 && fileData[fileData.length - 2] === 13 && fileData[fileData.length - 1] === 10) {
    return fileData.slice(0, fileData.length - 2);
  }
  return fileData;
}

async function handleImportRoutes(req, res, pathname) {
  // GET /api/definitions/import/template -> Gerçek .xlsx şablonu indir
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/definitions/import/template') {
    try {
      const buffer = importService.generateExcelTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Teneke_Teknik_Kart_Sablonu.xlsx"');
      res.setHeader('Content-Length', buffer.length);
      res.writeHead(200);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(buffer);
      }
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { code: 'TEMPLATE_ERROR', message: err.message } }));
      return true;
    }
  }

  // POST /api/definitions/import/preview -> Dosya veya metin önizleme & doğrulama
  if (req.method === 'POST' && pathname === '/api/definitions/import/preview') {
    try {
      let parsed = null;

      // 1. Multipart dosya yüklemesi (.xlsx / .xlsm)
      if (req.isMultipart) {
        const fileBuffer = extractMultipartFile(req.rawBuffer, req.contentType);
        if (!fileBuffer || fileBuffer.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            error: { code: 'FILE_EMPTY', message: 'Yüklenen dosya içeriği boş veya geçersiz.' }
          }));
          return true;
        }
        parsed = importService.parseWorkbookBuffer(fileBuffer);
      }
      // 2. JSON içinde rawText (TSV/CSV metin yapıştırma)
      else if (req.body && req.body.rawText) {
        const lines = req.body.rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            error: { code: 'INSUFFICIENT_DATA', message: 'Veri en az 1 başlık ve 1 veri satırı içermelidir.' }
          }));
          return true;
        }
        const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(delim).map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows = lines.slice(1).map(l => l.split(delim).map(c => c.trim().replace(/^["']|["']$/g, '')));
        parsed = { sheetNames: ['Metin Girişi'], activeSheet: 'Metin Girişi', headers, rows };
      }
      // 3. Ham binary buffer (Direct application/octet-stream)
      else if (req.rawBuffer && req.rawBuffer.length > 0) {
        parsed = importService.parseWorkbookBuffer(req.rawBuffer);
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: { code: 'NO_INPUT', message: 'Lütfen bir Excel (.xlsx / .xlsm) dosyası yükleyin veya TSV/CSV metni yapıştırın.' }
        }));
        return true;
      }

      // Doğrulama ve önizleme oluştur
      const previewResult = await importService.validateAndPreviewImport(parsed);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: previewResult
      }));
      return true;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'IMPORT_PARSE_ERROR', message: err.message }
      }));
      return true;
    }
  }

  // POST /api/definitions/import/commit -> Onaylanan satırları DB'ye kaydet
  if (req.method === 'POST' && pathname === '/api/definitions/import/commit') {
    if (!req.user || !req.user.permissions?.canImportExcel) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'YETKISIZ_ISLEM', message: 'Excel içe aktarma yetkisi gereklidir.' }
      }));
      return true;
    }

    const { rows, policy, allowPartial } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'NO_ROWS', message: 'Aktarılacak satır bulunamadı.' }
      }));
      return true;
    }

    try {
      const commitResult = await importService.commitImport(rows, policy || 'all', req.user, !!allowPartial);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: commitResult
      }));
      return true;
    } catch (err) {
      const status = err.code === 'ATOMIC_IMPORT_REJECTED' ? 400 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: {
          code: err.code || 'IMPORT_COMMIT_ERROR',
          message: err.message,
          invalidCount: err.invalidCount
        }
      }));
      return true;
    }
  }

  return false;
}

module.exports = { handleImportRoutes };
