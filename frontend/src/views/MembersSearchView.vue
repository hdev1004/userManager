<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, UserPlus, Phone, User } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { membersApi, type MemberSummary } from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const query = ref('')
const list = ref<MemberSummary[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
let timer: number | undefined

async function search() {
  const q = query.value.trim()
  if (!q) {
    list.value = []
    hasSearched.value = false
    return
  }
  loading.value = true
  try {
    list.value = await membersApi.search(q)
    hasSearched.value = true
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

function onSubmit() {
  if (timer) clearTimeout(timer)
  searchInputRef.value?.blur() // iPad: 소프트 키보드 닫기
  search()
}

watch(query, () => {
  if (timer) clearTimeout(timer)
  timer = window.setTimeout(search, 200)
})

onMounted(() => {
  // no-op
})

function fmtPhone(p: string | null) {
  if (!p) return '—'
  const t = p.replace(/[^0-9]/g, '')
  if (t.length === 11) return `${t.slice(0, 3)}-${t.slice(3, 7)}-${t.slice(7)}`
  if (t.length === 10) return `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`
  return p
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="t-title-1">회원 검색</h1>
        <p class="t-body-2 text-tert" style="margin-top: 4px">
          성명 또는 전화번호 뒷자리 4자리로 찾으세요.
        </p>
      </div>
      <AppButton size="medium" variant="primary" @click="router.push('/members/new')">
        <UserPlus :size="18" />
        <span>회원 추가</span>
      </AppButton>
    </header>

    <form class="search" @submit.prevent="onSubmit">
      <div class="search__icon"><Search :size="18" /></div>
      <input
        ref="searchInputRef"
        v-model="query"
        class="search__input"
        type="search"
        placeholder="이름 (홍길동) 또는 전화번호 뒷 4자리 (1234)"
        inputmode="search"
        enterkeyhint="search"
        autocomplete="off"
        autofocus
      />
    </form>

    <section v-if="loading" class="empty">
      <p class="t-body-2 text-tert">검색 중...</p>
    </section>

    <section v-else-if="list.length > 0" class="list">
      <button
        v-for="m in list"
        :key="m.id"
        class="row"
        type="button"
        @click="router.push(`/members/${m.id}`)"
      >
        <div class="row__avatar"><User :size="20" /></div>
        <div class="row__main">
          <div class="row__name">{{ m.name }}</div>
          <div class="row__sub">
            <Phone :size="14" />
            <span class="num">{{ fmtPhone(m.phone) }}</span>
          </div>
        </div>
        <div class="row__right">
          <div class="row__point num">{{ m.point.toLocaleString() }} P</div>
          <div class="row__visit num">방문 {{ m.visit_count }}회</div>
        </div>
      </button>
    </section>

    <section v-else-if="hasSearched" class="empty">
      <p class="t-body-2 text-tert">검색 결과가 없습니다.</p>
    </section>

    <section v-else class="empty">
      <p class="t-body-2 text-tert">검색어를 입력하세요.</p>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.search {
  position: relative;
  margin-bottom: 24px;
}
.search__icon {
  position: absolute;
  top: 50%;
  left: 18px;
  transform: translateY(-50%);
  color: var(--color-text-tert);
}
.search__input {
  width: 100%;
  height: 60px;
  padding: 0 20px 0 48px;
  font: var(--font-body-2);
  font-size: 16px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all 120ms ease;
}
.search__input::placeholder {
  color: var(--color-text-tert);
}
.search__input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.list {
  background: #fff;
  border-radius: var(--radius-xl);
  border: var(--border);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-line-soft);
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}
.row:last-child {
  border-bottom: none;
}
.row:hover {
  background: var(--color-bg-hover);
}
.row__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row__main {
  flex: 1;
  min-width: 0;
}
.row__name {
  font: var(--font-title-3);
  color: var(--color-text-strong);
}
.row__sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font: var(--font-caption);
  color: var(--color-text-tert);
}
.row__right {
  text-align: right;
}
.row__point {
  font: var(--font-body-3);
  font-weight: 700;
  color: var(--color-primary);
}
.row__visit {
  font: var(--font-caption);
  color: var(--color-text-tert);
  margin-top: 2px;
}
.empty {
  background: #fff;
  border: var(--border);
  border-radius: var(--radius-xl);
  padding: 80px 24px;
  text-align: center;
}
</style>
