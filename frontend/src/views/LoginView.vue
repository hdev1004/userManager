<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/api/client'

const loginId = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function submit() {
  if (loading.value) return
  if (!loginId.value || !password.value) {
    error.value = '아이디와 비밀번호를 입력해 주세요.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.login(loginId.value.trim(), password.value)
    const next = (route.query.next as string) || '/'
    router.replace(next)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="login__box">
      <div class="login__brand">
        <span class="login__brand-name">회원관리</span>
        <span class="login__brand-sub">관리자 로그인</span>
      </div>

      <form class="login__form" @submit.prevent="submit">
        <AppInput
          v-model="loginId"
          label="아이디"
          placeholder="로그인 아이디"
          autofocus
        />
        <AppInput
          v-model="password"
          label="비밀번호"
          type="password"
          placeholder="비밀번호"
          @enter="submit"
        />
        <p v-if="error" class="login__error">{{ error }}</p>
        <AppButton size="large" block type="submit" :loading="loading">
          <LogIn :size="18" />
          <span>로그인</span>
        </AppButton>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-bg-page);
}
.login__box {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.login__brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.login__brand-name {
  font: var(--font-display-2);
  color: var(--color-text-strong);
  letter-spacing: -0.02em;
}
.login__brand-sub {
  font: var(--font-body-2);
  color: var(--color-text-sub);
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.login__error {
  font: var(--font-caption);
  color: var(--color-danger);
  margin: 0;
  text-align: center;
}
</style>
