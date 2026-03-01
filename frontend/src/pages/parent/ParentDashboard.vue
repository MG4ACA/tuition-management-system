<template>
  <div>
    <div
      v-if="loading"
      class="flex justify-content-center align-items-center"
      style="min-height: 200px"
    >
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <template v-else-if="child">
      <!-- Header -->
      <div
        class="surface-card border-round-xl border-1 surface-border p-4 mb-4 flex align-items-center gap-4 flex-wrap"
      >
        <Avatar
          :label="child.name?.[0]"
          size="xlarge"
          shape="circle"
          style="background: var(--p-primary-color); color: #fff; font-size: 1.5rem"
        />
        <div class="flex-1 min-w-0">
          <h2 class="m-0 text-2xl">{{ child.name }}</h2>
          <div class="text-color-secondary text-sm mt-1 flex gap-3 flex-wrap">
            <span v-if="child.email">
              <i class="pi pi-envelope mr-1" />
              {{ child.email }}
            </span>
            <span v-if="child.phone">
              <i class="pi pi-phone mr-1" />
              {{ child.phone }}
            </span>
            <span v-if="child.gender" class="capitalize">{{ child.gender }}</span>
          </div>
        </div>
        <div class="flex flex-column align-items-end gap-1">
          <span class="text-xs text-color-secondary">Student since</span>
          <span class="font-medium">{{ child.created_at?.split('T')[0] }}</span>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-4">
          <div class="surface-card border-round-xl border-1 surface-border p-4 text-center">
            <div
              class="text-3xl font-bold"
              :class="child.summary.attendance_rate >= 75 ? 'text-green-500' : 'text-orange-500'"
            >
              {{ child.summary.attendance_rate }}%
            </div>
            <ProgressBar
              :value="child.summary.attendance_rate"
              :pt="{
                value: {
                  style: {
                    background: child.summary.attendance_rate >= 75 ? '#22c55e' : '#f59e0b',
                  },
                },
              }"
              class="mt-2"
              style="height: 6px"
              :show-value="false"
            />
            <div class="text-xs text-color-secondary mt-1">
              Attendance Rate ({{ child.summary.total_classes }} classes)
            </div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="surface-card border-round-xl border-1 surface-border p-4 text-center">
            <div class="text-3xl font-bold">{{ child.batches?.length ?? 0 }}</div>
            <div class="text-xs text-color-secondary mt-1">Enrolled Batches</div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div
            class="surface-card border-round-xl border-1 surface-border p-4 text-center"
            :class="child.summary.pending_fees > 0 ? 'border-orange-400' : 'border-green-400'"
          >
            <div
              class="text-3xl font-bold"
              :class="child.summary.pending_fees > 0 ? 'text-orange-500' : 'text-green-500'"
            >
              {{ child.summary.pending_fees }}
            </div>
            <div class="text-xs text-color-secondary mt-1">Pending Fee Records</div>
          </div>
        </div>
      </div>

      <!-- Enrolled batches -->
      <div class="surface-card border-round-xl border-1 surface-border p-4 mb-4">
        <h3 class="mt-0 mb-3">Enrolled Batches</h3>
        <div v-if="child.batches?.length" class="grid m-0">
          <div v-for="b in child.batches" :key="b.id" class="col-12 md:col-6 lg:col-4">
            <div class="p-3 border-1 surface-border border-round-lg">
              <div class="font-semibold">{{ b.name }}</div>
              <div class="text-sm text-color-secondary">{{ b.subject }} · {{ b.grade }}</div>
              <div class="text-xs text-color-secondary mt-1">{{ b.institute_name }}</div>
              <div class="text-xs mt-1">{{ b.day_of_week }} · {{ b.time_slot }}</div>
            </div>
          </div>
        </div>
        <p v-else class="text-color-secondary m-0">Not enrolled in any batch.</p>
      </div>

      <!-- Quick alerts -->
      <Message v-if="child.summary.pending_fees > 0" severity="warn" :closable="false">
        <template #default>
          <RouterLink to="/parent/fees" class="font-medium">
            {{ child.summary.pending_fees }} pending fee record(s) — click to view details.
          </RouterLink>
        </template>
      </Message>
    </template>

    <Message v-else severity="error" :closable="false">
      No student record is linked to this parent account. Please contact the teacher.
    </Message>
  </div>
</template>

<script setup>
import { useParentStore } from '@/stores/parent.store';
import Avatar from 'primevue/avatar';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import { onMounted, ref } from 'vue';

const parentStore = useParentStore();
const child = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    child.value = await parentStore.getChild();
  } catch {
    /* 404 handled by showing error message */
  } finally {
    loading.value = false;
  }
});
</script>
