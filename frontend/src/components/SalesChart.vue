<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import type { SalesGroup, SalesRow } from '@/api/stats'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
  rows: SalesRow[]
  group: SalesGroup
}>()

function fmtLabel(s: string, g: SalesGroup): string {
  const d = new Date(s)
  if (g === 'year') return String(d.getFullYear())
  if (g === 'month') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${d.getMonth() + 1}.${d.getDate()}`
}

const chartData = computed(() => ({
  labels: props.rows.map((r) => fmtLabel(r.bucket, props.group)),
  datasets: [
    {
      label: '매출',
      data: props.rows.map((r) => r.final),
      backgroundColor: 'rgba(49, 130, 246, 0.85)',
      hoverBackgroundColor: 'rgba(27, 100, 218, 0.95)',
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 32,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 240 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(25, 31, 40, 0.95)',
      titleColor: '#fff',
      titleFont: { family: 'Pretendard', size: 12, weight: 500 },
      bodyColor: '#fff',
      bodyFont: { family: 'Pretendard', size: 14, weight: 700 },
      padding: 12,
      cornerRadius: 10,
      displayColors: false,
      callbacks: {
        title: (items: { dataIndex: number }[]) => {
          const i = items[0]?.dataIndex ?? 0
          const row = props.rows[i]
          if (!row) return ''
          return fmtLabel(row.bucket, props.group)
        },
        label: (ctx: { parsed: { y: number | null }; dataIndex: number }) => {
          const row = props.rows[ctx.dataIndex]
          const cnt = row?.count ?? 0
          const v = ctx.parsed.y ?? 0
          return `${v.toLocaleString()}원 (${cnt}건)`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#8B95A1',
        font: { family: 'Pretendard', size: 12 },
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#F2F4F6' },
      border: { display: false },
      ticks: {
        color: '#8B95A1',
        font: { family: 'Pretendard', size: 12 },
        callback: (v: number | string) => {
          const n = Number(v)
          if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
          if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
          if (n >= 1_000) return `${(n / 1_000).toFixed(0)}천`
          return String(n)
        },
      },
    },
  },
}))
</script>

<template>
  <div class="chart">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  height: 320px;
  width: 100%;
}
</style>
