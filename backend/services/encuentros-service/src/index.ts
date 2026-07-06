import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3008

app.use(cors())
app.use(express.json())

const SELECT_ENCUENTRO = `
  id, fecha_hora, estado, deporte_id, equipo_local_id, equipo_visitante_id,
  deportes(id, nombre, slug),
  equipo_local:equipos!equipo_local_id(id, nombre_equipo, descalificado, grados(nombre, pais_asignado)),
  equipo_visitante:equipos!equipo_visitante_id(id, nombre_equipo, descalificado, grados(nombre, pais_asignado)),
  resultados(encuentro_id, puntos_local, puntos_visitante)
`.trim()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'encuentros-service' })
})

// GET /public/encuentros — lectura pública para espectadores (sin auth)
app.get('/public/encuentros', async (req: Request, res: Response) => {
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
  // Calcular "hoy" en hora peruana (UTC-5)
  const PERU_OFFSET_MS = -5 * 60 * 60 * 1000
  const ahoraPerú = new Date(Date.now() + PERU_OFFSET_MS)
  const yyyy = ahoraPerú.getUTCFullYear()
  const mm   = ahoraPerú.getUTCMonth()
  const dd   = ahoraPerú.getUTCDate()
  const inicio = new Date(Date.UTC(yyyy, mm, dd) - PERU_OFFSET_MS).toISOString()
  const fin    = new Date(Date.UTC(yyyy, mm, dd + 1) - PERU_OFFSET_MS).toISOString()

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

// GET /encuentros/clasificacion?deporte_id= — tabla de posiciones
app.get('/encuentros/clasificacion', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id } = req.query as Record<string, string>
  if (!deporte_id) return res.status(400).json({ error: 'deporte_id requerido' })

  const [{ data: equipos }, { data: encuentros }, { data: resultados }] = await Promise.all([
    supabaseAdmin.from('equipos').select('id, nombre_equipo, grados(nombre, pais_asignado)').eq('deporte_id', deporte_id).eq('descalificado', false),
    supabaseAdmin.from('encuentros').select('id, equipo_local_id, equipo_visitante_id').eq('deporte_id', deporte_id),
    supabaseAdmin.from('resultados').select('encuentro_id, puntos_local, puntos_visitante'),
  ])

  const resultadoMap: Record<string, { puntos_local: number; puntos_visitante: number }> = {}
  resultados?.forEach(r => { resultadoMap[r.encuentro_id] = r })

  const tabla = (equipos ?? []).map(eq => {
    let pj = 0, pg = 0, pe = 0, pp = 0, pf = 0, pc = 0

    ;(encuentros ?? []).forEach(enc => {
      const res = resultadoMap[enc.id]
      if (!res) return
      const esLocal = enc.equipo_local_id === eq.id
      const esVisit = enc.equipo_visitante_id === eq.id
      if (!esLocal && !esVisit) return

      pj++
      const misPuntos  = esLocal ? res.puntos_local      : res.puntos_visitante
      const susPuntos  = esLocal ? res.puntos_visitante   : res.puntos_local
      pf += misPuntos
      pc += susPuntos
      if (misPuntos > susPuntos)      pg++
      else if (misPuntos === susPuntos) pe++
      else                              pp++
    })

    const gradosObj = eq.grados as { nombre?: string; pais_asignado?: string } | null
    return {
      equipo_id:    eq.id,
      nombre_equipo: eq.nombre_equipo,
      grado:        gradosObj?.nombre        ?? eq.nombre_equipo ?? '—',
      pais:         gradosObj?.pais_asignado ?? null,
      pj, g: pg, e: pe, p: pp,
      pts: pg * 3 + pe,
      gf: pf, gc: pc,
      dif: pf - pc,
    }
  }).sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf)

  return res.json(tabla)
})

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Fechas de fixture dentro de la ventana del torneo ──────────────────────
// Los partidos se reparten uniformemente entre mañana (10:00) y el fin del
// torneo, con horas comprimidas al horario deportivo (10:00–22:00).
// Si el admin no definió el fin, el sistema asume la duración estándar de un
// torneo escolar (30 días) y la registra automáticamente en la configuración.
const DURACION_TORNEO_DIAS = 30

