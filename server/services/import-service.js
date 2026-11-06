const XLSX = require('xlsx');
const { query, withTransaction } = require('../db');

// Standart kolon isim varyasyonları (Türkçe karakter transliterasyonu uygulanmış ASCII anahtarlar)
const COLUMN_ALIASES = {
  stock_code: ['stok kodu', 'stok_kodu', 'stock code', 'malzeme kodu', 'stok no'],
  stock_name: ['stok ismi', 'stok adi', 'stok_adi', 'stock name', 'tanim', 'aciklama'],
  raw_sheet: ['ham levha kodu', 'ham levha', 'ham_levha', 'raw sheet', 'levha kodu', 'levha'],
  tube_size: ['boy ve cap', 'ebat', 'tube size', 'cap x boy', 'cap ve boy', 'olcu'],
  print_surface: ['baski yuzeyi', 'zemin', 'yuzey', 'print surface', 'surface'],
  varnish: ['vernik', 'varnish'],
  lacquer: ['lak', 'lacquer'],
  inside_coating: ['ic kaplama', 'ic lak', 'inside coating', 'coating'],
  special_parameter: ['parametre 1', 'ozel parametre', 'parametre', 'notlar', 'revizyon'],
};

function normalizeHeader(h) {
  if (!h) return '';
  return String(h).trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ');
}

function detectColumnMapping(headers) {
  const mapping = {};

  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(a => norm === a || (norm.includes(a) && (key !== 'stock_code' || !norm.includes('levha'))))) {
        if (mapping[key] === undefined) {
          mapping[key] = idx;
        }
      }
    }
    // Renk kolonları (Renk 1, Renk 2, Color 1 vb.)
    if (norm.includes('renk') || norm.includes('color')) {
      if (!mapping.colors) mapping.colors = [];
      mapping.colors.push(idx);
    }
  });

  return mapping;
}

function parseWorkbookBuffer(buffer) {
  // read with cellText to prevent leading zero dropping
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellText: true, cellDates: true });
  const sheetNames = wb.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Excel dosyasında okunabilir çalışma sayfası (Sheet) bulunamadı.');
  }

  // İlk sayfayı oku
  const ws = wb.Sheets[sheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  if (rawRows.length < 2) {
    throw new Error('Excel dosyası en az 1 başlık ve 1 veri satırı içermelidir.');
  }

  const headers = rawRows[0].map(h => String(h || '').trim());
  const rows = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Boş satırları atla
    if (row.some(cell => String(cell).trim().length > 0)) {
      rows.push(row.map(cell => String(cell || '').trim()));
    }
  }

  return { sheetNames, activeSheet: sheetNames[0], headers, rows };
}

