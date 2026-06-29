import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3005

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'deportes-service' })
})

// GET /public/deportes — lista pública de deportes activos (espectador sin login)
app.get('/public/deportes', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('deportes')
    .select('id, nombre, slug, categoria, max_participantes, min_participantes, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /deportes — lista todos los deportes activos
app.get('/deportes', requireAuth as any, async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('deportes')
    .select('id, nombre, slug, categoria, max_participantes, min_participantes, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /deportes/:id — deporte específico
app.get('/deportes/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('deportes')
    .select('id, nombre, slug, categoria, max_participantes, min_participantes, activo')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  return res.json(data)
})

app.listen(PORT, () => {
  console.log(`[Deportes Service] corriendo en http://localhost:${PORT}`)
})
