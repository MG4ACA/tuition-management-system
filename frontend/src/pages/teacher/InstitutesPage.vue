<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Institutes</h2>
      <Button label="New Institute" icon="pi pi-plus" @click="openDialog()" />
    </div>

    <div class="grid">
      <div v-for="inst in instituteStore.institutes" :key="inst.id" class="col-12 md:col-6 lg:col-4">
        <div class="surface-card border-round-xl p-4 border-1 surface-border h-full flex flex-column gap-3">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="font-bold text-lg">{{ inst.name }}</div>
              <div class="text-color-secondary text-sm mt-1">{{ inst.address || 'No address' }}</div>
            </div>
            <Tag :value="inst.is_active ? 'Active' : 'Inactive'" :severity="inst.is_active ? 'success' : 'danger'" />
          </div>
          <div class="flex gap-3 text-sm">
            <span v-if="inst.phone"><i class="pi pi-phone mr-1" />{{ inst.phone }}</span>
            <span v-if="inst.email"><i class="pi pi-envelope mr-1" />{{ inst.email }}</span>
          </div>
          <div class="grid mt-auto" v-if="summaries[inst.id]">
            <div class="col-4 text-center">
              <div class="font-bold text-xl text-primary">{{ summaries[inst.id].batches }}</div>
              <div class="text-xs text-color-secondary">Batches</div>
            </div>
            <div class="col-4 text-center">
              <div class="font-bold text-xl text-primary">{{ summaries[inst.id].students }}</div>
              <div class="text-xs text-color-secondary">Students</div>
            </div>
            <div class="col-4 text-center">
              <div class="font-bold text-xl text-primary">{{ formatCurrency(summaries[inst.id].revenue) }}</div>
              <div class="text-xs text-color-secondary">Revenue</div>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openDialog(inst)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(inst)" />
          </div>
        </div>
      </div>

      <div v-if="!instituteStore.institutes.length" class="col-12">
        <div class="text-center py-8 text-color-secondary">
          <i class="pi pi-building text-5xl block mb-3" />
          <div>No institutes yet. Click "New Institute" to add one.</div>
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Edit Institute' : 'New Institute'" :style="{ width: '480px' }" modal>
      <div class="flex flex-column gap-3">
        <div class="field">
          <label class="block mb-1 font-medium">Name <span class="text-red-500">*</span></label>
          <InputText v-model="form.name" class="w-full" placeholder="e.g. Colombo Branch" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Address</label>
          <Textarea v-model="form.address" class="w-full" rows="2" />
        </div>
        <div class="grid">
          <div class="col-6 field">
            <label class="block mb-1 font-medium">Phone</label>
            <InputText v-model="form.phone" class="w-full" />
          </div>
          <div class="col-6 field">
            <label class="block mb-1 font-medium">Email</label>
            <InputText v-model="form.email" class="w-full" type="email" />
          </div>
        </div>
        <div v-if="editing" class="field">
          <label class="flex align-items-center gap-2">
            <ToggleSwitch v-model="form.is_active" /> Active
          </label>
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
import { useInstituteStore } from '@/stores/institute.store';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';

const instituteStore = useInstituteStore();
const confirm = useConfirm();
const toast   = useToast();

const dialogVisible = ref(false);
const editing       = ref(null);
const saving        = ref(false);
const summaries     = ref({});
const form          = ref(defaultForm());

function defaultForm() {
  return { name: '', address: '', phone: '', email: '', logo_url: '', is_active: true };
}

function openDialog(inst = null) {
  editing.value = inst;
  form.value = inst ? { ...inst } : defaultForm();
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.name) return toast.add({ severity: 'warn', summary: 'Name required', life: 2000 });
  saving.value = true;
  try {
    if (editing.value) {
      await instituteStore.update(editing.value.id, form.value);
      toast.add({ severity: 'success', summary: 'Updated', life: 2000 });
    } else {
      await instituteStore.create(form.value);
      toast.add({ severity: 'success', summary: 'Created', life: 2000 });
    }
    dialogVisible.value = false;
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(inst) {
  confirm.require({
    message: `Delete "${inst.name}"? This will also delete all batches and data.`,
    header: 'Confirm Delete',
    icon: 'pi pi-trash',
    acceptSeverity: 'danger',
    accept: async () => {
      await instituteStore.remove(inst.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
    },
  });
}

function formatCurrency(v) {
  return `LKR ${Number(v || 0).toLocaleString()}`;
}

async function loadSummaries() {
  for (const inst of instituteStore.institutes) {
    summaries.value[inst.id] = await instituteStore.getSummary(inst.id);
  }
}

onMounted(async () => {
  await instituteStore.fetchAll();
  loadSummaries();
});
</script>
