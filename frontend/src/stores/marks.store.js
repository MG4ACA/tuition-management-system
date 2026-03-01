import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';

export const useMarksStore = defineStore('marks', () => {
  const records = ref([]);
  const loading = ref(false);

  async function fetchAll(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get('/marks', { params });
      records.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload) {
    const { data } = await api.post('/marks', payload);
    records.value.unshift(data.data);
    return data.data;
  }

  async function createBulk(payload) {
    const { data } = await api.post('/marks/bulk', payload);
    return data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/marks/${id}`, payload);
    const idx = records.value.findIndex(r => r.id === id);
    if (idx !== -1) records.value[idx] = data.data;
    return data.data;
  }

  async function remove(id) {
    await api.delete(`/marks/${id}`);
    records.value = records.value.filter(r => r.id !== id);
  }

  async function getMyMarks() {
    const { data } = await api.get('/marks/student-me');
    return data.data;
  }

  return { records, loading, fetchAll, create, createBulk, update, remove, getMyMarks };
});
