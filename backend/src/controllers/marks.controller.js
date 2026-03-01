const pool = require('../config/db');

// GET /api/marks?student_id=&batch_id=
exports.getAll = async (req, res) => {
  const { student_id, batch_id } = req.query;
  let sql = `
    SELECT m.*, s.name AS student_name, b.name AS batch_name
    FROM marks m
    JOIN students s ON s.id=m.student_id
    JOIN batches b ON b.id=m.batch_id
    JOIN institutes i ON i.id=b.institute_id
    WHERE i.teacher_id=?
  `;
  const params = [req.user.id];
  if (student_id) { sql += ' AND m.student_id=?'; params.push(student_id); }
  if (batch_id)   { sql += ' AND m.batch_id=?';   params.push(batch_id); }
  sql += ' ORDER BY m.test_date DESC';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// POST /api/marks
exports.create = async (req, res) => {
  const { student_id, batch_id, test_name, marks_obtained, total_marks, test_date, remarks } = req.body;
  const [result] = await pool.query(
    'INSERT INTO marks (student_id,batch_id,test_name,marks_obtained,total_marks,test_date,remarks) VALUES (?,?,?,?,?,?,?)',
    [student_id, batch_id, test_name, marks_obtained, total_marks, test_date, remarks]
  );
  const [rows] = await pool.query('SELECT * FROM marks WHERE id=?', [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
};

// POST /api/marks/bulk  (bulk marks entry for a test)
exports.createBulk = async (req, res) => {
  // records: [{ student_id, marks_obtained, remarks }]
  const { batch_id, test_name, total_marks, test_date, records } = req.body;
  if (!records?.length) return res.status(400).json({ success: false, message: 'No records provided' });

  const values = records.map(r => [r.student_id, batch_id, test_name, r.marks_obtained, total_marks, test_date, r.remarks || null]);
  await pool.query(
    `INSERT INTO marks (student_id,batch_id,test_name,marks_obtained,total_marks,test_date,remarks) VALUES ?
     ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained), remarks=VALUES(remarks)`,
    [values]
  );
  res.status(201).json({ success: true, message: `${records.length} marks saved` });
};

// PUT /api/marks/:id
exports.update = async (req, res) => {
  const { test_name, marks_obtained, total_marks, test_date, remarks } = req.body;
  await pool.query(
    'UPDATE marks SET test_name=?,marks_obtained=?,total_marks=?,test_date=?,remarks=? WHERE id=?',
    [test_name, marks_obtained, total_marks, test_date, remarks, req.params.id]
  );
  const [rows] = await pool.query('SELECT * FROM marks WHERE id=?', [req.params.id]);
  res.json({ success: true, data: rows[0] });
};

// DELETE /api/marks/:id
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM marks WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Deleted' });
};

// GET /api/marks/student-me  (student portal)
exports.getMyMarks = async (req, res) => {
  const [stuRows] = await pool.query('SELECT id FROM students WHERE user_id=?', [req.user.id]);
  if (!stuRows.length) return res.status(404).json({ success: false, message: 'Profile not found' });

  const [rows] = await pool.query(
    `SELECT m.*, b.name AS batch_name, i.name AS institute_name,
       ROUND((m.marks_obtained/m.total_marks)*100,1) AS percentage
     FROM marks m
     JOIN batches b ON b.id=m.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE m.student_id=? ORDER BY m.test_date DESC`,
    [stuRows[0].id]
  );
  res.json({ success: true, data: rows });
};
