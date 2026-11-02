import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { scheduleSchema, scheduleStatusSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Schedule } from '../../types/database.js'

export const scheduleRouter = Router()

// Helper: Cek bentrok jadwal
function checkCollision(incoming: { event_date: string; event_time?: string | null; session: string }, existing: Schedule) {
  if (incoming.event_date !== existing.event_date) return false
  if (incoming.event_time && existing.event_time) {
    return incoming.event_time === existing.event_time
  }
  return incoming.session === existing.session
}

// GET /api/schedules - Ambil semua jadwal (bisa filter ?date=... atau ?status=...)
scheduleRouter.get('/', async (req, res, next) => {
  try {
    const { date, status } = req.query

    let query = supabase.from('schedules').select('*').order('event_date', { ascending: true })

    if (date && typeof date === 'string') {
      query = query.eq('event_date', date)
    }

    if (status && typeof status === 'string') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    res.json(data as Schedule[])
  } catch (err) {
    next(err)
  }
})

// GET /api/schedules/check - Cek ketersediaan slot tanggal & sesi
scheduleRouter.get('/check', async (req, res, next) => {
  try {
    const { date, session, time } = req.query

    if (!date || !session) {
      res.status(400).json({ error: 'Parameter date dan session diperlukan' })
      return
    }

    const { data: existingSchedules, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_date', String(date))

    if (error) throw error

    const collision = (existingSchedules as Schedule[]).some((s) =>
      checkCollision(
        {
          event_date: String(date),
          event_time: time ? String(time) : null,
          session: String(session),
        },
        s
      )
    )

    res.json({
      available: !collision,
      collides: collision,
      event_date: date,
      session,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/schedules - Buat reservasi/booking baru
scheduleRouter.post('/', async (req, res, next) => {
  try {
    const validated = scheduleSchema.parse(req.body)
    const id = validated.id || `jadwal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Pengecekan tabrakan jadwal pada tanggal dan sesi yang sama
    const { data: existingSchedules, error: queryError } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_date', validated.event_date)

    if (queryError) throw queryError

    const colliding = (existingSchedules as Schedule[]).find((s) => checkCollision(validated, s))

    if (colliding && !req.body.force) {
      res.status(409).json({
        error: 'Jadwal bentrok dengan acara lain pada tanggal dan sesi yang sama',
        collidingSchedule: {
          client_name: colliding.client_name,
          package_name: colliding.package_name,
          session: colliding.session,
          event_time: colliding.event_time,
        },
      })
      return
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/schedules/:id/status - Update status booking (Admin)
scheduleRouter.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = scheduleStatusSchema.parse(req.body)

    const { data, error } = await supabase
      .from('schedules')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// PUT /api/schedules/:id - Edit jadwal lengkap (Admin)
scheduleRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const validated = scheduleSchema.parse({ ...req.body, id })

    const { data, error } = await supabase
      .from('schedules')
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

// DELETE /api/schedules/:id - Hapus jadwal (Admin)
scheduleRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Jadwal berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

