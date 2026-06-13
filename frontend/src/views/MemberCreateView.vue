<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, UserPlus } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { membersApi } from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const name = ref('')
const phone = ref('')
const point = ref('')
const memo = ref('')
const errors = ref<Record<string, string>>({})
const loading = ref(false)

async function submit() {
  errors.value = {}
  if (!name.value.trim()) {
    errors.value.name = '성명을 입력하세요.'
    return
  }
  loading.value = true
  try {
    const created = await membersApi.create({
      name: name.value.trim(),
      phone: phone.value.replace(/[^0-9]/g, '') || undefined,
      point: point.value ? Number(point.value) : 0,
      memo: memo.value.trim() || undefined,
    })
    toast.success('회원이 추가되었습니다.')
    router.replace(`/members/${created.id}`)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.back()">
      <ChevronLeft :size="18" />
      <span>뒤로</span>
    </button>

    <h1 class="t-title-1" style="margin-bottom: 24px">회원 추가</h1>

    <AppCard padding="lg">
      <form class="form" @submit.prevent="submit">
        <AppInput
          v-model="name"
          label="성명"
          placeholder="홍길동"
          :error="errors.name"
          autofocus
          :maxlength="50"
        />
        <AppInput
          v-model="phone"
          label="전화번호"
          inputmode="tel"
          placeholder="01012345678"
          hint="숫자만 입력. 빈 값 가능."
          :maxlength="20"
        />
        <AppInput
          v-model="point"
          label="초기 포인트"
          inputmode="numeric"
          placeholder="0"
        />
        <AppInput
          v-model="memo"
          label="메모"
          placeholder="고객 특이사항"
        />

        <div class="form__actions">
          <AppButton variant="outline" size="large" type="button" @click="router.back()">
            취소
          </AppButton>
          <AppButton variant="primary" size="large" type="submit" :loading="loading" block>
            <UserPlus :size="18" />
            <span>회원 추가</span>
          </AppButton>
        </div>
      </form>
    </AppCard>
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
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
