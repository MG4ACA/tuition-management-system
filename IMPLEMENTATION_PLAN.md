# Implementation Plan — Multi-Institute Tuition Management System

## 1. Project Overview

A full-stack web application for a private tuition teacher to manage multiple institutes, student batches, attendance (QR-based), fees, marks, and learning resources — with separate portals for the teacher and students.

**Monorepo layout:**

```
tution-management-system/
├── backend/          Express.js REST API
├── frontend/         Vue 3 SPA
└── database/         MySQL schema + seed
```

---

## 2. Tech Stack

| Layer                | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| Frontend framework   | Vue 3 (Composition API, `<script setup>`)                     |
| UI component library | PrimeVue 4 with Aura theme                                    |
| CSS utility          | PrimeFlex 3                                                   |
| State management     | Pinia 2                                                       |
| Routing              | Vue Router 4                                                  |
| HTTP client          | Axios (JWT interceptor + silent refresh)                      |
| Backend framework    | Express.js 4                                                  |
| Database driver      | mysql2 (Promise pool)                                         |
| Authentication       | JWT — access token (15 m) + refresh token (7 d, DB-persisted) |
| Password hashing     | bcryptjs                                                      |
| QR generation        | qrcode (canvas, client-side)                                  |
| QR scanning          | html5-qrcode (camera API)                                     |
| Charts               | Chart.js 4                                                    |
| File uploads         | multer                                                        |
| Security             | helmet, cors, express-rate-limit                              |

---

## 3. User Roles

| Role        | Access                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **Teacher** | Full system admin — institutes, batches, students, attendance, marks, fees, resources, analytics |
| **Student** | Read-only portal — own QR code, attendance history, marks, fees, resources                       |
| **Parent**  | _(Phase 2)_                                                                                      |

---

## 4. Database Schema (10 tables)

```
users               id, name, email, password_hash, role, phone, created_at
refresh_tokens      id, user_id→users, token, expires_at, created_at
institutes          id, teacher_id→users, name, address, phone, created_at
batches             id, institute_id→institutes, name, subject, grade,
                    monthly_fee, day_of_week(SET), time_start, time_end, is_active
students            id, user_id→users(nullable), name, phone, email,
                    parent_name, parent_phone, qr_token(UUID), created_at
student_batches     student_id→students, batch_id→batches, enrolled_at (PK composite)
attendance          id, student_id, batch_id, date, status(present/absent/late),
                    scanned_at  UNIQUE(student_id, batch_id, date)
marks               id, student_id, batch_id, test_name, test_date,
                    marks_obtained, total_marks, percentage, remarks
fee_records         id, student_id, batch_id, month(DATE first-of-month),
                    amount, status(pending/paid/partial/waived),
                    receipt_number(auto RCP-{ts}), notes, paid_at
resources           id, batch_id, title, description, type(file/link/note),
                    file_path, link_url, created_by→users, created_at
```

---

## 5. API Endpoints

### Auth (`/api/auth`)

| Method | Path                | Role    | Description                                           |
| ------ | ------------------- | ------- | ----------------------------------------------------- |
| POST   | `/login`            | Public  | Returns access + refresh tokens                       |
| POST   | `/refresh`          | Public  | Rotate refresh token                                  |
| POST   | `/logout`           | Any     | Revoke refresh token                                  |
| GET    | `/me`               | Any     | Current user info                                     |
| POST   | `/change-password`  | Any     | Change password, revoke all refresh tokens            |
| POST   | `/register-student` | Teacher | Create student portal account, link to student record |

### Institutes (`/api/institutes`)

Full CRUD — teacher only.

### Batches (`/api/batches`)

Full CRUD — teacher only. Filtered by `institute_id`.

### Students (`/api/students`)

