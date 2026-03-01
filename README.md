# Tuition Management System

Multi-institute tuition management system with QR attendance, fee tracking, marks, and student portal.

**Tech stack:** Vue 3 + PrimeVue 4 + Pinia · Express.js · MySQL · JWT (access + refresh tokens)

---

## Quick Start

### 1. Database
```sql
-- In MySQL Workbench or CLI:
source database/schema.sql
```
This creates the database, all tables, and seeds the default teacher account.

### 2. Backend environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` — set your MySQL credentials (`DB_USER`, `DB_PASSWORD`) and choose strong values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Install dependencies
```bash
npm run install:all
```

### 4. Run (development)
```bash
npm run dev
```
- Frontend: http://localhost:5173  
- Backend API: http://localhost:3000

---

## Default Credentials

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Teacher | teacher@tuition.local  | Admin@1234 |

> Change this password immediately after first login via the profile page.

> Student accounts are created by the teacher from the **Students** page → "Create Portal Account".

---

## Project Structure

```
tution-management-system/
├── database/
│   └── schema.sql          # Full MySQL schema + seed data
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/     # auth.middleware, role.middleware
│   │   ├── controllers/    # auth, institute, batch, student,
│   │   │                   # attendance, marks, fees, analytics, resource
│   │   └── routes/
│   ├── uploads/            # Uploaded resource files (git-ignored)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/axios.js    # Axios + JWT interceptors
    │   ├── router/         # Vue Router with role guards
    │   ├── stores/         # Pinia stores (auth, institute, batch…)
    │   ├── layouts/        # TeacherLayout, StudentLayout
    │   └── pages/
    │       ├── auth/       # LoginPage
    │       ├── teacher/    # Dashboard, Institutes, Batches, Students,
    │       │               # Attendance (QR scanner), Marks, Fees, Resources
    │       └── student/    # Dashboard, MyQRCode, Attendance, Marks, Fees, Resources
    ├── vite.config.js
    └── package.json
```

---

## API Reference (base: `/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | 🔒 | Revoke refresh token |
| GET | `/auth/me` | 🔒 | Current user profile |
| POST | `/auth/change-password` | 🔒 | Change password |
| POST | `/auth/register-student` | Teacher | Create student portal account |
| CRUD | `/institutes` | Teacher | Manage institutes |
| CRUD | `/batches` | Teacher | Manage batches |
| CRUD | `/students` | Teacher | Manage students |
| GET | `/students/me` | Student | Own profile + batches |
| POST | `/attendance/scan` | Teacher | QR scan → mark attendance |
| GET | `/attendance` | Teacher | List attendance records |
| GET | `/attendance/my` | Student | Own attendance history |
| CRUD | `/marks` | Teacher | Manage marks |
| POST | `/marks/bulk` | Teacher | Bulk mark entry |
| GET | `/marks/my` | Student | Own marks |
| GET | `/fees` | Teacher | List fee records |
| POST | `/fees/generate` | Teacher | Generate monthly fees for a batch |
| PUT | `/fees/:id` | Teacher | Update fee status |
| GET | `/fees/my` | Student | Own fee records |
| GET | `/analytics/overview` | Teacher | Dashboard stats |
| GET | `/analytics/revenue-chart` | Teacher | Monthly revenue data |
| GET | `/analytics/attendance-trend` | Teacher | Daily attendance data |
| GET | `/analytics/student-growth` | Teacher | Student growth over time |
| GET | `/analytics/fee-status-breakdown` | Teacher | Fee status distribution |
| CRUD | `/resources` | Teacher/Student | Upload/list learning resources |

---

## Phase 2 (planned)
- Parent portal with read-only student view
- WhatsApp / SMS fee reminders
- PDF report generation (marks sheets, fee receipts)
- Push notifications
