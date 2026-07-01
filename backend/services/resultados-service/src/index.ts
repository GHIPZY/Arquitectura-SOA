import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3009

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resultados-service' })
})

// GET /resultados?encuentro_id= — resultado de un encuentro
app.get('/resultados', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { encuentro_id } = req.query as Record<string, string>

  if (!encuentro_id) {
    return res.status(400).json({ error: 'Se requiere encuentro_id.' })
  }

  const { data, error } = await supabaseAdmin
    .from('resultados')
    .select('encuentro_id, puntos_local, puntos_visitante')
    .eq('encuentro_id', encuentro_id)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// POST /resultados — registrar resultado
app.post('/resultados', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para registrar resultados.' })
  }

  const { encuentro_id, puntos_local, puntos_visitante } = req.body
  if (!encuentro_id || puntos_local === undefined || puntos_visitante === undefined) {
    return res.status(400).json({ error: 'encuentro_id, puntos_local y puntos_visitante son requeridos.' })
  }

  const { data, error } = await supabaseAdmin
    .from('resultados')
    .upsert(
      { encuentro_id, puntos_local, puntos_visitante, registrado_por: req.user!.id },
      { onConflict: 'encuentro_id' }
    )
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json(data)
})

app.listen(PORT, () => {
  console.log(`[Resultados Service] corriendo en http://localhost:${PORT}`)
})
