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

// ─── GET /atletismo/sorteo?prueba= — carriles asignados ─────────────────────
app.get('/atletismo/sorteo', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { prueba } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('atletismo_sorteo')
    .select(`
      id, prueba, carril,
      participante_id,
      participantes(nombre_completo, posicion,
        equipos(grados(nombre, pais_asignado))
      )
    `)
    .order('prueba').order('carril')

  if (prueba) query = query.eq('prueba', prueba)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// ─── Sorteo de carriles de atletismo (lógica compartida: manual y automático) ──
async function generarSorteoCarriles(): Promise<{ total: number; pruebas: number; omitidas: { prueba: string; inscritos: number }[] }> {
  const { data: participantes, error } = await supabaseAdmin
    .from('participantes')
    .select('id, posicion, equipos!inner(descalificado, deportes!inner(slug))')
    .eq('activo', true)
    .eq('equipos.deportes.slug', 'atletismo')
    .eq('equipos.descalificado', false)
    .not('posicion', 'is', null)

  if (error) throw new Error(error.message)

  const byPrueba: Record<string, string[]> = {}
  participantes?.forEach(p => {
    if (!p.posicion) return
    if (!byPrueba[p.posicion]) byPrueba[p.posicion] = []
    byPrueba[p.posicion].push(p.id)
  })

  const rows: { prueba: string; participante_id: string; carril: number }[] = []
  const omitidas: { prueba: string; inscritos: number }[] = []

  Object.entries(byPrueba).forEach(([prueba, ids]) => {
    if (ids.length < 2) {
      omitidas.push({ prueba, inscritos: ids.length })
      return
    }
    const shuffled = [...ids].sort(() => Math.random() - 0.5)
    shuffled.forEach((id, i) => rows.push({ prueba, participante_id: id, carril: i + 1 }))
  })

  await supabaseAdmin.from('atletismo_sorteo').delete().gte('carril', 1)

  if (rows.length === 0) return { total: 0, pruebas: 0, omitidas }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('atletismo_sorteo').insert(rows).select()

  if (insertError) throw new Error(insertError.message)
  return {
    total: inserted?.length ?? 0,
    pruebas: Object.keys(byPrueba).filter(p => !omitidas.find(o => o.prueba === p)).length,
    omitidas,
  }
}

// ─── POST /atletismo/sorteo/generar — sorteo aleatorio de carriles (manual) ──
app.post('/atletismo/sorteo/generar', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') return res.status(403).json({ error: 'Sin permisos.' })

  try {
    const resultado = await generarSorteoCarriles()
    return res.status(resultado.total > 0 ? 201 : 200).json(resultado)
  } catch (e: unknown) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

// ─── Sorteo de carriles automático: al vencer la fecha límite de inscripciones,
// si aún no hay carriles sorteados, se generan solos (mismo patrón que el
// auto-sorteo de fixtures en encuentros-service, cada servicio en su dominio) ──
async function autoSorteoCarriles() {
  try {
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('valor')
      .eq('clave', 'fecha_limite_inscripciones')
      .maybeSingle()

    if (!cfg?.valor || new Date() < new Date(cfg.valor)) return

    const { data: existentes } = await supabaseAdmin
      .from('atletismo_sorteo')
      .select('participante_id')
      .limit(1)
    if (existentes && existentes.length > 0) return   // ya hay sorteo

    const resultado = await generarSorteoCarriles()
    if (resultado.total > 0) {
      console.log(`[Auto-carriles] Sorteo de atletismo generado: ${resultado.total} carriles en ${resultado.pruebas} pruebas`)
    }
  } catch (err) {
    console.error('[Auto-carriles] Error:', err)
  }
}

setInterval(autoSorteoCarriles, 60 * 1000) // cada minuto

// ─── DELETE /atletismo/sorteo — eliminar sorteo y resultados asociados ──────
app.delete('/atletismo/sorteo', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') return res.status(403).json({ error: 'Sin permisos.' })

  const { error: errorSorteo } = await supabaseAdmin.from('atletismo_sorteo').delete().gte('carril', 1)
  if (errorSorteo) return res.status(400).json({ error: errorSorteo.message })

  const { error: errorResultados } = await supabaseAdmin.from('atletismo_resultados').delete().not('id', 'is', null)
  if (errorResultados) return res.status(400).json({ error: errorResultados.message })

  return res.json({ ok: true })
})

// ─── GET /atletismo/participantes?prueba= — atletas de una prueba ──────────
app.get('/atletismo/participantes', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { prueba } = req.query as Record<string, string>
  if (!prueba) return res.status(400).json({ error: 'prueba es requerida.' })

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .select(`
      id, nombre_completo, posicion,
      equipos!inner(
        deporte_id, grado_id,
        deportes!inner(slug),
        grados(nombre, pais_asignado)
      )
    `)
    .eq('posicion', prueba)
    .eq('activo', true)
    .eq('equipos.deportes.slug', 'atletismo')
    .eq('equipos.descalificado', false)

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// ─── GET /atletismo/resultados?prueba= — resultados de una prueba ──────────
app.get('/atletismo/resultados', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { prueba } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('atletismo_resultados')
    .select(`
      id, prueba, posicion_final, puntos, participante_id,
      participantes(nombre_completo, posicion,
        equipos(grados(nombre, pais_asignado))
      )
    `)
    .order('posicion_final', { ascending: true })

  if (prueba) query = query.eq('prueba', prueba)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// ─── POST /atletismo/resultados — guardar resultados de una prueba ──────────
app.post('/atletismo/resultados', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede registrar resultados.' })
  }

  const { resultados } = req.body as {
    resultados: { prueba: string; participante_id: string; posicion_final: number; puntos: number }[]
  }

  if (!resultados || !Array.isArray(resultados) || resultados.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de resultados.' })
  }

  const { data, error } = await supabaseAdmin
    .from('atletismo_resultados')
    .upsert(resultados, { onConflict: 'prueba,participante_id' })
    .select()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json(data)
})

// ─── DELETE /atletismo/resultados/:id — eliminar resultado individual ──────
app.delete('/atletismo/resultados/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede eliminar resultados.' })
  }

  const { error } = await supabaseAdmin
    .from('atletismo_resultados')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Resultado eliminado correctamente.' })
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