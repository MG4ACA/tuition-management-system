# Tuition Management System — System Overview

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vue 3, Vite, Pinia (state management), Vue Router |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (`tuition_ms`) |
| **Auth** | JWT — access token (15 min) + refresh token (7 days, rotating) |
| **File Storage** | Local filesystem (`/backend/uploads`), served as static |
| **Security** | Helmet, CORS, Rate-limiting (200 req / 15 min per IP) |

---

## 2. Project Structure

```
tution-management-system/
├── backend/
│   └── src/
│       ├── app.js                  # Express entry point
│       ├── config/db.js            # MySQL connection pool (mysql2/promise)
│       ├── controllers/            # Business logic (one file per domain)
│       ├── middleware/
│       │   ├── auth.middleware.js  # JWT verification → req.user
│       │   └── role.middleware.js  # Role-based access control
│       └── routes/                 # Express routers (one file per domain)
├── frontend/
│   └── src/
│       ├── api/axios.js            # Axios instance with token injection + refresh interceptor
│       ├── router/index.js         # Vue Router with role-based navigation guards
│       ├── stores/                 # Pinia stores (one per domain)
│       ├── layouts/                # TeacherLayout / StudentLayout / ParentLayout
│       └── pages/                  # Page components grouped by role
└── database/
    └── schema.sql                  # Full MySQL schema + seed data
```

---

## 3. Database Schema (10 Tables)

### Ownership Chain

```
users (teacher)
  └── institutes
        └── batches
              └── student_batches ──── students ──── users (student / parent)
                    ├── attendance
                    ├── marks
                    ├── fee_records
                    └── resources
```

### Table Reference

| # | Table | Primary Purpose | Key Columns |
|---|---|---|---|
| 1 | `users` | Login accounts for all roles | `id`, `email`, `password_hash`, `role` (teacher\|student\|parent) |
| 2 | `refresh_tokens` | JWT refresh token persistence & rotation | `user_id` FK, `token`, `expires_at` |
| 3 | `institutes` | Teacher-owned tuition centres | `teacher_id` FK → users |
| 4 | `batches` | Class/subject groups within an institute | `institute_id` FK, `monthly_fee`, `day_of_week`, `time_slot` |
| 5 | `students` | Academic profile (created by teacher) | `user_id` FK (nullable), `parent_user_id` FK (nullable), `qr_token` UUID |
| 6 | `student_batches` | Many-to-many enrollment join table | `student_id` FK, `batch_id` FK, UNIQUE (student + batch) |
| 7 | `attendance` | Per-class attendance records | `student_id`, `batch_id`, `date`, `status` (present\|absent\|late), `scanned_at` |
| 8 | `marks` | Test/exam results | `student_id`, `batch_id`, `test_name`, `marks_obtained`, `total_marks` |
| 9 | `fee_records` | Monthly fee billing per student per batch | `month` (YYYY-MM-01), `status` (pending\|paid\|partial\|waived), `receipt_number` |
| 10 | `resources` | Learning materials (PDF / video / image) | `batch_id` FK (nullable), `institute_id` FK (nullable), `file_url` |

### Important Design Decisions

**`students` vs `users` — Dual Identity**

A student exists as two separate records:

- `students` row — academic profile with full details (name, dob, gender, address, parent info, QR token). Created by the teacher. Always exists.
- `users` row — login credentials only. Created *optionally* later via `POST /api/auth/register-student`. Linked back via `students.user_id`.

The same pattern applies to parents via `students.parent_user_id` → `users` (role=parent).

A student's QR code, attendance, marks, and fees all work without a `users` row — the teacher manages everything. The `users` row is only needed when the student (or parent) needs portal login access.

**Tenant Isolation**

Every teacher-facing query joins through `institutes WHERE teacher_id = req.user.id`. A teacher can never read or modify another teacher's data.

**UNIQUE Constraints**

- `attendance`: UNIQUE (student_id, batch_id, date) — one attendance record per student per class per day
- `fee_records`: UNIQUE (student_id, batch_id, month) — one fee record per student per batch per month
- `student_batches`: UNIQUE (student_id, batch_id) — no duplicate enrollments

