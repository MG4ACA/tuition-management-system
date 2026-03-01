<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <h2 class="m-0">Fee Management</h2>
      <div class="flex gap-2 flex-wrap align-items-center">
        <Select v-model="filterBatch" :options="[{ id: null, name: 'All Batches' }, ...batchStore.batches]"
                option-label="name" option-value="id" placeholder="Batch" class="text-sm" @change="load" />
        <InputText v-model="filterMonth" type="month" class="text-sm p-inputtext-sm" @change="load" />
        <Select v-model="filterStatus" :options="statusOptions" option-label="label" option-value="value"
                placeholder="Status" class="text-sm" @change="load" />
        <Button label="Generate Monthly Fees" icon="pi pi-magic" @click="generateDialog = true" />
      </div>
    </div>

    <!-- Summary Chips -->
    <div class="flex gap-3 mb-4 flex-wrap">
      <div v-for="s in feesSummary" :key="s.status" class="px-3 py-2 border-round-xl border-1 surface-border text-sm flex align-items-center gap-2">
        <span class="w-1rem h-1rem border-round" :style="{ background: colors[s.status] }" />
        <span class="capitalize">{{ s.status }}</span>:
        <strong>{{ s.count }}</strong> students |
        <strong>LKR {{ Number(s.amount).toLocaleString() }}</strong>
      </div>
    </div>

    <DataTable :value="feesStore.records" :loading="feesStore.loading" striped-rows removable-sort paginator :rows="20" class="p-datatable-sm">
      <Column field="student_name" header="Student" sortable />
      <Column field="batch_name"   header="Batch"   sortable />
      <Column field="month"        header="Month"   sortable>
        <template #body="{ data }">{{ data.month?.slice(0,7) }}</template>
      </Column>
      <Column field="amount"    header="Amount (LKR)" sortable>
        <template #body="{ data }">{{ Number(data.amount).toLocaleString() }}</template>
      </Column>
      <Column field="status"    header="Status" sortable>
        <template #body="{ data }">
          <Tag :value="data.status" :severity="tagSeverity(data.status)" />
        </template>
      </Column>
      <Column field="paid_at" header="Paid At">
        <template #body="{ data }">{{ data.paid_at ? new Date(data.paid_at).toLocaleDateString() : '—' }}</template>
      </Column>
      <Column field="receipt_number" header="Receipt" />
      <Column header="Actions" style="width:100px">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text rounded size="small" @click="openUpdateDialog(data)" v-if="data.status !== 'paid'" />
          <Tag v-else value="Paid ✓" severity="success" />
        </template>
      </Column>
    </DataTable>

    <!-- Update Fee Dialog -->
    <Dialog v-model:visible="updateDialogVisible" header="Update Fee Status" :style="{ width: '400px' }" modal>
      <div class="flex flex-column gap-3" v-if="updating">
        <div class="text-sm text-color-secondary">
          <strong>{{ updating.student_name }}</strong> – {{ updating.batch_name }} – {{ updating.month?.slice(0,7) }}
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Status</label>
          <Select v-model="updateForm.status" :options="['paid','pending','partial','waived']" class="w-full" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Amount (LKR)</label>
          <InputNumber v-model="updateForm.amount" class="w-full" :min="0" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Notes</label>
          <InputText v-model="updateForm.notes" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="updateDialogVisible = false" />
        <Button label="Save" icon="pi pi-check" :loading="saving" @click="updateFee" />
      </template>
    </Dialog>

    <!-- Generate Dialog -->
    <Dialog v-model:visible="generateDialog" header="Generate Monthly Fees" :style="{ width: '400px' }" modal>
      <div class="flex flex-column gap-3">
        <div class="field">
          <label class="block mb-1 font-medium">Batch</label>
          <Select v-model="genForm.batch_id" :options="batchStore.batches" option-label="name" option-value="id" class="w-full" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Month</label>
          <InputText v-model="genForm.month" type="month" class="w-full" />
        </div>
        <Message severity="info">This will create "pending" fee records for all enrolled students in the batch.</Message>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="generateDialog = false" />
        <Button label="Generate" icon="pi pi-magic" :loading="saving" @click="generateFees" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useFeesStore } from '@/stores/fees.store';
import { useBatchStore } from '@/stores/batch.store';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const feesStore  = useFeesStore();
const batchStore = useBatchStore();
const toast = useToast();

const filterBatch  = ref(null);
const filterMonth  = ref(new Date().toISOString().slice(0,7));
const filterStatus = ref(null);
const statusOptions = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Waived', value: 'waived' },
];

const updateDialogVisible = ref(false);
const generateDialog      = ref(false);
const updating = ref(null);
const saving   = ref(false);
const updateForm = ref({ status: 'paid', amount: 0, notes: '' });
const genForm    = ref({ batch_id: null, month: new Date().toISOString().slice(0,7) });

const colors = { paid: '#22c55e', pending: '#f59e0b', partial: '#3b82f6', waived: '#8b5cf6' };

function tagSeverity(s) {
  return { paid: 'success', pending: 'warn', partial: 'info', waived: 'secondary' }[s] || 'secondary';
}

const feesSummary = computed(() => {
  const map = {};
  feesStore.records.forEach(r => {
    if (!map[r.status]) map[r.status] = { status: r.status, count: 0, amount: 0 };
    map[r.status].count++;
    map[r.status].amount += Number(r.amount);
  });
  return Object.values(map);
});

async function load() {
  await feesStore.fetchAll({
    batch_id: filterBatch.value || undefined,
    month: filterMonth.value || undefined,
    status: filterStatus.value || undefined,
  });
}

function openUpdateDialog(fee) {
  updating.value = fee;
  updateForm.value = { status: fee.status, amount: Number(fee.amount), notes: fee.notes || '' };
  updateDialogVisible.value = true;
}

async function updateFee() {
  saving.value = true;
  try {
    await feesStore.update(updating.value.id, { ...updateForm.value, paid_at: updateForm.value.status === 'paid' ? new Date().toISOString() : null });
    toast.add({ severity: 'success', summary: 'Fee updated', life: 2000 });
    updateDialogVisible.value = false;
    load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function generateFees() {
  if (!genForm.value.batch_id || !genForm.value.month) {
    return toast.add({ severity: 'warn', summary: 'Fill all fields', life: 2000 });
  }
  saving.value = true;
  try {
    const result = await feesStore.generate(genForm.value.batch_id, genForm.value.month);
    toast.add({ severity: 'success', summary: result.message, life: 3000 });
    generateDialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([batchStore.fetchAll(), load()]);
});
</script>
