<template>
  <div class="flex flex-column align-items-center py-6">
    <div class="surface-card border-round-2xl p-6 border-1 surface-border text-center shadow-4" style="max-width:360px;width:100%">
      <h2 class="mt-0 mb-4">My QR Code</h2>

      <div v-if="loading" class="flex justify-content-center py-6">
        <ProgressSpinner />
      </div>
      <div v-else-if="profile">
        <canvas ref="qrCanvas" class="border-round-lg mb-4" style="display:block;margin:0 auto" />

        <div class="mb-4">
          <div class="font-bold text-xl">{{ profile.name }}</div>
          <div class="text-color-secondary text-sm mt-1">Show this QR code to your teacher to mark attendance.</div>
        </div>

        <div class="bg-surface-100 border-round-lg p-3 text-xs font-mono text-color-secondary mb-4 break-all">
          {{ profile.qr_token }}
        </div>

        <Button label="Download QR" icon="pi pi-download" @click="downloadQR" class="w-full" />
        <p class="text-xs text-color-secondary mt-3">
          <i class="pi pi-info-circle mr-1" />
          Your QR code is unique and tied to your student ID. Keep it safe.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import QRCode from 'qrcode';
import { useStudentStore } from '@/stores/student.store';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';

const studentStore = useStudentStore();
const profile  = ref(null);
const qrCanvas = ref(null);
const loading  = ref(true);

onMounted(async () => {
  try {
    profile.value = await studentStore.getMyProfile();
    await nextTick();
    if (qrCanvas.value && profile.value?.qr_token) {
      await QRCode.toCanvas(qrCanvas.value, profile.value.qr_token, {
        width: 240,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
    }
  } finally {
    loading.value = false;
  }
});

function downloadQR() {
  if (!qrCanvas.value) return;
  const link = document.createElement('a');
  link.download = `qr-${profile.value?.name?.replace(/\s+/g,'-')}.png`;
  link.href = qrCanvas.value.toDataURL();
  link.click();
}
</script>
