const { query, withTransaction } = require('../db');

async function listProducts(filters = {}) {
  let sql = `
    SELECT 
      p.id,
      p.stock_code,
      p.stock_name,
      p.tube_size,
      p.diameter_mm,
      p.height_mm,
      p.raw_sheet_code,
      r.stock_name AS raw_sheet_name,
      (r.width_mm || 'x' || r.height_mm) AS raw_sheet_dimensions,
      p.print_surface,
      p.varnish,
      p.lacquer,
      p.inside_coating,
      p.colors,
      p.special_parameter_source,
      p.source,
      p.record_kind,
      p.is_active,
      p.catalog_verified,
      p.version,
      p.created_at,
      p.updated_at,
      c.stock_name AS catalog_name,
      c.category AS catalog_category,
      -- Referans sayıları
      COALESCE((SELECT COUNT(*) FROM demands d WHERE d.stock_code = p.stock_code), 0)::INTEGER AS demand_count,
      COALESCE((SELECT COUNT(*) FROM production_plans pl WHERE pl.consumption_code = p.stock_code), 0)::INTEGER AS plan_count
    FROM product_technicals p
    LEFT JOIN raw_sheets r ON p.raw_sheet_code = r.stock_code
    LEFT JOIN erp_stock_catalog c ON p.stock_code = c.stock_code
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.search) {
    sql += ` AND (p.stock_code ILIKE $${paramIndex} OR p.stock_name ILIKE $${paramIndex} OR p.tube_size ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.tubeSize) {
    sql += ` AND p.tube_size = $${paramIndex}`;
    params.push(filters.tubeSize);
    paramIndex++;
  }

  if (filters.printSurface) {
    sql += ` AND p.print_surface = $${paramIndex}`;
    params.push(filters.printSurface);
    paramIndex++;
  }

  if (filters.lacquer) {
    sql += ` AND p.lacquer = $${paramIndex}`;
    params.push(filters.lacquer);
    paramIndex++;
  }

  if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
    sql += ` AND p.is_active = $${paramIndex}`;
    params.push(filters.isActive === true || filters.isActive === 'true');
    paramIndex++;
  }

  sql += ` ORDER BY p.stock_code ASC`;

  if (filters.limit) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(parseInt(filters.limit, 10));
    paramIndex++;
  }

  if (filters.offset) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(parseInt(filters.offset, 10));
    paramIndex++;
  }

  const res = await query(sql, params);
  return res.rows;
}

async function getProductByCode(stockCode) {
  const res = await query(
    `SELECT 
      p.*,
      r.stock_name AS raw_sheet_name,
      c.stock_name AS catalog_name,
      COALESCE((SELECT COUNT(*) FROM demands d WHERE d.stock_code = p.stock_code), 0)::INTEGER AS demand_count,
      COALESCE((SELECT COUNT(*) FROM production_plans pl WHERE pl.consumption_code = p.stock_code), 0)::INTEGER AS plan_count
     FROM product_technicals p
     LEFT JOIN raw_sheets r ON p.raw_sheet_code = r.stock_code
     LEFT JOIN erp_stock_catalog c ON p.stock_code = c.stock_code
     WHERE p.stock_code = $1`,
    [stockCode]
  );
  return res.rows[0] || null;
}

async function validateProductInput(data) {
  const errors = [];

  const stockCode = (data.stock_code || '').trim();
  if (!stockCode) {
    errors.push({ field: 'stock_code', message: 'Stok kodu zorunludur.' });
  }

  const tubeSize = (data.tube_size || '').trim();
  if (!tubeSize) {
    errors.push({ field: 'tube_size', message: 'Ebat (çap x boy) zorunludur.' });
  }

  // Ebat doğrulaması
  if (tubeSize) {
    const capRes = await query('SELECT tube_size, repeat_step FROM tube_capacities WHERE tube_size = $1', [tubeSize]);
    if (capRes.rows.length === 0) {
      errors.push({ field: 'tube_size', message: `'${tubeSize}' ebadı tanımlı 18 hazır kapasite tablosunda bulunamadı.` });
    }
  }

  // Ham levha doğrulaması
  const rawSheetCode = (data.raw_sheet_code || '').trim();
  if (!rawSheetCode) {
    errors.push({ field: 'raw_sheet_code', message: 'Onaylı ham levha seçimi zorunludur.' });
  } else {
    const sheetRes = await query('SELECT stock_code, tube_size FROM raw_sheets WHERE stock_code = $1', [rawSheetCode]);
    if (sheetRes.rows.length === 0) {
      errors.push({ field: 'raw_sheet_code', message: `'${rawSheetCode}' ham levha kodu sistemde kayıtlı değil.` });
    } else if (tubeSize && sheetRes.rows[0].tube_size !== tubeSize) {
      errors.push({
        field: 'raw_sheet_code',
        message: `Ham levha ebadı (${sheetRes.rows[0].tube_size}) ile ürün ebadı (${tubeSize}) uyuşmuyor. Farklı ham levha eşleştirmesi engellenmiştir.`
      });
    }
  }

  // Renk kontrolü
  const colors = Array.isArray(data.colors) ? data.colors.filter(c => typeof c === 'string' && c.trim().length > 0) : [];
  if (colors.length === 0) {
    errors.push({ field: 'colors', message: 'En az bir baskı rengi tanımlanmalıdır.' });
  } else if (new Set(colors).size > 8) {
    errors.push({ field: 'colors', message: 'Bir teknik kartta en fazla 8 renk tanımlanabilir (Varsayılan sınır 6 renktir).' });
  }

  return { isValid: errors.length === 0, errors, cleanData: { stockCode, tubeSize, rawSheetCode, colors } };
}

