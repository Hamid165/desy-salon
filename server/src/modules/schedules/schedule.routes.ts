import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { scheduleSchema, scheduleStatusSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Schedule } from '../../types/database.js'

export const scheduleRouter = Router()

// Helper: Cek bentrok jadwal
function checkCollision(incoming: { event_date: string; event_time?: string | null; session: string }, existing: Schedule) {
  if (incoming.event_date !== existing.event_date) return false
  if (incoming.session === 'Full Day' || existing.session === 'Full Day') return true
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

    if (!date) {
      res.status(400).json({ error: 'Parameter date diperlukan' })
      return
    }

    const { data: existingSchedules, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_date', String(date))

    if (error) throw error

    const sessionVal = session
      ? String(session)
      : time
      ? Number(String(time).split(':')[0]) < 11
        ? 'Pagi'
        : Number(String(time).split(':')[0]) < 15
        ? 'Siang'
        : 'Sore'
      : 'Full Day'

    const colliding = (existingSchedules as Schedule[]).find((s) =>
      checkCollision(
        {
          event_date: String(date),
          event_time: time ? String(time) : null,
          session: sessionVal,
        },
        s
      )
    )

    const checkTime = time ? String(time) : '08:00'
    const targetTs = new Date(`${date}T${checkTime}:00`).getTime()
    const minAllowedTs = Date.now() + 24 * 60 * 60 * 1000 - 60000
    const isLessThan24h = isNaN(targetTs) || targetTs < minAllowedTs

    res.json({
      available: !colliding && !isLessThan24h,
      collides: Boolean(colliding),
      collidingSchedule: colliding
        ? {
            client_name: colliding.client_name,
            package_name: colliding.package_name,
            session: colliding.session,
            event_time: colliding.event_time,
          }
        : null,
      isLessThan24h,
      event_date: date,
      session: sessionVal,
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

    // Aturan validasi sistem: Tolak booking yang tanggal/jamnya kurang dari H-1 (24 jam dari sekarang)
    // Kecuali jika dikirim oleh admin (req.body.force === true)
    const eventTimeStr = validated.event_time || '08:00'
    const bookingTimestamp = new Date(`${validated.event_date}T${eventTimeStr}:00`).getTime()
    const minAllowedTimestamp = Date.now() + 24 * 60 * 60 * 1000 - 60000 // toleransi 1 menit

    if (!req.body.force && (isNaN(bookingTimestamp) || bookingTimestamp < minAllowedTimestamp)) {
      res.status(422).json({
        status: 422,
        error: 'Pemesanan ditolak: Tanggal atau waktu booking wajib minimal H-1 (24 jam dari sekarang).',
      })
      return
    }

    // Pengecekan tabrakan jadwal pada tanggal dan sesi yang sama
    const { data: existingSchedules, error: queryError } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_date', validated.event_date)

    if (queryError) throw queryError

    const colliding = (existingSchedules as Schedule[]).find((s) => checkCollision(validated, s))

    if (colliding && !req.body.force) {
      res.status(409).json({
        status: 409,
        error: `Jadwal bentrok dengan acara lain (${colliding.client_name} - ${colliding.package_name}) pada tanggal ${validated.event_date}${colliding.event_time ? ' pukul ' + colliding.event_time + ' WIB' : ''}.`,
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

    // Pengecekan bentrok jadwal pada tanggal yang sama jika ada perubahan (kecuali jadwal saat ini)
    const { data: existingSchedules, error: queryError } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_date', validated.event_date)
      .neq('id', id)

    if (queryError) throw queryError

    const colliding = (existingSchedules as Schedule[]).find((s) => checkCollision(validated, s))

    if (colliding && !req.body.force) {
      res.status(409).json({
        status: 409,
        error: `Jadwal bentrok dengan acara lain (${colliding.client_name} - ${colliding.package_name}) pada tanggal ${validated.event_date}${colliding.event_time ? ' pukul ' + colliding.event_time + ' WIB' : ''}.`,
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

// GET /api/schedules/:id - Ambil detail 1 jadwal
scheduleRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      res.status(404).json({ status: 404, error: 'Jadwal tidak ditemukan' })
      return
    }
    res.json(data as Schedule)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/schedules/:id - Hapus jadwal (Admin)
scheduleRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase.from('schedules').delete().eq('id', id).select()
    if (error) throw error
    if (!data || data.length === 0) {
      res.status(404).json({ status: 404, error: 'Jadwal tidak ditemukan' })
      return
    }
    res.json({ message: 'Jadwal berhasil dihapus', id })
  } catch (err) {
    next(err)
  }
})

