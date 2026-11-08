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

// PUT /api/auth/credentials - Ganti username dan/atau password admin (Admin Dashboard)
authRouter.put('/credentials', requireAdmin, async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username || typeof username !== 'string' || !username.trim()) {
      res.status(400).json({ error: 'Username admin wajib diisi' })
      return
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' })
      return
    }

    const currentUsername = req.user?.username || env.ADMIN_DEFAULT_USER
    const newUsername = username.trim()
    const newHash = await bcrypt.hash(password, 10)

    // Cari user saat ini di database
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', currentUsername)
      .maybeSingle()

    let dbError
    if (existingUser) {
      const resUpdate = await supabase
        .from('admin_users')
        .update({ username: newUsername, password_hash: newHash })
        .eq('id', existingUser.id)
      dbError = resUpdate.error
    } else {
      const resUpsert = await supabase
        .from('admin_users')
        .upsert({ username: newUsername, password_hash: newHash }, { onConflict: 'username' })
      dbError = resUpsert.error
    }

    if (dbError) throw dbError

    const newToken = generateToken({ username: newUsername, role: 'admin' })

    res.json({
      message: 'Kredensial login admin berhasil diperbarui!',
      token: newToken,
      user: {
        username: newUsername,
        role: 'admin',
      },
    })
  } catch (err) {
    next(err)
  }
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

