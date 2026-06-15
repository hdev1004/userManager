<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Banknote,
  CreditCard,
  Coins,
  PlusCircle,
  StickyNote,
  Image as ImageIcon,
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

watch(date, load)
onMounted(load)
</script>

<template>
  <div class="page">
    <h1 class="page__title">결제 내역</h1>

    <AppCard padding="lg">
      <div class="date-nav">
        <button class="date-nav__arrow" type="button" @click="shift(-1)" aria-label="이전 날짜">
          <ChevronLeft :size="22" />
        </button>

        <div class="date-nav__center">
          <label class="date-nav__picker">
            <Calendar :size="18" />
            <input
              type="date"
              v-model="date"
              class="date-nav__input"
            />
          </label>
          <div class="date-nav__label">{{ dayLabel }}</div>
        </div>

        <button class="date-nav__arrow" type="button" @click="shift(1)" aria-label="다음 날짜">
          <ChevronRight :size="22" />
        </button>

        <AppButton
          variant="outline"
          size="medium"
          :disabled="isToday"
          @click="date = today()"
        >
          오늘
        </AppButton>
      </div>
    </AppCard>

    <AppCard padding="lg" style="margin-top: 16px" v-if="data">
      <div class="summary">
        <div class="summary__cell">
          <div class="summary__label">건수</div>
          <div class="summary__value num">{{ data.summary.count.toLocaleString() }}건</div>
        </div>
        <div class="summary__cell summary__cell--main">
          <div class="summary__label">매출 합계</div>
          <div class="summary__value summary__value--strong num">
            ₩{{ data.summary.final.toLocaleString() }}
          </div>
        </div>
        <div class="summary__cell">
          <div class="summary__label">현금 / 카드</div>
          <div class="summary__value num">
            <span class="num">{{ data.summary.cash_total.toLocaleString() }}</span>
            <span class="summary__divider">/</span>
            <span class="num">{{ data.summary.card_total.toLocaleString() }}</span>
          </div>
        </div>
        <div class="summary__cell">
          <div class="summary__label">포인트 적립 / 사용</div>
          <div class="summary__value num">
            <span class="summary__earn">+{{ data.summary.point_earned.toLocaleString() }}P</span>
            <span class="summary__divider">/</span>
            <span class="summary__use">-{{ data.summary.point_used.toLocaleString() }}P</span>
          </div>
        </div>
      </div>
    </AppCard>

    <div v-if="loading" class="t-body-2 text-tert" style="margin-top: 24px; text-align: center; padding: 24px">
      불러오는 중...
    </div>

    <AppCard padding="lg" style="margin-top: 16px" v-else-if="data && data.rows.length === 0">
      <div class="empty">
        <Receipt :size="32" />
        <div>이 날짜의 결제 내역이 없습니다.</div>
      </div>
    </AppCard>

    <div class="paylist" v-else-if="data">
      <button
        v-for="p in data.rows"
        :key="p.id"
        class="pay"
        type="button"
        @click="router.push(`/members/${p.member_id}/payments/${p.id}`)"
      >
        <div class="pay__head">
          <div class="pay__time num">{{ fmtTime(p.paid_at) }}</div>
          <div
            class="pay__name"
            @click.stop="router.push(`/members/${p.member_id}`)"
          >
            {{ p.member_name }}
          </div>
          <div class="pay__spacer" />
          <div class="pay__amount-wrap">
            <span
              v-if="p.point_used > 0"
              class="pay__total-strike num"
            >{{ p.total_amount.toLocaleString() }}원</span>
            <span class="pay__amount num">{{ p.final_amount.toLocaleString() }}원</span>
          </div>
        </div>
        <div class="pay__items">
          <span v-for="(it, idx) in p.items" :key="it.id">
            {{ it.item_name }} x {{ it.quantity }}<span v-if="idx < p.items.length - 1">, </span>
          </span>
        </div>
        <div class="pay__foot">
          <span class="chip chip--method">
            <Banknote v-if="p.payment_method === 'CASH'" :size="16" />
            <CreditCard v-else :size="16" />
            {{ p.payment_method === 'CASH' ? '현금' : '카드' }}
          </span>
          <span v-if="p.point_used > 0" class="chip chip--point-used">
            <Coins :size="16" />
            포인트 사용 {{ p.point_used.toLocaleString() }}P
          </span>
          <span v-if="p.point_earned > 0" class="chip chip--success">
            <PlusCircle :size="16" />
            적립 {{ p.point_earned.toLocaleString() }}P
          </span>
          <span v-if="p.images.length > 0" class="chip chip--image">
            <ImageIcon :size="16" />
            사진 {{ p.images.length }}장
          </span>
          <span v-if="p.memo" class="chip chip--memo">
            <StickyNote :size="16" />
            메모
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.page__title {
  margin: 0 0 16px;
  font: var(--font-display-2);
  color: var(--color-text-strong);
}

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

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.summary__cell {
  padding: 4px 0;
}
.summary__cell--main {
  background: var(--color-primary-soft);
  border-radius: 12px;
  padding: 12px 16px;
}
.summary__label {
  font: var(--font-caption);
  color: var(--color-text-tert);
  margin-bottom: 4px;
}
.summary__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.summary__value--strong {
  font-size: 26px;
  color: var(--color-primary);
}
.summary__divider {
  color: var(--color-text-tert);
  margin: 0 6px;
  font-weight: 400;
}
.summary__earn {
  color: #00855e;
}
.summary__use {
  color: var(--color-primary);
}
@media (max-width: 880px) {
  .summary {
    grid-template-columns: 1fr 1fr;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--color-text-tert);
}

.paylist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.pay {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 24px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 120ms ease;
}
.pay:hover {
  background: var(--color-bg-hover);
}
.pay__head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pay__time {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-strong);
  min-width: 56px;
}
.pay__name {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-primary);
  padding: 4px 10px;
  border-radius: 8px;
  transition: background 120ms ease;
}
.pay__name:hover {
  background: var(--color-primary-soft);
}
.pay__spacer {
  flex: 1;
}
.pay__amount-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}
.pay__total-strike {
  font: var(--font-body-3);
  color: var(--color-text-tert);
  text-decoration: line-through;
}
.pay__amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.pay__items {
  font: var(--font-body-2);
  font-size: 16px;
  color: var(--color-text-sub);
  line-height: 24px;
  padding-left: 70px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pay__foot {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-left: 70px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-line-soft);
  color: var(--color-text-sub);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
.chip--success {
  background: rgba(0, 200, 150, 0.18);
  color: #00855e;
}
.chip--point-used {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 15px;
  padding: 9px 16px;
}
.chip--image {
  background: #ffedd5;
  color: #c2410c;
}
.chip--memo {
  background: #ede9fe;
  color: #6d28d9;
}
.chip--method {
  background: #1f2937;
  color: #fff;
}

@media (max-width: 640px) {
  .pay__head {
    flex-wrap: wrap;
  }
  .pay__items, .pay__foot {
    padding-left: 0;
  }
  .pay__amount {
    font-size: 18px;
  }
}
</style>