async function fechasParaFixture(totalPartidos: number): Promise<Date[]> {
  const inicio = new Date()
  inicio.setDate(inicio.getDate() + 1)
  inicio.setHours(10, 0, 0, 0)

  const { data } = await supabaseAdmin
    .from('configuracion')
    .select('valor')
    .eq('clave', 'fecha_fin_torneo')
    .maybeSingle()
  const finConfig = data?.valor ? new Date(data.valor) : null

  let fin: Date
  if (finConfig && finConfig > inicio) {
    fin = finConfig
  } else {
    // Sin fecha válida: duración estándar, y el sistema la deja configurada
    fin = new Date(inicio.getTime() + DURACION_TORNEO_DIAS * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('configuracion')
      .upsert({ clave: 'fecha_fin_torneo', valor: fin.toISOString() }, { onConflict: 'clave' })
    console.log(`[Fixture] fecha_fin_torneo autoconfigurada (+${DURACION_TORNEO_DIAS} días): ${fin.toISOString()}`)
  }

  const DIA_MS = 24 * 60 * 60 * 1000
  const paso = (fin.getTime() - inicio.getTime()) / Math.max(totalPartidos, 1)
  return Array.from({ length: totalPartidos }, (_, i) => {
    const offset = paso * i
    // Día del torneo en que cae el partido + su posición dentro de ese día,
    // mapeada al horario deportivo (10:00–22:00) en cuartos de hora.
    // El primer partido siempre abre a las 10:00.
    const dias = Math.floor(offset / DIA_MS)
    const fraccionDia = (offset % DIA_MS) / DIA_MS
    const minutosVentana = Math.round((fraccionDia * 12 * 60) / 15) * 15
    const f = new Date(inicio.getTime() + dias * DIA_MS)
    f.setHours(10 + Math.floor(minutosVentana / 60), minutosVentana % 60, 0, 0)
    return f
  })
}

// POST /encuentros/generar-torneo — genera fixtures round-robin con fechas automáticas
// Atletismo no compite por enfrentamientos: usa pruebas individuales con
// sorteo de carriles (estadisticas-service). No se le generan encuentros.
async function esAtletismo(deporte_id: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('deportes').select('slug').eq('id', deporte_id).single()
  return data?.slug === 'atletismo'
}

app.post('/encuentros/generar-torneo', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id } = req.body as { deporte_id: string }
  if (!deporte_id) return res.status(400).json({ error: 'deporte_id requerido' })

  if (await esAtletismo(deporte_id)) {
    return res.status(400).json({ error: 'Atletismo no usa encuentros: su competencia es por pruebas con sorteo de carriles.' })
  }

  const { data: equipos, error: errEq } = await supabaseAdmin
    .from('equipos')
    .select('id')
    .eq('deporte_id', deporte_id)
    .eq('descalificado', false)

  if (errEq) return res.status(500).json({ error: errEq.message })
  if (!equipos || equipos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar el torneo.' })

  const { data: existentes } = await supabaseAdmin
    .from('encuentros')
    .select('id', { count: 'exact', head: false })
    .eq('deporte_id', deporte_id)

  if (existentes && existentes.length > 0) {
    return res.status(409).json({ error: 'Ya existen encuentros para este deporte.', code: 'YA_EXISTE' })
  }

  const equiposMezclados = shuffle(equipos)
  const totalPartidos = equiposMezclados.length * (equiposMezclados.length - 1) / 2
  const fechas = await fechasParaFixture(totalPartidos)
  let idx = 0

  const partidos: { deporte_id: string; equipo_local_id: string; equipo_visitante_id: string; estado: string; fecha_hora: string }[] = []
  for (let i = 0; i < equiposMezclados.length; i++) {
    for (let j = i + 1; j < equiposMezclados.length; j++) {
      partidos.push({
        deporte_id,
        equipo_local_id:    equiposMezclados[i].id,
        equipo_visitante_id: equiposMezclados[j].id,
        estado:    'programado',
        fecha_hora: fechas[idx].toISOString(),
      })
      idx++
    }
  }

  const { data, error } = await supabaseAdmin.from('encuentros').insert(partidos).select(SELECT_ENCUENTRO)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ total: data?.length ?? 0, encuentros: data })
})

