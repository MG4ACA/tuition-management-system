<template>
  <div>
    <h2 class="mt-0">Attendance</h2>

    <!-- Summary cards -->
    <div class="grid mb-4">
      <div v-for="card in summary" :key="card.label" class="col-6 md:col-3">
        <div class="surface-card border-round-xl border-1 surface-border p-3 text-center">
          <div class="text-2xl font-bold" :class="card.cls">{{ card.count }}</div>
          <div class="text-xs text-color-secondary mt-1">{{ card.label }}</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 flex-wrap mb-3">
      <Select
        v-model="selectedBatch"
        :options="batchOptions"
        option-label="label"
        option-value="value"
        placeholder="All Batches"
        show-clear
        class="w-13rem"
        @change="load"
      />
      <Calendar
        v-model="dateRange"
        selection-mode="range"
        :manual-input="false"
        show-button-bar
        placeholder="Date range"
        class="w-16rem"
        @hide="load"
      />
    </div>

    <div class="surface-card border-round-xl border-1 surface-border overflow-hidden">
      <DataTable
        :value="records"
        :loading="loading"
        paginator
        :rows="25"
        striped-rows
        class="p-datatable-sm"
        sort-field="date"
        :sort-order="-1"
      >
        <Column field="date" header="Date" sortable />
        <Column field="batch_name" header="Batch" sortable />
        <Column field="subject" header="Subject" />
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" :severity="statusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="scanned_at" header="Scanned At">
          <template #body="{ data }">
            {{ data.scanned_at ? data.scanned_at.replace('T', ' ').substring(0, 16) : '—' }}
          </template>
        </Column>
        <Column field="notes" header="Notes">
          <template #body="{ data }">{{ data.notes ?? '—' }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { useParentStore } from '@/stores/parent.store';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Calendar from 'primevue/datepicker';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';

const parentStore = useParentStore();
const records = ref([]);
const loading = ref(false);
const selectedBatch = ref(null);
const dateRange = ref(null);

const batchOptions = computed(() => {
  const names = [...new Set(records.value.map((r) => r.batch_name).filter(Boolean))];
  return names.map((n) => ({ label: n, value: n }));
});

const summary = computed(() => [
  {
    label: 'Present',
    count: records.value.filter((r) => r.status === 'present').length,
    cls: 'text-green-500',
  },
  {
    label: 'Late',
    count: records.value.filter((r) => r.status === 'late').length,
    cls: 'text-orange-500',
  },
  {
    label: 'Absent',
    count: records.value.filter((r) => r.status === 'absent').length,
    cls: 'text-red-500',
  },
  { label: 'Total', count: records.value.length, cls: '' },
]);

function statusSeverity(s) {
  return { present: 'success', late: 'warn', absent: 'danger' }[s] ?? 'secondary';
}

async function load() {
  loading.value = true;
  try {
    const params = {};
    if (selectedBatch.value) params.batch_name = selectedBatch.value;
    if (dateRange.value?.[0]) params.from = dateRange.value[0].toISOString().split('T')[0];
    if (dateRange.value?.[1]) params.to = dateRange.value[1].toISOString().split('T')[0];
    const rows = await parentStore.getAttendance(params);
    // client-side batch name filter (backend filters by batch_id, not name)
    records.value = selectedBatch.value
      ? rows.filter((r) => r.batch_name === selectedBatch.value)
      : rows;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
