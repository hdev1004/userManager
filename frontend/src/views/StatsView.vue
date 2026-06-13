<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Trophy, Calendar, Tag, Package } from 'lucide-vue-next'
import AppCard from '@/components/ui/AppCard.vue'
import {
  statsApi,
  type Summary,
  type RankingRow,
  type SalesRow,
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

async function load() {
  try {
    const [s, r, sl, c, it] = await Promise.all([
      statsApi.summary(),
      statsApi.ranking(20),
      statsApi.sales(monthAgo(), undefined),
      statsApi.categories(monthAgo(), undefined),
      statsApi.items(10, monthAgo(), undefined),
    ])
    summary.value = s
    ranking.value = r
    sales.value = sl
    categories.value = c
    topItems.value = it
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function monthAgo() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString()
}

function fmtDay(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

onMounted(load)
</script>

<template>
  <div class="page">
    <h1 class="t-title-1" style="margin-bottom: 16px">통계</h1>

    <div v-if="summary" class="cards">
      <div class="kpi">
        <div class="t-caption text-tert">총 회원</div>
        <div class="kpi__v num">{{ summary.totals.members.toLocaleString() }}<span class="kpi__u">명</span></div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">누적 결제</div>
        <div class="kpi__v num">{{ summary.totals.payments.toLocaleString() }}<span class="kpi__u">건</span></div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">누적 매출</div>
        <div class="kpi__v num">{{ summary.totals.total.toLocaleString() }}<span class="kpi__u">원</span></div>
      </div>
      <div class="kpi">
        <div class="t-caption text-tert">오늘 매출</div>
        <div class="kpi__v num" style="color: var(--color-primary)">
          {{ summary.today.total.toLocaleString() }}<span class="kpi__u">원</span>
        </div>
        <div class="t-caption text-tert num" style="margin-top: 4px">{{ summary.today.count }}건</div>
      </div>
    </div>

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
              <th style="text-align:right">포인트</th>
              <th style="text-align:right">방문</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in ranking" :key="r.id">
              <td class="num">{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td class="num" style="text-align:right">{{ r.point.toLocaleString() }}P</td>
              <td class="num" style="text-align:right">{{ r.visit_count }}</td>
            </tr>
          </tbody>
        </table>
      </AppCard>

      <AppCard padding="lg">
        <template #header>
          <h3 class="hdr"><Calendar :size="18" /> 일별 매출 (최근 1개월)</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>일자</th>
              <th style="text-align:right">건수</th>
              <th style="text-align:right">매출</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sales" :key="r.day">
              <td class="num">{{ fmtDay(r.day) }}</td>
              <td class="num" style="text-align:right">{{ r.count }}</td>
              <td class="num" style="text-align:right">{{ r.final.toLocaleString() }}원</td>
            </tr>
          </tbody>
        </table>
      </AppCard>

      <AppCard padding="lg">
        <template #header>
          <h3 class="hdr"><Tag :size="18" /> 카테고리 비중</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th style="text-align:right">건수</th>
              <th style="text-align:right">매출</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in categories" :key="r.id">
              <td>{{ r.name }}</td>
              <td class="num" style="text-align:right">{{ r.count }}</td>
              <td class="num" style="text-align:right">{{ r.total.toLocaleString() }}원</td>
            </tr>
          </tbody>
        </table>
      </AppCard>

      <AppCard padding="lg">
        <template #header>
          <h3 class="hdr"><Package :size="18" /> 인기 품목 Top 10</h3>
        </template>
        <table class="table">
          <thead>
            <tr>
              <th>품명</th>
              <th style="text-align:right">건수</th>
              <th style="text-align:right">매출</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in topItems" :key="r.item_name">
              <td>{{ r.item_name }}</td>
              <td class="num" style="text-align:right">{{ r.count }}</td>
              <td class="num" style="text-align:right">{{ r.total.toLocaleString() }}원</td>
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

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
