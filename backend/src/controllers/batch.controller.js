const pool = require('../config/db');

// GET /api/batches?institute_id=
exports.getAll = async (req, res) => {
  const { institute_id } = req.query;
  let sql = `
    SELECT b.*, i.name AS institute_name,
      COUNT(DISTINCT sb.student_id) AS enrolled_count
    FROM batches b
    JOIN institutes i ON i.id = b.institute_id
    LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.is_active = 1
    WHERE i.teacher_id = ?
  `;
  const params = [req.user.id];

  if (institute_id) {
    sql += ' AND b.institute_id = ?';
    params.push(institute_id);
  }
  sql += ' GROUP BY b.id ORDER BY b.name';

  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// GET /api/batches/:id
exports.getOne = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, i.name AS institute_name
     FROM batches b JOIN institutes i ON i.id=b.institute_id
     WHERE b.id=? AND i.teacher_id=?`,
    [req.params.id, req.user.id],
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Batch not found' });
  res.json({ success: true, data: rows[0] });
};

// POST /api/batches
exports.create = async (req, res) => {
  const { institute_id, name, subject, grade, day_of_week, time_slot, monthly_fee, max_students } =
    req.body;

  // Ownership check
  const [inst] = await pool.query('SELECT id FROM institutes WHERE id=? AND teacher_id=?', [
    institute_id,
    req.user.id,
  ]);
  if (!inst.length) return res.status(403).json({ success: false, message: 'Institute not found' });

  const [result] = await pool.query(
    'INSERT INTO batches (institute_id,name,subject,grade,day_of_week,time_slot,monthly_fee,max_students) VALUES (?,?,?,?,?,?,?,?)',
    [institute_id, name, subject, grade, day_of_week, time_slot, monthly_fee, max_students],
  );
  const [rows] = await pool.query('SELECT * FROM batches WHERE id=?', [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
};

// PUT /api/batches/:id
exports.update = async (req, res) => {
  const { name, subject, grade, day_of_week, time_slot, monthly_fee, max_students, is_active } =
    req.body;

  const [check] = await pool.query(
    'SELECT b.id FROM batches b JOIN institutes i ON i.id=b.institute_id WHERE b.id=? AND i.teacher_id=?',
    [req.params.id, req.user.id],
  );
  if (!check.length) return res.status(404).json({ success: false, message: 'Not found' });

  await pool.query(
    'UPDATE batches SET name=?,subject=?,grade=?,day_of_week=?,time_slot=?,monthly_fee=?,max_students=?,is_active=? WHERE id=?',
    [
      name,
      subject,
      grade,
      day_of_week,
      time_slot,
      monthly_fee,
      max_students,
      is_active,
      req.params.id,
    ],
  );
  const [rows] = await pool.query('SELECT * FROM batches WHERE id=?', [req.params.id]);
  res.json({ success: true, data: rows[0] });
};

// DELETE /api/batches/:id
exports.remove = async (req, res) => {
  const [check] = await pool.query(
    'SELECT b.id FROM batches b JOIN institutes i ON i.id=b.institute_id WHERE b.id=? AND i.teacher_id=?',
    [req.params.id, req.user.id],
  );
  if (!check.length) return res.status(404).json({ success: false, message: 'Not found' });
  await pool.query('DELETE FROM batches WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Batch deleted' });
};

// GET /api/batches/:id/students
exports.getStudents = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, sb.enrolled_at, sb.is_active AS enrollment_active
     FROM students s
     JOIN student_batches sb ON sb.student_id=s.id
     WHERE sb.batch_id=? AND sb.is_active=1
     ORDER BY s.name`,
    [req.params.id],
  );
  res.json({ success: true, data: rows });
};
