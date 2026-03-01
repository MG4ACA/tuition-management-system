<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="text-center mb-5">
        <i class="pi pi-graduation-cap text-primary" style="font-size: 3rem" />
        <h1 class="text-2xl font-bold mt-3 mb-1">Tuition Management System</h1>
        <p class="text-color-secondary m-0">Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="field mb-4">
          <label class="block mb-2 font-medium">Email</label>
          <InputText
            v-model="form.email"
            type="email"
            placeholder="Enter your email"
            class="w-full"
            :class="{ 'p-invalid': errors.email }"
            autofocus
          />
          <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
        </div>

        <div class="field mb-5">
          <label class="block mb-2 font-medium">Password</label>
          <Password
            v-model="form.password"
            placeholder="Enter your password"
            class="w-full"
            :feedback="false"
            toggle-mask
            input-class="w-full"
            :class="{ 'p-invalid': errors.password }"
          />
          <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
        </div>

        <Message v-if="errorMsg" severity="error" class="mb-4">{{ errorMsg }}</Message>

        <Button
          type="submit"
          label="Sign In"
          icon="pi pi-sign-in"
          class="w-full"
          :loading="loading"
        />
      </form>

      <div class="text-center mt-4 text-sm text-color-secondary">
        <i class="pi pi-lock mr-1" />
        Contact your teacher to get access credentials.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth.store';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const authStore = useAuthStore();
const router    = useRouter();
const toast     = useToast();

const form     = ref({ email: '', password: '' });
const errors   = ref({});
const loading  = ref(false);
const errorMsg = ref('');

function validate() {
  errors.value = {};
  if (!form.value.email)    errors.value.email    = 'Email is required';
  if (!form.value.password) errors.value.password = 'Password is required';
  return !Object.keys(errors.value).length;
}

async function handleLogin() {
  if (!validate()) return;
  loading.value  = true;
  errorMsg.value = '';
  try {
    const user = await authStore.login(form.value.email, form.value.password);
    toast.add({ severity: 'success', summary: 'Welcome!', detail: `Hello, ${user.name}`, life: 3000 });
    router.push(user.role === 'teacher' ? '/' : '/student');
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-ground);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
</style>
