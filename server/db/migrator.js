const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getClient } = require('./index');

async function runMigrations() {
  console.log('[Migrator] Sürümlü veritabanı migrasyon kontrolü başlatılıyor...');
  const client = await getClient();

  try {
    // 0. schema_migrations tablosunu garantiye al
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Uygulanmış migrasyonları al
    const res = await client.query('SELECT version, name FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(res.rows.map(r => r.version));

    // Migrasyon dosyalarını oku
    const files = fs.readdirSync(config.MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const match = file.match(/^(\d+)_/);
      const version = match ? match[1] : file;

      if (!appliedVersions.has(version)) {
        console.log(`[Migrator] Migrasyon uygulanıyor: ${file} (Sürüm: ${version})...`);
        const filePath = path.join(config.MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (version) DO NOTHING',
            [version, file]
          );
          await client.query('COMMIT');
          console.log(`[Migrator] ✓ Başarıyla uygulandı: ${file}`);
          appliedCount++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[Migrator] ✗ Migrasyon başarısız (${file}):`, err.message);
          throw new Error(`Migrasyon hatası (${file}): ${err.message}`);
        }
      } else {
        // Zaten uygulanmış
      }
    }

    if (appliedCount === 0) {
      console.log('[Migrator] Veritabanı güncel. Bekleyen yeni migrasyon yok.');
    } else {
      console.log(`[Migrator] Toplam ${appliedCount} yeni migrasyon başarıyla uygulandı.`);
    }

    return { success: true, appliedCount };
  } finally {
    client.release();
  }
}

module.exports = {
  runMigrations,
};
