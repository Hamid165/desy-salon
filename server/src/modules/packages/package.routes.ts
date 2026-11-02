import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { packageSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Package } from '../../types/database.js'

export const packageRouter = Router()

// GET /api/packages - Ambil semua paket (bisa filter ?category=...)
packageRouter.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query

    let query = supabase.from('packages').select('*').order('created_at', { ascending: false })

    if (category && typeof category === 'string' && category !== 'Semua') {
      query = query.eq('category', category)
    }

    if (search && typeof search === 'string') {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data as Package[])
  } catch (err) {
    next(err)
  }
})

// GET /api/packages/:id - Ambil detail 1 paket
packageRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      res.status(404).json({ error: 'Paket tidak ditemukan' })
      return
    }
    res.json(data as Package)
  } catch (err) {
    next(err)
  }
})

// POST /api/packages - Tambah paket baru (Admin)
packageRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = packageSchema.parse(req.body)
    const id = validated.id || `paket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase
      .from('packages')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/packages/:id - Update paket (Admin)
packageRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = packageSchema.parse({ ...req.body, id })

    const { data, error } = await supabase
      .from('packages')
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

// DELETE /api/packages/:id - Hapus paket (Admin)
packageRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('packages').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Paket berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