async function createProduct(data, user) {
  const validation = await validateProductInput(data);
  if (!validation.isValid) {
    const err = new Error('Geçersiz teknik kart bilgileri');
    err.code = 'VALIDATION_ERROR';
    err.details = validation.errors;
    throw err;
  }

  const { stockCode, tubeSize, rawSheetCode, colors } = validation.cleanData;

  // Çap ve boy ayır
  const parts = tubeSize.split('x');
  const diameter = parseFloat(parts[0]) || 52;
  const height = parseFloat(parts[1]) || 195;

  return await withTransaction(async (client) => {
    // 1. Zaten var mı kontrolü
    const existing = await client.query('SELECT stock_code FROM product_technicals WHERE stock_code = $1', [stockCode]);
    if (existing.rows.length > 0) {
      const err = new Error(`'${stockCode}' kodlu teknik kart zaten mevcuttur.`);
      err.code = 'MUKERRER_KAYIT';
      throw err;
    }

    // 2. ERP Kataloğundan ad sorgula
    const catRes = await client.query('SELECT stock_name, category FROM erp_stock_catalog WHERE stock_code = $1', [stockCode]);
    let stockName = '';
    let catalogVerified = false;

    if (catRes.rows.length > 0) {
      stockName = catRes.rows[0].stock_name;
      catalogVerified = true;
    } else {
      stockName = data.stock_name || 'Taslak Ürün - ERP Eşleşmesi Bekliyor';
      catalogVerified = false;
    }

    // SOFT kuralı: SOFT ürünlerde içi GOLD
    let insideCoating = data.inside_coating || 'STANDART';
    if (stockName.includes('SOFT') || (data.special_parameter_source && data.special_parameter_source.includes('SOFT'))) {
      insideCoating = 'GOLD';
    }

    const id = data.id || 'TECH-' + stockCode;
    const printSurface = data.print_surface || 'EMAYE';
    const varnish = data.varnish || 'BELİRTİLMEMİŞ';
    const lacquer = data.lacquer || 'BELİRTİLMEMİŞ';
    const specialParam = data.special_parameter_source || null;
    const source = data.source || 'user_manual';
    const recordKind = data.record_kind || 'manual_entry';

    const insertRes = await client.query(
      `INSERT INTO product_technicals (
        id, stock_code, stock_name, tube_size, diameter_mm, height_mm,
        raw_sheet_code, print_surface, varnish, lacquer, inside_coating,
        colors, special_parameter_source, source, record_kind,
        is_active, catalog_verified, version, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, $16, 1, $17, $17
      ) RETURNING *`,
      [
        id, stockCode, stockName, tubeSize, diameter, height,
        rawSheetCode, printSurface, varnish, lacquer, insideCoating,
        colors, specialParam, source, recordKind,
        catalogVerified, user.username
      ]
    );

    // Denetim izi
    await client.query(
      `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details, new_value)
       VALUES ($1, $2, 'product_technical', $3, 'create', $4, $5)`,
      [
        user.username,
        user.role,
        stockCode,
        `Yeni teknik kart oluşturuldu: ${stockCode} - ${stockName} (${tubeSize})`,
        JSON.stringify(insertRes.rows[0])
      ]
    );

    return insertRes.rows[0];
  });
}

