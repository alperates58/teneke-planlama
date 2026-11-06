const path = require('path');

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOSTNAME || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/teneke_planlama',
  NODE_ENV: process.env.NODE_ENV || 'production',
  SESSION_COOKIE_NAME: 'tp_session_token',
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  MIGRATIONS_DIR: path.join(__dirname, '..', 'migrations'),
  MAX_BODY_SIZE_BYTES: 15 * 1024 * 1024, // 15MB for excel uploads
  ERP_SQL: {
    host: process.env.ERP_SQL_HOST || 'host.docker.internal',
    port: parseInt(process.env.ERP_SQL_PORT || '11433', 10),
    database: process.env.ERP_SQL_DB || 'AA_LIDER',
    user: process.env.ERP_SQL_USER || 'planlama',
    password: process.env.ERP_SQL_PASSWORD || '',
    connectTimeout: 8000,
    planSourceTable: process.env.ERP_PLAN_SOURCE_TABLE || 'MikroDesktop_LIDER26.dbo.alper_tenekeuretim'
  }
};
