<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Trash2,
  Image as ImageIcon,
  Save,
  Banknote,
  CreditCard,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppImageViewer from '@/components/ui/AppImageViewer.vue'
import PaymentItemsEditor from '@/components/PaymentItemsEditor.vue'
import {
  paymentsApi,
  type PaymentItemInput,
  type Payment,
  type PaymentMethod,
} from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string; pid: string }>()
const router = useRouter()
const toast = useToast()

const POINT_PER_WON = 1000 // 1,000원당 1P 적립

const payment = ref<Payment | null>(null)
const items = ref<PaymentItemInput[]>([])
const memo = ref('')
const pointUsed = ref('0')
const paymentMethod = ref<PaymentMethod>('CASH')
const saving = ref(false)
const uploading = ref(false)

const viewerOpen = ref(false)
const viewerIndex = ref(0)
function openViewer(idx: number) {
  viewerIndex.value = idx
  viewerOpen.value = true
}

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
    paymentMethod.value = p.payment_method ?? 'CASH'
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
onMounted(load)

const total = computed(() =>
  items.value.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)
const final = computed(() => Math.max(0, total.value - (Number(pointUsed.value) || 0)))
const pointEarned = computed(() =>
  paymentMethod.value === 'CARD' ? 0 : Math.floor(final.value / POINT_PER_WON),
)

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
  if (items.value.some((x) => !x.item_name.trim())) {
    return toast.error('품명이 비어있는 항목이 있습니다.')
  }
  saving.value = true
  try {
    await paymentsApi.update(payment.value.id, {
      items: items.value.map((x) => ({ ...x, item_name: x.item_name.trim() })),
      point_used: Number(pointUsed.value) || 0,
      point_earned: pointEarned.value,
      payment_method: paymentMethod.value,
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
      <AppCard title="항목" padding="lg">
        <PaymentItemsEditor v-model="items" />
      </AppCard>

      <AppCard title="결제 수단" padding="lg" style="margin-top: 16px">
        <div class="method">
          <button
            type="button"
            class="method__btn"
            :class="{ 'method__btn--active': paymentMethod === 'CASH' }"
            @click="paymentMethod = 'CASH'"
          >
            <Banknote :size="22" />
            <span class="method__label">현금</span>
            <span class="method__hint">포인트 적립</span>
          </button>
          <button
            type="button"
            class="method__btn"
            :class="{ 'method__btn--active': paymentMethod === 'CARD' }"
            @click="paymentMethod = 'CARD'"
          >
            <CreditCard :size="22" />
            <span class="method__label">카드</span>
            <span class="method__hint">적립 없음</span>
          </button>
        </div>
      </AppCard>

      <AppCard title="포인트" padding="lg" style="margin-top: 16px">
        <div class="grid-2">
          <AppInput v-model="pointUsed" label="사용 포인트" inputmode="numeric" />
          <AppInput
            :model-value="pointEarned.toLocaleString()"
            label="적립 포인트"
            readonly
            :hint="paymentMethod === 'CARD' ? '카드 결제는 적립되지 않습니다' : '결제 금액 1,000원당 1P 자동 적립'"
          />
        </div>
        <div class="final">
          <span class="t-title-3">결제 금액</span>
          <span class="num t-title-1" style="color: var(--color-primary)">
            {{ final.toLocaleString() }}원
          </span>
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

.method {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.method__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 96px;
  padding: 12px;
  background: #fff;
  border: 2px solid var(--color-line);
  border-radius: 14px;
  color: var(--color-text-sub);
  transition: all 120ms ease;
}
.method__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-text-strong);
}
.method__btn--active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.method__label {
  font: var(--font-body-2);
  font-size: 17px;
  font-weight: 700;
}
.method__hint {
  font: var(--font-caption);
  color: var(--color-text-tert);
}
.method__btn--active .method__hint {
  color: var(--color-primary);
  opacity: 0.85;
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
.final {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--color-line-soft);
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
