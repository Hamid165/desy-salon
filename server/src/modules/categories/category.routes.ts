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

// GET /api/categories/:id - Ambil detail 1 kategori
categoryRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      res.status(404).json({ status: 404, error: 'Kategori tidak ditemukan' })
      return
    }
    res.json(data as Category)
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

    // 1. Ambil nama kategori
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    if (category) {
      // 2. Cek apakah ada paket aktif yang menggunakan kategori ini
      const { data: activePackages } = await supabase
        .from('packages')
        .select('id, name')
        .eq('category', category.name)
        .limit(1)

      if (activePackages && activePackages.length > 0) {
        res.status(400).json({
          status: 400,
          error: 'Kategori tidak dapat dihapus',
          message: `Kategori "${category.name}" masih digunakan oleh paket aktif (${activePackages[0].name}). Pindahkan atau hapus paket terkait terlebih dahulu.`,
        })
        return
      }
    }

    const { data, error } = await supabase.from('categories').delete().eq('id', id).select()
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ status: 404, error: 'Kategori tidak ditemukan' })
      return
    }
    res.json({ message: 'Kategori berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