async function updateProduct(stockCode, data, user) {
  const existing = await getProductByCode(stockCode);
  if (!existing) {
    const err = new Error(`'${stockCode}' kodlu teknik kart bulunamadı.`);
    err.code = 'BULUNAMADI';
    throw err;
  }

  // Eşzamanlı düzenleme kontrolü (Optimistic Locking)
  if (data.version !== undefined && data.version !== null && parseInt(data.version, 10) !== existing.version) {
    const err = new Error('Bu kayıt başka bir kullanıcı veya oturum tarafından güncellenmiştir. Lütfen sayfayı yenileyip tekrar deneyin.');
    err.code = 'ESZAMANLI_DUZENLEME_CAKISMASI';
    err.currentVersion = existing.version;
    throw err;
  }

  const validation = await validateProductInput({ ...data, stock_code: stockCode });
  if (!validation.isValid) {
    const err = new Error('Geçersiz güncelleme bilgileri');
    err.code = 'VALIDATION_ERROR';
    err.details = validation.errors;
    throw err;
  }

  const { tubeSize, rawSheetCode, colors } = validation.cleanData;
  const parts = tubeSize.split('x');
  const diameter = parseFloat(parts[0]) || 52;
  const height = parseFloat(parts[1]) || 195;

  return await withTransaction(async (client) => {
    // ERP kataloğundan ad güncellemesi (varsa katalog adını koru)
    const catRes = await client.query('SELECT stock_name FROM erp_stock_catalog WHERE stock_code = $1', [stockCode]);
    let stockName = existing.stock_name;
    let catalogVerified = existing.catalog_verified;
    if (catRes.rows.length > 0) {
      stockName = catRes.rows[0].stock_name;
      catalogVerified = true;
    }

    let insideCoating = data.inside_coating || existing.inside_coating;
    if (stockName.includes('SOFT') || (data.special_parameter_source && data.special_parameter_source.includes('SOFT'))) {
      insideCoating = 'GOLD';
    }

    const printSurface = data.print_surface || existing.print_surface;
    const varnish = data.varnish || existing.varnish;
    const lacquer = data.lacquer || existing.lacquer;
    const specialParam = data.special_parameter_source !== undefined ? data.special_parameter_source : existing.special_parameter_source;

    const updateRes = await client.query(
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
       WHERE stock_code = $14 AND version = $15
       RETURNING *`,
      [
        stockName, tubeSize, diameter, height, rawSheetCode,
        printSurface, varnish, lacquer, insideCoating, colors,
        specialParam, catalogVerified, user.username,
        stockCode, existing.version
      ]
    );

    if (updateRes.rows.length === 0) {
      const err = new Error('Eşzamanlı düzenleme çakışması: Kayıt güncellenirken değişti.');
      err.code = 'ESZAMANLI_DUZENLEME_CAKISMASI';
      throw err;
    }

    // Denetim izi
    await client.query(
      `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details, previous_value, new_value)
       VALUES ($1, $2, 'product_technical', $3, 'update', $4, $5, $6)`,
      [
        user.username,
        user.role,
        stockCode,
        `Teknik kart güncellendi: ${stockCode} (${tubeSize}, ${printSurface}, ${lacquer})`,
        JSON.stringify(existing),
        JSON.stringify(updateRes.rows[0])
      ]
    );

    return updateRes.rows[0];
  });
}

async function toggleActive(stockCode, user) {
  const existing = await getProductByCode(stockCode);
  if (!existing) {
    const err = new Error(`'${stockCode}' kodlu teknik kart bulunamadı.`);
    err.code = 'BULUNAMADI';
    throw err;
  }

  const newStatus = !existing.is_active;

  const res = await query(
    `UPDATE product_technicals SET
      is_active = $1,
      version = version + 1,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = $2
     WHERE stock_code = $3
     RETURNING *`,
    [newStatus, user.username, stockCode]
  );

  await query(
    `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details)
     VALUES ($1, $2, 'product_technical', $3, 'toggle_active', $4)`,
    [
      user.username,
      user.role,
      stockCode,
      `Kart durumu değiştirildi: ${newStatus ? 'Aktifleştirildi' : 'Pasife Alındı'}`
    ]
  );

  return res.rows[0];
}

async function deleteProduct(stockCode, user) {
  const existing = await getProductByCode(stockCode);
  if (!existing) {
    const err = new Error(`'${stockCode}' kodlu teknik kart bulunamadı.`);
    err.code = 'BULUNAMADI';
    throw err;
  }

  // REFERANS BÜTÜNLÜĞÜ DENETİMİ
  const demandCount = existing.demand_count || 0;
  const planCount = existing.plan_count || 0;
  const totalRefs = demandCount + planCount;

  if (totalRefs > 0) {
    const err = new Error(
      `Referans Bütünlüğü Koruması: Bu teknik kart sistemde aktif olarak kullanılmaktadır (${totalRefs} referans: ${demandCount} talep, ${planCount} üretim planı). Fiziksel olarak silinemez; geçmiş ve mevcut planların bozulmaması için lütfen 'Pasife Al' seçeneğini kullanın.`
    );
    err.code = 'REFERANS_BUTUNLUGU_ENGELI';
    err.references = { demandCount, planCount, totalRefs };
    throw err;
  }

  return await withTransaction(async (client) => {
    await client.query('DELETE FROM product_technicals WHERE stock_code = $1', [stockCode]);

    await client.query(
      `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details, previous_value)
       VALUES ($1, $2, 'product_technical', $3, 'delete', $4, $5)`,
      [
        user.username,
        user.role,
        stockCode,
        `Teknik kart fiziksel olarak silindi: ${stockCode} - ${existing.stock_name}`,
        JSON.stringify(existing)
      ]
    );

    return { success: true, deletedStockCode: stockCode };
  });
}

module.exports = {
  listProducts,
  getProductByCode,
  createProduct,
  updateProduct,
  toggleActive,
  deleteProduct,
};
