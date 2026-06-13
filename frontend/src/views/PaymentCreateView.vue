<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Image as ImageIcon, CreditCard } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import PaymentItemsEditor from '@/components/PaymentItemsEditor.vue'
import { membersApi, type Member } from '@/api/members'
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
  if (items.value.some((x) => !x.item_name.trim())) {
    toast.error('품명이 비어있는 항목이 있습니다.')
    return
  }
  saving.value = true
  try {
    const created = await paymentsApi.create({
      member_id: member.value.id,
      items: items.value.map((x) => ({ ...x, item_name: x.item_name.trim() })),
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

    <AppCard title="항목" padding="lg">
      <PaymentItemsEditor v-model="items" />
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
      <div class="final">
        <span class="t-title-3">결제 금액</span>
        <span class="num t-title-1" style="color: var(--color-primary)">
          {{ final.toLocaleString() }}원
        </span>
      </div>
    </AppCard>

    <AppCard title="메모 및 이미지" padding="lg" style="margin-top: 16px">
      <AppTextarea v-model="memo" label="메모" :rows="5" placeholder="시술 메모 (선택) — 줄바꿈 가능" />
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
