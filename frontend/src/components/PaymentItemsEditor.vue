<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Minus, Trash2, ShoppingBag, Pencil } from 'lucide-vue-next'
import type { Item } from '@/api/items'
import type { PaymentItemInput } from '@/api/payments'
import AppButton from '@/components/ui/AppButton.vue'
import ItemPickerModal from '@/components/ItemPickerModal.vue'

const props = defineProps<{
  modelValue: PaymentItemInput[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: PaymentItemInput[]): void
}>()

const pickerOpen = ref(false)

function update(next: PaymentItemInput[]) {
  emit('update:modelValue', next)
}

function patch(idx: number, partial: Partial<PaymentItemInput>) {
  const list = props.modelValue.map((row, i): PaymentItemInput =>
    i === idx ? { ...row, ...partial } : row,
  )
  update(list)
}

function addFromItem(it: Item) {
  const existing = props.modelValue.findIndex(
    (x) => x.item_id === it.id && x.item_name === it.name && x.unit_price === it.price,
  )
  if (existing >= 0) {
    patch(existing, { quantity: (props.modelValue[existing]?.quantity ?? 0) + 1 })
  } else {
    update([
      ...props.modelValue,
      { item_id: it.id, item_name: it.name, unit_price: it.price, quantity: 1 },
    ])
  }
}

function addManual() {
  update([
    ...props.modelValue,
    { item_id: null, item_name: '', unit_price: 0, quantity: 1 },
  ])
}

function setName(idx: number, v: string) {
  patch(idx, { item_name: v })
}
function setPrice(idx: number, v: number) {
  patch(idx, { unit_price: Number.isFinite(v) ? Math.max(0, v) : 0 })
}
function setQty(idx: number, v: number) {
  patch(idx, { quantity: Math.max(1, Math.floor(v) || 1) })
}
function inc(idx: number) {
  const row = props.modelValue[idx]
  if (row) setQty(idx, row.quantity + 1)
}
function dec(idx: number) {
  const row = props.modelValue[idx]
  if (row) setQty(idx, row.quantity - 1)
}
function remove(idx: number) {
  update(props.modelValue.filter((_, i) => i !== idx))
}

const total = computed(() =>
  props.modelValue.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)

const selectedIds = computed(() =>
  props.modelValue
    .map((x) => x.item_id)
    .filter((id): id is number => typeof id === 'number'),
)
</script>

<template>
  <div class="actions">
    <AppButton size="large" variant="primary" @click="pickerOpen = true">
      <ShoppingBag :size="18" />
      <span>물품 선택</span>
    </AppButton>
    <AppButton size="large" variant="outline" @click="addManual">
      <Pencil :size="18" />
      <span>직접 추가</span>
    </AppButton>
  </div>

  <div class="cart">
    <header class="cart__head">
      <h4 class="cart__title">결제 목록</h4>
      <span class="cart__count num">{{ modelValue.length }}개 항목</span>
    </header>

    <div v-if="modelValue.length === 0" class="cart__empty">
      위의 <strong>물품 선택</strong> 버튼을 눌러 항목을 추가하세요.
    </div>

    <div v-else class="cart__list">
      <div v-for="(row, idx) in modelValue" :key="idx" class="row">
        <input
          class="row__name"
          :value="row.item_name"
          placeholder="품명"
          @input="setName(idx, ($event.target as HTMLInputElement).value)"
        />
        <input
          class="row__price num"
          inputmode="numeric"
          :value="row.unit_price"
          placeholder="0"
          @input="setPrice(idx, Number(($event.target as HTMLInputElement).value))"
        />
        <div class="qty">
          <button
            type="button"
            class="qty__btn"
            :disabled="row.quantity <= 1"
            @click="dec(idx)"
          >
            <Minus :size="16" />
          </button>
          <input
            class="qty__num num"
            inputmode="numeric"
            :value="row.quantity"
            @input="setQty(idx, Number(($event.target as HTMLInputElement).value))"
          />
          <button type="button" class="qty__btn" @click="inc(idx)">
            <Plus :size="16" />
          </button>
        </div>
        <div class="row__amount num">{{ (row.unit_price * row.quantity).toLocaleString() }}원</div>
        <button type="button" class="row__del" aria-label="삭제" @click="remove(idx)">
          <Trash2 :size="18" />
        </button>
      </div>
    </div>

    <footer v-if="modelValue.length > 0" class="cart__foot">
      <span class="cart__foot-label">합계</span>
      <span class="num cart__total">{{ total.toLocaleString() }}원</span>
    </footer>
  </div>

  <ItemPickerModal
    :open="pickerOpen"
    :selected-ids="selectedIds"
    @close="pickerOpen = false"
    @pick="addFromItem"
  />
</template>

<style scoped>
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cart {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cart__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart__title {
  margin: 0;
  font: var(--font-title-3);
  color: var(--color-text-strong);
}
.cart__count {
  font: var(--font-body-3);
  color: var(--color-text-tert);
}
.cart__empty {
  padding: 40px 24px;
  text-align: center;
  font: var(--font-body-2);
  font-size: 15px;
  color: var(--color-text-tert);
  border: 1.5px dashed var(--color-line);
  border-radius: 14px;
  background: var(--color-bg-page);
}
.cart__empty strong {
  color: var(--color-primary);
  font-weight: 700;
}
.cart__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 1.5fr 1fr auto auto 36px;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: #fff;
}
.row__name,
.row__price {
  height: 44px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  padding: 0 10px;
  font: var(--font-body-2);
  font-size: 15px;
  color: var(--color-text-strong);
  outline: none;
  width: 100%;
  min-width: 0;
}
.row__name:focus,
.row__price:focus {
  border-color: var(--color-primary);
  background: #fff;
}
.row__price {
  text-align: right;
}
.qty {
  display: inline-flex;
  align-items: center;
  height: 40px;
  border-radius: 10px;
  background: var(--color-bg-hover);
  padding: 0 4px;
}
.qty__btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--color-text-sub);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.qty__btn:hover:not(:disabled) {
  background: #fff;
  color: var(--color-text-strong);
}
.qty__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty__num {
  width: 40px;
  height: 32px;
  border: none;
  background: transparent;
  text-align: center;
  font: var(--font-body-2);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-strong);
  outline: none;
}
.row__amount {
  text-align: right;
  font: var(--font-body-2);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-strong);
  white-space: nowrap;
  padding: 0 4px;
}
.row__del {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--color-text-tert);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.row__del:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.cart__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 4px 4px;
  border-top: 1px solid var(--color-line-soft);
  margin-top: 4px;
}
.cart__foot-label {
  font: var(--font-body-2);
  font-size: 16px;
  color: var(--color-text-sub);
}
.cart__total {
  font: var(--font-title-2);
  color: var(--color-text-strong);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr 1fr auto;
    grid-template-rows: auto auto;
  }
  .row__name {
    grid-column: 1 / 3;
  }
  .row__price {
    grid-column: 1;
    grid-row: 2;
  }
  .qty {
    grid-column: 2;
    grid-row: 2;
  }
  .row__amount {
    grid-column: 3;
    grid-row: 1 / 3;
    align-self: center;
  }
  .row__del {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }
}
</style>
