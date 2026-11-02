import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env dari root server
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Sanitize Supabase URL (hapus trailing /rest/v1 jika dimasukkan oleh user)
function cleanSupabaseUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  SUPABASE_URL: cleanSupabaseUrl(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'desy_salon_jwt_default_secret_key_2026',
  ADMIN_DEFAULT_USER: process.env.ADMIN_DEFAULT_USER || 'desy',
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'adminDESI@2026',
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ PERINGATAN: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum terkonfigurasi dengan benar di .env!')
}

