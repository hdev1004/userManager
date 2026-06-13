<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  Image as ImageIcon,
  CreditCard,
  X,
  Banknote,
  User,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import PaymentItemsEditor from '@/components/PaymentItemsEditor.vue'
import { membersApi, type Member } from '@/api/members'
import { paymentsApi, type PaymentItemInput, type PaymentMethod } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ id: string }>()
const router = useRouter()
const toast = useToast()

const POINT_PER_WON = 1000 // 적립: 1,000원당 1P
const POINT_VALUE = 10 // 사용: 1P = 10원

const member = ref<Member | null>(null)
const items = ref<PaymentItemInput[]>([])
const memo = ref('')
const pointUsed = ref('0')
const paymentMethod = ref<PaymentMethod>('CASH')
const pendingImages = ref<File[]>([])
const pendingPreviews = ref<string[]>([])
const saving = ref(false)

async function load() {
  try {
    member.value = await membersApi.get(Number(props.id))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
onMounted(load)

const total = computed(() =>
  items.value.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)
const effectivePointUsed = computed(() =>
  paymentMethod.value === 'CARD' ? 0 : Number(pointUsed.value) || 0,
)
const pointDiscount = computed(() => effectivePointUsed.value * POINT_VALUE)
const final = computed(() => Math.max(0, total.value - pointDiscount.value))
const pointEarned = computed(() =>
  paymentMethod.value === 'CARD' ? 0 : Math.floor(final.value / POINT_PER_WON),
)

watch(paymentMethod, (m) => {
  if (m === 'CARD') pointUsed.value = '0'
})

function onFile(e: Event) {
  const t = e.target as HTMLInputElement
  const newFiles = Array.from(t.files ?? [])
  pendingImages.value = [...pendingImages.value, ...newFiles]
  pendingPreviews.value = [
    ...pendingPreviews.value,
    ...newFiles.map((f) => URL.createObjectURL(f)),
  ]
  t.value = '' // allow re-selecting the same file
}

function removePending(idx: number) {
  const url = pendingPreviews.value[idx]
  if (url) URL.revokeObjectURL(url)
  pendingImages.value.splice(idx, 1)
  pendingPreviews.value.splice(idx, 1)
}

async function submit() {
  if (!member.value) return
  if (items.value.length === 0) {
    toast.error('결제 항목을 최소 1개 추가하세요.')
    return
  }
  if (items.value.some((x) => !x.item_name.trim())) {
    toast.error('품명이 비어있는 항목이 있습니다.')
    return
  }
  saving.value = true
  try {
    const created = await paymentsApi.create({
      member_id: member.value.id,
      items: items.value.map((x) => ({ ...x, item_name: x.item_name.trim() })),
      point_used: effectivePointUsed.value,
      point_earned: pointEarned.value,
      payment_method: paymentMethod.value,
      memo: memo.value.trim() || undefined,
    })
    for (const f of pendingImages.value) {
      await paymentsApi.uploadImage(created.id, f)
    }
    pendingPreviews.value.forEach((u) => URL.revokeObjectURL(u))
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
      <ChevronLeft :size="22" />
      <span>뒤로</span>
    </button>

    <h1 class="t-title-1" style="margin-bottom: 16px">결제 등록</h1>

    <div v-if="member" class="member-card">
      <div class="member-card__avatar"><User :size="28" /></div>
      <div class="member-card__name">
        <div class="member-card__name-label">회원</div>
        <div class="member-card__name-value">{{ member.name }}</div>
      </div>
      <div class="member-card__divider" />
      <div class="member-card__point">
        <div class="member-card__point-label">보유 포인트</div>
        <div class="member-card__point-value num">
          {{ member.point.toLocaleString() }}<span class="member-card__point-unit">P</span>
        </div>
      </div>
    </div>

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

    <AppCard
      v-if="paymentMethod === 'CASH'"
      title="포인트"
      padding="lg"
      style="margin-top: 16px"
    >
      <div class="grid-2">
        <AppInput
          v-model="pointUsed"
          label="사용 포인트"
          inputmode="numeric"
          :hint="
            effectivePointUsed > 0
              ? `${pointDiscount.toLocaleString()}원 할인 (1P = ${POINT_VALUE}원)`
              : `보유 ${(member?.point ?? 0).toLocaleString()}P  ·  1P = ${POINT_VALUE}원`
          "
        />
        <AppInput
          :model-value="pointEarned.toLocaleString()"
          label="적립 포인트"
          readonly
          hint="결제 금액 1,000원당 1P 자동 적립"
        />
      </div>
      <div class="final">
        <span class="t-title-3">결제 금액</span>
        <span class="num t-title-1" style="color: var(--color-primary)">
          {{ final.toLocaleString() }}원
        </span>
      </div>
    </AppCard>

    <AppCard
      v-else
      title="결제 금액"
      padding="lg"
      style="margin-top: 16px"
    >
      <div class="final">
        <span class="t-body-2 text-sub">합계</span>
        <span class="num t-title-1" style="color: var(--color-primary)">
          {{ final.toLocaleString() }}원
        </span>
      </div>
    </AppCard>

    <AppCard title="메모 및 이미지" padding="lg" style="margin-top: 16px">
      <AppTextarea v-model="memo" label="메모" :rows="5" placeholder="시술 메모 (선택) — 줄바꿈 가능" />

      <div class="gallery">
        <div
          v-for="(url, idx) in pendingPreviews"
          :key="idx"
          class="gallery__item"
        >
          <img :src="url" :alt="`첨부 이미지 ${idx + 1}`" />
          <button
            type="button"
            class="gallery__del"
            aria-label="삭제"
            @click="removePending(idx)"
          >
            <X :size="14" />
          </button>
        </div>
        <label class="gallery__add">
          <ImageIcon :size="20" />
          <span class="t-caption">이미지 추가</span>
          <input
            class="file__input"
            type="file"
            accept="image/*"
            multiple
            @change="onFile"
          />
        </label>
      </div>
      <p v-if="pendingImages.length > 0" class="hint t-caption">
        총 {{ pendingImages.length }}장 첨부 (결제 등록 시 함께 업로드됨)
      </p>
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
.member-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: linear-gradient(135deg, #e8f2fe 0%, #dbeafe 100%);
  border: 1px solid rgba(49, 130, 246, 0.18);
  border-radius: 20px;
  margin-bottom: 16px;
}
.member-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.member-card__name-label {
  font: var(--font-caption);
  color: var(--color-text-sub);
}
.member-card__name-value {
  font: var(--font-title-2);
  color: var(--color-text-strong);
  margin-top: 2px;
}
.member-card__divider {
  width: 1px;
  height: 48px;
  background: rgba(49, 130, 246, 0.2);
  margin-left: auto;
}
.member-card__point {
  text-align: right;
}
.member-card__point-label {
  font: var(--font-body-3);
  font-size: 15px;
  color: var(--color-primary);
  font-weight: 600;
}
.member-card__point-value {
  margin-top: 4px;
  font-family: 'Pretendard', sans-serif;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-primary);
  letter-spacing: -0.02em;
}
.member-card__point-unit {
  font-size: 22px;
  font-weight: 700;
  margin-left: 4px;
}
@media (max-width: 640px) {
  .member-card {
    padding: 20px;
    gap: 14px;
  }
  .member-card__divider {
    display: none;
  }
  .member-card__point-value {
    font-size: 28px;
  }
  .member-card__point-unit {
    font-size: 18px;
  }
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
}
.gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.hint {
  margin: 8px 0 0;
  color: var(--color-text-tert);
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