async function validateAndPreviewImport(parsedData) {
  const { headers, rows } = parsedData;
  const mapping = detectColumnMapping(headers);

  // Sistem referans tablolarını çek
  const [catalogRes, rawSheetsRes, dictsRes, existingProdRes] = await Promise.all([
    query('SELECT stock_code, stock_name, tube_size FROM erp_stock_catalog'),
    query('SELECT stock_code, stock_name, tube_size, width_mm, height_mm FROM raw_sheets'),
    query('SELECT category, code, label, is_default FROM dictionaries WHERE is_active = TRUE'),
    query('SELECT stock_code, version FROM product_technicals'),
  ]);

  const catalogMap = new Map(catalogRes.rows.map(c => [c.stock_code, c]));
  const rawSheetList = rawSheetsRes.rows;
  const existingProdMap = new Map(existingProdRes.rows.map(p => [p.stock_code, p]));

  // Sözlük geçerlilik kümeleri
  const validSurfaces = new Set(dictsRes.rows.filter(d => d.category === 'print_surface').map(d => d.code));
  const validLacquers = new Set(dictsRes.rows.filter(d => d.category === 'lacquer').map(d => d.code));
  const validCoatings = new Set(dictsRes.rows.filter(d => d.category === 'inside_coating').map(d => d.code));

  const processedRows = [];
  const errors = [];
  const seenStockCodes = new Set();
  let insertCount = 0;
  let updateCount = 0;

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 2; // Excel 1-based, başlık satırı 1
    const rowErrors = [];

    // 1. Stok Kodu Denetimi (Zorunlu)
    const rawStockCode = mapping.stock_code !== undefined ? String(row[mapping.stock_code] || '').trim() : '';
    let stockCode = rawStockCode;

    if (!stockCode) {
      rowErrors.push('Stok kodu boş olamaz.');
    } else {
      if (seenStockCodes.has(stockCode)) {
        rowErrors.push(`Dosya içinde mükerrer stok kodu: '${stockCode}'.`);
      }
      seenStockCodes.add(stockCode);
    }

    // 2. Stok İsmi (ERP Katalog Önceliği)
    let stockName = mapping.stock_name !== undefined ? String(row[mapping.stock_name] || '').trim() : '';
    let catalogVerified = false;

    if (stockCode && catalogMap.has(stockCode)) {
      const catItem = catalogMap.get(stockCode);
      stockName = catItem.stock_name; // ERP stok adı korunur, ezilmez
      catalogVerified = true;
    } else if (!stockName) {
      stockName = 'Taslak Ürün - ERP Eşleşmesi Bekliyor';
    }

    // 3. Ebat / Ölçü Denetimi
    const rawSize = mapping.tube_size !== undefined ? String(row[mapping.tube_size] || '').trim() : '';
    let tubeSize = rawSize || '52x195';
    if (!/^\d{2}x\d{2,3}$/.test(tubeSize)) {
      rowErrors.push(`Geçersiz ebat biçimi: '${tubeSize}'. Beklenen biçim: 52x195, 65x300 vb.`);
    }

    // 4. Onaylı Ham Levha Açık Eşleme (Kabul Kuralı)
    const rawSheetInput = mapping.raw_sheet !== undefined ? String(row[mapping.raw_sheet] || '').trim() : '';
    let resolvedSheetCode = null;
    let resolvedSheetName = null;

    if (rawSheetInput) {
      // 4a. Tam stok kodu eşleşmesi
      const exactCodeMatch = rawSheetList.find(s => s.stock_code === rawSheetInput);
      if (exactCodeMatch) {
        resolvedSheetCode = exactCodeMatch.stock_code;
        resolvedSheetName = exactCodeMatch.stock_name;
      } else {
        // 4b. Açıklama metni veya ada göre eşleme
        const nameCandidates = rawSheetList.filter(s =>
          s.stock_name.toLowerCase().includes(rawSheetInput.toLowerCase()) ||
          rawSheetInput.toLowerCase().includes(s.stock_name.toLowerCase())
        );

        if (nameCandidates.length === 1) {
          resolvedSheetCode = nameCandidates[0].stock_code;
          resolvedSheetName = nameCandidates[0].stock_name;
        } else if (nameCandidates.length > 1) {
          // Ebat ile daralt
          const sizeFiltered = nameCandidates.filter(c => c.tube_size === tubeSize);
          if (sizeFiltered.length === 1) {
            resolvedSheetCode = sizeFiltered[0].stock_code;
            resolvedSheetName = sizeFiltered[0].stock_name;
          } else {
            rowErrors.push(`Ham levha açıklaması belirsiz (birden çok aday var): '${rawSheetInput}'.`);
          }
        } else {
          // Ebat üzerinden adayı dene
          const sizeMatch = rawSheetList.find(s => s.tube_size === tubeSize);
          if (sizeMatch) {
            resolvedSheetCode = sizeMatch.stock_code;
            resolvedSheetName = sizeMatch.stock_name;
          } else {
            rowErrors.push(`Ham levha eşleşmesi bulunamadı: '${rawSheetInput}'.`);
          }
        }
      }
    } else {
      // Ebat üzerinden varsayılan ham levha ata
      const sizeMatch = rawSheetList.find(s => s.tube_size === tubeSize);
      if (sizeMatch) {
        resolvedSheetCode = sizeMatch.stock_code;
        resolvedSheetName = sizeMatch.stock_name;
      } else {
        rowErrors.push(`Ham levha belirtilmedi ve '${tubeSize}' ebadına uygun levha bulunamadı.`);
      }
    }

    // 5. Baskı Yüzeyi / Zemin
    const rawPrintSurface = mapping.print_surface !== undefined ? String(row[mapping.print_surface] || '').trim().toUpperCase() : 'EMAYE';
    if (rawPrintSurface && !validSurfaces.has(rawPrintSurface)) {
      rowErrors.push(`Tanımsız baskı yüzeyi / zemin: '${rawPrintSurface}'. Geçerli değerler: ${Array.from(validSurfaces).join(', ')}.`);
    }

    // 6. Vernik
    const rawVarnish = mapping.varnish !== undefined ? String(row[mapping.varnish] || '').trim().toUpperCase() : 'BELİRTİLMEMİŞ';

    // 7. Lak
    const rawLacquer = mapping.lacquer !== undefined ? String(row[mapping.lacquer] || '').trim().toUpperCase() : 'BILINMIYOR';
    if (rawLacquer && !validLacquers.has(rawLacquer)) {
      rowErrors.push(`Tanımsız lak değeri: '${rawLacquer}'. Geçerli değerler: ${Array.from(validLacquers).join(', ')}.`);
    }

    // 8. İç Kaplama (İçi GOLD vb.)
    let insideCoating = mapping.inside_coating !== undefined ? String(row[mapping.inside_coating] || '').trim().toUpperCase() : 'BELİRTİLMEMİŞ';
    if (!insideCoating || insideCoating === '') insideCoating = 'BELİRTİLMEMİŞ';

    // 9. Renkler
    const colors = [];
    if (mapping.colors && mapping.colors.length > 0) {
      mapping.colors.forEach((colIdx) => {
        const val = String(row[colIdx] || '').trim().toUpperCase();
        if (val && !colors.includes(val)) {
          colors.push(val);
        }
      });
    }
    if (colors.length === 0) {
      colors.push('C', 'M', 'Y', 'K');
    }
    if (colors.length > 8) {
      rowErrors.push(`En fazla 8 renk tanımlanabilir (Varsayılan sınır 6 renktir). Tanımlanan: ${colors.length}`);
    }

    // 10. Özel Parametre
    const rawParam = mapping.special_parameter !== undefined ? String(row[mapping.special_parameter] || '').trim() : null;

    // Durum: INSERT / UPDATE
    const isExisting = stockCode && existingProdMap.has(stockCode);
    const action = isExisting ? 'UPDATE' : 'INSERT';
    if (rowErrors.length === 0) {
      if (isExisting) updateCount++;
      else insertCount++;
    }

    const item = {
      rowNumber: rowNum,
      stockCode,
      stockName,
      tubeSize,
      rawSheetCode: resolvedSheetCode,
      rawSheetName: resolvedSheetName,
      printSurface: rawPrintSurface.toUpperCase(),
      varnish: rawVarnish.toUpperCase(),
      lacquer: rawLacquer.toUpperCase(),
      insideCoating: insideCoating.toUpperCase(),
      colors,
      specialParameter: rawParam,
      action,
      catalogVerified,
      isValid: rowErrors.length === 0,
      errors: rowErrors,
    };

    processedRows.push(item);
    if (rowErrors.length > 0) {
      errors.push({ rowNumber: rowNum, stockCode: stockCode || '(boş)', messages: rowErrors });
    }
  }

  const validRowsCount = processedRows.filter(r => r.isValid).length;
  const errorRowsCount = errors.length;

  return {
    total: rows.length,
    newCount: insertCount,
    updateCount: updateCount,
    errorCount: errorRowsCount,
    totalRows: rows.length,
    validRows: validRowsCount,
    errorRows: errorRowsCount,
    insertCount,
    updateCount,
    mapping,
    errors,
    previewItems: processedRows.slice(0, 100),
    allProcessedRows: processedRows,
    rows: processedRows.map(r => ({
      status: r.isValid ? (r.action === 'INSERT' ? 'NEW' : 'UPDATE') : 'ERROR',
      error_message: r.errors.join('; '),
      is_catalog_match: r.catalogVerified,
      isValid: r.isValid,
      action: r.action,
      stockCode: r.stockCode,
      stockName: r.stockName,
      tubeSize: r.tubeSize,
      rawSheetCode: r.rawSheetCode,
      rawSheetName: r.rawSheetName,
      printSurface: r.printSurface,
      varnish: r.varnish,
      lacquer: r.lacquer,
      insideCoating: r.insideCoating,
      colors: r.colors,
      specialParameter: r.specialParameter,
      catalogVerified: r.catalogVerified,
      item: {
        stock_code: r.stockCode,
        stock_name: r.stockName,
        tube_size: r.tubeSize,
        raw_sheet_code: r.rawSheetCode,
        raw_sheet_desc: r.rawSheetName,
        print_surface: r.printSurface,
        varnish: r.varnish,
        lacquer: r.lacquer,
        inside_coating: r.insideCoating,
        colors: r.colors,
        special_parameter: r.specialParameter,
        catalog_verified: r.catalogVerified,
        is_active: true
      }
    }))
  };
}

