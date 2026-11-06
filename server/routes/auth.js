const { query } = require('../db');
const config = require('../config');

async function handleAuthRoutes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      data: req.user
    }));
  }

  if (req.method === 'POST' && pathname === '/api/auth/switch-role') {
    const targetRole = req.body?.role;
    if (!['admin', 'planner', 'viewer'].includes(targetRole)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'GECERSIZ_ROL', message: 'Geçersiz rol seçimi (admin, planner, viewer olmalıdır).' }
      }));
    }

    const token = `token_${targetRole}_session_v2c`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const displayName = targetRole === 'admin'
      ? 'Sistem Yöneticisi'
      : targetRole === 'planner'
        ? 'Üretim Planlama Uzmanı'
        : 'Görüntüleyici (Salt Okunur)';

    await query(
      `INSERT INTO app_sessions (token, username, role, display_name, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (token) DO UPDATE SET
         role = EXCLUDED.role,
         display_name = EXCLUDED.display_name,
         expires_at = EXCLUDED.expires_at,
         last_seen_at = CURRENT_TIMESTAMP`,
      [token, targetRole, targetRole, displayName, expiresAt]
    );

    res.setHeader('Set-Cookie', `${config.SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      data: {
        token,
        username: targetRole,
        role: targetRole,
        displayName
      }
    }));
  }

  return false;
}

module.exports = { handleAuthRoutes };
