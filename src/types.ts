export interface Package {
  id: string
  name: string
  category: string
  price: number
  priceMax?: number
  image: string
  description: string
  features: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Schedule {
  id: string
  clientName: string
  packageName: string
  eventDate: string
  eventTime?: string
  whatsapp?: string
  session: 'Pagi' | 'Siang' | 'Sore' | 'Full Day'
  location: string
  notes: string
  status: 'Menunggu Konfirmasi' | 'DP' | 'Lunas' | 'Selesai'
}

export interface GalleryItem {
  id: string
  title: string
  category: string
  eventType?: string
  tag: string
  imageUrl: string
  description: string
}

export interface Certificate {
  id: string
  imageUrl: string
  title?: string
}

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
}

export interface SalonProfile {
  name: string
  tag: string
  phone: string
  address: string
  mapsUrl?: string
  openingHours: string
  facebook?: string
  facebookUrl?: string
  instagram?: string
  instagramUrl?: string
  portfolioSource?: 'fouita' | 'gallery'
  portfolioFouitaUrl?: string
  portfolioAutoFallbackAt?: string
  tiktok?: string
  tiktokUrl?: string
}

export interface SalonStore {
  packages: Package[]
  categories: Category[]
  schedules: Schedule[]
  gallery: GalleryItem[]
  certificates: Certificate[]
  faqs: FaqItem[]
  profile: SalonProfile
  credentials: { username: string; password: string }
}
