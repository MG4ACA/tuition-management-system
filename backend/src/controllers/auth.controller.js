const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const { accessToken, refreshToken } = generateTokens(user);

  // Persist refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?,?,?)', [
    user.id,
    refreshToken,
    expiresAt,
  ]);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ success: false, message: 'Refresh token required' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
    [refreshToken],
  );
  if (!rows.length)
    return res.status(401).json({ success: false, message: 'Token revoked or expired' });

  const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND is_active = 1', [
    payload.id,
  ]);
  if (!userRows.length) return res.status(401).json({ success: false, message: 'User not found' });

  const user = userRows[0];
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  // Rotate refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
  await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?,?,?)', [
    user.id,
    newRefreshToken,
    expiresAt,
  ]);

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
  }
  res.json({ success: true, message: 'Logged out' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
    [req.user.id],
  );
  res.json({ success: true, data: rows[0] });
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid)
    return res.status(400).json({ success: false, message: 'Current password incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

  // Revoke all refresh tokens
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);

  res.json({ success: true, message: 'Password changed. Please log in again.' });
};

// POST /api/auth/register-student  (teacher creates student portal account)
exports.registerStudent = async (req, res) => {
  const { student_id, name, email, password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length)
    return res.status(409).json({ success: false, message: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
    [name, email, hash, 'student'],
  );

  // Link user to student record
  await pool.query('UPDATE students SET user_id = ? WHERE id = ?', [result.insertId, student_id]);

  res
    .status(201)
    .json({
      success: true,
      message: 'Student portal account created',
      data: { user_id: result.insertId },
    });
};

// POST /api/auth/register-parent  (teacher creates parent portal account)
exports.registerParent = async (req, res) => {
  const { student_id, name, email, password } = req.body;
  if (!student_id || !name || !email || !password)
    return res
      .status(400)
      .json({ success: false, message: 'student_id, name, email and password are required' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length)
    return res.status(409).json({ success: false, message: 'Email already registered' });

  const [stuRows] = await pool.query('SELECT id, parent_user_id FROM students WHERE id = ?', [
    student_id,
  ]);
  if (!stuRows.length)
    return res.status(404).json({ success: false, message: 'Student not found' });
  if (stuRows[0].parent_user_id)
    return res
      .status(409)
      .json({ success: false, message: 'Parent account already exists for this student' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
    [name, email, hash, 'parent'],
  );

  await pool.query('UPDATE students SET parent_user_id = ? WHERE id = ?', [
    result.insertId,
    student_id,
  ]);

  res
    .status(201)
    .json({
      success: true,
      message: 'Parent portal account created',
      data: { user_id: result.insertId },
    });
};
