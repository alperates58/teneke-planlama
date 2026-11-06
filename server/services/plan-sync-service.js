// ES2024 Promise.withResolvers polyfill for Node.js 20 compatibility
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const crypto = require('crypto');
const { Connection, Request } = require('tedious');
const config = require('../config');
const { query, withTransaction } = require('../db');

/**
 * SQL Server'a salt-okunur bağlanarak sorgu çalıştırır
 */
function executeSqlReadOnly(sqlText, targetDb = null) {
  return new Promise((resolve, reject) => {
    const erp = config.ERP_SQL || {};
    const dbName = targetDb || erp.database || 'AA_LIDER';

    const connConfig = {
      server: erp.host || 'host.docker.internal',
      authentication: {
        type: 'default',
        options: {
          userName: erp.user || 'planlama',
          password: erp.password || ''
        }
      },
      options: {
        port: erp.port || 11433,
        database: dbName,
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: erp.connectTimeout || 8000,
        requestTimeout: 20000,
        rowCollectionOnRequestCompletion: true
      }
    };

    const connection = new Connection(connConfig);

    connection.on('connect', (err) => {
      if (err) {
        connection.close();
        return reject(new Error(`SQL Server bağlantı hatası (${connConfig.server}:${connConfig.options.port}/${dbName}): ${err.message}`));
      }

      const rows = [];
      const sqlReq = new Request(sqlText, (queryErr, rowCount) => {
        connection.close();
        if (queryErr) {
          return reject(new Error(`SQL Sorgu hatası: ${queryErr.message}`));
        }
        resolve(rows);
      });

      sqlReq.on('row', (columns) => {
        const rowObj = {};
        columns.forEach((col) => {
          rowObj[col.metadata.colName] = col.value;
        });
        rows.push(rowObj);
      });

      connection.execSql(sqlReq);
    });

    connection.on('error', () => {
      // Beklenmeyen soket kopmaları
    });

    try {
      connection.connect();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 1. Kaynak SQL Planını Önizle (Preview) - DB'ye hiçbir şey yazmaz
 * Esas Kaynak: MikroDesktop_LIDER26.dbo.alper_tenekeuretim (Parametrik)
 */
async function fetchSourcePlanPreview() {
  const sourceTable = config.ERP_SQL?.planSourceTable || 'MikroDesktop_LIDER26.dbo.alper_tenekeuretim';

  // Parametrik tablodan tüm kolonları oku
  // Sıralama makine çizelgelemesini temsil eden Başlangıç Tarih ve Bitiş Tarih'e göredir
  const sql = `
    SELECT
      ISNULL(STOKKODU, '') AS STOKKODU,
      ISNULL(STOKISMI, '') AS STOKISMI,
      ISNULL(ADET, 0) AS ADET,
      [Başlangıç Tarih] AS baslangic_tarih,
      [Bitiş Tarih] AS bitis_tarih,
      [Üretim Tarihi] AS uretim_tarihi,
      [Plana Eklenen Tarih] AS plana_eklenen_tarih,
      ISNULL([Çap ve Boy], '') AS cap_boy,
      ISNULL([İş Kod], '') AS is_kod,
      ISNULL([Seri], '') AS seri,
      ISNULL([Kısa Kod], '') AS kisa_kod,
      ISNULL([Ürün Kodu], '') AS urun_kodu,
      ISNULL([Ürün Adı], '') AS urun_adi,
      ISNULL([Kalan], 0) AS kalan,
      ISNULL([Kesik Stok], 0) AS kesik_stok,
      ISNULL([Baskılı Stok], 0) AS baskili_stok,
      ISNULL([Baskı Talep], 0) AS baski_talep,
      ISNULL([Açıklama], '') AS aciklama
    FROM ${sourceTable}
    ORDER BY [Başlangıç Tarih] ASC, [Bitiş Tarih] ASC;
  `;

  const sourceRows = await executeSqlReadOnly(sql);

  if (!sourceRows || sourceRows.length === 0) {
    throw new Error(`Kaynak SQL Server ${sourceTable} tablosunda kayıt bulunamadı.`);
  }

  // Satırları işle, aynı satırdan miktar ve tarihleri al (kesinlikle çapraz tablo join'i veya stok eşlemesi yok)
  const items = [];
  const hasher = crypto.createHash('sha256');
  const seenStocks = new Set();
  let duplicateStockOccurrences = 0;

  let minStart = null, maxStart = null;
  let minEnd = null, maxEnd = null;
  let minProd = null, maxProd = null;

  sourceRows.forEach((r, idx) => {
    const sourceRowOrder = idx + 1;
    const stockCode = String(r.STOKKODU || '').trim();
    const stockName = String(r.STOKISMI || r.urun_adi || '').trim();
    const quantity = parseFloat(r.ADET) || 0;
    const orderNo = String(r.is_kod || '').trim();
    const tubeSize = String(r.cap_boy || '').trim();
    const series = String(r.seri || '').trim();
    const notes = String(r.aciklama || '').trim();

    const startDate = r.baslangic_tarih ? new Date(r.baslangic_tarih).toISOString() : null;
    const endDate = r.bitis_tarih ? new Date(r.bitis_tarih).toISOString() : null;
    const scheduledDate = r.uretim_tarihi ? new Date(r.uretim_tarihi).toISOString() : null;

    if (startDate) {
      const d = new Date(startDate);
      if (!minStart || d < minStart) minStart = d;
      if (!maxStart || d > maxStart) maxStart = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!minEnd || d < minEnd) minEnd = d;
      if (!maxEnd || d > maxEnd) maxEnd = d;
    }
    if (scheduledDate) {
      const d = new Date(scheduledDate);
      if (!minProd || d < minProd) minProd = d;
      if (!maxProd || d > maxProd) maxProd = d;
    }

    if (seenStocks.has(stockCode)) {
      duplicateStockOccurrences++;
    }
    seenStocks.add(stockCode);

    // Deterministik SHA256 için kanonik satır dizisi
    const rowCanonicalStr = `${sourceRowOrder}:${stockCode}:${quantity.toFixed(2)}:${startDate || ''}:${endDate || ''}`;
    hasher.update(rowCanonicalStr);

    items.push({
      source_row_order: sourceRowOrder,
      order_no: orderNo,
      stock_code: stockCode,
      stock_name: stockName,
      quantity: quantity,
      tube_size: tubeSize,
      series: series,
      start_date: startDate,
      end_date: endDate,
      scheduled_date: scheduledDate,
      notes: notes,
      extra_data: {
        kalan: parseFloat(r.kalan) || 0,
        kesik_stok: parseFloat(r.kesik_stok) || 0,
        baskili_stok: parseFloat(r.baskili_stok) || 0,
        baski_talep: parseFloat(r.baski_talep) || 0,
        kisa_kod: r.kisa_kod,
        plana_eklenen_tarih: r.plana_eklenen_tarih ? new Date(r.plana_eklenen_tarih).toISOString() : null
      }
    });
  });

  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
  const checksum = hasher.digest('hex');

  // Sıra Kanıtı ve Belirsizlik Analizi
  const sequenceAnalysis = {
    has_explicit_sequence_column: false,
    source_identity_column: null,
    total_rows: items.length,
    distinct_stock_count: seenStocks.size,
    duplicate_stock_occurrences: duplicateStockOccurrences,
    ordering_basis: 'chronological_schedule',
    order_by_expression: '[Başlangıç Tarih] ASC, [Bitiş Tarih] ASC',
    date_range: {
      start_min: minStart ? minStart.toISOString() : null,
      start_max: maxStart ? maxStart.toISOString() : null,
      end_min: minEnd ? minEnd.toISOString() : null,
      end_max: maxEnd ? maxEnd.toISOString() : null,
      prod_min: minProd ? minProd.toISOString() : null,
      prod_max: maxProd ? maxProd.toISOString() : null
    },
    is_sequence_guaranteed: false,
    description: `Kaynak ${sourceTable} tablosunda otomatik artan kimlik (IDENTITY) veya açık sıra kolonu bulunmamaktadır. Ancak tabloda yer alan [Başlangıç Tarih] ve [Bitiş Tarih] alanları makine üzerindeki üretim çizelgesini kronolojik olarak temsil etmektedir. Sıralama [Başlangıç Tarih] ve [Bitiş Tarih] akışına göre önerilmiş olup (${items.length} satır), SQL fiziksel okuma sırası kesin sıra sayılmamıştır. Kullanıcı bu sırayı arayüzdeki ▲ / ▼ butonlarıyla serbestçe değiştirebilir.`
  };

  // Eski snapshot ile karşılaştırma (varsa)
  let previousComparison = null;
  try {
    const prevSnapRes = await query(
      'SELECT id, source_table, source_db, fetched_at, row_count, total_quantity, checksum FROM production_plan_snapshots ORDER BY fetched_at DESC LIMIT 1'
    );
    if (prevSnapRes.rows.length > 0) {
      const prev = prevSnapRes.rows[0];
      previousComparison = {
        previous_snapshot_id: prev.id,
        previous_source_table: prev.source_table,
        previous_row_count: prev.row_count,
        previous_total_quantity: parseFloat(prev.total_quantity),
        current_source_table: sourceTable,
        current_row_count: items.length,
        current_total_quantity: totalQuantity,
        row_count_diff: items.length - prev.row_count,
        total_quantity_diff: totalQuantity - parseFloat(prev.total_quantity),
        is_source_changed: prev.source_table !== sourceTable,
        notes: prev.source_table !== sourceTable
          ? `Kaynak değişimi: ${prev.source_table} (${prev.row_count} satır) -> ${sourceTable} (${items.length} satır)`
          : 'Aynı kaynak tablodan yeni okuma'
      };
    }
  } catch (e) {
    // Karşılaştırma hatası preview'ı engellemez
  }

  return {
    source_table: sourceTable,
    source_host: `${config.ERP_SQL?.host || 'host.docker.internal'}:${config.ERP_SQL?.port || 11433}`,
    source_db: config.ERP_SQL?.database || 'AA_LIDER',
    fetched_at: new Date().toISOString(),
    row_count: items.length,
    distinct_stocks: seenStocks.size,
    duplicate_stock_count: duplicateStockOccurrences,
    total_quantity: totalQuantity,
    checksum: checksum,
    sequence_analysis: sequenceAnalysis,
    previous_comparison: previousComparison,
    items: items
  };
}

/**
 * 2. Kaynak Planı PostgreSQL'e Değişmez Snapshot Olarak Kaydet
 */
async function commitSourcePlanSnapshot({ user, notes = '', createOrUpdateDraft = true, forceOverwrite = false }) {
  // Canlı kaynaktan salt-okunur preview al
  const preview = await fetchSourcePlanPreview();

  return await withTransaction(async (client) => {
    // Aynı checksum'a sahip snapshot var mı kontrol et
    const existingSnapRes = await client.query(
      'SELECT id, fetched_at, checksum, row_count, total_quantity FROM production_plan_snapshots WHERE checksum = $1 ORDER BY fetched_at DESC LIMIT 1',
      [preview.checksum]
    );

    const isDuplicate = existingSnapRes.rows.length > 0;
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const snapId = `SNAP-${dateStr}-${crypto.randomBytes(3).toString('hex')}`;

    // Snapshot başlığını ekle
    await client.query(
      `INSERT INTO production_plan_snapshots (
        id, source_table, source_host, source_db, fetched_at,
        row_count, total_quantity, checksum, status, notes, created_by, raw_payload
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, 'ACTIVE', $8, $9, $10)`,
      [
        snapId,
        preview.source_table,
        preview.source_host,
        preview.source_db,
        preview.row_count,
        preview.total_quantity,
        preview.checksum,
        notes || (isDuplicate ? 'Tekrarlanan senkronizasyon (Aynı veri)' : `Kaynak SQL Server ${preview.source_table} plan alımı`),
        user ? user.username : 'system',
        JSON.stringify({
          sequence_analysis: preview.sequence_analysis,
          previous_comparison: preview.previous_comparison
        })
      ]
    );

    // Snapshot satırlarını ekle
    for (const item of preview.items) {
      await client.query(
        `INSERT INTO production_plan_snapshot_items (
          snapshot_id, source_row_order, order_no, stock_code, stock_name,
          quantity, tube_size, scheduled_date, start_date, end_date, series, extra_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          snapId,
          item.source_row_order,
          item.order_no,
          item.stock_code,
          item.stock_name,
          item.quantity,
          item.tube_size,
          item.scheduled_date,
          item.start_date,
          item.end_date,
          item.series,
          JSON.stringify(item.extra_data)
        ]
      );
    }

    // Taslak (Draft) Yönetimi
    let draftResult = null;
    if (createOrUpdateDraft) {
      const defaultDraftId = 'DRAFT-DEFAULT';
      const existingDraftRes = await client.query(
        'SELECT id, version, is_dirty FROM production_plan_drafts WHERE id = $1',
        [defaultDraftId]
      );

      if (existingDraftRes.rows.length > 0) {
        const currentDraft = existingDraftRes.rows[0];
        // Eğer kullanıcı taslak üzerinde değişiklik yapmışsa ve forceOverwrite istenmemişse ezme!
        if (currentDraft.is_dirty && !forceOverwrite) {
          draftResult = {
            draft_id: defaultDraftId,
            preserved: true,
            message: 'Mevcut kullanıcı taslağında kaydedilmemiş değişiklikler olduğu için taslak ezilmedi. Yeni snapshot bağımsız olarak arşivlendi.'
          };
        } else {
          // Taslağı yeni snapshot ile güncelle
          await client.query('DELETE FROM production_plan_draft_items WHERE draft_id = $1', [defaultDraftId]);
          await client.query(
            `UPDATE production_plan_drafts SET
              snapshot_id = $1,
              version = version + 1,
              total_items = $2,
              total_quantity = $3,
              is_dirty = FALSE,
              updated_at = CURRENT_TIMESTAMP,
              updated_by = $4
             WHERE id = $5`,
            [snapId, preview.row_count, preview.total_quantity, user ? user.username : 'system', defaultDraftId]
          );

          for (const item of preview.items) {
            await client.query(
              `INSERT INTO production_plan_draft_items (
                draft_id, sequence_order, stock_code, stock_name, quantity,
                order_no, tube_size, scheduled_date, start_date, end_date, series, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                defaultDraftId,
                item.source_row_order,
                item.stock_code,
                item.stock_name,
                item.quantity,
                item.order_no,
                item.tube_size,
                item.scheduled_date,
                item.start_date,
                item.end_date,
                item.series,
                item.notes
              ]
            );
          }

          draftResult = {
            draft_id: defaultDraftId,
            updated: true,
            version: currentDraft.version + 1,
            total_items: preview.row_count,
            total_quantity: preview.total_quantity
          };
        }
      } else {
        // Yeni taslak oluştur
        await client.query(
          `INSERT INTO production_plan_drafts (
            id, name, snapshot_id, version, status, total_items, total_quantity, is_dirty, updated_by
          ) VALUES ($1, $2, $3, 1, 'DRAFT', $4, $5, FALSE, $6)`,
          [
            defaultDraftId,
            'Varsayılan Üretim Planı Taslağı',
            snapId,
            preview.row_count,
            preview.total_quantity,
            user ? user.username : 'system'
          ]
        );

        for (const item of preview.items) {
          await client.query(
            `INSERT INTO production_plan_draft_items (
              draft_id, sequence_order, stock_code, stock_name, quantity,
              order_no, tube_size, scheduled_date, start_date, end_date, series, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              defaultDraftId,
              item.source_row_order,
              item.stock_code,
              item.stock_name,
              item.quantity,
              item.order_no,
              item.tube_size,
              item.scheduled_date,
              item.start_date,
              item.end_date,
              item.series,
              item.notes
            ]
          );
        }

        draftResult = {
          draft_id: defaultDraftId,
          created: true,
          version: 1,
          total_items: preview.row_count,
          total_quantity: preview.total_quantity
        };
      }
    }

    // Denetim İzi
    await client.query(
      `INSERT INTO audit_logs (user_name, user_role, entity_type, entity_id, action, details)
       VALUES ($1, $2, 'plan_snapshot', $3, 'import_snapshot', $4)`,
      [
        user ? user.username : 'system',
        user ? user.role : 'system',
        snapId,
        `Mevcut SQL planı snapshot alındı: ${preview.row_count} satır (${preview.source_table}), ${preview.total_quantity.toLocaleString('tr-TR')} adet tüp (Checksum: ${preview.checksum.slice(0, 12)}...)`
      ]
    );

    return {
      success: true,
      snapshot: {
        id: snapId,
        source_table: preview.source_table,
        row_count: preview.row_count,
        distinct_stocks: preview.distinct_stocks,
        total_quantity: preview.total_quantity,
        checksum: preview.checksum,
        is_duplicate_of_previous: isDuplicate,
        fetched_at: now.toISOString(),
        previous_comparison: preview.previous_comparison
      },
      draft: draftResult
    };
  });
}

/**
 * 3. Aktif Taslağı ve Satırlarını Getir
 */
async function getActiveDraft(draftId = 'DRAFT-DEFAULT') {
  const draftRes = await query(
    'SELECT * FROM production_plan_drafts WHERE id = $1',
    [draftId]
  );

  if (draftRes.rows.length === 0) {
    return { exists: false, draft: null, items: [] };
  }

  const draft = draftRes.rows[0];
  const itemsRes = await query(
    `SELECT
      id, sequence_order, stock_code, stock_name, quantity,
      order_no, tube_size, series, scheduled_date, start_date, end_date,
      status, is_locked, notes
     FROM production_plan_draft_items
     WHERE draft_id = $1
     ORDER BY sequence_order ASC`,
    [draftId]
  );

  return {
    exists: true,
    draft,
    items: itemsRes.rows
  };
}

/**
 * 4. Taslak Sırasını Güncelle (Kullanıcı Sıra Düzenlemesi)
 */
async function updateDraftItemsOrder(draftId, orderedItemIds, user) {
  return await withTransaction(async (client) => {
    const draftRes = await client.query(
      'SELECT id, version FROM production_plan_drafts WHERE id = $1 FOR UPDATE',
      [draftId]
    );

    if (draftRes.rows.length === 0) {
      throw new Error(`Taslak bulunamadı: ${draftId}`);
    }

    for (let i = 0; i < orderedItemIds.length; i++) {
      const itemId = orderedItemIds[i];
      const newOrder = i + 1;
      await client.query(
        'UPDATE production_plan_draft_items SET sequence_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND draft_id = $3',
        [newOrder, itemId, draftId]
      );
    }

    const updatedDraft = await client.query(
      `UPDATE production_plan_drafts SET
        version = version + 1,
        is_dirty = TRUE,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [user ? user.username : 'system', draftId]
    );

    return {
      success: true,
      draft: updatedDraft.rows[0]
    };
  });
}

/**
 * 5. Snapshot Geçmişini Listele
 */
async function getSnapshotsList() {
  const res = await query(
    `SELECT
      id, source_table, source_host, source_db, fetched_at,
      row_count, total_quantity, checksum, status, notes, created_by
     FROM production_plan_snapshots
     ORDER BY fetched_at DESC`
  );
  return res.rows;
}

/**
 * 6. Belirli bir Snapshot'ın Detaylarını Getir
 */
async function getSnapshotDetails(snapshotId) {
  const snapRes = await query(
    'SELECT * FROM production_plan_snapshots WHERE id = $1',
    [snapshotId]
  );

  if (snapRes.rows.length === 0) {
    return null;
  }

  const itemsRes = await query(
    `SELECT
      source_row_order, order_no, stock_code, stock_name,
      quantity, tube_size, series, scheduled_date, start_date, end_date,
      notes, extra_data
     FROM production_plan_snapshot_items
     WHERE snapshot_id = $1
     ORDER BY source_row_order ASC`,
    [snapshotId]
  );

  return {
    snapshot: snapRes.rows[0],
    items: itemsRes.rows
  };
}

module.exports = {
  executeSqlReadOnly,
  fetchSourcePlanPreview,
  commitSourcePlanSnapshot,
  getActiveDraft,
  updateDraftItemsOrder,
  getSnapshotsList,
  getSnapshotDetails
};
