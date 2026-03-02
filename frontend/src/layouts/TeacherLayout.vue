<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- Sidebar (desktop/tablet only) -->
    <nav class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div v-if="!sidebarCollapsed" class="brand">
          <i class="pi pi-graduation-cap text-primary text-2xl" />
          <span class="ml-2 font-bold text-lg">TuitionMS</span>
        </div>
        <Button
          :icon="sidebarCollapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"
          text
          rounded
          @click="sidebarCollapsed = !sidebarCollapsed"
          class="collapse-btn"
        />
      </div>

      <!-- Institute Selector -->
      <div v-if="!sidebarCollapsed" class="px-3 py-2">
        <Select
          v-model="selectedInstitute"
          :options="[{ id: null, name: 'All Institutes' }, ...instituteStore.institutes]"
          option-label="name"
          option-value="id"
          placeholder="All Institutes"
          class="w-full text-sm"
          @change="instituteStore.setSelected(selectedInstitute)"
        />
      </div>

      <ul class="sidebar-menu">
        <li v-for="item in menuItems" :key="item.to">
          <RouterLink :to="item.to" class="menu-item" active-class="active">
            <i :class="['pi', item.icon]" />
            <span v-if="!sidebarCollapsed" class="ml-3">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="user-info px-3 py-2">
          <Avatar :label="authStore.user?.name?.[0]" shape="circle" class="mr-2" />
          <div class="text-sm">
            <div class="font-semibold text-overflow-ellipsis overflow-hidden">
              {{ authStore.user?.name }}
            </div>
            <div class="text-xs text-color-secondary">Teacher</div>
          </div>
        </div>
        <Button
          icon="pi pi-sign-out"
          text
          rounded
          v-tooltip.right="'Logout'"
          @click="handleLogout"
          class="logout-btn"
        />
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Desktop topbar -->
      <div class="topbar desktop-topbar">
        <div class="text-xl font-semibold">{{ currentPageTitle }}</div>
        <div class="flex align-items-center gap-2">
          <Tag v-if="selectedInstitute" :value="selectedInstituteName" severity="info" />
          <Avatar :label="authStore.user?.name?.[0]" shape="circle" />
        </div>
      </div>

      <!-- Mobile topbar -->
      <div class="topbar mobile-topbar">
        <div class="mobile-topbar-left">
          <i class="pi pi-graduation-cap text-primary" style="font-size: 1.2rem; flex-shrink: 0" />
          <span class="font-semibold text-base mobile-title">{{ currentPageTitle }}</span>
        </div>
        <div class="mobile-topbar-right">
          <Select
            v-model="selectedInstitute"
            :options="[{ id: null, name: 'All' }, ...instituteStore.institutes]"
            option-label="name"
            option-value="id"
            placeholder="All"
            class="mobile-institute-select"
            @change="instituteStore.setSelected(selectedInstitute)"
          />
          <Avatar :label="authStore.user?.name?.[0]" shape="circle" size="small" />
          <Button
            icon="pi pi-sign-out"
            text
            rounded
            size="small"
            v-tooltip="'Logout'"
            @click="handleLogout"
          />
        </div>
      </div>

      <div class="page-content">
        <RouterView />
      </div>
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
import { useInstituteStore } from '@/stores/institute.store';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const instituteStore = useInstituteStore();
const route = useRoute();

const sidebarCollapsed = ref(false);
const selectedInstitute = ref(null);

const menuItems = [
  { to: '/', icon: 'pi-home', label: 'Dashboard' },
  { to: '/institutes', icon: 'pi-building', label: 'Institutes' },
  { to: '/batches', icon: 'pi-users', label: 'Batches' },
  { to: '/students', icon: 'pi-user', label: 'Students' },
  { to: '/attendance', icon: 'pi-qrcode', label: 'Attendance' },
  { to: '/marks', icon: 'pi-chart-bar', label: 'Marks' },
  { to: '/fees', icon: 'pi-wallet', label: 'Fees' },
  { to: '/resources', icon: 'pi-folder', label: 'Resources' },
];

const currentPageTitle = computed(() => {
  const item = menuItems.find((m) => route.path === m.to || route.path.startsWith(m.to + '/'));
  return item?.label || 'Dashboard';
});

const selectedInstituteName = computed(() => {
  return instituteStore.institutes.find((i) => i.id === selectedInstitute.value)?.name || 'All';
});

onMounted(() => instituteStore.fetchAll());

async function handleLogout() {
  await authStore.logout();
}
</script>

<style scoped>
/* ──────────────────────────────────────────────
   Base layout (desktop)
────────────────────────────────────────────── */
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--p-surface-ground);
}

.sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--p-surface-card);
  border-right: 1px solid var(--p-surface-border);
  display: flex;
  flex-direction: column;
  transition:
    width 0.2s ease,
    min-width 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  min-height: 64px;
}

.brand {
  display: flex;
  align-items: center;
}

.collapse-btn {
  margin-left: auto;
}

.sidebar-menu {
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.65rem 1rem;
  color: var(--p-text-color);
  text-decoration: none;
  border-radius: 8px;
  margin: 2px 8px;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.menu-item:hover {
  background: var(--p-surface-hover);
}
.menu-item.active {
  background: var(--p-primary-color);
  color: white;
}
.menu-item.active i {
  color: white;
}

.sidebar-footer {
  border-top: 1px solid var(--p-surface-border);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.logout-btn {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 64px;
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Topbar variants */
.mobile-topbar {
  display: none;
}
.desktop-topbar {
  display: flex;
}

/* Mobile bottom nav (hidden on desktop) */
.mobile-bottom-nav {
  display: none;
}

/* ──────────────────────────────────────────────
   Mobile  (< 768px)
────────────────────────────────────────────── */
@media (max-width: 767px) {
  .layout-wrapper {
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
  }

  /* Hide sidebar completely on mobile */
  .sidebar {
    display: none;
  }

  .main-content {
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* Switch topbars */
  .desktop-topbar {
    display: none;
  }
  .mobile-topbar {
    display: flex;
    height: 56px;
    padding: 0 0.75rem;
    gap: 0.5rem;
  }

  .mobile-institute-select {
    max-width: 110px;
    font-size: 0.75rem;
  }

  .page-content {
    padding: 0.75rem;
    padding-bottom: calc(64px + env(safe-area-inset-bottom) + 0.75rem);
    overflow-y: auto;
    flex: 1;
  }

  .mobile-topbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .mobile-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-topbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
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
    font-size: 0.58rem;
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
    font-size: 1.15rem;
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
</style>
