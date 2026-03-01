<template>
  <div>
    <h2 class="mt-0">Attendance History</h2>

    <!-- Summary -->
    <div class="grid mb-4">
      <div class="col-4 text-center">
        <div class="surface-card border-round-xl p-3 border-1 surface-border">
          <div class="text-2xl font-bold text-green-500">{{ counts.present }}</div>
          <div class="text-xs text-color-secondary mt-1">Present</div>
        </div>
      </div>
      <div class="col-4 text-center">
        <div class="surface-card border-round-xl p-3 border-1 surface-border">
          <div class="text-2xl font-bold text-orange-500">{{ counts.late }}</div>
          <div class="text-xs text-color-secondary mt-1">Late</div>
        </div>
      </div>
      <div class="col-4 text-center">
        <div class="surface-card border-round-xl p-3 border-1 surface-border">
          <div class="text-2xl font-bold text-red-500">{{ counts.absent }}</div>
          <div class="text-xs text-color-secondary mt-1">Absent</div>
        </div>
      </div>
    </div>

    <div class="surface-card border-round-xl border-1 surface-border overflow-hidden">
      <DataTable
        :value="records"
        :loading="loading"
        paginator
        :rows="20"
        striped-rows
        class="p-datatable-sm"
        sort-field="date"
        :sort-order="-1"
      >
        <Column field="date" header="Date" sortable>
          <template #body="{ data }">{{ data.date?.split('T')[0] }}</template>
        </Column>
        <Column field="batch_name" header="Batch" sortable />
        <Column field="institute_name" header="Institute" sortable />
        <Column field="status" header="Status">
          <template #body="{ data }">
            <Tag
              :value="data.status"
              :severity="
                data.status === 'present' ? 'success' : data.status === 'late' ? 'warn' : 'danger'
              "
            />
          </template>
        </Column>
        <Column field="scanned_at" header="Scanned At">
          <template #body="{ data }">
            {{ data.scanned_at ? new Date(data.scanned_at).toLocaleTimeString() : '—' }}
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { useAttendanceStore } from '@/stores/attendance.store';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';

const attendanceStore = useAttendanceStore();
const records = ref([]);
const loading = ref(true);

const counts = computed(() => ({
  present: records.value.filter((r) => r.status === 'present').length,
  late: records.value.filter((r) => r.status === 'late').length,
  absent: records.value.filter((r) => r.status === 'absent').length,
}));

onMounted(async () => {
  try {
    records.value = await attendanceStore.getMyAttendance();
  } finally {
    loading.value = false;
  }
});
</script>