| Method | Path                    | Role                                           |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/`                     | Teacher — search, filter by institute/batch    |
| GET    | `/me`                   | Student — own profile + enrolled batches       |
| GET    | `/qr/:token`            | Teacher — lookup by QR token (attendance scan) |
| POST   | `/`                     | Teacher — create + enroll in batch_ids         |
| PUT    | `/:id`                  | Teacher                                        |
| DELETE | `/:id`                  | Teacher                                        |
| POST   | `/:id/enroll`           | Teacher                                        |
| DELETE | `/:id/batches/:batchId` | Teacher                                        |

### Attendance (`/api/attendance`)

| Method | Path    | Role                                                             |
| ------ | ------- | ---------------------------------------------------------------- |
| POST   | `/scan` | Teacher — upsert record from QR token, return fee_status warning |
| GET    | `/`     | Teacher — list, filter by batch/date/status                      |
| GET    | `/my`   | Student — own history                                            |
| POST   | `/`     | Teacher — manual entry                                           |
| PUT    | `/:id`  | Teacher                                                          |

### Marks (`/api/marks`)

| Method | Path    | Role                                  |
| ------ | ------- | ------------------------------------- |
| GET    | `/`     | Teacher                               |
| GET    | `/my`   | Student                               |
| POST   | `/`     | Teacher                               |
| POST   | `/bulk` | Teacher — batch entry for whole class |
| PUT    | `/:id`  | Teacher                               |
| DELETE | `/:id`  | Teacher                               |

### Fees (`/api/fees`)

| Method | Path                         | Role                                                |
| ------ | ---------------------------- | --------------------------------------------------- |
| GET    | `/`                          | Teacher — filter by batch/status/month              |
| GET    | `/my`                        | Student — own records                               |
| GET    | `/pending-students/:batchId` | Teacher                                             |
| POST   | `/generate`                  | Teacher — bulk INSERT IGNORE for month              |
| PUT    | `/:id`                       | Teacher — set status, auto-generate receipt on paid |

### Analytics (`/api/analytics`) — Teacher only

| Path                    | Returns                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `/overview`             | Total students/batches/institutes, revenue this+last month, today attendance |
| `/revenue-chart`        | Monthly revenue for last N months                                            |
| `/attendance-trend`     | Daily present count for last N days                                          |
| `/student-growth`       | New students per month                                                       |
| `/fee-status-breakdown` | Count+amount per status                                                      |

All filterable by `institute_id`.

### Resources (`/api/resources`)

Full CRUD — teacher uploads (multer), students read. Filter by `batch_id`.

---

## 6. Frontend Pages

### Teacher portal (`/`)

| Route         | Page       | Key features                                                                       |
| ------------- | ---------- | ---------------------------------------------------------------------------------- |
| `/`           | Dashboard  | 4 stat cards, 4 Chart.js charts, institute filter                                  |
| `/institutes` | Institutes | CRUD dialog, table                                                                 |
| `/batches`    | Batches    | CRUD dialog, institute filter, day-of-week multi-select                            |
| `/students`   | Students   | CRUD dialog, batch enrollment, "Create Portal Account"                             |
| `/attendance` | Attendance | `html5-qrcode` camera scanner, fee-status warning tag, today's table, manual entry |
| `/marks`      | Marks      | Single + bulk DataTable entry dialogs                                              |
| `/fees`       | Fees       | Generate monthly fees, update status chips (paid/pending/partial/waived)           |
| `/resources`  | Resources  | File upload + link add, card grid, delete                                          |

### Student portal (`/student`)

| Route                 | Page               | Key features                                                                   |
| --------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `/student`            | Dashboard          | Profile card, attendance rate ProgressBar, pending fees alert, recent activity |
| `/student/qr`         | My QR Code         | `qrcode` canvas render, download button                                        |
| `/student/attendance` | Attendance History | Present/Late/Absent summary cards, full DataTable                              |
| `/student/marks`      | Test Results       | Score band summary, colored ProgressBar per score                              |
| `/student/fees`       | My Fees            | Pending total highlighted, receipt numbers, month labels                       |
| `/student/resources`  | Resources          | Card grid, search + batch + type filters, download/link                        |

---

## 7. Security & Auth Flow

```
Login  →  access_token (15m, memory/localStorage)
                 + refresh_token (7d, DB table refresh_tokens)

Every request: Bearer {access_token} in Authorization header