---

## 4. Backend API

### Middleware Pipeline

```
Request → helmet → cors → rate-limit → authenticate (JWT) → authorize (role) → controller → MySQL
```

**`authenticate`** — Verifies the `Bearer` token from `Authorization` header, confirms user still exists and is active in DB, attaches `req.user = { id, name, email, role }`.

**`authorize(...roles)`** — Checks `req.user.role` is in the allowed list, returns 403 otherwise.

### API Endpoints

| Route | Method(s) | Role | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Email + password → access token + refresh token |
| `/api/auth/refresh` | POST | Public | Rotate refresh token → new token pair |
| `/api/auth/logout` | POST | Public | Revoke refresh token |
| `/api/auth/me` | GET | Any | Current user profile |
| `/api/auth/change-password` | POST | Any | Change password, revoke all refresh tokens |
| `/api/auth/register-student` | POST | Teacher | Create `users` row + link to `students.user_id` |
| `/api/auth/register-parent` | POST | Teacher | Create `users` row + link to `students.parent_user_id` |
| `/api/institutes` | GET, POST, PUT, DELETE | Teacher | Full CRUD on institutes owned by teacher |
| `/api/batches` | GET, POST, PUT, DELETE | Teacher | Full CRUD on batches under teacher's institutes |
| `/api/students` | GET, POST, PUT, DELETE | Teacher | Full CRUD on student profiles |
| `/api/students/me` | GET | Student | Own academic profile + enrolled batches |
| `/api/students/by-qr/:token` | GET | Teacher/Student | Lookup student by QR UUID |
| `/api/students/:id/enroll` | POST | Teacher | Enroll student into a batch |
| `/api/students/:id/enroll/:batch_id` | DELETE | Teacher | Remove enrollment |
| `/api/attendance/scan` | POST | Teacher | QR scan → mark present + return fee status |
| `/api/attendance` | GET, POST, PUT, DELETE | Teacher | Manual attendance CRUD |
| `/api/marks` | GET, POST, PUT, DELETE | Teacher | Test result CRUD |
| `/api/marks/bulk` | POST | Teacher | Bulk marks entry for an entire batch/test |
| `/api/marks/student-me` | GET | Student | Own marks with percentage calculated |
| `/api/fees` | GET, PUT | Teacher | List and update fee records |
| `/api/fees/generate` | POST | Teacher | Auto-generate monthly fee records for a batch |
| `/api/fees/pending-students` | GET | Teacher | Students with pending/partial fees for a batch+month |
| `/api/fees/student-me` | GET | Student | Own fee records |
| `/api/resources` | GET, POST, PUT, DELETE | Teacher/Student | Learning materials |
| `/api/parent/child` | GET | Parent | Child's profile + batches + summary stats |
| `/api/parent/attendance` | GET | Parent | Child's attendance records (filterable) |
| `/api/parent/marks` | GET | Parent | Child's marks |
| `/api/parent/fees` | GET | Parent | Child's fee records |
| `/api/analytics/overview` | GET | Teacher | Counts: students, batches, institutes, revenue, today's attendance |
| `/api/analytics/revenue` | GET | Teacher | Monthly revenue chart (configurable months) |
| `/api/analytics/attendance-trend` | GET | Teacher | Daily attendance trend chart |

---

## 5. Frontend

### Role Portals & Routing

Vue Router enforces role isolation via `beforeEach` navigation guards. Unauthenticated users are sent to `/login`; authenticated users accessing the wrong role's route are redirected to their own home.

| Portal | Base Path | Layout | Pages |
|---|---|---|---|
| **Teacher** | `/` | `TeacherLayout` | Dashboard, Institutes, Batches, Students, Attendance, Marks, Fees, Resources |
| **Student** | `/student` | `StudentLayout` | Dashboard, My QR Code, Attendance History, Marks, My Fees, Resources |
| **Parent** | `/parent` | `ParentLayout` | Dashboard, Attendance, Marks, Fees |

