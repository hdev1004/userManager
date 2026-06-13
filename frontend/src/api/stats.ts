import { api } from './client'

export interface Summary {
  totals: { members: number; payments: number; total: number }
  today: { count: number; total: number }
}
export interface RankingRow {
  id: number
  name: string
  phone: string | null
  point: number
  visit_count: number
}
export interface SalesRow {
  day: string
  count: number
  total: number
  final: number
  used: number
  earned: number
}
export interface CategoryStatRow {
  id: number
  name: string
  code: string
  total: number
  count: number
}
export interface ItemStatRow {
  item_name: string
  count: number
  quantity: number
  total: number
}

export const statsApi = {
  summary() {
    return api.get<Summary>('/stats/summary').then((r) => r.data)
  },
  ranking(limit = 50) {
    return api.get<RankingRow[]>('/stats/ranking', { params: { limit } }).then((r) => r.data)
  },
  sales(from?: string, to?: string) {
    return api.get<SalesRow[]>('/stats/sales', { params: { from, to } }).then((r) => r.data)
  },
  categories(from?: string, to?: string) {
    return api
      .get<CategoryStatRow[]>('/stats/categories', { params: { from, to } })
      .then((r) => r.data)
  },
  items(limit = 10, from?: string, to?: string) {
    return api
      .get<ItemStatRow[]>('/stats/items', { params: { limit, from, to } })
      .then((r) => r.data)
  },
}
