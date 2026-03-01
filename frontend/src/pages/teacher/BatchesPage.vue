<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <h2 class="m-0">Batches</h2>
      <div class="flex gap-2 align-items-center">
        <Select v-model="filterInstitute" :options="[{ id: null, name: 'All Institutes' }, ...instituteStore.institutes]"
                option-label="name" option-value="id" placeholder="Filter by Institute" class="text-sm"
                @change="batchStore.fetchAll({ institute_id: filterInstitute })" />
        <Button label="New Batch" icon="pi pi-plus" @click="openDialog()" />
      </div>
    </div>

    <DataTable :value="batchStore.batches" :loading="batchStore.loading" striped-rows removable-sort
               paginator :rows="15" filter-display="row" class="p-datatable-sm">
      <Column field="name" header="Batch Name" sortable style="min-width:180px" />
      <Column field="institute_name" header="Institute" sortable />
      <Column field="subject" header="Subject" sortable />
      <Column field="grade" header="Grade" />
      <Column field="day_of_week" header="Days" />
      <Column field="time_slot" header="Time" />
      <Column field="monthly_fee" header="Fee (LKR)" sortable>
        <template #body="{ data }">{{ Number(data.monthly_fee).toLocaleString() }}</template>
      </Column>
      <Column field="enrolled_count" header="Students" sortable />
      <Column field="is_active" header="Status">
        <template #body="{ data }">
          <Tag :value="data.is_active ? 'Active' : 'Inactive'" :severity="data.is_active ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column header="Actions" style="width:100px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openDialog(data)" />
            <Button icon="pi pi-trash"  text rounded size="small" severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Dialog -->
    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Edit Batch' : 'New Batch'" :style="{ width: '560px' }" modal>
      <div class="grid">
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Institute <span class="text-red-500">*</span></label>
          <Select v-model="form.institute_id" :options="instituteStore.institutes" option-label="name" option-value="id"
                  class="w-full" placeholder="Select Institute" />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Batch Name <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" class="w-full" placeholder="e.g. Monday 4PM – Grade 11" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Subject</label>
          <InputText v-model="form.subject" class="w-full" placeholder="Physics" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Grade</label>
          <InputText v-model="form.grade" class="w-full" placeholder="Grade 11" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Days</label>
          <MultiSelect v-model="form.day_of_week_arr"
            :options="days" class="w-full" placeholder="Select days" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Time Slot</label>
          <InputText v-model="form.time_slot" class="w-full" placeholder="4:00 PM – 6:00 PM" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Monthly Fee (LKR)</label>
          <InputNumber v-model="form.monthly_fee" class="w-full" :min="0" />
        </div>
        <div class="col-6 field">
          <label class="block mb-1 font-medium">Max Students</label>
          <InputNumber v-model="form.max_students" class="w-full" :min="1" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button :label="editing ? 'Update' : 'Create'" icon="pi pi-check" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useBatchStore } from '@/stores/batch.store';
import { useInstituteStore } from '@/stores/institute.store';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';

const batchStore     = useBatchStore();
const instituteStore = useInstituteStore();
const confirm = useConfirm();
const toast   = useToast();

const dialogVisible  = ref(false);
const editing        = ref(null);
const saving         = ref(false);
const filterInstitute = ref(null);
const form           = ref(defaultForm());
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function defaultForm() {
  return { institute_id: null, name: '', subject: '', grade: '', day_of_week_arr: [], time_slot: '', monthly_fee: 0, max_students: null, is_active: 1 };
}

function openDialog(batch = null) {
  editing.value = batch;
  if (batch) {
    form.value = {
      ...batch,
      day_of_week_arr: batch.day_of_week ? batch.day_of_week.split(',') : [],
    };
  } else {
    form.value = defaultForm();
    if (filterInstitute.value) form.value.institute_id = filterInstitute.value;
  }
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.institute_id || !form.value.name) {
    return toast.add({ severity: 'warn', summary: 'Fill required fields', life: 2000 });
  }
  saving.value = true;
  const payload = { ...form.value, day_of_week: form.value.day_of_week_arr.join(',') };
  try {
    if (editing.value) {
      await batchStore.update(editing.value.id, payload);
    } else {
      await batchStore.create(payload);
    }
    await batchStore.fetchAll({ institute_id: filterInstitute.value });
    toast.add({ severity: 'success', summary: editing.value ? 'Updated' : 'Created', life: 2000 });
    dialogVisible.value = false;
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(batch) {
  confirm.require({
    message: `Delete batch "${batch.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-trash',
    acceptSeverity: 'danger',
    accept: async () => {
      await batchStore.remove(batch.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
    },
  });
}

onMounted(async () => {
  await Promise.all([instituteStore.fetchAll(), batchStore.fetchAll()]);
});
</script>
