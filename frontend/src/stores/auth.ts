import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { getToken, setToken } from '@/api/client'

const ADMIN_KEY = 'marigold.admin'

interface Admin {
  id: number
  loginId: string
  name: string | null
}

function loadAdmin(): Admin | null {
  const raw = localStorage.getItem(ADMIN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Admin
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const admin = ref<Admin | null>(loadAdmin())
  const token = ref<string | null>(getToken())

  async function login(loginId: string, password: string) {
    const res = await authApi.login(loginId, password)
    setToken(res.token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin))
    admin.value = res.admin
    token.value = res.token
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      setToken(null)
      localStorage.removeItem(ADMIN_KEY)
      admin.value = null
      token.value = null
    }
  }

  function isAuthed() {
    return !!token.value
  }

  return { admin, token, login, logout, isAuthed }
})
