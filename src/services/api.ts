import type { Category, Certificate, FaqItem, GalleryItem, Package, SalonProfile, Schedule } from '../types'

const API_BASE = '/api'
const TOKEN_KEY = 'desy_salon_admin_jwt'

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  if (!response.ok) {
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
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    price: Number(b.price),
    priceMax: b.price_max ? Number(b.price_max) : undefined,
    originalPrice: b.original_price ? Number(b.original_price) : undefined,
    badge: b.badge || undefined,
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
    original_price: f.originalPrice || null,
    badge: f.badge || null,
    image: f.image,
    description: f.description,
    features: f.features || [],
  }
}

function toFrontendSchedule(b: any): Schedule {
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
    status: b.status,
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
  return {
    id: b.id,
    title: b.title,
    eventType: b.event_type,
    tag: b.tag,
    imageUrl: b.image_url,
    description: b.description || '',
  }
}

function toBackendGallery(f: Partial<GalleryItem>): any {
  return {
    id: f.id,
    title: f.title,
    event_type: f.eventType,
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
    tiktok: f.tiktok || null,
    tiktok_url: f.tiktokUrl || null,
  }
}

function toFrontendCertificate(b: any): Certificate {
  return {
    id: b.id,
    imageUrl: b.image_url,
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
      return request<Category[]>('/categories')
    },
    async create(category: Category): Promise<Category> {
      return request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      })
    },
    async update(id: string, category: Category): Promise<Category> {
      return request<Category>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(category),
      })
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/categories/${id}`, {
        method: 'DELETE',
      })
    },
  },

  packages: {
    async list(category?: string, search?: string): Promise<Package[]> {
      const params = new URLSearchParams()
      if (category && category !== 'Semua') params.append('category', category)
      if (search) params.append('search', search)
      const res = await request<any[]>(`/packages?${params.toString()}`)
      return res.map(toFrontendPackage)
    },
    async create(pkg: Package): Promise<Package> {
      const payload = toBackendPackage(pkg)
      const res = await request<any>('/packages', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return toFrontendPackage(res)
    },
    async update(id: string, pkg: Package): Promise<Package> {
      const payload = toBackendPackage(pkg)
      const res = await request<any>(`/packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendPackage(res)
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/packages/${id}`, {
        method: 'DELETE',
      })
    },
  },

  schedules: {
    async list(date?: string, status?: string): Promise<Schedule[]> {
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      if (status) params.append('status', status)
      const res = await request<any[]>(`/schedules?${params.toString()}`)
      return res.map(toFrontendSchedule)
    },
    async checkAvailability(date: string, session: string, time?: string) {
      const params = new URLSearchParams({ date, session })
      if (time) params.append('time', time)
      return request<{ available: boolean; collides: boolean }>(`/schedules/check?${params.toString()}`)
    },
    async create(schedule: Schedule, force = false): Promise<Schedule> {
      const payload = { ...toBackendSchedule(schedule), force }
      const res = await request<any>('/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return toFrontendSchedule(res)
    },
    async updateStatus(id: string, status: Schedule['status']): Promise<Schedule> {
      const res = await request<any>(`/schedules/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return toFrontendSchedule(res)
    },
    async update(id: string, schedule: Schedule): Promise<Schedule> {
      const payload = toBackendSchedule(schedule)
      const res = await request<any>(`/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendSchedule(res)
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/schedules/${id}`, {
        method: 'DELETE',
      })
    },
  },

  gallery: {
    async list(eventType?: string): Promise<GalleryItem[]> {
      const params = new URLSearchParams()
      if (eventType && eventType !== 'Semua') params.append('event_type', eventType)
      const res = await request<any[]>(`/gallery?${params.toString()}`)
      return res.map(toFrontendGallery)
    },
    async uploadImage(file: File): Promise<{ url: string; path: string }> {
      const formData = new FormData()
      formData.append('image', file)
      return request<{ url: string; path: string }>('/gallery/upload', {
        method: 'POST',
        body: formData,
      })
    },
    async create(item: GalleryItem): Promise<GalleryItem> {
      const payload = toBackendGallery(item)
      const res = await request<any>('/gallery', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return toFrontendGallery(res)
    },
    async update(id: string, item: GalleryItem): Promise<GalleryItem> {
      const payload = toBackendGallery(item)
      const res = await request<any>(`/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendGallery(res)
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/gallery/${id}`, {
        method: 'DELETE',
      })
    },
  },

  profile: {
    async get(): Promise<SalonProfile> {
      const res = await request<any>('/profile')
      return toFrontendProfile(res)
    },
    async update(profile: SalonProfile): Promise<SalonProfile> {
      const payload = toBackendProfile(profile)
      const res = await request<any>('/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendProfile(res)
    },
  },

  certificates: {
    async list(): Promise<Certificate[]> {
      const res = await request<any[]>('/certificates')
      return res.map(toFrontendCertificate)
    },
    async create(cert: Certificate): Promise<Certificate> {
      const payload = toBackendCertificate(cert)
      const res = await request<any>('/certificates', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return toFrontendCertificate(res)
    },
    async update(id: string, cert: Certificate): Promise<Certificate> {
      const payload = toBackendCertificate(cert)
      const res = await request<any>(`/certificates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendCertificate(res)
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/certificates/${id}`, {
        method: 'DELETE',
      })
    },
  },

  faqs: {
    async list(category?: string, search?: string): Promise<FaqItem[]> {
      const params = new URLSearchParams()
      if (category && category !== 'Semua') params.append('category', category)
      if (search) params.append('search', search)
      const res = await request<any[]>(`/faqs?${params.toString()}`)
      return res.map(toFrontendFaq)
    },
    async create(faq: FaqItem): Promise<FaqItem> {
      const payload = toBackendFaq(faq)
      const res = await request<any>('/faqs', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return toFrontendFaq(res)
    },
    async update(id: string, faq: FaqItem): Promise<FaqItem> {
      const payload = toBackendFaq(faq)
      const res = await request<any>(`/faqs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return toFrontendFaq(res)
    },
    async delete(id: string): Promise<{ message: string; id: string }> {
      return request<{ message: string; id: string }>(`/faqs/${id}`, {
        method: 'DELETE',
      })
    },
  },

  health: {
    async check() {
      return request<{ status: string; service: string; database: string }>('/health')
    },
  },
}

