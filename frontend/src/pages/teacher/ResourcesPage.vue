<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Resources</h2>
      <Button label="Upload Resource" icon="pi pi-upload" @click="dialogVisible = true" />
    </div>

    <div class="grid">
      <div v-for="res in resources" :key="res.id" class="col-12 md:col-6 lg:col-4">
        <div
          class="surface-card border-round-xl p-4 border-1 surface-border h-full flex flex-column gap-2"
        >
          <div class="flex align-items-start gap-3">
            <i
              :class="['pi text-2xl', typeIcon(res.type)]"
              :style="{ color: typeColor(res.type) }"
            />
            <div class="flex-1 min-w-0">
              <div class="font-bold text-overflow-ellipsis overflow-hidden">{{ res.title }}</div>
              <div class="text-color-secondary text-xs">
                {{ res.batch_name || res.institute_name || 'All' }}
              </div>
            </div>
          </div>
          <p v-if="res.description" class="text-sm text-color-secondary m-0">
            {{ res.description }}
          </p>
          <div class="flex gap-2 mt-auto">
            <a
              v-if="res.file_url"
              :href="res.file_url"
              target="_blank"
              class="p-button p-button-text p-button-sm"
            >
              <i class="pi pi-download mr-1" />
              View
            </a>
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              class="ml-auto"
              @click="remove(res)"
            />
          </div>
        </div>
      </div>
      <div v-if="!resources.length" class="col-12 text-center py-8 text-color-secondary">
        <i class="pi pi-folder-open text-5xl block mb-3" />
        No resources yet.
      </div>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      header="Upload Resource"
      :style="{ width: '480px' }"
      modal
    >
      <div class="flex flex-column gap-3">
        <div class="field">
          <label class="block mb-1 font-medium">
            Title
            <span class="text-red-500">*</span>
          </label>
          <InputText v-model="form.title" class="w-full" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Description</label>
          <Textarea v-model="form.description" class="w-full" rows="2" />
        </div>
        <div class="grid">
          <div class="col-6 field">
            <label class="block mb-1 font-medium">Type</label>
            <Select
              v-model="form.type"
              :options="['pdf', 'video_link', 'image', 'other']"
              class="w-full"
            />
          </div>
          <div class="col-6 field" v-if="form.type === 'video_link'">
            <label class="block mb-1 font-medium">Video URL</label>
            <InputText v-model="form.file_url" class="w-full" placeholder="https://..." />
          </div>
        </div>
        <div class="field" v-if="form.type !== 'video_link'">
          <label class="block mb-1 font-medium">File</label>
          <input type="file" @change="onFile" class="w-full" accept=".pdf,.jpg,.jpeg,.png,.gif" />
        </div>
        <div class="field">
          <label class="block mb-1 font-medium">Batch (optional)</label>
          <Select
            v-model="form.batch_id"
            :options="[{ id: null, name: 'All Batches' }, ...batchStore.batches]"
            option-label="name"
            option-value="id"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogVisible = false" />
        <Button label="Upload" icon="pi pi-upload" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import api from '@/api/axios';
import { useBatchStore } from '@/stores/batch.store';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const batchStore = useBatchStore();
const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const saving = ref(false);
const resources = ref([]);
const selectedFile = ref(null);
const form = ref({ title: '', description: '', type: 'pdf', file_url: '', batch_id: null });

function typeIcon(type) {
  return (
    { pdf: 'pi-file-pdf', video_link: 'pi-youtube', image: 'pi-images', other: 'pi-file' }[type] ||
    'pi-file'
  );
}
function typeColor(type) {
  return (
    { pdf: '#ef4444', video_link: '#f59e0b', image: '#22c55e', other: '#6b7280' }[type] || '#6b7280'
  );
}

function onFile(e) {
  selectedFile.value = e.target.files[0];
}

async function load() {
  const { data } = await api.get('/resources');
  resources.value = data.data;
}

async function save() {
  if (!form.value.title)
    return toast.add({ severity: 'warn', summary: 'Title required', life: 2000 });
  saving.value = true;
  try {
    const fd = new FormData();
    Object.entries(form.value).forEach(([k, v]) => {
      if (v != null) fd.append(k, v);
    });
    if (selectedFile.value) fd.append('file', selectedFile.value);
    await api.post('/resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.add({ severity: 'success', summary: 'Uploaded', life: 2000 });
    dialogVisible.value = false;
    form.value = { title: '', description: '', type: 'pdf', file_url: '', batch_id: null };
    selectedFile.value = null;
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

async function remove(res) {
  confirm.require({
    message: `Delete "${res.title}"?`,
    header: 'Confirm',
    icon: 'pi pi-trash',
    acceptSeverity: 'danger',
    accept: async () => {
      await api.delete(`/resources/${res.id}`);
      resources.value = resources.value.filter((r) => r.id !== res.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
    },
  });
}

onMounted(async () => {
  await Promise.all([batchStore.fetchAll(), load()]);
});
</script>
