<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Trophy, TrendingUp, Tag, Package } from 'lucide-vue-next'
import AppCard from '@/components/ui/AppCard.vue'
import SalesChart from '@/components/SalesChart.vue'
import {
  statsApi,
  type Summary,
  type RankingRow,
  type SalesRow,
  type SalesGroup,
  type CategoryStatRow,
  type ItemStatRow,
} from '@/api/stats'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const summary = ref<Summary | null>(null)
const ranking = ref<RankingRow[]>([])
const sales = ref<SalesRow[]>([])
const categories = ref<CategoryStatRow[]>([])
const topItems = ref<ItemStatRow[]>([])

const group = ref<SalesGroup>('day')
const loadingSales = ref(false)

const totalInPeriod = computed(() =>
  sales.value.reduce((s, x) => s + x.final, 0),
)
const countInPeriod = computed(() =>
  sales.value.reduce((s, x) => s + x.count, 0),
)

function rangeForGroup(g: SalesGroup): string {
  const d = new Date()
  if (g === 'day') {
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
  } else if (g === 'month') {
    d.setMonth(d.getMonth() - 11)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setFullYear(d.getFullYear() - 4)
    d.setMonth(0)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d.toISOString()
}

function groupLabel(g: SalesGroup) {
  if (g === 'day') return '최근 30일'
  if (g === 'month') return '최근 12개월'
  return '최근 5년'
}

async function loadSales() {
  loadingSales.value = true
  try {
    sales.value = await statsApi.sales(rangeForGroup(group.value), undefined, group.value)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingSales.value = false
  }
}

async function loadOthers() {
  try {
    const monthFrom = (() => {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return d.toISOString()
    })()
    const [s, r, c, it] = await Promise.all([
      statsApi.summary(),
      statsApi.ranking(20),
      statsApi.categories(monthFrom),
      statsApi.items(10, monthFrom),
    ])
    summary.value = s
    ranking.value = r
    categories.value = c
    topItems.value = it
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

watch(group, loadSales)
onMounted(() => {
  loadSales()
  loadOthers()
})
</script>

<template>
  <div class="page">
    <h1 class="t-title-1" style="margin-bottom: 16px">통계</h1>

    <div v-if="summary" class="cards">
      <div class="kpi">
        <div class="t-caption text-tert">총 회원</div>
        <div class="kpi__v num">
          {{ summary.totals.members.toLocaleString() }}<span class="kpi__u">명</span>
        </div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">누적 결제</div>
        <div class="kpi__v num">
          {{ summary.totals.payments.toLocaleString() }}<span class="kpi__u">건</span>
        </div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">누적 매출</div>
        <div class="kpi__v num">
          {{ summary.totals.total.toLocaleString() }}<span class="kpi__u">원</span>
        </div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">오늘 매출</div>
        <div class="kpi__v num" style="color: var(--color-primary)">
          {{ summary.today.total.toLocaleString() }}<span class="kpi__u">원</span>
        </div>
        <div class="t-caption text-tert num" style="margin-top: 4px">
          {{ summary.today.count }}건
        </div>
      </div>
    </div>

    <AppCard padding="lg" class="chart-card">
      <template #header>
        <div class="chart-card__head">
          <h3 class="chart-card__title">
            <TrendingUp :size="20" />
            <span>매출 추이</span>
          </h3>
          <div class="chart-card__sub">
            <span class="t-caption text-tert">{{ groupLabel(group) }} 합계</span>
            <span class="num chart-card__total">{{ totalInPeriod.toLocaleString() }}원</span>
            <span class="t-caption text-tert num">{{ countInPeriod }}건</span>
          </div>
        </div>
      </template>
      <template #actions>
        <div class="seg" role="tablist">
          <button
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': group === 'day' }"
            @click="group = 'day'"
          >
            일별
          </button>
          <button
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': group === 'month' }"
            @click="group = 'month'"
          >
            월별
          </button>
          <button
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': group === 'year' }"
            @click="group = 'year'"
          >
            년간
          </button>
        </div>
      </template>

      <div v-if="loadingSales" class="loading t-body-2 text-tert">불러오는 중...</div>
      <div v-else-if="sales.length === 0" class="loading t-body-2 text-tert">
        해당 기간에 결제 내역이 없습니다.
      </div>
      <SalesChart v-else :rows="sales" :group="group" />
    </AppCard>

    <div class="grid">
      <AppCard padding="lg">
        <template #header>
          <h3 class="hdr"><Trophy :size="18" /> 회원 포인트 랭킹</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>이름</th>
              <th style="text-align: right">포인트</th>
              <th style="text-align: right">방문</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in ranking" :key="r.id">
              <td class="num">{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td class="num" style="text-align: right">{{ r.point.toLocaleString() }}P</td>
              <td class="num" style="text-align: right">{{ r.visit_count }}</td>
            </tr>
          </tbody>
        </table>
      </AppCard>

      <AppCard padding="lg">
        <template #header>
          <h3 class="hdr"><Tag :size="18" /> 카테고리 비중 (최근 1개월)</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th style="text-align: right">건수</th>
              <th style="text-align: right">매출</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in categories" :key="r.id">
              <td>{{ r.name }}</td>
              <td class="num" style="text-align: right">{{ r.count }}</td>
              <td class="num" style="text-align: right">{{ r.total.toLocaleString() }}원</td>
            </tr>
          </tbody>
        </table>
      </AppCard>

      <AppCard padding="lg" class="full">
        <template #header>
          <h3 class="hdr"><Package :size="18" /> 인기 품목 Top 10 (최근 1개월)</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>품명</th>
              <th style="text-align: right">건수</th>
              <th style="text-align: right">매출</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in topItems" :key="r.item_name">
              <td>{{ r.item_name }}</td>
              <td class="num" style="text-align: right">{{ r.count }}</td>
              <td class="num" style="text-align: right">{{ r.total.toLocaleString() }}원</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
@media (max-width: 768px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
.kpi {
  background: #fff;
  border: var(--border);
  border-radius: 16px;
  padding: 20px;
}
.kpi__v {
  margin-top: 4px;
  font: var(--font-title-1);
  color: var(--color-text-strong);
}
.kpi__u {
  font: var(--font-body-3);
  color: var(--color-text-tert);
  margin-left: 4px;
}

.chart-card {
  margin-bottom: 16px;
}
.chart-card__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chart-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font: var(--font-title-2);
  color: var(--color-text-strong);
}
.chart-card__sub {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}
.chart-card__total {
  font: var(--font-title-3);
  color: var(--color-primary);
}

.seg {
  display: inline-flex;
  padding: 4px;
  background: var(--color-bg-hover);
  border-radius: var(--radius-pill);
  gap: 2px;
}
.seg__btn {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  font: var(--font-body-3);
  color: var(--color-text-sub);
  background: transparent;
  transition: all 120ms ease;
}
.seg__btn:hover {
  color: var(--color-text-strong);
}
.seg__btn--active {
  background: #fff;
  color: var(--color-text-strong);
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.loading {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.full {
  grid-column: 1 / -1;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.hdr {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font: var(--font-title-3);
  color: var(--color-text-strong);
}
.table {
  font: var(--font-body-3);
  width: 100%;
}
.table th,
.table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-line-soft);
  text-align: left;
}
.table th {
  font: var(--font-caption);
  font-weight: 500;
  color: var(--color-text-tert);
}
</style>
