import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled Server Error:', err)

  if (err instanceof ZodError) {
    res.status(400).json({
      status: 400,
      error: 'Data yang dikirimkan tidak valid',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // Tangani 404 dari database Supabase PostgREST (PGRST116: no rows returned)
  if ((err as any)?.code === 'PGRST116') {
    res.status(404).json({
      status: 404,
      error: 'Data tidak ditemukan',
      message: 'Data yang Anda minta tidak ditemukan di sistem atau telah dihapus.',
    })
    return
  }

  if (err instanceof Error) {
    res.status(500).json({
      status: 500,
      error: err.message || 'Terjadi kesalahan internal pada server',
    })
    return
  }

  res.status(500).json({
    status: 500,
    error: 'Terjadi kesalahan sistem yang tidak diketahui',
  })
}

