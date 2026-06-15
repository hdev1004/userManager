<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Banknote,
  CreditCard,
  Receipt,
} from 'lucide-vue-next'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { paymentsApi, type DailyPayments } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const date = ref<string>(today())
const data = ref<DailyPayments | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    data.value = await paymentsApi.byDate(date.value)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

function parseYMD(s: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = s.split('-')
  return { y: Number(ys), m: Number(ms), d: Number(ds) }
}

function shift(days: number) {
  const { y, m, d } = parseYMD(date.value)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  date.value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const isToday = computed(() => date.value === today())
const dayLabel = computed(() => {
  const { y, m, d } = parseYMD(date.value)
  const dt = new Date(y, m - 1, d)
  const w = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]
  return `${y}년 ${m}월 ${d}일 (${w})`
})

function fmtTime(s: string) {
  const d = new Date(s)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function itemsLabel(items: { item_name: string; quantity: number }[]) {
  if (items.length === 0) return ''
  return items.map((it) => `${it.item_name} x ${it.quantity}`).join(', ')
}

watch(date, load)
onMounted(load)
</script>

<template>
  <div class="page">
    <h1 class="page__title">결제 내역</h1>

    <!-- 날짜 선택 -->
    <AppCard padding="lg">
      <div class="date-nav">
        <button class="date-nav__arrow" type="button" @click="shift(-1)" aria-label="이전 날짜">
          <ChevronLeft :size="22" />
        </button>

        <div class="date-nav__center">
          <label class="date-nav__picker">
            <Calendar :size="18" />
            <input type="date" v-model="date" class="date-nav__input" />
          </label>
          <div class="date-nav__label">{{ dayLabel }}</div>
        </div>

        <button class="date-nav__arrow" type="button" @click="shift(1)" aria-label="다음 날짜">
          <ChevronRight :size="22" />
        </button>

        <AppButton variant="outline" size="medium" :disabled="isToday" @click="date = today()">
          오늘
        </AppButton>
      </div>
    </AppCard>

    <!-- 요약 -->
    <div class="stats" v-if="data">
      <!-- 메인: 매출 합계 -->
      <div class="stats__hero">
        <div class="stats__hero-label">매출 합계</div>
        <div class="stats__hero-value num">
          ₩{{ data.summary.final.toLocaleString() }}
          <span class="stats__hero-count num">· {{ data.summary.count.toLocaleString() }}건</span>
        </div>
      </div>

      <!-- 보조: 결제수단 / 포인트 -->
      <div class="stats__grid">
        <div class="stat">
          <div class="stat__icon stat__icon--cash"><Banknote :size="18" /></div>
          <div class="stat__body">
            <div class="stat__label">현금</div>
            <div class="stat__value num">₩{{ data.summary.cash_total.toLocaleString() }}</div>
          </div>
        </div>

        <div class="stat">
          <div class="stat__icon stat__icon--card"><CreditCard :size="18" /></div>
          <div class="stat__body">
            <div class="stat__label">카드</div>
            <div class="stat__value num">₩{{ data.summary.card_total.toLocaleString() }}</div>
          </div>
        </div>

        <div class="stat">
          <div class="stat__icon stat__icon--earn">+</div>
          <div class="stat__body">
            <div class="stat__label">포인트 적립</div>
            <div class="stat__value stat__value--earn num">
              {{ data.summary.point_earned.toLocaleString() }} P
            </div>
          </div>
        </div>

        <div class="stat">
          <div class="stat__icon stat__icon--use">−</div>
          <div class="stat__body">
            <div class="stat__label">포인트 사용</div>
            <div class="stat__value stat__value--use num">
              {{ data.summary.point_used.toLocaleString() }} P
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 로딩 / 빈 상태 -->
    <div v-if="loading" class="t-body-2 text-tert" style="margin-top: 24px; text-align: center; padding: 24px">
      불러오는 중...
    </div>

    <AppCard padding="lg" style="margin-top: 16px" v-else-if="data && data.rows.length === 0">
      <div class="empty">
        <Receipt :size="32" />
        <div>이 날짜의 결제 내역이 없습니다.</div>
      </div>
    </AppCard>

    <!-- 테이블 -->
    <div v-else-if="data" class="table-wrap">
      <table class="ptable">
        <thead>
          <tr>
            <th class="th-time">시간</th>
            <th class="th-name">회원</th>
            <th class="th-items">항목</th>
            <th class="th-method">결제</th>
            <th class="th-amount">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in data.rows"
            :key="p.id"
            class="row"
            @click="router.push(`/members/${p.member_id}/payments/${p.id}`)"
          >
            <td class="td-time num">{{ fmtTime(p.paid_at) }}</td>
            <td class="td-name">
              <button
                type="button"
                class="name-link"
                @click.stop="router.push(`/members/${p.member_id}`)"
              >{{ p.member_name }}</button>
            </td>
            <td class="td-items">{{ itemsLabel(p.items) }}</td>
            <td class="td-method">
              <span class="method" :class="p.payment_method === 'CARD' ? 'method--card' : 'method--cash'">
                <Banknote v-if="p.payment_method === 'CASH'" :size="14" />
                <CreditCard v-else :size="14" />
                {{ p.payment_method === 'CASH' ? '현금' : '카드' }}
              </span>
            </td>
            <td class="td-amount">
              <div class="amount num">₩{{ p.final_amount.toLocaleString() }}</div>
              <div v-if="p.point_used > 0" class="amount-sub num">
                <span class="strike">{{ p.total_amount.toLocaleString() }}</span>
                · {{ p.point_used.toLocaleString() }}P 사용
              </div>
              <div v-else-if="p.point_earned > 0" class="amount-sub amount-sub--earn num">
                +{{ p.point_earned.toLocaleString() }}P 적립
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page__title {
  margin: 0 0 16px;
  font: var(--font-display-2);
  color: var(--color-text-strong);
}

/* ===== 날짜 선택 ===== */
.date-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-nav__arrow {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease;
}
.date-nav__arrow:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.date-nav__center {
  flex: 1;
  text-align: center;
}
.date-nav__picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  border: var(--border);
  background: #fff;
  color: var(--color-text-strong);
  cursor: pointer;
}
.date-nav__input {
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-strong);
  font-family: inherit;
  cursor: pointer;
}
.date-nav__label {
  margin-top: 6px;
  font: var(--font-body-2);
  font-weight: 600;
  color: var(--color-text-sub);
}

