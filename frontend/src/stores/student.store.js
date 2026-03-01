import api from '@/api/axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useStudentStore = defineStore('student', () => {
  const students = ref([]);
  const loading = ref(false);

  async function fetchAll(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get('/students', { params });
      students.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function getOne(id) {
    const { data } = await api.get(`/students/${id}`);
    return data.data;
  }

  async function create(payload) {
    const { data } = await api.post('/students', payload);
    students.value.push(data.data);
    return data.data;
  }

  async function update(id, payload) {
    const { data } = await api.put(`/students/${id}`, payload);
    const idx = students.value.findIndex((s) => s.id === id);
    if (idx !== -1) students.value[idx] = { ...students.value[idx], ...data.data };
    return data.data;
  }

  async function remove(id) {
    await api.delete(`/students/${id}`);
    students.value = students.value.filter((s) => s.id !== id);
  }

  async function getByQR(token) {
    const { data } = await api.get(`/students/by-qr/${token}`);
    return data.data;
  }

  async function enrollBatch(studentId, batchId) {
    await api.post(`/students/${studentId}/enroll`, { batch_id: batchId });
  }

  async function unenrollBatch(studentId, batchId) {
    await api.delete(`/students/${studentId}/enroll/${batchId}`);
  }

  // Student portal
  async function getMyProfile() {
    const { data } = await api.get('/students/me');
    return data.data;
  }

  return {
    students,
    loading,
    fetchAll,
    getOne,
    create,
    update,
    remove,
    getByQR,
    enrollBatch,
    unenrollBatch,
    getMyProfile,
  };
});
