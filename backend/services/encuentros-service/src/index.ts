import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3008

app.use(cors())
app.use(express.json())

const SELECT_ENCUENTRO = `
  id, fecha_hora, estado, deporte_id, equipo_local_id, equipo_visitante_id,
  deportes(id, nombre),
  equipo_local:equipos!equipo_local_id(id, nombre_equipo, grados(nombre, pais_asignado)),
  equipo_visitante:equipos!equipo_visitante_id(id, nombre_equipo, grados(nombre, pais_asignado)),
  resultados(encuentro_id, puntos_local, puntos_visitante)
`.trim()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'encuentros-service' })
})

// GET /encuentros — lista con filtros opcionales
app.get('/encuentros', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id, estado } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('encuentros')
    .select(SELECT_ENCUENTRO)
    .order('fecha_hora', { ascending: true })

  if (deporte_id && deporte_id !== 'todos') query = query.eq('deporte_id', deporte_id)
  if (estado      && estado      !== 'todos') query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /encuentros/hoy — encuentros del día actual (para dashboard)
app.get('/encuentros/hoy', requireAuth as any, async (_req: AuthenticatedRequest, res: Response) => {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const fin    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

  const { data, error } = await supabaseAdmin
    .from('encuentros')
    .select(SELECT_ENCUENTRO)
    .gte('fecha_hora', inicio)
    .lt('fecha_hora', fin)
    .order('fecha_hora', { ascending: true })
    .limit(6)

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /encuentros/stats — conteos por estado
app.get('/encuentros/stats', requireAuth as any, async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('encuentros')
    .select('id', { count: 'exact', head: false })

  if (error) return res.status(500).json({ error: error.message })

  const { count: total } = await supabaseAdmin.from('encuentros').select('id', { count: 'exact', head: true })
  const estados = ['programado', 'en_curso', 'finalizado', 'postergado']
  const counts: Record<string, number> = { total: total ?? 0 }

  await Promise.all(
    estados.map(async estado => {
      const { count } = await supabaseAdmin
        .from('encuentros')
        .select('id', { count: 'exact', head: true })
        .eq('estado', estado)
      counts[estado] = count ?? 0
    })
  )

  return res.json(counts)
})

app.listen(PORT, () => {
  console.log(`[Encuentros Service] corriendo en http://localhost:${PORT}`)
})