// POST /encuentros/regenerar-torneo — elimina y regenera fixtures
app.post('/encuentros/regenerar-torneo', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id, confirmar } = req.body as { deporte_id: string; confirmar?: boolean }
  if (!deporte_id) return res.status(400).json({ error: 'deporte_id requerido' })
  if (!confirmar)  return res.status(400).json({ error: 'Confirmación requerida.', code: 'CONFIRMAR' })

  if (await esAtletismo(deporte_id)) {
    return res.status(400).json({ error: 'Atletismo no usa encuentros: su competencia es por pruebas con sorteo de carriles.' })
  }

  const { error: errDel } = await supabaseAdmin
    .from('encuentros')
    .delete()
    .eq('deporte_id', deporte_id)

  if (errDel) return res.status(500).json({ error: errDel.message })

  const { data: equipos } = await supabaseAdmin.from('equipos').select('id').eq('deporte_id', deporte_id).eq('descalificado', false)
  if (!equipos || equipos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos.' })

  const equiposMezclados2 = shuffle(equipos)
  const totalPartidos2 = equiposMezclados2.length * (equiposMezclados2.length - 1) / 2
  const fechas2 = await fechasParaFixture(totalPartidos2)
  let idx2 = 0

  const partidos: { deporte_id: string; equipo_local_id: string; equipo_visitante_id: string; estado: string; fecha_hora: string }[] = []
  for (let i = 0; i < equiposMezclados2.length; i++) {
    for (let j = i + 1; j < equiposMezclados2.length; j++) {
      partidos.push({
        deporte_id,
        equipo_local_id:    equiposMezclados2[i].id,
        equipo_visitante_id: equiposMezclados2[j].id,
        estado:    'programado',
        fecha_hora: fechas2[idx2].toISOString(),
      })
      idx2++
    }
  }

  const { data, error } = await supabaseAdmin.from('encuentros').insert(partidos).select(SELECT_ENCUENTRO)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ total: data?.length ?? 0, encuentros: data })
})

