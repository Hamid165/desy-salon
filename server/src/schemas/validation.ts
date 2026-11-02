import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const categorySchema = z.object({
  id: z.string().min(1, 'ID kategori wajib diisi'),
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  slug: z.string().min(1, 'Slug kategori wajib diisi'),
})

export const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nama paket wajib diisi'),
  category: z.string().min(1, 'Kategori paket wajib diisi'),
  price: z.number().positive('Harga harus lebih dari 0'),
  original_price: z.number().positive().nullable().optional(),
  badge: z.string().nullable().optional(),
  image: z.string().url('URL gambar tidak valid'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  features: z.array(z.string()).default([]),
})

export const scheduleSchema = z.object({
  id: z.string().optional(),
  client_name: z.string().min(1, 'Nama klien wajib diisi'),
  package_name: z.string().min(1, 'Nama paket wajib diisi'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  event_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:mm').nullable().optional(),
  whatsapp: z.string().optional().nullable(),
  session: z.enum(['Pagi', 'Siang', 'Sore', 'Full Day']),
  location: z.string().min(1, 'Lokasi acara wajib diisi'),
  notes: z.string().optional().default(''),
  status: z.enum(['Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas']).default('Menunggu Konfirmasi'),
})

export const scheduleStatusSchema = z.object({
  status: z.enum(['Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas']),
})

export const gallerySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Judul portofolio wajib diisi'),
  event_type: z.enum(['Akad Nikah', 'Resepsi Adat', 'Wisuda & Pesta']),
  tag: z.string().min(1, 'Tag wajib diisi'),
  image_url: z.string().url('URL gambar tidak valid'),
  description: z.string().optional().default(''),
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

