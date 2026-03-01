<template>
  <div>
    <div class="surface-card border-round-xl p-5 border-1 surface-border mb-4">
      <div class="flex align-items-center gap-4">
        <Avatar :label="profile?.name?.[0]" shape="circle" size="xlarge"
                style="background:#3b82f6;color:white;font-size:1.5rem" />
        <div>
          <h2 class="m-0">{{ profile?.name }}</h2>
          <p class="text-color-secondary m-0">{{ authStore.user?.email }}</p>
        </div>
        <RouterLink to="/student/qr" class="ml-auto p-button p-button-outlined">
          <i class="pi pi-qrcode mr-2" /> Show My QR Code
        </RouterLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid mb-4">
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl p-4 border-1 surface-border text-center">
          <div class="text-3xl font-bold text-primary">{{ attendanceStats.present }}</div>
          <div class="text-color-secondary mt-1">Classes Attended</div>
          <ProgressBar :value="attendanceStats.rate" class="mt-2" />
          <div class="text-xs text-color-secondary mt-1">{{ attendanceStats.rate }}% attendance rate</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl p-4 border-1 surface-border text-center">
          <div class="text-3xl font-bold text-purple-500">{{ marksAvg }}%</div>
          <div class="text-color-secondary mt-1">Average Score</div>
          <div class="text-xs mt-1">Across {{ recentMarks.length }} tests</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card border-round-xl p-4 border-1 surface-border text-center">
          <div class="text-3xl font-bold" :class="pendingFees > 0 ? 'text-orange-500' : 'text-green-500'">
            {{ pendingFees > 0 ? `LKR ${pendingFees.toLocaleString()}` : '✓ Clear' }}
          </div>
          <div class="text-color-secondary mt-1">Fee Status</div>
          <Tag :value="pendingFees > 0 ? 'Fee Pending' : 'All Paid'" :severity="pendingFees > 0 ? 'warn' : 'success'" class="mt-2" />
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="grid">
      <div class="col-12 lg:col-6">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3 class="m-0">Recent Attendance</h3>
            <RouterLink to="/student/attendance" class="text-sm text-primary">View all →</RouterLink>
          </div>
          <div class="flex flex-column gap-2">
            <div v-for="rec in recentAttendance" :key="rec.id" class="flex align-items-center justify-content-between">
              <div>
                <div class="text-sm font-medium">{{ rec.batch_name }}</div>
                <div class="text-xs text-color-secondary">{{ rec.date?.split('T')[0] }}</div>
              </div>
              <Tag :value="rec.status" :severity="rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warn' : 'danger'" />
            </div>
            <div v-if="!recentAttendance.length" class="text-color-secondary text-sm">No records yet.</div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3 class="m-0">Recent Test Results</h3>
            <RouterLink to="/student/marks" class="text-sm text-primary">View all →</RouterLink>
          </div>
          <div class="flex flex-column gap-2">
            <div v-for="mark in recentMarks.slice(0,5)" :key="mark.id" class="flex align-items-center justify-content-between">
              <div>
                <div class="text-sm font-medium">{{ mark.test_name }}</div>
                <div class="text-xs text-color-secondary">{{ mark.batch_name }} · {{ mark.test_date?.split('T')[0] }}</div>
              </div>
              <span class="font-bold" :class="mark.percentage >= 75 ? 'text-green-500' : mark.percentage >= 50 ? 'text-orange-500' : 'text-red-500'">
                {{ mark.percentage }}%
              </span>
            </div>
            <div v-if="!recentMarks.length" class="text-color-secondary text-sm">No results yet.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useStudentStore } from '@/stores/student.store';
import { useAttendanceStore } from '@/stores/attendance.store';
import { useMarksStore } from '@/stores/marks.store';
import { useFeesStore } from '@/stores/fees.store';
import Avatar from 'primevue/avatar';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';

const authStore      = useAuthStore();
const studentStore   = useStudentStore();
const attendanceStore = useAttendanceStore();
const marksStore     = useMarksStore();
const feesStore      = useFeesStore();

const profile         = ref(null);
const recentAttendance = ref([]);
const recentMarks     = ref([]);
const fees            = ref([]);

const attendanceStats = computed(() => {
  const total   = recentAttendance.value.length;
  const present = recentAttendance.value.filter(r => r.status === 'present').length;
  const rate    = total ? Math.round((present / total) * 100) : 0;
  return { present, total, rate };
});

const marksAvg = computed(() => {
  if (!recentMarks.value.length) return 0;
  const avg = recentMarks.value.reduce((sum, m) => sum + Number(m.percentage), 0) / recentMarks.value.length;
  return Math.round(avg);
});

const pendingFees = computed(() =>
  fees.value.filter(f => f.status === 'pending' || f.status === 'partial')
            .reduce((sum, f) => sum + Number(f.amount), 0)
);

onMounted(async () => {
  const [att, marks, feeData, prof] = await Promise.all([
    attendanceStore.getMyAttendance(),
    marksStore.getMyMarks(),
    feesStore.getMyFees(),
    studentStore.getMyProfile(),
  ]);
  profile.value          = prof;
  recentAttendance.value = att.slice(0, 10);
  recentMarks.value      = marks;
  fees.value             = feeData;
});
</script>
