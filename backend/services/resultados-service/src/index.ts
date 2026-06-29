import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3009

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resultados-service' })
})

// GET /public/posiciones?deporte_id= — tabla de posiciones (lectura pública, sin auth)
app.get('/public/posiciones', async (req: Request, res: Response) => {
  const { deporte_id } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('tabla_posiciones')
    .select(`
      equipo_id, deporte_id, partidos_jugados, ganados, empatados, perdidos,
      puntos_totales, puntos_favor, puntos_contra, diferencia,
      equipos(id, nombre_equipo, grados(nombre, pais_asignado))
    `)
    .order('puntos_totales', { ascending: false })
    .order('diferencia', { ascending: false })

  if (deporte_id && deporte_id !== 'todos') query = query.eq('deporte_id', deporte_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /public/goleadores?deporte_id= — ranking de anotadores (lectura pública, sin auth)
app.get('/public/goleadores', async (req: Request, res: Response) => {
  const { deporte_id, limit } = req.query as Record<string, string>
  const top = Math.min(Number(limit) || 20, 100)

  let query = supabaseAdmin
    .from('ranking_goleadores')
    .select('deporte_id, participante_id, nombre_completo, equipo_id, total_puntos, total_asistencias')
    .order('total_puntos', { ascending: false })
    .limit(top)

  if (deporte_id && deporte_id !== 'todos') query = query.eq('deporte_id', deporte_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
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
    .upsert({ encuentro_id, puntos_local, puntos_visitante }, { onConflict: 'encuentro_id' })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json(data)
})

app.listen(PORT, () => {
  console.log(`[Resultados Service] corriendo en http://localhost:${PORT}`)
})
