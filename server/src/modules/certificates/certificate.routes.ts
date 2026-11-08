import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { certificateSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Certificate } from '../../types/database.js'

export const certificateRouter = Router()

// GET /api/certificates - Ambil semua sertifikat
certificateRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data as Certificate[])
  } catch (err) {
    next(err)
  }
})

// POST /api/certificates - Tambah sertifikat baru (Admin)
certificateRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = certificateSchema.parse(req.body)
    const id = validated.id || `sertifikat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase
      .from('certificates')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/certificates/:id - Update sertifikat (Admin)
certificateRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = certificateSchema.parse({ ...req.body, id })

    const { data, error } = await supabase
      .from('certificates')
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

// GET /api/certificates/:id - Ambil detail 1 sertifikat
certificateRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      res.status(404).json({ status: 404, error: 'Sertifikat tidak ditemukan' })
      return
    }
    res.json(data as Certificate)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/certificates/:id - Hapus sertifikat (Admin)
certificateRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase.from('certificates').delete().eq('id', id).select()
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ status: 404, error: 'Sertifikat tidak ditemukan' })
      return
    }
    res.json({ message: 'Sertifikat berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

