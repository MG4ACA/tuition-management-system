const pool = require('../config/db');

// GET /api/institutes
exports.getAll = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM institutes WHERE teacher_id = ? ORDER BY name',
    [req.user.id]
  );
  res.json({ success: true, data: rows });
};

// GET /api/institutes/:id
exports.getOne = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM institutes WHERE id = ? AND teacher_id = ?',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Institute not found' });
  res.json({ success: true, data: rows[0] });
};

// POST /api/institutes
exports.create = async (req, res) => {
  const { name, address, phone, email, logo_url } = req.body;
  const [result] = await pool.query(
    'INSERT INTO institutes (teacher_id, name, address, phone, email, logo_url) VALUES (?,?,?,?,?,?)',
    [req.user.id, name, address, phone, email, logo_url]
  );
  const [rows] = await pool.query('SELECT * FROM institutes WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
};

// PUT /api/institutes/:id
exports.update = async (req, res) => {
  const { name, address, phone, email, logo_url, is_active } = req.body;
  await pool.query(
    'UPDATE institutes SET name=?, address=?, phone=?, email=?, logo_url=?, is_active=? WHERE id=? AND teacher_id=?',
    [name, address, phone, email, logo_url, is_active, req.params.id, req.user.id]
  );
  const [rows] = await pool.query('SELECT * FROM institutes WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: rows[0] });
};

// DELETE /api/institutes/:id
exports.remove = async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM institutes WHERE id = ? AND teacher_id = ?',
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Institute deleted' });
};

// GET /api/institutes/:id/summary
exports.summary = async (req, res) => {
  const id = req.params.id;
  const [[inst]] = await pool.query('SELECT * FROM institutes WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
  if (!inst) return res.status(404).json({ success: false, message: 'Not found' });

  const [[batchCount]]  = await pool.query('SELECT COUNT(*) AS total FROM batches WHERE institute_id = ? AND is_active = 1', [id]);
  const [[studentCount]] = await pool.query(
    `SELECT COUNT(DISTINCT sb.student_id) AS total
     FROM student_batches sb JOIN batches b ON b.id=sb.batch_id
     WHERE b.institute_id = ? AND sb.is_active = 1`, [id]
  );
  const [[revenue]] = await pool.query(
    `SELECT COALESCE(SUM(fr.amount),0) AS total
     FROM fee_records fr JOIN batches b ON b.id=fr.batch_id
     WHERE b.institute_id = ? AND fr.status = 'paid'`, [id]
  );

  res.json({ success: true, data: { ...inst, batches: batchCount.total, students: studentCount.total, revenue: revenue.total } });
};