// PUT /encuentros/:id — actualiza estado o fecha de un encuentro
app.put('/encuentros/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const body = req.body as { estado?: string; fecha_hora?: string }

  // Un encuentro finalizado (con resultado registrado) no admite cambios de fecha
  if (body.fecha_hora) {
    const { data: actual, error: errActual } = await supabaseAdmin
      .from('encuentros')
      .select('estado')
      .eq('id', id)
      .single()

    if (errActual) return res.status(500).json({ error: errActual.message })
    if (actual?.estado === 'finalizado') {
      return res.status(409).json({ error: 'No se puede editar la fecha de un encuentro finalizado.' })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('encuentros')
    .update(body)
    .eq('id', id)
    .select(SELECT_ENCUENTRO)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// DELETE /encuentros/:id — elimina un encuentro
app.delete('/encuentros/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { error } = await supabaseAdmin.from('encuentros').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
})

// ── Configuración del torneo ──────────────────────────────────────────────

app.get('/config', async (_req, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .select('clave, valor')

  if (error) return res.status(500).json({ error: error.message })

  const cfg: Record<string, string | null> = {
    fecha_limite_inscripciones: null,
    fecha_fin_torneo: null,
    nombre_torneo: null,
    anio_torneo: null,
    limite_deportes_grado: null,
    sets_pingpong: null,
  }
  data?.forEach(row => { cfg[row.clave] = row.valor })

  // Auto-curación: si no hay fecha de fin pero ya existen encuentros programados,
  // se deduce del último partido (+1 día) y se persiste para el resto del sistema
  if (!cfg.fecha_fin_torneo) {
    const { data: ultimo } = await supabaseAdmin
      .from('encuentros')
      .select('fecha_hora')
      .order('fecha_hora', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimo?.fecha_hora) {
      const finAuto = new Date(new Date(ultimo.fecha_hora).getTime() + 24 * 60 * 60 * 1000)
      await supabaseAdmin
        .from('configuracion')
        .upsert({ clave: 'fecha_fin_torneo', valor: finAuto.toISOString() }, { onConflict: 'clave' })
      cfg.fecha_fin_torneo = finAuto.toISOString()
      console.log(`[Config] fecha_fin_torneo deducida del último encuentro: ${finAuto.toISOString()}`)
    }
  }

  return res.json(cfg)
})

app.put('/config', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const values = req.body as Record<string, string | null>
  const entries = Object.entries(values)

  const toUpsert = entries.filter(([, v]) => v !== null && v !== '').map(([clave, valor]) => ({ clave, valor: valor! }))
  const toDelete = entries.filter(([, v]) => v === null || v === '').map(([clave]) => clave)

  const ops: PromiseLike<{ error: { message: string } | null }>[] = []

  if (toUpsert.length > 0) {
    ops.push(supabaseAdmin.from('configuracion').upsert(toUpsert, { onConflict: 'clave' }))
  }
  if (toDelete.length > 0) {
    ops.push(supabaseAdmin.from('configuracion').delete().in('clave', toDelete))
  }

  const results = await Promise.all(ops)
  const err = results.find(r => r.error)?.error
  if (err) return res.status(500).json({ error: err.message })
  return res.json({ ok: true })
})

// ── Ciclo de vida del torneo ───────────────────────────────────────────────

// POST /torneo/reiniciar-Borra y cuenta nueva para una nueva edición:
// se limpian encuentros, resultados y estadísticas, y los equipos descalificados
// vuelven a estar habilitados. Los equipos, jugadores y cuentas se conservan.
app.post('/torneo/reiniciar', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede iniciar un nuevo torneo.' })
  }

  const { confirmar } = req.body as { confirmar?: boolean }
  if (!confirmar) return res.status(400).json({ error: 'Confirmación requerida.', code: 'CONFIRMAR' })

  // Orden importa: primero lo que referencia encuentros, luego encuentros
  await supabaseAdmin.from('resultados').delete().not('encuentro_id', 'is', null)
  await supabaseAdmin.from('estadisticas_jugador').delete().not('participante_id', 'is', null)
  await supabaseAdmin.from('atletismo_resultados').delete().not('id', 'is', null)
  await supabaseAdmin.from('atletismo_sorteo').delete().gte('carril', 0)
  await supabaseAdmin.from('encuentros').delete().not('id', 'is', null)

  // Rehabilitar equipos descalificados en toda la plataforma
  const { data: rehabilitados } = await supabaseAdmin
    .from('equipos')
    .update({ descalificado: false })
    .eq('descalificado', true)
    .select('id')

  // Limpiar las fechas del ciclo anterior (el admin define las nuevas)
  await supabaseAdmin.from('configuracion').delete().in('clave', ['fecha_limite_inscripciones', 'fecha_fin_torneo', 'cierre_notificado', 'fin_notificado'])

  // Avisar a todos los roles
  await supabaseAdmin.from('notificaciones').insert(
    ['administrador', 'coordinador', 'espectador'].map(rol => ({
      rol_destino: rol,
      tipo: 'encuentro',
      titulo: 'Nuevo torneo iniciado',
      mensaje: 'Se reinició el torneo: los resultados anteriores fueron archivados y todos los equipos están habilitados.',
    }))
  )

  return res.json({ ok: true, equipos_rehabilitados: rehabilitados?.length ?? 0 })
})

