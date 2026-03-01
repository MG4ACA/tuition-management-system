const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/fees?batch_id=&student_id=&month=&status=
exports.getAll = async (req, res) => {
  const { batch_id, student_id, month, status } = req.query;
  let sql = `
    SELECT fr.*, s.name AS student_name, s.phone AS student_phone,
           b.name AS batch_name, i.name AS institute_name
    FROM fee_records fr
    JOIN students s ON s.id=fr.student_id
    JOIN batches b ON b.id=fr.batch_id
    JOIN institutes i ON i.id=b.institute_id
    WHERE i.teacher_id=?
  `;
  const params = [req.user.id];
  if (batch_id)   { sql += ' AND fr.batch_id=?';    params.push(batch_id); }
  if (student_id) { sql += ' AND fr.student_id=?';  params.push(student_id); }
  if (month)      { sql += ' AND fr.month=?';        params.push(`${month}-01`); }
  if (status)     { sql += ' AND fr.status=?';       params.push(status); }
  sql += ' ORDER BY fr.month DESC, s.name';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// POST /api/fees/generate  (generate monthly fee records for all enrolled students in a batch)
exports.generate = async (req, res) => {
  const { batch_id, month } = req.body; // month: YYYY-MM
  const monthDate = `${month}-01`;

  const [batch] = await pool.query('SELECT monthly_fee FROM batches WHERE id=?', [batch_id]);
  if (!batch.length) return res.status(404).json({ success: false, message: 'Batch not found' });

  const [students] = await pool.query(
    'SELECT student_id FROM student_batches WHERE batch_id=? AND is_active=1',
    [batch_id]
  );

  if (!students.length) return res.json({ success: true, message: 'No students enrolled', created: 0 });

  const values = students.map(s => [s.student_id, batch_id, monthDate, batch[0].monthly_fee, 'pending']);
  await pool.query(
    `INSERT IGNORE INTO fee_records (student_id, batch_id, month, amount, status) VALUES ?`,
    [values]
  );

  res.json({ success: true, message: `Fee records generated for ${students.length} students`, created: students.length });
};

// PUT /api/fees/:id  (mark paid/partial/waived)
exports.update = async (req, res) => {
  const { status, amount, paid_at, notes } = req.body;
  const receipt_number = status === 'paid' ? `RCP-${Date.now()}` : null;

  await pool.query(
    'UPDATE fee_records SET status=?, amount=?, paid_at=?, notes=?, receipt_number=COALESCE(?,receipt_number) WHERE id=?',
    [status, amount, paid_at || null, notes, receipt_number, req.params.id]
  );
  const [rows] = await pool.query('SELECT * FROM fee_records WHERE id=?', [req.params.id]);
  res.json({ success: true, data: rows[0] });
};

// GET /api/fees/pending-students?batch_id=&month=
exports.getPendingStudents = async (req, res) => {
  const { batch_id, month } = req.query;
  const monthDate = month ? `${month}-01` : `${new Date().toISOString().slice(0,7)}-01`;

  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.phone, s.parent_phone,
            fr.id AS fee_id, fr.amount, fr.status, fr.month
     FROM students s
     JOIN student_batches sb ON sb.student_id=s.id
     LEFT JOIN fee_records fr ON fr.student_id=s.id AND fr.batch_id=? AND fr.month=?
     WHERE sb.batch_id=? AND sb.is_active=1
       AND (fr.status IS NULL OR fr.status IN ('pending','partial'))
     ORDER BY s.name`,
    [batch_id, monthDate, batch_id]
  );
  res.json({ success: true, data: rows });
};

// GET /api/fees/student-me  (student portal)
exports.getMyFees = async (req, res) => {
  const [stuRows] = await pool.query('SELECT id FROM students WHERE user_id=?', [req.user.id]);
  if (!stuRows.length) return res.status(404).json({ success: false, message: 'Profile not found' });

  const [rows] = await pool.query(
    `SELECT fr.*, b.name AS batch_name, i.name AS institute_name
     FROM fee_records fr
     JOIN batches b ON b.id=fr.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE fr.student_id=? ORDER BY fr.month DESC`,
    [stuRows[0].id]
  );
  res.json({ success: true, data: rows });
};
