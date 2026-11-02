import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../../config/supabase.js'
import { gallerySchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { GalleryItem } from '../../types/database.js'

export const galleryRouter = Router()

// Multer in-memory storage untuk buffer upload langsung ke Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Hanya file gambar (JPEG, PNG, WebP) yang diizinkan!'))
    }
  },
})

// GET /api/gallery - Ambil daftar foto portofolio
galleryRouter.get('/', async (req, res, next) => {
  try {
    const { event_type } = req.query

    let query = supabase.from('gallery').select('*').order('created_at', { ascending: false })

    if (event_type && typeof event_type === 'string' && event_type !== 'Semua') {
      query = query.eq('event_type', event_type)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data as GalleryItem[])
  } catch (err) {
    next(err)
  }
})

// POST /api/gallery/upload - Upload file gambar langsung ke Supabase Storage (Admin)
galleryRouter.post('/upload', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File gambar wajib disertakan' })
      return
    }

    const fileExt = req.file.originalname.split('.').pop() || 'jpg'
    const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('salon-assets')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('salon-assets').getPublicUrl(uploadData.path)

    res.status(201).json({
      url: urlData.publicUrl,
      path: uploadData.path,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/gallery - Tambah item portofolio (Admin)
galleryRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = gallerySchema.parse(req.body)
    const id = validated.id || `foto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase
      .from('gallery')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/gallery/:id - Update item portofolio (Admin)
galleryRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = gallerySchema.parse({ ...req.body, id })

    const { data, error } = await supabase
      .from('gallery')
      .update(validated)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/gallery/:id - Hapus item portofolio (Admin)
galleryRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('gallery').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Portofolio berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

