const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/resources');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

exports.upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
}).single('file');

// GET /api/resources
exports.getAll = async (req, res) => {
  const { batch_id, institute_id } = req.query;

  let sql = `SELECT r.*, b.name AS batch_name, i.name AS institute_name
             FROM resources r
             LEFT JOIN batches b ON b.id=r.batch_id
             LEFT JOIN institutes i ON i.id=r.institute_id
             WHERE r.is_active=1`;
  const params = [];

  if (batch_id) {
    sql += ' AND r.batch_id=?';
    params.push(batch_id);
  }
  if (institute_id) {
    sql += ' AND r.institute_id=?';
    params.push(institute_id);
  }
  sql += ' ORDER BY r.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json({ success: true, data: rows });
};

// POST /api/resources
exports.create = async (req, res) => {
  const { title, description, type, batch_id, institute_id, file_url } = req.body;
  const uploadedUrl = req.file ? `/uploads/resources/${req.file.filename}` : file_url;

  const [result] = await pool.query(
    'INSERT INTO resources (batch_id, institute_id, title, description, type, file_url) VALUES (?,?,?,?,?,?)',
    [batch_id || null, institute_id || null, title, description, type, uploadedUrl],
  );
  const [rows] = await pool.query('SELECT * FROM resources WHERE id=?', [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
};

// DELETE /api/resources/:id
exports.remove = async (req, res) => {
  const [rows] = await pool.query('SELECT file_url FROM resources WHERE id=?', [req.params.id]);
  if (rows.length && rows[0].file_url?.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '../..', rows[0].file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await pool.query('DELETE FROM resources WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Deleted' });
};