// ── Usuarios (coordinadores / espectadores) ───────────────────────────────
// Reglas por rol:
//  - administrador: gestiona coordinadores y espectadores de todo el torneo
//  - coordinador:   gestiona SOLO espectadores de su propio grado (sus alumnos)

async function gradoDelCoordinador(userId: string): Promise<{ grado_id: string; institucion_id: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('grado_id, institucion_id')
    .eq('id', userId)
    .single()
  return data?.grado_id ? { grado_id: data.grado_id, institucion_id: data.institucion_id ?? null } : null
}

app.get('/usuarios', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const rolActor = req.user?.rol ?? ''
  if (!['administrador', 'coordinador'].includes(rolActor)) {
    return res.status(403).json({ error: 'Sin permisos para listar usuarios.' })
  }

  let query = supabaseAdmin
    .from('usuarios')
    .select(`id, nombre, email, rol, grado_id, institucion_id,
      grados(nombre, pais_asignado)`)
    .order('nombre')

  if (rolActor === 'administrador') {
    query = query.in('rol', ['coordinador', 'espectador'])
  } else {
    // Coordinador: solo los espectadores de su grado
    const actor = await gradoDelCoordinador(req.user!.id)
    if (!actor) return res.status(403).json({ error: 'No tienes un grado asignado.' })
    query = query.eq('rol', 'espectador').eq('grado_id', actor.grado_id)
  }

  const { data, error } = await query

  if (error) return res.status(500).json({ error: error.message })

  // Obtener codigos de países
  const { data: paisesList } = await supabaseAdmin
    .from('grados_paises')
    .select('pais, codigo')

  const codigoMap: Record<string, string> = {}
  paisesList?.forEach(p => { codigoMap[p.pais] = p.codigo })

  const result = data?.map(u => {
    const pais = (u.grados as any)?.pais_asignado ?? null
    return {
      id:          u.id,
      nombre:      u.nombre,
      email:       u.email,
      rol:         u.rol,
      grado:       (u.grados as any)?.nombre ?? null,
      pais,
      pais_codigo: pais ? (codigoMap[pais] ?? null) : null,
    }
  })
  return res.json(result)
})

app.post('/usuarios', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const rolActor = req.user?.rol ?? ''
  if (!['administrador', 'coordinador'].includes(rolActor)) {
    return res.status(403).json({ error: 'Sin permisos para crear usuarios.' })
  }

  const { nombre, email, password } = req.body
  let { rol, grado_id, institucion_id } = req.body

  if (rolActor === 'coordinador') {
    // El coordinador solo puede crear espectadores, y siempre de SU grado
    // (se ignora lo que venga en el body: la regla la impone el servidor)
    const actor = await gradoDelCoordinador(req.user!.id)
    if (!actor) return res.status(403).json({ error: 'No tienes un grado asignado.' })
    rol = 'espectador'
    grado_id = actor.grado_id
    institucion_id = actor.institucion_id
  } else if (!['coordinador', 'espectador'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nombre },
  })
  if (authError) return res.status(400).json({ error: authError.message })

  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .insert({ id: authData.user.id, nombre, email, rol, grado_id: grado_id ?? null, institucion_id: institucion_id ?? null })

  if (dbError) return res.status(500).json({ error: dbError.message })
  return res.json({ ok: true })
})

app.delete('/usuarios/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const rolActor = req.user?.rol ?? ''

  if (rolActor === 'coordinador') {
    // Solo puede eliminar espectadores de su propio grado
    const actor = await gradoDelCoordinador(req.user!.id)
    if (!actor) return res.status(403).json({ error: 'No tienes un grado asignado.' })

    const { data: objetivo } = await supabaseAdmin
      .from('usuarios')
      .select('rol, grado_id')
      .eq('id', id)
      .single()

    if (!objetivo || objetivo.rol !== 'espectador' || objetivo.grado_id !== actor.grado_id) {
      return res.status(403).json({ error: 'Solo puedes eliminar espectadores de tu grado.' })
    }
  } else if (rolActor !== 'administrador') {
    return res.status(403).json({ error: 'Sin permisos para eliminar usuarios.' })
  }

  await supabaseAdmin.from('usuarios').delete().eq('id', id)
  await supabaseAdmin.auth.admin.deleteUser(id)
  return res.json({ ok: true })
})