401 response → Axios interceptor silently calls POST /auth/refresh
             → new access_token + new refresh_token (rotation)
             → retry original request

Logout / change-password → DELETE from refresh_tokens (revoke)
```

- Rate limit: 200 req / 15 min per IP
- Helmet security headers on all responses
- CORS restricted to `CLIENT_ORIGIN`
- Passwords: bcrypt cost factor 12

---

## 8. QR Attendance Flow

```
Teacher creates student → backend generates UUID qr_token → stored in students.qr_token

Student portal /qr → qrcode.toCanvas(qr_token) → displayed + downloadable

Teacher's Attendance page → html5-qrcode reads camera
  → decodes UUID → POST /api/attendance/scan { token }
  → backend: student lookup → enrollment check → UPSERT attendance
  → returns { student_name, status, fee_status }
  → frontend shows green/orange toast with fee warning if pending
```

---

## 9. Phase 1 — Completed ✅

- [x] Database schema (10 tables) + seed data (default teacher account)
- [x] Backend: Express app, all 9 controllers + routes, 2 middleware
- [x] JWT auth with refresh token rotation
- [x] QR attendance scanning (camera + manual fallback)
- [x] Fee management with bulk generation + status tracking
- [x] Marks management with bulk entry
- [x] Learning resources (file upload + links)
- [x] Cross-institute analytics dashboard (5 chart endpoints)
- [x] Teacher portal (8 pages)
- [x] Student portal (6 pages)
- [x] Axios JWT interceptor with silent refresh
- [x] Vue Router with role-based navigation guards
- [x] All Pinia stores (8 stores)
- [x] Responsive layouts (collapsible sidebar for teacher, clean nav for student)

---

## 10. Phase 2 — Parent Portal ✅

**Scope:** Read-only portal for parents to monitor their child's attendance, marks, and fees.

**DB change — added to `students` table:**

```sql
parent_user_id INT UNSIGNED NULL  -- FK → users(id), set when parent account is created
-- Existing DB migration:
ALTER TABLE students
  ADD COLUMN parent_user_id INT UNSIGNED NULL AFTER parent_email,
  ADD CONSTRAINT fk_stu_parent_user FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL;
```

**New backend files:**

- `backend/src/controllers/parent.controller.js` — `getChild`, `getAttendance`, `getMarks`, `getFees`
- `backend/src/routes/parent.routes.js` — all routes require `authenticate + authorize('parent')`
- `backend/src/app.js` — mounted at `/api/parent`
- `backend/src/controllers/auth.controller.js` — added `registerParent` (teacher creates account, links to student)
- `backend/src/routes/auth.routes.js` — `POST /auth/register-parent`

**New frontend files:**

- `frontend/src/stores/parent.store.js`
- `frontend/src/layouts/ParentLayout.vue` — top navbar with "Parent" tag, 4 nav items
- `frontend/src/pages/parent/ParentDashboard.vue` — child profile, attendance rate, enrolled batches, pending-fee alert
- `frontend/src/pages/parent/ParentAttendance.vue` — attendance DataTable, batch/date-range filters, P/L/A counts
- `frontend/src/pages/parent/ParentMarks.vue` — score bands summary, colored ProgressBar per test
- `frontend/src/pages/parent/ParentFees.vue` — outstanding balance, full fee history, payment reminder message

**Modified files:**

- `frontend/src/router/index.js` — parent routes added under `/parent`, role guard updated to redirect parents to `/parent`
- `frontend/src/pages/teacher/StudentsPage.vue` — Portal column now shows Student ✓ / Parent ✓ tags; `pi-user-plus` action button opens "Create Parent Portal Account" dialog (pre-fills parent_name/parent_email from student record)

---

## 11. Phase 2 — Notifications (WhatsApp / SMS)

**Options evaluated:**

| Service           | Notes                                     |
| ----------------- | ----------------------------------------- |
| Twilio (WhatsApp) | Best reliability, paid per message        |
| Meta Cloud API    | Free tier, requires business verification |
| Twilio SMS        | Fallback for non-WhatsApp numbers         |

**Trigger points:**

- Fee record status → `pending` : send monthly reminder
- Attendance `absent` : notify parent same day
- New marks published : notify student/parent

**Implementation approach:**

- Add `notification_queue` table: `(id, user_id, type, payload JSON, status, created_at, sent_at)`
- Background worker (node-cron, every 5 min) processes queue
- Retry with exponential backoff on failure

---

## 12. Phase 2 — PDF Reports

**Library:** `pdfkit` (no headless browser needed)

**Report types:**

- **Fee receipt** — triggered when status → `paid`, stored in `uploads/receipts/`
- **Monthly fee report** — all students in a batch for a month
- **Student marks sheet** — all tests in a term, with percentage + grade
- **Attendance report** — monthly per student with calendar-style layout

**Endpoint pattern:**

```
GET /api/reports/fee-receipt/:feeId        → inline PDF
GET /api/reports/marks-sheet/:studentId    → inline PDF
GET /api/reports/attendance/:studentId     → inline PDF
```

---

## 13. Phase 3 — Enhancements (Backlog)

| Feature                    | Notes                                                      |
| -------------------------- | ---------------------------------------------------------- |
| Push notifications         | PWA service worker + Web Push API                          |
| Timetable / schedule view  | Calendar UI (vue-cal or FullCalendar)                      |
| Student fee online payment | Stripe or PayHere (Sri Lanka) integration                  |
| Bulk student import        | CSV upload → parse → insert                                |
| Dark mode                  | PrimeVue built-in dark mode toggle                         |
| Multi-language             | vue-i18n (Sinhala / Tamil / English)                       |
| Audit log                  | `audit_logs` table — track all write operations by teacher |
| Backup & restore           | `mysqldump` scheduled via node-cron, stored in `/backups`  |

---

## 14. Setup & Deployment

### Development

```powershell
# 1. Import database (PowerShell)
cmd /c "mysql -u root -p < database/schema.sql"

