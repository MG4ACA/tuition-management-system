'use strict';

// ---------------------------------------------------------------------------
// Tuition Management System – Database Seeder
// ---------------------------------------------------------------------------
// Data summary
//   • 1 teacher  (teacher@tuition.local  / Admin@1234)
//   • 20 student portal accounts  (student1..20@student.local / Student@1234)
//   • 20 parent  portal accounts  (parent1..20@parent.local  / Parent@1234)
//   • 2 institutes, 4 batches, 40 students
//   • Attendance / marks / fees for Dec 2025 – Feb 2026
// ---------------------------------------------------------------------------

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── helpers ─────────────────────────────────────────────────────────────────

/** Return all dates (YYYY-MM-DD) matching dayName inside [start, end]. */
function getDatesForDay(dayName, start, end) {
  const DAY_INDEX = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const target = DAY_INDEX[dayName];
  const dates = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    if (d.getDay() === target) dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Randomly pick present/absent/late based on approximate percentages. */
function pickAttStatus() {
  const r = Math.random() * 100;
  if (r < 87) return 'present';
  if (r < 96) return 'absent';
  return 'late';
}

/** Random float in [min, max] rounded to 2dp. */
function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/** Weighted fee status (70 % paid, 20 % pending, 10 % partial). */
function pickFeeStatus() {
  const r = Math.random() * 100;
  if (r < 70) return 'paid';
  if (r < 90) return 'pending';
  return 'partial';
}

// ── STATIC DATA ─────────────────────────────────────────────────────────────

const STUDENT_NAMES = [
  'Amal Perera',
  'Buddhika Silva',
  'Chamari Fernando',
  'Dinesh Jayasinghe',
  'Eshan Wickrama',
  'Fathima Rizvi',
  'Gamini Dissanayake',
  'Hashini Kumari',
  'Iresha Herath',
  'Janitha Bandara',
  'Kumudu Rathnayake',
  'Lahiru Wijesekara',
  'Malsha Gunaratne',
  'Nimal Seneviratne',
  'Oshada Senarathne',
  'Priyanka Karunarathne',
  'Qasim Nizam',
  'Rashmika Rajapaksa',
  'Saman Pathirana',
  'Tharushi Weerasinghe',
  'Udara Koswatte',
  'Vimukthi Jayawardena',
  'Wasantha Kulathilake',
  'Xenia Mendis',
  'Yasiru Sanjeewa',
  'Zara Farook',
  'Asanka Dissanayake',
  'Binuri Lakshmi',
  'Chanaka Madushan',
  'Dilhari Perera',
  'Eranga Yapa',
  'Firzan Ahmed',
  'Gayan Silva',
  'Hasitha Fernando',
  'Indika Bandara',
  'Janaka Rajapaksa',
  'Kavinga Rathnayake',
  'Lasika Senarathne',
  'Maduni Wickramasinghe',
  'Nadeeka Jayaratne',
];

const PARENT_NAMES = [
  'Priya Perera',
  'Ranjith Silva',
  'Kamani Fernando',
  'Sunil Jayasinghe',
  'Anura Wickrama',
  'Farzana Rizvi',
  'Sirimali Dissanayake',
  'Rohana Kumari',
  'Anoja Herath',
  'Bandula Bandara',
  'Nanda Rathnayake',
  'Sriyani Wijesekara',
  'Piyal Gunaratne',
  'Sarath Seneviratne',
  'Manoj Senarathne',
  'Sumith Karunarathne',
  'Ameer Nizam',
  'Sanjeewa Rajapaksa',
  'Pradeep Pathirana',
  'Nilmini Weerasinghe',
  // extras for unlinked students 21-40
  'Kumari Koswatte',
  'Jayantha Jayawardena',
  'Menike Kulathilake',
  'Bernard Mendis',
  'Shamali Sanjeewa',
  'Firdaus Farook',
  'Nalaka Dissanayake',
  'Susantha Lakshmi',
  'Ramani Madushan',
  'Seetha Perera',
  'Kalyani Yapa',
  'Imran Ahmed',
  'Niluka Silva',
  'Ruwani Fernando',
  'Kumara Bandara',
  'Suneetha Rajapaksa',
  'Priyanthi Rathnayake',
  'Ajith Senarathne',
  'Dilrukshi Wickramasinghe',
  'Sumith Jayaratne',
];

const STUDENT_DOBS = [
  '2008-03-15',
  '2007-11-22',
  '2008-07-10',
  '2009-01-05',
  '2007-09-18',
  '2008-05-25',
  '2009-02-14',
  '2007-12-30',
  '2008-08-19',
  '2009-04-07',
  '2007-06-11',
  '2008-10-03',
  '2009-03-28',
  '2007-07-16',
  '2008-01-23',
  '2009-06-09',
  '2007-08-27',
  '2008-11-14',
  '2009-07-02',
  '2007-10-20',
  '2008-04-08',
  '2009-09-15',
  '2007-02-19',
  '2008-06-24',
  '2009-10-11',
  '2007-04-30',
  '2008-09-06',
  '2009-11-18',
  '2007-05-22',
  '2008-12-01',
  '2009-08-13',
  '2007-03-07',
  '2008-02-26',
  '2009-05-04',
  '2007-01-31',
  '2008-07-17',
  '2009-12-29',
  '2007-09-08',
  '2008-03-22',
  '2009-06-16',
];

// Alternating genders
const GENDERS = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 'male' : 'female'));

