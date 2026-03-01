import api from '@/api/axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBatchStore = defineStore('batch', () => {
  const batches = ref([]);
  const loading = ref(false);

  async function fetchAll(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get('/batches', { params });
      batches.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload) {
    const { data } = await api.post('/batches', payload);
    batches.value.push(data.data);
    return data.data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/batches/${id}`, payload);
    const idx = batches.value.findIndex((b) => b.id === id);
    if (idx !== -1) batches.value[idx] = data.data;
    return data.data;
  }

  async function remove(id) {
    await api.delete(`/batches/${id}`);
    batches.value = batches.value.filter((b) => b.id !== id);
  }

  async function getStudents(batchId) {
    const { data } = await api.get(`/batches/${batchId}/students`);
    return data.data;
  }

  return { batches, loading, fetchAll, create, update, remove, getStudents };
});
