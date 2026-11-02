import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled Server Error:', err)

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Data yang dikirimkan tidak valid',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  if (err instanceof Error) {
    res.status(500).json({
      error: err.message || 'Terjadi kesalahan internal pada server',
    })
    return
  }

  res.status(500).json({
    error: 'Terjadi kesalahan sistem yang tidak diketahui',
  })
}

