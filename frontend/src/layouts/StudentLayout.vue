<template>
  <div class="layout-wrapper">
    <!-- Top Navbar -->
    <header class="topbar">
      <div class="flex align-items-center gap-2">
        <i class="pi pi-graduation-cap text-primary text-xl" />
        <span class="font-bold">TuitionMS</span>
        <Tag value="Student" severity="success" class="ml-2" />
      </div>
      <nav class="flex gap-2">
        <RouterLink v-for="item in menuItems" :key="item.to" :to="item.to" class="nav-link" active-class="active">
          <i :class="['pi', item.icon]" />
          <span class="hidden md:inline ml-1">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="flex align-items-center gap-2">
        <Avatar :label="authStore.user?.name?.[0]" shape="circle" size="small" />
        <span class="text-sm hidden md:inline">{{ authStore.user?.name }}</span>
        <Button icon="pi pi-sign-out" text rounded size="small" v-tooltip="'Logout'" @click="authStore.logout()" />
      </div>
    </header>

    <main class="page-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth.store';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Tag from 'primevue/tag';

const authStore = useAuthStore();

const menuItems = [
  { to: '/student',           icon: 'pi-home',       label: 'Dashboard' },
  { to: '/student/qr',        icon: 'pi-qrcode',     label: 'My QR' },
  { to: '/student/attendance',icon: 'pi-calendar',   label: 'Attendance' },
  { to: '/student/marks',     icon: 'pi-chart-bar',  label: 'Marks' },
  { to: '/student/fees',      icon: 'pi-wallet',     label: 'Fees' },
  { to: '/student/resources', icon: 'pi-folder',     label: 'Resources' },
];
</script>

<style scoped>
.layout-wrapper { display: flex; flex-direction: column; min-height: 100vh; background: var(--p-surface-ground); }

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
.nav-link:hover { background: var(--p-surface-hover); }
.nav-link.active { background: var(--p-primary-color); color: white; }
.nav-link.active i { color: white; }

.page-content { flex: 1; padding: 1.5rem; max-width: 1000px; margin: 0 auto; width: 100%; }
</style>
