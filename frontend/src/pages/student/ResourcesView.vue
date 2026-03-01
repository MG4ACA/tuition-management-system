<template>
  <div>
    <h2 class="mt-0">Learning Resources</h2>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <InputText v-model="search" placeholder="Search resources…" class="w-13rem" />
      <Select
        v-model="selectedBatch"
        :options="batchOptions"
        option-label="label"
        option-value="value"
        placeholder="All Batches"
        class="w-13rem"
        show-clear
      />
      <Select
        v-model="selectedType"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        placeholder="All Types"
        class="w-10rem"
        show-clear
      />
    </div>

    <ProgressSpinner
      v-if="loading"
      style="width: 50px; height: 50px"
      class="flex justify-content-center my-6"
    />

    <div
      v-else-if="filtered.length === 0"
      class="surface-card border-round-xl border-1 surface-border p-6 text-center text-color-secondary"
    >
      No resources found.
    </div>

    <div v-else class="grid">
      <div v-for="res in filtered" :key="res.id" class="col-12 md:col-6 lg:col-4">
        <div
          class="surface-card border-round-xl border-1 surface-border p-4 h-full flex flex-column gap-2"
        >
          <div class="flex align-items-center gap-2">
            <i :class="typeIcon(res.type)" style="font-size: 1.4rem" class="text-primary" />
            <span class="font-semibold text-lg flex-1 line-clamp-1">{{ res.title }}</span>
            <Tag :value="res.type" severity="secondary" class="text-xs" />
          </div>
          <div v-if="res.description" class="text-color-secondary text-sm flex-1">
            {{ res.description }}
          </div>
          <div class="text-xs text-color-secondary">Batch: {{ res.batch_name }}</div>
          <div class="text-xs text-color-secondary">Added: {{ res.created_at?.split('T')[0] }}</div>
          <div class="mt-auto pt-2">
            <a
              v-if="res.file_path"
              :href="`/uploads/${res.file_path}`"
              target="_blank"
              download
              class="p-button p-button-outlined p-button-sm w-full flex align-items-center justify-content-center gap-2"
            >
              <i class="pi pi-download" />
              Download
            </a>
            <a
              v-else-if="res.link_url"
              :href="res.link_url"
              target="_blank"
              rel="noopener"
              class="p-button p-button-sm w-full flex align-items-center justify-content-center gap-2"
            >
              <i class="pi pi-external-link" />
              Open Link
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import api from '@/api/axios';
import { useStudentStore } from '@/stores/student.store';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';

const studentStore = useStudentStore();

const resources = ref([]);
const loading = ref(true);
const search = ref('');
const selectedBatch = ref(null);
const selectedType = ref(null);

const batchOptions = computed(() => {
  const names = [...new Set(resources.value.map((r) => r.batch_name).filter(Boolean))];
  return names.map((n) => ({ label: n, value: n }));
});

const typeOptions = [
  { label: 'File', value: 'file' },
  { label: 'Link', value: 'link' },
  { label: 'Note', value: 'note' },
];

const filtered = computed(() =>
  resources.value.filter((r) => {
    const q = search.value.toLowerCase();
    if (q && !r.title?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q))
      return false;
    if (selectedBatch.value && r.batch_name !== selectedBatch.value) return false;
    if (selectedType.value && r.type !== selectedType.value) return false;
    return true;
  }),
);

function typeIcon(type) {
  return { file: 'pi pi-file', link: 'pi pi-link', note: 'pi pi-book' }[type] ?? 'pi pi-file';
}

onMounted(async () => {
  try {
    // Fetch resources for the student's enrolled batches
    const profile = await studentStore.getMyProfile();
    const batchIds = profile?.batches?.map((b) => b.id) ?? [];
    const params = batchIds.length ? { batch_id: batchIds.join(',') } : {};
    const { data } = await api.get('/resources', { params });
    resources.value = data.data ?? data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
</style>
