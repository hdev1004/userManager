<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  StickyNote,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppImageViewer from '@/components/ui/AppImageViewer.vue'
import { paymentsApi, type Payment } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  memberId: number | null
  paymentId: number | null
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const router = useRouter()
const toast = useToast()

const payment = ref<Payment | null>(null)
const loading = ref(false)
const viewerOpen = ref(false)
const viewerIndex = ref(0)

const staticBase = computed(() => {
  const base = (import.meta.env.VITE_STATIC_BASE as string) || '/userManage/static'
  return base.replace(/\/$/, '')
})

const images = computed(() =>
  (payment.value?.images ?? []).map((i) => ({
    id: i.id,
    src: `${staticBase.value}/${i.file_path}`,
  })),
)

watch(
  () => [props.open, props.paymentId] as const,
  async ([isOpen, pid]) => {
    if (!isOpen || !pid) {
      payment.value = null
      viewerOpen.value = false
      return
    }
    loading.value = true
    try {
      payment.value = await paymentsApi.get(pid)
    } catch (e) {
      toast.error(errorMessage(e))
      emit('close')
    } finally {
      loading.value = false
    }
  },
)

function openViewer(idx: number) {
  viewerIndex.value = idx
  viewerOpen.value = true
}

function goDetail() {
  if (!props.memberId || !props.paymentId) return
  const mid = props.memberId
  const pid = props.paymentId
  emit('close')
  router.push(`/members/${mid}/payments/${pid}`)
}
</script>

<template>
  <AppModal :open="open" :width="640" @close="$emit('close')">
    <template #title>결제 상세</template>

    <div v-if="loading" class="loading t-body-2 text-tert">불러오는 중...</div>

    <div v-else-if="payment" class="content">
      <section class="block">
        <header class="block__head">
          <StickyNote :size="16" />
          <h4 class="block__title">메모</h4>
        </header>
        <div v-if="payment.memo" class="memo">{{ payment.memo }}</div>
        <div v-else class="empty">메모가 없습니다.</div>
      </section>

      <section class="block">
        <header class="block__head">
          <ImageIcon :size="16" />
          <h4 class="block__title">사진</h4>
          <span v-if="images.length > 0" class="block__count num">
            {{ images.length }}장
          </span>
        </header>
        <div v-if="images.length > 0" class="gallery">
          <button
            v-for="(img, idx) in images"
            :key="img.id"
            type="button"
            class="gallery__item"
            @click="openViewer(idx)"
          >
            <img :src="img.src" :alt="String(img.id)" />
          </button>
        </div>
        <div v-else class="empty">첨부된 사진이 없습니다.</div>
      </section>
    </div>

    <template #footer>
      <AppButton variant="outline" size="medium" @click="$emit('close')">닫기</AppButton>
      <AppButton
        variant="primary"
        size="medium"
        :disabled="!payment"
        @click="goDetail"
      >
        <span>상세 페이지로 이동</span>
        <ArrowRight :size="16" />
      </AppButton>
    </template>

    <AppImageViewer
      :open="viewerOpen"
      :images="images"
      v-model:index="viewerIndex"
      @close="viewerOpen = false"
    />
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
  gap: 20px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.block__head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-strong);
}
.block__head :deep(svg) {
  color: var(--color-text-sub);
}
.block__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.block__count {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-tert);
}

.memo {
  padding: 14px 16px;
  border: var(--border);
  border-radius: 12px;
  font-size: 16px;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.55;
}
.empty {
  padding: 14px 16px;
  border: 1px dashed var(--color-line);
  border-radius: 12px;
  font-size: 14px;
  color: var(--color-text-tert);
  text-align: center;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 640px) {
  .gallery {
    grid-template-columns: repeat(3, 1fr);
  }
}
.gallery__item {
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-line);
  padding: 0;
  cursor: pointer;
  transition: transform 100ms ease;
}
.gallery__item:hover {
  transform: scale(1.02);
}
.gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
