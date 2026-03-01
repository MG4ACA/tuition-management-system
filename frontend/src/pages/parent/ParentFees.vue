<template>
  <div>
    <h2 class="mt-0">Fee Status</h2>

    <!-- Summary row -->
    <div class="grid mb-4">
      <div class="col-12 md:col-4">
        <div
          class="surface-card border-round-xl p-4 text-center"
          :class="pendingTotal > 0 ? 'border-1 border-orange-400' : 'border-1 border-green-400'"
        >
          <div
            class="text-2xl font-bold"
            :class="pendingTotal > 0 ? 'text-orange-500' : 'text-green-500'"
          >
            LKR {{ fmtAmt(pendingTotal) }}
          </div>
          <div class="text-xs text-color-secondary mt-1">Outstanding Balance</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl border-1 border-green-400 p-4 text-center">
          <div class="text-2xl font-bold text-green-500">LKR {{ fmtAmt(paidTotal) }}</div>
          <div class="text-xs text-color-secondary mt-1">Total Paid</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl border-1 surface-border p-4 text-center">
          <div class="text-2xl font-bold">{{ records.length }}</div>
          <div class="text-xs text-color-secondary mt-1">Total Records</div>
        </div>
      </div>
    </div>

    <Message v-if="pendingTotal > 0" severity="warn" :closable="false" class="mb-3">
      Please pay the outstanding balance of
      <strong>LKR {{ fmtAmt(pendingTotal) }}</strong>
      to the teacher.
    </Message>

    <div class="surface-card border-round-xl border-1 surface-border overflow-hidden">
      <DataTable
        :value="records"
        :loading="loading"
        paginator
        :rows="20"
        striped-rows
        class="p-datatable-sm"
        sort-field="month"
        :sort-order="-1"
      >
        <Column field="month" header="Month" sortable>
          <template #body="{ data }">{{ monthLabel(data.month) }}</template>
        </Column>
        <Column field="batch_name" header="Batch" sortable />
        <Column header="Amount (LKR)" sortable sort-field="amount">
          <template #body="{ data }">{{ fmtAmt(data.amount) }}</template>
        </Column>
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" :severity="statusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="receipt_number" header="Receipt #">
          <template #body="{ data }">{{ data.receipt_number ?? '—' }}</template>
        </Column>
        <Column field="paid_at" header="Paid On">
          <template #body="{ data }">
            {{ data.paid_at ? data.paid_at.split('T')[0] : '—' }}
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
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';

const parentStore = useParentStore();
const records = ref([]);
const loading = ref(true);

const pendingTotal = computed(() =>
  records.value
    .filter((r) => r.status === 'pending' || r.status === 'partial')
    .reduce((s, r) => s + Number(r.amount), 0),
);
const paidTotal = computed(() =>
  records.value.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
);

function fmtAmt(v) {
  return Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}
function monthLabel(ds) {
  if (!ds) return '';
  return new Date(ds).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function statusSeverity(s) {
  return (
    { paid: 'success', pending: 'warn', partial: 'info', waived: 'secondary' }[s] ?? 'secondary'
  );
}

onMounted(async () => {
  try {
    const { records: data } = await parentStore.getFees();
    records.value = data;
  } finally {
    loading.value = false;
  }
});
</script>
