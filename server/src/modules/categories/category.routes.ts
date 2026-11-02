import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { categorySchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Category } from '../../types/database.js'

export const categoryRouter = Router()

// GET /api/categories - Ambil semua kategori
categoryRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    res.json(data as Category[])
  } catch (err) {
    next(err)
  }
})

// POST /api/categories - Tambah kategori baru (Admin)
categoryRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = categorySchema.parse(req.body)
    const { data, error } = await supabase
      .from('categories')
      .insert([validated])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/categories/:id - Update kategori (Admin)
categoryRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = categorySchema.parse({ ...req.body, id })
    const { data, error } = await supabase
      .from('categories')
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

// DELETE /api/categories/:id - Hapus kategori (Admin)
categoryRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Kategori berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

