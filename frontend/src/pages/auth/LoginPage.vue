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

      <!-- Demo account quick-fill -->
      <div class="demo-section mt-4">
        <p class="demo-label">Demo accounts</p>
        <div class="demo-chips">
          <button
            v-for="demo in demoAccounts"
            :key="demo.role"
            type="button"
            class="demo-chip"
            :class="`demo-chip--${demo.role}`"
            @click="fillDemo(demo)"
          >
            <i :class="demo.icon" class="mr-1" />
            {{ demo.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth.store';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const form = ref({ email: '', password: '' });
const errors = ref({});
const loading = ref(false);
const errorMsg = ref('');

const demoAccounts = [
  {
    role: 'teacher',
    label: 'Teacher',
    icon: 'pi pi-user',
    email: 'teacher@tuition.local',
    password: 'Admin@1234',
  },
  {
    role: 'student',
    label: 'Student',
    icon: 'pi pi-book',
    email: 'student1@student.local',
    password: 'Student@1234',
  },
  {
    role: 'parent',
    label: 'Parent',
    icon: 'pi pi-users',
    email: 'parent1@parent.local',
    password: 'Parent@1234',
  },
];

function fillDemo(demo) {
  form.value.email = demo.email;
  form.value.password = demo.password;
  errors.value = {};
  errorMsg.value = '';
}

function validate() {
  errors.value = {};
  if (!form.value.email) errors.value.email = 'Email is required';
  if (!form.value.password) errors.value.password = 'Password is required';
  return !Object.keys(errors.value).length;
}

async function handleLogin() {
  if (!validate()) return;
  loading.value = true;
  errorMsg.value = '';
  try {
    const user = await authStore.login(form.value.email, form.value.password);
    toast.add({
      severity: 'success',
      summary: 'Welcome!',
      detail: `Hello, ${user.name}`,
      life: 3000,
    });
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
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

@media (max-width: 767px) {
  .login-wrapper {
    align-items: flex-start;
    padding-top: 2rem;
  }

  .login-card {
    padding: 1.5rem 1.25rem;
    border-radius: 12px;
    box-shadow: none;
    border: 1px solid var(--p-surface-border);
  }
}

/* ── Demo accounts ── */
.demo-section {
  border-top: 1px dashed var(--p-surface-border);
  padding-top: 0.85rem;
}

.demo-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color, #94a3b8);
  margin: 0 0 0.55rem;
  text-align: center;
}

.demo-chips {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.demo-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid;
  cursor: pointer;
  transition:
    opacity 0.15s,
    transform 0.1s;
  background: transparent;
}

.demo-chip:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}
.demo-chip:active {
  transform: translateY(0);
}

.demo-chip--teacher {
  color: #6366f1;
  border-color: #6366f1;
}
.demo-chip--student {
  color: #22c55e;
  border-color: #22c55e;
}
.demo-chip--parent {
  color: #f59e0b;
  border-color: #f59e0b;
}
</style>