// DELETE /encuentros/deporte/:deporte_id — elimina todos los encuentros de un deporte
app.delete('/encuentros/deporte/:deporte_id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { deporte_id } = req.params
  const { error } = await supabaseAdmin.from('encuentros').delete().eq('deporte_id', deporte_id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
})

// ── Auto en_curso: actualiza a "en_curso" los encuentros cuya hora ya llegó ──
async function autoEnCurso() {
  try {
    const ahora = new Date().toISOString()
    await supabaseAdmin
      .from('encuentros')
      .update({ estado: 'en_curso' })
      .eq('estado', 'programado')
      .lte('fecha_hora', ahora)
  } catch (err) {
    console.error('[Auto-en_curso] Error:', err)
  }
}

// ── Auto-sorteo: se ejecuta cada minuto y genera torneos cuando vence fecha límite ──
async function autoSorteo() {
  try {
    const { data: config } = await supabaseAdmin
      .from('configuracion')
      .select('clave, valor')

    const fechaLimite = config?.find(c => c.clave === 'fecha_limite_inscripciones')?.valor
    if (!fechaLimite) return

    const ahora = new Date()
    if (ahora < new Date(fechaLimite)) return

    // Fecha límite ya pasó — generar torneos para deportes que tengan equipos pero
    // no encuentros (atletismo se excluye: compite por pruebas, no enfrentamientos)
    const { data: deportes } = await supabaseAdmin
      .from('deportes')
      .select('id, slug')
      .eq('activo', true)
      .neq('slug', 'atletismo')
    if (!deportes) return

    for (const deporte of deportes) {
      const { data: equipos } = await supabaseAdmin
        .from('equipos').select('id').eq('deporte_id', deporte.id).eq('descalificado', false)

      if (!equipos || equipos.length < 2) continue

      const { data: existentes } = await supabaseAdmin
        .from('encuentros').select('id').eq('deporte_id', deporte.id).limit(1)

      if (existentes && existentes.length > 0) continue // ya tiene encuentros

      // Generar round-robin con shuffle
      const mezclados = shuffle([...equipos])
      const totalPartidos = mezclados.length * (mezclados.length - 1) / 2
      const fechas = await fechasParaFixture(totalPartidos)
      let idx = 0
      const partidos = []
      for (let i = 0; i < mezclados.length; i++) {
        for (let j = i + 1; j < mezclados.length; j++) {
          partidos.push({
            deporte_id: deporte.id,
            equipo_local_id: mezclados[i].id,
            equipo_visitante_id: mezclados[j].id,
            estado: 'programado',
            fecha_hora: fechas[idx].toISOString(),
          })
          idx++
        }
      }
      await supabaseAdmin.from('encuentros').insert(partidos)
      console.log(`[Auto-sorteo] Generados ${partidos.length} encuentros para deporte ${deporte.id}`)
    }
  } catch (err) {
    console.error('[Auto-sorteo] Error:', err)
  }
}

