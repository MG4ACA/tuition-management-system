<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <h2 class="m-0">Students</h2>
      <div class="flex gap-2 align-items-center flex-wrap">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder="Search name / phone..."
            @input="debounceSearch"
            class="text-sm"
          />
        </IconField>
        <Select
          v-model="filterInstitute"
          :options="[{ id: null, name: 'All' }, ...instituteStore.institutes]"
          option-label="name"
          option-value="id"
          placeholder="Institute"
          class="text-sm"
          @change="load"
        />
        <Select
          v-model="filterBatch"
          :options="[{ id: null, name: 'All Batches' }, ...batchStore.batches]"
          option-label="name"
          option-value="id"
          placeholder="Batch"
          class="text-sm"
          @change="load"
        />
        <Button label="Add Student" icon="pi pi-plus" @click="openDialog()" />
      </div>
    </div>

    <DataTable
      :value="studentStore.students"
      :loading="studentStore.loading"
      striped-rows
      removable-sort
      paginator
      :rows="20"
      class="p-datatable-sm"
    >
      <Column field="name" header="Name" sortable style="min-width: 160px" />
      <Column field="phone" header="Phone" />
      <Column field="parent_name" header="Parent" />
      <Column field="parent_phone" header="Parent Phone" />
      <Column header="Portal">
        <template #body="{ data }">
          <div class="flex gap-1 flex-wrap">
            <Tag
              :value="data.user_id ? 'Student ✓' : 'No Student'"
              :severity="data.user_id ? 'success' : 'secondary'"
              class="text-xs"
            />
            <Tag
              :value="data.parent_user_id ? 'Parent ✓' : 'No Parent'"
              :severity="data.parent_user_id ? 'info' : 'secondary'"
              class="text-xs"
            />
          </div>
        </template>
      </Column>
      <Column field="is_active" header="Status">
        <template #body="{ data }">
          <Tag
            :value="data.is_active ? 'Active' : 'Inactive'"
            :severity="data.is_active ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column header="Actions" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-eye"
              text
              rounded
              size="small"
              v-tooltip="'View'"
              @click="viewStudent(data)"
            />
            <Button
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              v-tooltip="'Edit'"
              @click="openDialog(data)"
            />
            <Button
              icon="pi pi-user-plus"
              text
              rounded
              size="small"
              severity="info"
              v-tooltip="data.parent_user_id ? 'Parent portal exists' : 'Create parent account'"
              :disabled="!!data.parent_user_id"
              @click="openParentDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editing ? 'Edit Student' : 'Add Student'"
      :style="{ width: '600px' }"
      modal
    >
      <div class="grid">
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">
            Full Name
            <span class="text-red-500">*</span>
          </label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">Email</label>
          <InputText v-model="form.email" class="w-full" type="email" />
        </div>
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">Phone</label>
          <InputText v-model="form.phone" class="w-full" />
        </div>
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">Date of Birth</label>
          <DatePicker v-model="form.dob" class="w-full" date-format="yy-mm-dd" show-icon />
        </div>
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">Parent Name</label>
          <InputText v-model="form.parent_name" class="w-full" />
        </div>
        <div class="col-12 md:col-6 field">
          <label class="block mb-1 font-medium">Parent Phone</label>
          <InputText v-model="form.parent_phone" class="w-full" />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Parent Email</label>
          <InputText v-model="form.parent_email" class="w-full" type="email" />
        </div>
        <div class="col-12 field" v-if="!editing">
          <label class="block mb-1 font-medium">Enroll in Batches</label>
          <MultiSelect
            v-model="form.batch_ids"
            :options="batchStore.batches"
            option-label="name"
            option-value="id"
            class="w-full"
            placeholder="Select batches"
            display="chip"
          />
        </div>
        <div class="col-12 field">
          <label class="block mb-1 font-medium">Notes</label>
          <Textarea v-model="form.notes" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button
          :label="editing ? 'Update' : 'Add'"
          icon="pi pi-check"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>

    <!-- View Dialog -->
    <Dialog
      v-model:visible="viewVisible"
      header="Student Details"
      :style="{ width: '560px' }"
      modal
    >
      <div v-if="viewData" class="flex flex-column gap-4">
        <div class="flex align-items-center gap-3">
          <Avatar
            :label="viewData.name?.[0]"
            shape="circle"
            size="xlarge"
            style="background: #3b82f6; color: white"
          />
          <div>
            <div class="text-xl font-bold">{{ viewData.name }}</div>
            <div class="text-color-secondary">{{ viewData.email }}</div>
          </div>
          <div class="ml-auto text-center p-3 border-1 surface-border border-round-lg">
            <canvas ref="qrCanvas" width="100" height="100" />
            <div class="text-xs mt-1 text-color-secondary">QR Code</div>
          </div>
        </div>
        <div class="grid text-sm">
          <div class="col-6">
            <span class="font-medium">Phone:</span>
            {{ viewData.phone }}
          </div>
          <div class="col-6">
            <span class="font-medium">Parent:</span>
            {{ viewData.parent_name }}
          </div>
          <div class="col-6">
            <span class="font-medium">Parent Phone:</span>
            {{ viewData.parent_phone }}
          </div>
          <div class="col-6">
            <span class="font-medium">QR Token:</span>
            <span class="text-xs text-color-secondary">{{ viewData.qr_token }}</span>
          </div>
        </div>
        <div v-if="viewData.batches?.length">
          <div class="font-medium mb-2">Enrolled Batches</div>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="b in viewData.batches"
              :key="b.id"
              :value="`${b.name} – ${b.institute_name}`"
            />
          </div>
        </div>
      </div>
    </Dialog>
    <!-- Register Parent Account Dialog -->
    <Dialog
      v-model:visible="parentDialogVisible"
      header="Create Parent Portal Account"
      :style="{ width: '420px' }"
      modal
    >
      <div class="flex flex-column gap-3">
        <Message severity="info" :closable="false" class="m-0">
          Creating a portal account for the parent of
          <strong>{{ parentTarget?.name }}</strong>
          .
        </Message>
        <div class="field">
          <label class="block mb-1 font-medium">
            Parent Name
            <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="parentForm.name"
            class="w-full"
            placeholder="As it appears in student record"
          />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">
            Login Email
            <span class="text-red-500">*</span>
          </label>
          <InputText v-model="parentForm.email" class="w-full" type="email" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">
            Temporary Password
            <span class="text-red-500">*</span>
          </label>
          <Password
            v-model="parentForm.password"
            class="w-full"
            toggle-mask
            :feedback="false"
            input-class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="parentDialogVisible = false" />
        <Button
          label="Create Account"
          icon="pi pi-user-plus"
          severity="info"
          :loading="parentSaving"
          @click="registerParent"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import api from '@/api/axios';
