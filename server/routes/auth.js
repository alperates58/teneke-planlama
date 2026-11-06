const crypto = require('crypto');
const { query } = require('../db');
const config = require('../config');

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHash] = storedHash.split(':');
  const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(expectedHash, 'utf8'));
}

async function handleAuthRoutes(req, res, pathname) {
  // 1. Mevcut Oturum Bilgisi
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      data: req.user
    }));
  }

  // 2. Gerçek Kullanıcı Girişi
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'EKSİK_PARAMETRE', message: 'Kullanıcı adı ve şifre zorunludur.' }
      }));
    }

    const userRes = await query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.display_name, u.is_active,
              r.can_edit_parameters, r.can_edit_rules, r.can_approve_plans, r.can_import_excel
       FROM app_users u
       JOIN user_roles r ON u.role = r.role_name
       WHERE u.username = $1 AND u.is_active = TRUE`,
      [username.trim()]
    );

    if (userRes.rows.length === 0) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'GECERSIZ_KULLANICI', message: 'Kullanıcı adı veya şifre hatalı.' }
      }));
    }

    const user = userRes.rows[0];
    const isPasswordValid = verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'GECERSIZ_KULLANICI', message: 'Kullanıcı adı veya şifre hatalı.' }
      }));
    }

    // Kriptografik rastgele güvenli oturum token'ı
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO app_sessions (token, username, role, display_name, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [token, user.username, user.role, user.display_name, expiresAt]
    );

    res.setHeader('Set-Cookie', `${config.SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      data: {
        token,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
        permissions: {
          canEditParameters: user.can_edit_parameters,
          canEditRules: user.can_edit_rules,
          canApprovePlans: user.can_approve_plans,
          canImportExcel: user.can_import_excel
        }
      }
    }));
  }

  // 3. Oturum Kapatma
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    if (req.user?.token) {
      await query('DELETE FROM app_sessions WHERE token = $1', [req.user.token]).catch(() => {});
    }
    res.setHeader('Set-Cookie', `${config.SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Oturum kapatıldı.'
    }));
  }

  // 4. Demo Rol Değiştirme Simülasyonu (Yalnızca açık geliştirme ortamında ve izne bağlı)
  if (req.method === 'POST' && pathname === '/api/auth/switch-role') {
    // Varsayılan olarak kesinlikle kapalıdır (üretim/canlı ortam koruması)
    const allowDemoSwitch = process.env.ALLOW_DEMO_ROLE_SWITCH === 'true';
    if (!allowDemoSwitch) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: {
          code: 'ROLE_SWITCH_DISABLED',
          message: 'Rol değiştirme simülasyonu kapalıdır. Yetki yükseltme engellenmiştir; lütfen geçerli kullanıcı hesabınızla oturum açınız.'
        }
      }));
    }

    const targetRole = req.body?.role;
    if (!['admin', 'planner', 'viewer'].includes(targetRole)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'GECERSIZ_ROL', message: 'Geçersiz rol seçimi (admin, planner, viewer olmalıdır).' }
      }));
    }

    // Sunucu atanmış kayıtlı kullanıcıyı bul
    const userRes = await query(
      `SELECT u.username, u.role, u.display_name,
              r.can_edit_parameters, r.can_edit_rules, r.can_approve_plans, r.can_import_excel
       FROM app_users u
       JOIN user_roles r ON u.role = r.role_name
       WHERE u.role = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [targetRole]
    );

    if (userRes.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'KULLANICI_BULUNAMADI', message: `'${targetRole}' rolüne atanmış aktif kullanıcı bulunamadı.` }
      }));
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO app_sessions (token, username, role, display_name, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [token, user.username, user.role, user.display_name, expiresAt]
    );

    res.setHeader('Set-Cookie', `${config.SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      data: {
        token,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
        permissions: {
          canEditParameters: user.can_edit_parameters,
          canEditRules: user.can_edit_rules,
          canApprovePlans: user.can_approve_plans,
          canImportExcel: user.can_import_excel
        }
      }
    }));
  }

  return false;
}

module.exports = { handleAuthRoutes };
