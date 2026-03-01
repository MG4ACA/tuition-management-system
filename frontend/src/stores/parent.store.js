import api from '@/api/axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useParentStore = defineStore('parent', () => {
  const child = ref(null);
  const loading = ref(false);

  async function getChild() {
    loading.value = true;
    try {
      const { data } = await api.get('/parent/child');
      child.value = data.data;
      return data.data;
    } finally {
      loading.value = false;
    }
  }

  async function getAttendance(params = {}) {
    const { data } = await api.get('/parent/attendance', { params });
    return data.data;
  }

  async function getMarks(params = {}) {
    const { data } = await api.get('/parent/marks', { params });
    return data.data;
  }

  async function getFees() {
    const { data } = await api.get('/parent/fees');
    return { records: data.data, meta: data.meta };
  }

  return { child, loading, getChild, getAttendance, getMarks, getFees };
});