import { useBatchStore } from '@/stores/batch.store';
import { useInstituteStore } from '@/stores/institute.store';
import { useStudentStore } from '@/stores/student.store';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import QRCode from 'qrcode';
import { nextTick, onMounted, ref } from 'vue';

const studentStore = useStudentStore();
const batchStore = useBatchStore();
const instituteStore = useInstituteStore();
const confirm = useConfirm();
const toast = useToast();

const dialogVisible = ref(false);
const viewVisible = ref(false);
const parentDialogVisible = ref(false);
const editing = ref(null);
const saving = ref(false);
const parentSaving = ref(false);
const filterInstitute = ref(null);
const filterBatch = ref(null);
const search = ref('');
const form = ref(defaultForm());
const viewData = ref(null);
const qrCanvas = ref(null);
const parentTarget = ref(null);
const parentForm = ref({ name: '', email: '', password: '' });

let searchTimeout;

function defaultForm() {
  return {
    name: '',
    email: '',
    phone: '',
    dob: null,
    gender: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    notes: '',
    batch_ids: [],
  };
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(load, 400);
}

async function load() {
  await studentStore.fetchAll({
    search: search.value || undefined,
    institute_id: filterInstitute.value || undefined,
    batch_id: filterBatch.value || undefined,
  });
}

function openDialog(student = null) {
  editing.value = student;
  form.value = student ? { ...student, batch_ids: [] } : defaultForm();
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.name)
    return toast.add({ severity: 'warn', summary: 'Name is required', life: 2000 });
  saving.value = true;
  try {
    if (editing.value) {
      await studentStore.update(editing.value.id, form.value);
    } else {
      await studentStore.create(form.value);
    }
    toast.add({
      severity: 'success',
      summary: editing.value ? 'Updated' : 'Student added',
      life: 2000,
    });
    dialogVisible.value = false;
    load();
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message,
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(s) {
  confirm.require({
    message: `Delete student "${s.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-trash',
    acceptSeverity: 'danger',
    accept: async () => {
      await studentStore.remove(s.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
      load();
    },
  });
}

async function viewStudent(student) {
  viewData.value = await studentStore.getOne(student.id);
  viewVisible.value = true;
  await nextTick();
  if (qrCanvas.value && viewData.value?.qr_token) {
    QRCode.toCanvas(qrCanvas.value, viewData.value.qr_token, { width: 100 });
  }
}

function openParentDialog(student) {
  parentTarget.value = student;
  parentForm.value = {
    name: student.parent_name ?? '',
    email: student.parent_email ?? '',
    password: '',
  };
  parentDialogVisible.value = true;
}

async function registerParent() {
  const { name, email, password } = parentForm.value;
  if (!name || !email || !password)
    return toast.add({ severity: 'warn', summary: 'All fields are required', life: 2500 });
  parentSaving.value = true;
  try {
    await api.post('/auth/register-parent', {
      student_id: parentTarget.value.id,
      name,
      email,
      password,
    });
    toast.add({
      severity: 'success',
      summary: 'Parent account created',
      detail: `Login: ${email}`,
      life: 3500,
    });
    parentDialogVisible.value = false;
    load();
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message,
      life: 3500,
    });
  } finally {
    parentSaving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([instituteStore.fetchAll(), batchStore.fetchAll(), studentStore.fetchAll()]);
});
</script>
