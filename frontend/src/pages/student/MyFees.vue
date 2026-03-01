<template>
  <div>
    <h2 class="mt-0">My Fees</h2>

    <!-- Summary row -->
    <div class="grid mb-4">
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl border-1 border-orange-400 p-4 text-center">
          <div class="text-2xl font-bold text-orange-400">LKR {{ fmtAmt(pendingTotal) }}</div>
          <div class="text-xs text-color-secondary mt-1">Total Pending / Partial</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl border-1 border-green-400 p-4 text-center">
          <div class="text-2xl font-bold text-green-400">LKR {{ fmtAmt(paidTotal) }}</div>
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

    <div class="surface-card border-round-xl border-1 surface-border overflow-hidden">
      <DataTable :value="records" :loading="loading" paginator :rows="20" striped-rows class="p-datatable-sm"
                 sort-field="month" :sort-order="-1">
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
        <Column field="notes" header="Notes">
          <template #body="{ data }">{{ data.notes ?? '—' }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFeesStore } from '@/stores/fees.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const feesStore = useFeesStore();
const records = ref([]);
const loading = ref(true);

const pendingTotal = computed(() =>
  records.value.filter(r => r.status === 'pending' || r.status === 'partial')
               .reduce((s, r) => s + Number(r.amount), 0)
);
const paidTotal = computed(() =>
  records.value.filter(r => r.status === 'paid')
               .reduce((s, r) => s + Number(r.amount), 0)
);

function fmtAmt(v) { return Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2 }); }

function monthLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function statusSeverity(status) {
  return { paid: 'success', pending: 'warn', partial: 'info', waived: 'secondary' }[status] ?? 'secondary';
}

onMounted(async () => {
  try {
    records.value = await feesStore.getMyFees();
  } finally {
    loading.value = false;
  }
});
</script>
