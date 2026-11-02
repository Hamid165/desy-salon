import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { profileSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { SalonProfile } from '../../types/database.js'

export const profileRouter = Router()

// GET /api/profile - Ambil info profil salon
profileRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('salon_profile')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error) {
      // Jika belum ada row, kembalikan default fallback
      res.json({
        id: 'default',
        name: 'Desy Salon',
        tag: 'Beauty for your beautiful beginning',
        phone: '+62 821-3522-1177',
        address: 'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Banyumas',
        opening_hours: 'Senin–Minggu, 08.00–17.00 WIB',
      } as SalonProfile)
      return
    }

    res.json(data as SalonProfile)
  } catch (err) {
    next(err)
  }
})

// PUT /api/profile - Update info profil salon (Admin)
profileRouter.put('/', requireAdmin, async (req, res, next) => {
  try {
    const validated = profileSchema.parse(req.body)

    const { data, error } = await supabase
      .from('salon_profile')
      .upsert({ ...validated, id: 'default', updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