async function commitImport(processedRows, policy = 'all', user, allowPartial = false) {
  // policy: 'all' | 'new_only' | 'update_only'
  // Kural: Varsayılan davranış atomik kabuldür (Tüm dosya geçerli olmalıdır).
  // Hatalı satır varsa dosya bütünüyle reddedilir; kısmi aktarım ancak allowPartial === true ise uygulanır.
  const invalidRows = processedRows.filter(r => {
    const isValid = r.isValid !== undefined ? r.isValid : (r.status !== 'ERROR');
    return !isValid;
  });

  if (invalidRows.length > 0 && !allowPartial) {
    const err = new Error(`Dosyada ${invalidRows.length} adet hatalı satır bulunmaktadır. Varsayılan atomik dosya kabulü kuralı gereğince içe aktarma bütünüyle reddedilmiştir. Hatalı satırları dışarıda bırakıp yalnızca geçerli satırları aktarmak için 'Kısmi Aktarım' (allowPartial: true) açıkça onaylanmalıdır.`);
    err.code = 'ATOMIC_IMPORT_REJECTED';
    err.invalidCount = invalidRows.length;
    throw err;
  }

  return await withTransaction(async (client) => {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawItem of processedRows) {
      const isValid = rawItem.isValid !== undefined ? rawItem.isValid : (rawItem.status !== 'ERROR');
      if (!isValid) {
        skipped++;
        continue;
      }

      const item = rawItem.item || rawItem;
      const action = rawItem.action || (rawItem.status === 'NEW' ? 'INSERT' : 'UPDATE');
      const isExisting = action === 'UPDATE';

      if (policy === 'new_only' && isExisting) {
        skipped++;
        continue;
      }

      if (policy === 'update_only' && !isExisting) {
        skipped++;
        continue;
      }

      const stockCode = item.stockCode || item.stock_code;
      const stockName = item.stockName || item.stock_name || 'Taslak Ürün';
      const tubeSize = item.tubeSize || item.tube_size || '52x195';
      const rawSheetCode = item.rawSheetCode || item.raw_sheet_code;
      const printSurface = item.printSurface || item.print_surface || 'EMAYE';
      const varnish = item.varnish || 'BELİRTİLMEMİŞ';
      const lacquer = item.lacquer || 'BILINMIYOR';
      const insideCoating = item.insideCoating || item.inside_coating || 'BELİRTİLMEMİŞ';
      const colors = Array.isArray(item.colors) ? item.colors : ['C', 'M', 'Y', 'K'];
      const specialParameter = item.specialParameter || item.special_parameter || null;
      const catalogVerified = item.catalogVerified !== undefined ? item.catalogVerified : !!item.catalog_verified;

      const parts = tubeSize.split('x');
      const diameter = parseFloat(parts[0]) || 52;
      const height = parseFloat(parts[1]) || 195;
      const id = 'TECH-' + stockCode;

      if (!isExisting) {
        await client.query(
          `INSERT INTO product_technicals (
            id, stock_code, stock_name, tube_size, diameter_mm, height_mm,
            raw_sheet_code, print_surface, varnish, lacquer, inside_coating,
            colors, special_parameter_source, source, record_kind,
            is_active, catalog_verified, version, created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'excel_import', 'excel_imported',
            TRUE, $14, 1, $15, $15
          ) ON CONFLICT (stock_code) DO NOTHING`,
          [
            id, stockCode, stockName, tubeSize, diameter, height,
            rawSheetCode, printSurface, varnish, lacquer, insideCoating,
            colors, specialParameter, catalogVerified, user.username
          ]
        );
        inserted++;
      } else {
        await client.query(
          `UPDATE product_technicals SET
            stock_name = $1,
            tube_size = $2,
            diameter_mm = $3,
            height_mm = $4,
            raw_sheet_code = $5,
            print_surface = $6,
            varnish = $7,
            lacquer = $8,
            inside_coating = $9,
            colors = $10,
            special_parameter_source = $11,
            catalog_verified = $12,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $13
           WHERE stock_code = $14`,
          [
            stockName, tubeSize, diameter, height, rawSheetCode,
            printSurface, varnish, lacquer, insideCoating,
            colors, specialParameter, catalogVerified, user.username,
            stockCode
          ]
        );
        updated++;
      }
    }

    // Denetim izi
    await client.query(
      `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details)
       VALUES ($1, $2, 'excel_import', 'BATCH', 'import', $3)`,
      [
        user.username,
        user.role,
        `Excel içe aktarma tamamlandı: ${inserted} eklendi, ${updated} güncellendi, ${skipped} atlandı (Politika: ${policy})`
      ]
    );

    return {
      success: true,
      appliedCount: inserted + updated,
      inserted,
      updated,
      skipped,
      skippedRows: invalidRows.map(r => ({
        stockCode: r.stockCode || r.stock_code || r.item?.stock_code || '(BOŞ)',
        errors: r.errors || (r.error_message ? [r.error_message] : ['Hatalı satır'])
      })),
      totalProcessed: processedRows.length
    };
  });
}

