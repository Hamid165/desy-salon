import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle, ArrowRight, Award, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Clock3,
  Edit3, Facebook, Filter, Heart, HelpCircle, Home, Image, Instagram, LayoutDashboard, LogOut, MapPin, Menu, MessageCircle,
  Music2, PackageCheck, Plus, Search, Sparkles, Trash2, TrendingUp, User, X,
} from 'lucide-react'
import brandLogo from './assets/logo-desyana-v2.png'
import { initialStore } from './data'
import type { Category, Certificate, FaqItem, GalleryItem, Package, SalonStore, Schedule } from './types'
import { api } from './services/api'

const STORE_KEY = 'desy-salon-store-v1'
const legacyAddresses = [
  'Jl. Melati Indah No. 18, Yogyakarta',
  'Jl. Desa Pekuncen No.15, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
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
const scheduleStatuses = ['Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas'] as const
const eventTypes = ['Akad Nikah', 'Resepsi Adat', 'Wisuda & Pesta'] as const
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const
const publicRoutes = ['/', '/paket', '/sertifikat'] as const
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
      if (!profile.tiktok) profile.tiktok = initialStore.profile.tiktok
      if (!profile.tiktokUrl) profile.tiktokUrl = initialStore.profile.tiktokUrl
      if (!profile.mapsUrl || profile.mapsUrl === 'https://share.google/25K2BGNsWXDmZ9Q69') {
        profile.mapsUrl = initialStore.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'
      }

      const credentials = { ...initialStore.credentials, ...parsed.credentials }
      if ((parsed.credentials?.username === 'desy' && parsed.credentials.password === 'desy') || (parsed.credentials?.username === 'admin' && parsed.credentials.password === 'admin123')) {
        Object.assign(credentials, initialStore.credentials)
      }
      const packages: Package[] = (parsed.packages ?? initialStore.packages).map((pkg) => {
        const init = initialStore.packages.find((p) => p.id === pkg.id)
        return {
          ...pkg,
          priceMax: pkg.priceMax ?? init?.priceMax,
        }
      })
      const schedules: Schedule[] = parsed.schedules?.map((schedule) => ({
        ...schedule,
        status: schedule.status === 'Selesai' ? 'Lunas' : schedule.status,
      })) ?? [...initialStore.schedules]
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
      return { ...initialStore, ...parsed, packages, certificates, faqs, profile, credentials, schedules }
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

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  return digits ? `62${digits}` : ''
}

