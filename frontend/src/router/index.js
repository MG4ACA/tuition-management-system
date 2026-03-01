import { useAuthStore } from '@/stores/auth.store';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Auth ──────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { layout: 'auth', guestOnly: true },
    },

    // ── Teacher ───────────────────────────────────
    {
      path: '/',
      component: () => import('@/layouts/TeacherLayout.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
      children: [
        {
          path: '',
          name: 'teacher.dashboard',
          component: () => import('@/pages/teacher/DashboardPage.vue'),
        },
        {
          path: 'institutes',
          name: 'teacher.institutes',
          component: () => import('@/pages/teacher/InstitutesPage.vue'),
        },
        {
          path: 'batches',
          name: 'teacher.batches',
          component: () => import('@/pages/teacher/BatchesPage.vue'),
        },
        {
          path: 'students',
          name: 'teacher.students',
          component: () => import('@/pages/teacher/StudentsPage.vue'),
        },
        {
          path: 'attendance',
          name: 'teacher.attendance',
          component: () => import('@/pages/teacher/AttendancePage.vue'),
        },
        {
          path: 'marks',
          name: 'teacher.marks',
          component: () => import('@/pages/teacher/MarksPage.vue'),
        },
        {
          path: 'fees',
          name: 'teacher.fees',
          component: () => import('@/pages/teacher/FeesPage.vue'),
        },
        {
          path: 'resources',
          name: 'teacher.resources',
          component: () => import('@/pages/teacher/ResourcesPage.vue'),
        },
      ],
    },

    // ── Student Portal ────────────────────────────
    {
      path: '/student',
      component: () => import('@/layouts/StudentLayout.vue'),
      meta: { requiresAuth: true, role: 'student' },
      children: [
        {
          path: '',
          name: 'student.dashboard',
          component: () => import('@/pages/student/StudentDashboard.vue'),
        },
        { path: 'qr', name: 'student.qr', component: () => import('@/pages/student/MyQRCode.vue') },
        {
          path: 'attendance',
          name: 'student.attendance',
          component: () => import('@/pages/student/AttendanceHistory.vue'),
        },
        {
          path: 'marks',
          name: 'student.marks',
          component: () => import('@/pages/student/MarksView.vue'),
        },
        {
          path: 'fees',
          name: 'student.fees',
          component: () => import('@/pages/student/MyFees.vue'),
        },
        {
          path: 'resources',
          name: 'student.resources',
          component: () => import('@/pages/student/ResourcesView.vue'),
        },
      ],
    },
    // ── Parent Portal ──────────────────────────────────
    {
      path: '/parent',
      component: () => import('@/layouts/ParentLayout.vue'),
      meta: { requiresAuth: true, role: 'parent' },
      children: [
        {
          path: '',
          name: 'parent.dashboard',
          component: () => import('@/pages/parent/ParentDashboard.vue'),
        },
        {
          path: 'attendance',
          name: 'parent.attendance',
          component: () => import('@/pages/parent/ParentAttendance.vue'),
        },
        {
          path: 'marks',
          name: 'parent.marks',
          component: () => import('@/pages/parent/ParentMarks.vue'),
        },
        {
          path: 'fees',
          name: 'parent.fees',
          component: () => import('@/pages/parent/ParentFees.vue'),
        },
      ],
    },
    // ── 404 ──────────────────────────────────────
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  const roleHome = { teacher: '/', student: '/student', parent: '/parent' };
  const home = roleHome[auth.user?.role] ?? '/';

  if (to.meta.guestOnly && auth.isLoggedIn) {
    return next(home);
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login');
  }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return next(home);
  }

  next();
});

export default router;
