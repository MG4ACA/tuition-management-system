-- ============================================================
-- Tuition Management System - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS tuition_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tuition_ms;

-- ------------------------------------------------------------
-- 1. USERS  (teacher | student | parent)
-- ------------------------------------------------------------
CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('teacher','student','parent') NOT NULL DEFAULT 'student',
    phone         VARCHAR(20),
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. JWT REFRESH TOKENS
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token      VARCHAR(512) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. INSTITUTES
-- ------------------------------------------------------------
CREATE TABLE institutes (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT UNSIGNED NOT NULL,
    name       VARCHAR(150) NOT NULL,
    address    TEXT,
    phone      VARCHAR(20),
    email      VARCHAR(180),
    logo_url   VARCHAR(255),
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inst_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. BATCHES  (e.g. "Monday 4PM – Grade 11 Physics")
-- ------------------------------------------------------------
CREATE TABLE batches (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institute_id  INT UNSIGNED NOT NULL,
    name          VARCHAR(150) NOT NULL,
    subject       VARCHAR(100),
    grade         VARCHAR(20),
    day_of_week   SET('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    time_slot     VARCHAR(50),            -- e.g. "16:00 – 18:00"
    monthly_fee   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_students  SMALLINT UNSIGNED,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_batch_inst FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. STUDENTS  (profile; user_id is set once student registers portal)
-- ------------------------------------------------------------
CREATE TABLE students (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED,           -- NULL until they create a portal account
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(180),
    phone         VARCHAR(20),
    dob           DATE,
    gender        ENUM('male','female','other'),
    address       TEXT,
    parent_name   VARCHAR(120),
    parent_phone  VARCHAR(20),
    parent_email  VARCHAR(180),
    qr_token      CHAR(36) NOT NULL UNIQUE,   -- UUID for QR code
    notes         TEXT,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 6. STUDENT ↔ BATCH ENROLLMENTS
-- ------------------------------------------------------------
CREATE TABLE student_batches (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id  INT UNSIGNED NOT NULL,
    batch_id    INT UNSIGNED NOT NULL,
    enrolled_at DATE NOT NULL DEFAULT (CURRENT_DATE),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_sb (student_id, batch_id),
    CONSTRAINT fk_sb_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_sb_batch   FOREIGN KEY (batch_id)   REFERENCES batches(id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 7. ATTENDANCE
-- ------------------------------------------------------------
CREATE TABLE attendance (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id  INT UNSIGNED NOT NULL,
    batch_id    INT UNSIGNED NOT NULL,
    date        DATE NOT NULL,
    status      ENUM('present','absent','late') NOT NULL DEFAULT 'present',
    scanned_at  DATETIME,
    notes       VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_att (student_id, batch_id, date),
    CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_batch   FOREIGN KEY (batch_id)   REFERENCES batches(id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8. MARKS / TEST RESULTS
-- ------------------------------------------------------------
CREATE TABLE marks (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      INT UNSIGNED NOT NULL,
    batch_id        INT UNSIGNED NOT NULL,
    test_name       VARCHAR(150) NOT NULL,
    marks_obtained  DECIMAL(6,2) NOT NULL,
    total_marks     DECIMAL(6,2) NOT NULL DEFAULT 100,
    test_date       DATE NOT NULL,
    remarks         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_marks_batch   FOREIGN KEY (batch_id)   REFERENCES batches(id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 9. FEE RECORDS
-- ------------------------------------------------------------
CREATE TABLE fee_records (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id     INT UNSIGNED NOT NULL,
    batch_id       INT UNSIGNED NOT NULL,
    month          DATE NOT NULL,          -- first day of the month
    amount         DECIMAL(10,2) NOT NULL,
    status         ENUM('pending','paid','partial','waived') NOT NULL DEFAULT 'pending',
    paid_at        DATETIME,
    receipt_number VARCHAR(50) UNIQUE,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fee (student_id, batch_id, month),
    CONSTRAINT fk_fee_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_fee_batch   FOREIGN KEY (batch_id)   REFERENCES batches(id)   ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 10. LEARNING RESOURCES
-- ------------------------------------------------------------
CREATE TABLE resources (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id     INT UNSIGNED,           -- NULL = shared across all batches
    institute_id INT UNSIGNED,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    type         ENUM('pdf','video_link','image','other') NOT NULL DEFAULT 'pdf',
    file_url     VARCHAR(500),
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_res_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_res_inst  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- SEED: Default teacher account (password: Admin@1234)
-- Change this immediately after first login!
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, phone)
VALUES (
    'Teacher Admin',
    'teacher@tuition.local',
    '$2a$12$.oZ0nRWAGZWZtK3XdPFs9OthMZec3k.Acua6pUI67cNga3fGJaENC',
    'teacher',
    '+94771234567'
);
