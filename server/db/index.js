const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Beklenmeyen PostgreSQL bağlantı havuzu hatası:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[DB SLOW QUERY] (${duration}ms): ${text.substring(0, 100)}`);
    }
    return res;
  } catch (err) {
    console.error(`[DB ERROR]: ${err.message} | Query: ${text.substring(0, 120)}`);
    throw err;
  }
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function checkHealth() {
  try {
    const res = await pool.query('SELECT 1 AS ok, current_database() AS db, NOW() AS time');
    return { ok: true, db: res.rows[0].db, time: res.rows[0].time };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  checkHealth,
};
