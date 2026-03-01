const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/students?batch_id=&institute_id=&search=
exports.getAll = async (req, res) => {
  const { batch_id, institute_id, search } = req.query;

  let sql = `
    SELECT DISTINCT s.*,
      u.email AS portal_email
    FROM students s
    LEFT JOIN users u ON u.id = s.user_id
    JOIN student_batches sb ON sb.student_id = s.id
    JOIN batches b ON b.id = sb.batch_id
    JOIN institutes i ON i.id = b.institute_id
    WHERE i.teacher_id = ?
  `;
  const params = [req.user.id];

  if (batch_id)     { sql += ' AND sb.batch_id = ?';      params.push(batch_id); }
  if (institute_id) { sql += ' AND b.institute_id = ?';   params.push(institute_id); }
  if (search)       { sql += ' AND (s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  sql += ' ORDER BY s.name';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// GET /api/students/:id
exports.getOne = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.email AS portal_email
     FROM students s LEFT JOIN users u ON u.id=s.user_id
     WHERE s.id=?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });

  // Fetch enrolled batches
  const [batches] = await pool.query(
    `SELECT b.id, b.name, b.subject, b.grade, i.name AS institute_name, sb.enrolled_at
     FROM student_batches sb
     JOIN batches b ON b.id=sb.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE sb.student_id=? AND sb.is_active=1`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...rows[0], batches } });
};

// POST /api/students
exports.create = async (req, res) => {
  const { name, email, phone, dob, gender, address, parent_name, parent_phone, parent_email, notes, batch_ids } = req.body;
  const qr_token = uuidv4();

  const [result] = await pool.query(
    'INSERT INTO students (name,email,phone,dob,gender,address,parent_name,parent_phone,parent_email,notes,qr_token) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [name, email, phone, dob, gender, address, parent_name, parent_phone, parent_email, notes, qr_token]
  );
  const studentId = result.insertId;

  // Enroll in batches
  if (batch_ids?.length) {
    const values = batch_ids.map(bid => [studentId, bid]);
    await pool.query('INSERT IGNORE INTO student_batches (student_id, batch_id) VALUES ?', [values]);
  }

  const [rows] = await pool.query('SELECT * FROM students WHERE id=?', [studentId]);
  res.status(201).json({ success: true, data: rows[0] });
};

// PUT /api/students/:id
exports.update = async (req, res) => {
  const { name, email, phone, dob, gender, address, parent_name, parent_phone, parent_email, notes, is_active } = req.body;
  await pool.query(
    'UPDATE students SET name=?,email=?,phone=?,dob=?,gender=?,address=?,parent_name=?,parent_phone=?,parent_email=?,notes=?,is_active=? WHERE id=?',
    [name, email, phone, dob, gender, address, parent_name, parent_phone, parent_email, notes, is_active, req.params.id]
  );
  const [rows] = await pool.query('SELECT * FROM students WHERE id=?', [req.params.id]);
  res.json({ success: true, data: rows[0] });
};

// DELETE /api/students/:id
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM students WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Student deleted' });
};

// POST /api/students/:id/enroll
exports.enrollBatch = async (req, res) => {
  const { batch_id } = req.body;
  await pool.query('INSERT IGNORE INTO student_batches (student_id, batch_id) VALUES (?,?)', [req.params.id, batch_id]);
  res.json({ success: true, message: 'Enrolled' });
};

// DELETE /api/students/:id/enroll/:batch_id
exports.unenrollBatch = async (req, res) => {
  await pool.query(
    'UPDATE student_batches SET is_active=0 WHERE student_id=? AND batch_id=?',
    [req.params.id, req.params.batch_id]
  );
  res.json({ success: true, message: 'Unenrolled' });
};

// GET /api/students/by-qr/:token  (used by QR scanner)
exports.getByQR = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.phone, s.parent_name, s.qr_token,
       GROUP_CONCAT(DISTINCT b.id) AS batch_ids
     FROM students s
     LEFT JOIN student_batches sb ON sb.student_id=s.id AND sb.is_active=1
     LEFT JOIN batches b ON b.id=sb.batch_id
     WHERE s.qr_token=? AND s.is_active=1
     GROUP BY s.id`,
    [req.params.token]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });

  // Check fee status for current month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const [feeRows] = await pool.query(
    'SELECT status FROM fee_records WHERE student_id=? AND month=? LIMIT 1',
    [rows[0].id, monthStart.toISOString().split('T')[0]]
  );

  res.json({
    success: true,
    data: {
      ...rows[0],
      fee_status: feeRows[0]?.status || 'pending',
    },
  });
};

// GET /api/students/me  (student portal - own profile)
exports.getMyProfile = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.* FROM students s WHERE s.user_id = ?`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: rows[0] });
};