// 4 batches definition
const BATCHES_DEF = [
  {
    name: 'Grade 11 Physics – Evening',
    subject: 'Physics',
    grade: 'Grade 11',
    days: 'Monday,Wednesday',
    slot: '16:00 – 18:00',
    fee: 3500.0,
  },
  {
    name: 'Grade 12 Chemistry – Afternoon',
    subject: 'Chemistry',
    grade: 'Grade 12',
    days: 'Tuesday,Thursday',
    slot: '15:00 – 17:00',
    fee: 4000.0,
  },
  {
    name: 'Grade 10 Mathematics – Morning',
    subject: 'Mathematics',
    grade: 'Grade 10',
    days: 'Saturday',
    slot: '09:00 – 11:00',
    fee: 3000.0,
  },
  {
    name: 'Grade 11 Biology – Afternoon',
    subject: 'Biology',
    grade: 'Grade 11',
    days: 'Sunday',
    slot: '14:00 – 16:00',
    fee: 3500.0,
  },
];

// Batch days for attendance generation (batch index → day names)
const BATCH_DAYS = {
  1: ['Monday', 'Wednesday'],
  2: ['Tuesday', 'Thursday'],
  3: ['Saturday'],
  4: ['Sunday'],
};

// Tests per batch
const TESTS_DEF = {
  1: [
    { name: 'Paper 1 – Waves', date: '2025-12-10', total: 50 },
    { name: 'Mid-Term Exam', date: '2026-01-15', total: 100 },
    { name: 'Paper 2 – Mechanics', date: '2026-02-12', total: 75 },
  ],
  2: [
    { name: 'Monthly Test Dec', date: '2025-12-18', total: 100 },
    { name: 'Monthly Test Jan', date: '2026-01-22', total: 100 },
    { name: 'Mock Final', date: '2026-02-19', total: 200 },
  ],
  3: [
    { name: 'Chapter Test 1', date: '2025-12-20', total: 50 },
    { name: 'Mid-Term', date: '2026-01-24', total: 100 },
    { name: 'Chapter Test 2', date: '2026-02-21', total: 50 },
  ],
  4: [
    { name: 'Theory Test', date: '2026-01-11', total: 100 },
    { name: 'Practical Test', date: '2026-02-08', total: 50 },
  ],
};

