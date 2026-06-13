<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  User,
  Phone,
  Calendar,
  ArrowRight,
  Receipt,
} from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { membersApi, type Member, type PaymentSummary } from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  memberId: number | null
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const router = useRouter()
const toast = useToast()
const member = ref<Member | null>(null)
const payments = ref<PaymentSummary[]>([])
const loading = ref(false)

watch(
  () => [props.open, props.memberId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      member.value = null
      payments.value = []
      return
    }
    loading.value = true
    try {
      const [m, p] = await Promise.all([
        membersApi.get(id),
        membersApi.payments(id, { limit: 5 }),
      ])
      member.value = m
      payments.value = p.rows
    } catch (e) {
      toast.error(errorMessage(e))
      emit('close')
    } finally {
      loading.value = false
    }
  },
)

function fmtPhone(p: string | null) {
  if (!p) return '—'
  const t = p.replace(/[^0-9]/g, '')
  if (t.length === 11) return `${t.slice(0, 3)}-${t.slice(3, 7)}-${t.slice(7)}`
  if (t.length === 10) return `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`
  return p
}
function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function goDetail() {
  if (!member.value) return
  const id = member.value.id
  emit('close')
  router.push(`/members/${id}`)
}

function goPayment(paymentId: number) {
  if (!member.value) return
  const mid = member.value.id
  emit('close')
  router.push(`/members/${mid}/payments/${paymentId}`)
}
</script>

<template>
  <AppModal :open="open" :width="600" @close="$emit('close')">
    <template #title>회원 정보</template>

    <div v-if="loading" class="loading t-body-2 text-tert">불러오는 중...</div>

    <div v-else-if="member" class="content">
      <header class="head">
        <div class="head__avatar"><User :size="30" /></div>
        <div class="head__main">
          <div class="head__name">{{ member.name }}</div>
          <div class="head__phone">
            <Phone :size="18" />
            <span class="num">{{ fmtPhone(member.phone) }}</span>
          </div>
        </div>
      </header>

      <div class="stats">
        <div class="stat">
          <span class="stat__label">보유 포인트</span>
          <span class="stat__value num" style="color: var(--color-primary)">
            {{ member.point.toLocaleString() }}<span class="stat__unit">P</span>
          </span>
        </div>
        <div class="stat">
          <span class="stat__label">방문 횟수</span>
          <span class="stat__value num">
            {{ member.visit_count }}<span class="stat__unit">회</span>
          </span>
        </div>
        <div class="stat">
          <span class="stat__label">가입일</span>
          <span class="stat__value num">{{ fmtDate(member.created_at) }}</span>
        </div>
      </div>

      <div v-if="member.memo" class="memo">
        <div class="memo__label">메모</div>
        <div class="memo__body">{{ member.memo }}</div>
      </div>

      <section class="recent">
        <header class="recent__head">
          <h4 class="recent__title">
            <Receipt :size="16" />
            <span>최근 결제</span>
          </h4>
          <span v-if="payments.length === 0" class="t-caption text-tert">없음</span>
          <span v-else class="t-caption text-tert num">최근 {{ payments.length }}건</span>
        </header>
        <ul v-if="payments.length > 0" class="recent__list">
          <li v-for="p in payments" :key="p.id">
            <button type="button" class="recent__row" @click="goPayment(p.id)">
              <span class="recent__date">
                <Calendar :size="14" />
                <span class="num">{{ fmtDate(p.paid_at) }}</span>
              </span>
              <span class="recent__items">
                <template v-for="(it, idx) in p.items.slice(0, 2)" :key="it.id">
                  {{ it.item_name }}<span v-if="idx < Math.min(p.items.length, 2) - 1">, </span>
                </template>
                <span v-if="p.items.length > 2" class="text-tert">
                  외 {{ p.items.length - 2 }}건
                </span>
              </span>
              <span class="recent__amount num">{{ p.final_amount.toLocaleString() }}원</span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <AppButton variant="outline" size="medium" @click="$emit('close')">닫기</AppButton>
      <AppButton variant="primary" size="medium" :disabled="!member" @click="goDetail">
        <span>상세 페이지로 이동</span>
        <ArrowRight :size="16" />
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.loading {
  padding: 40px 0;
  text-align: center;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.head {
  display: flex;
  align-items: center;
  gap: 18px;
}
.head__avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.head__main {
  min-width: 0;
}
.head__name {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-strong);
  letter-spacing: -0.02em;
}
.head__phone {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 19px;
  font-weight: 700;
  color: var(--color-text-strong);
  font-variant-numeric: tabular-nums;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 20px 16px;
  background: var(--color-line-soft);
  border-radius: 16px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}
.stat__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-sub);
}
.stat__value {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-strong);
}
.stat__unit {
  font-size: 16px;
  font-weight: 700;
  margin-left: 2px;
  color: var(--color-text-sub);
}

.memo {
  padding: 14px 16px;
  border: var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.memo__label {
  font: var(--font-caption);
  color: var(--color-text-tert);
}
.memo__body {
  font: var(--font-body-3);
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-all;
}

.recent__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.recent__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.recent__title :deep(svg) {
  width: 20px;
  height: 20px;
}
.recent__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.recent__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--color-line);
  text-align: left;
  cursor: pointer;
  transition: all 120ms ease;
}
.recent__row:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.recent__date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-sub);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.recent__items {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.recent__amount {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text-strong);
  white-space: nowrap;
}
</style>
