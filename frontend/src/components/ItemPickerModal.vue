<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Tag, Check } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { categoriesApi, itemsApi, type Category, type Item } from '@/api/items'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  selectedIds?: number[]
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pick', item: Item): void
}>()

const toast = useToast()
const categories = ref<Category[]>([])
const items = ref<Item[]>([])
const activeCatId = ref<number | null>(null)
const loading = ref(false)
let loaded = false

const filtered = computed(() =>
  items.value.filter((i) => i.category_id === activeCatId.value && i.is_active),
)

const selectedSet = computed(() => new Set(props.selectedIds ?? []))

async function load() {
  if (loaded) return
  loading.value = true
  try {
    const [cs, is] = await Promise.all([categoriesApi.list(), itemsApi.list()])
    categories.value = cs
    items.value = is
    if (cs[0] && !activeCatId.value) activeCatId.value = cs[0].id
    loaded = true
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) load()
  },
  { immediate: true },
)
</script>

<template>
  <AppModal :open="open" :width="560" @close="emit('close')">
    <template #title>물품 선택</template>

    <div class="tabs">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="tab"
        :class="{ 'tab--active': activeCatId === c.id }"
        @click="activeCatId = c.id"
      >
        <Tag :size="14" />
        <span>{{ c.name }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading">불러오는 중...</div>
    <div v-else-if="filtered.length === 0" class="loading">물품이 없습니다.</div>
    <ul v-else class="list">
      <li v-for="it in filtered" :key="it.id">
        <button
          type="button"
          class="row"
          :class="{ 'row--selected': selectedSet.has(it.id) }"
          @click="emit('pick', it)"
        >
          <span class="row__code">{{ it.code }}</span>
          <span class="row__name">{{ it.name }}</span>
          <span class="row__price num">{{ it.price.toLocaleString() }}원</span>
          <span v-if="selectedSet.has(it.id)" class="row__check">
            <Check :size="18" />
          </span>
        </button>
      </li>
    </ul>

    <template #footer>
      <AppButton variant="primary" size="medium" @click="emit('close')">완료</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-hover);
  color: var(--color-text-sub);
  font: var(--font-body-3);
  font-size: 15px;
  transition: all 120ms ease;
}
.tab:hover {
  background: var(--color-line);
}
.tab--active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
}

.loading {
  padding: 40px 0;
  text-align: center;
  font: var(--font-body-2);
  color: var(--color-text-tert);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 56vh;
  overflow-y: auto;
  margin: 0 -4px;
  padding: 0 4px;
}
.row {
  display: grid;
  grid-template-columns: 80px 1fr auto 24px;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 120ms ease;
}
.row:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.row--selected {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.row__code {
  font: var(--font-body-3);
  color: var(--color-text-tert);
  font-variant-numeric: tabular-nums;
}
.row__name {
  font: var(--font-body-2);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.row__price {
  font: var(--font-body-2);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}
.row__check {
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
