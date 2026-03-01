<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <h2 class="m-0">Marks</h2>
      <div class="flex gap-2 align-items-center flex-wrap">
        <Select v-model="filterBatch" :options="[{ id: null, name: 'All Batches' }, ...batchStore.batches]"
                option-label="name" option-value="id" placeholder="Filter Batch" class="text-sm" @change="load" />
        <Button label="Add Mark" icon="pi pi-plus" @click="openDialog()" />
        <Button label="Bulk Entry" icon="pi pi-list" severity="secondary" @click="bulkVisible = true" />
      </div>
    </div>

    <DataTable :value="marksStore.records" :loading="marksStore.loading" striped-rows removable-sort
               paginator :rows="20" class="p-datatable-sm">
      <Column field="student_name" header="Student" sortable />
      <Column field="batch_name"   header="Batch"   sortable />
      <Column field="test_name"    header="Test"    sortable />
      <Column field="test_date"    header="Date"    sortable>
        <template #body="{ data }">{{ data.test_date?.split('T')[0] }}</template>
      </Column>
      <Column header="Score" sortable sort-field="marks_obtained">
        <template #body="{ data }">
          <span :class="percentClass(data.marks_obtained, data.total_marks)">
            {{ data.marks_obtained }} / {{ data.total_marks }}
            ({{ Math.round((data.marks_obtained/data.total_marks)*100) }}%)
          </span>
        </template>
      </Column>
      <Column field="remarks" header="Remarks" />
      <Column style="width:80px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openDialog(data)" />
            <Button icon="pi pi-trash"  text rounded size="small" severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Single Mark Dialog -->
    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Edit Mark' : 'Add Mark'" :style="{ width: '480px' }" modal>
      <div class="grid">
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Batch <span class="text-red-500">*</span></label>
          <Select v-model="form.batch_id" :options="batchStore.batches" option-label="name" option-value="id" class="w-full"
                  @change="loadBatchStudents" />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Student <span class="text-red-500">*</span></label>
          <Select v-model="form.student_id" :options="batchStudents" option-label="name" option-value="id" class="w-full" />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Test Name <span class="text-red-500">*</span></label>
          <InputText v-model="form.test_name" class="w-full" placeholder="Monthly Test – June" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Date</label>
          <DatePicker v-model="form.test_date" class="w-full" date-format="yy-mm-dd" show-icon />
        </div>
        <div class="col-3 field">
          <label class="block mb-1 font-medium">Marks</label>
          <InputNumber v-model="form.marks_obtained" class="w-full" :min="0" />
        </div>
        <div class="col-3 field">
          <label class="block mb-1 font-medium">Total</label>
          <InputNumber v-model="form.total_marks" class="w-full" :min="1" />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Remarks</label>
          <InputText v-model="form.remarks" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button :label="editing ? 'Update' : 'Save'" icon="pi pi-check" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <!-- Bulk Entry Dialog -->
    <Dialog v-model:visible="bulkVisible" header="Bulk Mark Entry" :style="{ width: '700px' }" modal>
      <div class="grid mb-3">
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Batch</label>
          <Select v-model="bulk.batch_id" :options="batchStore.batches" option-label="name" option-value="id" class="w-full" @change="loadBulkStudents" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Test Name</label>
          <InputText v-model="bulk.test_name" class="w-full" />
        </div>
        <div class="col-4 field">
          <label class="block mb-1 font-medium">Date</label>
          <DatePicker v-model="bulk.test_date" class="w-full" date-format="yy-mm-dd" show-icon />
        </div>
        <div class="col-4 field">
          <label class="block mb-1 font-medium">Total Marks</label>
          <InputNumber v-model="bulk.total_marks" class="w-full" :min="1" />
        </div>
      </div>
      <DataTable :value="bulk.records" class="p-datatable-sm" edit-mode="cell">
        <Column field="name" header="Student" />
        <Column field="marks_obtained" header="Marks Obtained">
          <template #editor="{ data }">
            <InputNumber v-model="data.marks_obtained" :min="0" :max="bulk.total_marks" class="w-full" />
          </template>
        </Column>
        <Column field="remarks" header="Remarks">
          <template #editor="{ data }">
            <InputText v-model="data.remarks" class="w-full" />
          </template>
        </Column>
      </DataTable>
      <template #footer>
        <Button label="Cancel" text @click="bulkVisible = false" />
        <Button label="Save All" icon="pi pi-check" :loading="saving" @click="saveBulk" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useMarksStore } from '@/stores/marks.store';
import { useBatchStore } from '@/stores/batch.store';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';

const marksStore = useMarksStore();
const batchStore = useBatchStore();
const confirm = useConfirm();
const toast   = useToast();

const dialogVisible = ref(false);
const bulkVisible   = ref(false);
const editing       = ref(null);
const saving        = ref(false);
const filterBatch   = ref(null);
const batchStudents = ref([]);
const form          = ref(defaultForm());
const bulk          = ref({ batch_id: null, test_name: '', test_date: null, total_marks: 100, records: [] });

function defaultForm() {
  return { batch_id: null, student_id: null, test_name: '', test_date: null, marks_obtained: 0, total_marks: 100, remarks: '' };
}

function percentClass(obtained, total) {
  const pct = (obtained / total) * 100;
  if (pct >= 75) return 'text-green-600 font-medium';
  if (pct >= 50) return 'text-orange-500 font-medium';
  return 'text-red-500 font-medium';
}

async function load() {
  await marksStore.fetchAll({ batch_id: filterBatch.value || undefined });
}

async function loadBatchStudents() {
  if (!form.value.batch_id) return;
  batchStudents.value = await batchStore.getStudents(form.value.batch_id);
}

async function loadBulkStudents() {
  if (!bulk.value.batch_id) return;
  const students = await batchStore.getStudents(bulk.value.batch_id);
  bulk.value.records = students.map(s => ({ ...s, marks_obtained: null, remarks: '' }));
}

function openDialog(mark = null) {
  editing.value = mark;
  form.value = mark ? { ...mark, test_date: mark.test_date ? new Date(mark.test_date) : null } : defaultForm();
  if (mark?.batch_id) loadBatchStudents();
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  const payload = { ...form.value, test_date: form.value.test_date ? new Date(form.value.test_date).toISOString().split('T')[0] : null };
  try {
    if (editing.value) {
      await marksStore.update(editing.value.id, payload);
    } else {
      await marksStore.create(payload);
    }
    toast.add({ severity: 'success', summary: 'Saved', life: 2000 });
    dialogVisible.value = false;
    load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function saveBulk() {
  saving.value = true;
  const payload = {
    batch_id: bulk.value.batch_id,
    test_name: bulk.value.test_name,
    total_marks: bulk.value.total_marks,
    test_date: bulk.value.test_date ? new Date(bulk.value.test_date).toISOString().split('T')[0] : null,
    records: bulk.value.records.filter(r => r.marks_obtained !== null).map(r => ({ student_id: r.id, marks_obtained: r.marks_obtained, remarks: r.remarks })),
  };
  try {
    await marksStore.createBulk(payload);
    toast.add({ severity: 'success', summary: 'Bulk marks saved', life: 2000 });
    bulkVisible.value = false;
    load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(m) {
  confirm.require({
    message: `Delete this mark record for ${m.student_name}?`,
    header: 'Confirm',
    icon: 'pi pi-trash',
    acceptSeverity: 'danger',
    accept: async () => {
      await marksStore.remove(m.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
    },
  });
}

onMounted(async () => {
  await Promise.all([batchStore.fetchAll(), marksStore.fetchAll()]);
});
</script>
