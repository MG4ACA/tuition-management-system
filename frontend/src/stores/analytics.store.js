import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';

export const useAnalyticsStore = defineStore('analytics', () => {
  const overview    = ref(null);
  const revenue     = ref([]);
  const attendance  = ref([]);
  const growth      = ref([]);
  const feeStatus   = ref([]);
  const loading     = ref(false);

  async function fetchOverview(institute_id = null) {
    loading.value = true;
    try {
      const { data } = await api.get('/analytics/overview', { params: institute_id ? { institute_id } : {} });
      overview.value = data.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRevenue(params = {}) {
    const { data } = await api.get('/analytics/revenue', { params });
    revenue.value = data.data;
    return data.data;
  }

  async function fetchAttendanceTrend(params = {}) {
    const { data } = await api.get('/analytics/attendance-trend', { params });
    attendance.value = data.data;
    return data.data;
  }

  async function fetchStudentGrowth(params = {}) {
    const { data } = await api.get('/analytics/student-growth', { params });
    growth.value = data.data;
    return data.data;
  }

  async function fetchFeeStatus(params = {}) {
    const { data } = await api.get('/analytics/fee-status', { params });
    feeStatus.value = data.data;
    return data.data;
  }

  return { overview, revenue, attendance, growth, feeStatus, loading, fetchOverview, fetchRevenue, fetchAttendanceTrend, fetchStudentGrowth, fetchFeeStatus };
});
