<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, KeyRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { authApi } from '@/api/auth'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const current = ref('')
const next = ref('')
const confirm = ref('')
const loading = ref(false)
const err = ref('')

async function submit() {
  err.value = ''
  if (!current.value || !next.value) {
    err.value = '비밀번호를 입력해 주세요.'
    return
  }
  if (next.value.length < 4) {
    err.value = '새 비밀번호는 최소 4자 이상이어야 합니다.'
    return
  }
  if (next.value !== confirm.value) {
    err.value = '새 비밀번호 확인이 일치하지 않습니다.'
    return
  }
  loading.value = true
  try {
    await authApi.changePassword(current.value, next.value)
    toast.success('비밀번호가 변경되었습니다.')
    router.back()
  } catch (e) {
    err.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.back()">
      <ChevronLeft :size="22" />
      <span>뒤로</span>
    </button>

    <h1 class="t-title-1" style="margin-bottom: 24px">비밀번호 변경</h1>

    <AppCard padding="lg">
      <form class="form" @submit.prevent="submit">
        <AppInput v-model="current" label="현재 비밀번호" type="password" autofocus />
        <AppInput v-model="next" label="새 비밀번호" type="password" hint="최소 4자" />
        <AppInput v-model="confirm" label="새 비밀번호 확인" type="password" />
        <p v-if="err" class="t-caption" style="color:var(--color-danger);margin:0">{{ err }}</p>

        <AppButton variant="primary" size="large" type="submit" :loading="loading" block>
          <KeyRound :size="18" />
          <span>변경</span>
        </AppButton>
      </form>
    </AppCard>
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
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
