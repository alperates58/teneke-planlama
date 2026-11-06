/**
 * Teneke Planlama - Ana Sunucu Başlatıcı
 * Modüler mimariye yönlendirir (server/index.js)
 */

const { startServer } = require('./server/index');

startServer().catch((err) => {
  console.error('[Fatal Error] Sunucu başlatma hatası:', err);
  process.exit(1);
});
