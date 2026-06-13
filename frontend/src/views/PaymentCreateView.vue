<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  Image as ImageIcon,
  CreditCard,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { membersApi, type Member } from '@/api/members'
import { itemsApi, type Item } from '@/api/items'
import { paymentsApi, type PaymentItemInput } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string }>()
const router = useRouter()
const toast = useToast()

const member = ref<Member | null>(null)
const items = ref<PaymentItemInput[]>([])
const memo = ref('')
const pointUsed = ref('0')
const pointEarned = ref('0')
const pendingImage = ref<File | null>(null)
const saving = ref(false)

const searchQ = ref('')
const searchResult = ref<Item[]>([])
const searching = ref(false)
let searchTimer: number | undefined

const draft = ref<{ item_id?: number; code: string; name: string; price: number; quantity: number }>({
  code: '',
  name: '',
  price: 0,
  quantity: 1,
})

async function load() {
  try {
    member.value = await membersApi.get(Number(props.id))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
onMounted(load)

function doSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(searchItems, 180)
}
async function searchItems() {
  const q = searchQ.value.trim()
  if (!q) {
    searchResult.value = []
    return
  }
  searching.value = true
  try {
    searchResult.value = await itemsApi.search(q)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    searching.value = false
  }
}
function pickItem(it: Item) {
  draft.value = {
    item_id: it.id,
    code: it.code,
    name: it.name,
    price: it.price,
    quantity: 1,
  }
  searchQ.value = ''
  searchResult.value = []
}
function addItem() {
  if (!draft.value.name.trim()) {
    toast.error('품명을 입력하세요.')
    return
  }
  if (!draft.value.price && draft.value.price !== 0) {
    toast.error('금액을 입력하세요.')
    return
  }
  items.value.push({
    item_id: draft.value.item_id ?? null,
    item_name: draft.value.name.trim(),
    unit_price: Number(draft.value.price),
    quantity: Number(draft.value.quantity) || 1,
  })
  draft.value = { code: '', name: '', price: 0, quantity: 1 }
}
function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

const total = computed(() =>
  items.value.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)
const final = computed(() => Math.max(0, total.value - (Number(pointUsed.value) || 0)))

function onFile(e: Event) {
  const t = e.target as HTMLInputElement
  pendingImage.value = t.files?.[0] ?? null
}

async function submit() {
  if (!member.value) return
  if (items.value.length === 0) {
    toast.error('결제 항목을 최소 1개 추가하세요.')
    return
  }
  saving.value = true
  try {
    const created = await paymentsApi.create({
      member_id: member.value.id,
      items: items.value,
      point_used: Number(pointUsed.value) || 0,
      point_earned: Number(pointEarned.value) || 0,
      memo: memo.value.trim() || undefined,
    })
    if (pendingImage.value) {
      await paymentsApi.uploadImage(created.id, pendingImage.value)
    }
    toast.success('결제가 등록되었습니다.')
    router.replace(`/members/${member.value.id}`)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.back()">
      <ChevronLeft :size="18" />
      <span>뒤로</span>
    </button>

    <header class="hero">
      <h1 class="t-title-1">결제 등록</h1>
      <div v-if="member" class="hero__member">
        <span class="t-body-3 text-tert">회원</span>
        <strong class="text-strong">{{ member.name }}</strong>
        <span class="t-body-3 text-tert num">보유 {{ member.point.toLocaleString() }}P</span>
      </div>
    </header>

    <AppCard title="항목 추가" padding="lg">
      <div class="picker">
        <div class="picker__search">
          <div class="picker__search-ic"><Search :size="18" /></div>
          <input
            v-model="searchQ"
            class="picker__search-input"
            placeholder="코드 또는 품명으로 검색"
            @input="doSearchDebounced"
          />
        </div>
        <div v-if="searchResult.length > 0" class="picker__list">
          <button
            v-for="it in searchResult"
            :key="it.id"
            type="button"
            class="picker__row"
            @click="pickItem(it)"
          >
            <span class="picker__code">{{ it.code }}</span>
            <span class="picker__name">{{ it.name }}</span>
            <span class="picker__price num">{{ it.price.toLocaleString() }}원</span>
          </button>
        </div>
      </div>

      <div class="draft">
        <AppInput v-model="draft.name" label="품명" placeholder="품명" />
        <AppInput v-model.number="draft.price" label="금액" inputmode="numeric" />
        <AppInput v-model.number="draft.quantity" label="수량" inputmode="numeric" />
        <div class="draft__total num">
          = {{ (draft.price * draft.quantity).toLocaleString() }} 원
        </div>
        <AppButton size="medium" variant="primary" @click="addItem">
          <Plus :size="16" />
          <span>추가</span>
        </AppButton>
      </div>
    </AppCard>

    <AppCard title="결제 목록" padding="lg" style="margin-top: 16px">
      <div v-if="items.length === 0" class="t-body-2 text-tert">아직 추가된 항목이 없습니다.</div>
      <div v-else class="cart">
        <div v-for="(it, idx) in items" :key="idx" class="cart__row">
          <div class="cart__main">
            <div class="cart__name text-strong">{{ it.item_name }}</div>
            <div class="cart__meta num">
              {{ it.unit_price.toLocaleString() }}원 x {{ it.quantity }}
            </div>
          </div>
          <div class="cart__amount num">{{ (it.unit_price * it.quantity).toLocaleString() }}원</div>
          <button class="cart__del" type="button" aria-label="삭제" @click="removeItem(idx)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
      <div class="totals">
        <div class="totals__row">
          <span class="t-body-2 text-sub">합계</span>
          <span class="num text-strong">{{ total.toLocaleString() }}원</span>
        </div>
        <div class="totals__row">
          <span class="t-body-2 text-sub">포인트 사용</span>
          <span class="num text-strong">- {{ (Number(pointUsed) || 0).toLocaleString() }}원</span>
        </div>
        <div class="totals__final">
          <span class="t-title-3">결제 금액</span>
          <span class="num t-title-1" style="color: var(--color-primary)">
            {{ final.toLocaleString() }}원
          </span>
        </div>
      </div>
    </AppCard>

    <AppCard title="포인트" padding="lg" style="margin-top: 16px">
      <div class="grid-2">
        <AppInput
          v-model="pointUsed"
          label="사용 포인트"
          inputmode="numeric"
          :hint="`보유 ${(member?.point ?? 0).toLocaleString()}P 까지 사용 가능`"
        />
        <AppInput v-model="pointEarned" label="적립 포인트" inputmode="numeric" />
      </div>
    </AppCard>

    <AppCard title="메모 및 이미지" padding="lg" style="margin-top: 16px">
      <AppInput v-model="memo" label="메모" placeholder="시술 메모 (선택)" />
      <label class="file">
        <ImageIcon :size="18" />
        <span>{{ pendingImage ? pendingImage.name : '이미지 선택 (선택)' }}</span>
        <input class="file__input" type="file" accept="image/*" @change="onFile" />
      </label>
    </AppCard>

    <div class="bottom">
      <AppButton variant="outline" size="large" @click="router.back()">취소</AppButton>
      <AppButton variant="primary" size="large" :loading="saving" @click="submit" block>
        <CreditCard :size="18" />
        <span>결제 등록</span>
      </AppButton>
    </div>
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
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.hero__member {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-line-soft);
  padding: 10px 16px;
  border-radius: var(--radius-pill);
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker__search {
  position: relative;
}
.picker__search-ic {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  color: var(--color-text-tert);
}
.picker__search-input {
  width: 100%;
  height: 48px;
  padding: 0 16px 0 44px;
  font: var(--font-body-3);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  outline: none;
  background: #fff;
}
.picker__search-input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.picker__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: var(--border);
  border-radius: 12px;
  padding: 6px;
  background: var(--color-bg);
}
.picker__row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  text-align: left;
  background: transparent;
  font: var(--font-body-3);
}
.picker__row:hover {
  background: var(--color-bg-hover);
}
.picker__code {
  color: var(--color-text-tert);
  font-variant-numeric: tabular-nums;
}
.picker__name {
  color: var(--color-text-strong);
}
.picker__price {
  color: var(--color-text);
}

.draft {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto auto;
  align-items: end;
  gap: 12px;
}
.draft__total {
  font: var(--font-body-3);
  color: var(--color-text-sub);
  padding-bottom: 16px;
  white-space: nowrap;
}
@media (max-width: 768px) {
  .draft {
    grid-template-columns: 1fr 1fr;
  }
  .draft__total {
    grid-column: 1 / -1;
    padding-bottom: 0;
  }
}

.cart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cart__row {
  display: grid;
  grid-template-columns: 1fr auto 32px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: #fff;
}
.cart__name {
  font: var(--font-body-3);
  font-weight: 600;
}
.cart__meta {
  font: var(--font-caption);
  color: var(--color-text-tert);
  margin-top: 2px;
}
.cart__amount {
  font: var(--font-body-3);
  font-weight: 700;
  color: var(--color-text-strong);
}
.cart__del {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--color-text-tert);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cart__del:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.totals {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-line-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.totals__row {
  display: flex;
  justify-content: space-between;
}
.totals__final {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.file {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  border: 1px dashed var(--color-line);
  border-radius: 12px;
  color: var(--color-text-sub);
  cursor: pointer;
  font: var(--font-body-3);
}
.file:hover {
  background: var(--color-bg-hover);
}
.file__input {
  display: none;
}

.bottom {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
