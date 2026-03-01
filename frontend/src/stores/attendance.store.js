import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';

export const useAttendanceStore = defineStore('attendance', () => {
  const records  = ref([]);
  const loading  = ref(false);
  const scanning = ref(false);

  async function scan(qr_token, batch_id) {
    scanning.value = true;
    try {
      const { data } = await api.post('/attendance/scan', { qr_token, batch_id });
      return data;
    } finally {
      scanning.value = false;
    }
  }

  async function fetchAll(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get('/attendance', { params });
      records.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function getSummary(params = {}) {
    const { data } = await api.get('/attendance/summary', { params });
    return data.data;
  }

  async function create(payload) {
    const { data } = await api.post('/attendance', payload);
    return data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/attendance/${id}`, payload);
    return data;
  }

  async function remove(id) {
    await api.delete(`/attendance/${id}`);
    records.value = records.value.filter(r => r.id !== id);
  }

  // Student portal
  async function getMyAttendance() {
    const { data } = await api.get('/attendance/student-me');
    return data.data;
  }

  return { records, loading, scanning, scan, fetchAll, getSummary, create, update, remove, getMyAttendance };
});
