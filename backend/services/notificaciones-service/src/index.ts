import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3011

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notificaciones-service' })
})

// GET /notificaciones — las del usuario autenticado (por su rol o dirigidas a él)
app.get('/notificaciones', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const rol = req.user?.rol ?? ''

  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .select('id, created_at, tipo, titulo, mensaje, leida, rol_destino, usuario_destino')
    .or(`usuario_destino.eq.${userId},rol_destino.eq.${rol}`)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// PUT /notificaciones/:id/leida — marcar una notificación como leída
app.put('/notificaciones/:id/leida', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user!.id
  const rol = req.user?.rol ?? ''

  // Solo puede marcar notificaciones que le pertenecen
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
    .or(`usuario_destino.eq.${userId},rol_destino.eq.${rol}`)
    .select()
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Notificación no encontrada.' })
  return res.json(data)
})

// PUT /notificaciones/leidas — marcar todas como leídas
app.put('/notificaciones/leidas', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const rol = req.user?.rol ?? ''

  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('leida', false)
    .or(`usuario_destino.eq.${userId},rol_destino.eq.${rol}`)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[Notificaciones Service] corriendo en http://localhost:${PORT}`)
})
