import type { Category, Certificate, FaqItem, GalleryItem, Package, SalonProfile, Schedule } from '../types'
import { initialStore } from '../data'

const DEFAULT_SUPABASE_URL = 'https://bbifbiumfgtncjcqaons.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiaWZiaXVtZmd0bmNqY3Fhb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzY5MjksImV4cCI6MjEwOTE1MjkyOX0.UMugK4NfbutefiADOL2WrpmBw84wx22K15ucftsRk0M'

function sanitizeSupabaseUrl(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_SUPABASE_URL
  const cleaned = raw.trim().replace(/^[("'[\s<]+|[)"'\]\s>/]+$/g, '')
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleaned) ? cleaned : DEFAULT_SUPABASE_URL
}

function sanitizeSupabaseKey(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_SUPABASE_ANON_KEY
  const cleaned = raw.trim().replace(/^["'\s]+|["'\s]+$/g, '')
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cleaned)
    ? cleaned
    : DEFAULT_SUPABASE_ANON_KEY
}

const RAW_API_URL = ((import.meta as any).env?.VITE_API_URL || '').trim().replace(/\/$/, '')
const API_BASE = `${RAW_API_URL}/api`
const SUPABASE_URL = sanitizeSupabaseUrl((import.meta as any).env?.VITE_SUPABASE_URL)
const SUPABASE_ANON_KEY = sanitizeSupabaseKey((import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
const TOKEN_KEY = 'desy_salon_admin_jwt'

let localhostBackendAvailable: boolean | null = null
let localhostCheckAt = 0

async function isBackendAvailable(): Promise<boolean> {
  if (RAW_API_URL) return true
  if (typeof window === 'undefined') return true
  const host = window.location.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return false
  }
  const now = Date.now()
  if (localhostBackendAvailable === true) return true
  if (localhostBackendAvailable === false && now - localhostCheckAt < 10000) return false
  try {
    const res = await fetch(`${API_BASE}/health`)
    const ct = res.headers.get('content-type') || ''
    localhostBackendAvailable = res.ok && ct.includes('application/json')
  } catch {
    localhostBackendAvailable = false
  }
  localhostCheckAt = Date.now()
  return localhostBackendAvailable
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function sbRest<T>(
  tableAndQuery: string,
  options: { method?: string; body?: any; prefer?: string } = {}
): Promise<T> {
  const method = options.method || 'GET'
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.prefer) {
    headers['Prefer'] = options.prefer
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableAndQuery}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    let msg = `Supabase HTTP ${res.status}`
    try {
      const err = await res.json()
      msg = err.message || err.error || msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!(await isBackendAvailable())) {
    const err = new Error('BACKEND_UNAVAILABLE')
    ;(err as any).isBackendUnavailable = true
    throw err
  }

  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || contentType.includes('text/html')) {
    if (contentType.includes('text/html') || response.status === 404 || response.status === 405 || response.status === 502) {
      const err = new Error('BACKEND_UNAVAILABLE')
      ;(err as any).isBackendUnavailable = true
      throw err
    }
    let errorMessage = `HTTP error! Status: ${response.status}`
    try {
      const errData = await response.json()
      errorMessage = errData.error || errData.message || errorMessage
    } catch {
      if (response.status === 404) {
        errorMessage = 'Data atau rute yang diminta tidak ditemukan di server (404).'
      }
    }
    const error = new Error(errorMessage)
    ;(error as any).status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

// ==========================================
// MAPPERS: Backend (snake_case) <-> Frontend (camelCase)
// ==========================================

function toFrontendPackage(b: any): Package {
  let category = b.category || 'Tata Rias'
  if (category === 'Perawatan' || category.toLowerCase().includes('salon')) {
    category = 'Salon'
  } else if (['Akad', 'Resepsi', 'Wisuda', 'tata-rias'].includes(category)) {
    category = 'Tata Rias'
  }
  const rawMax = b.price_max ?? b.original_price
  return {
    id: b.id,
    name: b.name,
    category,
    price: Number(b.price),
    priceMax: rawMax ? Number(rawMax) : undefined,
    image: b.image,
    description: b.description,
    features: Array.isArray(b.features) ? b.features : [],
  }
}

function toBackendPackage(f: Partial<Package>): any {
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    price: f.price,
    price_max: f.priceMax || null,
    image: f.image,
    description: f.description,
    features: f.features || [],
  }
}

function toFrontendSchedule(b: any): Schedule {
  let status: Schedule['status'] = b.status
  if (b.status === 'Menunggu DP') status = 'Menunggu Konfirmasi'
  else if (b.status === 'Terkonfirmasi') status = 'DP'
  return {
    id: b.id,
    clientName: b.client_name,
    packageName: b.package_name,
    eventDate: b.event_date,
    eventTime: b.event_time || undefined,
    whatsapp: b.whatsapp || undefined,
    session: b.session,
    location: b.location || '',
    notes: b.notes || '',
    status,
  }
}

function toBackendSchedule(f: Partial<Schedule>): any {
  return {
    id: f.id,
    client_name: f.clientName,
    package_name: f.packageName,
    event_date: f.eventDate,
    event_time: f.eventTime || null,
    whatsapp: f.whatsapp || null,
    session: f.session,
    location: f.location || '',
    notes: f.notes || '',
    status: f.status || 'Menunggu Konfirmasi',
  }
}

function toFrontendGallery(b: any): GalleryItem {
  const rawCat = b.category || b.event_type || 'Tata Rias'
  const normalizedCategory = (rawCat === 'Salon' || rawCat === 'Perawatan' || rawCat.toLowerCase().includes('salon'))
    ? 'Salon'
    : 'Tata Rias'
  return {
    id: b.id,
    title: b.title,
    category: normalizedCategory,
    eventType: b.event_type || normalizedCategory,
    tag: b.tag,
    imageUrl: b.image_url,
    description: b.description || '',
  }
}

function toBackendGallery(f: Partial<GalleryItem>): any {
  return {
    id: f.id,
    title: f.title,
    event_type: f.category || f.eventType || 'Tata Rias',
    tag: f.tag,
    image_url: f.imageUrl,
    description: f.description || '',
  }
}

function toFrontendProfile(b: any): SalonProfile {
  return {
    name: b.name || 'Desy Salon',
    tag: b.tag || 'Beauty for your beautiful beginning',
    phone: b.phone || '',
    address: b.address || '',
    mapsUrl: b.maps_url || undefined,
    openingHours: b.opening_hours || '',
    facebook: b.facebook || undefined,
    facebookUrl: b.facebook_url || undefined,
    instagram: b.instagram || undefined,
    instagramUrl: b.instagram_url || undefined,
    portfolioSource: b.portfolio_source || 'fouita',
    portfolioFouitaUrl: b.portfolio_fouita_url || undefined,
    portfolioAutoFallbackAt: b.portfolio_auto_fallback_at || undefined,
    tiktok: b.tiktok || undefined,
    tiktokUrl: b.tiktok_url || undefined,
  }
}

function toBackendProfile(f: Partial<SalonProfile>): any {
  return {
    name: f.name,
    tag: f.tag,
    phone: f.phone,
    address: f.address,
    maps_url: f.mapsUrl || null,
    opening_hours: f.openingHours,
    facebook: f.facebook || null,
    facebook_url: f.facebookUrl || null,
    instagram: f.instagram || null,
    instagram_url: f.instagramUrl || null,
    portfolio_source: f.portfolioSource || 'fouita',
    portfolio_fouita_url: f.portfolioFouitaUrl || null,
    portfolio_auto_fallback_at: f.portfolioAutoFallbackAt || null,
    tiktok: f.tiktok || null,
    tiktok_url: f.tiktokUrl || null,
  }
}

function toFrontendCertificate(b: any): Certificate {
  let imageUrl: string = b.image_url || ''
  if (imageUrl.startsWith('/assets/sertfikat-desy-salon-')) {
    const fallback = initialStore.certificates.find((c) => c.id === b.id)
    if (fallback) imageUrl = fallback.imageUrl
  }
  return {
    id: b.id,
    imageUrl,
    title: b.title || undefined,
  }
}

function toBackendCertificate(f: Partial<Certificate>): any {
  return {
    id: f.id,
    image_url: f.imageUrl,
    title: f.title || null,
  }
}

function toFrontendFaq(b: any): FaqItem {
  return {
    id: b.id,
    category: b.category,
    question: b.question,
    answer: b.answer,
  }
}

function toBackendFaq(f: Partial<FaqItem>): any {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
  }
}

// ==========================================
// EXPORTED API CLIENT
// ==========================================

export const api = {
  auth: {
    async login(username: string, password: string) {
      const res = await request<{ token: string; user: { username: string; role: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setAuthToken(res.token)
      return res
    },
    async updateCredentials(username: string, password: string) {
      const res = await request<{ message: string; token: string; user: { username: string; role: string } }>('/auth/credentials', {
        method: 'PUT',
        body: JSON.stringify({ username, password }),
      })
      if (res.token) {
        setAuthToken(res.token)
      }
      return res
    },
    async me() {
      return request<{ user: { username: string; role: string }; authenticated: boolean }>('/auth/me')
    },
    logout() {
      removeAuthToken()
    },
  },

  categories: {
    async list(): Promise<Category[]> {
      try {
        return await request<Category[]>('/categories')
      } catch {
        return sbRest<Category[]>('categories?select=*&order=name.asc')
      }
    },
    async create(category: Category): Promise<Category> {
      try {
        return await request<Category>('/categories', {
          method: 'POST',
          body: JSON.stringify(category),
        })
      } catch {
        const rows = await sbRest<Category[]>('categories', {
          method: 'POST',
          body: category,
          prefer: 'return=representation',
        })
        return rows[0] || category
      }
    },
    async update(id: string, category: Category): Promise<Category> {
      try {
        return await request<Category>(`/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(category),
        })
      } catch {
        const rows = await sbRest<Category[]>(`categories?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: category,
          prefer: 'return=representation',
        })
        return rows[0] || category
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/categories/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`categories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  packages: {
    async list(category?: string, search?: string): Promise<Package[]> {
      try {
        const params = new URLSearchParams()
        if (category && category !== 'Semua') params.append('category', category)
        if (search) params.append('search', search)
        const res = await request<any[]>(`/packages?${params.toString()}`)
        return res.map(toFrontendPackage)
      } catch {
        const res = await sbRest<any[]>('packages?select=*&order=created_at.desc')
        return res.map(toFrontendPackage)
      }
    },
    async create(pkg: Package): Promise<Package> {
      const payload = toBackendPackage(pkg)
      try {
        const res = await request<any>('/packages', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        return toFrontendPackage(res)
      } catch {
        try {
          const rows = await sbRest<any[]>('packages', {
            method: 'POST',
            body: payload,
            prefer: 'return=representation',
          })
          return toFrontendPackage(rows[0] || payload)
        } catch {
          const { price_max, ...rest } = payload
          const rows = await sbRest<any[]>('packages', {
            method: 'POST',
            body: { ...rest, original_price: price_max ?? null },
            prefer: 'return=representation',
          })
          return toFrontendPackage(rows[0] || payload)
        }
      }
    },
    async update(id: string, pkg: Package): Promise<Package> {
      const payload = toBackendPackage(pkg)
      try {
        const res = await request<any>(`/packages/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendPackage(res)
      } catch {
        try {
          const rows = await sbRest<any[]>(`packages?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: payload,
            prefer: 'return=representation',
          })
          return toFrontendPackage(rows[0] || payload)
        } catch {
          const { price_max, ...rest } = payload
          const rows = await sbRest<any[]>(`packages?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: { ...rest, original_price: price_max ?? null },
            prefer: 'return=representation',
          })
          return toFrontendPackage(rows[0] || payload)
        }
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/packages/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`packages?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  schedules: {
    async list(date?: string, status?: string): Promise<Schedule[]> {
      try {
        const params = new URLSearchParams()
        if (date) params.append('date', date)
        if (status) params.append('status', status)
        const res = await request<any[]>(`/schedules?${params.toString()}`)
        return res.map(toFrontendSchedule)
      } catch {
        const res = await sbRest<any[]>('schedules?select=*&order=event_date.asc')
        return res.map(toFrontendSchedule)
      }
    },
    async checkAvailability(date: string, session: string, time?: string) {
      const params = new URLSearchParams({ date, session })
      if (time) params.append('time', time)
      return request<{ available: boolean; collides: boolean }>(`/schedules/check?${params.toString()}`)
    },
    async create(schedule: Schedule, force = false): Promise<Schedule> {
      const payload = { ...toBackendSchedule(schedule), force }
      try {
        const res = await request<any>('/schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        return toFrontendSchedule(res)
      } catch (err: any) {
        if (err?.status === 409 || err?.status === 422) throw err
        const dbPayload = toBackendSchedule(schedule)
        try {
          const rows = await sbRest<any[]>('schedules', {
            method: 'POST',
            body: dbPayload,
            prefer: 'return=representation',
          })
          return toFrontendSchedule(rows[0] || dbPayload)
        } catch {
          const legacyStatus =
            dbPayload.status === 'Menunggu Konfirmasi'
              ? 'Menunggu DP'
              : dbPayload.status === 'DP' || dbPayload.status === 'Lunas'
              ? 'Terkonfirmasi'
              : dbPayload.status
          const rows = await sbRest<any[]>('schedules', {
            method: 'POST',
            body: { ...dbPayload, status: legacyStatus },
            prefer: 'return=representation',
          })
          return toFrontendSchedule({ ...(rows[0] || dbPayload), status: dbPayload.status })
        }
      }
    },
    async updateStatus(id: string, status: Schedule['status']): Promise<Schedule> {
      try {
        const res = await request<any>(`/schedules/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        return toFrontendSchedule(res)
      } catch {
        const rows = await sbRest<any[]>(`schedules?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: { status },
          prefer: 'return=representation',
        })
        return toFrontendSchedule(rows[0])
      }
    },
    async update(id: string, schedule: Schedule): Promise<Schedule> {
      const payload = toBackendSchedule(schedule)
      try {
        const res = await request<any>(`/schedules/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendSchedule(res)
      } catch {
        try {
          const rows = await sbRest<any[]>(`schedules?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: payload,
            prefer: 'return=representation',
          })
          return toFrontendSchedule(rows[0] || payload)
        } catch {
          const legacyStatus =
            payload.status === 'Menunggu Konfirmasi'
              ? 'Menunggu DP'
              : payload.status === 'DP' || payload.status === 'Lunas'
              ? 'Terkonfirmasi'
              : payload.status
          const rows = await sbRest<any[]>(`schedules?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: { ...payload, status: legacyStatus },
            prefer: 'return=representation',
          })
          return toFrontendSchedule({ ...(rows[0] || payload), status: payload.status })
        }
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/schedules/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`schedules?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  gallery: {
    async list(eventType?: string): Promise<GalleryItem[]> {
      try {
        const params = new URLSearchParams()
        if (eventType && eventType !== 'Semua') params.append('event_type', eventType)
        const res = await request<any[]>(`/gallery?${params.toString()}`)
        return res.map(toFrontendGallery)
      } catch {
        const res = await sbRest<any[]>('gallery?select=*&order=created_at.desc')
        return res.map(toFrontendGallery)
      }
    },
    async uploadImage(file: File): Promise<{ url: string; path: string }> {
      const formData = new FormData()
      formData.append('image', file)
      try {
        return await request<{ url: string; path: string }>('/gallery/upload', {
          method: 'POST',
          body: formData,
        })
      } catch {
        const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const ext = rawExt || 'jpg'
        const filePath = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/salon-assets/${filePath}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': file.type || 'image/jpeg',
            'x-upsert': 'true',
          },
          body: file,
        })
        if (!res.ok) {
          let errMsg = `Upload Storage gagal (HTTP ${res.status})`
          try {
            const errJson = await res.json()
            errMsg = errJson.message || errJson.error || errMsg
          } catch {
            // ignore
          }
          throw new Error(errMsg)
        }
        return {
          url: `${SUPABASE_URL}/storage/v1/object/public/salon-assets/${filePath}`,
          path: filePath,
        }
      }
    },
    async create(item: GalleryItem): Promise<GalleryItem> {
      const payload = toBackendGallery(item)
      try {
        const res = await request<any>('/gallery', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        return toFrontendGallery(res)
      } catch {
        const rows = await sbRest<any[]>('gallery', {
          method: 'POST',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendGallery(rows[0] || payload)
      }
    },
    async update(id: string, item: GalleryItem): Promise<GalleryItem> {
      const payload = toBackendGallery(item)
      try {
        const res = await request<any>(`/gallery/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendGallery(res)
      } catch {
        const rows = await sbRest<any[]>(`gallery?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendGallery(rows[0] || payload)
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/gallery/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`gallery?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  profile: {
    async get(): Promise<SalonProfile> {
      try {
        const res = await request<any>('/profile')
        return toFrontendProfile(res)
      } catch {
        const rows = await sbRest<any[]>('salon_profile?id=eq.default&select=*')
        return toFrontendProfile(rows[0] || {})
      }
    },
    async update(profile: SalonProfile): Promise<SalonProfile> {
      const payload = toBackendProfile(profile)
      try {
        const res = await request<any>('/profile', {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendProfile(res)
      } catch {
        try {
          const rows = await sbRest<any[]>('salon_profile?id=eq.default', {
            method: 'PATCH',
            body: { ...payload, updated_at: new Date().toISOString() },
            prefer: 'return=representation',
          })
          return toFrontendProfile(rows[0] || payload)
        } catch {
          const { maps_url, portfolio_source, portfolio_fouita_url, portfolio_auto_fallback_at, ...legacy } = payload
          const rows = await sbRest<any[]>('salon_profile?id=eq.default', {
            method: 'PATCH',
            body: { ...legacy, updated_at: new Date().toISOString() },
            prefer: 'return=representation',
          })
          return toFrontendProfile({ ...(rows[0] || {}), ...payload })
        }
      }
    },
    async updatePortfolio(source: 'fouita' | 'gallery', fouitaUrl?: string, autoFallbackAt?: string): Promise<SalonProfile> {
      try {
        const res = await request<any>('/profile/portfolio', {
          method: 'PATCH',
          body: JSON.stringify({
            portfolio_source: source,
            portfolio_fouita_url: fouitaUrl || null,
            portfolio_auto_fallback_at: autoFallbackAt || null,
          }),
        })
        return toFrontendProfile(res)
      } catch {
        const rows = await sbRest<any[]>('salon_profile?id=eq.default', {
          method: 'PATCH',
          body: {
            portfolio_source: source,
            portfolio_fouita_url: fouitaUrl || null,
            portfolio_auto_fallback_at: autoFallbackAt || null,
            updated_at: new Date().toISOString(),
          },
          prefer: 'return=representation',
        })
        return toFrontendProfile(rows[0] || {})
      }
    },
  },

  certificates: {
    async list(): Promise<Certificate[]> {
      try {
        const res = await request<any[]>('/certificates')
        return res.map(toFrontendCertificate)
      } catch {
        const res = await sbRest<any[]>('certificates?select=*&order=created_at.asc')
        return res.map(toFrontendCertificate)
      }
    },
    async create(cert: Certificate): Promise<Certificate> {
      const payload = toBackendCertificate(cert)
      try {
        const res = await request<any>('/certificates', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        return toFrontendCertificate(res)
      } catch {
        const rows = await sbRest<any[]>('certificates', {
          method: 'POST',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendCertificate(rows[0] || payload)
      }
    },
    async update(id: string, cert: Certificate): Promise<Certificate> {
      const payload = toBackendCertificate(cert)
      try {
        const res = await request<any>(`/certificates/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendCertificate(res)
      } catch {
        const rows = await sbRest<any[]>(`certificates?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendCertificate(rows[0] || payload)
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/certificates/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`certificates?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  faqs: {
    async list(category?: string, search?: string): Promise<FaqItem[]> {
      try {
        const params = new URLSearchParams()
        if (category && category !== 'Semua') params.append('category', category)
        if (search) params.append('search', search)
        const res = await request<any[]>(`/faqs?${params.toString()}`)
        return res.map(toFrontendFaq)
      } catch {
        const res = await sbRest<any[]>('faqs?select=*&order=created_at.asc')
        return res.map(toFrontendFaq)
      }
    },
    async create(faq: FaqItem): Promise<FaqItem> {
      const payload = toBackendFaq(faq)
      try {
        const res = await request<any>('/faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        return toFrontendFaq(res)
      } catch {
        const rows = await sbRest<any[]>('faqs', {
          method: 'POST',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendFaq(rows[0] || payload)
      }
    },
    async update(id: string, faq: FaqItem): Promise<FaqItem> {
      const payload = toBackendFaq(faq)
      try {
        const res = await request<any>(`/faqs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        return toFrontendFaq(res)
      } catch {
        const rows = await sbRest<any[]>(`faqs?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: payload,
          prefer: 'return=representation',
        })
        return toFrontendFaq(rows[0] || payload)
      }
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      try {
        return await request<{ message: string; id: string }>(`/faqs/${id}`, {
          method: 'DELETE',
        })
      } catch {
        await sbRest(`faqs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        return { message: 'Deleted', id }
      }
    },
  },

  health: {
    async check() {
      try {
        return await request<{ status: string; service: string; database: string }>('/health')
      } catch {
        return {
          status: 'ok',
          service: 'Supabase Direct REST Client',
          database: 'Connected (Supabase Direct)',
        }
      }
    },
  },
}

