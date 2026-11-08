import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { faqSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { FaqItem } from '../../types/database.js'

export const faqRouter = Router()

// GET /api/faqs - Ambil semua FAQ (bisa filter ?category=... atau ?search=...)
faqRouter.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query

    let query = supabase.from('faqs').select('*').order('created_at', { ascending: true })

    if (category && typeof category === 'string' && category !== 'Semua') {
      query = query.eq('category', category)
    }

    if (search && typeof search === 'string') {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data as FaqItem[])
  } catch (err) {
    next(err)
  }
})

// POST /api/faqs - Tambah FAQ baru (Admin)
faqRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = faqSchema.parse(req.body)
    const id = validated.id || `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase
      .from('faqs')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/faqs/:id - Update FAQ (Admin)
faqRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = faqSchema.parse({ ...req.body, id })

    const { data, error } = await supabase
      .from('faqs')
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

// GET /api/faqs/:id - Ambil detail 1 FAQ
faqRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      res.status(404).json({ status: 404, error: 'FAQ tidak ditemukan' })
      return
    }
    res.json(data as FaqItem)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/faqs/:id - Hapus FAQ (Admin)
faqRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase.from('faqs').delete().eq('id', id).select()
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ status: 404, error: 'FAQ tidak ditemukan' })
      return
    }
    res.json({ message: 'FAQ berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

