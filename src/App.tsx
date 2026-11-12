import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle, ArrowRight, Award, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Clock3,
  Edit3, Facebook, Filter, Heart, HelpCircle, Home, Image, Instagram, LayoutDashboard, LogOut, MapPin, Menu, MessageCircle,
  Music2, PackageCheck, Plus, Search, Sparkles, Trash2, TrendingUp, User, X,
} from 'lucide-react'
import brandLogo from './assets/logo-desyana-v2.png'
import { initialStore } from './data'
import { api } from './services/api'
import type { Category, Certificate, FaqItem, GalleryItem, Package, SalonStore, Schedule } from './types'

const STORE_KEY = 'desy-salon-store-v1'
const legacyAddresses = [
  'Jl. Melati Indah No. 18, Yogyakarta',
  'Jl. Desa Pekuncen No.15, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
  'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
]
const legacyProfile = {
  phone: '6281234567890',
  openingHours: 'Senin–Sabtu, 09.00–18.00 WIB',
}
const legacyFacebookUrls = [
  'https://www.facebook.com/desyana',
  'https://facebook.com/desyana',
  'https://www.facebook.com/desyana/',
  'https://facebook.com/desyana/',
]
const scheduleStatuses = ['Menunggu Konfirmasi', 'DP', 'Lunas', 'Selesai'] as const
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const
const publicRoutes = ['/', '/paket', '/portfolio', '/sertifikat'] as const
type PublicRoute = typeof publicRoutes[number] | '404'
type EditorKind = 'package' | 'schedule' | 'gallery' | 'category' | 'certificate' | 'faq'
type AdminTab = 'Katalog' | 'Kategori' | 'Jadwal' | 'Portfolio' | 'Sertifikat' | 'FAQ' | 'Akun'

function readStore(): SalonStore {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Omit<SalonStore, 'schedules'>> & {
        users?: unknown
        schedules?: Array<Omit<Schedule, 'status'> & { status: Schedule['status'] | 'Selesai' }>
      }
      delete parsed.users
      const profile = { ...initialStore.profile, ...parsed.profile }
      if (parsed.profile?.phone === legacyProfile.phone) profile.phone = initialStore.profile.phone
      if (!parsed.profile?.address || legacyAddresses.includes(parsed.profile.address)) {
        profile.address = initialStore.profile.address
      }
      if (parsed.profile?.openingHours === legacyProfile.openingHours) profile.openingHours = initialStore.profile.openingHours
      if (!profile.facebook) profile.facebook = initialStore.profile.facebook
      if (!profile.facebookUrl || legacyFacebookUrls.includes(profile.facebookUrl)) {
        profile.facebookUrl = initialStore.profile.facebookUrl
      }
      if (!profile.instagram) profile.instagram = initialStore.profile.instagram
      if (!profile.instagramUrl) profile.instagramUrl = initialStore.profile.instagramUrl
      if (
        !parsed.profile?.portfolioFouitaUrl ||
        !profile.portfolioSource ||
        (['elfsight', 'rss', 'curator'] as string[]).includes(String(profile.portfolioSource))
      ) {
        profile.portfolioSource = 'fouita'
      }
      if (
        !profile.portfolioFouitaUrl ||
        profile.portfolioFouitaUrl === 'https://emb.fouita.com/widget/0x57ed64/ftj78d28e'
      ) {
        profile.portfolioFouitaUrl = initialStore.profile.portfolioFouitaUrl
      }
      delete (profile as Record<string, unknown>).portfolioFeedUrl
      delete (profile as Record<string, unknown>).portfolioCuratorUrl
      if (!profile.tiktok) profile.tiktok = initialStore.profile.tiktok
      if (!profile.tiktokUrl) profile.tiktokUrl = initialStore.profile.tiktokUrl
      if (!profile.mapsUrl || profile.mapsUrl === 'https://share.google/25K2BGNsWXDmZ9Q69') {
        profile.mapsUrl = initialStore.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'
      }

      const credentials = { ...initialStore.credentials, ...parsed.credentials }
      if ((parsed.credentials?.username === 'desy' && parsed.credentials.password === 'desy') || (parsed.credentials?.username === 'admin' && parsed.credentials.password === 'admin123')) {
        Object.assign(credentials, initialStore.credentials)
      }
      const categories: Category[] = (parsed.categories && parsed.categories.length === 2 && parsed.categories.every((c) => ['salon', 'tata-rias'].includes(c.id)))
        ? parsed.categories
        : initialStore.categories

      const packages: Package[] = (parsed.packages ?? initialStore.packages).map((pkg) => {
        const init = initialStore.packages.find((p) => p.id === pkg.id)
        let category = pkg.category
        if (['Akad', 'Resepsi', 'Wisuda', 'tata-rias', 'Tata rias'].includes(category)) {
          category = 'Tata Rias'
        } else if (['Perawatan', 'Treatment', 'salon', 'Perawatan Salon'].includes(category)) {
          category = 'Salon'
        } else if (!category) {
          category = init?.category || 'Tata Rias'
        }
        const { originalPrice: _op, badge: _bd, ...cleanedPkg } = pkg as any
        return {
          ...cleanedPkg,
          category,
          priceMax: pkg.priceMax ?? init?.priceMax,
        }
      })
      const schedules: Schedule[] = parsed.schedules?.map((schedule) => {
        let status = schedule.status as string
        if (status === 'Terkonfirmasi') status = 'DP'
        else if (status === 'Menunggu DP') status = 'Menunggu Konfirmasi'
        else if (!['Menunggu Konfirmasi', 'DP', 'Lunas', 'Selesai'].includes(status)) {
          status = 'Menunggu Konfirmasi'
        }
        return {
          ...schedule,
          status: status as Schedule['status'],
        }
      }) ?? [...initialStore.schedules]
      initialStore.schedules.forEach((initS) => {
        if (!schedules.some((s) => s.id === initS.id)) {
          schedules.push(initS)
        }
      })
      const certificates: Certificate[] = (parsed.certificates && parsed.certificates.length > 0)
        ? parsed.certificates
        : [...initialStore.certificates]
      const faqs: FaqItem[] = (parsed.faqs && parsed.faqs.length >= initialStore.faqs.length)
        ? parsed.faqs
        : [...initialStore.faqs]
      const gallery: GalleryItem[] = (parsed.gallery ?? initialStore.gallery).map((item) => ({
        ...item,
        category: (item.category === 'Salon' || item.category === 'Perawatan') ? 'Salon' : 'Tata Rias',
      }))
      return { ...initialStore, ...parsed, categories, packages, certificates, faqs, profile, credentials, schedules, gallery }
    }
  } catch (error) {
    console.warn('Data salon lokal tidak dapat dibaca.', error)
  }
  return initialStore
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getBookingPrice(schedule: Schedule, packages: Package[]): number {
  const name = (schedule.packageName || '').trim().toLowerCase()
  const pkg = packages.find((p) => p.name.trim().toLowerCase() === name) ||
              packages.find((p) => name.includes(p.name.trim().toLowerCase()) || p.name.trim().toLowerCase().includes(name))
  return pkg ? pkg.price : 0
}

function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

function whatsappConsultationLink(phone: string, salonName = 'Desy Salon') {
  const message = [
    `Halo Admin ${salonName}, saya ingin berkonsultasi mengenai layanan dan jadwal salon/tata rias.`,
    ``,
    `Mohon informasi ketersediaan jadwal dan tahap konsultasi selanjutnya. Terima kasih.`,
  ].join('\n')
  return `${whatsappLink(phone)}?text=${encodeURIComponent(message)}`
}

function getLocalIsoDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

interface FeedPhoto {
  id: string
  title: string
  imageUrl: string
  link?: string
  category?: string
  description?: string
}

const DEFAULT_FOUITA_SCRIPT_URL = 'https://wdg.fouita.com/widgets/0x57ed64.js'
const DEFAULT_FOUITA_WIDGET_ID = 'ftj78d28e'
const DEFAULT_FOUITA_DATA_KEY = 'Instagram Feed '
const FOUITA_HEALTH_CACHE_KEY = 'desy-fouita-health-v1'
const FOUITA_HEALTH_TTL_MS = 10 * 60 * 1000
const loadedFouitaScripts = new Set<string>()

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim())
}

