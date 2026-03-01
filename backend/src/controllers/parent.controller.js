const pool = require('../config/db');

// Helper: resolve student_id linked to the calling parent user
async function getLinkedStudentId(parentUserId) {
  const [rows] = await pool.query(
    'SELECT id FROM students WHERE parent_user_id = ? AND is_active = 1',
    [parentUserId],
  );
  return rows[0]?.id ?? null;
}

// GET /api/parent/child
// Returns the student's profile, enrolled batches and a quick summary.
exports.getChild = async (req, res) => {
  const studentId = await getLinkedStudentId(req.user.id);
  if (!studentId)
    return res
      .status(404)
      .json({ success: false, message: 'No student linked to this parent account' });

  const [stuRows] = await pool.query(
    `SELECT s.id, s.name, s.email, s.phone, s.dob, s.gender, s.address,
            s.parent_name, s.parent_phone, s.parent_email, s.qr_token, s.created_at
     FROM students s WHERE s.id = ?`,
    [studentId],
  );

  const [batches] = await pool.query(
    `SELECT b.id, b.name, b.subject, b.grade, b.time_slot, b.day_of_week, b.monthly_fee,
            i.name AS institute_name
     FROM student_batches sb
     JOIN batches b ON b.id = sb.batch_id
     JOIN institutes i ON i.id = b.institute_id
     WHERE sb.student_id = ? AND sb.is_active = 1 AND b.is_active = 1`,
    [studentId],
  );

  // Quick summary counts
  const [[{ att_total }]] = await pool.query(
    'SELECT COUNT(*) AS att_total FROM attendance WHERE student_id = ?',
    [studentId],
  );
  const [[{ att_present }]] = await pool.query(
    "SELECT COUNT(*) AS att_present FROM attendance WHERE student_id = ? AND status IN ('present','late')",
    [studentId],
  );
  const [[{ pending_fees }]] = await pool.query(
    "SELECT COUNT(*) AS pending_fees FROM fee_records WHERE student_id = ? AND status IN ('pending','partial')",
    [studentId],
  );

  res.json({
    success: true,
    data: {
      ...stuRows[0],
      batches,
      summary: {
        attendance_rate: att_total > 0 ? Math.round((att_present / att_total) * 100) : 0,
        total_classes: att_total,
        pending_fees,
      },
    },
  });
};

// GET /api/parent/attendance
exports.getAttendance = async (req, res) => {
  const studentId = await getLinkedStudentId(req.user.id);
  if (!studentId)
    return res
      .status(404)
      .json({ success: false, message: 'No student linked to this parent account' });

  const { batch_id, from, to } = req.query;
  let q = `SELECT a.id, a.date, a.status, a.scanned_at, a.notes,
                  b.name AS batch_name, b.subject
           FROM attendance a
           JOIN batches b ON b.id = a.batch_id
           WHERE a.student_id = ?`;
  const params = [studentId];

  if (batch_id) {
    q += ' AND a.batch_id = ?';
    params.push(batch_id);
  }
  if (from) {
    q += ' AND a.date >= ?';
    params.push(from);
  }
  if (to) {
    q += ' AND a.date <= ?';
    params.push(to);
  }

  q += ' ORDER BY a.date DESC';

  const [rows] = await pool.query(q, params);
  res.json({ success: true, data: rows });
};

// GET /api/parent/marks
exports.getMarks = async (req, res) => {
  const studentId = await getLinkedStudentId(req.user.id);
  if (!studentId)
    return res
      .status(404)
      .json({ success: false, message: 'No student linked to this parent account' });

  const { batch_id } = req.query;
  let q = `SELECT m.id, m.test_name, m.test_date, m.marks_obtained, m.total_marks,
                  m.percentage, m.remarks, b.name AS batch_name, b.subject
           FROM marks m
           JOIN batches b ON b.id = m.batch_id
           WHERE m.student_id = ?`;
  const params = [studentId];

  if (batch_id) {
    q += ' AND m.batch_id = ?';
    params.push(batch_id);
  }
  q += ' ORDER BY m.test_date DESC';

  const [rows] = await pool.query(q, params);
  res.json({ success: true, data: rows });
};

// GET /api/parent/fees
exports.getFees = async (req, res) => {
  const studentId = await getLinkedStudentId(req.user.id);
  if (!studentId)
    return res
      .status(404)
      .json({ success: false, message: 'No student linked to this parent account' });

  const [rows] = await pool.query(
    `SELECT f.id, f.month, f.amount, f.status, f.receipt_number, f.notes, f.paid_at,
            b.name AS batch_name
     FROM fee_records f
     JOIN batches b ON b.id = f.batch_id
     WHERE f.student_id = ?
     ORDER BY f.month DESC`,
    [studentId],
  );

  const pendingTotal = rows
    .filter((r) => r.status === 'pending' || r.status === 'partial')
    .reduce((s, r) => s + Number(r.amount), 0);

  res.json({ success: true, data: rows, meta: { pending_total: pendingTotal } });
};
