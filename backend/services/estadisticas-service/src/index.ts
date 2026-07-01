import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3010

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'estadisticas-service' })
})

// ─── GET /estadisticas?encuentro_id= — estadísticas de un encuentro ────────
app.get('/estadisticas', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { encuentro_id } = req.query as Record<string, string>

  if (!encuentro_id) {
    return res.status(400).json({ error: 'Se requiere encuentro_id.' })
  }

  const { data, error } = await supabaseAdmin
    .from('estadisticas_jugador')
    .select(`
      id, encuentro_id, participante_id, puntos, asistencias,
      tarjetas_amarillas, tarjetas_rojas, created_at,
      participantes(id, nombre_completo, posicion, equipo_id)
    `)
    .eq('encuentro_id', encuentro_id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// ─── POST /estadisticas — registrar/actualizar stats de un jugador ─────────
app.post('/estadisticas', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede registrar estadísticas.' })
  }

  const { encuentro_id, participante_id, puntos, asistencias, tarjetas_amarillas, tarjetas_rojas } = req.body

  if (!encuentro_id || !participante_id) {
    return res.status(400).json({ error: 'encuentro_id y participante_id son requeridos.' })
  }

  const { data, error } = await supabaseAdmin
    .from('estadisticas_jugador')
    .upsert(
      {
        encuentro_id,
        participante_id,
        puntos:             puntos             ?? 0,
        asistencias:        asistencias        ?? 0,
        tarjetas_amarillas: tarjetas_amarillas ?? 0,
        tarjetas_rojas:     tarjetas_rojas     ?? 0,
      },
      { onConflict: 'encuentro_id,participante_id' }
    )
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json(data)
})

// ─── POST /estadisticas/bulk — guardar estadísticas de múltiples jugadores ─
app.post('/estadisticas/bulk', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede registrar estadísticas.' })
  }

  const { estadisticas } = req.body as {
    estadisticas: {
      encuentro_id: string
      participante_id: string
      puntos: number
      asistencias: number
      tarjetas_amarillas: number
      tarjetas_rojas: number
    }[]
  }

  if (!estadisticas || !Array.isArray(estadisticas) || estadisticas.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de estadisticas.' })
  }

  const rows = estadisticas.map(e => ({
    encuentro_id:       e.encuentro_id,
    participante_id:    e.participante_id,
    puntos:             e.puntos             ?? 0,
    asistencias:        e.asistencias        ?? 0,
    tarjetas_amarillas: e.tarjetas_amarillas ?? 0,
    tarjetas_rojas:     e.tarjetas_rojas     ?? 0,
  }))

  const { data, error } = await supabaseAdmin
    .from('estadisticas_jugador')
    .upsert(rows, { onConflict: 'encuentro_id,participante_id' })
    .select()

  if (error) {
    console.error('[bulk] Supabase error:', JSON.stringify(error))
    return res.status(400).json({ error: error.message })
  }
  return res.status(201).json(data)
})

// ─── GET /estadisticas/ranking?deporte_id= — ranking de jugadores ─────────
app.get('/estadisticas/ranking', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id } = req.query as Record<string, string>
  if (!deporte_id) return res.status(400).json({ error: 'deporte_id es requerido.' })

  // 1. Encuentros finalizados del deporte
  const { data: encuentros } = await supabaseAdmin
    .from('encuentros')
    .select('id')
    .eq('deporte_id', deporte_id)
    .eq('estado', 'finalizado')

  const ids = encuentros?.map(e => e.id) ?? []
  if (ids.length === 0) return res.json([])

  // 2. Estadísticas de esos encuentros con datos del jugador
  const { data: stats, error } = await supabaseAdmin
    .from('estadisticas_jugador')
    .select(`
      participante_id, puntos, asistencias, tarjetas_amarillas, tarjetas_rojas,
      participantes(nombre_completo, posicion, equipos(nombre_equipo, grados(nombre, pais_asignado)))
    `)
    .in('encuentro_id', ids)

  if (error) return res.status(500).json({ error: error.message })

  // 3. Agregar por jugador
  const map: Record<string, {
    participante_id: string; nombre: string; posicion: string | null
    grado: string; pais: string | null
    pts: number; asistencias: number; tarjetas_amarillas: number; tarjetas_rojas: number; pj: number
  }> = {}

  stats?.forEach(s => {
    const pid = s.participante_id
    const p   = s.participantes as any
    if (!map[pid]) {
      map[pid] = {
        participante_id: pid,
        nombre:    p?.nombre_completo ?? '—',
        posicion:  p?.posicion        ?? null,
        grado:     p?.equipos?.grados?.nombre        ?? '—',
        pais:      p?.equipos?.grados?.pais_asignado ?? null,
        pts: 0, asistencias: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0, pj: 0,
      }
    }
    map[pid].pts                += s.puntos
    map[pid].asistencias        += s.asistencias
    map[pid].tarjetas_amarillas += s.tarjetas_amarillas
    map[pid].tarjetas_rojas     += s.tarjetas_rojas
    map[pid].pj++
  })

  const ranking = Object.values(map)
    .filter(r => r.pts > 0 || r.asistencias > 0)
    .sort((a, b) => b.pts - a.pts || b.asistencias - a.asistencias)

  return res.json(ranking)
})

// ─── DELETE /estadisticas/:id — eliminar estadística individual ────────────
app.delete('/estadisticas/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede eliminar estadísticas.' })
  }

  const { error } = await supabaseAdmin
    .from('estadisticas_jugador')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Estadística eliminada correctamente.' })
})

app.listen(PORT, () => {
  console.log(`[Estadisticas Service] corriendo en http://localhost:${PORT}`)
})
