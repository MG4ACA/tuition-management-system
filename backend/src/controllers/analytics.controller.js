const pool = require('../config/db');

// GET /api/analytics/overview?institute_id=
exports.overview = async (req, res) => {
  const { institute_id } = req.query;
  const teacherId = req.user.id;

  const instFilter = institute_id ? 'AND i.id = ?' : '';
  const params = institute_id ? [teacherId, institute_id] : [teacherId];
  const paramsDouble = institute_id
    ? [teacherId, institute_id, teacherId, institute_id]
    : [teacherId, teacherId];

  // Total students
  const [[students]] = await pool.query(
    `SELECT COUNT(DISTINCT sb.student_id) AS total
     FROM student_batches sb JOIN batches b ON b.id=sb.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND sb.is_active=1`,
    params,
  );

  // Total batches
  const [[batches]] = await pool.query(
    `SELECT COUNT(*) AS total FROM batches b
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND b.is_active=1`,
    params,
  );

  // Total institutes
  const [[institutes]] = await pool.query(
    `SELECT COUNT(*) AS total FROM institutes WHERE teacher_id=? ${institute_id ? 'AND id=?' : ''} AND is_active=1`,
    params,
  );

  // Revenue this month vs last month
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = `${lastMonthDate.toISOString().slice(0, 7)}-01`;

  const [[revThis]] = await pool.query(
    `SELECT COALESCE(SUM(fr.amount),0) AS total
     FROM fee_records fr JOIN batches b ON b.id=fr.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND fr.status='paid' AND fr.month=?`,
    [...params, thisMonth],
  );

  const [[revLast]] = await pool.query(
    `SELECT COALESCE(SUM(fr.amount),0) AS total
     FROM fee_records fr JOIN batches b ON b.id=fr.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND fr.status='paid' AND fr.month=?`,
    [...params, lastMonth],
  );

  // Today's attendance
  const today = new Date().toISOString().split('T')[0];
  const [[todayAtt]] = await pool.query(
    `SELECT COUNT(*) AS total FROM attendance a
     JOIN batches b ON b.id=a.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND a.date=?`,
    [...params, today],
  );

  res.json({
    success: true,
    data: {
      students: students.total,
      batches: batches.total,
      institutes: institutes.total,
      revenue_this_month: revThis.total,
      revenue_last_month: revLast.total,
      attendance_today: todayAtt.total,
    },
  });
};

// GET /api/analytics/revenue?months=6&institute_id=
exports.revenueChart = async (req, res) => {
  const { months = 6, institute_id } = req.query;
  const teacherId = req.user.id;

  const instFilter = institute_id ? 'AND i.id = ?' : '';
  const params = institute_id
    ? [teacherId, institute_id, parseInt(months)]
    : [teacherId, parseInt(months)];

  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(fr.month,'%Y-%m') AS month,
            COALESCE(SUM(fr.amount),0) AS revenue,
            COUNT(*) AS transactions
     FROM fee_records fr
     JOIN batches b ON b.id=fr.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter}
       AND fr.status='paid'
       AND fr.month >= DATE_SUB(DATE_FORMAT(NOW(),'%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(fr.month,'%Y-%m')
     ORDER BY month`,
    params,
  );
  res.json({ success: true, data: rows });
};

// GET /api/analytics/attendance-trend?batch_id=&days=30
exports.attendanceTrend = async (req, res) => {
  const { batch_id, days = 30 } = req.query;

  let sql = `
    SELECT a.date,
      SUM(a.status='present') AS present,
      SUM(a.status='absent')  AS absent,
      SUM(a.status='late')    AS late,
      COUNT(*) AS total
    FROM attendance a
    JOIN batches b ON b.id=a.batch_id
    JOIN institutes i ON i.id=b.institute_id
    WHERE i.teacher_id=? AND a.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
  `;
  const params = [req.user.id, parseInt(days)];

  if (batch_id) {
    sql += ' AND a.batch_id=?';
    params.push(batch_id);
  }
  sql += ' GROUP BY a.date ORDER BY a.date';

  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// GET /api/analytics/student-growth?months=6
exports.studentGrowth = async (req, res) => {
  const { months = 6 } = req.query;
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(s.created_at,'%Y-%m') AS month, COUNT(*) AS new_students
     FROM students s
     JOIN student_batches sb ON sb.student_id=s.id
     JOIN batches b ON b.id=sb.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(s.created_at,'%Y-%m')
     ORDER BY month`,
    [req.user.id, parseInt(months)],
  );
  res.json({ success: true, data: rows });
};

// GET /api/analytics/fee-status?institute_id=&month=
exports.feeStatusBreakdown = async (req, res) => {
  const { institute_id, month } = req.query;
  const monthDate = month ? `${month}-01` : `${new Date().toISOString().slice(0, 7)}-01`;

  const instFilter = institute_id ? 'AND i.id = ?' : '';
  const params = institute_id ? [req.user.id, institute_id, monthDate] : [req.user.id, monthDate];

  const [rows] = await pool.query(
    `SELECT fr.status, COUNT(*) AS count, COALESCE(SUM(fr.amount),0) AS amount
     FROM fee_records fr
     JOIN batches b ON b.id=fr.batch_id
     JOIN institutes i ON i.id=b.institute_id
     WHERE i.teacher_id=? ${instFilter} AND fr.month=?
     GROUP BY fr.status`,
    params,
  );
  res.json({ success: true, data: rows });
};
