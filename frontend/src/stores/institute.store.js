import api from '@/api/axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useInstituteStore = defineStore('institute', () => {
  const institutes = ref([]);
  const loading = ref(false);
  const selected = ref(null); // currently filtered institute

  async function fetchAll() {
    loading.value = true;
    try {
      const { data } = await api.get('/institutes');
      institutes.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload) {
    const { data } = await api.post('/institutes', payload);
    institutes.value.push(data.data);
    return data.data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/institutes/${id}`, payload);
    const idx = institutes.value.findIndex((i) => i.id === id);
    if (idx !== -1) institutes.value[idx] = data.data;
    return data.data;
  }

  async function remove(id) {
    await api.delete(`/institutes/${id}`);
    institutes.value = institutes.value.filter((i) => i.id !== id);
  }

  async function getSummary(id) {
    const { data } = await api.get(`/institutes/${id}/summary`);
    return data.data;
  }

  function setSelected(id) {
    selected.value = id;
  }

  return {
    institutes,
    loading,
    selected,
    fetchAll,
    create,
    update,
    remove,
    getSummary,
    setSelected,
  };
});
