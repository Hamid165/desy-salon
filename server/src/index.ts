import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { categoryRouter } from './modules/categories/category.routes.js'
import { packageRouter } from './modules/packages/package.routes.js'
import { scheduleRouter } from './modules/schedules/schedule.routes.js'
import { galleryRouter } from './modules/gallery/gallery.routes.js'
import { profileRouter } from './modules/profile/profile.routes.js'

const app = express()

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  env.CLIENT_ORIGIN,
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti Postman atau curl) atau jika origin terdaftar
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        callback(new Error('Akses diblokir oleh kebijakan CORS'))
      }
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Desy Salon Backend API',
    timestamp: new Date().toISOString(),
    database: env.SUPABASE_URL ? 'Connected (Supabase)' : 'Unconfigured',
  })
})

// Route Modules
app.use('/api/auth', authRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/packages', packageRouter)
app.use('/api/schedules', scheduleRouter)
app.use('/api/gallery', galleryRouter)
app.use('/api/profile', profileRouter)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.originalUrl}` })
})

// Global Error Handler
app.use(errorHandler)

// Start Server
app.listen(env.PORT, () => {
  console.log(`✨ Server Desy Salon berjalan di http://localhost:${env.PORT}`)
  console.log(`🔌 Supabase Target: ${env.SUPABASE_URL}`)
})

