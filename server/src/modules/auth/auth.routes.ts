import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { loginSchema } from '../../schemas/validation.js'
import { generateToken, requireAdmin } from '../../middleware/auth.js'

export const authRouter = Router()

// POST /api/auth/login - Login admin
authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body)

    // 1. Coba cari di database Supabase tabel admin_users
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    let isAuthenticated = false

    if (adminUser && adminUser.password_hash) {
      isAuthenticated = await bcrypt.compare(password, adminUser.password_hash)
    }

    // 2. Fallback: jika database admin_users belum terisi, cocokkan dengan .env default
    if (!isAuthenticated && username === env.ADMIN_DEFAULT_USER && password === env.ADMIN_DEFAULT_PASSWORD) {
      isAuthenticated = true

      // Inisialisasi otomatis ke database jika tabel kosong
      try {
        const hash = await bcrypt.hash(password, 10)
        await supabase.from('admin_users').upsert(
          { username, password_hash: hash },
          { onConflict: 'username' }
        )
      } catch (e) {
        console.warn('Gagal sync admin user ke database (tabel mungkin belum dibuat):', e)
      }
    }

    if (!isAuthenticated) {
      res.status(401).json({ error: 'Username atau password admin salah!' })
      return
    }

    const token = generateToken({ username, role: 'admin' })

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        username,
        role: 'admin',
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me - Cek status login token admin
authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({
    user: req.user,
    authenticated: true,
  })
})

// POST /api/auth/change-password - Ganti password admin
authRouter.post('/change-password', requireAdmin, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' })
      return
    }

    const username = req.user?.username || env.ADMIN_DEFAULT_USER
    const newHash = await bcrypt.hash(newPassword, 10)

    const { error } = await supabase.from('admin_users').upsert(
      { username, password_hash: newHash },
      { onConflict: 'username' }
    )

    if (error) throw error

    res.json({ message: 'Password berhasil diperbarui!' })
  } catch (err) {
    next(err)
  }
})