// ── Aviso de cierre de inscripciones: notifica UNA vez cuando vence la fecha ──
// El marcador 'cierre_notificado' guarda para qué fecha límite ya se avisó; si el
// admin cambia la fecha, el nuevo vencimiento genera un nuevo aviso.
async function notificarCierreInscripciones() {
  try {
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['fecha_limite_inscripciones', 'cierre_notificado'])

    const fechaLimite = cfg?.find(c => c.clave === 'fecha_limite_inscripciones')?.valor
    const yaNotificado = cfg?.find(c => c.clave === 'cierre_notificado')?.valor

    if (!fechaLimite) return
    if (new Date() < new Date(fechaLimite)) return
    if (yaNotificado === fechaLimite) return   // ya se avisó para esta fecha

    await supabaseAdmin.from('notificaciones').insert([
      {
        rol_destino: 'coordinador',
        tipo: 'encuentro',
        titulo: 'Inscripciones cerradas',
        mensaje: 'El período de inscripciones ha finalizado. Ya no es posible modificar equipos ni jugadores. Los encuentros se generarán automáticamente.',
      },
      {
        rol_destino: 'espectador',
        tipo: 'encuentro',
        titulo: '¡Comienza el torneo!',
        mensaje: 'Las inscripciones han cerrado. Pronto podrás ver el calendario de encuentros programados.',
      },
    ])

    await supabaseAdmin
      .from('configuracion')
      .upsert({ clave: 'cierre_notificado', valor: fechaLimite }, { onConflict: 'clave' })

    console.log('[Notif-cierre] Aviso de cierre de inscripciones enviado')
  } catch (err) {
    console.error('[Notif-cierre] Error:', err)
  }
}

// ── Aviso de fin del torneo: notifica UNA vez cuando vence fecha_fin_torneo ──
async function notificarFinTorneo() {
  try {
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['fecha_fin_torneo', 'fin_notificado', 'nombre_torneo', 'anio_torneo'])

    const fechaFin = cfg?.find(c => c.clave === 'fecha_fin_torneo')?.valor
    const yaNotificado = cfg?.find(c => c.clave === 'fin_notificado')?.valor

    if (!fechaFin) return
    if (new Date() < new Date(fechaFin)) return
    if (yaNotificado === fechaFin) return

    const nombre = cfg?.find(c => c.clave === 'nombre_torneo')?.valor ?? 'El torneo'
    const anio   = cfg?.find(c => c.clave === 'anio_torneo')?.valor ?? ''
    const titulo = `${nombre} ${anio}`.trim()

    await supabaseAdmin.from('notificaciones').insert([
      {
        rol_destino: 'administrador',
        tipo: 'encuentro',
        titulo: 'Torneo finalizado',
        mensaje: `${titulo} ha llegado a su fin. El registro de resultados quedó cerrado. Puedes iniciar un nuevo torneo desde Configuración.`,
      },
      {
        rol_destino: 'coordinador',
        tipo: 'encuentro',
        titulo: 'Torneo finalizado',
        mensaje: `${titulo} ha llegado a su fin. Revisa la tabla de posiciones para ver la clasificación final de tus equipos.`,
      },
      {
        rol_destino: 'espectador',
        tipo: 'encuentro',
        titulo: `¡${titulo} ha finalizado!`,
        mensaje: 'Gracias por acompañarnos. Revisa la tabla de posiciones para conocer a los campeones.',
      },
    ])

    await supabaseAdmin
      .from('configuracion')
      .upsert({ clave: 'fin_notificado', valor: fechaFin }, { onConflict: 'clave' })

    console.log('[Notif-fin] Aviso de fin del torneo enviado')
  } catch (err) {
    console.error('[Notif-fin] Error:', err)
  }
}

setInterval(() => { autoSorteo(); autoEnCurso(); notificarCierreInscripciones(); notificarFinTorneo() }, 60 * 1000) // cada minuto

// PUT /me/password — cambiar contraseña del usuario autenticado
app.put('/me/password', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  const { passwordActual, passwordNueva } = req.body as { passwordActual?: string; passwordNueva?: string }
  if (!passwordActual || !passwordNueva) return res.status(400).json({ error: 'Faltan campos requeridos' })
  if (passwordNueva.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  if (passwordNueva === passwordActual) return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual' })

  // Verificar contraseña actual a través de Supabase Auth
  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (userErr || !userData.user?.email) return res.status(400).json({ error: 'No se pudo verificar el usuario' })

  const { error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
    email: userData.user.email,
    password: passwordActual,
  })
  if (signInErr) return res.status(400).json({ error: 'La contraseña actual es incorrecta' })

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: passwordNueva })
  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[Encuentros Service] corriendo en http://localhost:${PORT}`)
})