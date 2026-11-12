import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { profileSchema, portfolioConfigSchema } from '../../schemas/validation.js'
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
        address: 'DESA PEKUNCEN, KEC. JATILAWANG, KAB. BANYUMAS',
        maps_url: 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9',
        opening_hours: 'Senin–Minggu, 08.00–17.00 WIB',
        portfolio_source: 'fouita',
        portfolio_fouita_url: 'https://wdg.fouita.com/widgets/0x57ed64.js',
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

// PATCH /api/profile/portfolio - Update pengaturan portfolio (Fouita vs Galeri Manual)
profileRouter.patch('/portfolio', async (req, res, next) => {
  try {
    const validated = portfolioConfigSchema.parse(req.body)

    const updatePayload: Record<string, any> = {
      portfolio_source: validated.portfolio_source,
      updated_at: new Date().toISOString(),
    }
    if (validated.portfolio_fouita_url !== undefined) {
      updatePayload.portfolio_fouita_url = validated.portfolio_fouita_url
    }
    if (validated.portfolio_auto_fallback_at !== undefined) {
      updatePayload.portfolio_auto_fallback_at = validated.portfolio_auto_fallback_at
    }

    const { data, error } = await supabase
      .from('salon_profile')
      .update(updatePayload)
      .eq('id', 'default')
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

