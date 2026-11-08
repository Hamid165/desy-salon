export interface Category {
  id: string
  name: string
  slug: string
  created_at?: string
}

export interface Package {
  id: string
  name: string
  category: string
  price: number
  price_max?: number | null
  original_price?: number | null
  badge?: string | null
  image: string
  description: string
  features: string[]
  created_at?: string
}

export interface Schedule {
  id: string
  client_name: string
  package_name: string
  event_date: string
  event_time?: string | null
  whatsapp?: string | null
  session: 'Pagi' | 'Siang' | 'Sore' | 'Full Day'
  location: string
  notes?: string | null
  status: 'Menunggu Konfirmasi' | 'Terkonfirmasi' | 'Menunggu DP' | 'Lunas'
  created_at?: string
}

export interface GalleryItem {
  id: string
  title: string
  event_type: 'Akad Nikah' | 'Resepsi Adat' | 'Wisuda & Pesta'
  tag: string
  image_url: string
  description?: string | null
  created_at?: string
}

export interface SalonProfile {
  id: string
  name: string
  tag: string
  phone: string
  address: string
  maps_url?: string | null
  opening_hours: string
  facebook?: string | null
  facebook_url?: string | null
  instagram?: string | null
  instagram_url?: string | null
  tiktok?: string | null
  tiktok_url?: string | null
  updated_at?: string
}

export interface Certificate {
  id: string
  image_url: string
  title?: string | null
  created_at?: string
}

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  created_at?: string
}

export interface AdminUser {
  id: string
  username: string
  password_hash: string
  created_at?: string
}