// Resources
const RESOURCES_DEF = [
  {
    batchId: 1,
    instIdx: 0,
    title: 'Physics Notes – Waves',
    type: 'pdf',
    url: 'https://hasal.lk/resources/waves.pdf',
  },
  {
    batchId: 1,
    instIdx: 0,
    title: 'Mechanics Video Lecture',
    type: 'video_link',
    url: 'https://youtu.be/sample1',
  },
  {
    batchId: 2,
    instIdx: 0,
    title: 'Organic Chemistry Flashcards',
    type: 'pdf',
    url: 'https://hasal.lk/resources/organic.pdf',
  },
  {
    batchId: 2,
    instIdx: 0,
    title: 'Past Paper 2024 – Chemistry',
    type: 'pdf',
    url: 'https://hasal.lk/resources/chem2024.pdf',
  },
  {
    batchId: 3,
    instIdx: 1,
    title: 'Algebra Worksheet',
    type: 'pdf',
    url: 'https://hasal.lk/resources/algebra.pdf',
  },
  {
    batchId: 3,
    instIdx: 1,
    title: 'Geometry Video Tutorial',
    type: 'video_link',
    url: 'https://youtu.be/sample2',
  },
  {
    batchId: 4,
    instIdx: 1,
    title: 'Biology Diagrams Pack',
    type: 'image',
    url: 'https://hasal.lk/resources/bio_diagrams.png',
  },
  {
    batchId: 4,
    instIdx: 1,
    title: 'Cell Biology Notes',
    type: 'pdf',
    url: 'https://hasal.lk/resources/cell.pdf',
  },
  {
    batchId: null,
    instIdx: 0,
    title: 'Study Tips & Techniques',
    type: 'pdf',
    url: 'https://hasal.lk/resources/study_tips.pdf',
  },
  {
    batchId: null,
    instIdx: 1,
    title: 'Exam Strategy Guide',
    type: 'pdf',
    url: 'https://hasal.lk/resources/exam_strategy.pdf',
  },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tuition_ms',
    timezone: '+00:00',
  });

  console.log('✅ Connected to MySQL\n');

  // ── 0. Clear all tables in reverse FK order ──────────────────────────────
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'resources',
    'fee_records',
    'marks',
    'attendance',
    'student_batches',
    'students',
    'batches',
    'institutes',
    'refresh_tokens',
    'users',
  ];
  for (const t of tables) {
    await db.query(`DELETE FROM \`${t}\``);
    await db.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🗑️  Cleared all existing data');

  // ── 1. Hash passwords ─────────────────────────────────────────────────────
  console.log('🔐 Hashing passwords…');
  const [teacherHash, studentHash, parentHash] = await Promise.all([
    bcrypt.hash('Admin@1234', 12),
    bcrypt.hash('Student@1234', 10),
    bcrypt.hash('Parent@1234', 10),
  ]);

  // ── 2. Users ──────────────────────────────────────────────────────────────
  //  id 1 = teacher
  await db.query('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)', [
    'Hasal Mithuranga',
    'teacher@tuition.local',
    teacherHash,
    'teacher',
    '+94771234567',
  ]);

  // ids 2..21 = student portal accounts (first 20 students)
  const studentUserIds = [];
  for (let i = 0; i < 20; i++) {
    const [res] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [
        STUDENT_NAMES[i],
        `student${i + 1}@student.local`,
        studentHash,
        'student',
        `+9477${2000000 + i}`,
      ],
    );
    studentUserIds.push(res.insertId);
  }

  // ids 22..41 = parent portal accounts (first 20 parents)
  const parentUserIds = [];
  for (let i = 0; i < 20; i++) {
    const [res] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [PARENT_NAMES[i], `parent${i + 1}@parent.local`, parentHash, 'parent', `+9477${3000000 + i}`],
    );
    parentUserIds.push(res.insertId);
  }
  console.log(`👤 Inserted ${1 + 20 + 20} users  (1 teacher + 20 students + 20 parents)`);

  // ── 3. Institutes ─────────────────────────────────────────────────────────
  const [r1] = await db.query(
    'INSERT INTO institutes (teacher_id, name, address, phone, email) VALUES (?,?,?,?,?)',
    [
      1,
      'Hasal Institute – Colombo',
      '45 Galle Road, Colombo 03',
      '+94112345678',
      'colombo@hasal.lk',
    ],
  );
  const [r2] = await db.query(
    'INSERT INTO institutes (teacher_id, name, address, phone, email) VALUES (?,?,?,?,?)',
    [1, 'Hasal Institute – Kandy', '12 Peradeniya Road, Kandy', '+94812345678', 'kandy@hasal.lk'],
  );
  const instituteIds = [r1.insertId, r2.insertId];
  console.log('🏫 Inserted 2 institutes');

  // ── 4. Batches ────────────────────────────────────────────────────────────
  const batchIds = [];
  const batchInstMap = [0, 0, 1, 1]; // batch index → institute index
  for (let i = 0; i < BATCHES_DEF.length; i++) {
    const b = BATCHES_DEF[i];
    const [rb] = await db.query(
      'INSERT INTO batches (institute_id, name, subject, grade, day_of_week, time_slot, monthly_fee, max_students) VALUES (?,?,?,?,?,?,?,?)',
      [instituteIds[batchInstMap[i]], b.name, b.subject, b.grade, b.days, b.slot, b.fee, 25],
    );
    batchIds.push(rb.insertId);
  }
  console.log('📚 Inserted 4 batches');

  // ── 5. Students ───────────────────────────────────────────────────────────
  const studentDbIds = [];
  for (let i = 0; i < 40; i++) {
    const linked = i < 20;
    const userId = linked ? studentUserIds[i] : null;
    const parentUId = linked ? parentUserIds[i] : null;
    const stuEmail = linked ? `student${i + 1}@student.local` : `stu${i + 1}@gmail.com`;
    const parEmail = linked ? `parent${i + 1}@parent.local` : `par${i + 1}@gmail.com`;

    const [rs] = await db.query(
      `INSERT INTO students
         (user_id, name, email, phone, dob, gender, address,
          parent_name, parent_phone, parent_email, parent_user_id, qr_token)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        STUDENT_NAMES[i],
        stuEmail,
        `+9477${4000000 + i}`,
        STUDENT_DOBS[i],
        GENDERS[i],
        `${10 + i} Sample Street, Sri Lanka`,
        PARENT_NAMES[i],
        `+9477${5000000 + i}`,
        parEmail,
        parentUId,
        uuidv4(),
      ],
    );
    studentDbIds.push(rs.insertId);
  }
  console.log('🎓 Inserted 40 students  (20 with portal accounts, 20 without)');

  // ── 6. Enrolments ─────────────────────────────────────────────────────────
  // batch 1 (id batchIds[0]): students 1-20
  // batch 2 (id batchIds[1]): students 11-30
  // batch 3 (id batchIds[2]): students 21-35
  // batch 4 (id batchIds[3]): students 26-40
  const rawEnrol = [
    ...Array.from({ length: 20 }, (_, i) => [studentDbIds[i], batchIds[0]]),
    ...Array.from({ length: 20 }, (_, i) => [studentDbIds[i + 10], batchIds[1]]),
    ...Array.from({ length: 15 }, (_, i) => [studentDbIds[i + 20], batchIds[2]]),
    ...Array.from({ length: 15 }, (_, i) => [studentDbIds[i + 25], batchIds[3]]),
  ];
  // de-duplicate
  const seen = new Set();
  const enrolments = rawEnrol.filter(([sid, bid]) => {
    const k = `${sid}-${bid}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  for (const [sid, bid] of enrolments) {
    await db.query(
      'INSERT INTO student_batches (student_id, batch_id, enrolled_at) VALUES (?,?,?)',
      [sid, bid, '2025-11-01'],
    );
  }
  console.log(`📋 Inserted ${enrolments.length} enrolments`);

  // ── 7. Attendance ─────────────────────────────────────────────────────────
  const rangeStart = new Date('2025-12-01');
  const rangeEnd = new Date('2026-02-28');

  // Build a lookup: batchId → batch index
  const batchIdToIdx = Object.fromEntries(batchIds.map((id, idx) => [id, idx]));

  let attCount = 0;
  for (const [sid, bid] of enrolments) {
    const bIdx = batchIdToIdx[bid];
    const batchNum = bIdx + 1; // 1-based key for BATCH_DAYS
    const startTime = BATCHES_DEF[bIdx].slot.slice(0, 5); // "16:00"

    for (const dayName of BATCH_DAYS[batchNum]) {
      for (const dateStr of getDatesForDay(dayName, rangeStart, rangeEnd)) {
        const status = pickAttStatus();
        const scanned = status !== 'absent' ? `${dateStr} ${startTime}:00` : null;

        await db.query(
          'INSERT INTO attendance (student_id, batch_id, date, status, scanned_at) VALUES (?,?,?,?,?)',
          [sid, bid, dateStr, status, scanned],
        );
        attCount++;
      }
    }
  }
  console.log(`📅 Inserted ${attCount} attendance records`);

  // ── 8. Marks ──────────────────────────────────────────────────────────────
  let marksCount = 0;
  for (const [sid, bid] of enrolments) {
    const bIdx = batchIdToIdx[bid];
    const batchNum = bIdx + 1;
    for (const t of TESTS_DEF[batchNum]) {
      const maxObtainable = t.total;
      const minObtainable = t.total * 0.35;
      const obtained = randFloat(minObtainable, maxObtainable);

      await db.query(
        'INSERT INTO marks (student_id, batch_id, test_name, marks_obtained, total_marks, test_date) VALUES (?,?,?,?,?,?)',
        [sid, bid, t.name, obtained, t.total, t.date],
      );
      marksCount++;
    }
  }
  console.log(`📝 Inserted ${marksCount} marks records`);

  // ── 9. Fee records ────────────────────────────────────────────────────────
  const FEE_MONTHS = ['2025-12-01', '2026-01-01', '2026-02-01'];
  let feeCount = 0;

  for (const [sid, bid] of enrolments) {
    const bIdx = batchIdToIdx[bid];
    const fullFee = BATCHES_DEF[bIdx].fee;

    for (const month of FEE_MONTHS) {
      const status = pickFeeStatus();
      const amount = status === 'partial' ? parseFloat((fullFee * 0.5).toFixed(2)) : fullFee;
      const paidAt =
        status === 'paid'
          ? `${month.slice(0, 7)}-28 10:00:00`
          : status === 'partial'
            ? `${month.slice(0, 7)}-15 10:00:00`
            : null;
      const receipt = status === 'paid' ? `REC-B${bid}-S${sid}-${month.slice(0, 7)}` : null;

      await db.query(
        'INSERT INTO fee_records (student_id, batch_id, month, amount, status, paid_at, receipt_number) VALUES (?,?,?,?,?,?,?)',
        [sid, bid, month, amount, status, paidAt, receipt],
      );
      feeCount++;
    }
  }
  console.log(`💰 Inserted ${feeCount} fee records`);

  // ── 10. Resources ─────────────────────────────────────────────────────────
  for (const r of RESOURCES_DEF) {
    await db.query(
      'INSERT INTO resources (batch_id, institute_id, title, type, file_url) VALUES (?,?,?,?,?)',
      [r.batchId ?? null, instituteIds[r.instIdx], r.title, r.type, r.url],
    );
  }
  console.log(`📦 Inserted ${RESOURCES_DEF.length} resources`);

  await db.end();

  console.log(`
╔══════════════════════════════════════════════════════╗
║           ✅  SEEDING COMPLETE                       ║
╠══════════════════════════════════════════════════════╣
║  Login credentials                                   ║
║  ─────────────────────────────────────────────────  ║
║  Teacher  : teacher@tuition.local  / Admin@1234      ║
║  Students : student1..20@student.local / Student@1234║
║  Parents  : parent1..20@parent.local  / Parent@1234  ║
╚══════════════════════════════════════════════════════╝
`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