function parseFouitaConfig(raw: string): {
  mode: 'script' | 'iframe'
  url: string
  widgetId: string
  dataKey: string
} {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      mode: 'script',
      url: '',
      widgetId: DEFAULT_FOUITA_WIDGET_ID,
      dataKey: DEFAULT_FOUITA_DATA_KEY,
    }
  }

  const scriptMatch = trimmed.match(/https?:\/\/wdg\.fouita\.com\/widgets\/([a-zA-Z0-9_-]+)\.js(?:\?[^"'\s<]*)?/i)
  const idMatch = trimmed.match(/\bid=["'](ft[a-zA-Z0-9_-]+)["']/i)
  const keyMatch = trimmed.match(/\bdata-key=["']([^"']+)["']/i)
  if (scriptMatch) {
    return {
      mode: 'script',
      url: scriptMatch[0],
      widgetId: idMatch ? idMatch[1] : DEFAULT_FOUITA_WIDGET_ID,
      dataKey: keyMatch ? keyMatch[1] : DEFAULT_FOUITA_DATA_KEY,
    }
  }

  const embMatch = trimmed.match(/https?:\/\/emb\.fouita\.com\/widget\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i)
  if (embMatch) {
    return {
      mode: 'script',
      url: `https://wdg.fouita.com/widgets/${embMatch[1]}.js`,
      widgetId: embMatch[2],
      dataKey: DEFAULT_FOUITA_DATA_KEY,
    }
  }

  return {
    mode: 'iframe',
    url: isSafeHttpUrl(trimmed) ? trimmed : '',
    widgetId: DEFAULT_FOUITA_WIDGET_ID,
    dataKey: DEFAULT_FOUITA_DATA_KEY,
  }
}

function extractFouitaWidgetUid(url: string): string {
  const scriptMatch = url.match(/https?:\/\/wdg\.fouita\.com\/widgets\/([a-zA-Z0-9_-]+)\.js/i)
  if (scriptMatch) return scriptMatch[1]
  const embMatch = url.match(/https?:\/\/emb\.fouita\.com\/widget\/([a-zA-Z0-9_-]+)\//i)
  return embMatch ? embMatch[1] : ''
}

function clearFouitaHealthCache() {
  try {
    sessionStorage.removeItem(FOUITA_HEALTH_CACHE_KEY)
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

async function checkFouitaWidgetAvailable(embedUrl: string): Promise<'active' | 'empty' | 'unknown'> {
  const uid = extractFouitaWidgetUid(embedUrl)
  if (!uid) return 'unknown'

  try {
    const cachedRaw = sessionStorage.getItem(FOUITA_HEALTH_CACHE_KEY)
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { uid?: string; status?: string; checkedAt?: number }
      if (
        cached.uid === uid &&
        cached.status === 'active' &&
        typeof cached.checkedAt === 'number' &&
        Date.now() - cached.checkedAt < FOUITA_HEALTH_TTL_MS
      ) {
        return 'active'
      }
    }
  } catch {
    // Abaikan cache korup
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch('https://api2.fouita.com/v1/q/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
      signal: controller.signal,
    })

    if ([402, 403, 404, 429].includes(res.status)) {
      clearFouitaHealthCache()
      return 'empty'
    }
    if (!res.ok) return 'unknown'

    const rawJson = (await res.json()) as { json?: string; q?: any[] }
    const decoded = rawJson?.json
      ? (JSON.parse(atob(rawJson.json)) as { q?: any[] })
      : rawJson
    const widget = decoded?.q?.[0]

    if (!widget || widget.live === false || widget.active === false || !Array.isArray(widget.data_feed) || widget.data_feed.length === 0) {
      clearFouitaHealthCache()
      return 'empty'
    }

    try {
      sessionStorage.setItem(FOUITA_HEALTH_CACHE_KEY, JSON.stringify({ uid, status: 'active', checkedAt: Date.now() }))
    } catch {
      // Abaikan
    }
    return 'active'
  } catch {
    return 'unknown'
  } finally {
    window.clearTimeout(timeout)
  }
}

function sessionForTime(value: string): Schedule['session'] {
  const hour = Number(value.split(':')[0])
  return hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : 'Sore'
}

function hasScheduleCollision(first: Schedule, second: Schedule) {
  if (first.eventDate !== second.eventDate) return false
  if (first.session === 'Full Day' || second.session === 'Full Day') return true
  if (first.eventTime && second.eventTime) {
    const [h1, m1] = first.eventTime.split(':').map(Number)
    const [h2, m2] = second.eventTime.split(':').map(Number)
    const min1 = (h1 || 0) * 60 + (m1 || 0)
    const min2 = (h2 || 0) * 60 + (m2 || 0)
    // Jeda 2 jam (120 menit): bentrok jika selisih waktu < 120 menit
    return Math.abs(min1 - min2) < 120
  }
  return first.session === second.session
}

function findScheduleCollision(
  candidate: { eventDate: string; eventTime?: string; session?: Schedule['session'] },
  schedules: Schedule[],
  excludeId?: string
): Schedule | undefined {
  const candidateSession = candidate.session || (candidate.eventTime ? sessionForTime(candidate.eventTime) : 'Full Day')
  return schedules.find((s) => {
    // Jadwal 'Menunggu Konfirmasi' belum mengunci slot, jadi tidak dianggap bentrok untuk booking baru
    if (s.status === 'Menunggu Konfirmasi') return false
    if (excludeId && s.id === excludeId) return false
    if (s.eventDate !== candidate.eventDate) return false
    if (s.session === 'Full Day' || candidateSession === 'Full Day') return true
    if (s.eventTime && candidate.eventTime) {
      const [ch, cm] = candidate.eventTime.split(':').map(Number)
      const [sh, sm] = s.eventTime.split(':').map(Number)
      const cMinutes = (ch || 0) * 60 + (cm || 0)
      const sMinutes = (sh || 0) * 60 + (sm || 0)
      // Jeda 2 jam (120 menit): bentrok jika selisih waktu < 120 menit
      return Math.abs(cMinutes - sMinutes) < 120
    }
    return s.session === candidateSession
  })
}

function isHourUnavailable(
  hour: string,
  date: string,
  schedules: Schedule[],
  excludeId?: string
): boolean {
  if (!date) return false
  // Hanya jadwal yang SUDAH DP atau Lunas (status !== 'Menunggu Konfirmasi') yang mengunci jam
  const schedulesOnDate = schedules.filter(
    (s) => s.status !== 'Menunggu Konfirmasi' && s.eventDate === date && (!excludeId || s.id !== excludeId)
  )
  if (schedulesOnDate.length === 0) return false

  // Jika ada booking Full Day di tanggal tersebut
  if (schedulesOnDate.some((s) => s.session === 'Full Day')) return true

  const hourNum = Number(hour)
  const candidateMinutes = hourNum * 60

  return schedulesOnDate.some((s) => {
    if (s.eventTime) {
      const [sh, sm] = s.eventTime.split(':').map(Number)
      const sMinutes = (sh || 0) * 60 + (sm || 0)
      // Jeda 2 jam (120 menit): jam ini tidak tersedia jika selisih waktu < 120 menit
      return Math.abs(candidateMinutes - sMinutes) < 120
    }
    const session = sessionForTime(`${hour}:00`)
    return !s.eventTime && s.session === session
  })
}

function getFirstAvailableTime(
  date: string,
  schedules: Schedule[],
  preferredTime = '08:00',
  excludeId?: string
): string {
  const [prefH, prefM] = preferredTime.split(':')
  if (BOOKING_HOURS.includes(prefH as any) && !isHourUnavailable(prefH, date, schedules, excludeId)) {
    return `${prefH}:${prefH === '16' ? '00' : (prefM || '00')}`
  }
  for (const h of BOOKING_HOURS) {
    if (!isHourUnavailable(h, date, schedules, excludeId)) {
      return `${h}:00`
    }
  }
  return '08:00'
}

async function imageFileToDataUrl(file: File) {
  const isSupportedType = ['image/png', 'image/jpeg'].includes(file.type)
  const hasSupportedExtension = /\.(png|jpe?g)$/i.test(file.name)
  if (!isSupportedType && !hasSupportedExtension) throw new Error('Pilih gambar berformat PNG, JPG, atau JPEG.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran file maksimal 15 MB.')

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('File tidak dapat dibaca.'))
    reader.onerror = () => reject(new Error('File tidak dapat dibaca.'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('File gambar tidak valid.'))
    element.src = source
  })
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak dapat memproses gambar.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
  if (dataUrl.length > 900_000) throw new Error('File masih terlalu besar setelah diproses. Coba gambar yang lebih kecil.')
  return dataUrl
}

function SectionHeading({ eyebrow, title, description, align = 'center' }: { eyebrow: string; title: string; description?: string; align?: 'left' | 'center' }) {
  return <div className={`mb-9 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-500">{eyebrow}</p>
    <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
    {description && <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
  </div>
}

const ITEMS_PER_PAGE = 6

function App() {
  const [store, setStore] = useState<SalonStore>(readStore)
  const [page, setPage] = useState<'public' | 'login' | 'admin'>(() => window.location.pathname === '/admin' ? 'login' : 'public')
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(() => {
    const path = window.location.pathname
    if (path === '/admin') return '/'
    return publicRoutes.includes(path as any) ? (path as PublicRoute) : '404'
  })
  const [activeTab, setActiveTab] = useState<AdminTab>('Katalog')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [bookingPackage, setBookingPackage] = useState<Package | null>(null)
  const [editor, setEditor] = useState<{ kind: EditorKind; item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem } | null>(null)
  const [viewingCert, setViewingCert] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname
      if (path === '/admin') {
        setPage('login')
      } else if (publicRoutes.includes(path as any)) {
        setPublicRoute(path as PublicRoute)
      } else {
        setPublicRoute('404')
      }
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  // Reset pagination when category or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, search])

  // Sinkronkan data profile (termasuk status portfolio Fouita/Gallery) dari backend jika tersedia
  useEffect(() => {
    let isMounted = true
    api.profile
      .get()
      .then((remote) => {
        if (!isMounted || !remote) return
        setStore((current) => ({
          ...current,
          profile: {
            ...current.profile,
            ...remote,
            portfolioSource: remote.portfolioSource || current.profile.portfolioSource || 'fouita',
            portfolioFouitaUrl: remote.portfolioFouitaUrl || current.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL,
          },
        }))
      })
      .catch(() => {
        // Fallback aman ke localStorage jika backend sedang offline/tanpa jaringan
      })
    return () => {
      isMounted = false
    }
  }, [])

  function navigatePublic(route: PublicRoute) {
    const target = route === '404' ? '/' : route
    if (window.location.pathname !== target) window.history.pushState({}, '', target)
    setPublicRoute(route)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch (error) {
      console.warn('Data salon tidak dapat disimpan ke browser.', error)
      setNotice('Penyimpanan browser penuh. Hapus beberapa gambar atau pilih file yang lebih kecil.')
    }
  }, [store])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const visiblePackages = useMemo(() => store.packages.filter((item) => {
    const matchesCategory = selectedCategory === 'Semua' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const term = search.trim().toLowerCase()
    return matchesCategory && (!term || `${item.name} ${item.description} ${item.category} ${item.features.join(' ')}`.toLowerCase().includes(term))
  }), [store.packages, selectedCategory, search])

  const totalPages = Math.max(1, Math.ceil(visiblePackages.length / ITEMS_PER_PAGE))
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return visiblePackages.slice(start, start + ITEMS_PER_PAGE)
  }, [visiblePackages, currentPage])

  function openEditor(kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) {
    setEditor({ kind, item })
  }

  function saveEntity(event: FormEvent<HTMLFormElement>, kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    const id = item?.id ?? makeId(kind)
    let scheduleCollision: Schedule | undefined

    if (kind === 'package') {
      const name = value('name')
      const price = Number(value('price'))
      const priceMaxVal = value('priceMax')
      const priceMax = priceMaxVal ? Number(priceMaxVal) : undefined
      if (!name || !price || !value('image')) return setNotice('Nama, harga, dan foto wajib diisi.')
      const entity: Package = {
        id, name, category: value('category'), price, priceMax,
        image: value('image'), description: value('description'),
        features: value('features').split('\n').map((feature) => feature.trim()).filter(Boolean),
      }
      setStore((current) => ({ ...current, packages: item ? current.packages.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.packages] }))
    }
    if (kind === 'schedule') {
      const eventTime = value('eventTime') || undefined
      const previousSchedule = item as Schedule | undefined
      const entity: Schedule = {
        id,
        clientName: value('clientName') || previousSchedule?.clientName || '',
        packageName: value('packageName') || previousSchedule?.packageName || '',
        eventDate: value('eventDate') || previousSchedule?.eventDate || '',
        eventTime,
        whatsapp: value('whatsapp') || previousSchedule?.whatsapp || undefined,
        session: eventTime ? sessionForTime(eventTime) : previousSchedule?.session ?? 'Full Day',
        location: value('location'),
        notes: value('notes'),
        status: (value('status') as Schedule['status']) || previousSchedule?.status || 'Menunggu Konfirmasi',
      }
      scheduleCollision = store.schedules.find((entry) => entry.id !== id && hasScheduleCollision(entry, entity))
      setStore((current) => ({ ...current, schedules: item ? current.schedules.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.schedules] }))
    }
    if (kind === 'gallery') {
      const category = value('category') || store.categories[0]?.name || 'Tata Rias'
      const entity: GalleryItem = {
        id,
        title: value('title'),
        category,
        eventType: category,
        tag: value('tag'),
        imageUrl: value('imageUrl'),
        description: value('description'),
      }
      setStore((current) => ({ ...current, gallery: item ? current.gallery.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.gallery] }))
    }
    if (kind === 'certificate') {
      const image = value('image') || value('imageUrl')
      if (!image) return setNotice('Foto sertifikat wajib diisi.')
      const entity: Certificate = {
        id,
        imageUrl: image,
        title: value('title') || undefined,
      }
      setStore((current) => ({
        ...current,
        certificates: item
          ? current.certificates.map((entry) => (entry.id === id ? entity : entry))
          : [entity, ...current.certificates],
      }))
      setNotice(item ? 'Sertifikat berhasil diperbarui.' : 'Sertifikat baru berhasil ditambahkan.')
    }
    if (kind === 'faq') {
      const question = value('question')
      const answer = value('answer')
      const category = value('category') || 'Tata Rias'
      if (!question || !answer) return setNotice('Pertanyaan dan jawaban wajib diisi.')
      const entity: FaqItem = { id, question, answer, category }
      setStore((current) => ({
        ...current,
        faqs: item
          ? current.faqs.map((entry) => (entry.id === id ? entity : entry))
          : [entity, ...current.faqs],
      }))
      setNotice(item ? 'FAQ berhasil diperbarui.' : 'FAQ baru berhasil ditambahkan.')
    }
    if (kind === 'category') {
      const name = value('categoryName')
      if (!name) return setNotice('Nama kategori wajib diisi.')
      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
      const existing = store.categories.find((c) => c.slug === slug && c.id !== id)
      if (existing) return setNotice('Kategori dengan nama serupa sudah ada.')
      const entity: Category = { id, name, slug }
      setStore((current) => ({
        ...current,
        categories: item ? current.categories.map((c) => c.id === id ? entity : c) : [entity, ...current.categories],
      }))
      setNotice(item ? 'Kategori berhasil diperbarui.' : 'Kategori baru berhasil ditambahkan.')
    }

    setEditor(null)
    if (scheduleCollision) setNotice(`Jadwal disimpan, tetapi bentrok dengan ${scheduleCollision.clientName} (${scheduleCollision.session}).`)
    else if (kind !== 'category' && kind !== 'certificate' && kind !== 'faq') setNotice(item ? 'Perubahan berhasil disimpan.' : 'Data baru berhasil ditambahkan.')
  }

  function deleteEntity(collection: 'packages' | 'schedules' | 'gallery' | 'certificates' | 'faqs', id: string) {
    const item = (store[collection] as any[]).find((entry) => entry.id === id)
    if (!item) return
    const labels = { packages: 'paket', schedules: 'jadwal', gallery: 'portofolio', certificates: 'sertifikat', faqs: 'FAQ' }
    const name = 'name' in item ? item.name : 'clientName' in item ? item.clientName : 'question' in item ? item.question : 'title' in item && item.title ? item.title : 'Sertifikat'
    setConfirmation({
      message: `Yakin ingin menghapus ${labels[collection]} "${name}"?`,
      onConfirm: () => {
        setStore((current) => ({ ...current, [collection]: (current[collection] as any[]).filter((entry) => entry.id !== id) }))
        setNotice('Data berhasil dihapus.')
      },
    })
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone') ?? '').replace(/\D/g, '')
    const username = String(form.get('username') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const facebook = String(form.get('facebook') ?? '').trim() || initialStore.profile.facebook
    const facebookUrl = String(form.get('facebookUrl') ?? '').trim() || initialStore.profile.facebookUrl
    const instagram = String(form.get('instagram') ?? '').trim() || '@desyana_77'
    const instagramUrl = String(form.get('instagramUrl') ?? '').trim() || 'https://www.instagram.com/desyana_77/'
    const rawFouitaInput = String(form.get('portfolioFouitaUrl') ?? '').trim()
    const portfolioFouitaUrl = parseFouitaConfig(rawFouitaInput).url
    const tiktok = String(form.get('tiktok') ?? '').trim() || '@desyana.s'
    const tiktokUrl = String(form.get('tiktokUrl') ?? '').trim() || 'https://www.tiktok.com/@desyana.s'
    const mapsUrl = String(form.get('mapsUrl') ?? '').trim() || initialStore.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'

    if (!/^62\d{8,13}$/.test(phone)) return setNotice('Nomor WhatsApp harus berformat 62, contoh 628123456789.')
    if (!username || password.length < 6) return setNotice('Username wajib diisi dan password minimal 6 karakter.')
    if (rawFouitaInput && !portfolioFouitaUrl) {
      return setNotice('Link widget Fouita harus diawali https:// atau http://.')
    }
    const newProfile = {
      ...store.profile,
      phone,
      address: String(form.get('address') ?? '').trim(),
      mapsUrl,
      openingHours: String(form.get('openingHours') ?? '').trim(),
      facebook,
      facebookUrl,
      instagram,
      instagramUrl,
      portfolioFouitaUrl,
      portfolioSource: (portfolioFouitaUrl ? 'fouita' : 'gallery') as 'fouita' | 'gallery',
      portfolioAutoFallbackAt: undefined,
      tiktok,
      tiktokUrl,
    }

    setStore((current) => ({
      ...current,
      profile: newProfile,
      credentials: { username, password },
    }))
    clearFouitaHealthCache()

    // Sinkronkan ke backend jika tersedia
    api.profile.update(newProfile).catch((err) => {
      console.debug('Gagal update profile ke backend:', err)
    })

    setNotice('Pengaturan akun berhasil diperbarui.')
  }

  function savePortfolioConfig(source: 'fouita' | 'gallery', fouitaInput: string) {
    const parsed = parseFouitaConfig(fouitaInput)
    if (source === 'fouita' && !parsed.url) {
      setNotice('Masukkan URL script Fouita yang valid (contoh: https://wdg.fouita.com/widgets/0x57ed64.js) atau kode embed-nya.')
      return
    }
    if (source === 'fouita') {
      clearFouitaHealthCache()
    }
    const finalUrl = parsed.url || store.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL
    setStore((current) => ({
      ...current,
      profile: {
        ...current.profile,
        portfolioSource: source,
        portfolioFouitaUrl: finalUrl,
        portfolioAutoFallbackAt: undefined,
      },
    }))

    // Sinkronkan ke backend database Supabase
    api.profile.updatePortfolio(source, finalUrl).catch((err) => {
      console.debug('Gagal sinkron portfolio ke backend:', err)
    })

    setNotice(
      source === 'fouita'
        ? 'Sumber Portfolio publik diatur ke Fouita Instagram Widget (Otomatis).'
        : 'Sumber Portfolio publik diatur ke Galeri Studio (Foto Manual).'
    )
  }

  function handleAutoFallbackGallery() {
    clearFouitaHealthCache()
    const nowIso = new Date().toISOString()
    setStore((current) => {
      if (current.profile.portfolioSource === 'gallery') return current
      return {
        ...current,
        profile: {
          ...current.profile,
          portfolioSource: 'gallery',
          portfolioAutoFallbackAt: nowIso,
        },
      }
    })

    // Sinkronkan auto fallback ke backend database
    api.profile.updatePortfolio('gallery', store.profile.portfolioFouitaUrl, nowIso).catch((err) => {
      console.debug('Gagal update auto-fallback ke backend:', err)
    })
  }

  function removeCategory(category: Category) {
    if (store.packages.some((item) => item.category === category.name)) return setNotice('Kategori masih dipakai paket. Pindahkan atau hapus paket terkait terlebih dahulu.')
    setConfirmation({
      message: `Yakin ingin menghapus kategori "${category.name}"?`,
      onConfirm: () => {
        setStore((current) => ({ ...current, categories: current.categories.filter((entry) => entry.id !== category.id) }))
        setNotice('Kategori berhasil dihapus.')
      },
    })
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bookingPackage) return
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '').trim()
    const time = String(form.get('time') ?? '').trim()
    const clientName = String(form.get('clientName') ?? '').trim()
    const phone = normalizePhone(String(form.get('phone') ?? ''))
    const location = String(form.get('location') ?? '').trim()
    
    // Validasi semua field wajib diisi
    if (!clientName || !phone || !date || !time || !location) {
      setNotice('Semua bidang (nama, nomor WhatsApp, tanggal, waktu acara, dan lokasi acara) wajib diisi.')
      return
    }
    if (!/^62\d{8,13}$/.test(phone)) {
      setNotice('Nomor WhatsApp harus valid, contoh: 081234567890.')
      return
    }

    // Validasi minimal H-1 (tanggal acara minimal besok)
    const todayStr = getLocalIsoDate(new Date())
    if (date <= todayStr) {
      setNotice('Reservasi wajib dilakukan minimal H-1 (tanggal acara minimal besok).')
      return
    }

    // Validasi Jam Kerja Operasional: 08:00 – 16:00 WIB
    const [hStr, mStr] = time.split(':')
    const timeMinutes = Number(hStr) * 60 + Number(mStr || '0')
    if (timeMinutes < 8 * 60 || timeMinutes > 16 * 60) {
      setNotice('Waktu acara harus dalam jam kerja operasional (08:00 – 16:00 WIB).')
      return
    }

    // Validasi tabrakan jadwal (dengan jeda 2 jam)
    const collision = findScheduleCollision({ eventDate: date, eventTime: time }, store.schedules)
    if (collision) {
      setNotice(`Jadwal tanggal ${formatDate(date)} pukul ${time} WIB berdekatan dengan jadwal lain (butuh jeda minimal 2 jam). Silakan pilih jam lain.`)
      return
    }

    const booking: Schedule = {
      id: makeId('booking'),
      clientName,
      whatsapp: phone,
      packageName: bookingPackage.name,
      eventDate: date,
      eventTime: time,
      session: sessionForTime(time),
      location,
      notes: '',
      status: 'Menunggu Konfirmasi',
    }
    setStore((current) => ({ ...current, schedules: [booking, ...current.schedules] }))
    const message = [
      `Halo Admin ${store.profile.name}, saya ingin melakukan reservasi dan konfirmasi jadwal layanan.`,
      ``,
      `Detail Reservasi:`,
      `- Nama Lengkap: ${clientName}`,
      `- Nomor WhatsApp: +${phone}`,
      `- Paket / Layanan: ${bookingPackage.name}`,
      `- Tanggal: ${formatDate(date)}`,
      `- Waktu: ${time} WIB`,
      `- Lokasi: ${location}`,
      ``,
      `Apakah jadwal pada tanggal dan waktu tersebut tersedia? Mohon informasi ketersediaan dan proses selanjutnya. Terima kasih.`,
    ].join('\n')
    window.open(`${whatsappLink(store.profile.phone)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setBookingPackage(null)
    setNotice('Booking tersimpan dan menunggu konfirmasi melalui WhatsApp.')
  }

  function beginBooking(item: Package) {
    setBookingPackage(item)
  }

  function loginOwner() {
    setPage('admin')
    setNotice('Selamat datang kembali, Desy.')
  }

  function logout() {
    setPage('public')
    setActiveTab('Katalog')
    navigatePublic('/')
  }

  function confirmLogout() {
    setConfirmation({
      message: 'Yakin ingin keluar dari sistem admin?',
      onConfirm: logout,
    })
  }

  if (page === 'login') return <LoginPage
    store={store}
    onOwnerLogin={loginOwner}
  />

  if (page === 'admin') return <>
    <AdminDashboard
      store={store}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpen={openEditor}
      onDelete={deleteEntity}
      onCategoryRemove={removeCategory}
      onSettingsSave={saveSettings}
      onSavePortfolioConfig={savePortfolioConfig}
      onLogout={confirmLogout}
    />
    {editor && <EntityModal editor={editor} store={store} onClose={() => setEditor(null)} onSave={saveEntity} />}
    {confirmation && <ConfirmationModal message={confirmation.message} onCancel={() => setConfirmation(null)} onConfirm={() => { const confirm = confirmation.onConfirm; setConfirmation(null); confirm() }} />}
    {notice && <Toast message={notice} onClose={() => setNotice('')} />}
  </>

  return <div className="min-h-screen bg-white text-slate-900">
    <PublicNavbar
      profileName={store.profile.name}
      activeRoute={publicRoute}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      onNavigate={navigatePublic}
      phone={store.profile.phone}
    />
    <main>
      {publicRoute === '/' && (
        <>
          <section id="beranda" className="hero-wash relative flex min-h-[calc(100vh-80px)] min-h-[calc(100dvh-80px)] items-center overflow-hidden border-b border-rose-100/60 py-16 sm:py-24">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-rose-50/40" />
            <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
              <div className="max-w-[620px] reveal">
                <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-rose-700 shadow-2xs backdrop-blur">
                  <Sparkles size={14} className="shrink-0 text-amber-500" />
                  <span>Membingkai hari paling berhargamu dengan riasan mempesona</span>
                </div>
                <h1 className="font-display text-5xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-[68px]">Hari istimewamu,<br /><span className="italic text-rose-600">secantik ceritamu.</span></h1>
                <p className="mt-6 max-w-lg text-base font-medium leading-7 text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)] sm:text-lg sm:leading-8">Dipercaya sejak tahun 1993 menghadirkan tata rias terbaik. Riasan yang terasa seperti dirimu, dibuat dengan cinta untuk momen yang akan selalu kamu kenang.</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href="/paket" onClick={(event) => { event.preventDefault(); navigatePublic('/paket') }} className="btn-primary !px-5 !py-3 focus-ring">Temukan paket impian <ArrowRight size={17} /></a>
                  <a href="/paket" onClick={(event) => { event.preventDefault(); navigatePublic('/paket') }} className="btn-secondary !px-5 !py-3 bg-white/80 backdrop-blur">Lihat katalog & karya</a>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 hidden rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur sm:block lg:right-[9%]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Heart size={19} fill="currentColor" /></span>
                <div>
                  <p className="text-xs font-bold text-rose-600">Dibuat dengan cinta sejak 1993</p>
                  <p className="text-sm font-semibold text-slate-800">Untuk cerita indahmu</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section Layanan Pernikahan & Salon (Inspirasi Luxury Java Heritage) */}
          <WeddingServicesSection
            phone={store.profile.phone}
            salonName={store.profile.name}
            onNavigate={navigatePublic}
          />

          {/* Section Tanya Jawab / FAQ */}
          <FaqSection faqs={store.faqs} phone={store.profile.phone} salonName={store.profile.name} />
        </>
      )}

      {publicRoute === '/paket' && <section id="paket" className="min-h-[70vh] bg-rose-50/40 px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Pilih yang paling kamu" title="Paket rias penuh cerita" description="Setiap detail kami siapkan dengan sepenuh hati, agar kamu bisa menikmati setiap momen." />
          <div className="mx-auto mb-8 flex w-full max-w-xl items-center gap-2 sm:gap-3">
            {/* Searching di sebelah kiri */}
            <label className="relative block flex-1 min-w-0">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field !h-[42px] !min-h-[42px] rounded-xl !py-2.5 !pl-10 !pr-8 text-sm shadow-2xs"
                placeholder="Cari paket atau layanan..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            {/* Tombol Filter Dropdown di sebelah kanan Searching */}
            <SearchableSelect
              options={['Semua Kategori', ...store.categories.map((category) => category.name)]}
              value={selectedCategory === 'Semua' ? 'Semua Kategori' : selectedCategory}
              onChange={(val) => setSelectedCategory(val === 'Semua Kategori' ? 'Semua' : val)}
              placeholder="Filter Kategori"
              searchPlaceholder="Cari kategori..."
              className="w-[148px] sm:w-48 shrink-0"
              buttonClassName="h-[42px] min-h-[42px] px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            />
          </div>
          
          {paginatedPackages.length ? (
            <>
              {/* Formasi 3 ke samping x 2 ke bawah di layar besar */}
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedPackages.map((item) => (
                  <PackageCard key={item.id} item={item} onBook={() => beginBooking(item)} />
                ))}
              </div>

              {/* Pagination Penomoran Halaman Responsif */}
              {totalPages > 1 && (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-rose-100 pt-6">
                  <p className="text-xs font-medium text-slate-500">
                    Menampilkan <span className="font-semibold text-slate-700">{Math.min(visiblePackages.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> - <span className="font-semibold text-slate-700">{Math.min(visiblePackages.length, currentPage * ITEMS_PER_PAGE)}</span> dari <span className="font-semibold text-slate-700">{visiblePackages.length}</span> paket
                  </p>
                  <nav aria-label="Navigasi halaman katalog" className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1))
                        document.getElementById('paket')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman sebelumnya"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                        onClick={() => {
                          setCurrentPage(pageNum)
                          document.getElementById('paket')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-bold transition ${
                          currentPage === pageNum
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                        document.getElementById('paket')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman berikutnya"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white py-14 text-center">
              <Search className="mx-auto mb-3 text-rose-300" />
              <p className="font-semibold text-slate-700">Paket belum ditemukan</p>
              <p className="mt-1 text-sm text-slate-500">Coba kata kunci atau kategori lainnya.</p>
            </div>
          )}

          <p className="mt-7 text-center text-xs text-slate-500">Setiap paket dapat disesuaikan. Ceritakan kebutuhanmu saat berkonsultasi.</p>
        </div>
      </section>}

      <PortfolioSection
        store={store}
        active={publicRoute === '/portfolio'}
        onAutoFallbackGallery={handleAutoFallbackGallery}
      />

      {publicRoute === '/sertifikat' && (
        <section id="sertifikat" className="min-h-[70vh] bg-rose-50/40 px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Pengalaman"
              title="Sertifikat Resmi Desy Salon"
              description="Dokumen sertifikasi keahlian tata rias pengantin dan kecantikan resmi sejak tahun 1993."
            />
            {store.certificates.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {store.certificates.map((cert) => (
                  <article
                    key={cert.id}
                    onClick={() => setViewingCert(cert.imageUrl)}
                    className="group cursor-pointer aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-md"
                  >
                    <img
                      src={cert.imageUrl}
                      alt={cert.title || 'Sertifikat Desy Salon'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState label="Belum ada sertifikat yang diunggah." />
            )}
          </div>
        </section>
      )}

      {publicRoute === '404' && (
        <NotFoundSection onNavigate={navigatePublic} />
      )}

    </main>
    <PublicFooter store={store} onNavigate={navigatePublic} />
    {bookingPackage && (
      <BookingModal
        item={bookingPackage}
        schedules={store.schedules}
        onClose={() => setBookingPackage(null)}
        onSubmit={submitBooking}
      />
    )}
    {viewingCert && (
      <ModalFrame onClose={() => setViewingCert(null)}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <p className="text-sm font-bold uppercase tracking-widest text-rose-500">Sertifikat Resmi Desy Salon</p>
          <button aria-label="Tutup" onClick={() => setViewingCert(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center max-h-[75vh] overflow-hidden rounded-xl bg-slate-50 p-1">
          <img src={viewingCert} alt="Sertifikat" className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain" />
        </div>
      </ModalFrame>
    )}
    {notice && <Toast message={notice} onClose={() => setNotice('')} />}
  </div>
}

function NotFoundSection({ onNavigate }: { onNavigate: (route: PublicRoute) => void }) {
  return (
    <section className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-20">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-600">
          404 • Halaman Tidak Ditemukan
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Halaman yang kamu cari belum tersedia
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Tautan yang kamu tuju mungkin salah ketik atau telah dipindahkan. Silakan kembali ke beranda atau telusuri katalog layanan kami.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="btn-primary"
          >
            <Home size={16} /> Kembali ke Beranda
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/paket')}
            className="btn-secondary"
          >
            <Sparkles size={16} /> Lihat Katalog Layanan
          </button>
        </div>
      </div>
    </section>
  )
}

function PortfolioSection({
  store,
  active,
  onAutoFallbackGallery,
}: {
  store: SalonStore
  active: boolean
  onAutoFallbackGallery: () => void
}) {
  const fouitaConfig = useMemo(
    () => parseFouitaConfig(store.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL),
    [store.profile.portfolioFouitaUrl]
  )
  const source: 'fouita' | 'gallery' =
    store.profile.portfolioSource === 'gallery' || !fouitaConfig.url ? 'gallery' : 'fouita'
  const [hasActivated, setHasActivated] = useState(active)
  const [fouitaError, setFouitaError] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<FeedPhoto | null>(null)
  const fouitaContainerRef = useRef<HTMLDivElement | null>(null)
  const fallbackCallbackRef = useRef(onAutoFallbackGallery)

  useEffect(() => {
    if (active) setHasActivated(true)
  }, [active])

  useEffect(() => {
    fallbackCallbackRef.current = onAutoFallbackGallery
  }, [onAutoFallbackGallery])

  const igHandle = store.profile.instagram || '@desyana_77'
  const igUrl = store.profile.instagramUrl || 'https://www.instagram.com/desyana_77/'
  const fallbackPhotos: FeedPhoto[] = useMemo(
    () =>
      store.gallery.slice(0, 20).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        category: item.category || item.eventType || 'Tata Rias',
        description: item.description,
      })),
    [store.gallery]
  )

  useEffect(() => {
    setFouitaError(false)
    if (!hasActivated || source !== 'fouita' || !fouitaConfig.url) return

    let cancelled = false
    let domCheckTimer: number | undefined

    const scheduleDomCheck = () => {
      window.clearTimeout(domCheckTimer)
      // Cadangan pemeriksaan DOM: jika 15 detik setelah script termuat widget tetap kosong, alihkan ke Foto Manual
      domCheckTimer = window.setTimeout(() => {
        if (cancelled) return
        const container = fouitaContainerRef.current
        if (container && container.querySelectorAll('.ft-card, .ft-container').length === 0) {
          setFouitaError(true)
          fallbackCallbackRef.current()
        }
      }, 15000)
    }

    checkFouitaWidgetAvailable(fouitaConfig.url).then((status) => {
      if (cancelled) return
      if (status === 'empty') {
        setFouitaError(true)
        fallbackCallbackRef.current()
      }
    })

    if (fouitaConfig.mode !== 'script') return () => { cancelled = true }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-fouita-widget="${fouitaConfig.url}"]`)
    if (!loadedFouitaScripts.has(fouitaConfig.url) && !existingScript) {
      loadedFouitaScripts.add(fouitaConfig.url)
      if (fouitaContainerRef.current) {
        fouitaContainerRef.current.innerHTML = ''
      }

      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = fouitaConfig.url
      script.setAttribute('data-fouita-widget', fouitaConfig.url)
      script.onload = scheduleDomCheck
      script.onerror = () => {
        loadedFouitaScripts.delete(fouitaConfig.url)
        if (!cancelled) {
          setFouitaError(true)
          fallbackCallbackRef.current()
        }
      }
      document.body.appendChild(script)
    } else {
      scheduleDomCheck()
    }

    return () => {
      cancelled = true
      window.clearTimeout(domCheckTimer)
    }
  }, [hasActivated, source, fouitaConfig.mode, fouitaConfig.url, fouitaConfig.widgetId])

  return (
    <section
      id="portfolio"
      hidden={!active}
      className={active ? 'min-h-[70vh] bg-rose-50/40 px-4 py-14 sm:px-8 lg:px-12 lg:py-20' : 'hidden'}
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Karya & Instagram"
          title="Portofolio Desy Salon"
          description="Koleksi riasan pengantin, wisuda, dan momen terbaik dari Instagram resmi Desy Salon."
        />

        <div className="mb-8 flex justify-center">
          <a
            href={igUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-600 shadow-xs transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50"
          >
            <Instagram size={17} />
            <span>Ikuti {igHandle} di Instagram</span>
          </a>
        </div>

        {source === 'fouita' && !fouitaError ? (
          fouitaConfig.mode === 'script' ? (
            <div className="mx-auto min-h-[280px] max-w-7xl">
              <div
                ref={fouitaContainerRef}
                data-key={fouitaConfig.dataKey}
                className="ft"
                id={fouitaConfig.widgetId}
              />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-xs">
              <iframe
                src={fouitaConfig.url}
                title="Instagram Feed Desy Salon"
                className="h-[760px] w-full border-0 sm:h-[960px] lg:h-[1100px]"
                allowFullScreen
                onError={() => {
                  setFouitaError(true)
                  fallbackCallbackRef.current()
                }}
              />
            </div>
          )
        ) : fallbackPhotos.length > 0 ? (
          <>
            {source === 'fouita' && fouitaError && (
              <p className="mb-4 text-center text-xs font-medium text-amber-700">
                Widget Fouita sedang tidak tersedia. Menampilkan foto galeri manual studio.
              </p>
            )}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {fallbackPhotos.map((photo) => (
                <article
                  key={photo.id}
                  onClick={() => setViewingPhoto(photo)}
                  className="group relative aspect-[4/5] sm:aspect-square cursor-pointer overflow-hidden rounded-lg sm:rounded-2xl border border-rose-100/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-md"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-4 sm:p-5">
                    {photo.category && (
                      <span className="mb-1.5 inline-block w-fit rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white">
                        {photo.category}
                      </span>
                    )}
                    <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">{photo.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState label="Foto portofolio akan segera ditambahkan." />
        )}

        <div className="mt-8 flex justify-center">
          <a
            href={igUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !rounded-full !px-7 !py-3.5 shadow-sm transition hover:-translate-y-0.5"
          >
            <Instagram size={18} />
            <span>Lihat Lainnya di Instagram</span>
            <ArrowRight size={17} />
          </a>
        </div>
      </div>

      {viewingPhoto && (
        <ModalFrame onClose={() => setViewingPhoto(null)}>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="font-display text-lg font-bold text-slate-900 truncate">{viewingPhoto.title}</h3>
            <button aria-label="Tutup" onClick={() => setViewingPhoto(null)} className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center max-h-[68vh] overflow-hidden rounded-xl bg-slate-50 p-1">
            <img src={viewingPhoto.imageUrl} alt={viewingPhoto.title} className="max-h-[64vh] w-auto max-w-full rounded-lg object-contain" />
          </div>
          {(viewingPhoto.description || viewingPhoto.link) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {viewingPhoto.description && (
                <p className="text-sm leading-6 text-slate-600">{viewingPhoto.description}</p>
              )}
              {viewingPhoto.link && (
                <a
                  href={viewingPhoto.link}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
                >
                  <Instagram size={14} /> Lihat postingan
                </a>
              )}
            </div>
          )}
        </ModalFrame>
      )}
    </section>
  )
}

function PublicNavbar({ profileName, activeRoute, menuOpen, setMenuOpen, onNavigate, phone }: {
  profileName: string
  activeRoute: PublicRoute
  menuOpen: boolean
  setMenuOpen: (value: boolean) => void
  onNavigate: (route: PublicRoute) => void
  phone: string
}) {
  const links = [
    { name: 'Beranda', href: '/' as PublicRoute, icon: Home },
    { name: 'Katalog', href: '/paket' as PublicRoute, icon: Sparkles },
    { name: 'Portfolio', href: '/portfolio' as PublicRoute, icon: Image },
    { name: 'Sertifikat', href: '/sertifikat' as PublicRoute, icon: Award },
  ]
  return <header className="sticky top-0 z-40 border-b border-rose-100/70 bg-white/85 backdrop-blur-xl">
    <div className="relative mx-auto flex h-20 sm:h-[84px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
      {/* Sisi Kiri: Logo Studio */}
      <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/') }} className="z-10 flex shrink-0 items-center">
        <img src={brandLogo} alt={profileName} className="h-12 sm:h-14 w-auto max-w-[190px] lg:max-w-[270px] object-contain transition-all" />
      </a>

      {/* Tengah: Navigasi Beranda, Katalog, Portfolio & Sertifikat di posisi Center */}
      <nav aria-label="Menu Utama" className="hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center md:gap-5 lg:gap-7">
        {links.map(({ name, href, icon: Icon }) => (
          <a
            key={name}
            href={href}
            onClick={(event) => { event.preventDefault(); onNavigate(href) }}
            aria-current={activeRoute === href ? 'page' : undefined}
            className={`relative inline-flex items-center gap-1.5 py-1 text-sm font-semibold transition ${
              activeRoute === href
                ? 'text-rose-600 after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-rose-500'
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            <Icon size={16} />
            <span>{name}</span>
          </a>
        ))}
      </nav>

      {/* Sisi Kanan: Penyeimbang Navigasi & Tombol Kontak WhatsApp */}
      <div className="z-10 hidden md:flex items-center justify-end">
        <a
          href={whatsappConsultationLink(phone, profileName)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 shadow-xs"
        >
          <MessageCircle size={14} className="text-rose-500" /> Konsultasi
        </a>
      </div>

      {/* Tombol Hamburger Menu Mobile */}
      <button
        aria-label="Buka menu"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 md:hidden"
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>

    {/* Menu Navigasi Mobile Drawer */}
    {menuOpen && (
      <nav className="border-t border-rose-100 bg-white px-5 py-3 md:hidden">
        {links.map(({ name, href, icon: Icon }) => (
          <a
            onClick={(event) => { event.preventDefault(); onNavigate(href) }}
            key={name}
            href={href}
            aria-current={activeRoute === href ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold ${
              activeRoute === href ? 'text-rose-600 font-bold bg-rose-50/60 rounded-lg' : 'text-slate-700'
            }`}
          >
            <Icon size={16} />
            <span>{name}</span>
          </a>
        ))}
        <div className="pt-2">
          <a
            href={whatsappConsultationLink(phone, profileName)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white shadow-xs"
          >
            <MessageCircle size={16} /> Konsultasi via WhatsApp
          </a>
        </div>
      </nav>
    )}
  </header>
}

function PackageCard({ item, onBook }: { item: Package; onBook: () => void }) {
  const isSalon = item.category.toLowerCase().includes('salon') || item.category.toLowerCase().includes('perawatan')
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Gambar Thumbnail Konsisten */}
      <div className="relative h-64 shrink-0 overflow-hidden sm:h-72">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-slate-700 backdrop-blur">
          {item.category}
        </span>
      </div>

      {/* Konten Card dengan Ukuran Konsisten */}
      <div className="flex flex-1 flex-col p-6">
        {/* Judul & Deskripsi dengan Slot Tinggi Tetap agar Konsisten */}
        <div className="flex flex-col">
          <h3 className="font-display text-2xl font-bold text-slate-900 line-clamp-1 min-h-[32px]">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2 min-h-[48px]">{item.description}</p>
        </div>

        <div className="my-4 border-t border-slate-100" />

        {/* Daftar Fitur dengan Min-Height agar Card Tetap Seragam saat Fitur Sedikit */}
        <div className="flex-1 min-h-[112px]">
          <ul className="space-y-2.5">
            {item.features.slice(0, 4).map((feature, index) => (
              <li key={`${item.id}-feature-${index}`} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Baris Tombol Aksi di Bawah: Selalu Rata dan Presisi */}
        <div className="mt-auto pt-4 border-t border-slate-100/90 flex min-h-[56px] items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isSalon ? (
              <div>
                <p className="text-base sm:text-lg font-bold text-rose-600 truncate">{rupiah(item.price)}<span className="ml-1 text-xs font-medium text-slate-500">/ layanan</span></p>
              </div>
            ) : (
              <div>
                <p className="text-sm sm:text-base font-bold text-rose-600 truncate">
                  {item.priceMax ? `${rupiah(item.price)} – ${rupiah(item.priceMax)}` : `Mulai ${rupiah(item.price)}`}
                </p>
                <span className="text-[11px] font-medium text-slate-400">Harga via konsultasi</span>
              </div>
            )}
          </div>
          <button
            onClick={onBook}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-xs"
          >
            <MessageCircle size={17} /> Pesan
          </button>
        </div>
      </div>
    </article>
  )
}

function WeddingServicesSection({
  phone: _phone,
  salonName: _salonName,
  onNavigate: _onNavigate,
}: {
  phone?: string
  salonName?: string
  onNavigate?: (route: PublicRoute) => void
} = {}) {
  return (
    <section id="layanan-utama" className="relative overflow-hidden border-b border-rose-100/70 bg-gradient-to-b from-white via-rose-50/30 to-white py-16 sm:py-24 lg:py-28">
      {/* Subtle decorative glowing ambient backdrops */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[450px] w-[750px] -translate-x-1/2 rounded-full bg-rose-200/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-[380px] w-[550px] rounded-full bg-amber-100/30 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 shadow-2xs backdrop-blur">
            <Sparkles size={14} className="shrink-0 text-amber-500" />
            <span>Layanan Eksklusif Desy Salon</span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold uppercase tracking-[0.16em] text-slate-900 sm:text-3xl lg:text-4xl">
            LAYANAN TATA RIAS PENGANTIN DAN SALON
          </h2>
          <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-rose-300 via-rose-500 to-rose-300 sm:w-24" />
        </div>

        {/* Content Rows */}
        <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-24 lg:space-y-28">
          {/* Row 1: Tata Rias (Kiri: Foto, Kanan: Teks) */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            {/* Foto Tata Rias */}
            <div className="group relative overflow-hidden rounded-3xl border border-rose-100/90 bg-white p-2.5 shadow-xl shadow-rose-950/5 transition-all duration-500 hover:border-rose-200 hover:shadow-2xl">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-rose-50">
                <img
                  src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=85"
                  alt="Proses Tata Rias Pengantin Desy Salon"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Teks Tata Rias */}
            <div className="flex flex-col justify-center">
              <h3 className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-slate-900 whitespace-nowrap sm:text-2xl sm:tracking-[0.08em] lg:text-[23px] xl:text-[27px]">
                TATA RIAS PENGANTIN <span className="font-sans font-medium text-[0.92em]">&amp;</span> WISUDA
              </h3>
              <p className="mt-4 text-justify text-sm font-normal leading-relaxed text-slate-600 sm:text-[15px] sm:leading-loose">
                Didedikasikan untuk menyempurnakan setiap momen istimewa Anda, mulai dari prosesi sakral pernikahan hingga perayaan kelulusan wisuda yang membanggakan. Dengan pengalaman terpercaya sejak tahun 1993, Desy Salon menghadirkan keahlian tata rias Paes Ageng Adat Jawa yang sarat pakem dan keagungan tradisi, riasan Modern Grace yang flawless dan mempesona, hingga pulasan makeup wisuda yang natural, segar, dan tahan lama sepanjang hari bahagia Anda. Setiap detail dipersembahkan dengan cinta dan ketelitian untuk memancarkan pesona terbaik serta rasa percaya diri dari dalam diri Anda.
              </p>
            </div>
          </div>

          {/* Row 2: Salon & Spa (Kiri: Teks, Kanan: Foto) */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            {/* Teks Salon (Desktop kiri: order-1, Mobile: order-2) */}
            <div className="order-2 flex flex-col justify-center lg:order-1">
              <h3 className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-slate-900 whitespace-nowrap sm:text-2xl sm:tracking-[0.08em] lg:text-[23px] xl:text-[27px]">
                PERAWATAN SALON
              </h3>
              <p className="mt-4 text-justify text-sm font-normal leading-relaxed text-slate-600 sm:text-[15px] sm:leading-loose">
                Menghadirkan layanan perawatan kecantikan rambut dan tubuh yang lengkap untuk menjaga kesegaran serta penampilan terbaik Anda setiap hari. Kami melayani beragam kebutuhan salon umum seperti potong rambut, creambath bernutrisi, hair spa, pewarnaan rambut (hair coloring), rebonding, smoothing, hingga perawatan facial yang menyegarkan kulit wajah. Didukung oleh kapster berpengalaman dan suasana yang nyaman, Desy Salon siap memberikan relaksasi maksimal agar Anda selalu tampil prima, segar, dan percaya diri di setiap kesempatan.
              </p>
            </div>

            {/* Foto Salon (Desktop kanan: order-2, Mobile: order-1) */}
            <div className="order-1 group relative overflow-hidden rounded-3xl border border-rose-100/90 bg-white p-2.5 shadow-xl shadow-rose-950/5 transition-all duration-500 hover:border-rose-200 hover:shadow-2xl lg:order-2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-rose-50">
                <img
                  src="https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=85"
                  alt="Potong Rambut dan Perawatan Salon Desy Salon"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqSection({ faqs, phone, salonName }: { faqs: FaqItem[]; phone: string; salonName: string }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const isSearching = searchQuery.trim().length > 0

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) {
      return showAll ? faqs : faqs.slice(0, 5)
    }
    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    )
  }, [faqs, searchQuery, showAll])

  function toggleFaq(id: string) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section id="faq" className="border-t border-rose-100/70 bg-gradient-to-b from-slate-50/80 via-rose-50/20 to-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-9 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 shadow-2xs">
            <HelpCircle size={13} />
            <span>Desy Salon & Tata Rias</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-sm text-slate-600">
            Pertanyaan dan jawaban seputar layanan tata rias pengantin, salon, reservasi, serta ketentuan di Desy Salon.
          </p>

          <div className="relative mx-auto mt-6 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a question..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            <>
              {filteredFaqs.map((faq) => {
                const isOpen = openId === faq.id
                return (
                  <div
                    key={faq.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:border-slate-300"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left font-bold text-slate-800 transition hover:text-rose-600 sm:p-5"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm sm:text-base leading-snug">{faq.question}</span>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition duration-200 ${
                        isOpen ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isOpen ? <X size={15} /> : <Plus size={15} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-0 text-xs sm:text-sm leading-6 text-slate-600 sm:px-5 sm:pb-5">
                        <p className="pt-3">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              {!isSearching && faqs.length > 5 && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 transition"
                  >
                    {showAll ? (
                      <>Tutup Pertanyaan <ChevronDown size={15} className="rotate-180" /></>
                    ) : (
                      <>Lainnya ({faqs.length - 5}) <ChevronDown size={15} /></>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700 text-sm">Pertanyaan tidak ditemukan</p>
              <p className="mt-1">Punya pertanyaan lain? Tim Desy Salon siap membantu Anda via WhatsApp.</p>
              <div className="mt-4 flex justify-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="btn-secondary !text-xs !py-1.5 !px-3"
                  >
                    Reset Pencarian
                  </button>
                )}
                <a
                  href={whatsappConsultationLink(phone, salonName)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary !text-xs !py-1.5 !px-3"
                >
                  <MessageCircle size={14} /> WhatsApp Desy Salon
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PublicFooter({ store, onNavigate }: { store: SalonStore; onNavigate: (route: PublicRoute) => void }) {
  const links: { name: string; href: PublicRoute }[] = [
    { name: 'Beranda', href: '/' },
    { name: 'Katalog rias', href: '/paket' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Sertifikat', href: '/sertifikat' },
  ]
  return <footer className="border-t border-slate-200 bg-slate-50 px-5 py-12 sm:px-8 lg:px-12">
    <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.65fr)_minmax(0,0.95fr)_minmax(0,1.45fr)] lg:gap-7">
      <div>
        <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/') }} className="inline-flex items-center"><img src={brandLogo} alt={store.profile.name} className="h-12 w-auto max-w-[220px] object-contain" /></a>
        <p className="mt-4 w-full text-sm font-medium leading-6 text-slate-700 lg:max-w-[230px]">Riasan penuh rasa sejak 1993, untuk hari-hari yang penuh makna. Mari siapkan momen terbaikmu bersama kami.</p>
        <a href={whatsappConsultationLink(store.profile.phone, store.profile.name)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"><MessageCircle size={16} /> Konsultasi via WhatsApp</a>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-900">Kunjungi studio</h3>
        <a
          href={store.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'}
          target="_blank"
          rel="noreferrer"
          title="Buka lokasi di Google Maps"
          className="group flex gap-2 text-sm leading-6 text-slate-600 transition hover:text-rose-600"
        >
          <MapPin size={17} className="mt-0.5 shrink-0 text-rose-500 transition-transform group-hover:scale-110" />
          <span>{store.profile.address}</span>
        </a>
        <p className="mt-3 flex gap-2 text-sm text-slate-600"><Clock3 size={16} className="shrink-0 text-rose-500" />{store.profile.openingHours}</p>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-900">Jelajahi</h3>
        <div className="grid gap-2 text-sm font-medium text-slate-700">
          {links.map(({ name, href }) => <a key={href} href={href} onClick={(event) => { event.preventDefault(); onNavigate(href) }} className="hover:text-rose-600">{name}</a>)}
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-900">Media Sosial</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={store.profile.facebookUrl || initialStore.profile.facebookUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook Desyana"
            title="Facebook Desyana"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500 shadow-xs transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm"
          >
            <Facebook size={20} />
          </a>
          <a
            href={store.profile.instagramUrl || 'https://www.instagram.com/desyana_77/'}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram Desyana"
            title="Instagram @desyana_77"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500 shadow-xs transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm"
          >
            <Instagram size={20} />
          </a>
          <a
            href={store.profile.tiktokUrl || 'https://www.tiktok.com/@desyana.s'}
            target="_blank"
            rel="noreferrer"
            aria-label="TikTok Desyana"
            title="TikTok @desyana.s"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500 shadow-xs transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm"
          >
            <Music2 size={20} />
          </a>
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-900">Peta studio</h3>
        <a
          href={store.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'}
          target="_blank"
          rel="noreferrer"
          title="Buka lokasi di Google Maps"
          className="group block h-[180px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-rose-300"
        >
          <iframe
            title={`Peta lokasi ${store.profile.name}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent('Desy Salon Dan Tata Rias Pengantin, Pekuncen, Jatilawang')}&output=embed`}
            className="pointer-events-none h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </a>
      </div>
    </div>
    <div className="mx-auto mt-10 max-w-7xl border-t border-slate-200 pt-5 text-xs text-slate-600">
      <span>© {new Date().getFullYear()} {store.profile.name}. Melayani sejak tahun 1993 dengan sepenuh hati.</span>
    </div>
  </footer>
}

const BOOKING_HOURS = [
  '08', '09', '10', '11', '12', '13', '14', '15', '16',
] as const

const BOOKING_MINUTES = [
  '00', '05', '10', '15', '20', '25',
  '30', '35', '40', '45', '50', '55',
] as const

function CustomPinkDatePickerTrigger({
  label = 'Tanggal acara *',
  name = 'date',
  value,
  isOpen,
  onToggle,
}: {
  label?: string
  name?: string
  value: string
  isOpen: boolean
  onToggle: (open: boolean) => void
}) {
  return (
    <div className="w-full min-w-0">
      <label className="mb-1.5 block text-sm sm:text-base font-bold text-slate-800" htmlFor={`date-btn-${name}`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        id={`date-btn-${name}`}
        type="button"
        onClick={() => onToggle(!isOpen)}
        className={`field flex min-h-[48px] h-12 w-full items-center justify-between rounded-2xl border bg-white px-3.5 sm:px-4 text-left text-sm sm:text-base transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${
          isOpen ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-200 hover:border-rose-300'
        }`}
      >
        <span className={value ? 'font-semibold text-slate-800' : 'text-slate-400'}>
          {value ? formatDate(value) : 'Pilih tanggal acara...'}
        </span>
        <CalendarDays size={18} className="shrink-0 text-rose-500" />
      </button>
    </div>
  )
}

function CustomPinkTimePickerTrigger({
  label = 'Waktu acara (WIB) *',
  name = 'time',
  value,
  isOpen,
  onToggle,
}: {
  label?: string
  name?: string
  value: string
  isOpen: boolean
  onToggle: (open: boolean) => void
}) {
  return (
    <div className="w-full min-w-0">
      <label className="mb-1.5 block text-sm sm:text-base font-bold text-slate-800" htmlFor={`time-btn-${name}`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        id={`time-btn-${name}`}
        type="button"
        onClick={() => onToggle(!isOpen)}
        className={`field flex min-h-[48px] h-12 w-full items-center justify-between rounded-2xl border bg-white px-3.5 sm:px-4 text-left text-sm sm:text-base transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${
          isOpen ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-200 hover:border-rose-300'
        }`}
      >
        <span className={value ? 'font-semibold text-slate-800' : 'text-slate-400'}>
          {value ? `${value} WIB` : 'Pilih waktu acara...'}
        </span>
        <Clock3 size={18} className="shrink-0 text-rose-500" />
      </button>
    </div>
  )
}

function DatePickerPanel({
  value,
  minDate,
  onChange,
  onClose,
  schedules: _schedules,
}: {
  value: string
  minDate?: string
  onChange: (val: string) => void
  onClose: () => void
  schedules?: Schedule[]
}) {
  const initialDate = value || minDate || getLocalIsoDate(new Date())
  const [viewYear, setViewYear] = useState(() => Number(initialDate.slice(0, 4)) || new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (Number(initialDate.slice(5, 7)) || 1) - 1)
  const [viewMode, setViewMode] = useState<'days' | 'months'>('days')

  useEffect(() => {
    if (value) {
      const y = Number(value.slice(0, 4))
      const m = Number(value.slice(5, 7)) - 1
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y)
        setViewMonth(m)
      }
    }
  }, [value])

  const minYear = minDate ? Number(minDate.slice(0, 4)) : -Infinity
  const minMonth = minDate ? Number(minDate.slice(5, 7)) - 1 : -Infinity
  const canGoPrevMonth = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth)

  function prevAction() {
    if (viewMode === 'months') {
      setViewYear((y) => y - 1)
    } else {
      if (!canGoPrevMonth) return
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear((y) => y - 1)
      } else {
        setViewMonth((m) => m - 1)
      }
    }
  }

  function nextAction() {
    if (viewMode === 'months') {
      setViewYear((y) => y + 1)
    } else {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear((y) => y + 1)
      } else {
        setViewMonth((m) => m + 1)
      }
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()

  const days = useMemo(() => {
    const list: Array<{ day: number; dateStr: string; isPast: boolean; isSelected: boolean }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      list.push({
        day: d,
        dateStr,
        isPast: minDate ? dateStr < minDate : false,
        isSelected: dateStr === value,
      })
    }
    return list
  }, [viewYear, viewMonth, daysInMonth, minDate, value])

  return (
    <div className="w-full rounded-2xl border border-rose-200 bg-white p-3 sm:p-3.5 shadow-md">
      <div className="mb-2.5 flex items-center justify-between border-b border-rose-100 pb-2.5">
        <button
          type="button"
          disabled={viewMode === 'days' && !canGoPrevMonth}
          onClick={prevAction}
          aria-label="Sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
        >
          <ChevronLeft size={18} />
        </button>

        {viewMode === 'days' ? (
          <button
            type="button"
            onClick={() => setViewMode('months')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm sm:text-base font-bold text-slate-800 transition hover:bg-rose-50 hover:text-rose-600"
            title="Klik untuk memilih bulan & tahun"
          >
            <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        ) : (
          <span className="text-sm sm:text-base font-bold text-slate-900">
            Pilih Bulan ({viewYear})
          </span>
        )}

        <button
          type="button"
          onClick={nextAction}
          aria-label="Berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {viewMode === 'days' ? (
        <>
          <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] sm:text-xs font-bold text-slate-500">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="flex aspect-square w-full max-w-[36px] mx-auto" />
            ))}
            {days.map(({ day, dateStr, isPast, isSelected }) => (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => {
                  onChange(dateStr)
                  onClose()
                }}
                className={`relative mx-auto flex aspect-square w-full max-w-[36px] items-center justify-center rounded-xl text-xs sm:text-sm transition ${
                  isSelected
                    ? 'bg-rose-500 font-bold text-white shadow-xs'
                    : isPast
                    ? 'cursor-not-allowed text-slate-300'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600 font-medium'
                }`}
              >
                <span>{day}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2 py-1.5">
          {MONTH_NAMES.map((name, idx) => {
            const isSelectedMonth = idx === viewMonth
            const isPastMonth = minDate
              ? viewYear < minYear || (viewYear === minYear && idx < minMonth)
              : false
            return (
              <button
                key={name}
                type="button"
                disabled={isPastMonth}
                onClick={() => {
                  setViewMonth(idx)
                  setViewMode('days')
                }}
                className={`rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
                  isSelectedMonth
                    ? 'bg-rose-500 text-white font-bold shadow-xs'
                    : isPastMonth
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimePickerPanel({
  value,
  date,
  schedules = [],
  excludeId,
  allowBookedSelection = false,
  onChange,
  onClose,
}: {
  value: string
  date?: string
  schedules?: Schedule[]
  excludeId?: string
  allowBookedSelection?: boolean
  onChange: (val: string) => void
  onClose: () => void
}) {
  const [rawHour, rawMinute] = (value || '08:00').split(':')
  const initialHour = BOOKING_HOURS.includes(rawHour as any) ? rawHour : '08'
  const initialMinute = initialHour === '16' ? '00' : (rawMinute || '00')
  const [tempHour, setTempHour] = useState(initialHour)
  const [tempMinute, setTempMinute] = useState(initialMinute)

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      if (h && BOOKING_HOURS.includes(h as any)) {
        setTempHour(h)
        if (h === '16') {
          setTempMinute('00')
        } else if (m) {
          setTempMinute(m)
        }
      }
    }
  }, [value])

  const minutesList = useMemo(() => {
    if (tempHour === '16') {
      return ['00']
    }
    if (tempMinute && !BOOKING_MINUTES.includes(tempMinute as any)) {
      return [tempMinute, ...BOOKING_MINUTES].sort()
    }
    return BOOKING_MINUTES
  }, [tempHour, tempMinute])

  const checkHourBooked = (h: string) => {
    if (!date) return false
    return isHourUnavailable(h, date, schedules, excludeId)
  }

  const checkSlotBooked = (h: string, m: string) => {
    if (!date) return false
    const timeStr = `${h}:${m}`
    const candidateMinutes = Number(h) * 60 + Number(m || '0')
    const candidateSession = sessionForTime(timeStr)
    return schedules.some((s) => {
      // Jadwal 'Menunggu Konfirmasi' belum sah mengunci slot waktu
      if (s.status === 'Menunggu Konfirmasi') return false
      if (excludeId && s.id === excludeId) return false
      if (s.eventDate !== date) return false
      if (s.session === 'Full Day') return true
      if (s.eventTime) {
        const [sh, sm] = s.eventTime.split(':').map(Number)
        const sMinutes = (sh || 0) * 60 + (sm || 0)
        return Math.abs(candidateMinutes - sMinutes) < 120
      }
      return s.session === candidateSession
    })
  }

  function handleSelectHour(h: string) {
    setTempHour(h)
    if (h === '16') {
      setTempMinute('00')
    }
  }

  function handleConfirm() {
    const finalMinute = tempHour === '16' ? '00' : tempMinute
    onChange(`${tempHour}:${finalMinute}`)
    onClose()
  }

  const isCurrentSelectionBooked = checkHourBooked(tempHour) || checkSlotBooked(tempHour, tempMinute)

  return (
    <div className="w-full rounded-2xl border border-rose-200 bg-white p-3 sm:p-3.5 shadow-md">
      <div className="mb-2.5 flex items-center justify-between border-b border-rose-100 pb-2">
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-600">
          <Clock3 size={16} /> Waktu Acara (08:00–16:00 WIB)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-center">
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Jam
          </span>
          <div className="max-h-48 overflow-y-auto overflow-x-hidden space-y-1.5 rounded-xl border border-rose-100/80 bg-rose-50/20 p-1.5 pr-1">
            {BOOKING_HOURS.map((h) => {
              const isSelected = h === tempHour
              const isBooked = checkHourBooked(h)
              const isDisabled = isBooked && !allowBookedSelection

              return (
                <button
                  key={h}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelectHour(h)}
                  className={`w-full h-11 rounded-lg px-2 flex flex-col items-center justify-center transition ${
                    isBooked
                      ? 'bg-rose-50/70 border border-rose-200 text-slate-400 cursor-not-allowed opacity-80'
                      : isSelected
                      ? 'bg-rose-500 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600 font-semibold'
                  }`}
                  title={isBooked ? `Pukul ${h}:00 sudah ada booking` : `Pilih pukul ${h}:00`}
                >
                  {isBooked ? (
                    <>
                      <span className="text-[9px] font-extrabold uppercase tracking-tight text-rose-600 leading-none mb-0.5">
                        Ada Booking
                      </span>
                      <span className="line-through text-xs font-medium text-slate-400 leading-none">
                        {h}:00
                      </span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm">{h}:00</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Menit
          </span>
          <div className="max-h-48 overflow-y-auto overflow-x-hidden space-y-1.5 rounded-xl border border-rose-100/80 bg-rose-50/20 p-1.5 pr-1">
            {minutesList.map((m) => {
              const isSelected = m === tempMinute
              const isBooked = checkSlotBooked(tempHour, m)
              const isDisabled = isBooked && !allowBookedSelection

              return (
                <button
                  key={m}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setTempMinute(m)}
                  className={`w-full h-11 rounded-lg px-2 flex flex-col items-center justify-center transition ${
                    isBooked
                      ? 'bg-rose-50/70 border border-rose-200 text-slate-400 cursor-not-allowed opacity-80'
                      : isSelected
                      ? 'bg-rose-500 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600 font-semibold'
                  }`}
                >
                  {isBooked ? (
                    <>
                      <span className="text-[9px] font-extrabold uppercase tracking-tight text-rose-600 leading-none mb-0.5">
                        Ada Booking
                      </span>
                      <span className="line-through text-xs font-medium text-slate-400 leading-none">
                        :{m}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm">:{m}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isCurrentSelectionBooked && !allowBookedSelection}
        onClick={handleConfirm}
        className={`mt-2.5 w-full rounded-xl py-2.5 text-sm sm:text-base font-bold shadow-xs transition ${
          isCurrentSelectionBooked && !allowBookedSelection
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            : 'bg-rose-500 text-white hover:bg-rose-600'
        }`}
      >
        {isCurrentSelectionBooked && !allowBookedSelection ? 'Jam Terpilih Sudah Ada Booking' : 'Pilih Jam Ini'}
      </button>
    </div>
  )
}

function BookingModal({
  item,
  schedules,
  onClose,
  onSubmit,
}: {
  item: Package
  schedules: Schedule[]
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  // Minimal H-1: Tanggal acara minimal besok (H+1 dari hari ini)
  const minDate = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return getLocalIsoDate(tomorrow)
  }, [])

  const [date, setDate] = useState(minDate)
  // Otomatis pilih jam pertama yang tersedia (tidak ada booking)
  const [time, setTime] = useState(() => getFirstAvailableTime(minDate, schedules, '08:00'))
  const [timeError, setTimeError] = useState('')
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null)

  function validateDateTime(selectedDate: string, selectedTime: string) {
    if (!selectedDate || !selectedTime) return false

    // Aturan H-1: Tanggal acara tidak boleh hari ini atau tanggal lampau (minimal besok)
    const todayStr = getLocalIsoDate(new Date())
    if (selectedDate <= todayStr) {
      setTimeError('Pemesanan wajib minimal H-1 (tanggal acara minimal besok).')
      return false
    }

    // Aturan Jam Kerja: 08:00 – 16:00 WIB
    const [hStr, mStr] = selectedTime.split(':')
    const totalMinutes = Number(hStr) * 60 + Number(mStr || '0')
    if (totalMinutes < 8 * 60 || totalMinutes > 16 * 60) {
      setTimeError('Waktu acara harus dalam jam kerja operasional (08:00 – 16:00 WIB).')
      return false
    }

    // Cek apakah jam yang dipilih sudah ada booking (atau berada dalam jeda 2 jam dari booking lain)
    if (isHourUnavailable(hStr, selectedDate, schedules)) {
      setTimeError(`Pukul ${selectedTime} WIB tidak tersedia (ada booking / jeda layanan 2 jam). Silakan pilih jam lain.`)
      return false
    }

    setTimeError('')
    return true
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    const autoTime = getFirstAvailableTime(newDate, schedules, time)
    setTime(autoTime)
    validateDateTime(newDate, autoTime)
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime)
    validateDateTime(date, newTime)
  }

  // Cek bentrok secara real-time
  const collidingSchedule = useMemo(() => {
    if (!date || !time) return null
    return findScheduleCollision({ eventDate: date, eventTime: time }, schedules)
  }, [date, time, schedules])


  const isFullDayBooked = useMemo(() => {
    return schedules.some((s) => s.status !== 'Menunggu Konfirmasi' && s.eventDate === date && s.session === 'Full Day')
  }, [date, schedules])

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    if (!validateDateTime(date, time) || collidingSchedule) {
      e.preventDefault()
      return
    }
    onSubmit(e)
  }

  return (
    <ModalFrame onClose={onClose} maxWidth="max-w-xl sm:max-w-[660px]" contentPadding="p-5 sm:p-6" overflowClass="overflow-y-auto">
      {/* Compact Header: Thumbnail Paket, Nama, Harga, Badge Min. H-1, Jam Kerja, dan Tombol Tutup */}
      <div className="flex items-center justify-between gap-3 border-b border-rose-100 pb-3.5 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={item.image}
            alt={item.name}
            className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl object-cover ring-2 ring-rose-200/80 shadow-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                Booking Reservasi
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50/70 px-2 py-0.5 text-xs font-semibold text-rose-700">
                Min. H-1
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50/70 px-2 py-0.5 text-xs font-semibold text-rose-700">
                Jam Kerja: 08.00–16.00 WIB
              </span>
            </div>
            <h3 className="truncate font-display text-base sm:text-lg font-bold text-slate-900 mt-1">
              {item.name}
            </h3>
            <p className="text-sm sm:text-base font-bold text-rose-600 mt-0.5">
              {(item.category.toLowerCase().includes('salon') || item.category.toLowerCase().includes('perawatan'))
                ? `${rupiah(item.price)} / layanan`
                : item.priceMax
                ? `${rupiah(item.price)} – ${rupiah(item.priceMax)}`
                : `Mulai ${rupiah(item.price)}`}
            </p>
          </div>
        </div>
        <button
          aria-label="Tutup"
          onClick={onClose}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Responsive Grid: Lebar label & input 100% presisi dan seragam */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="w-full min-w-0">
            <label className="mb-1.5 block text-sm sm:text-base font-bold text-slate-800" htmlFor="booking-name">
              Nama lengkap *
            </label>
            <input
              required
              id="booking-name"
              name="clientName"
              autoComplete="name"
              className="field block h-12 w-full rounded-xl border border-rose-200 bg-white px-3.5 sm:px-4 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
              placeholder="Nama pemesan"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-1.5 block text-sm sm:text-base font-bold text-slate-800" htmlFor="booking-phone">
              Nomor WhatsApp *
            </label>
            <input
              required
              id="booking-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              maxLength={18}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-]/g, '') }}
              autoComplete="tel"
              className="field block h-12 w-full rounded-xl border border-rose-200 bg-white px-3.5 sm:px-4 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          {/* Kolom 1: Tanggal acara */}
          <div className="w-full min-w-0">
            <CustomPinkDatePickerTrigger
              label="Tanggal acara *"
              name="date"
              value={date}
              isOpen={openPicker === 'date'}
              onToggle={(open) => setOpenPicker(open ? 'date' : null)}
            />
            {openPicker === 'date' && (
              <div className="mt-2 w-full animate-in fade-in duration-150">
                <DatePickerPanel
                  value={date}
                  minDate={minDate}
                  onChange={handleDateChange}
                  onClose={() => setOpenPicker(null)}
                  schedules={schedules}
                />
              </div>
            )}
          </div>

          {/* Kolom 2: Waktu acara */}
          <div className="w-full min-w-0">
            <CustomPinkTimePickerTrigger
              label="Waktu acara (WIB) *"
              name="time"
              value={time}
              isOpen={openPicker === 'time'}
              onToggle={(open) => setOpenPicker(open ? 'time' : null)}
            />
            {openPicker === 'time' && (
              <div className="mt-2 w-full animate-in fade-in duration-150">
                <TimePickerPanel
                  value={time}
                  date={date}
                  schedules={schedules}
                  onChange={handleTimeChange}
                  onClose={() => setOpenPicker(null)}
                />
              </div>
            )}
          </div>

          {/* Baris Baru: Lokasi acara */}
          <div className="w-full sm:col-span-2 min-w-0">
            <label className="mb-1.5 block text-sm sm:text-base font-bold text-slate-800" htmlFor="booking-location">
              Lokasi acara *
            </label>
            <input
              required
              id="booking-location"
              name="location"
              className="field block h-12 w-full rounded-xl border border-rose-200 bg-white px-3.5 sm:px-4 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
              placeholder="Contoh: Di Desy Salon / Gedung Serbaguna / Alamat Rumah"
            />
          </div>
        </div>

        {/* Real-time Status Banner: Validasi H-1, Bentrok, atau Tersedia */}
        {timeError ? (
          <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm sm:text-base font-semibold text-rose-700">
            <AlertCircle size={20} className="shrink-0 text-rose-600" />
            <span>{timeError}</span>
          </div>
        ) : collidingSchedule ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/95 p-3.5 sm:p-4 text-sm sm:text-base text-rose-800">
            <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900 text-sm sm:text-base">Jadwal Bentrok / Sudah Terisi</p>
              <p className="text-rose-700 text-xs sm:text-sm">
                {isFullDayBooked
                  ? `Tanggal ${formatDate(date)} sudah terisi pesanan seharian penuh (Full Day). Silakan pilih tanggal lain.`
                  : `Tanggal ${formatDate(date)} pukul ${time} WIB berdekatan dengan jadwal ${collidingSchedule.packageName} (${collidingSchedule.eventTime || collidingSchedule.session} WIB). Layanan salon/rias membutuhkan jeda minimal 2 jam. Silakan pilih waktu alternatif.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm sm:text-base text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <span>
              Jadwal <strong>{formatDate(date)}</strong> pukul <strong>{time} WIB</strong> siap dipesan (Jam Kerja 08:00–16:00).
            </span>
          </div>
        )}

        {/* Tombol Lanjutkan & konfirmasi via WA: berada tepat di bawah banner status */}
        <button
          type="submit"
          disabled={Boolean(collidingSchedule || timeError)}
          className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 sm:py-4 text-sm sm:text-base font-bold transition shadow-md ${
            collidingSchedule || timeError
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {collidingSchedule ? (
            <>
              <AlertCircle size={20} /> Jadwal Bentrok — Silakan Pilih Waktu Lain
            </>
          ) : (
            <>
              <MessageCircle size={20} /> Lanjutkan & konfirmasi via WA
            </>
          )}
        </button>
      </form>
    </ModalFrame>
  )
}

function LoginPage({ store, onOwnerLogin }: { store: SalonStore; onOwnerLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (username.trim() === store.credentials.username && password === store.credentials.password) onOwnerLogin()
    else setError('Username atau password belum sesuai.')
  }

  return <main className="flex min-h-screen items-center justify-center bg-rose-50/50 px-5 py-10">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-9">
      <img src={brandLogo} alt={store.profile.name} className="mb-8 h-12 w-auto max-w-[220px] object-contain object-left" />
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Login Admin</h1>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <div><label className="label" htmlFor="auth-username">Username</label><input required autoComplete="username" id="auth-username" value={username} onChange={(event) => setUsername(event.target.value)} className="field py-3" placeholder="Masukkan username admin" /></div>
        <div><label className="label" htmlFor="auth-password">Password</label><input required autoComplete="current-password" id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field py-3" placeholder="Masukkan password" /></div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary w-full py-3">Masuk</button>
      </form>
    </div>
  </main>
}

function AdminDashboard({ store, activeTab, setActiveTab, onOpen, onDelete, onCategoryRemove, onSettingsSave, onSavePortfolioConfig, onLogout }: {
  store: SalonStore; activeTab: AdminTab; setActiveTab: (tab: AdminTab) => void;
  onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) => void;
  onDelete: (collection: 'packages' | 'schedules' | 'gallery' | 'certificates' | 'faqs', id: string) => void;
  onCategoryRemove: (category: Category) => void;
  onSettingsSave: (event: FormEvent<HTMLFormElement>) => void;
  onSavePortfolioConfig: (source: 'fouita' | 'gallery', fouitaInput: string) => void;
  onLogout: () => void;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  function toggleSidebar() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => !prev)
    } else {
      setMobileDrawerOpen((prev) => !prev)
    }
  }

  const tabs: { name: AdminTab; icon: typeof PackageCheck }[] = [
    { name: 'Katalog', icon: PackageCheck },
    { name: 'Kategori', icon: LayoutDashboard },
    { name: 'Jadwal', icon: CalendarDays },
    { name: 'Portfolio', icon: Image },
    { name: 'Sertifikat', icon: Award },
    { name: 'FAQ', icon: HelpCircle },
    { name: 'Akun', icon: User },
  ]

  return <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50">
    {/* Overlay Backdrop untuk Drawer Mobile */}
    {mobileDrawerOpen && (
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        onClick={() => setMobileDrawerOpen(false)}
      />
    )}

    {/* Sidebar Mobile Drawer (Merespon klik garis tiga pada mobile/tablet) */}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[80px] items-center justify-between border-b border-slate-100 px-6">
        <a href="/" className="flex items-center"><img src={brandLogo} alt="Desy Salon" className="h-11 sm:h-12 w-auto max-w-[200px] object-contain" /></a>
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileDrawerOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {tabs.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => { setActiveTab(name); setMobileDrawerOpen(false) }}
            className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === name ? 'bg-rose-50 text-rose-700 shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon size={19} className={activeTab === name ? 'text-rose-600' : 'text-slate-400'} />
            {name}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <User size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Desy</p>
              <p className="text-xs text-slate-500">Pengelola Usaha</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>

    {/* Sidebar Desktop (Bisa disembunyikan/dimunculkan dengan toggle garis tiga) */}
    {desktopSidebarOpen && (
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <a href="/" className="flex h-[80px] items-center border-b border-slate-100 px-6">
          <img src={brandLogo} alt="Desy Salon" className="h-12 sm:h-13 w-auto max-w-[220px] object-contain" />
        </a>
        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                activeTab === name ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon size={18} className={activeTab === name ? 'text-rose-600' : 'text-slate-400'} />
              {name}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <User size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Desy</p>
              <p className="text-xs text-slate-500">Pengelola Usaha</p>
            </div>
          </div>
        </div>
      </aside>
    )}

    {/* Area Konten Utama */}
    <div className={`min-w-0 transition-all duration-300 ${desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
      <header className="sticky top-0 z-20 flex min-h-[80px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:flex-nowrap sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {/* Tombol Garis Tiga (Menu Toggle Responsif) */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none"
            aria-label="Toggle menu navigasi"
            title={desktopSidebarOpen ? 'Sembunyikan menu samping' : 'Tampilkan menu samping'}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Studio Manager <span className="mx-1 text-slate-300">/</span> <span className="font-semibold text-slate-800">{activeTab}</span></p>
            <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Dashboard Pengelola</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Admin · Desy</span>
          <button type="button" onClick={onLogout} className="btn-secondary !px-3 !py-2 text-xs sm:!px-4 sm:text-sm"><LogOut size={15} />Keluar</button>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-[1440px] px-3 py-5 sm:px-8 sm:py-7 lg:px-9">
        {/* 2 Card Statistik di atas: Disesuaikan per menu (FAQ, Kategori, Jadwal, dsb), disembunyikan di Akun, Sertifikat, dan Portfolio */}
        {activeTab !== 'Akun' && activeTab !== 'Sertifikat' && activeTab !== 'Portfolio' && (
          <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-7 sm:grid-cols-2">
            {activeTab === 'FAQ' ? (
              <>
                <StatCard
                  title="FAQ Tata Rias"
                  count={store.faqs.filter((item) => (item.category || '').toLowerCase().includes('rias')).length}
                  detail="Pertanyaan seputar rias & makeup"
                  icon={Sparkles}
                  color="rose"
                />
                <StatCard
                  title="FAQ Layanan Salon"
                  count={store.faqs.filter((item) => (item.category || '').toLowerCase().includes('salon')).length}
                  detail="Pertanyaan perawatan salon"
                  icon={HelpCircle}
                  color="sky"
                />
              </>
            ) : activeTab === 'Kategori' ? (
              <>
                <StatCard
                  title="Total Kategori"
                  count={store.categories.length}
                  detail="Jenis kategori layanan"
                  icon={LayoutDashboard}
                  color="rose"
                />
                <StatCard
                  title="Total Paket"
                  count={store.packages.length}
                  detail="Paket terkait di katalog"
                  icon={PackageCheck}
                  color="sky"
                />
              </>
            ) : activeTab === 'Jadwal' ? (
              <>
                <StatCard
                  title="DP"
                  count={store.schedules.filter((item) => item.status === 'DP').length}
                  detail="Jadwal rias terbayar DP"
                  icon={Clock3}
                  color="amber"
                />
                <StatCard
                  title="Lunas"
                  count={store.schedules.filter((item) => item.status === 'Lunas').length}
                  detail="Jadwal pembayaran lunas"
                  icon={CheckCircle2}
                  color="emerald"
                />
              </>
            ) : (
              <>
                <StatCard title="Paket Katalog" count={store.packages.length} detail="Pilihan layanan aktif" icon={PackageCheck} color="rose" />
                <StatCard title="Booking Mendatang" count={store.schedules.filter((item) => item.status !== 'Lunas' && item.status !== 'Selesai').length} detail="Perlu ditangani" icon={CalendarDays} color="sky" />
              </>
            )}
          </section>
        )}

        {/* Konten Menu Yang Bersangkutan (Hanya tampil 1 menu yang aktif) */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {activeTab === 'Katalog' && <PackagesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Kategori' && <CategoriesManager store={store} onOpen={onOpen} onRemove={onCategoryRemove} />}
          {activeTab === 'Jadwal' && <SchedulesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Portfolio' && <GalleryManager store={store} onOpen={onOpen} onDelete={onDelete} onSavePortfolioConfig={onSavePortfolioConfig} />}
          {activeTab === 'Sertifikat' && <CertificatesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'FAQ' && <FaqManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Akun' && <SettingsManager store={store} onSave={onSettingsSave} />}
        </section>
      </main>
    </div>
  </div>
}

function StatCard({ title, count, detail, icon: Icon, color }: { title: string; count: number; detail: string; icon: typeof PackageCheck; color: string }) {
  const styles: Record<string, string> = { rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', sky: 'bg-sky-50 text-sky-600' }
  return <article className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6"><div className="min-w-0"><p className="text-xs font-semibold leading-4 text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{count}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${styles[color]}`}><Icon size={22} /></span></article>
}


function EmptyState({ label }: { label: string }) { return <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">{label}</div> }
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex items-center justify-end gap-1.5 sm:gap-2">
    <button type="button" aria-label="Edit" title="Edit" onClick={onEdit} className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><Edit3 size={15} /></button>
    <button type="button" aria-label="Hapus" title="Hapus" onClick={onDelete} className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>
  </div>
}

function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 6,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
}) {
  if (totalItems <= pageSize) return null
  const startIdx = (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{startIdx}–{endIdx}</span> dari{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
              currentPage === pageNum
                ? 'bg-rose-500 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            {pageNum}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function SearchableSelect({
  label,
  name,
  options,
  value,
  onChange,
  defaultValue = '',
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Cari opsi...',
  className = '',
  buttonClassName = '',
}: {
  label?: string
  name?: string
  options: readonly string[]
  value?: string
  onChange?: (val: string) => void
  defaultValue?: string
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  buttonClassName?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [internalSelected, setInternalSelected] = useState(() => defaultValue || (options.length > 0 ? options[0] : ''))
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selected = value !== undefined ? value : internalSelected

  useEffect(() => {
    if (defaultValue && value === undefined) {
      setInternalSelected(defaultValue)
    }
  }, [defaultValue, value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        clearTimeout(timer)
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, searchQuery])

  function handleSelect(option: string) {
    if (value === undefined) {
      setInternalSelected(option)
    }
    onChange?.(option)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="label" htmlFor={name ? `searchable-btn-${name}` : undefined}>
          {label}
        </label>
      )}
      {name && <input type="hidden" name={name} value={selected} />}

      <button
        id={name ? `searchable-btn-${name}` : undefined}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between text-left transition focus:outline-none ${
          buttonClassName
            ? buttonClassName
            : 'field min-h-[48px] h-12 text-sm sm:text-base px-3.5 sm:px-4 rounded-2xl'
        }`}
      >
        <span className={`truncate ${selected ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
          {selected || placeholder}
        </span>
        <ChevronDown size={buttonClassName ? 15 : 18} className={`shrink-0 ml-1.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-3 text-sm sm:text-base transition ${
                    selected === option
                      ? 'bg-rose-50 font-bold text-rose-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {selected === option && <Check size={16} className="shrink-0 text-rose-600" />}
                </button>
              ))
            ) : (
              <p className="py-3 text-center text-sm text-slate-400">Tidak ada hasil cocok</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PackagesManager({ store, onOpen, onDelete }: { store: SalonStore; onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category) => void; onDelete: (collection: 'packages' | 'schedules' | 'gallery', id: string) => void }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default')
  const [currentPage, setCurrentPage] = useState(1)

  // Otomatis reset ke urutan data terbaru (default) saat ada paket baru ditambahkan
  const prevCountRef = useRef(store.packages.length)
  useEffect(() => {
    if (store.packages.length > prevCountRef.current) {
      setSortOrder('default')
      setCurrentPage(1)
    }
    prevCountRef.current = store.packages.length
  }, [store.packages.length])

  const filteredAndSorted = useMemo(() => {
    let list = store.packages
    if (selectedCategory !== 'Semua') {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase())
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }
    if (sortOrder === 'default') {
      return list
    }
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [store.packages, selectedCategory, search, sortOrder])

  const totalItems = filteredAndSorted.length
  const totalPages = Math.ceil(totalItems / 6) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filteredAndSorted.slice((validPage - 1) * 6, validPage * 6)

  return <>
    {/* Header & Toolbar: Searching, Filter Kategori, Sortir di sebelah kiri tombol Tambah Paket (Semua 1 baris) */}
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="shrink-0">
        <h2 className="text-lg font-bold text-slate-900">Kelola Paket</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Atur layanan, harga, dan informasi katalog publik.</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 lg:flex-nowrap w-full lg:w-auto">
        {/* Searching */}
        <div className="relative w-full sm:w-56 lg:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari paket atau layanan..."
            className="field !py-2.5 !pl-9 !pr-7 text-sm min-h-[42px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setCurrentPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Kategori & Tombol Tambah Paket (Berdampingan di Mobile) */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          {/* Filter Kategori */}
          <SearchableSelect
            options={['Semua Kategori', ...store.categories.map((c) => c.name)]}
            value={selectedCategory === 'Semua' ? 'Semua Kategori' : selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val === 'Semua Kategori' ? 'Semua' : val)
              setCurrentPage(1)
            }}
            placeholder="Filter Kategori"
            searchPlaceholder="Cari kategori..."
            className="w-full sm:w-52 shrink-0"
            buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
          />

          {/* Tombol Tambah Paket */}
          <button
            onClick={() => onOpen('package')}
            className="btn-primary !px-3 sm:!px-4 !py-2.5 text-sm min-h-[42px] shrink-0 whitespace-nowrap justify-center w-full sm:w-auto"
          >
            <Plus size={16} />Tambah paket
          </button>
        </div>
      </div>
    </div>

    {paginated.length ? <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:hidden">
        {paginated.map((item) => (
          <article key={item.id} className="flex flex-col justify-between min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-xs transition hover:border-rose-200">
            <div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 min-w-0">
                <span className="inline-block rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  {item.category}
                </span>
                <h3 className="mt-1 line-clamp-1 text-xs sm:text-sm font-bold text-slate-900" title={item.name}>
                  {item.name}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-slate-700">
                  {(item.category.toLowerCase().includes('salon') || item.category.toLowerCase().includes('perawatan'))
                    ? rupiah(item.price)
                    : item.priceMax
                      ? `${rupiah(item.price)} – ${rupiah(item.priceMax)}`
                      : `Mulai ${rupiah(item.price)}`}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="mt-2.5 border-t border-slate-100 pt-2 flex items-center justify-end">
              <RowActions onEdit={() => onOpen('package', item)} onDelete={() => onDelete('packages', item.id)} />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
              <th
                className="py-3 pr-4 font-semibold cursor-pointer select-none hover:text-rose-600"
                onClick={() => {
                  setSortOrder((prev) => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'asc'))
                  setCurrentPage(1)
                }}
                title={sortOrder === 'default' ? 'Urutan: Data Terbaru (Klik untuk A-Z)' : sortOrder === 'asc' ? 'Urutan: A-Z (Klik untuk Z-A)' : 'Urutan: Z-A (Klik untuk A-Z)'}
              >
                <div className="flex items-center gap-1.5">
                  <span>PAKET</span>
                  <ChevronsUpDown size={14} className={sortOrder !== 'default' ? 'text-rose-600' : 'text-slate-400'} />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 font-semibold">Harga</th>
              <th className="py-3 pl-4 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-11 w-14 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="max-w-xs truncate text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.category}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {(item.category.toLowerCase().includes('salon') || item.category.toLowerCase().includes('perawatan'))
                    ? rupiah(item.price)
                    : item.priceMax
                      ? `${rupiah(item.price)} – ${rupiah(item.priceMax)}`
                      : `Mulai ${rupiah(item.price)}`}
                </td>
                <td className="py-3 pl-4"><RowActions onEdit={() => onOpen('package', item)} onDelete={() => onDelete('packages', item.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination
        currentPage={validPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={6}
        onPageChange={setCurrentPage}
      />
    </> : (
      search || selectedCategory !== 'Semua' ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Search className="mx-auto mb-2 text-slate-400" size={20} />
          <p className="text-sm font-semibold text-slate-700">Paket tidak ditemukan</p>
          <p className="mt-1 text-xs text-slate-500">Coba ubah kata kunci atau filter kategori.</p>
        </div>
      ) : (
        <EmptyState label="Belum ada paket. Tambahkan paket pertama." />
      )
    )}
  </>
}

function CategoriesManager({ store, onOpen, onRemove }: {
  store: SalonStore
  onOpen: (kind: EditorKind, item?: Category) => void
  onRemove: (category: Category) => void
}) {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default')
  const [currentPage, setCurrentPage] = useState(1)

  // Otomatis reset ke urutan data terbaru (default) saat ada kategori baru ditambahkan
  const prevCountRef = useRef(store.categories.length)
  useEffect(() => {
    if (store.categories.length > prevCountRef.current) {
      setSortOrder('default')
      setCurrentPage(1)
    }
    prevCountRef.current = store.categories.length
  }, [store.categories.length])

  const filteredAndSorted = useMemo(() => {
    let list = store.categories
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    }
    if (sortOrder === 'default') {
      return list
    }
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [store.categories, search, sortOrder])

  const totalItems = filteredAndSorted.length
  const totalPages = Math.ceil(totalItems / 6) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filteredAndSorted.slice((validPage - 1) * 6, validPage * 6)

  return <>
    {/* Header & Toolbar: Searching di sebelah kiri tombol Tambah Kategori (Semua 1 baris) */}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="shrink-0">
        <h2 className="text-lg font-bold text-slate-900">Kelola Kategori</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Atur jenis kategori bisnis</p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 w-full sm:w-auto">
        {/* Searching */}
        <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari kategori..."
            className="field !py-2.5 !pl-9 !pr-7 text-xs sm:text-sm min-h-[42px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setCurrentPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tombol Tambah Kategori */}
        <button
          onClick={() => onOpen('category')}
          className="btn-primary !px-3.5 sm:!px-4 !py-2.5 text-xs sm:text-sm min-h-[42px] shrink-0 whitespace-nowrap justify-center"
        >
          <Plus size={16} />Tambah kategori
        </button>
      </div>
    </div>

    {paginated.length ? (
      <>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500">
                <th
                  className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-rose-600"
                  onClick={() => {
                    setSortOrder((prev) => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'asc'))
                    setCurrentPage(1)
                  }}
                  title={sortOrder === 'default' ? 'Urutan: Data Terbaru (Klik untuk A-Z)' : sortOrder === 'asc' ? 'Urutan: A-Z (Klik untuk Z-A)' : 'Urutan: Z-A (Klik untuk A-Z)'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>KATEGORI</span>
                    <ChevronsUpDown size={14} className={sortOrder !== 'default' ? 'text-rose-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="hidden sm:table-cell py-3 px-4 font-semibold">PAKET TERKAIT</th>
                <th className="py-3 px-4 text-right font-semibold">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((category) => {
                const packageCount = store.packages.filter((item) => item.category.toLowerCase() === category.name.toLowerCase()).length
                return (
                  <tr key={category.id} className="transition hover:bg-rose-50/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                          <LayoutDashboard size={17} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{category.name}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{packageCount} paket terkait</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell py-3 px-4 text-xs font-medium text-slate-600">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 font-semibold">{packageCount} paket</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <RowActions
                        onEdit={() => onOpen('category', category)}
                        onDelete={() => onRemove(category)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={validPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={6}
          onPageChange={setCurrentPage}
        />
      </>
    ) : (
      search ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Search className="mx-auto mb-2 text-slate-400" size={20} />
          <p className="text-sm font-semibold text-slate-700">Kategori tidak ditemukan</p>
          <p className="mt-1 text-xs text-slate-500">Coba kata kunci pencarian yang lain.</p>
        </div>
      ) : (
        <EmptyState label="Belum ada kategori. Klik Tambah kategori untuk membuat baru." />
      )
    )}
  </>
}

function SchedulesManager({ store, onOpen, onDelete }: { store: SalonStore; onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category) => void; onDelete: (collection: 'packages' | 'schedules' | 'gallery', id: string) => void }) {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleView, setScheduleView] = useState<'list' | 'history'>('list')
  const [selectedMonth, setSelectedMonth] = useState('Semua Bulan')
  const [selectedYear, setSelectedYear] = useState('Semua Tahun')
  const [historyMonth, setHistoryMonth] = useState('Semua Bulan')
  const [historyYear, setHistoryYear] = useState('Semua Tahun')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'date' | 'status'>('default')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  // Otomatis reset ke urutan data terbaru (default) saat ada jadwal baru ditambahkan
  const prevCountRef = useRef(store.schedules.length)
  useEffect(() => {
    if (store.schedules.length > prevCountRef.current) {
      setSortBy('default')
      setCurrentPage(1)
      setHistoryPage(1)
    }
    prevCountRef.current = store.schedules.length
  }, [store.schedules.length])

  // Ekstrak daftar tahun yang tersedia dari jadwal
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    store.schedules.forEach((s) => {
      if (s.eventDate && s.eventDate.length >= 4) {
        years.add(s.eventDate.slice(0, 4))
      }
    })
    if (years.size === 0) years.add(new Date().getFullYear().toString())
    return Array.from(years).sort().reverse()
  }, [store.schedules])

  // Filter daftar jadwal aktif (hanya booking yang belum lunas/selesai)
  const filteredAndSorted = useMemo(() => {
    let list = store.schedules.filter((s) => s.status !== 'Lunas' && s.status !== 'Selesai')
    if (selectedMonth !== 'Semua Bulan') {
      const mIdx = MONTH_NAMES.indexOf(selectedMonth as any) + 1
      const mStr = mIdx < 10 ? `0${mIdx}` : `${mIdx}`
      list = list.filter((s) => s.eventDate && s.eventDate.slice(5, 7) === mStr)
    }
    if (selectedYear !== 'Semua Tahun') {
      list = list.filter((s) => s.eventDate && s.eventDate.startsWith(selectedYear))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((s) =>
        s.clientName.toLowerCase().includes(q) ||
        s.packageName.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        (s.whatsapp && s.whatsapp.includes(q))
      )
    }
    if (sortBy === 'default') {
      return list
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = `${a.eventDate || ''} ${a.eventTime || ''}`
        const dateB = `${b.eventDate || ''} ${b.eventTime || ''}`
        const cmp = dateA.localeCompare(dateB)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortBy === 'status') {
        const statusCmp = a.status.localeCompare(b.status, 'id', { sensitivity: 'base' })
        if (statusCmp !== 0) {
          return sortOrder === 'asc' ? statusCmp : -statusCmp
        }
        return a.clientName.localeCompare(b.clientName, 'id', { sensitivity: 'base' })
      }
      const cmp = a.clientName.localeCompare(b.clientName, 'id', { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [store.schedules, selectedMonth, selectedYear, search, sortBy, sortOrder])

  const totalItems = filteredAndSorted.length
  const totalPages = Math.ceil(totalItems / 6) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filteredAndSorted.slice((validPage - 1) * 6, validPage * 6)

  function editSchedule(schedule: Schedule) {
    setSelectedSchedule(null)
    onOpen('schedule', schedule)
  }

  // Data history booking disaring berdasarkan 2 filter: Bulan & Tahun
  const activeHistoryData = useMemo(() => {
    // Riwayat booking menampilkan pesanan yang sudah berstatus 'Lunas' atau 'Selesai'
    let items = store.schedules.filter((s) => s.status === 'Lunas' || s.status === 'Selesai')
    if (historyMonth !== 'Semua Bulan') {
      const mIdx = MONTH_NAMES.indexOf(historyMonth as any) + 1
      const mStr = mIdx < 10 ? `0${mIdx}` : `${mIdx}`
      items = items.filter((s) => s.eventDate && s.eventDate.slice(5, 7) === mStr)
    }
    if (historyYear !== 'Semua Tahun') {
      items = items.filter((s) => s.eventDate && s.eventDate.startsWith(historyYear))
    }
    items = [...items].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))

    const totalRevenue = items.reduce((acc, s) => acc + getBookingPrice(s, store.packages), 0)
    const periodLabel = `${historyMonth !== 'Semua Bulan' ? historyMonth : ''} ${historyYear !== 'Semua Tahun' ? historyYear : (historyMonth === 'Semua Bulan' ? 'Semua Waktu' : '')}`.trim()

    return { items, lunasItems: items, totalRevenue, periodLabel }
  }, [store.schedules, store.packages, historyMonth, historyYear])

  const historyTotalItems = activeHistoryData.items.length
  const historyTotalPages = Math.ceil(historyTotalItems / 6) || 1
  const validHistoryPage = Math.min(historyPage, historyTotalPages)
  const paginatedHistoryItems = activeHistoryData.items.slice((validHistoryPage - 1) * 6, validHistoryPage * 6)

  return <>
    {/* Sub-tab Navigation: Daftar Booking vs History Booking */}
    <div className="mb-5 border-b border-slate-100 pb-3.5 w-full">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
        <button
          type="button"
          onClick={() => setScheduleView('list')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition w-full ${
            scheduleView === 'list'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          <CalendarDays size={16} />
          Daftar Booking
        </button>
        <button
          type="button"
          onClick={() => setScheduleView('history')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition w-full ${
            scheduleView === 'history'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          <TrendingUp size={16} />
          History Booking
        </button>
      </div>
    </div>

    {scheduleView === 'history' ? (
      /* ==================== TAMPILAN HISTORY BOOKING ==================== */
      <div className="space-y-5">
        {/* Filter 2 Dropdown (Bulan dan Tahun) dengan style SearchableSelect */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Filter size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Filter History Booking</h3>
              <p className="text-xs text-slate-500">Pilih bulan dan tahun untuk melihat riwayat pelaksanaan jadwal</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            {/* Filter 1: Bulan */}
            <SearchableSelect
              options={['Semua Bulan', ...MONTH_NAMES]}
              value={historyMonth}
              onChange={(val) => {
                setHistoryMonth(val)
                setHistoryPage(1)
              }}
              placeholder="Pilih Bulan"
              searchPlaceholder="Cari bulan..."
              className="w-full sm:w-48 shrink-0"
              buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            />

            {/* Filter 2: Tahun */}
            <SearchableSelect
              options={['Semua Tahun', ...availableYears]}
              value={historyYear}
              onChange={(val) => {
                setHistoryYear(val)
                setHistoryPage(1)
              }}
              placeholder="Pilih Tahun"
              searchPlaceholder="Cari tahun..."
              className="w-full sm:w-44 shrink-0"
              buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            />
          </div>
        </div>

        {/* Ringkasan Pendapatan (Status Lunas) Berdasarkan Filter Bulan & Tahun */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500 to-teal-700 p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Total Pendapatan (Lunas)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-xs">
                <TrendingUp size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight">
              {rupiah(activeHistoryData.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-emerald-100">
              Periode: <span className="font-semibold">{activeHistoryData.periodLabel || 'Semua Waktu'}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Transaksi Lunas
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Check size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {activeHistoryData.lunasItems.length} Booking
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Booking berstatus lunas / selesai pada periode ini
            </p>
          </div>

          
        </div>

        {/* Tabel Tunggal Riwayat Reservasi (Disesuaikan dengan Filter Bulan & Tahun) */}
        {activeHistoryData.items.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-bold text-slate-700">
              <span>Daftar Riwayat Booking</span>
            </div>
            
            {/* Tampilan Mobile Card */}
            <div className="grid gap-3 p-3 md:hidden">
              {paginatedHistoryItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => setSelectedSchedule(item)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-rose-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.clientName}</h4>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">{item.packageName}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={item.status} />
                      <p className={`mt-1 text-xs font-bold ${item.status === 'Lunas' || item.status === 'Selesai' ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {rupiah(getBookingPrice(item, store.packages))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 font-medium text-slate-500">
                    <span>{formatDate(item.eventDate)} {item.eventTime ? `· ${item.eventTime} WIB` : ''}</span>
                    <span className="truncate max-w-[150px]">{item.location || 'Lokasi belum diisi'}</span>
                  </div>
                </article>
              ))}
            </div>

            {/* Tampilan Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Tanggal Pelaksanaan</th>
                    <th className="py-3 px-4">Nama Pelanggan</th>
                    <th className="py-3 px-4">Paket Rias</th>
                    <th className="py-3 px-4">Biaya / Nominal</th>
                    <th className="py-3 px-4">Lokasi Acara</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedHistoryItems.map((item) => (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => setSelectedSchedule(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedSchedule(item)
                        }
                      }}
                      className="cursor-pointer hover:bg-rose-50/50 focus:bg-rose-50/50 focus:outline-none transition"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {formatDate(item.eventDate)} {item.eventTime ? `· ${item.eventTime} WIB` : ''}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{item.clientName}</p>
                        {item.whatsapp && <p className="text-[11px] text-slate-400">{item.whatsapp}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.packageName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status === 'Lunas' || item.status === 'Selesai' ? (
                          <span className="font-bold text-emerald-700">{rupiah(getBookingPrice(item, store.packages))}</span>
                        ) : (
                          <span className="font-medium text-slate-500">{rupiah(getBookingPrice(item, store.packages))}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.location || 'Lokasi belum diisi'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSchedule(item)
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Riwayat Bulanan */}
            {historyTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/30">
                <AdminPagination
                  currentPage={validHistoryPage}
                  totalPages={historyTotalPages}
                  totalItems={historyTotalItems}
                  pageSize={6}
                  onPageChange={setHistoryPage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center bg-white">
            <CalendarDays className="mx-auto mb-2 text-slate-400" size={24} />
            <p className="text-sm font-semibold text-slate-700">Belum ada riwayat booking lunas pada periode ini</p>
            <p className="mt-1 text-xs text-slate-500">Pilih periode bulan atau tahun lain pada dropdown filter di atas.</p>
          </div>
        )}
      </div>
    ) : (
      /* ==================== TAMPILAN DAFTAR BOOKING AKTIF ==================== */
      <>
        {/* Header & Toolbar: Filter Bulan, Filter Tahun, Searching, Tambah Jadwal (Semua 1 baris) */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="shrink-0">
            <h2 className="text-lg font-bold text-slate-900">Jadwal Booking</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Berikut booking pelanggan</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-wrap items-center gap-2 lg:flex-nowrap w-full lg:w-auto">
            {/* Filter Bulan dan Tahun (Kanan Kiri / 2 Kolom di Mobile & Tablet) */}
            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:items-center">
              {/* Filter 1: Bulan */}
              <SearchableSelect
                options={['Semua Bulan', ...MONTH_NAMES]}
                value={selectedMonth}
                onChange={(val) => {
                  setSelectedMonth(val)
                  setCurrentPage(1)
                }}
                placeholder="Pilih Bulan"
                searchPlaceholder="Cari bulan..."
                className="w-full lg:w-48 shrink-0"
                buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
              />

              {/* Filter 2: Tahun */}
              <SearchableSelect
                options={['Semua Tahun', ...availableYears]}
                value={selectedYear}
                onChange={(val) => {
                  setSelectedYear(val)
                  setCurrentPage(1)
                }}
                placeholder="Pilih Tahun"
                searchPlaceholder="Cari tahun..."
                className="w-full lg:w-44 shrink-0"
                buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
              />
            </div>

            {/* Searching */}
            <div className="relative w-full lg:w-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Cari pelanggan, paket, lokasi..."
                className="field !py-2.5 !pl-9 !pr-7 text-sm min-h-[42px] h-[42px] !rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tombol Tambah Jadwal (Panjang sampai kanan-kiri di mobile) */}
            <button
              onClick={() => onOpen('schedule')}
              className="btn-primary !px-4 !py-2.5 text-sm min-h-[42px] h-[42px] shrink-0 whitespace-nowrap w-full lg:w-auto justify-center rounded-xl"
            >
              <Plus size={16} />Tambah jadwal
            </button>
          </div>
        </div>

        {paginated.length ? <>
          {/* Mobile Sort Options */}
          <div className="mb-3 flex items-center justify-between gap-2 px-0.5 md:hidden">
            <span className="text-xs font-medium text-slate-500">Urutkan:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'name') {
                    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  } else {
                    setSortBy('name')
                    setSortOrder('asc')
                  }
                  setCurrentPage(1)
                }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  sortBy === 'name'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>Nama</span>
                <ChevronsUpDown size={12} className={sortBy === 'name' ? 'text-rose-600' : 'text-slate-400'} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'date') {
                    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  } else {
                    setSortBy('date')
                    setSortOrder('asc')
                  }
                  setCurrentPage(1)
                }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  sortBy === 'date'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>Pelaksanaan</span>
                <ChevronsUpDown size={12} className={sortBy === 'date' ? 'text-rose-600' : 'text-slate-400'} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'status') {
                    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  } else {
                    setSortBy('status')
                    setSortOrder('asc')
                  }
                  setCurrentPage(1)
                }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  sortBy === 'status'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>Status</span>
                <ChevronsUpDown size={12} className={sortBy === 'status' ? 'text-rose-600' : 'text-slate-400'} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {paginated.map((item) => {
              const collisions = store.schedules.filter((other) => other.id !== item.id && hasScheduleCollision(other, item))
              return <article key={item.id} role="button" tabIndex={0} onClick={() => setSelectedSchedule(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSchedule(item) } }} className="min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition hover:border-rose-200 hover:bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-200 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-bold text-slate-900">{item.clientName}</h3>{collisions.length > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Bentrok</span>}</div><p className="mt-1 break-words text-xs font-semibold text-slate-700">{item.packageName}</p></div>
                  <div onClick={(event) => event.stopPropagation()}><RowActions onEdit={() => editSchedule(item)} onDelete={() => onDelete('schedules', item.id)} /></div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 min-[380px]:grid-cols-2">
                  <div><p className="text-[11px] font-bold uppercase text-slate-500">Pelaksanaan</p><p className="mt-1 text-xs font-semibold text-slate-800">{formatDate(item.eventDate)}{item.eventTime ? ` · ${item.eventTime} WIB` : ''}</p></div>
                  <div><p className="text-[11px] font-bold uppercase text-slate-500">Status</p><div className="mt-1"><StatusBadge status={item.status} /></div></div>
                  <div className="min-w-0 min-[380px]:col-span-2"><p className="text-[11px] font-bold uppercase text-slate-500">Lokasi</p><p className="mt-1 flex items-start gap-1 break-words text-xs font-medium text-slate-700"><MapPin size={14} className="mt-0.5 shrink-0 text-rose-500" />{item.location || 'Lokasi belum diisi'}</p></div>
                </div>
                {item.notes && <p className="mt-3 break-words border-t border-slate-100 pt-3 text-xs leading-5 text-slate-700"><span className="font-bold">Catatan:</span> {item.notes}</p>}
              </article>
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                  <th
                    className="py-3 pr-4 font-semibold cursor-pointer select-none hover:text-rose-600 transition"
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('name')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan berdasarkan nama pelanggan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NAMA PELANGGAN</span>
                      <ChevronsUpDown size={14} className={sortBy === 'name' ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-rose-600 transition"
                    onClick={() => {
                      if (sortBy === 'date') {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                      } else {
                        setSortBy('date')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan berdasarkan tanggal pelaksanaan (ASC: Terdekat, DESC: Terjauh)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>PELAKSANAAN</span>
                      <ChevronsUpDown size={14} className={sortBy === 'date' ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold">Paket</th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-rose-600 transition"
                    onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('status')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan berdasarkan status booking"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>STATUS</span>
                      <ChevronsUpDown size={14} className={sortBy === 'status' ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="py-3 pl-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => {
                  const collisions = store.schedules.filter((other) => other.id !== item.id && hasScheduleCollision(other, item))
                  return <tr key={item.id} tabIndex={0} onClick={() => setSelectedSchedule(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSchedule(item) } }} className="cursor-pointer border-b border-slate-100 bg-white transition last:border-0 hover:bg-rose-50/50 focus:bg-rose-50/50 focus:outline-none">
                    <td className="py-3 pr-4 align-top">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-800">{item.clientName}</span>{collisions.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">Bentrok</span>}</div>
                      {item.notes && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-600">Catatan:</span> {item.notes}</p>}
                    </td>
                    <td className="px-4 py-3 align-top"><p className="text-sm font-semibold text-slate-800">{formatDate(item.eventDate)}</p>{item.eventTime && <p className="mt-1 text-xs text-slate-500">{item.eventTime} WIB</p>}<p className="mt-1.5 flex items-start gap-1 text-xs leading-5 text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-rose-500" />{item.location || 'Lokasi belum diisi'}</p></td>
                    <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">{item.packageName}</td>
                    <td className="px-4 py-3 align-top"><StatusBadge status={item.status} /></td>
                    <td className="py-3 pl-4 text-right align-top" onClick={(event) => event.stopPropagation()}><RowActions onEdit={() => editSchedule(item)} onDelete={() => onDelete('schedules', item.id)} /></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={6}
            onPageChange={setCurrentPage}
          />
        </> : (
          search || selectedMonth !== 'Semua Bulan' || selectedYear !== 'Semua Tahun' ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <Search className="mx-auto mb-2 text-slate-400" size={20} />
              <p className="text-sm font-semibold text-slate-700">Booking tidak ditemukan</p>
              <p className="mt-1 text-xs text-slate-500">Coba ubah filter bulan atau kata kunci pencarian.</p>
            </div>
          ) : (
            <EmptyState label="Belum ada booking tercatat." />
          )
        )}
      </>
    )}
    {selectedSchedule && (
      <ScheduleDetailsModal
        schedule={selectedSchedule}
        collisions={scheduleView === 'history' ? [] : store.schedules.filter((item) => item.id !== selectedSchedule.id && hasScheduleCollision(item, selectedSchedule))}
        onClose={() => setSelectedSchedule(null)}
        onEdit={scheduleView === 'history' ? undefined : () => editSchedule(selectedSchedule)}
      />
    )}
  </>
}

function StatusBadge({ status }: { status: Schedule['status'] }) {
  const cls =
    status === 'Lunas'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'DP'
      ? 'bg-amber-50 text-amber-700'
      : status === 'Selesai'
      ? 'bg-purple-50 text-purple-700'
      : 'bg-sky-50 text-sky-700'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{status}</span>
}

function ScheduleDetailsModal({ schedule, collisions, onClose, onEdit }: { schedule: Schedule; collisions: Schedule[]; onClose: () => void; onEdit?: () => void }) {
  return <ModalFrame onClose={onClose}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-rose-600">Detail booking</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{schedule.clientName}</h2></div>
      <button aria-label="Tutup" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><X size={19} /></button>
    </div>
    {collisions.length > 0 && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">Jadwal bentrok dengan {collisions.map((item) => item.clientName).join(', ')}</p>}
    <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
      <div><p className="text-xs font-semibold text-slate-500">Pelaksanaan</p><p className="mt-1 font-bold text-slate-900">{formatDate(schedule.eventDate)}</p>{schedule.eventTime && <p className="text-sm font-medium text-slate-700">{schedule.eventTime} WIB</p>}</div>
      <div><p className="text-xs font-semibold text-slate-500">Status</p><div className="mt-2"><StatusBadge status={schedule.status} /></div></div>
      <div><p className="text-xs font-semibold text-slate-500">Paket</p><p className="mt-1 font-bold text-slate-900">{schedule.packageName}</p></div>
      <div><p className="text-xs font-semibold text-slate-500">Lokasi</p><p className="mt-1 font-semibold text-slate-800">{schedule.location || 'Belum diisi'}</p></div>
      {schedule.whatsapp && <div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-500">WhatsApp</p><a className="mt-1 inline-flex font-semibold text-emerald-700 hover:underline" href={`https://wa.me/${schedule.whatsapp}`} target="_blank" rel="noreferrer">+{schedule.whatsapp}</a></div>}
      <div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-500">Catatan</p><p className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{schedule.notes || 'Tidak ada catatan.'}</p></div>
    </div>
    <div className="mt-5 flex justify-end">
      {onEdit ? (
        <button type="button" onClick={onEdit} className="btn-primary"><Edit3 size={16} />Edit jadwal</button>
      ) : (
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Tutup</button>
      )}
    </div>
  </ModalFrame>
}

function GalleryManager({
  store,
  onOpen,
  onDelete,
  onSavePortfolioConfig,
}: {
  store: SalonStore
  onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category) => void
  onDelete: (collection: 'packages' | 'schedules' | 'gallery', id: string) => void
  onSavePortfolioConfig: (source: 'fouita' | 'gallery', fouitaInput: string) => void
}) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const initialSource: 'fouita' | 'gallery' =
    store.profile.portfolioSource === 'gallery' ? 'gallery' : 'fouita'
  const [selectedSource, setSelectedSource] = useState<'fouita' | 'gallery'>(initialSource)
  const [fouitaUrlInput, setFouitaUrlInput] = useState(
    store.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL
  )

  useEffect(() => {
    setSelectedSource(store.profile.portfolioSource === 'gallery' ? 'gallery' : 'fouita')
    setFouitaUrlInput(store.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL)
  }, [store.profile.portfolioSource, store.profile.portfolioFouitaUrl])

  // Otomatis reset ke halaman pertama saat ada foto portfolio baru ditambahkan
  const prevCountRef = useRef(store.gallery.length)
  useEffect(() => {
    if (store.gallery.length > prevCountRef.current) {
      setCurrentPage(1)
    }
    prevCountRef.current = store.gallery.length
  }, [store.gallery.length])

  const filtered = useMemo(() => {
    let list = store.gallery
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((g) =>
        g.title.toLowerCase().includes(q) ||
        (g.category && g.category.toLowerCase().includes(q)) || (g.eventType && g.eventType.toLowerCase().includes(q)) ||
        g.tag.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      )
    }
    return list
  }, [store.gallery, search])

  const totalItems = filtered.length
  const totalPages = Math.ceil(totalItems / 6) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((validPage - 1) * 6, validPage * 6)

  const activeFouitaUrl = parseFouitaConfig(
    store.profile.portfolioFouitaUrl || DEFAULT_FOUITA_SCRIPT_URL
  ).url
  const isFouitaActive = store.profile.portfolioSource !== 'gallery' && Boolean(activeFouitaUrl)
  const autoFallbackTimeText = useMemo(() => {
    const raw = store.profile.portfolioAutoFallbackAt
    if (!raw) return ''
    const parsedDate = new Date(raw)
    if (Number.isNaN(parsedDate.getTime())) return ''
    return parsedDate.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [store.profile.portfolioAutoFallbackAt])

  function handleSourceSwitch(nextSource: 'fouita' | 'gallery') {
    setSelectedSource(nextSource)
    if (nextSource === 'gallery') {
      onSavePortfolioConfig('gallery', fouitaUrlInput)
    } else if (parseFouitaConfig(fouitaUrlInput).url) {
      onSavePortfolioConfig('fouita', fouitaUrlInput)
    }
  }

  return <>
    {/* Pengaturan Switch Sumber Feed Halaman Portfolio Publik (Fouita <-> Foto Manual) */}
    <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">Sumber Portfolio Publik</h3>
          <p className="mt-0.5 text-xs text-slate-600 truncate">
            Instagram:{' '}
            <a
              href={store.profile.instagramUrl || 'https://www.instagram.com/desyana_77/'}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-rose-600 underline"
            >
              {store.profile.instagram || '@desyana_77'}
            </a>
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200/70 bg-white px-3.5 py-2 shadow-2xs sm:justify-end">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
              isFouitaActive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isFouitaActive ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            {isFouitaActive ? 'Fouita IG (Otomatis)' : 'Foto Manual (Galeri)'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isFouitaActive}
            aria-label="Switch antara Fouita IG dan Foto Manual"
            onClick={() => handleSourceSwitch(isFouitaActive ? 'gallery' : 'fouita')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-300 ${
              isFouitaActive ? 'bg-rose-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                isFouitaActive ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {!isFouitaActive && autoFallbackTimeText && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          <p>
            <strong>Auto-switch aktif ({autoFallbackTimeText}):</strong> Fouita kosong/kuota 1.000 habis, dialihkan ke <strong>Foto Manual</strong>.
          </p>
          <button
            type="button"
            onClick={() => handleSourceSwitch('fouita')}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700 transition"
          >
            Aktifkan Fouita Lagi
          </button>
        </div>
      )}

      {selectedSource === 'fouita' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSavePortfolioConfig('fouita', fouitaUrlInput)
          }}
          className="mt-3 space-y-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              required
              value={fouitaUrlInput}
              onChange={(e) => setFouitaUrlInput(e.target.value)}
              placeholder="Tempel link Fouita (https://wdg.fouita.com/widgets/0x57ed64.js) atau kode embed-nya"
              className="field flex-1 !py-2.5 text-xs sm:text-sm min-h-[42px] bg-white"
            />
            <button type="submit" className="btn-primary !px-4 !py-2.5 text-xs sm:text-sm min-h-[42px] shrink-0 justify-center">
              <Check size={15} /> Simpan Widget
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Feed IG dari{' '}
            <a
              href="https://fouita.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-rose-600 underline"
            >
              Fouita
            </a>
            . Jika kuota 1.000 habis/kosong, otomatis pindah ke <strong>Foto Manual</strong> (switch kembali secara manual saat kuota terisi).
          </p>
        </form>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
          Portfolio publik sedang menampilkan <strong>Foto Manual</strong> di bawah (tanpa batas views). Geser switch di atas untuk kembali ke Fouita.
        </p>
      )}
    </div>

    {/* Header & Toolbar: Searching di sebelah kiri tombol Tambah Foto (Semua 1 baris) */}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="shrink-0">
        <h2 className="text-lg font-bold text-slate-900">Kelola Foto Portfolio</h2>
      </div>

      <div className="flex flex-nowrap items-center gap-2 w-full sm:w-auto">
        {/* Searching */}
        <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari foto, momen, tag..."
            className="field !py-2.5 !pl-9 !pr-7 text-xs sm:text-sm min-h-[42px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setCurrentPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tombol Tambah Foto */}
        <button
          onClick={() => onOpen('gallery')}
          className="btn-primary !px-3.5 sm:!px-4 !py-2.5 text-xs sm:text-sm min-h-[42px] shrink-0 whitespace-nowrap"
        >
          <Plus size={16} />Tambah foto
        </button>
      </div>
    </div>

    {paginated.length ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {paginated.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="relative h-40">
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{item.category || item.eventType}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500">{item.tag}</p>
              </div>
              <RowActions onEdit={() => onOpen('gallery', item)} onDelete={() => onDelete('gallery', item.id)} />
            </div>
          </article>
        ))}
      </div>
      <AdminPagination
        currentPage={validPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={6}
        onPageChange={setCurrentPage}
      />
    </> : (
      search ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Search className="mx-auto mb-2 text-slate-400" size={20} />
          <p className="text-sm font-semibold text-slate-700">Foto portfolio tidak ditemukan</p>
          <p className="mt-1 text-xs text-slate-500">Coba kata kunci pencarian yang lain.</p>
        </div>
      ) : (
        <EmptyState label="Belum ada foto portfolio." />
      )
    )}
  </>
}

function CertificatesManager({
  store,
  onOpen,
  onDelete,
}: {
  store: SalonStore
  onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate) => void
  onDelete: (collection: 'packages' | 'schedules' | 'gallery' | 'certificates', id: string) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)

  // Otomatis reset ke halaman pertama saat ada sertifikat baru ditambahkan
  const prevCountRef = useRef(store.certificates.length)
  useEffect(() => {
    if (store.certificates.length > prevCountRef.current) {
      setCurrentPage(1)
    }
    prevCountRef.current = store.certificates.length
  }, [store.certificates.length])

  const pageSize = 6
  const totalItems = store.certificates.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = store.certificates.slice((validPage - 1) * pageSize, validPage * pageSize)

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola Sertifikat</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Foto sertifikat keahlian dan lisensi resmi studio Desy Salon
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen('certificate')}
          className="btn-primary !px-4 !py-2.5 text-xs sm:text-sm w-full justify-center sm:w-auto shrink-0"
        >
          <Plus size={16} /> Tambah Sertifikat
        </button>
      </div>

      {paginated.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((item) => (
              <article
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition hover:border-rose-200"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title || 'Sertifikat'}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 p-3">
                  <span className="truncate text-xs font-semibold text-slate-700" title={item.title || 'Sertifikat Resmi'}>
                    {item.title || 'Sertifikat Resmi'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Edit"
                      title="Edit"
                      onClick={() => onOpen('certificate', item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus"
                      title="Hapus"
                      onClick={() => onDelete('certificates', item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <AdminPagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyState label="Belum ada sertifikat yang diunggah. Klik 'Tambah Sertifikat' untuk menambahkan." />
      )}
    </>
  )
}

function FaqManager({
  store,
  onOpen,
  onDelete,
}: {
  store: SalonStore
  onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) => void
  onDelete: (collection: 'packages' | 'schedules' | 'gallery' | 'certificates' | 'faqs', id: string) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 6

  // Otomatis reset ke data terbaru dan halaman pertama saat ada FAQ baru ditambahkan
  const prevCountRef = useRef(store.faqs.length)
  useEffect(() => {
    if (store.faqs.length > prevCountRef.current) {
      setCategoryFilter('Semua')
      setSearchQuery('')
      setCurrentPage(1)
    }
    prevCountRef.current = store.faqs.length
  }, [store.faqs.length])

  const categories = useMemo(() => {
    const list = Array.from(new Set(['Tata Rias', 'Layanan Salon', ...store.faqs.map((f) => f.category).filter(Boolean)]))
    return ['Semua Kategori', ...list]
  }, [store.faqs])

  const filteredFaqs = useMemo(() => {
    return store.faqs.filter((item) => {
      const matchCat = categoryFilter === 'Semua' || item.category === categoryFilter
      const query = searchQuery.toLowerCase().trim()
      const matchSearch = !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
      return matchCat && matchSearch
    })
  }, [store.faqs, categoryFilter, searchQuery])

  const totalItems = filteredFaqs.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filteredFaqs.slice((validPage - 1) * pageSize, validPage * pageSize)

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">Kelola FAQ</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Daftar pertanyaan dan jawaban yang tampil pada section FAQ halaman utama
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 lg:flex-nowrap w-full lg:w-auto shrink-0">
          {/* Searching (bawah pada mode HP, kiri pada desktop) */}
          <div className="order-2 sm:order-1 relative w-full sm:w-56 lg:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Cari FAQ..."
              className="field !py-2.5 !pl-9 !pr-7 text-sm min-h-[42px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Kategori Dropdown & Tombol Tambah FAQ (atas berdampingan pada mode HP, kanan searching pada desktop) */}
          <div className="order-1 sm:order-2 grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <SearchableSelect
              options={categories}
              value={categoryFilter === 'Semua' ? 'Semua Kategori' : categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val === 'Semua Kategori' ? 'Semua' : val)
                setCurrentPage(1)
              }}
              placeholder="Filter Kategori"
              searchPlaceholder="Cari kategori..."
              className="w-full sm:w-48 shrink-0"
              buttonClassName="h-[42px] min-h-[42px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            />

            <button
              type="button"
              onClick={() => onOpen('faq')}
              className="btn-primary !px-3 sm:!px-4 !py-2.5 text-sm min-h-[42px] shrink-0 whitespace-nowrap justify-center w-full sm:w-auto"
            >
              <Plus size={16} /> Tambah FAQ
            </button>
          </div>
        </div>
      </div>

      {paginated.length ? (
        <>
          {/* Card Grid with 100% strict uniform height and width */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((item) => (
              <article
                key={item.id}
                className="group relative flex h-[240px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-rose-200 hover:shadow-xs"
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.category === 'Tata Rias'
                          ? 'border border-rose-100 bg-rose-50 text-rose-600'
                          : 'border border-sky-100 bg-sky-50 text-sky-600'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <h3
                    className="mt-2.5 h-11 text-sm font-bold leading-snug text-slate-900 line-clamp-2 overflow-hidden"
                    title={item.question}
                  >
                    {item.question}
                  </h3>
                  <p
                    className="mt-2 h-[72px] text-xs leading-relaxed text-slate-600 line-clamp-3 overflow-hidden"
                    title={item.answer}
                  >
                    {item.answer}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 truncate max-w-[140px]">
                    ID: {item.id}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Edit FAQ"
                      title="Edit"
                      onClick={() => onOpen('faq', item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus FAQ"
                      title="Hapus"
                      onClick={() => onDelete('faqs', item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <AdminPagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyState label="Belum ada FAQ yang sesuai. Klik 'Tambah FAQ' untuk menambahkan pertanyaan baru." />
      )}
    </>
  )
}

function SettingsManager({ store, onSave }: { store: SalonStore; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <>
    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-900">Pengaturan Akun</h2>
      <p className="mt-1 text-sm font-medium text-slate-600">Informasi profil admin</p>
    </div>
    <form onSubmit={onSave} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <div><label className="label" htmlFor="studio-name">Nama salon</label><input id="studio-name" className="field bg-slate-50" value={store.profile.name} readOnly /></div>
      <div><label className="label" htmlFor="studio-tag">Tagline</label><input id="studio-tag" className="field bg-slate-50" value={store.profile.tag} readOnly /></div>
      <div><label className="label" htmlFor="studio-phone">Nomor WhatsApp tujuan</label><input required id="studio-phone" name="phone" defaultValue={store.profile.phone} className="field" /><p className="mt-1 text-[11px] text-slate-500">Format internasional tanpa +, contoh 628123456789.</p></div>
      <div><label className="label" htmlFor="studio-hours">Jam operasional</label><input id="studio-hours" name="openingHours" defaultValue={store.profile.openingHours} className="field" /></div>
      
      {/* Media Sosial Studio */}
      <div className="md:col-span-2 mt-2 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800">Media Sosial Studio</h3>
        <p className="mt-0.5 text-xs text-slate-500">Tampil di footer website dan mengarahkan pengunjung langsung ke profil resmi.</p>
      </div>
      <div>
        <label className="label" htmlFor="studio-facebook">Nama Akun Facebook</label>
        <input id="studio-facebook" name="facebook" defaultValue={store.profile.facebook ?? initialStore.profile.facebook} className="field" placeholder={initialStore.profile.facebook} />
      </div>
      <div>
        <label className="label" htmlFor="studio-facebook-url">Link Profil Facebook</label>
        <input id="studio-facebook-url" name="facebookUrl" defaultValue={store.profile.facebookUrl ?? initialStore.profile.facebookUrl} className="field" placeholder={initialStore.profile.facebookUrl} />
      </div>
      <div>
        <label className="label" htmlFor="studio-instagram">Akun Instagram</label>
        <input id="studio-instagram" name="instagram" defaultValue={store.profile.instagram ?? '@desyana_77'} className="field" placeholder="@desyana_77" />
      </div>
      <div>
        <label className="label" htmlFor="studio-instagram-url">Link Profil Instagram</label>
        <input id="studio-instagram-url" name="instagramUrl" defaultValue={store.profile.instagramUrl ?? 'https://www.instagram.com/desyana_77/'} className="field" placeholder="https://www.instagram.com/..." />
        <p className="mt-1 text-[11px] text-slate-500">Digunakan pada footer dan tombol profil Instagram di menu Portfolio.</p>
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="studio-portfolio-fouita-url">Link Widget Fouita Instagram (Menu Portfolio)</label>
        <input
          id="studio-portfolio-fouita-url"
          name="portfolioFouitaUrl"
          type="text"
          defaultValue={store.profile.portfolioFouitaUrl ?? initialStore.profile.portfolioFouitaUrl ?? ''}
          className="field"
          placeholder="https://emb.fouita.com/widget/0x57ed64/ftj78d28e"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Masukkan URL embed / script widget Fouita atau tempel kode embed-nya untuk menampilkan feed Instagram di halaman Portfolio. Kosongkan jika ingin memakai Galeri Studio.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="studio-tiktok">Akun TikTok</label>
        <input id="studio-tiktok" name="tiktok" defaultValue={store.profile.tiktok ?? '@desyana.s'} className="field" placeholder="@desyana.s" />
      </div>
      <div>
        <label className="label" htmlFor="studio-tiktok-url">Link Profil TikTok</label>
        <input id="studio-tiktok-url" name="tiktokUrl" defaultValue={store.profile.tiktokUrl ?? 'https://www.tiktok.com/@desyana.s'} className="field" placeholder="https://www.tiktok.com/@..." />
      </div>

      <div className="md:col-span-2"><label className="label" htmlFor="studio-address">Alamat studio</label><input id="studio-address" name="address" defaultValue={store.profile.address} className="field" /></div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="studio-maps-url">Link Google Maps Studio</label>
        <input
          id="studio-maps-url"
          name="mapsUrl"
          defaultValue={store.profile.mapsUrl ?? 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'}
          className="field"
          placeholder="https://maps.app.goo.gl/..."
        />
      </div>
      <div className="md:col-span-2 mt-3 border-t border-slate-100 pt-5"><h3 className="text-sm font-bold text-slate-800">Kredensial login admin</h3><p className="mt-1 text-xs font-medium text-slate-600">Gunakan password minimal 6 karakter.</p></div>
      <div><label className="label" htmlFor="admin-user">Username</label><input required id="admin-user" name="username" defaultValue={store.credentials.username} className="field" /></div>
      <div><label className="label" htmlFor="admin-password">Password baru</label><input required minLength={6} id="admin-password" name="password" defaultValue={store.credentials.password} type="password" className="field" /></div>
      <div className="md:col-span-2"><button className="btn-primary mt-2"><Check size={16} />Simpan</button></div>
    </form>
  </>
}

function EntityModal({ editor, store, onClose, onSave }: {
  editor: { kind: EditorKind; item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem }
  store: SalonStore
  onClose: () => void
  onSave: (event: FormEvent<HTMLFormElement>, kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) => void
}) {
  const { kind, item } = editor
  const titles: Record<EditorKind, string> = {
    package: item ? 'Edit Paket' : 'Tambah Paket',
    schedule: item ? 'Edit Jadwal' : 'Tambah Jadwal',
    gallery: item ? 'Edit Foto Portfolio' : 'Tambah Foto Portfolio',
    category: item ? 'Edit Kategori' : 'Tambah Kategori',
    certificate: item ? 'Edit Sertifikat' : 'Tambah Sertifikat',
    faq: item ? 'Edit FAQ' : 'Tambah FAQ',
  }
  const packageItem = item as Package | undefined
  const scheduleItem = item as Schedule | undefined
  const galleryItem = item as GalleryItem | undefined
  const categoryItem = item as Category | undefined
  const certificateItem = item as Certificate | undefined
  const faqItem = item as FaqItem | undefined

  const [imageData, setImageData] = useState(
    kind === 'package' ? packageItem?.image ?? '' :
    kind === 'gallery' ? galleryItem?.imageUrl ?? '' :
    kind === 'certificate' ? certificateItem?.imageUrl ?? '' : ''
  )
  const [selectedFileName, setSelectedFileName] = useState('')
  const [imageError, setImageError] = useState('')
  const [scheduleDate, setScheduleDate] = useState(() => scheduleItem?.eventDate || getLocalIsoDate(new Date()))
  const [scheduleTime, setScheduleTime] = useState(() => scheduleItem?.eventTime || '09:00')
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null)

  const adminCollision = useMemo(() => {
    if (kind !== 'schedule' || !scheduleDate) return null
    return findScheduleCollision(
      { eventDate: scheduleDate, eventTime: scheduleTime },
      store.schedules,
      scheduleItem?.id
    )
  }, [kind, scheduleDate, scheduleTime, store.schedules, scheduleItem?.id])

  const input = (label: string, name: string, value = '', props: React.InputHTMLAttributes<HTMLInputElement> = {}, wrapperClass = '') => <div className={wrapperClass}><label className="label" htmlFor={`editor-${name}`}>{label}</label><input id={`editor-${name}`} name={name} defaultValue={value} className="field min-h-[48px] h-12" {...props} /></div>
  const select = (label: string, name: string, options: readonly string[], selected = '') => (
    <SearchableSelect
      label={label}
      name={name}
      options={options}
      defaultValue={selected || options[0]}
      searchPlaceholder={`Cari ${label.toLowerCase()}...`}
    />
  )
  const textarea = (label: string, name: string, value = '', placeholder = '') => <div className="sm:col-span-2"><label className="label" htmlFor={`editor-${name}`}>{label}</label><textarea id={`editor-${name}`} name={name} defaultValue={value} placeholder={placeholder} className="field min-h-20 resize-y" /></div>
  const imageField = (name: 'image' | 'imageUrl', label: string) => <div className="sm:col-span-2"><span className="label">{label} *</span><input type="hidden" name={name} value={imageData} /><label htmlFor="editor-image-file" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-rose-200 bg-rose-50/60 px-4 py-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"><Image size={17} />Pilih gambar dari perangkat<input id="editor-image-file" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" required={!imageData} className="sr-only" onChange={async (event) => { const file = event.currentTarget.files?.[0]; if (!file) return; const fileInput = event.currentTarget; setImageError(''); try { setImageData(await imageFileToDataUrl(file)); setSelectedFileName(file.name) } catch (error) { setImageError(error instanceof Error ? error.message : 'Gambar tidak dapat diproses.'); fileInput.value = '' } }} /></label><p className="mt-1.5 text-xs text-slate-400">PNG, JPG, atau JPEG. Maks. 15 MB; gambar akan diperkecil untuk penyimpanan.</p>{selectedFileName && <p className="mt-1 text-xs font-medium text-slate-600">File dipilih: {selectedFileName}</p>}{imageError && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{imageError}</p>}{imageData && <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 p-2.5"><img src={imageData} alt="Preview gambar" className="h-16 w-20 rounded-lg bg-slate-100 object-cover" /><span className="flex-1 text-xs font-medium text-slate-600">Preview gambar</span><button type="button" onClick={() => { setImageData(''); setSelectedFileName('') }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Hapus</button></div>}</div>

  const modalMaxWidth =
    kind === 'category' || kind === 'certificate'
      ? 'max-w-md'
      : kind === 'gallery' || kind === 'faq'
      ? 'max-w-xl sm:max-w-[680px]'
      : 'max-w-2xl sm:max-w-[760px]'

  return <ModalFrame onClose={onClose} maxWidth={modalMaxWidth}><div className="mb-5 flex items-start justify-between"><div><p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-rose-500">Studio Manager</p><h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900">{titles[kind]}</h2></div><button aria-label="Tutup" onClick={onClose} className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><form onSubmit={(event) => onSave(event, kind, item)} className="grid gap-4 sm:grid-cols-2">
    {kind === 'package' && <>
      {input('Nama paket *', 'name', packageItem?.name, { required: true, placeholder: 'Contoh: Akad Istimewa' })}
      <SearchableSelect
        label="Kategori *"
        name="category"
        options={store.categories.map((c) => c.name)}
        defaultValue={packageItem?.category}
        searchPlaceholder="Cari kategori..."
      />
      {input('Harga mulai / tetap (angka) *', 'price', packageItem ? String(packageItem.price) : '', { type: 'number', min: 1, required: true, placeholder: 'Contoh: 1850000' })}
      {input('Harga batas atas (rentang harga)', 'priceMax', packageItem?.priceMax ? String(packageItem.priceMax) : '', { type: 'number', min: 1, placeholder: 'Kosongkan jika salon / harga tetap' })}
      {imageField('image', 'Foto paket')}
      {textarea('Deskripsi', 'description', packageItem?.description, 'Ceritakan keunggulan paket...')}
      {textarea('Layanan (satu layanan per baris)', 'features', packageItem?.features.join('\n'), 'Makeup premium\nHairdo')}
      <p className="sm:col-span-2 -mt-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[11px] text-slate-600">
        💡 <strong>Ketentuan Harga:</strong> Untuk kategori <strong>Salon</strong> cukup isi <em>Harga mulai / tetap</em> (akan tampil harga tetap). Untuk <strong>Tata Rias</strong>, isi juga <em>Harga batas atas</em> agar tampil sebagai rentang harga (misal: <em>Rp 1.850.000 – Rp 2.500.000</em>).
      </p>
    </>}
    {kind === 'schedule' && <>
      {input('Nama klien *', 'clientName', scheduleItem?.clientName || '', { required: true, placeholder: 'Nama lengkap' })}
      {input('Nomor WhatsApp', 'whatsapp', scheduleItem?.whatsapp || '', { type: 'tel', placeholder: '628xxxxxxxxxx' })}
      <SearchableSelect
        label={scheduleItem ? 'Paket Layanan *' : 'Pilih Paket *'}
        name="packageName"
        options={store.packages.map((entry) => entry.name)}
        defaultValue={scheduleItem?.packageName}
        searchPlaceholder="Cari paket layanan..."
      />
      {select('Status', 'status', scheduleStatuses, scheduleItem?.status)}
      {/* Kolom 1: Tanggal acara */}
      <div className="w-full min-w-0">
        <CustomPinkDatePickerTrigger
          label="Tanggal acara *"
          name="eventDate"
          value={scheduleDate}
          isOpen={openPicker === 'date'}
          onToggle={(open) => setOpenPicker(open ? 'date' : null)}
        />
        {openPicker === 'date' && (
          <div className="mt-2 w-full animate-in fade-in duration-150">
            <DatePickerPanel
              value={scheduleDate}
              onChange={(val) => setScheduleDate(val)}
              onClose={() => setOpenPicker(null)}
              schedules={store.schedules}
            />
          </div>
        )}
      </div>

      {/* Kolom 2: Waktu acara */}
      <div className="w-full min-w-0">
        <CustomPinkTimePickerTrigger
          label="Waktu acara (WIB)"
          name="eventTime"
          value={scheduleTime}
          isOpen={openPicker === 'time'}
          onToggle={(open) => setOpenPicker(open ? 'time' : null)}
        />
        {openPicker === 'time' && (
          <div className="mt-2 w-full animate-in fade-in duration-150">
            <TimePickerPanel
              value={scheduleTime}
              date={scheduleDate}
              schedules={store.schedules}
              excludeId={scheduleItem?.id}
              allowBookedSelection={true}
              onChange={(val) => setScheduleTime(val)}
              onClose={() => setOpenPicker(null)}
            />
          </div>
        )}
      </div>

      {adminCollision && (
        <div className="sm:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Peringatan Jadwal Bentrok</p>
            <p>
              Tanggal {formatDate(scheduleDate)} {scheduleTime ? `pukul ${scheduleTime} WIB` : ''} berdekatan dengan pesanan <strong>{adminCollision.clientName}</strong> ({adminCollision.packageName} pukul {adminCollision.eventTime || adminCollision.session} WIB). Layanan membutuhkan jeda minimal 2 jam.
            </p>
          </div>
        </div>
      )}
      {textarea('Lokasi rias', 'location', scheduleItem?.location, 'Gedung / alamat lengkap pelaksanaan...')}
      {textarea('Catatan', 'notes', scheduleItem?.notes, 'Kebutuhan khusus atau catatan tambahan...')}
    </>}
    {kind === 'gallery' && <>
      {input('Judul gaya *', 'title', galleryItem?.title, { required: true, placeholder: 'Contoh: Seruni di Pagi Akad' })}
      <SearchableSelect
        label="Jenis Kategori *"
        name="category"
        options={store.categories.map((c) => c.name)}
        defaultValue={galleryItem?.category || (galleryItem?.eventType ? 'Tata Rias' : store.categories[0]?.name || 'Tata Rias')}
        searchPlaceholder="Pilih jenis kategori..."
      />
      {input('Tag', 'tag', galleryItem?.tag, { placeholder: 'Soft glam / Adat Jawa' }, 'sm:col-span-2')}
      {imageField('imageUrl', 'Foto galeri')}
      {textarea('Deskripsi', 'description', galleryItem?.description, 'Deskripsi singkat foto...')}
    </>}
    {kind === 'category' && <div className="sm:col-span-2 space-y-3">
      {input('Nama kategori *', 'categoryName', categoryItem?.name, { required: true, placeholder: 'Contoh: Prewedding, Hijab, Treatment' })}
      <p className="text-xs text-slate-500">Kategori baru akan langsung tampil sebagai tombol filter di menu katalog publik.</p>
    </div>}
    {kind === 'certificate' && <>
      {imageField('image', 'Foto Sertifikat')}
      {input('Keterangan / Nama Sertifikat (opsional)', 'title', certificateItem?.title, { placeholder: 'Contoh: Sertifikat Tata Rias Pengantin' }, 'sm:col-span-2')}
    </>}
    {kind === 'faq' && <>
      <SearchableSelect
        label="Kategori FAQ *"
        name="category"
        options={['Tata Rias', 'Layanan Salon']}
        defaultValue={faqItem?.category || 'Tata Rias'}
        searchPlaceholder="Pilih atau cari kategori..."
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <label className="label" htmlFor="editor-question">Pertanyaan *</label>
        <input
          id="editor-question"
          name="question"
          defaultValue={faqItem?.question}
          required
          placeholder="Contoh: Apakah saya harus melakukan reservasi sebelum datang ke Desy Salon?"
          className="field"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="editor-answer">Jawaban *</label>
        <textarea
          id="editor-answer"
          name="answer"
          defaultValue={faqItem?.answer}
          required
          placeholder="Tuliskan jawaban yang detail, jelas, dan ramah..."
          className="field min-h-24 resize-y"
        />
      </div>
    </>}
    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" onClick={onClose} className="btn-secondary !px-5 !py-3 !text-sm sm:!text-base">Batal</button><button type="submit" className="btn-primary !px-6 !py-3 !text-sm sm:!text-base"><Check size={18} />Simpan</button></div>
  </form></ModalFrame>
}

function ModalFrame({
  children,
  onClose,
  maxWidth = 'max-w-xl',
  contentPadding = 'p-4 sm:p-6',
  overflowClass = 'overflow-y-auto',
}: {
  children: ReactNode
  onClose: () => void
  maxWidth?: string
  contentPadding?: string
  overflowClass?: string
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-xs sm:p-4"><div role="dialog" aria-modal="true" className={`my-auto max-h-[92dvh] w-full ${maxWidth} ${overflowClass} rounded-2xl border border-rose-100/80 bg-white ${contentPadding} shadow-2xl`}>{children}</div></div>
}

function ConfirmationModal({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  return <ModalFrame onClose={onCancel}>
    <div className="flex items-start gap-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={20} /></span>
      <div><h2 className="text-lg sm:text-xl font-bold text-slate-900">Konfirmasi</h2><p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">{message}</p></div>
    </div>
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="btn-secondary !px-5 !py-3 !text-sm sm:!text-base">Batal</button>
      <button type="button" onClick={onConfirm} className="btn-primary !px-6 !py-3 !text-sm sm:!text-base !bg-rose-600 hover:!bg-rose-700">Oke</button>
    </div>
  </ModalFrame>
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div role="status" className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Check size={14} /></span><p className="flex-1 text-sm leading-5 text-slate-700">{message}</p><button aria-label="Tutup notifikasi" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"><X size={16} /></button></div>
}

export default App
