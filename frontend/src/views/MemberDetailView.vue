<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Receipt,
  Pencil,
  Trash2,
  Phone,
  User,
  Coins,
  Paperclip,
  Banknote,
  CreditCard,
  AlertTriangle,
  StickyNote,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  membersApi,
  type Member,
  type PaymentSummary,
  type PaymentFilter,
} from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string }>()
const router = useRouter()
const toast = useToast()

const PAGE_SIZE = 20

const member = ref<Member | null>(null)
const payments = ref<PaymentSummary[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const totalCount = ref(0)
const filter = ref<PaymentFilter>('all')
const confirmDelete = ref(false)
const deleting = ref(false)
const confirmDeleteAll = ref(false)
const deletingAll = ref(false)

async function loadMember() {
  try {
    member.value = await membersApi.get(Number(props.id))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function loadPayments(reset = true) {
  if (reset) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const offset = reset ? 0 : payments.value.length
    const res = await membersApi.payments(Number(props.id), {
      offset,
      limit: PAGE_SIZE,
      filter: filter.value,
    })
    payments.value = reset ? res.rows : [...payments.value, ...res.rows]
    hasMore.value = res.has_more
    totalCount.value = res.total
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

watch(filter, () => loadPayments(true))

onMounted(async () => {
  await Promise.all([loadMember(), loadPayments(true)])
})

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

async function doDeleteAllPayments() {
  if (!member.value) return
  deletingAll.value = true
  try {
    const res = await membersApi.deleteAllPayments(member.value.id)
    toast.success(`결제 내역 ${res.deleted}건을 삭제했습니다.`)
    confirmDeleteAll.value = false
    await loadPayments(true)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    deletingAll.value = false
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
function itemsLabel(items: { item_name: string; quantity: number }[]) {
  if (items.length === 0) return ''
  return items.map((it) => `${it.item_name} x ${it.quantity}`).join(', ')
}
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.push('/')">
      <ChevronLeft :size="22" />
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

      <AppCard padding="lg" style="margin-top: 24px">
        <template #header>
          <div class="paylist__head-l">
            <h3 class="paylist__title">결제 내역</h3>
            <span class="paylist__count num">총 {{ totalCount.toLocaleString() }}건</span>
            <button
              v-if="payments.length > 0 || filter !== 'all'"
              type="button"
              class="paylist__danger-btn"
              @click="confirmDeleteAll = true"
            >
              <Trash2 :size="14" />
              <span>전체 삭제</span>
            </button>
          </div>
        </template>
        <template #actions>
          <div class="seg" role="tablist">
            <button
              type="button"
              class="seg__btn"
              :class="{ 'seg__btn--active': filter === 'all' }"
              @click="filter = 'all'"
            >
              전체
            </button>
            <button
              type="button"
              class="seg__btn"
              :class="{ 'seg__btn--active': filter === 'point_used' }"
              @click="filter = 'point_used'"
            >
              <Coins :size="16" />
              <span>포인트 사용</span>
            </button>
            <button
              type="button"
              class="seg__btn"
              :class="{ 'seg__btn--active': filter === 'has_attachment' }"
              @click="filter = 'has_attachment'"
            >
              <Paperclip :size="16" />
              <span>메모&amp;사진</span>
            </button>
          </div>
        </template>

        <div v-if="payments.length === 0" class="t-body-2 text-tert" style="text-align:center; padding: 32px">
          {{
            filter === 'point_used' ? '포인트를 사용한 결제가 없습니다.' :
            filter === 'has_attachment' ? '메모나 사진이 첨부된 결제가 없습니다.' :
            '결제 내역이 없습니다.'
          }}
        </div>
        <div v-else class="table-wrap">
          <table class="ptable">
            <thead>
              <tr>
                <th class="th-date">날짜</th>
                <th class="th-items">항목</th>
                <th class="th-method">결제</th>
                <th class="th-tag">메모</th>
                <th class="th-amount">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in payments"
                :key="p.id"
                class="row"
                @click="router.push(`/members/${member.id}/payments/${p.id}`)"
              >
                <td class="td-date num">{{ fmtDate(p.paid_at) }}</td>
                <td class="td-items">{{ itemsLabel(p.items) }}</td>
                <td class="td-method">
                  <span class="method" :class="p.payment_method === 'CARD' ? 'method--card' : 'method--cash'">
                    <Banknote v-if="p.payment_method === 'CASH'" :size="14" />
                    <CreditCard v-else :size="14" />
                    {{ p.payment_method === 'CASH' ? '현금' : '카드' }}
                  </span>
                </td>
                <td class="td-tag">
                  <span v-if="p.memo" class="tag tag--memo">
                    <StickyNote :size="14" />
                    <span>메모</span>
                  </span>
                  <span v-else class="tag tag--none">—</span>
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

        <div v-if="hasMore && payments.length > 0" class="more">
          <AppButton variant="outline" size="large" :loading="loadingMore" block @click="loadPayments(false)">
            더 보기
          </AppButton>
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

    <AppModal
      :open="confirmDeleteAll"
      title="결제 내역 전체 삭제"
      @close="confirmDeleteAll = false"
    >
      <div class="warn">
        <AlertTriangle :size="20" />
        <div>
          <p style="margin: 0 0 6px; font-weight: 700; color: var(--color-text-strong)">
            <strong>{{ member?.name }}</strong> 회원의 결제 내역을 모두 삭제할까요?
          </p>
          <p class="t-caption" style="margin: 0; color: var(--color-text-tert)">
            보유 포인트와 방문 횟수는 그대로 유지됩니다.<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="confirmDeleteAll = false">취소</AppButton>
        <AppButton variant="danger" size="medium" :loading="deletingAll" @click="doDeleteAllPayments">
          전체 삭제
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 52px;
  padding: 0 18px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-sub);
  border-radius: 12px;
  margin-bottom: 16px;
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

.paylist__head-l {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.paylist__title {
  margin: 0;
  font: var(--font-title-2);
  color: var(--color-text-strong);
}
.paylist__count {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
}
.paylist__danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font: var(--font-caption);
  font-weight: 700;
  transition: all 120ms ease;
}
.paylist__danger-btn:hover {
  background: #ffd8dc;
}

.warn {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-radius: 12px;
}

.seg {
  display: inline-flex;
  padding: 4px;
  background: var(--color-bg-hover);
  border-radius: var(--radius-pill);
  gap: 2px;
}
.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  font: var(--font-body-3);
  font-size: 15px;
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
@media (max-width: 640px) {
  .seg__btn {
    height: 36px;
    padding: 0 12px;
    font-size: 14px;
  }
}

/* ===== 테이블 ===== */
.table-wrap {
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

.th-date, .td-date { width: 130px; }
.th-method, .td-method { width: 110px; }
.th-tag, .td-tag { width: 110px; }
.th-amount, .td-amount { width: 220px; text-align: right; }

.td-date {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-strong);
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

.td-tag {
  display: table-cell;
}
.td-tag > * + * {
  margin-left: 6px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1;
}
.tag--memo {
  background: #ede9fe;
  color: #6d28d9;
}
.tag--none {
  color: var(--color-text-tert);
  font-weight: 600;
  font-size: 16px;
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

.more {
  margin-top: 16px;
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
  .td-date, .td-items, .td-method, .td-tag, .td-amount {
    width: auto !important;
    text-align: left;
  }
  .row {
    display: grid !important;
    grid-template-columns: auto 1fr;
    gap: 8px;
    align-items: center;
  }
  .td-date { grid-row: 1; grid-column: 1; }
  .td-amount { grid-row: 1; grid-column: 2; text-align: right; }
  .td-items { grid-row: 2; grid-column: 1 / -1; white-space: normal; }
  .td-method { grid-row: 3; grid-column: 1; }
  .td-tag { grid-row: 3; grid-column: 2; text-align: right; }
}
</style>
