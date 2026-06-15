<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { LogOut, KeyRound, ChevronDown, Search, Package, BarChart3 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const open = ref(false)

const adminLabel = computed(() => auth.admin?.name || auth.admin?.loginId || '관리자')

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <RouterLink to="/" class="topbar__brand">회원관리</RouterLink>

      <nav class="topbar__nav">
        <RouterLink to="/" class="nav-item" exact-active-class="nav-item--active">
          <Search :size="18" />
          <span>회원 검색</span>
        </RouterLink>
        <RouterLink to="/items" class="nav-item" active-class="nav-item--active">
          <Package :size="18" />
          <span>물품 관리</span>
        </RouterLink>
        <RouterLink to="/stats" class="nav-item" active-class="nav-item--active">
          <BarChart3 :size="18" />
          <span>통계</span>
        </RouterLink>
      </nav>

      <div class="spacer" />

      <div class="topbar__user" tabindex="0" @click="open = !open" @blur="open = false">
        <span class="topbar__user-name">{{ adminLabel }}</span>
        <ChevronDown :size="16" />
        <div v-show="open" class="menu">
          <RouterLink to="/account/password" class="menu__item" @mousedown.prevent>
            <KeyRound :size="16" />
            <span>비밀번호 변경</span>
          </RouterLink>
          <button class="menu__item" @mousedown.prevent="logout">
            <LogOut :size="16" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--top-bar-h) + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  background: #fff;
  border-bottom: 1px solid var(--color-line-soft);
  z-index: 20;
}
.topbar__inner {
  max-width: var(--page-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: var(--space-6);
}
.topbar__brand {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-strong);
  letter-spacing: -0.02em;
}
.topbar__nav {
  display: flex;
  gap: 6px;
}
.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-sub);
  transition: all 120ms ease;
}
.nav-item :deep(svg) {
  width: 22px;
  height: 22px;
}
.nav-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
}
.nav-item--active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}

.topbar__user {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text-strong);
  outline: none;
}
.topbar__user :deep(svg) {
  width: 18px;
  height: 18px;
}
.topbar__user:hover {
  background: var(--color-bg-hover);
}
.topbar__user-name {
  font-weight: 700;
}
.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
  min-width: 220px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  text-align: left;
  width: 100%;
  background: transparent;
}
.menu__item :deep(svg) {
  width: 18px;
  height: 18px;
}
.menu__item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
}
.spacer {
  flex: 1;
}

/* 모바일: nav 텍스트 숨기고 아이콘만 / brand 살짝 작게 / padding 축소 */
@media (max-width: 640px) {
  .topbar__inner {
    padding: 0 12px;
    gap: var(--space-3);
  }
  .topbar__brand {
    font-size: 17px;
  }
  .nav-item {
    height: 40px;
    width: 40px;
    padding: 0;
    justify-content: center;
  }
  .nav-item span {
    display: none;
  }
  .topbar__user-name {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
