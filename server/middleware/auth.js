const { query } = require('../db');
const config = require('../config');

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

async function authenticateRequest(req) {
  // 1. Token'ı başlık veya çerezden çıkar
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  if (!token && req.headers['cookie']) {
    const cookies = parseCookies(req.headers['cookie']);
    token = cookies[config.SESSION_COOKIE_NAME];
  }

  // 2. Token veritabanında geçerli mi?
  if (token) {
    try {
      const res = await query(
        `SELECT s.token, s.username, s.role, s.display_name, r.can_edit_parameters, r.can_edit_rules, r.can_approve_plans, r.can_import_excel
         FROM app_sessions s
         JOIN user_roles r ON s.role = r.role_name
         WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        // Son görülme tarihini asenkron güncelle
        query('UPDATE app_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token = $1', [token]).catch(() => {});

        return {
          isAuthenticated: true,
          token: row.token,
          username: row.username,
          role: row.role,
          displayName: row.display_name,
          permissions: {
            canEditParameters: row.can_edit_parameters,
            canEditRules: row.can_edit_rules,
            canApprovePlans: row.can_approve_plans,
            canImportExcel: row.can_import_excel,
          }
        };
      }
    } catch (err) {
      console.error('[Auth] Oturum sorgusu hatası:', err.message);
    }
  }

  // 3. Fallback: Viewer (Salt Okunur) rolü
  return {
    isAuthenticated: false,
    token: null,
    username: 'guest',
    role: 'viewer',
    displayName: 'Misafir Kullanıcı (Salt Okunur)',
    permissions: {
      canEditParameters: false,
      canEditRules: false,
      canApprovePlans: false,
      canImportExcel: false,
    }
  };
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: {
          code: 'YETKISIZ_ISLEM',
          message: `Bu işlem için '${allowedRoles.join(' veya ')}' yetkisi gereklidir. Mevcut rolünüz: '${req.user?.role || 'tanımsız'}'.`,
        }
      }));
    }
    next();
  };
}

module.exports = {
  authenticateRequest,
  requireRole,
};
