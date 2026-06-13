import { api } from './client'

export interface Category {
  id: number
  code: string
  name: string
  sort_order: number
}
export interface Item {
  id: number
  category_id: number
  code: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
  category_name?: string
  category_code?: string
}

export const categoriesApi = {
  list() {
    return api.get<Category[]>('/item-categories').then((r) => r.data)
  },
  create(body: { code: string; name: string }) {
    return api.post<Category>('/item-categories', body).then((r) => r.data)
  },
  update(id: number, body: { name?: string }) {
    return api.patch<Category>(`/item-categories/${id}`, body).then((r) => r.data)
  },
  remove(id: number) {
    return api.delete(`/item-categories/${id}`).then(() => undefined)
  },
  reorder(orders: { id: number; sort_order: number }[]) {
    return api
      .patch<Category[]>('/item-categories/reorder', { orders })
      .then((r) => r.data)
  },
}

export const itemsApi = {
  list(categoryId?: number) {
    return api
      .get<Item[]>('/items', { params: categoryId ? { categoryId } : {} })
      .then((r) => r.data)
  },
  search(q: string) {
    return api.get<Item[]>('/items/search', { params: { q } }).then((r) => r.data)
  },
  create(body: { category_id: number; code: string; name: string; price: number }) {
    return api.post<Item>('/items', body).then((r) => r.data)
  },
  update(
    id: number,
    body: {
      category_id?: number
      code?: string
      name?: string
      price?: number
      is_active?: boolean
    },
  ) {
    return api.patch<Item>(`/items/${id}`, body).then((r) => r.data)
  },
  remove(id: number) {
    return api.delete(`/items/${id}`).then(() => undefined)
  },
  reorder(category_id: number, orders: { id: number; sort_order: number }[]) {
    return api
      .patch<Item[]>('/items/reorder', { category_id, orders })
      .then((r) => r.data)
  },
}
