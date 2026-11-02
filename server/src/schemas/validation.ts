import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const categorySchema = z.object({
  id: z.string().min(1, 'ID kategori wajib diisi').max(50),
  name: z.string().min(1, 'Nama kategori wajib diisi').max(30, 'Nama kategori maksimal 30 karakter'),
  slug: z.string().min(1, 'Slug kategori wajib diisi').max(40),
})

export const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nama paket wajib diisi').max(50, 'Nama paket maksimal 50 karakter'),
  category: z.string().min(1, 'Kategori paket wajib diisi'),
  price: z.number().positive('Harga harus lebih dari 0').max(100000000, 'Harga maksimal Rp 100.000.000'),
  original_price: z.number().positive().max(100000000, 'Harga sebelum diskon maksimal Rp 100.000.000').nullable().optional(),
  badge: z.string().max(18, 'Badge promo maksimal 18 karakter').nullable().optional(),
  image: z.string().url('URL gambar tidak valid'),
  description: z.string().min(1, 'Deskripsi wajib diisi').max(150, 'Deskripsi maksimal 150 karakter'),
  features: z.array(z.string().max(60, 'Tiap baris fitur maksimal 60 karakter')).max(8, 'Maksimal 8 baris fitur').default([]),
})

export const scheduleSchema = z.object({
  id: z.string().optional(),
  client_name: z.string().min(1, 'Nama klien wajib diisi').max(50, 'Nama klien maksimal 50 karakter'),
  package_name: z.string().min(1, 'Nama paket wajib diisi').max(50),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  event_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:mm').nullable().optional(),
  whatsapp: z.string().max(20, 'Nomor WhatsApp maksimal 20 digit').optional().nullable(),
  session: z.enum(['Pagi', 'Siang', 'Sore', 'Full Day']),
  location: z.string().max(120, 'Lokasi acara maksimal 120 karakter').default(''),
  notes: z.string().max(200, 'Catatan maksimal 200 karakter').optional().default(''),
  status: z.enum(['Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas']).default('Menunggu Konfirmasi'),
})

export const scheduleStatusSchema = z.object({
  status: z.enum(['Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas']),
})

export const gallerySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Judul portofolio wajib diisi').max(50, 'Judul portofolio maksimal 50 karakter'),
  event_type: z.enum(['Akad Nikah', 'Resepsi Adat', 'Wisuda & Pesta']),
  tag: z.string().min(1, 'Tag wajib diisi').max(20, 'Tag maksimal 20 karakter'),
  image_url: z.string().url('URL gambar tidak valid'),
  description: z.string().max(150, 'Deskripsi maksimal 150 karakter').optional().default(''),
})

export const profileSchema = z.object({
  name: z.string().min(1, 'Nama salon wajib diisi'),
  tag: z.string().min(1, 'Tagline wajib diisi'),
  phone: z.string().min(1, 'Nomor telepon wajib diisi'),
  address: z.string().min(1, 'Alamat wajib diisi'),
  opening_hours: z.string().min(1, 'Jam buka wajib diisi'),
  facebook: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  instagram_url: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  tiktok_url: z.string().optional().nullable(),
})

