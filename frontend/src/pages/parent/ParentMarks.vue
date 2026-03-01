<template>
  <div>
    <h2 class="mt-0">Test Results</h2>

    <!-- Score summary -->
    <div
      class="surface-card border-round-xl border-1 surface-border p-4 mb-4 flex align-items-center gap-4 flex-wrap"
    >
      <div class="text-center px-4">
        <div class="text-4xl font-bold" :class="avgClass">{{ avg }}%</div>
        <div class="text-xs text-color-secondary mt-1">Overall Average</div>
      </div>
      <Divider layout="vertical" />
      <div class="grid flex-1 m-0">
        <div v-for="band in bands" :key="band.label" class="col-6 md:col-3 text-center">
          <div class="font-bold" :class="band.cls">{{ band.count }}</div>
          <div class="text-xs text-color-secondary">{{ band.label }}</div>
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
        sort-field="test_date"
        :sort-order="-1"
      >
        <Column field="test_name" header="Test" sortable />
        <Column field="batch_name" header="Batch" sortable />
        <Column field="subject" header="Subject" />
        <Column field="test_date" header="Date" sortable>
          <template #body="{ data }">{{ data.test_date?.split('T')[0] }}</template>
        </Column>
        <Column header="Score" sortable sort-field="percentage">
          <template #body="{ data }">
            <div class="flex align-items-center gap-2">
              <ProgressBar
                :value="data.percentage"
                style="width: 80px; height: 8px"
                :show-value="false"
                :pt="{ value: { style: { background: scoreColor(data.percentage) } } }"
              />
              <span :style="{ color: scoreColor(data.percentage) }" class="font-medium">
                {{ data.marks_obtained }}/{{ data.total_marks }} ({{ data.percentage }}%)
              </span>
            </div>
          </template>
        </Column>
        <Column field="remarks" header="Remarks">
          <template #body="{ data }">{{ data.remarks ?? '—' }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { useParentStore } from '@/stores/parent.store';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Divider from 'primevue/divider';
import ProgressBar from 'primevue/progressbar';
import { computed, onMounted, ref } from 'vue';

const parentStore = useParentStore();
const records = ref([]);
const loading = ref(true);

const avg = computed(() => {
  if (!records.value.length) return 0;
  return Math.round(
    records.value.reduce((s, r) => s + Number(r.percentage), 0) / records.value.length,
  );
});
const avgClass = computed(() =>
  avg.value >= 75 ? 'text-green-500' : avg.value >= 50 ? 'text-orange-500' : 'text-red-500',
);

const bands = computed(() => [
  {
    label: 'Excellent (≥85%)',
    count: records.value.filter((r) => r.percentage >= 85).length,
    cls: 'text-blue-500',
  },
  {
    label: 'Good (75–84%)',
    count: records.value.filter((r) => r.percentage >= 75 && r.percentage < 85).length,
    cls: 'text-green-500',
  },
  {
    label: 'Pass (50–74%)',
    count: records.value.filter((r) => r.percentage >= 50 && r.percentage < 75).length,
    cls: 'text-orange-500',
  },
  {
    label: 'Below Pass (<50%)',
    count: records.value.filter((r) => r.percentage < 50).length,
    cls: 'text-red-500',
  },
]);

function scoreColor(pct) {
  if (pct >= 75) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

onMounted(async () => {
  try {
    records.value = await parentStore.getMarks();
  } finally {
    loading.value = false;
  }
});
</script>
