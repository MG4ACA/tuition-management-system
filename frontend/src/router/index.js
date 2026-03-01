import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

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
        { path: '',           name: 'teacher.dashboard',  component: () => import('@/pages/teacher/DashboardPage.vue') },
        { path: 'institutes', name: 'teacher.institutes', component: () => import('@/pages/teacher/InstitutesPage.vue') },
        { path: 'batches',    name: 'teacher.batches',    component: () => import('@/pages/teacher/BatchesPage.vue') },
        { path: 'students',   name: 'teacher.students',   component: () => import('@/pages/teacher/StudentsPage.vue') },
        { path: 'attendance', name: 'teacher.attendance', component: () => import('@/pages/teacher/AttendancePage.vue') },
        { path: 'marks',      name: 'teacher.marks',      component: () => import('@/pages/teacher/MarksPage.vue') },
        { path: 'fees',       name: 'teacher.fees',       component: () => import('@/pages/teacher/FeesPage.vue') },
        { path: 'resources',  name: 'teacher.resources',  component: () => import('@/pages/teacher/ResourcesPage.vue') },
      ],
    },

    // ── Student Portal ────────────────────────────
    {
      path: '/student',
      component: () => import('@/layouts/StudentLayout.vue'),
      meta: { requiresAuth: true, role: 'student' },
      children: [
        { path: '',           name: 'student.dashboard',  component: () => import('@/pages/student/StudentDashboard.vue') },
        { path: 'qr',         name: 'student.qr',         component: () => import('@/pages/student/MyQRCode.vue') },
        { path: 'attendance', name: 'student.attendance', component: () => import('@/pages/student/AttendanceHistory.vue') },
        { path: 'marks',      name: 'student.marks',      component: () => import('@/pages/student/MarksView.vue') },
        { path: 'fees',       name: 'student.fees',       component: () => import('@/pages/student/MyFees.vue') },
        { path: 'resources',  name: 'student.resources',  component: () => import('@/pages/student/ResourcesView.vue') },
      ],
    },

    // ── 404 ──────────────────────────────────────
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  if (to.meta.guestOnly && auth.isLoggedIn) {
    return next(auth.user?.role === 'teacher' ? '/' : '/student');
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login');
  }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return next(auth.user?.role === 'teacher' ? '/' : '/student');
  }

  next();
});

export default router;
