import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/userManage/api',
  withCredentials: false,
})

const TOKEN_KEY = 'marigold.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const t = getToken()
  if (t) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${t}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      setToken(null)
      if (!location.pathname.startsWith(import.meta.env.BASE_URL + 'login')) {
        location.replace(import.meta.env.BASE_URL + 'login')
      }
    }
    return Promise.reject(err)
  },
)

export function errorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string | string[] } } }
  const msg = anyErr?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string') return msg
  return '요청을 처리하지 못했습니다.'
}
