import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import * as authApi from '@/api/auth';
import type { LoginParams, UserInfo } from '@/api/auth';

const TOKEN_KEY = 'rag_access_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const user = ref<UserInfo | null>(null);
  const initialized = ref(false);
  const isAuthenticated = computed(() => Boolean(token.value));

  async function signIn(params: LoginParams) {
    const result = await authApi.login(params);
    token.value = result.accessToken;
    user.value = result.user;
    localStorage.setItem(TOKEN_KEY, result.accessToken);
  }

  async function restoreSession() {
    if (!token.value) {
      initialized.value = true;
      return false;
    }
    try {
      user.value = await authApi.getCurrentUser();
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      initialized.value = true;
    }
  }

  async function signOut() {
    try {
      if (token.value) await authApi.logout();
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    token.value = '';
    user.value = null;
    initialized.value = true;
    localStorage.removeItem(TOKEN_KEY);
  }

  return { token, user, initialized, isAuthenticated, signIn, restoreSession, signOut, clearSession };
});
