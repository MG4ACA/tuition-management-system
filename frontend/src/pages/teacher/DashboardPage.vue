<template>
  <div>
    <!-- Institute Filter -->
    <div class="flex align-items-center gap-3 mb-4 flex-wrap">
      <span class="font-semibold text-lg">Overview</span>
      <Select
        v-model="filterInstitute"
        :options="[{ id: null, name: 'All Institutes' }, ...instituteStore.institutes]"
        option-label="name"
        option-value="id"
        class="ml-auto"
        @change="loadData"
      />
    </div>

    <!-- Stat Cards -->
    <div class="grid mb-4">
      <div class="col-12 md:col-6 lg:col-3" v-for="stat in stats" :key="stat.label">
        <div class="stat-card surface-card border-round-xl p-4 border-1 surface-border">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="text-color-secondary text-sm mb-1">{{ stat.label }}</div>
              <div class="text-3xl font-bold">{{ stat.value }}</div>
              <div v-if="stat.sub" class="text-sm mt-1" :class="stat.subClass">{{ stat.sub }}</div>
            </div>
            <div class="stat-icon" :class="stat.iconBg">
              <i :class="['pi text-xl', stat.icon]" :style="{ color: stat.iconColor }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid">
      <!-- Revenue Chart -->
      <div class="col-12 lg:col-8">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3 class="m-0 font-semibold">Revenue (Last 6 Months)</h3>
          </div>
          <canvas ref="revenueChartRef" height="100" />
        </div>
      </div>

      <!-- Fee Status Donut -->
      <div class="col-12 lg:col-4">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <h3 class="m-0 font-semibold mb-3">Fee Status This Month</h3>
          <canvas ref="feeChartRef" height="160" />
          <div class="flex flex-column gap-2 mt-3">
            <div v-for="item in analyticsStore.feeStatus" :key="item.status"
                 class="flex justify-content-between align-items-center text-sm">
              <span class="flex align-items-center gap-2">
                <span class="w-1rem h-1rem border-round" :style="{ background: feeColors[item.status] }" />
                {{ item.status }}
              </span>
              <span class="font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Student Growth -->
      <div class="col-12 lg:col-6">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <h3 class="m-0 font-semibold mb-3">Student Growth</h3>
          <canvas ref="growthChartRef" height="100" />
        </div>
      </div>

      <!-- Attendance Trend -->
      <div class="col-12 lg:col-6">
        <div class="surface-card border-round-xl p-4 border-1 surface-border">
          <h3 class="m-0 font-semibold mb-3">Attendance Trend (Last 30 Days)</h3>
          <canvas ref="attChartRef" height="100" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import Select from 'primevue/select';
import { useAnalyticsStore } from '@/stores/analytics.store';
import { useInstituteStore } from '@/stores/institute.store';

Chart.register(...registerables);

const analyticsStore = useAnalyticsStore();
const instituteStore = useInstituteStore();
const filterInstitute = ref(null);

const revenueChartRef = ref(null);
const feeChartRef     = ref(null);
const growthChartRef  = ref(null);
const attChartRef     = ref(null);
let revenueChart, feeChart, growthChart, attChart;

const feeColors = {
  paid: '#22c55e', pending: '#f59e0b', partial: '#3b82f6', waived: '#8b5cf6',
};

const stats = computed(() => {
  const o = analyticsStore.overview;
  if (!o) return [];
  const revDiff = o.revenue_this_month - o.revenue_last_month;
  return [
    { label: 'Total Students',   value: o.students,            icon: 'pi-users',     iconBg: 'icon-blue',   iconColor: '#3b82f6' },
    { label: 'Active Batches',   value: o.batches,             icon: 'pi-calendar',  iconBg: 'icon-violet', iconColor: '#8b5cf6' },
    { label: 'Revenue (Month)',  value: `LKR ${Number(o.revenue_this_month).toLocaleString()}`, icon: 'pi-wallet', iconBg: 'icon-green', iconColor: '#22c55e',
      sub: revDiff >= 0 ? `▲ +${Math.abs(revDiff).toLocaleString()} vs last month` : `▼ -${Math.abs(revDiff).toLocaleString()} vs last month`,
      subClass: revDiff >= 0 ? 'text-green-500' : 'text-red-500' },
    { label: 'Attendance Today', value: o.attendance_today,    icon: 'pi-qrcode',    iconBg: 'icon-orange', iconColor: '#f59e0b' },
  ];
});

async function loadData() {
  await analyticsStore.fetchOverview(filterInstitute.value);
  const inst = filterInstitute.value;
  const [rev, att, growth, fee] = await Promise.all([
    analyticsStore.fetchRevenue({ months: 6, ...(inst && { institute_id: inst }) }),
    analyticsStore.fetchAttendanceTrend({ days: 30 }),
    analyticsStore.fetchStudentGrowth({ months: 6 }),
    analyticsStore.fetchFeeStatus({ ...(inst && { institute_id: inst }) }),
  ]);
  await nextTick();
  buildCharts(rev, att, growth);
}

function buildCharts(rev, att, growth) {
  if (revenueChart) revenueChart.destroy();
  if (feeChart)     feeChart.destroy();
  if (growthChart)  growthChart.destroy();
  if (attChart)     attChart.destroy();

  // Revenue
  revenueChart = new Chart(revenueChartRef.value, {
    type: 'bar',
    data: {
      labels: rev.map(r => r.month),
      datasets: [{ label: 'Revenue (LKR)', data: rev.map(r => r.revenue), backgroundColor: '#3b82f6', borderRadius: 6 }],
    },
    options: { plugins: { legend: { display: false } }, responsive: true },
  });

  // Fee donut
  const feeData = analyticsStore.feeStatus;
  feeChart = new Chart(feeChartRef.value, {
    type: 'doughnut',
    data: {
      labels: feeData.map(f => f.status),
      datasets: [{ data: feeData.map(f => f.count), backgroundColor: feeData.map(f => feeColors[f.status] || '#ccc') }],
    },
    options: { plugins: { legend: { display: false } }, cutout: '65%' },
  });

  // Growth
  growthChart = new Chart(growthChartRef.value, {
    type: 'line',
    data: {
      labels: growth.map(g => g.month),
      datasets: [{ label: 'New Students', data: growth.map(g => g.new_students), borderColor: '#8b5cf6', fill: true, backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4 }],
    },
    options: { plugins: { legend: { display: false } }, responsive: true },
  });

  // Attendance
  attChart = new Chart(attChartRef.value, {
    type: 'line',
    data: {
      labels: att.map(a => a.date),
      datasets: [
        { label: 'Present', data: att.map(a => a.present), borderColor: '#22c55e', tension: 0.4 },
        { label: 'Absent',  data: att.map(a => a.absent),  borderColor: '#ef4444', tension: 0.4 },
      ],
    },
    options: { responsive: true },
  });
}

onMounted(loadData);
</script>

<style scoped>
.stat-card { transition: box-shadow 0.2s; }
.stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }

.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.icon-blue   { background: rgba(59,130,246,0.1); }
.icon-violet { background: rgba(139,92,246,0.1); }
.icon-green  { background: rgba(34,197,94,0.1); }
.icon-orange { background: rgba(245,158,11,0.1); }
</style>
