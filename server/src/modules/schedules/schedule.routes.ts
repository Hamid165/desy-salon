import { Router } from 'express'
import { supabase } from '../../config/supabase.js'
import { scheduleSchema, scheduleStatusSchema } from '../../schemas/validation.js'
import { requireAdmin } from '../../middleware/auth.js'
import type { Schedule } from '../../types/database.js'

export const scheduleRouter = Router()

function toLegacyStatus(status: string): string {
  if (status === 'Menunggu Konfirmasi') return 'Menunggu DP'
  if (status === 'DP' || status === 'Lunas') return 'Terkonfirmasi'
  return status
}

function normalizeScheduleRow(row: any): Schedule {
  if (!row) return row
  let status = row.status
  if (status === 'Menunggu DP') status = 'Menunggu Konfirmasi'
  else if (status === 'Terkonfirmasi') status = 'DP'
  return { ...row, status }
}

// Helper: Cek bentrok jadwal (dengan aturan jeda minimal 2 jam / 120 menit)
function checkCollision(incoming: { event_date: string; event_time?: string | null; session: string }, existing: Schedule) {
  // Hanya jadwal yang SUDAH DP atau LUNAS (mengunci slot) yang dianggap bentrok.
  // Jadwal yang masih 'Menunggu Konfirmasi' belum sah mengunci slot sehingga tidak dianggap bentrok.
  const normStatus = normalizeScheduleRow(existing).status
  if (normStatus === 'Menunggu Konfirmasi') return false
  if (incoming.event_date !== existing.event_date) return false
  if (incoming.session === 'Full Day' || existing.session === 'Full Day') return true
  if (incoming.event_time && existing.event_time) {
    const [h1, m1] = incoming.event_time.split(':').map(Number)
    const [h2, m2] = existing.event_time.split(':').map(Number)
    const min1 = (h1 || 0) * 60 + (m1 || 0)
    const min2 = (h2 || 0) * 60 + (m2 || 0)
    // Jeda 2 jam (120 menit): bentrok jika selisih waktu < 120 menit
    return Math.abs(min1 - min2) < 120
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
    res.json(((data as any[]) || []).map(normalizeScheduleRow))
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

    // Validasi Minimal H-1 (WIB = UTC+7): tanggal acara minimal besok
    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayWibStr = nowWib.toISOString().slice(0, 10)
    const isLessThanHMinus1 = String(date) <= todayWibStr

    // Validasi Jam Kerja: 08:00 - 16:00 WIB
    let isOutsideWorkingHours = false
    if (time) {
      const [h, m] = String(time).split(':').map(Number)
      const minutes = (h || 0) * 60 + (m || 0)
      if (minutes < 8 * 60 || minutes > 16 * 60) {
        isOutsideWorkingHours = true
      }
    }

    const isAvailable = !colliding && !isLessThanHMinus1 && !isOutsideWorkingHours

    // Kumpulkan jam-jam yang sudah ada booking pada tanggal tersebut
    // HANYA dari jadwal yang sudah mengunci slot (bukan 'Menunggu Konfirmasi', yaitu yang sudah 'DP' atau 'Lunas')
    const lockedSchedules = (existingSchedules as Schedule[]).filter((s) => s.status !== 'Menunggu Konfirmasi')
    const bookedHours: string[] = []
    const bookedTimes: string[] = []
    const isFullDay = lockedSchedules.some((s) => s.session === 'Full Day')
    const OPERATING_HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16']

    if (isFullDay) {
      OPERATING_HOURS.forEach((h) => bookedHours.push(h))
    } else {
      lockedSchedules.forEach((s) => {
        if (s.event_time) {
          const [sh, sm] = s.event_time.split(':').map(Number)
          const sMinutes = (sh || 0) * 60 + (sm || 0)
          if (!bookedTimes.includes(s.event_time)) bookedTimes.push(s.event_time)

          // Kunci semua jam dalam radius jeda 2 jam (< 120 menit)
          OPERATING_HOURS.forEach((h) => {
            const hMinutes = Number(h) * 60
            if (Math.abs(hMinutes - sMinutes) < 120 && !bookedHours.includes(h)) {
              bookedHours.push(h)
            }
          })
        } else if (s.session) {
          if (s.session === 'Pagi') ['08', '09', '10'].forEach((h) => !bookedHours.includes(h) && bookedHours.push(h))
          if (s.session === 'Siang') ['11', '12', '13', '14'].forEach((h) => !bookedHours.includes(h) && bookedHours.push(h))
          if (s.session === 'Sore') ['15', '16'].forEach((h) => !bookedHours.includes(h) && bookedHours.push(h))
        }
      })
    }

    res.json({
      available: isAvailable,
      collides: Boolean(colliding),
      collidingSchedule: colliding
        ? {
            client_name: colliding.client_name,
            package_name: colliding.package_name,
            session: colliding.session,
            event_time: colliding.event_time,
          }
        : null,
      booked_hours: bookedHours,
      booked_times: bookedTimes,
      is_full_day: isFullDay,
      isLessThanHMinus1,
      isOutsideWorkingHours,
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

    // Aturan 1: Minimal H-1 (tanggal acara minimal besok)
    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayWibStr = nowWib.toISOString().slice(0, 10)
    if (!req.body.force && validated.event_date <= todayWibStr) {
      res.status(422).json({
        status: 422,
        error: 'Pemesanan ditolak: Reservasi harus dilakukan minimal H-1 (tanggal acara minimal besok).',
      })
      return
    }

    // Aturan 2: Waktu acara wajib dalam jam kerja operasional (08:00 – 16:00 WIB)
    if (!req.body.force) {
      if (!validated.event_time) {
        res.status(422).json({
          status: 422,
          error: 'Pemesanan ditolak: Waktu acara wajib dipilih dalam jam kerja (08:00 – 16:00 WIB).',
        })
        return
      }
      const [hStr, mStr] = validated.event_time.split(':')
      const h = Number(hStr)
      const m = Number(mStr || '0')
      const minutes = h * 60 + m
      if (minutes < 8 * 60 || minutes > 16 * 60) {
        res.status(422).json({
          status: 422,
          error: 'Pemesanan ditolak: Waktu acara harus berada dalam jam kerja (08:00 – 16:00 WIB).',
        })
        return
      }
    }

    // Aturan 3: Lokasi acara wajib diisi untuk booking klien
    if (!req.body.force && (!validated.location || validated.location.trim() === '')) {
      res.status(422).json({
        status: 422,
        error: 'Pemesanan ditolak: Lokasi acara wajib diisi.',
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
        error: `Jadwal tidak tersedia: Jam ${validated.event_time ? validated.event_time + ' WIB ' : ''}pada tanggal ${validated.event_date} bentrok dengan booking yang sudah ada (${colliding.client_name} - ${colliding.package_name} pukul ${colliding.event_time || colliding.session} WIB). Layanan salon/rias membutuhkan jeda minimal 2 jam. Silakan pilih jam lain.`,
        collidingSchedule: {
          client_name: colliding.client_name,
          package_name: colliding.package_name,
          session: colliding.session,
          event_time: colliding.event_time,
        },
      })
      return
    }

    let { data, error } = await supabase
      .from('schedules')
      .insert([{ ...validated, id }])
      .select()
      .single()

    if (error && error.message?.includes('schedules_status_check')) {
      const retry = await supabase
        .from('schedules')
        .insert([{ ...validated, id, status: toLegacyStatus(validated.status) }])
        .select()
        .single()
      data = retry.data ? { ...retry.data, status: validated.status } : retry.data
      error = retry.error
    }

    if (error) throw error
    res.status(201).json(normalizeScheduleRow(data))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/schedules/:id/status - Update status booking (Admin)
scheduleRouter.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = scheduleStatusSchema.parse(req.body)

    let { data, error } = await supabase
      .from('schedules')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error && error.message?.includes('schedules_status_check')) {
      const retry = await supabase
        .from('schedules')
        .update({ status: toLegacyStatus(status) })
        .eq('id', id)
        .select()
        .single()
      data = retry.data ? { ...retry.data, status } : retry.data
      error = retry.error
    }

    if (error) throw error
    res.json(normalizeScheduleRow(data))
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
        error: `Jadwal tidak tersedia: Jam ${validated.event_time ? validated.event_time + ' WIB ' : ''}pada tanggal ${validated.event_date} bentrok dengan booking yang sudah ada (${colliding.client_name} - ${colliding.package_name} pukul ${colliding.event_time || colliding.session} WIB). Layanan salon/rias membutuhkan jeda minimal 2 jam. Silakan pilih jam lain.`,
        collidingSchedule: {
          client_name: colliding.client_name,
          package_name: colliding.package_name,
          session: colliding.session,
          event_time: colliding.event_time,
        },
      })
      return
    }

    let { data, error } = await supabase
      .from('schedules')
      .update(validated)
      .eq('id', id)
      .select()
      .single()

    if (error && error.message?.includes('schedules_status_check')) {
      const retry = await supabase
        .from('schedules')
        .update({ ...validated, status: toLegacyStatus(validated.status) })
        .eq('id', id)
        .select()
        .single()
      data = retry.data ? { ...retry.data, status: validated.status } : retry.data
      error = retry.error
    }

    if (error) throw error
    res.json(normalizeScheduleRow(data))
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

