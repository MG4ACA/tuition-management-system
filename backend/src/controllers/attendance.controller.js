const pool = require('../config/db');

// POST /api/attendance/scan  (QR scan — marks attendance)
exports.scan = async (req, res) => {
  const { qr_token, batch_id } = req.body;
  const today = new Date().toISOString().split('T')[0];

  // Lookup student
  const [stuRows] = await pool.query(
    'SELECT id, name FROM students WHERE qr_token=? AND is_active=1',
    [qr_token],
  );
  if (!stuRows.length) return res.status(404).json({ success: false, message: 'Invalid QR code' });

  const student = stuRows[0];

  // Verify enrollment
  const [enrollment] = await pool.query(
    'SELECT id FROM student_batches WHERE student_id=? AND batch_id=? AND is_active=1',
    [student.id, batch_id],
  );
  if (!enrollment.length) {
    return res.status(400).json({ success: false, message: 'Student not enrolled in this batch' });
  }

  // Upsert attendance
  await pool.query(
    `INSERT INTO attendance (student_id, batch_id, date, status, scanned_at)
     VALUES (?,?,?,'present', NOW())
     ON DUPLICATE KEY UPDATE status='present', scanned_at=NOW()`,
    [student.id, batch_id, today],
  );

  // Fee check
  const monthStart = `${today.slice(0, 7)}-01`;
  const [feeRows] = await pool.query(
    'SELECT status FROM fee_records WHERE student_id=? AND batch_id=? AND month=?',
    [student.id, batch_id, monthStart],
  );

  res.json({
    success: true,
    message: `Attendance marked for ${student.name}`,
    data: {
      student_id: student.id,
      name: student.name,
      date: today,
      fee_status: feeRows[0]?.status || 'pending',
    },
  });
};

// GET /api/attendance?batch_id=&date=&student_id=
exports.getAll = async (req, res) => {
  const { batch_id, date, student_id, from, to } = req.query;

  let sql = `
    SELECT a.*, s.name AS student_name, s.phone AS student_phone,
           b.name AS batch_name
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    JOIN batches b ON b.id=a.batch_id
    JOIN institutes i ON i.id=b.institute_id
    WHERE i.teacher_id=?
  `;
  const params = [req.user.id];

  if (batch_id) {
    sql += ' AND a.batch_id=?';
    params.push(batch_id);
  }
  if (date) {
    sql += ' AND a.date=?';
    params.push(date);
  }
  if (student_id) {
    sql += ' AND a.student_id=?';
    params.push(student_id);
  }
  if (from) {
    sql += ' AND a.date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND a.date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY a.date DESC, s.name';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// POST /api/attendance  (manual entry)
exports.create = async (req, res) => {
  const { student_id, batch_id, date, status, notes } = req.body;

  await pool.query(
    `INSERT INTO attendance (student_id, batch_id, date, status, notes)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE status=VALUES(status), notes=VALUES(notes)`,
    [student_id, batch_id, date, status, notes],
  );
  res.status(201).json({ success: true, message: 'Attendance recorded' });
};

// PUT /api/attendance/:id
exports.update = async (req, res) => {
  const { status, notes } = req.body;
  await pool.query('UPDATE attendance SET status=?, notes=? WHERE id=?', [
    status,
    notes,
    req.params.id,
  ]);
  res.json({ success: true, message: 'Updated' });
};

// DELETE /api/attendance/:id
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM attendance WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Deleted' });
};

// GET /api/attendance/summary?batch_id=&student_id=&month=
exports.summary = async (req, res) => {
  const { batch_id, student_id, month } = req.query;
  // month format: YYYY-MM

  let sql = `
    SELECT
      s.id, s.name,
      SUM(a.status='present') AS present,
      SUM(a.status='absent')  AS absent,
      SUM(a.status='late')    AS late,
      COUNT(*) AS total
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    JOIN batches b ON b.id=a.batch_id
    JOIN institutes i ON i.id=b.institute_id
    WHERE i.teacher_id=?
  `;
  const params = [req.user.id];

  if (batch_id) {
    sql += ' AND a.batch_id=?';
    params.push(batch_id);
  }
  if (student_id) {
    sql += ' AND a.student_id=?';
    params.push(student_id);
  }
  if (month) {
    sql += ' AND DATE_FORMAT(a.date,"%Y-%m")=?';
    params.push(month);
  }

  sql += ' GROUP BY s.id, s.name ORDER BY s.name';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// GET /api/attendance/student-me  (student portal)
exports.getMyAttendance = async (req, res) => {
  const [stuRows] = await pool.query('SELECT id FROM students WHERE user_id=?', [req.user.id]);
  if (!stuRows.length)
    return res.status(404).json({ success: false, message: 'Student profile not found' });

  const [rows] = await pool.query(
    `SELECT a.*, b.name AS batch_name, i.name AS institute_name
     FROM attendance a
     JOIN batches b ON b.id=a.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE a.student_id=? ORDER BY a.date DESC LIMIT 100`,
    [stuRows[0].id],
  );
  res.json({ success: true, data: rows });
};
