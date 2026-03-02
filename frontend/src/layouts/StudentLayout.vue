<template>
  <div class="layout-wrapper">
    <!-- Top Navbar -->
    <header class="topbar">
      <div class="flex align-items-center gap-2">
        <i class="pi pi-graduation-cap text-primary text-xl" />
        <span class="font-bold">TuitionMS</span>
        <Tag value="Student" severity="success" class="ml-2 badge-tag" />
      </div>
      <nav class="desktop-nav flex gap-2">
        <RouterLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          active-class="active"
        >
          <i :class="['pi', item.icon]" />
          <span class="ml-1">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="flex align-items-center gap-2">
        <Avatar :label="authStore.user?.name?.[0]" shape="circle" size="small" />
        <span class="text-sm user-name">{{ authStore.user?.name }}</span>
        <Button
          icon="pi pi-sign-out"
          text
          rounded
          size="small"
          v-tooltip="'Logout'"
          @click="authStore.logout()"
        />
      </div>
    </header>

    <main class="page-content">
      <RouterView />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <RouterLink
        v-for="item in menuItems"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        active-class="active"
      >
        <i :class="['pi', item.icon]" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth.store';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const authStore = useAuthStore();

const menuItems = [
  { to: '/student', icon: 'pi-home', label: 'Dashboard' },
  { to: '/student/qr', icon: 'pi-qrcode', label: 'My QR' },
  { to: '/student/attendance', icon: 'pi-calendar', label: 'Attendance' },
  { to: '/student/marks', icon: 'pi-chart-bar', label: 'Marks' },
  { to: '/student/fees', icon: 'pi-wallet', label: 'Fees' },
  { to: '/student/resources', icon: 'pi-folder', label: 'Resources' },
];
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--p-surface-ground);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  gap: 1rem;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.desktop-nav {
  display: flex;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.nav-link:hover {
  background: var(--p-surface-hover);
}
.nav-link.active {
  background: var(--p-primary-color);
  color: white;
}
.nav-link.active i {
  color: white;
}

.page-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* Mobile bottom nav (hidden on desktop) */
.mobile-bottom-nav {
  display: none;
}

/* ──────────────────────────────────────────────
   Mobile  (< 768px)
────────────────────────────────────────────── */
@media (max-width: 767px) {
  .topbar {
    padding: 0 0.75rem;
    height: 54px;
    gap: 0.5rem;
  }

  /* Hide nav links and user name on mobile—bottom nav takes over */
  .desktop-nav {
    display: none;
  }

  .user-name {
    display: none;
  }

  .badge-tag {
    display: none;
  }

  .page-content {
    padding: 0.75rem;
    padding-bottom: calc(64px + env(safe-area-inset-bottom) + 0.75rem);
    max-width: 100%;
  }

  /* Show bottom nav */
  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 500;
    height: 64px;
    background: color-mix(in srgb, var(--p-surface-card) 78%, transparent);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-top: 1px solid color-mix(in srgb, var(--p-surface-border) 50%, transparent);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    text-decoration: none;
    color: var(--p-text-color-secondary);
    font-size: 0.65rem;
    font-weight: 500;
    padding: 0.25rem 0;
    position: relative;
    transition: color 0.2s;
    border-top: none;
  }

  .bottom-nav-item::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 52px;
    height: 30px;
    border-radius: 15px;
    background: transparent;
    transition: background 0.2s;
  }

  .bottom-nav-item i {
    font-size: 1.2rem;
    position: relative;
    z-index: 1;
  }

  .bottom-nav-item span {
    position: relative;
    z-index: 1;
  }

  .bottom-nav-item:hover {
    color: var(--p-primary-color);
  }

  .bottom-nav-item.active {
    color: var(--p-primary-color);
  }

  .bottom-nav-item.active::before {
    background: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
  }
}

/* ──────────────────────────────────────────────
   Tablet  (768px – 1024px)
────────────────────────────────────────────── */
@media (min-width: 768px) and (max-width: 1024px) {
  .topbar {
    padding: 0 1rem;
    gap: 0.5rem;
  }

  .nav-link {
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
  }

  .page-content {
    padding: 1rem;
  }
}
</style>
