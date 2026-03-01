import api from '@/api/axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFeesStore = defineStore('fees', () => {
  const records = ref([]);
  const loading = ref(false);

  async function fetchAll(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get('/fees', { params });
      records.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function generate(batch_id, month) {
    const { data } = await api.post('/fees/generate', { batch_id, month });
    return data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/fees/${id}`, payload);
    const idx = records.value.findIndex((r) => r.id === id);
    if (idx !== -1) records.value[idx] = data.data;
    return data.data;
  }

  async function getPendingStudents(batch_id, month) {
    const { data } = await api.get('/fees/pending-students', { params: { batch_id, month } });
    return data.data;
  }

  async function getMyFees() {
    const { data } = await api.get('/fees/student-me');
    return data.data;
  }

  return { records, loading, fetchAll, generate, update, getPendingStudents, getMyFees };
});
