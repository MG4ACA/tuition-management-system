<template>
  <div class="grid">
    <!-- QR Scanner Panel -->
    <div class="col-12 lg:col-5">
      <div class="surface-card border-round-xl p-4 border-1 surface-border">
        <h3 class="mt-0 mb-3">QR Scanner</h3>

        <div class="field mb-3">
          <label class="block mb-1 font-medium">Select Batch</label>
          <Select v-model="selectedBatch" :options="batchStore.batches" option-label="name" option-value="id"
                  class="w-full" placeholder="Choose batch..." @change="resetScan" />
        </div>

        <div v-if="selectedBatch">
          <div v-if="!scanning" class="text-center">
            <Button label="Start Scanner" icon="pi pi-camera" @click="startScanner" class="mb-3" />
          </div>

          <!-- QR Reader -->
          <div id="qr-reader" class="w-full border-round overflow-hidden mb-3" style="min-height: 250px" />

          <Button v-if="scanning" label="Stop Scanner" icon="pi pi-stop" severity="secondary" @click="stopScanner" />

          <!-- Manual QR Input fallback -->
          <Divider />
          <div class="flex gap-2">
            <InputText v-model="manualToken" class="flex-1" placeholder="Or paste QR token manually..." />
            <Button icon="pi pi-check" :loading="processing" @click="processToken(manualToken)" />
          </div>
        </div>
        <div v-else class="text-center py-5 text-color-secondary">
          <i class="pi pi-qrcode text-5xl block mb-3" />
          Select a batch to start scanning
        </div>
      </div>
    </div>

    <!-- Scan Results -->
    <div class="col-12 lg:col-7">
      <div class="surface-card border-round-xl p-4 border-1 surface-border mb-4">
        <h3 class="mt-0 mb-3">Last Scan Result</h3>
        <div v-if="lastResult">
          <div class="flex align-items-center gap-3 p-3 border-round-lg"
               :class="lastResult.success ? 'bg-green-50' : 'bg-red-50'">
            <i class="pi text-3xl" :class="lastResult.success ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'" />
            <div class="flex-1">
              <div class="font-bold text-lg">{{ lastResult.success ? lastResult.data?.name : 'Error' }}</div>
              <div class="text-color-secondary text-sm">{{ lastResult.message }}</div>
              <Tag v-if="lastResult.data?.fee_status === 'pending'" value="⚠ Fee Pending" severity="warn" class="mt-1" />
              <Tag v-if="lastResult.data?.fee_status === 'paid'"    value="✓ Fee Paid"    severity="success" class="mt-1" />
            </div>
          </div>
        </div>
        <div v-else class="text-color-secondary text-sm">Scan a QR code to see results here.</div>
      </div>

      <!-- Today's Attendance -->
      <div class="surface-card border-round-xl p-4 border-1 surface-border">
        <div class="flex justify-content-between align-items-center mb-3">
          <h3 class="m-0">Today's Attendance</h3>
          <Tag :value="`${todayRecords.length} scanned`" severity="info" />
        </div>
        <DataTable :value="todayRecords" class="p-datatable-sm" :rows="10" paginator>
          <Column field="student_name" header="Student" sortable />
          <Column field="scanned_at" header="Time">
            <template #body="{ data }">{{ data.scanned_at ? new Date(data.scanned_at).toLocaleTimeString() : '—' }}</template>
          </Column>
          <Column field="status" header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'present' ? 'success' : data.status === 'late' ? 'warn' : 'danger'" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from 'primevue/usetoast';
import { useAttendanceStore } from '@/stores/attendance.store';
import { useBatchStore } from '@/stores/batch.store';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';

const attendanceStore = useAttendanceStore();
const batchStore      = useBatchStore();
const toast = useToast();

const selectedBatch = ref(null);
const scanning      = ref(false);
const processing    = ref(false);
const lastResult    = ref(null);
const manualToken   = ref('');
const todayRecords  = ref([]);

let html5Qrcode;

async function startScanner() {
  scanning.value = true;
  await new Promise(r => setTimeout(r, 100));
  html5Qrcode = new Html5Qrcode('qr-reader');
  try {
    await html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        await html5Qrcode.pause(true);
        await processToken(decodedText);
        setTimeout(() => html5Qrcode.resume(), 2000);
      },
      () => {}
    );
  } catch {
    toast.add({ severity: 'error', summary: 'Camera error', detail: 'Could not access camera', life: 3000 });
    scanning.value = false;
  }
}

async function stopScanner() {
  if (html5Qrcode?.isScanning) {
    await html5Qrcode.stop();
  }
  scanning.value = false;
}

async function processToken(token) {
  if (!token || !selectedBatch.value) return;
  processing.value = true;
  try {
    const result = await attendanceStore.scan(token.trim(), selectedBatch.value);
    lastResult.value = { success: true, ...result };
    manualToken.value = '';
    loadTodayAttendance();
  } catch (e) {
    lastResult.value = { success: false, message: e.response?.data?.message || 'Scan failed' };
  } finally {
    processing.value = false;
  }
}

async function loadTodayAttendance() {
  if (!selectedBatch.value) return;
  const today = new Date().toISOString().split('T')[0];
  await attendanceStore.fetchAll({ batch_id: selectedBatch.value, date: today });
  todayRecords.value = attendanceStore.records;
}

function resetScan() {
  lastResult.value = null;
  todayRecords.value = [];
  loadTodayAttendance();
}

onMounted(async () => {
  await batchStore.fetchAll();
});

onBeforeUnmount(() => {
  if (html5Qrcode?.isScanning) {
    html5Qrcode.stop().catch(() => {});
  }
});
</script>
