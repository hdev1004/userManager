<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Receipt,
  Pencil,
  Trash2,
  Phone,
  User,
  Image as ImageIcon,
  Calendar,
  Coins,
  PlusCircle,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  membersApi,
  type Member,
  type PaymentSummary,
} from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string }>()
const router = useRouter()
const toast = useToast()

const member = ref<Member | null>(null)
const payments = ref<PaymentSummary[]>([])
const loading = ref(true)
const confirmDelete = ref(false)
const deleting = ref(false)

async function load() {
  loading.value = true
  try {
    const [m, p] = await Promise.all([
      membersApi.get(Number(props.id)),
      membersApi.payments(Number(props.id)),
    ])
    member.value = m
    payments.value = p
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function doDelete() {
  if (!member.value) return
  deleting.value = true
  try {
    await membersApi.remove(member.value.id)
    toast.success('회원이 삭제되었습니다.')
    router.replace('/')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}

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
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.push('/')">
      <ChevronLeft :size="18" />
      <span>회원 검색으로</span>
    </button>

    <div v-if="loading" class="t-body-2 text-tert">불러오는 중...</div>

    <template v-else-if="member">
      <AppCard padding="lg">
        <div class="head">
          <div class="head__avatar"><User :size="28" /></div>
          <div class="head__main">
            <h1 class="head__name">{{ member.name }}</h1>
            <div class="head__meta">
              <Phone :size="14" />
              <span class="num">{{ fmtPhone(member.phone) }}</span>
            </div>
          </div>
          <div class="head__point">
            <div class="head__point-label">보유 포인트</div>
            <div class="head__point-value num">{{ member.point.toLocaleString() }} P</div>
            <div class="head__visit num">방문 {{ member.visit_count }}회</div>
          </div>
        </div>

        <div class="actions">
          <AppButton
            variant="primary"
            size="large"
            @click="router.push(`/members/${member.id}/payments/new`)"
          >
            <Receipt :size="18" />
            <span>결제</span>
          </AppButton>
          <AppButton
            variant="outline"
            size="large"
            @click="router.push(`/members/${member.id}/edit`)"
          >
            <Pencil :size="18" />
            <span>회원정보 수정</span>
          </AppButton>
          <AppButton
            variant="danger-soft"
            size="large"
            @click="confirmDelete = true"
          >
            <Trash2 :size="18" />
            <span>회원 삭제</span>
          </AppButton>
        </div>
      </AppCard>

      <AppCard title="결제 내역" padding="lg" style="margin-top: 24px">
        <div v-if="payments.length === 0" class="t-body-2 text-tert">결제 내역이 없습니다.</div>
        <div v-else class="paylist">
          <button
            v-for="p in payments"
            :key="p.id"
            class="pay"
            type="button"
            @click="router.push(`/members/${member.id}/payments/${p.id}`)"
          >
            <div class="pay__head">
              <div class="pay__date">
                <Calendar :size="14" />
                <span>{{ fmtDate(p.paid_at) }}</span>
              </div>
              <div class="pay__amount-wrap">
                <span
                  v-if="p.point_used > 0"
                  class="pay__total-strike num"
                >{{ (p.final_amount + p.point_used).toLocaleString() }}원</span>
                <span class="pay__amount num">{{ p.final_amount.toLocaleString() }}원</span>
              </div>
            </div>
            <div class="pay__items">
              <span v-for="(it, idx) in p.items" :key="it.id">
                {{ it.item_name }} x {{ it.quantity }}<span v-if="idx < p.items.length - 1">, </span>
              </span>
            </div>
            <div v-if="p.point_used > 0 || p.point_earned > 0 || p.images.length > 0 || p.memo" class="pay__foot">
              <span v-if="p.point_used > 0" class="chip chip--point-used">
                <Coins :size="12" />
                포인트 사용 {{ p.point_used.toLocaleString() }}P
              </span>
              <span v-if="p.point_earned > 0" class="chip chip--success">
                <PlusCircle :size="12" />
                적립 {{ p.point_earned.toLocaleString() }}P
              </span>
              <span v-if="p.images.length > 0" class="chip">
                <ImageIcon :size="12" />
                {{ p.images.length }}
              </span>
              <span v-if="p.memo" class="chip chip--memo">메모</span>
            </div>
          </button>
        </div>
      </AppCard>
    </template>

    <AppModal :open="confirmDelete" title="회원 삭제" @close="confirmDelete = false">
      <p class="t-body-2" style="margin: 0">
        <strong>{{ member?.name }}</strong> 회원을 삭제할까요?<br />
        삭제 후에도 결제 내역은 보존됩니다.
      </p>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="confirmDelete = false">취소</AppButton>
        <AppButton variant="danger" size="medium" :loading="deleting" @click="doDelete">삭제</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 12px;
  font: var(--font-body-3);
  color: var(--color-text-sub);
  border-radius: 10px;
  margin-bottom: 12px;
}
.back:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
}
.head {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-line-soft);
}
.head__avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.head__main {
  flex: 1;
}
.head__name {
  font: var(--font-display-2);
  color: var(--color-text-strong);
  margin: 0;
}
.head__meta {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: var(--font-body-2);
  color: var(--color-text-sub);
}
.head__point {
  text-align: right;
}
.head__point-label {
  font: var(--font-caption);
  color: var(--color-text-tert);
}
.head__point-value {
  font: var(--font-title-1);
  color: var(--color-primary);
  margin-top: 2px;
}
.head__visit {
  font: var(--font-caption);
  color: var(--color-text-tert);
  margin-top: 2px;
}
.actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (max-width: 640px) {
  .actions {
    grid-template-columns: 1fr;
  }
}

.paylist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pay {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 120ms ease;
}
.pay:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-line);
}
.pay__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pay__date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: var(--font-body-3);
  color: var(--color-text-sub);
}
.pay__amount-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}
.pay__total-strike {
  font: var(--font-caption);
  color: var(--color-text-tert);
  text-decoration: line-through;
}
.pay__amount {
  font: var(--font-title-3);
  color: var(--color-text-strong);
}
.pay__items {
  font: var(--font-body-3);
  color: var(--color-text-sub);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pay__foot {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-line-soft);
  color: var(--color-text-sub);
  font: var(--font-tiny);
}
.chip--success {
  background: rgba(0, 200, 150, 0.12);
  color: var(--color-success);
  font-weight: 600;
}
.chip--point-used {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 12px;
  padding: 5px 12px;
}
.chip--memo {
  background: var(--color-line-soft);
  color: var(--color-text-sub);
}
</style>