# 2. Configure backend
Copy-Item backend/.env.example backend/.env
# Edit DB credentials + JWT secrets in backend/.env

# 3. Install dependencies
npm run install:all

# 4. Run
npm run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:5000
```

### Production (recommended stack)

| Component     | Hosting suggestion                                    |
| ------------- | ----------------------------------------------------- |
| Frontend      | Nginx static files (`npm run build` → `dist/`)        |
| Backend       | Node.js process managed by PM2                        |
| Database      | MySQL 8 on same server or managed (PlanetScale / RDS) |
| Reverse proxy | Nginx → proxy `/api` to Node, serve `dist/` directly  |
| SSL           | Let's Encrypt via Certbot                             |

**PM2 start:**

```bash
pm2 start backend/src/app.js --name tms-api
pm2 save && pm2 startup
```

---

## 15. Environment Variables Reference (`backend/.env`)

| Variable              | Default                 | Description                                      |
| --------------------- | ----------------------- | ------------------------------------------------ |
| `PORT`                | `5000`                  | API server port                                  |
| `NODE_ENV`            | `development`           | `production` disables morgan verbose logs        |
| `DB_HOST`             | `localhost`             | MySQL host                                       |
| `DB_PORT`             | `3306`                  | MySQL port                                       |
| `DB_USER`             | `root`                  | MySQL user                                       |
| `DB_PASSWORD`         | _(set this)_            | MySQL password                                   |
| `DB_NAME`             | `tuition_ms`            | Database name                                    |
| `JWT_ACCESS_SECRET`   | _(set this)_            | Min 32 chars random string                       |
| `JWT_REFRESH_SECRET`  | _(set this)_            | Min 32 chars random string, different from above |
| `JWT_ACCESS_EXPIRES`  | `15m`                   | Access token lifetime                            |
| `JWT_REFRESH_EXPIRES` | `7d`                    | Refresh token lifetime                           |
| `CLIENT_ORIGIN`       | `http://localhost:5173` | CORS allowed origin                              |
| `UPLOAD_DIR`          | `uploads`               | Relative path for uploaded files                 |
| `MAX_FILE_SIZE_MB`    | `10`                    | Max upload size                                  |

---

_Last updated: Phase 1 complete — March 2026_
