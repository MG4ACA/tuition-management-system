import api from '@/api/axios';
import router from '@/router';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('tms_user') || 'null'));
  const accessToken = ref(localStorage.getItem('tms_access_token') || null);
  const refreshToken = ref(localStorage.getItem('tms_refresh_token') || null);

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value);

  function _persist() {
    localStorage.setItem('tms_user', JSON.stringify(user.value));
    localStorage.setItem('tms_access_token', accessToken.value || '');
    localStorage.setItem('tms_refresh_token', refreshToken.value || '');
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    user.value = data.data.user;
    accessToken.value = data.data.accessToken;
    refreshToken.value = data.data.refreshToken;
    _persist();
    return data.data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout', { refreshToken: refreshToken.value });
    } catch {
      /* ignore */
    }
    user.value = accessToken.value = refreshToken.value = null;
    ['tms_user', 'tms_access_token', 'tms_refresh_token'].forEach((k) =>
      localStorage.removeItem(k),
    );
    router.push('/login');
  }

  async function refreshAccessToken() {
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken: refreshToken.value });
      accessToken.value = data.data.accessToken;
      refreshToken.value = data.data.refreshToken;
      _persist();
      return true;
    } catch {
      return false;
    }
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me');
    user.value = data.data;
    _persist();
  }

  async function changePassword(currentPassword, newPassword) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    await logout();
  }

  return {
    user,
    accessToken,
    refreshToken,
    isLoggedIn,
    login,
    logout,
    refreshAccessToken,
    fetchMe,
    changePassword,
  };
});
