import express from 'express'
import cors from 'cors'
import path from 'path'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { categoryRouter } from './modules/categories/category.routes.js'
import { packageRouter } from './modules/packages/package.routes.js'
import { scheduleRouter } from './modules/schedules/schedule.routes.js'
import { galleryRouter } from './modules/gallery/gallery.routes.js'
import { profileRouter } from './modules/profile/profile.routes.js'
import { certificateRouter } from './modules/certificates/certificate.routes.js'
import { faqRouter } from './modules/faqs/faq.routes.js'

const app = express()

// Sembunyikan fingerprint server Express
app.disable('x-powered-by')

// Security Headers dengan Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Memungkinkan widget eksternal & API REST bebas blokir CSP inline
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// Trust proxy (diperlukan saat dideploy di belakang Cloudflare / reverse proxy untuk membaca IP asli klien)
app.set('trust proxy', 1)

// Rate Limiter Umum (Anti-DDoS & abuse API)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300, // maksimal 300 permintaan per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Terlalu banyak permintaan',
    message: 'Aktivitas request melebihi batas wajar. Silakan coba beberapa saat lagi.',
  },
})

// Rate Limiter Khusus Login (Anti Brute-Force & Credential Stuffing)
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 percobaan gagal dalam 15 menit
  skipSuccessfulRequests: true, // Login yang benar tidak dihitung
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Terlalu banyak percobaan login',
    message: 'Terlalu banyak percobaan login gagal dari perangkat ini. Silakan tunggu 15 menit.',
  },
})

// Rate Limiter Khusus Pembuatan Reservasi (Anti-Spam Booking)
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 20, // Maksimal 20 reservasi baru per jam per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Batas pemesanan tercapai',
    message: 'Anda telah mencapai batas pembuatan booking dari perangkat ini. Silakan hubungi admin kami via WhatsApp jika memerlukan bantuan.',
  },
})

// Middleware CORS Fleksibel (Mendukung Localhost, Custom Domain, & Cloudflare Pages)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  env.CLIENT_ORIGIN,
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti Postman, curl, internal server)
      if (!origin) return callback(null, true)

      // Cek apakah origin terdaftar di env atau localhost
      if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true)
      }

      // Dukung preview & production branch domain Cloudflare Pages (*.pages.dev)
      try {
        const parsed = new URL(origin)
        if (parsed.hostname.endsWith('.pages.dev')) {
          return callback(null, true)
        }
      } catch {
        // format url tidak valid
      }

      callback(new Error('Akses diblokir oleh kebijakan CORS'))
    },
    credentials: true,
  })
)

// Body Parser dengan payload limit aman
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Terapkan rate limiter umum untuk seluruh endpoint API
app.use('/api', generalLimiter)

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.resolve(process.cwd(), '../public/favicon.ico')
  res.sendFile(faviconPath, (err) => {
    if (err) res.status(204).end()
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Desy Salon Backend API',
    timestamp: new Date().toISOString(),
    database: env.SUPABASE_URL ? 'Connected (Supabase)' : 'Unconfigured',
  })
})

// Route Modules dengan proteksi khusus
app.use('/api/auth/login', authLoginLimiter)
app.use('/api/auth', authRouter)

// Proteksi rate-limit khusus untuk POST reservasi baru
app.post('/api/schedules', bookingLimiter)
app.use('/api/schedules', scheduleRouter)

app.use('/api/categories', categoryRouter)
app.use('/api/packages', packageRouter)
app.use('/api/gallery', galleryRouter)
app.use('/api/profile', profileRouter)
app.use('/api/certificates', certificateRouter)
app.use('/api/faqs', faqRouter)

// 404 Handler untuk route/endpoint yang tidak terdaftar
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Endpoint tidak ditemukan',
    message: `Permintaan ${req.method} ke '${req.originalUrl}' tidak terdaftar pada server.`,
  })
})

// Global Error Handler
app.use(errorHandler)

// Start Server
app.listen(env.PORT, () => {
  console.log(`✨ Server Desy Salon berjalan di http://localhost:${env.PORT}`)
  console.log(`🔌 Supabase Target: ${env.SUPABASE_URL}`)
})