function whatsappLink(phone: string) {
  const clean = normalizePhone(phone)
  return `https://wa.me/${clean}`
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

function getLocalIsoTime(d: Date) {
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function sessionForTime(value: string): Schedule['session'] {
  const hour = Number(value.split(':')[0])
  return hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : 'Sore'
}

function hasScheduleCollision(first: Schedule, second: Schedule) {
  if (first.eventDate !== second.eventDate) return false
  if (first.session === 'Full Day' || second.session === 'Full Day') return true
  if (first.eventTime && second.eventTime) return first.eventTime === second.eventTime
  return first.session === second.session
}

function findScheduleCollision(
  candidate: { eventDate: string; eventTime?: string; session?: Schedule['session'] },
  schedules: Schedule[],
  excludeId?: string
): Schedule | undefined {
  const candidateSession = candidate.session || (candidate.eventTime ? sessionForTime(candidate.eventTime) : 'Full Day')
  return schedules.find((s) => {
    if (excludeId && s.id === excludeId) return false
    if (s.eventDate !== candidate.eventDate) return false
    if (s.session === 'Full Day' || candidateSession === 'Full Day') return true
    if (s.eventTime && candidate.eventTime) return s.eventTime === candidate.eventTime
    return s.session === candidateSession
  })
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

  useEffect(() => {
    if (page === 'admin') {
      document.title = 'Studio Manager | Desy Salon'
    } else if (page === 'login') {
      document.title = 'Login Pengelola | Desy Salon'
    } else if (publicRoute === '404') {
      document.title = '404 - Halaman Tidak Ditemukan | Desy Salon'
    } else if (publicRoute === '/paket') {
      document.title = 'Katalog Layanan & Paket | Desy Salon'
    } else if (publicRoute === '/sertifikat') {
      document.title = 'Sertifikat Resmi | Desy Salon'
    } else {
      document.title = `${store.profile.name} - Tata Rias Pengantin & Beauty Salon`
    }
  }, [page, publicRoute, store.profile.name])

  useEffect(() => {
    async function loadBackendData() {
      try {
        const health = await api.health.check().catch(() => null)
        if (health?.status === 'ok') {
          const [categories, packages, schedules, gallery, profile, certificates, faqs] = await Promise.all([
            api.categories.list().catch(() => null),
            api.packages.list().catch(() => null),
            api.schedules.list().catch(() => null),
            api.gallery.list().catch(() => null),
            api.profile.get().catch(() => null),
            api.certificates.list().catch(() => null),
            api.faqs.list().catch(() => null),
          ])

          setStore((current) => ({
            ...current,
            categories: categories && categories.length > 0 ? categories : current.categories,
            packages: packages && packages.length > 0 ? packages : current.packages,
            schedules: schedules && schedules.length > 0 ? schedules : current.schedules,
            gallery: gallery && gallery.length > 0 ? gallery : current.gallery,
            profile: profile ? { ...current.profile, ...profile } : current.profile,
            certificates: certificates && certificates.length > 0 ? certificates : current.certificates,
            faqs: faqs && faqs.length > 0 ? faqs : current.faqs,
          }))

          try {
            const authCheck = await api.auth.me()
            if (authCheck.authenticated && window.location.pathname === '/admin') {
              setPage('admin')
            }
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Backend offline, menggunakan data lokal:', err)
      }
    }
    loadBackendData()
  }, [])

  // Reset pagination when category or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, search])

  function navigatePublic(route: PublicRoute) {
    const target = route === '404' ? '/' : route
    if (window.location.pathname !== target) window.history.pushState({}, '', target)
    setPublicRoute(route)
    setMenuOpen(false)
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
        originalPrice: value('originalPrice') ? Number(value('originalPrice')) : undefined,
        badge: value('badge') || undefined, image: value('image'), description: value('description'),
        features: value('features').split('\n').map((feature) => feature.trim()).filter(Boolean),
      }
      setStore((current) => ({ ...current, packages: item ? current.packages.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.packages] }))
      if (item) api.packages.update(id, entity).catch((e) => console.warn('Gagal update paket ke backend:', e))
      else api.packages.create(entity).catch((e) => console.warn('Gagal simpan paket ke backend:', e))
    }
    if (kind === 'schedule') {
      const eventTime = value('eventTime') || undefined
      const previousSchedule = item as Schedule | undefined
      const entity: Schedule = {
        id,
        clientName: previousSchedule?.clientName ?? value('clientName'),
        packageName: previousSchedule?.packageName ?? value('packageName'),
        eventDate: value('eventDate'),
        eventTime,
        whatsapp: previousSchedule?.whatsapp ?? (value('whatsapp') || undefined),
        session: eventTime ? sessionForTime(eventTime) : previousSchedule?.session ?? 'Full Day',
        location: value('location'),
        notes: value('notes'),
        status: value('status') as Schedule['status'],
      }
      scheduleCollision = store.schedules.find((entry) => entry.id !== id && hasScheduleCollision(entry, entity))
      setStore((current) => ({ ...current, schedules: item ? current.schedules.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.schedules] }))
      if (item) api.schedules.update(id, entity).catch((e) => console.warn('Gagal update jadwal ke backend:', e))
      else api.schedules.create(entity, true).catch((e) => console.warn('Gagal simpan jadwal ke backend:', e))
    }
    if (kind === 'gallery') {
      const entity: GalleryItem = {
        id, title: value('title'), eventType: value('eventType') as GalleryItem['eventType'], tag: value('tag'),
        imageUrl: value('imageUrl'), description: value('description'),
      }
      setStore((current) => ({ ...current, gallery: item ? current.gallery.map((entry) => entry.id === id ? entity : entry) : [entity, ...current.gallery] }))
      if (item) api.gallery.update(id, entity).catch((e) => console.warn('Gagal update galeri ke backend:', e))
      else api.gallery.create(entity).catch((e) => console.warn('Gagal simpan galeri ke backend:', e))
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
      if (item) api.certificates.update(id, entity).catch((e) => console.warn('Gagal update sertifikat ke backend:', e))
      else api.certificates.create(entity).catch((e) => console.warn('Gagal simpan sertifikat ke backend:', e))
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
      if (item) api.faqs.update(id, entity).catch((e) => console.warn('Gagal update FAQ ke backend:', e))
      else api.faqs.create(entity).catch((e) => console.warn('Gagal simpan FAQ ke backend:', e))
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
        categories: item ? current.categories.map((c) => c.id === id ? entity : c) : [...current.categories, entity],
      }))
      if (item) api.categories.update(id, entity).catch((e) => console.warn('Gagal update kategori ke backend:', e))
      else api.categories.create(entity).catch((e) => console.warn('Gagal simpan kategori ke backend:', e))
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
        if (collection === 'packages') api.packages.delete(id).catch((e) => console.warn('Gagal hapus paket di backend:', e))
        if (collection === 'schedules') api.schedules.delete(id).catch((e) => console.warn('Gagal hapus jadwal di backend:', e))
        if (collection === 'gallery') api.gallery.delete(id).catch((e) => console.warn('Gagal hapus galeri di backend:', e))
        if (collection === 'certificates') api.certificates.delete(id).catch((e) => console.warn('Gagal hapus sertifikat di backend:', e))
        if (collection === 'faqs') api.faqs.delete(id).catch((e) => console.warn('Gagal hapus FAQ di backend:', e))
        setNotice('Data berhasil dihapus.')
      },
    })
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const rawPhone = String(form.get('phone') ?? '')
    const phone = normalizePhone(rawPhone)
    const username = String(form.get('username') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const facebook = String(form.get('facebook') ?? '').trim() || initialStore.profile.facebook
    const facebookUrl = String(form.get('facebookUrl') ?? '').trim() || initialStore.profile.facebookUrl
    const instagram = String(form.get('instagram') ?? '').trim() || '@desyana_77'
    const instagramUrl = String(form.get('instagramUrl') ?? '').trim() || 'https://www.instagram.com/desyana_77/'
    const tiktok = String(form.get('tiktok') ?? '').trim() || '@desyana.s'
    const tiktokUrl = String(form.get('tiktokUrl') ?? '').trim() || 'https://www.tiktok.com/@desyana.s'
    const mapsUrl = String(form.get('mapsUrl') ?? '').trim() || initialStore.profile.mapsUrl || 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9'

    if (!/^62\d{8,13}$/.test(phone)) return setNotice('Nomor WhatsApp harus valid, contoh: 082135221177 atau 6282135221177.')
    if (!username || password.length < 6) return setNotice('Username wajib diisi dan password minimal 6 karakter.')
    setStore((current) => ({
      ...current,
      profile: {
        ...current.profile,
        phone,
        address: String(form.get('address') ?? '').trim(),
        mapsUrl,
        openingHours: String(form.get('openingHours') ?? '').trim(),
        facebook,
        facebookUrl,
        instagram,
        instagramUrl,
        tiktok,
        tiktokUrl,
      },
      credentials: { username, password },
    }))
    api.profile.update({
      name: store.profile.name,
      tag: store.profile.tag,
      phone,
      address: String(form.get('address') ?? '').trim(),
      mapsUrl,
      openingHours: String(form.get('openingHours') ?? '').trim(),
      facebook,
      facebookUrl,
      instagram,
      instagramUrl,
      tiktok,
      tiktokUrl,
    }).catch((e) => console.warn('Gagal update profil ke backend:', e))
    api.auth.updateCredentials(username, password).catch((e) => console.warn('Gagal update kredensial admin ke backend:', e))
    setNotice('Pengaturan akun berhasil diperbarui.')
  }

  function removeCategory(category: Category) {
    if (store.packages.some((item) => item.category === category.name)) return setNotice('Kategori masih dipakai paket. Pindahkan atau hapus paket terkait terlebih dahulu.')
    setConfirmation({
      message: `Yakin ingin menghapus kategori "${category.name}"?`,
      onConfirm: () => {
        setStore((current) => ({ ...current, categories: current.categories.filter((entry) => entry.id !== category.id) }))
        api.categories.delete(category.id).catch((e) => console.warn('Gagal hapus kategori di backend:', e))
        setNotice('Kategori berhasil dihapus.')
      },
    })
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bookingPackage) return
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '').trim()
    const time = String(form.get('time') ?? '').trim()
    const clientName = String(form.get('clientName') ?? '').trim()
    const phone = normalizePhone(String(form.get('phone') ?? ''))
    
    // Validasi semua field wajib diisi
    if (!clientName || !phone || !date || !time) {
      setNotice('Semua bidang (nama, nomor WhatsApp, tanggal, dan waktu acara WIB) wajib diisi.')
      return
    }
    if (!/^62\d{8,13}$/.test(phone)) {
      setNotice('Nomor WhatsApp harus valid, contoh: 081234567890.')
      return
    }

    const bookingTimestamp = new Date(`${date}T${time}:00`).getTime()
    const minAllowedTimestamp = Date.now() + 24 * 60 * 60 * 1000 - 60000
    if (isNaN(bookingTimestamp) || bookingTimestamp < minAllowedTimestamp) {
      setNotice('Pemesanan ditolak: Jadwal booking wajib dilakukan minimal H-1 (24 jam dari sekarang).')
      return
    }

    // Pengecekan jadwal bentrok di klien
    const colliding = findScheduleCollision({ eventDate: date, eventTime: time }, store.schedules)
    if (colliding) {
      setNotice(`Pemesanan ditolak: Jadwal pada tanggal ${formatDate(date)} pukul ${time} WIB sudah terisi (${colliding.packageName}). Silakan pilih waktu lain agar tidak bentrok.`)
      return
    }

    const booking: Schedule = {
      id: makeId('booking'), clientName, whatsapp: phone, packageName: bookingPackage.name,
      eventDate: date, eventTime: time, session: sessionForTime(time), location: '', notes: '', status: 'Menunggu Konfirmasi',
    }

    try {
      await api.schedules.create(booking)
    } catch (err: any) {
      console.warn('Gagal simpan booking ke backend:', err)
      if (err.status === 409 || err.status === 422 || err.message?.toLowerCase().includes('bentrok')) {
        setNotice(err.message || 'Pemesanan ditolak oleh sistem karena jadwal bentrok.')
        return
      }
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
    api.auth.logout()
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
                <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-2xl sm:rounded-full border border-rose-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-xs backdrop-blur">
                  <span className="shrink-0 rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">Sejak 1993</span>
                  <span className="inline-flex items-center gap-1.5 text-left leading-normal"><Sparkles size={14} className="shrink-0 text-amber-500" /> Membingkai hari paling berhargamu dengan riasan mempesona</span>
                </div>
                <h1 className="font-display text-5xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-[68px]">Hari istimewamu,<br /><span className="italic text-rose-600">secantik ceritamu.</span></h1>
                <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">Dipercaya sejak tahun 1993 menghadirkan tata rias terbaik. Riasan yang terasa seperti dirimu, dibuat dengan cinta untuk momen yang akan selalu kamu kenang.</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href="/paket" onClick={(event) => { event.preventDefault(); navigatePublic('/paket') }} className="btn-primary focus-ring">Temukan paket impian <ArrowRight size={17} /></a>
                  <a href="/paket" onClick={(event) => { event.preventDefault(); navigatePublic('/paket') }} className="btn-secondary bg-white/80 backdrop-blur">Lihat katalog & karya</a>
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

          {/* Section Tanya Jawab / FAQ (Tepat di Atas Portofolio) */}
          <FaqSection faqs={store.faqs} phone={store.profile.phone} salonName={store.profile.name} />

          {/* Galeri Portofolio di Halaman Utama */}
          <section className="relative overflow-hidden bg-gradient-to-b from-white via-rose-50/20 to-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <PortfolioCarousel items={store.gallery} showTopBorder={false} />
            </div>
          </section>
        </>
      )}

      {publicRoute === '/paket' && <section id="paket" className="min-h-[70vh] bg-rose-50/40 px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Pilih yang paling kamu" title="Paket rias penuh cerita" description="Setiap detail kami siapkan dengan sepenuh hati, agar kamu bisa menikmati setiap momen." />
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['Semua', ...store.categories.map((category) => category.name)].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:max-w-xs"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field rounded-full py-2.5 pl-10" placeholder="Cari paket atau layanan..." /></label>
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
              {(search || selectedCategory !== 'Semua') && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSelectedCategory('Semua'); }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 shadow-xs"
                >
                  <X size={14} /> Reset Pencarian & Kategori
                </button>
              )}
            </div>
          )}

          <p className="mt-7 text-center text-xs text-slate-500">Setiap paket dapat disesuaikan. Ceritakan kebutuhanmu saat berkonsultasi.</p>
        </div>
      </section>}

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
        <NotFoundSection
          onNavigate={navigatePublic}
          phone={store.profile.phone}
          salonName={store.profile.name}
        />
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
          <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Sertifikat Resmi Desy Salon</p>
          <button aria-label="Tutup" onClick={() => setViewingCert(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
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

function NotFoundSection({
  onNavigate,
  phone,
  salonName,
}: {
  onNavigate: (route: PublicRoute) => void
  phone: string
  salonName: string
}) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <section className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 shadow-inner">
          <HelpCircle size={42} strokeWidth={1.8} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-600">
          404 • Halaman Tidak Ditemukan
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Halaman yang kamu cari belum tersedia
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {currentPath && currentPath !== '/' ? (
            <>Tautan <code className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-xs text-rose-700 font-semibold">{currentPath}</code> mungkin salah ketik atau telah dipindahkan.</>
          ) : (
            'Tautan yang kamu tuju mungkin salah ketik atau telah dipindahkan.'
          )}{' '}
          Silakan kembali ke beranda atau telusuri katalog layanan kami.
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
          <a
            href={whatsappConsultationLink(phone, salonName)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs"
          >
            <MessageCircle size={16} className="text-emerald-600" /> Bantuan WhatsApp
          </a>
        </div>
      </div>
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
    { name: 'Sertifikat', href: '/sertifikat' as PublicRoute, icon: Award },
  ]
  return <header className="sticky top-0 z-40 border-b border-rose-100/70 bg-white/85 backdrop-blur-xl">
    <div className="relative mx-auto flex h-20 sm:h-[84px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
      {/* Sisi Kiri: Logo Studio */}
      <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/') }} className="z-10 flex shrink-0 items-center">
        <img src={brandLogo} alt={profileName} className="h-12 sm:h-14 w-auto max-w-[230px] sm:max-w-[270px] object-contain transition-all" />
      </a>

      {/* Tengah: Navigasi Beranda & Katalog di posisi Center */}
      <nav aria-label="Menu Utama" className="hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center gap-7">
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
  const isPerawatan = item.category.toLowerCase().includes('perawatan')
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Gambar Thumbnail Konsisten */}
      <div className="relative h-64 shrink-0 overflow-hidden sm:h-72">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        {item.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-xs">
            <Sparkles size={12} className="mr-1 inline" />{item.badge}
          </span>
        )}
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
            {item.features.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm font-medium text-slate-700">
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
            {isPerawatan ? (
              <div>
                {item.originalPrice && <p className="text-xs font-medium text-slate-400 line-through">{rupiah(item.originalPrice)}</p>}
                <p className="text-base sm:text-lg font-bold text-rose-600 truncate">{rupiah(item.price)}<span className="ml-1 text-xs font-medium text-slate-500">/ layanan</span></p>
              </div>
            ) : (
              <div>
                {item.originalPrice && <p className="text-xs font-medium text-slate-400 line-through">{rupiah(item.originalPrice)}</p>}
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

function FaqSection({ faqs, phone, salonName }: { faqs: FaqItem[]; phone: string; salonName: string }) {
  const [openIds, setOpenIds] = useState<string[]>([])
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
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
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
                const isOpen = openIds.includes(faq.id)
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
                      <>Tampilkan 5 Pertanyaan Saja <ChevronDown size={15} className="rotate-180" /></>
                    ) : (
                      <>Lihat Semua Pertanyaan ({faqs.length}) <ChevronDown size={15} /></>
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

function PortfolioCarousel({ items, showTopBorder = true }: { items: GalleryItem[]; showTopBorder?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-scroll berputar otomatis
  useEffect(() => {
    if (isPaused || items.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [isPaused, items.length])

  // Geser posisi scroll secara halus mengikuti activeIndex
  useEffect(() => {
    if (!track.current || items.length === 0) return
    const container = track.current
    const card = container.children[activeIndex] as HTMLElement | undefined
    if (card) {
      const targetScroll = card.offsetLeft - container.offsetLeft - (container.clientWidth - card.clientWidth) / 2
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
    }
  }, [activeIndex, items.length])

  function scroll(direction: -1 | 1) {
    setActiveIndex((prev) => {
      if (direction === -1) {
        return (prev - 1 + items.length) % items.length
      } else {
        return (prev + 1) % items.length
      }
    })
  }

  return (
    <section className={`relative ${showTopBorder ? 'mt-16 border-t border-rose-100 pt-12' : 'pt-2'}`}>
      <div className="mb-6 flex flex-col items-center text-center">
        <SectionHeading
          eyebrow="Portofolio rias"
          title="Inspirasi dari karya kami"
          align="center"
        />
      </div>

      {items.length ? (
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative"
        >
          <div
            ref={track}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, idx) => {
              const isActive = idx === activeIndex
              return (
                <article
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative h-80 w-[82%] shrink-0 snap-center cursor-pointer overflow-hidden rounded-2xl bg-slate-200 transition-all duration-500 sm:h-96 sm:w-[48%] lg:w-[32%] ${
                    isActive
                      ? 'ring-2 ring-rose-500/90 shadow-xl scale-[1.01]'
                      : 'opacity-90 hover:opacity-100 hover:shadow-md'
                  }`}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md">
                        {item.eventType}
                      </span>
                      <span className="rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-semibold shadow-xs">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-white/80 line-clamp-2">{item.description}</p>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Navigasi Prev/Next dan Dots Indicator di Bawah Gambar */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={() => scroll(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1.5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Lihat karya ke-${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeIndex
                      ? 'w-7 bg-rose-500 shadow-xs'
                      : 'w-2 bg-slate-300 hover:bg-rose-300'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={() => scroll(1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <EmptyState label="Foto portofolio akan segera ditambahkan." />
      )}
    </section>
  )
}

function PublicFooter({ store, onNavigate }: { store: SalonStore; onNavigate: (route: PublicRoute) => void }) {
  const links: { name: string; href: PublicRoute }[] = [
    { name: 'Beranda', href: '/' },
    { name: 'Katalog rias', href: '/paket' },
    { name: 'Sertifikat', href: '/sertifikat' },
  ]
  return <footer className="border-t border-slate-200 bg-slate-50 px-5 py-12 sm:px-8 lg:px-12">
    <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.65fr)_minmax(0,0.95fr)_minmax(0,1.45fr)] lg:gap-7">
      <div>
        <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/') }} className="inline-flex items-center"><img src={brandLogo} alt={store.profile.name} className="h-12 w-auto max-w-[220px] object-contain" /></a>
        <p className="mt-4 max-w-[230px] text-sm font-medium leading-6 text-slate-700">Riasan penuh rasa sejak 1993, untuk hari-hari yang penuh makna. Mari siapkan momen terbaikmu bersama kami.</p>
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
  '06', '07', '08', '09', '10', '11', '12', '13',
  '14', '15', '16', '17', '18', '19', '20', '21',
] as const

const BOOKING_MINUTES = [
  '00', '05', '10', '15', '20', '25',
  '30', '35', '40', '45', '50', '55',
] as const

function CustomPinkDatePicker({
  label,
  name,
  value,
  minDate,
  onChange,
  isOpen,
  onToggle,
  schedules,
}: {
  label: string
  name: string
  value: string
  minDate: string
  onChange: (val: string) => void
  isOpen: boolean
  onToggle: (open: boolean) => void
  schedules?: Schedule[]
}) {
  const initialDate = value || minDate
  const [viewYear, setViewYear] = useState(() => Number(initialDate.slice(0, 4)) || new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (Number(initialDate.slice(5, 7)) || 1) - 1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  const minYear = Number(minDate.slice(0, 4))
  const minMonth = Number(minDate.slice(5, 7)) - 1
  const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth)

  function prevMonth() {
    if (!canGoPrev) return
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()

  const schedulesOnThisDate = useMemo(() => {
    if (!schedules?.length) return {}
    const map: Record<string, { count: number; hasFullDay: boolean }> = {}
    for (const s of schedules) {
      if (!map[s.eventDate]) map[s.eventDate] = { count: 0, hasFullDay: false }
      map[s.eventDate].count++
      if (s.session === 'Full Day') map[s.eventDate].hasFullDay = true
    }
    return map
  }, [schedules])

  const days = useMemo(() => {
    const list: Array<{ day: number; dateStr: string; isPast: boolean; isSelected: boolean }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      list.push({
        day: d,
        dateStr,
        isPast: dateStr < minDate,
        isSelected: dateStr === value,
      })
    }
    return list
  }, [viewYear, viewMonth, daysInMonth, minDate, value])

  return (
    <div className="relative w-full min-w-0" ref={containerRef}>
      <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor={`date-btn-${name}`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        id={`date-btn-${name}`}
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="field flex h-10 w-full items-center justify-between rounded-xl border border-rose-200 bg-white px-3 text-left text-xs sm:text-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
      >
        <span className={value ? 'font-semibold text-slate-800' : 'text-slate-400'}>
          {value ? formatDate(value) : 'Pilih tanggal acara...'}
        </span>
        <CalendarDays size={16} className="shrink-0 text-rose-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full rounded-2xl border border-rose-200 bg-white p-3.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          <div className="mb-2 flex items-center justify-between border-b border-rose-100 pb-2">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="h-7 w-7" />
            ))}
            {days.map(({ day, dateStr, isPast, isSelected }) => {
              const info = schedulesOnThisDate[dateStr]
              const hasBooking = Boolean(info && info.count > 0)
              const hasFullDay = Boolean(info && info.hasFullDay)
              const isDisabled = isPast || hasFullDay

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(dateStr)
                    onToggle(false)
                  }}
                  title={
                    hasFullDay
                      ? 'Jadwal Penuh (Full Day)'
                      : hasBooking
                      ? `${info.count} booking pada tanggal ini`
                      : undefined
                  }
                  className={`mx-auto flex h-7 w-7 flex-col items-center justify-center rounded-lg text-xs font-semibold relative transition ${
                    isSelected
                      ? 'bg-rose-500 text-white font-bold shadow-xs'
                      : hasFullDay
                      ? 'bg-rose-50 text-rose-300 cursor-not-allowed line-through'
                      : isPast
                      ? 'text-slate-300 cursor-not-allowed'
                      : hasBooking
                      ? 'text-slate-800 bg-amber-50 hover:bg-rose-50 hover:text-rose-600'
                      : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  {hasFullDay ? (
                    <span className="h-1 w-1 rounded-full bg-rose-400 mt-0.5" />
                  ) : hasBooking ? (
                    <span
                      className={`h-1 w-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-amber-500'
                      }`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          {schedules && schedules.length > 0 && (
            <div className="mt-2.5 flex items-center justify-center gap-3 border-t border-rose-100 pt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" /> Ada booking
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block" /> Penuh
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CustomPinkTimePicker({
  label,
  name,
  value,
  onChange,
  isOpen,
  onToggle,
  bookedTimes = [],
}: {
  label: string
  name: string
  value: string
  onChange: (val: string) => void
  isOpen: boolean
  onToggle: (open: boolean) => void
  bookedTimes?: string[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [rawHour, rawMinute] = (value || '09:00').split(':')
  const currentHour = rawHour || '09'
  const currentMinute = rawMinute || '00'

  const minutesList = useMemo(() => {
    if (currentMinute && !BOOKING_MINUTES.includes(currentMinute as any)) {
      return [currentMinute, ...BOOKING_MINUTES].sort()
    }
    return BOOKING_MINUTES
  }, [currentMinute])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  return (
    <div className="relative w-full min-w-0" ref={containerRef}>
      <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor={`time-btn-${name}`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        id={`time-btn-${name}`}
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="field flex h-10 w-full items-center justify-between rounded-xl border border-rose-200 bg-white px-3 text-left text-xs sm:text-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
      >
        <span className={value ? 'font-semibold text-slate-800' : 'text-slate-400'}>
          {value ? `${value} WIB` : 'Pilih waktu acara...'}
        </span>
        <Clock3 size={16} className="shrink-0 text-rose-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full rounded-2xl border border-rose-200 bg-white p-3.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          <div className="mb-2.5 flex items-center justify-between border-b border-rose-100 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
              <Clock3 size={14} /> Waktu Acara
            </span>
            <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
              {currentHour}:{currentMinute} WIB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Jam
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl border border-rose-100/80 bg-rose-50/20 p-1 pr-0.5">
                {BOOKING_HOURS.map((h) => {
                  const isSelected = h === currentHour
                  const isHourBooked = bookedTimes.some((t) => t.startsWith(`${h}:`))
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange(`${h}:${currentMinute}`)}
                      className={`w-full rounded-lg py-1 px-1.5 text-xs font-semibold flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-rose-500 text-white font-bold shadow-xs'
                          : isHourBooked
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <span>{h}</span>
                      {isHourBooked && (
                        <span className={`text-[9px] font-bold ${isSelected ? 'text-rose-100' : 'text-rose-600'}`}>
                          Terisi
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menit
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl border border-rose-100/80 bg-rose-50/20 p-1 pr-0.5">
                {minutesList.map((m) => {
                  const isSelected = m === currentMinute
                  const isSlotBooked = bookedTimes.includes(`${currentHour}:${m}`)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChange(`${currentHour}:${m}`)}
                      className={`w-full rounded-lg py-1 px-1.5 text-xs font-semibold flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-rose-500 text-white font-bold shadow-xs'
                          : isSlotBooked
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <span>{m}</span>
                      {isSlotBooked && (
                        <span className={`text-[9px] font-bold ${isSelected ? 'text-rose-100' : 'text-rose-600'}`}>
                          Bentrok
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {bookedTimes.length > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50/80 p-1 text-center text-[10px] font-medium text-amber-700">
              Waktu bertanda <strong className="text-rose-600">Terisi / Bentrok</strong> sudah dipesan.
            </p>
          )}

          <button
            type="button"
            onClick={() => onToggle(false)}
            className="mt-2.5 w-full rounded-xl bg-rose-500 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600"
          >
            Pilih Jam Ini
          </button>
        </div>
      )}
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void
}) {
  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return {
      date: getLocalIsoDate(d),
      time: getLocalIsoTime(d),
      timestamp: d.getTime(),
    }
  }, [])

  const [date, setDate] = useState(minDateTime.date)
  const [time, setTime] = useState(minDateTime.time)
  const [timeError, setTimeError] = useState('')
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null)

  function validateDateTime(selectedDate: string, selectedTime: string) {
    if (!selectedDate || !selectedTime) return false
    const ts = new Date(`${selectedDate}T${selectedTime}:00`).getTime()
    const minTs = Date.now() + 24 * 60 * 60 * 1000 - 60000
    if (isNaN(ts) || ts < minTs) {
      setTimeError('Pemesanan wajib minimal H-1 (+24 jam dari sekarang).')
      return false
    }
    setTimeError('')
    return true
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    validateDateTime(newDate, time)
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

  const bookedTimesOnDate = useMemo(() => {
    return schedules
      .filter((s) => s.eventDate === date)
      .map((s) => s.eventTime)
      .filter(Boolean) as string[]
  }, [date, schedules])

  const isFullDayBooked = useMemo(() => {
    return schedules.some((s) => s.eventDate === date && s.session === 'Full Day')
  }, [date, schedules])

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    if (!validateDateTime(date, time) || collidingSchedule) {
      e.preventDefault()
      return
    }
    onSubmit(e)
  }

  return (
    <ModalFrame onClose={onClose} maxWidth="max-w-xl" contentPadding="p-5 sm:p-6" overflowClass="overflow-y-auto">
      {/* Compact Header: Thumbnail Paket, Nama, Harga, Badge Min. H-1, dan Tombol Tutup */}
      <div className="flex items-center justify-between gap-3 border-b border-rose-100 pb-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={item.image}
            alt={item.name}
            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover ring-2 ring-rose-200/80 shadow-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                Booking Reservasi
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50/70 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700">
                Min. H-1
              </span>
            </div>
            <h3 className="truncate font-display text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {item.name}
            </h3>
            <p className="text-xs font-semibold text-rose-600">
              {item.category.toLowerCase().includes('perawatan')
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
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Responsive Grid: Lebar label & input 100% presisi dan seragam */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-200 ${openPicker ? 'mb-60 sm:mb-56' : 'mb-0'}`}>
          <div className="w-full min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="booking-name">
              Nama lengkap *
            </label>
            <input
              required
              id="booking-name"
              name="clientName"
              autoComplete="name"
              className="field block h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
              placeholder="Nama pemesan"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="booking-phone">
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
              className="field block h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <CustomPinkDatePicker
            label="Tanggal acara *"
            name="date"
            value={date}
            minDate={minDateTime.date}
            onChange={handleDateChange}
            isOpen={openPicker === 'date'}
            onToggle={(open) => setOpenPicker(open ? 'date' : null)}
            schedules={schedules}
          />

          <CustomPinkTimePicker
            label="Waktu acara (WIB) *"
            name="time"
            value={time}
            onChange={handleTimeChange}
            isOpen={openPicker === 'time'}
            onToggle={(open) => setOpenPicker(open ? 'time' : null)}
            bookedTimes={bookedTimesOnDate}
          />
        </div>

        {/* Real-time Status Banner: Validasi H-1, Bentrok, atau Tersedia */}
        {timeError ? (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{timeError}</span>
          </div>
        ) : collidingSchedule ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/95 p-3 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-900">Jadwal Bentrok / Sudah Terisi</p>
              <p className="text-rose-700">
                {isFullDayBooked
                  ? `Tanggal ${formatDate(date)} sudah terisi pesanan seharian penuh (Full Day). Silakan pilih tanggal lain.`
                  : `Tanggal ${formatDate(date)} pukul ${time} WIB sudah terisi untuk ${collidingSchedule.packageName}. Silakan pilih waktu atau tanggal alternatif agar tidak bentrok.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>
              Jadwal <strong>{formatDate(date)}</strong> pukul <strong>{time} WIB</strong> siap dipesan.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={Boolean(collidingSchedule || timeError)}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs ${
            collidingSchedule || timeError
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {collidingSchedule ? (
            <>
              <AlertCircle size={16} /> Jadwal Bentrok — Silakan Pilih Waktu Lain
            </>
          ) : (
            <>
              <MessageCircle size={16} /> Lanjutkan & konfirmasi via WA
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await api.auth.login(username.trim(), password)
      onOwnerLogin()
    } catch {
      if (username.trim() === store.credentials.username && password === store.credentials.password) {
        onOwnerLogin()
      } else {
        setError('Username atau password belum sesuai.')
      }
    }
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

function AdminDashboard({ store, activeTab, setActiveTab, onOpen, onDelete, onCategoryRemove, onSettingsSave, onLogout }: {
  store: SalonStore; activeTab: AdminTab; setActiveTab: (tab: AdminTab) => void;
  onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category | Certificate | FaqItem) => void;
  onDelete: (collection: 'packages' | 'schedules' | 'gallery' | 'certificates' | 'faqs', id: string) => void;
  onCategoryRemove: (category: Category) => void;
  onSettingsSave: (event: FormEvent<HTMLFormElement>) => void; onLogout: () => void;
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
              <p className="text-xs text-slate-500">Pemilik studio</p>
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
              <p className="text-xs text-slate-500">Pemilik studio</p>
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
        {/* Menyisakan 2 card: Paket Katalog & Booking Mendatang */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-7 sm:grid-cols-2">
          <StatCard title="Paket Katalog" count={store.packages.length} detail="Pilihan layanan aktif" icon={PackageCheck} color="rose" />
          <StatCard title="Booking Mendatang" count={store.schedules.filter((item) => item.status !== 'Lunas').length} detail="Perlu ditangani" icon={CalendarDays} color="sky" />
        </section>

        {/* Konten Menu Yang Bersangkutan (Hanya tampil 1 menu yang aktif) */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {activeTab === 'Katalog' && <PackagesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Kategori' && <CategoriesManager store={store} onOpen={onOpen} onRemove={onCategoryRemove} />}
          {activeTab === 'Jadwal' && <SchedulesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Portfolio' && <GalleryManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Sertifikat' && <CertificatesManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'FAQ' && <FaqManager store={store} onOpen={onOpen} onDelete={onDelete} />}
          {activeTab === 'Akun' && <SettingsManager store={store} onSave={onSettingsSave} onLogout={onLogout} />}
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
        className={`field flex w-full items-center justify-between text-left focus:outline-none ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
          {selected || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                    selected === option
                      ? 'bg-rose-50 font-bold text-rose-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {selected === option && <Check size={14} className="shrink-0 text-rose-600" />}
                </button>
              ))
            ) : (
              <p className="py-3 text-center text-xs text-slate-400">Tidak ada hasil cocok</p>
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

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
        p.category.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      )
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

      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        {/* Searching */}
        <div className="relative w-full sm:w-56 lg:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari paket atau layanan..."
            className="field !py-2 !pl-9 !pr-7 !text-xs sm:!text-sm"
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
          className="w-full sm:w-44 shrink-0"
          buttonClassName="!py-2 !text-xs sm:!text-sm"
        />

        {/* Tombol Tambah Paket */}
        <button
          onClick={() => onOpen('package')}
          className="btn-primary !px-4 !py-2 text-xs sm:!py-2.5 sm:text-sm shrink-0 whitespace-nowrap"
        >
          <Plus size={16} />Tambah paket
        </button>
      </div>
    </div>

    {paginated.length ? <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:hidden">
        {paginated.map((item) => (
          <article key={item.id} className="flex flex-col justify-between min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-xs transition hover:border-rose-200">
            <div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                {item.badge && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs backdrop-blur-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="mt-2 min-w-0">
                <span className="inline-block rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  {item.category}
                </span>
                <h3 className="mt-1 line-clamp-1 text-xs sm:text-sm font-bold text-slate-900" title={item.name}>
                  {item.name}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-slate-700">
                  {item.category.toLowerCase().includes('perawatan')
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
                onClick={() => { setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                title="Klik untuk mengubah urutan"
              >
                <div className="flex items-center gap-1.5">
                  <span>PAKET</span>
                  <ChevronsUpDown size={14} className={sortOrder === 'asc' ? 'text-rose-600' : 'text-slate-400'} />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 font-semibold">Harga</th>
              <th className="px-4 py-3 font-semibold">Label</th>
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
                  {item.category.toLowerCase().includes('perawatan')
                    ? rupiah(item.price)
                    : item.priceMax
                      ? `${rupiah(item.price)} – ${rupiah(item.priceMax)}`
                      : `Mulai ${rupiah(item.price)}`}
                </td>
                <td className="px-4 py-3">{item.badge ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{item.badge}</span> : <span className="text-xs text-slate-500">-</span>}</td>
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSorted = useMemo(() => {
    let list = store.categories
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
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

      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {/* Searching */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari kategori..."
            className="field !py-2 !pl-9 !pr-7 !text-xs sm:!text-sm"
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
          className="btn-primary !px-4 !py-2 text-xs sm:!py-2.5 sm:text-sm shrink-0 whitespace-nowrap"
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
                  onClick={() => { setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                  title="Klik untuk mengubah urutan"
                >
                  <div className="flex items-center gap-1.5">
                    <span>KATEGORI</span>
                    <ChevronsUpDown size={14} className={sortOrder === 'asc' ? 'text-rose-600' : 'text-slate-400'} />
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
  const [sortBy, setSortBy] = useState<'eventDate' | 'clientName' | 'status'>('eventDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  // Prioritas urutan status: Lunas -> Menunggu DP -> Terkonfirmasi -> Menunggu Konfirmasi
  const STATUS_PRIORITY: Record<string, number> = {
    'Lunas': 1,
    'Menunggu DP': 2,
    'Terkonfirmasi': 3,
    'Menunggu Konfirmasi': 4,
  }

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

  // Filter daftar jadwal aktif
  const filteredAndSorted = useMemo(() => {
    let list = store.schedules
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
    return [...list].sort((a, b) => {
      if (sortBy === 'eventDate') {
        const dateA = `${a.eventDate || ''}T${a.eventTime || '00:00'}`
        const dateB = `${b.eventDate || ''}T${b.eventTime || '00:00'}`
        const cmp = dateA.localeCompare(dateB)
        if (cmp !== 0) {
          return sortOrder === 'asc' ? cmp : -cmp
        }
        return a.clientName.localeCompare(b.clientName, 'id', { sensitivity: 'base' })
      }
      if (sortBy === 'status') {
        const pA = STATUS_PRIORITY[a.status] ?? 99
        const pB = STATUS_PRIORITY[b.status] ?? 99
        if (pA !== pB) {
          return sortOrder === 'asc' ? pA - pB : pB - pA
        }
        const dateA = `${a.eventDate || ''}T${a.eventTime || '00:00'}`
        const dateB = `${b.eventDate || ''}T${b.eventTime || '00:00'}`
        return dateA.localeCompare(dateB)
      }
      const cmp = a.clientName.localeCompare(b.clientName, 'id', { sensitivity: 'base' })
      if (cmp !== 0) {
        return sortOrder === 'asc' ? cmp : -cmp
      }
      const dateA = `${a.eventDate || ''}T${a.eventTime || '00:00'}`
      const dateB = `${b.eventDate || ''}T${b.eventTime || '00:00'}`
      return dateA.localeCompare(dateB)
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
    let items = store.schedules
    if (historyMonth !== 'Semua Bulan') {
      const mIdx = MONTH_NAMES.indexOf(historyMonth as any) + 1
      const mStr = mIdx < 10 ? `0${mIdx}` : `${mIdx}`
      items = items.filter((s) => s.eventDate && s.eventDate.slice(5, 7) === mStr)
    }
    if (historyYear !== 'Semua Tahun') {
      items = items.filter((s) => s.eventDate && s.eventDate.startsWith(historyYear))
    }
    items = [...items].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))

    const lunasItems = items.filter((s) => s.status === 'Lunas')
    const totalRevenue = lunasItems.reduce((acc, s) => acc + getBookingPrice(s, store.packages), 0)
    const periodLabel = `${historyMonth !== 'Semua Bulan' ? historyMonth : ''} ${historyYear !== 'Semua Tahun' ? historyYear : (historyMonth === 'Semua Bulan' ? 'Semua Waktu' : '')}`.trim()

    return { items, lunasItems, totalRevenue, periodLabel }
  }, [store.schedules, store.packages, historyMonth, historyYear])

  const historyTotalItems = activeHistoryData.items.length
  const historyTotalPages = Math.ceil(historyTotalItems / 6) || 1
  const validHistoryPage = Math.min(historyPage, historyTotalPages)
  const paginatedHistoryItems = activeHistoryData.items.slice((validHistoryPage - 1) * 6, validHistoryPage * 6)

  return <>
    {/* Sub-tab Navigation: Daftar Booking vs History Booking */}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScheduleView('list')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
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
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
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

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
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
              className="w-full sm:w-44 shrink-0"
              buttonClassName="!py-2 !text-xs sm:!text-sm bg-white shadow-xs"
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
              className="w-full sm:w-36 shrink-0"
              buttonClassName="!py-2 !text-xs sm:!text-sm bg-white shadow-xs"
            />
          </div>
        </div>

        {/* Ringkasan Pendapatan (Status Lunas) Berdasarkan Filter Bulan & Tahun */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              Dari total {activeHistoryData.items.length} booking pada periode ini
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rata-rata / Booking
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Clock3 size={15} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {activeHistoryData.lunasItems.length > 0
                ? rupiah(Math.round(activeHistoryData.totalRevenue / activeHistoryData.lunasItems.length))
                : 'Rp 0'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Dihitung dari pesanan yang sudah lunas
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
                      <p className={`mt-1 text-xs font-bold ${item.status === 'Lunas' ? 'text-emerald-700' : 'text-slate-500'}`}>
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
                    <tr key={item.id} className="hover:bg-rose-50/20 transition">
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
                        {item.status === 'Lunas' ? (
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
                          onClick={() => setSelectedSchedule(item)}
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
            <p className="text-sm font-semibold text-slate-700">Belum ada riwayat booking pada periode ini</p>
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

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
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
              className="w-full sm:w-44 shrink-0"
              buttonClassName="!py-2 !text-xs sm:!text-sm"
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
              className="w-full sm:w-36 shrink-0"
              buttonClassName="!py-2 !text-xs sm:!text-sm"
            />

            {/* Searching */}
            <div className="relative w-full sm:w-52 lg:w-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Cari pelanggan, paket, lokasi..."
                className="field !py-2 !pl-9 !pr-7 !text-xs sm:!text-sm"
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

            {/* Tombol Tambah Jadwal */}
            <button
              onClick={() => onOpen('schedule')}
              className="btn-primary !px-4 !py-2 text-xs sm:!py-2.5 sm:text-sm shrink-0 whitespace-nowrap"
            >
              <Plus size={16} />Tambah jadwal
            </button>
          </div>
        </div>

        {paginated.length ? <>
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
                    className="py-3 pr-4 font-semibold cursor-pointer select-none hover:text-rose-600"
                    onClick={() => {
                      if (sortBy === 'clientName') {
                        setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('clientName')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan berdasarkan nama pelanggan (A-Z / Z-A)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NAMA PELANGGAN</span>
                      <ChevronsUpDown size={14} className={sortBy === 'clientName' ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-rose-600"
                    onClick={() => {
                      if (sortBy === 'eventDate') {
                        setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('eventDate')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan berdasarkan tanggal pelaksanaan (terdekat / terjauh)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>PELAKSANAAN</span>
                      <ChevronsUpDown size={14} className={sortBy === 'eventDate' ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold">Paket</th>
                  <th
                    className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-rose-600"
                    onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('status')
                        setSortOrder('asc')
                      }
                      setCurrentPage(1)
                    }}
                    title="Klik untuk mengurutkan status (Lunas, Menunggu DP, Terkonfirmasi, Menunggu Konfirmasi)"
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
    {selectedSchedule && <ScheduleDetailsModal schedule={selectedSchedule} collisions={store.schedules.filter((item) => item.id !== selectedSchedule.id && hasScheduleCollision(item, selectedSchedule))} onClose={() => setSelectedSchedule(null)} onEdit={() => editSchedule(selectedSchedule)} />}
  </>
}

function StatusBadge({ status }: { status: Schedule['status'] }) {
  const cls = status === 'Terkonfirmasi' || status === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : status === 'Menunggu Konfirmasi' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{status}</span>
}

function ScheduleDetailsModal({ schedule, collisions, onClose, onEdit }: { schedule: Schedule; collisions: Schedule[]; onClose: () => void; onEdit: () => void }) {
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
      {schedule.whatsapp && <div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-500">WhatsApp</p><a className="mt-1 inline-flex font-semibold text-emerald-700 hover:underline" href={whatsappLink(schedule.whatsapp)} target="_blank" rel="noreferrer">+{normalizePhone(schedule.whatsapp)}</a></div>}
      <div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-500">Catatan</p><p className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{schedule.notes || 'Tidak ada catatan.'}</p></div>
    </div>
    <div className="mt-5 flex justify-end"><button type="button" onClick={onEdit} className="btn-primary"><Edit3 size={16} />Edit jadwal</button></div>
  </ModalFrame>
}

function GalleryManager({ store, onOpen, onDelete }: { store: SalonStore; onOpen: (kind: EditorKind, item?: Package | Schedule | GalleryItem | Category) => void; onDelete: (collection: 'packages' | 'schedules' | 'gallery', id: string) => void }) {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSorted = useMemo(() => {
    let list = store.gallery
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((g) =>
        g.title.toLowerCase().includes(q) ||
        g.eventType.toLowerCase().includes(q) ||
        g.tag.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, 'id', { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [store.gallery, search, sortOrder])

  const totalItems = filteredAndSorted.length
  const totalPages = Math.ceil(totalItems / 6) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = filteredAndSorted.slice((validPage - 1) * 6, validPage * 6)

  return <>
    {/* Header & Toolbar: Searching di sebelah kiri tombol Tambah Foto (Semua 1 baris) */}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="shrink-0">
        <h2 className="text-lg font-bold text-slate-900">Kelola Foto Portfolio</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {/* Searching */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari foto, momen, tag..."
            className="field !py-2 !pl-9 !pr-7 !text-xs sm:!text-sm"
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
          className="btn-primary !px-4 !py-2 text-xs sm:!py-2.5 sm:text-sm shrink-0 whitespace-nowrap"
        >
          <Plus size={16} />Tambah foto
        </button>
      </div>
    </div>

    {paginated.length ? <>
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <button
          type="button"
          onClick={() => { setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
          className="flex items-center gap-1.5 cursor-pointer select-none hover:text-rose-600"
          title="Klik untuk mengubah urutan"
        >
          <span>PORTFOLIO</span>
          <ChevronsUpDown size={14} className={sortOrder === 'asc' ? 'text-rose-600' : 'text-slate-400'} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {paginated.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="relative h-40">
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{item.eventType}</span>
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
          className="btn-primary !px-4 !py-2.5 text-xs sm:text-sm self-start sm:self-auto"
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

  const categories = useMemo(() => {
    const list = Array.from(new Set(store.faqs.map((f) => f.category).filter(Boolean)))
    return ['Semua', ...list]
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola FAQ</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Daftar pertanyaan dan jawaban yang tampil pada section FAQ halaman utama
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen('faq')}
          className="btn-primary !px-4 !py-2.5 text-xs sm:text-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Tambah FAQ
        </button>
      </div>

      {/* Filter Kategori & Search */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setCategoryFilter(cat); setCurrentPage(1) }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Cari FAQ..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-200"
          />
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

function SettingsManager({ store, onSave, onLogout }: { store: SalonStore; onSave: (event: FormEvent<HTMLFormElement>) => void; onLogout: () => void }) {
  return <>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Pengaturan Akun</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">Informasi profil admin</p>
      </div>
      <button type="button" onClick={onLogout} className="btn-secondary !px-4 !py-2.5">
        <LogOut size={16} />Keluar dari akun
      </button>
    </div>
    <form onSubmit={onSave} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <div><label className="label" htmlFor="studio-name">Nama salon</label><input id="studio-name" className="field bg-slate-50" value={store.profile.name} readOnly /></div>
      <div><label className="label" htmlFor="studio-tag">Tagline</label><input id="studio-tag" className="field bg-slate-50" value={store.profile.tag} readOnly /></div>
      <div><label className="label" htmlFor="studio-phone">Nomor WhatsApp tujuan</label><input required id="studio-phone" name="phone" type="tel" inputMode="tel" maxLength={18} defaultValue={store.profile.phone} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-]/g, '') }} className="field" placeholder="Contoh: 082135221177 atau 6282135221177" /><p className="mt-1 text-[11px] text-slate-500">Hanya angka, simbol + dan - (otomatis dirapikan untuk link chat WhatsApp).</p></div>
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

  const [adminSchDate, setAdminSchDate] = useState(scheduleItem?.eventDate ?? '')
  const [adminSchTime, setAdminSchTime] = useState(scheduleItem?.eventTime ?? '')

  const adminCollision = useMemo(() => {
    if (kind !== 'schedule' || !adminSchDate) return null
    return findScheduleCollision(
      { eventDate: adminSchDate, eventTime: adminSchTime },
      store.schedules,
      scheduleItem?.id
    )
  }, [kind, adminSchDate, adminSchTime, store.schedules, scheduleItem?.id])

  const input = (label: string, name: string, value = '', props: Record<string, string> = {}) => <div><label className="label" htmlFor={`editor-${name}`}>{label}</label><input id={`editor-${name}`} name={name} defaultValue={value} className="field" {...props} /></div>
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

  return <ModalFrame onClose={onClose}><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-rose-500">Studio Manager</p><h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">{titles[kind]}</h2></div><button aria-label="Tutup" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={(event) => onSave(event, kind, item)} className="grid max-h-[70vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2">
    {kind === 'package' && <>
      {input('Nama paket *', 'name', packageItem?.name, { required: 'true', placeholder: 'Contoh: Akad Istimewa' })}
      <SearchableSelect
        label="Kategori *"
        name="category"
        options={store.categories.map((c) => c.name)}
        defaultValue={packageItem?.category}
        searchPlaceholder="Cari kategori..."
      />
      {input('Harga mulai / tetap (angka) *', 'price', packageItem ? String(packageItem.price) : '', { type: 'number', min: '1', required: 'true', placeholder: '1850000' })}
      {input('Harga batas atas (rentang harga)', 'priceMax', packageItem?.priceMax ? String(packageItem.priceMax) : '', { type: 'number', min: '1', placeholder: 'Kosongkan jika perawatan / harga tetap' })}
      {input('Harga sebelum diskon (coret)', 'originalPrice', packageItem?.originalPrice ? String(packageItem.originalPrice) : '', { type: 'number', min: '1', placeholder: 'Opsional' })}
      {input('Badge promo', 'badge', packageItem?.badge, { placeholder: 'Contoh: Favorit' })}
      {imageField('image', 'Foto paket')}
      {textarea('Deskripsi', 'description', packageItem?.description, 'Ceritakan keunggulan paket...')}
      {textarea('Fitur (satu fitur per baris)', 'features', packageItem?.features.join('\n'), 'Makeup premium\nHairdo')}
      <p className="sm:col-span-2 -mt-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[11px] text-slate-600">
        💡 <strong>Ketentuan Harga:</strong> Untuk kategori <strong>Perawatan</strong> cukup isi <em>Harga mulai / tetap</em> (akan tampil harga tetap). Untuk <strong>Rias, Akad, Resepsi, Wisuda</strong>, isi juga <em>Harga batas atas</em> agar tampil sebagai rentang harga (misal: <em>Rp 1.850.000 – Rp 2.500.000</em>).
      </p>
    </>}
    {kind === 'schedule' && <>
      {!scheduleItem && <>
        {input('Nama klien *', 'clientName', '', { required: 'true', placeholder: 'Nama lengkap' })}
        <div>
          <label className="label" htmlFor="editor-whatsapp">Nomor WhatsApp</label>
          <input
            id="editor-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-]/g, '') }}
            maxLength={18}
            className="field"
            placeholder="628xxxxxxxxxx"
          />
          <p className="mt-1 text-[11px] text-slate-400">Hanya angka, simbol + dan -</p>
        </div>
        <SearchableSelect
          label="Pilih Paket *"
          name="packageName"
          options={store.packages.map((entry) => entry.name)}
          searchPlaceholder="Cari paket layanan..."
        />
      </>}
      {scheduleItem && <>
        {input('Nama klien *', 'clientName', scheduleItem.clientName, { required: 'true', placeholder: 'Nama lengkap' })}
        <div>
          <label className="label" htmlFor="editor-whatsapp">Nomor WhatsApp</label>
          <input
            id="editor-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={scheduleItem.whatsapp ?? ''}
            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-]/g, '') }}
            maxLength={18}
            className="field"
            placeholder="628xxxxxxxxxx"
          />
          <p className="mt-1 text-[11px] text-slate-400">Hanya angka, simbol + dan -</p>
        </div>
        <SearchableSelect
          label="Paket Layanan *"
          name="packageName"
          options={store.packages.map((entry) => entry.name)}
          defaultValue={scheduleItem.packageName}
          searchPlaceholder="Cari paket layanan..."
        />
      </>}
      <div>
        <label className="label" htmlFor="editor-eventDate">Tanggal acara *</label>
        <input
          id="editor-eventDate"
          name="eventDate"
          type="date"
          required
          value={adminSchDate}
          onChange={(e) => setAdminSchDate(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="editor-eventTime">Waktu acara (WIB)</label>
        <input
          id="editor-eventTime"
          name="eventTime"
          type="time"
          value={adminSchTime}
          onChange={(e) => setAdminSchTime(e.target.value)}
          className="field"
        />
      </div>
      {adminCollision && (
        <div className="sm:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Peringatan Jadwal Bentrok</p>
            <p>
              Tanggal {formatDate(adminSchDate)} {adminSchTime ? `pukul ${adminSchTime} WIB` : ''} bertabrakan dengan pesanan <strong>{adminCollision.clientName}</strong> ({adminCollision.packageName} - {adminCollision.session}).
            </p>
          </div>
        </div>
      )}
      {select('Status', 'status', scheduleStatuses, scheduleItem?.status)}
      {input('Lokasi rias', 'location', scheduleItem?.location, { placeholder: 'Gedung / alamat' })}
      {textarea('Catatan', 'notes', scheduleItem?.notes, 'Kebutuhan khusus...')}
    </>}
    {kind === 'gallery' && <>{input('Judul gaya *', 'title', galleryItem?.title, { required: 'true', placeholder: 'Contoh: Seruni di Pagi Akad' })}{select('Jenis momen', 'eventType', eventTypes, galleryItem?.eventType)}{input('Tag', 'tag', galleryItem?.tag, { placeholder: 'Soft glam / Adat Jawa' })}{imageField('imageUrl', 'Foto galeri')}{textarea('Deskripsi', 'description', galleryItem?.description, 'Deskripsi singkat foto...')}</>}
    {kind === 'category' && <div className="sm:col-span-2 space-y-3">
      {input('Nama kategori *', 'categoryName', categoryItem?.name, { required: 'true', placeholder: 'Contoh: Prewedding, Hijab, Treatment' })}
      <p className="text-xs text-slate-500">Kategori baru akan langsung tampil sebagai tombol filter di menu katalog publik.</p>
    </div>}
    {kind === 'certificate' && <>
      {imageField('image', 'Foto Sertifikat')}
      {input('Keterangan / Nama Sertifikat (opsional)', 'title', certificateItem?.title, { placeholder: 'Contoh: Sertifikat Tata Rias Pengantin' })}
    </>}
    {kind === 'faq' && <>
      <SearchableSelect
        label="Kategori FAQ *"
        name="category"
        options={['Tata Rias', 'Layanan Salon']}
        defaultValue={faqItem?.category || 'Tata Rias'}
        searchPlaceholder="Pilih atau cari kategori..."
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
    <div className="sticky bottom-0 flex justify-end gap-2 bg-white pt-2 sm:col-span-2"><button type="button" onClick={onClose} className="btn-secondary">Batal</button><button type="submit" className="btn-primary"><Check size={16} />Simpan</button></div>
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
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={18} /></span>
      <div><h2 className="text-lg font-bold text-slate-900">Konfirmasi</h2><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p></div>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
      <button type="button" onClick={onConfirm} className="btn-primary !bg-rose-600 hover:!bg-rose-700">Oke</button>
    </div>
  </ModalFrame>
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div role="status" className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Check size={14} /></span><p className="flex-1 text-sm leading-5 text-slate-700">{message}</p><button aria-label="Tutup notifikasi" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"><X size={16} /></button></div>
}

export default App
