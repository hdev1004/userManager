<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  Image as ImageIcon,
  Save,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppImageViewer from '@/components/ui/AppImageViewer.vue'
import { itemsApi, type Item } from '@/api/items'
import { paymentsApi, type PaymentItemInput, type Payment } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string; pid: string }>()
const router = useRouter()
const toast = useToast()

const payment = ref<Payment | null>(null)
const items = ref<PaymentItemInput[]>([])
const memo = ref('')
const pointUsed = ref('0')
const pointEarned = ref('0')
const saving = ref(false)
const uploading = ref(false)

const searchQ = ref('')
const searchResult = ref<Item[]>([])
let searchTimer: number | undefined

const viewerOpen = ref(false)
const viewerIndex = ref(0)
function openViewer(idx: number) {
  viewerIndex.value = idx
  viewerOpen.value = true
}
const draft = ref<{ item_id?: number; name: string; price: number; quantity: number }>({
  name: '',
  price: 0,
  quantity: 1,
})

async function load() {
  try {
    const p = await paymentsApi.get(Number(props.pid))
    payment.value = p
    items.value = p.items.map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      unit_price: it.unit_price,
      quantity: it.quantity,
    }))
    memo.value = p.memo ?? ''
    pointUsed.value = String(p.point_used)
    pointEarned.value = String(p.point_earned)
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
  try {
    searchResult.value = await itemsApi.search(q)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
function pickItem(it: Item) {
  draft.value = { item_id: it.id, name: it.name, price: it.price, quantity: 1 }
  searchQ.value = ''
  searchResult.value = []
}
function addItem() {
  if (!draft.value.name.trim()) return toast.error('품명을 입력하세요.')
  items.value.push({
    item_id: draft.value.item_id ?? null,
    item_name: draft.value.name.trim(),
    unit_price: Number(draft.value.price),
    quantity: Number(draft.value.quantity) || 1,
  })
  draft.value = { name: '', price: 0, quantity: 1 }
}
function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

const total = computed(() =>
  items.value.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)
const final = computed(() => Math.max(0, total.value - (Number(pointUsed.value) || 0)))

async function onFile(e: Event) {
  const t = e.target as HTMLInputElement
  const f = t.files?.[0]
  t.value = ''
  if (!f || !payment.value) return
  uploading.value = true
  try {
    const added = await paymentsApi.uploadImage(payment.value.id, f)
    payment.value.images.push(added)
    toast.success('이미지가 추가되었습니다.')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    uploading.value = false
  }
}

async function removeImage(imgId: number) {
  if (!payment.value) return
  try {
    await paymentsApi.removeImage(payment.value.id, imgId)
    payment.value.images = payment.value.images.filter((i) => i.id !== imgId)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function save() {
  if (!payment.value) return
  if (items.value.length === 0) return toast.error('결제 항목을 최소 1개 등록하세요.')
  saving.value = true
  try {
    await paymentsApi.update(payment.value.id, {
      items: items.value,
      point_used: Number(pointUsed.value) || 0,
      point_earned: Number(pointEarned.value) || 0,
      memo: memo.value,
    })
    toast.success('결제가 수정되었습니다.')
    router.replace(`/members/${props.id}`)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

const staticBase = computed(() => {
  const base = (import.meta.env.VITE_STATIC_BASE as string) || '/static'
  return base.replace(/\/$/, '')
})
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.back()">
      <ChevronLeft :size="18" />
      <span>뒤로</span>
    </button>

    <h1 class="t-title-1" style="margin-bottom: 24px">결제 수정</h1>

    <template v-if="payment">
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
          <AppButton size="medium" variant="primary" @click="addItem">
            <Plus :size="16" />
            <span>추가</span>
          </AppButton>
        </div>
      </AppCard>

      <AppCard title="결제 목록" padding="lg" style="margin-top: 16px">
        <div v-if="items.length === 0" class="t-body-2 text-tert">항목이 없습니다.</div>
        <div v-else class="cart">
          <div v-for="(it, idx) in items" :key="idx" class="cart__row">
            <div class="cart__main">
              <div class="cart__name text-strong">{{ it.item_name }}</div>
              <div class="cart__meta num">
                {{ it.unit_price.toLocaleString() }}원 x {{ it.quantity }}
              </div>
            </div>
            <div class="cart__amount num">{{ (it.unit_price * it.quantity).toLocaleString() }}원</div>
            <button class="cart__del" type="button" @click="removeItem(idx)" aria-label="삭제">
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
          <AppInput v-model="pointUsed" label="사용 포인트" inputmode="numeric" />
          <AppInput v-model="pointEarned" label="적립 포인트" inputmode="numeric" />
        </div>
      </AppCard>

      <AppCard title="메모 및 이미지" padding="lg" style="margin-top: 16px">
        <AppTextarea v-model="memo" label="메모" :rows="5" placeholder="줄바꿈도 그대로 저장됩니다." />

        <div class="gallery">
          <div
            v-for="(img, idx) in payment.images"
            :key="img.id"
            class="gallery__item"
            @click="openViewer(idx)"
          >
            <img :src="`${staticBase}/${img.file_path}`" :alt="String(img.id)" />
            <button
              class="gallery__del"
              type="button"
              aria-label="삭제"
              @click.stop="removeImage(img.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
          <label class="gallery__add">
            <ImageIcon :size="20" />
            <span class="t-caption">{{ uploading ? '업로드 중...' : '이미지 추가' }}</span>
            <input class="file__input" type="file" accept="image/*" :disabled="uploading" @change="onFile" />
          </label>
        </div>
      </AppCard>

      <AppImageViewer
        :open="viewerOpen"
        :images="payment.images.map((i) => ({ id: i.id, src: `${staticBase}/${i.file_path}` }))"
        v-model:index="viewerIndex"
        @close="viewerOpen = false"
      />

      <div class="bottom">
        <AppButton variant="outline" size="large" @click="router.back()">취소</AppButton>
        <AppButton variant="primary" size="large" :loading="saving" @click="save" block>
          <Save :size="18" />
          <span>저장</span>
        </AppButton>
      </div>
    </template>
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
  margin-top: 8px;
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
}
.picker__name {
  color: var(--color-text-strong);
}

.draft {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: end;
  gap: 12px;
}
@media (max-width: 768px) {
  .draft {
    grid-template-columns: 1fr 1fr;
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

.gallery {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.gallery__item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 14px;
  overflow: hidden;
  background: var(--color-line-soft);
  cursor: zoom-in;
  transition: transform 120ms ease;
}
.gallery__item:hover {
  transform: scale(1.02);
}
.gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.gallery__del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.gallery__add {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px dashed var(--color-line);
  border-radius: 14px;
  color: var(--color-text-tert);
  cursor: pointer;
}
.gallery__add:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-sub);
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