### State Management (Pinia Stores)

One store per domain, mirroring the backend API:

`auth` · `institute` · `batch` · `student` · `attendance` · `marks` · `fees` · `analytics` · `resource` · `parent`

### Axios Instance (`/api/axios.js`)

- **Request interceptor** — Automatically injects `Authorization: Bearer <accessToken>` on every request.
- **Response interceptor** — On `401 Token expired`, silently calls `POST /api/auth/refresh`, stores new tokens, and retries the original request. On any other auth failure, logs the user out and redirects to `/login`.

### Auth Persistence

Tokens and user profile are stored in `localStorage` under keys: `tms_access_token`, `tms_refresh_token`, `tms_user`. The Pinia auth store is initialised from these on page load.

---

## 6. Key Data Flows

### QR Code Attendance Scan

```
Teacher opens scanner in app
  → scans student QR code (UUID)
  → POST /api/attendance/scan { qr_token, batch_id }
    → API looks up student by qr_token
    → verifies student is enrolled in that batch (student_batches)
    → UPSERT attendance record (present) for today
    → checks fee_records for current month
  → returns: student name, date, fee_status
```

### Student Registration & Portal Activation

```
1. Teacher creates student:
   POST /api/students { name, email, batch_ids... }
   → INSERT students (qr_token auto-generated as UUID)
   → INSERT student_batches (bulk enroll)

2. (Optional) Teacher activates student portal:
   POST /api/auth/register-student { student_id, email, password }
   → INSERT users (role=student)
   → UPDATE students SET user_id = <new users.id>

3. (Optional) Teacher activates parent portal:
   POST /api/auth/register-parent { student_id, email, password }
   → INSERT users (role=parent)
   → UPDATE students SET parent_user_id = <new users.id>
```

### Monthly Fee Generation

```
Teacher selects batch + month
  → POST /api/fees/generate { batch_id, month }
    → fetch monthly_fee from batches
    → fetch all active student_batches for that batch
    → INSERT IGNORE fee_records (one row per student, status=pending)
  → Teacher then marks individual records paid/partial/waived
    → PUT /api/fees/:id { status, amount, paid_at }
    → receipt_number auto-generated on status=paid (RCP-<timestamp>)
```

### Parent Portal Access

```
Parent logs in (users row with role=parent)
  → GET /api/parent/child
    → resolves student via students WHERE parent_user_id = req.user.id
    → returns: profile, enrolled batches, attendance rate %, pending fee count
  → All parent routes are read-only
```

---

## 7. Security Model

| Concern | Implementation |
|---|---|
| **Password storage** | bcryptjs, cost factor 12 |
| **Access tokens** | JWT, signed with `JWT_ACCESS_SECRET`, expires in 15 min |
| **Refresh tokens** | JWT, signed with `JWT_REFRESH_SECRET`, expires in 7 days, stored in DB, rotated on every use |
| **Token revocation** | Stored in `refresh_tokens` table; deleted on logout and password change (all sessions) |
| **Rate limiting** | 200 requests / 15 min per IP across all `/api/*` routes |
| **HTTP headers** | Helmet (sets Content-Security-Policy, X-Frame-Options, etc.) |
| **CORS** | Restricted to `CLIENT_ORIGIN` env var (default: `http://localhost:5173`) |
| **Data isolation** | All queries scoped to `teacher_id = req.user.id` via institute join |
| **Role enforcement** | `authorize()` middleware on every protected route |

---

## 8. Default Seed Account

Created by `database/schema.sql`:

| Field | Value |
|---|---|
| Email | `teacher@tuition.local` |
| Password | `Admin@1234` |
| Role | `teacher` |

> **Change this immediately after first login** using `POST /api/auth/change-password`.

---

## 9. Environment Variables (Backend)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | _(empty)_ | MySQL password |
| `DB_NAME` | `tuition_ms` | MySQL database name |
| `JWT_ACCESS_SECRET` | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | — | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | — | `production` switches Morgan to combined log format |