function generateExcelTemplate() {
  const wsData = [
    [
      'Stok Kodu', 'Stok İsmi', 'Ham Levha kodu', 'Boy ve Çap',
      'Baskı Yüzeyi', 'Vernik', 'Lak', 'İç Kaplama',
      'Renk 1', 'Renk 2', 'Renk 3', 'Renk 4', 'Renk 5', 'Renk 6',
      'Parametre 1'
    ],
    [
      '511109010410-1102', 'TUP-GW MOBILYA 300 ml (52x214)-LEMON',
      'HAM LEVHA-017x832x875- (T 61) -52x214', '52x214',
      'METALİK', 'KISMİ', 'LAKLI', 'BELİRTİLMEMİŞ',
      'C', 'M', 'Y', 'K', '1225C', '',
      'Örnek Kart 1'
    ],
    [
      '511109010910-1001', 'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA',
      'HAM LEVHA-017x832x800- (T 61) -52x195', '52x195',
      'EMAYE', 'BELİRTİLMEMİŞ', 'BELİRTİLMEMİŞ', 'GOLD',
      'C', 'M', 'Y', 'K', '', '',
      'SOFT REV NO:08'
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Kolon genişlikleri
  ws['!cols'] = [
    { wch: 22 }, // Stok Kodu
    { wch: 45 }, // Stok İsmi
    { wch: 45 }, // Ham Levha
    { wch: 12 }, // Ebat
    { wch: 15 }, // Baskı Yüzeyi
    { wch: 15 }, // Vernik
    { wch: 15 }, // Lak
    { wch: 15 }, // İç Kaplama
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 25 }  // Parametre 1
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Teknik_Kartlar');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseWorkbookBuffer,
  validateAndPreviewImport,
  commitImport,
  generateExcelTemplate,
};