/* ===== 요약 ===== */
.stats {
  margin-top: 16px;
}
.stats__hero {
  background: var(--color-primary);
  color: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  box-shadow: var(--shadow-md);
}
.stats__hero-label {
  font-size: 16px;
  font-weight: 700;
  opacity: 0.85;
}
.stats__hero-value {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}
.stats__hero-count {
  font-size: 18px;
  font-weight: 600;
  opacity: 0.85;
  margin-left: 4px;
}

.stats__grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.stat {
  background: #fff;
  border: var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  flex-shrink: 0;
}
.stat__icon--cash {
  background: #ecfdf5;
  color: #047857;
}
.stat__icon--card {
  background: #eef2ff;
  color: #4338ca;
}
.stat__icon--earn {
  background: rgba(0, 200, 150, 0.18);
  color: #00855e;
}
.stat__icon--use {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.stat__body {
  min-width: 0;
}
.stat__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tert);
  margin-bottom: 2px;
}
.stat__value {
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text-strong);
  letter-spacing: -0.01em;
}
.stat__value--earn {
  color: #00855e;
}
.stat__value--use {
  color: var(--color-primary);
}

@media (max-width: 880px) {
  .stats__grid {
    grid-template-columns: 1fr 1fr;
  }
  .stats__hero-value {
    font-size: 28px;
  }
  .stats__hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

/* ===== 빈/로딩 ===== */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--color-text-tert);
}

/* ===== 테이블 ===== */
.table-wrap {
  margin-top: 16px;
  background: #fff;
  border: var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.ptable {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}
.ptable thead th {
  text-align: left;
  font-weight: 700;
  font-size: 13px;
  color: var(--color-text-tert);
  background: var(--color-bg-hover);
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-line);
  white-space: nowrap;
}
.ptable tbody td {
  padding: 16px;
  border-bottom: 1px solid var(--color-line-soft);
  vertical-align: middle;
}
.ptable tbody tr:last-child td {
  border-bottom: 0;
}
.row {
  cursor: pointer;
  transition: background 100ms ease;
}
.row:hover {
  background: var(--color-bg-hover);
}

.th-time, .td-time { width: 80px; }
.th-name, .td-name { width: 160px; }
.th-method, .td-method { width: 110px; }
.th-amount, .td-amount { width: 220px; text-align: right; }

.td-time {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.name-link {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-primary);
  background: transparent;
  transition: background 120ms ease;
}
.name-link:hover {
  background: var(--color-primary-soft);
}
.td-items {
  color: var(--color-text-sub);
  font-size: 15px;
  line-height: 22px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.method {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}
.method--cash {
  background: #ecfdf5;
  color: #047857;
}
.method--card {
  background: #eef2ff;
  color: #4338ca;
}

.td-amount {
  text-align: right;
}
.amount {
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text-strong);
  letter-spacing: -0.01em;
}
.amount-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-tert);
  font-weight: 600;
}
.amount-sub--earn {
  color: #00855e;
}
.amount-sub .strike {
  text-decoration: line-through;
  margin-right: 2px;
}

/* ===== 모바일: 카드 폴백 ===== */
@media (max-width: 640px) {
  .ptable thead { display: none; }
  .ptable, .ptable tbody, .ptable tr, .ptable td { display: block; width: 100%; }
  .ptable tbody tr {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-line-soft);
  }
  .ptable tbody td {
    border: 0;
    padding: 2px 0;
  }
  .td-time, .td-name, .td-method, .td-amount, .td-items {
    width: auto !important;
    text-align: left;
  }
  .row {
    display: grid !important;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    align-items: center;
  }
  .td-time { grid-row: 1; grid-column: 1; }
  .td-name { grid-row: 1; grid-column: 2; }
  .td-amount { grid-row: 1; grid-column: 3; text-align: right; }
  .td-items { grid-row: 2; grid-column: 1 / -1; white-space: normal; }
  .td-method { grid-row: 3; grid-column: 1 / -1; }
}
</style>
