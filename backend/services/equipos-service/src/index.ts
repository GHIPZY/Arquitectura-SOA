import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3006

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'equipos-service' })
})

// GET /equipos — lista equipos con filtros opcionales
app.get('/equipos', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id, deporte_id, institucion_id, grado_id } = req.query as Record<string, string>

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('equipos')
      .select('*, grados(id, nombre, pais_asignado, institucion_id), deportes(id, nombre, slug, categoria, max_participantes, min_participantes)')
      .eq('id', id)
      .single()
    if (error) return res.status(404).json({ error: error.message })
    return res.json(data)
  }

  let query = supabaseAdmin
    .from('equipos')
    .select('*, grados(id, nombre, pais_asignado, institucion_id), deportes(id, nombre, slug, categoria, max_participantes, min_participantes)')
    .order('created_at', { ascending: false })

  if (deporte_id)    query = query.eq('deporte_id', deporte_id)
  if (institucion_id) query = query.eq('institucion_id', institucion_id)
  if (grado_id)      query = query.eq('grado_id', grado_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// Helper — verifica si el período de inscripciones está cerrado
async function inscripcionCerrada(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('configuracion')
    .select('valor')
    .eq('clave', 'fecha_limite_inscripciones')
    .maybeSingle()
  if (!data?.valor) return false
  return new Date() > new Date(data.valor)
}

// POST /equipos — crear equipo (coordinador o administrador)
app.post('/equipos', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para crear equipos.' })
  }

  if (req.user?.rol === 'coordinador' && await inscripcionCerrada()) {
    return res.status(403).json({ error: 'El período de inscripciones ha cerrado. Ya no es posible inscribir equipos.' })
  }

  // Mapear 'nombre' → 'nombre_equipo' si viene del frontend
  const body = { ...req.body }
  if (body.nombre && !body.nombre_equipo) {
    body.nombre_equipo = body.nombre
    delete body.nombre
  }

  const { data, error } = await supabaseAdmin
    .from('equipos')
    .insert(body)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // Notificar en segundo plano: al admin (broadcast) y al coordinador que inscribió
  notificarInscripcion(data, req.user!.id)
    .catch(err => console.error('[notificaciones] Error al notificar inscripción:', err))

  return res.status(201).json(data)
})

// ── Notificaciones: aviso de nueva inscripción de equipo ──
async function notificarInscripcion(equipo: any, coordinadorId: string) {
  const [{ data: deporte }, { data: grado }] = await Promise.all([
    equipo.deporte_id
      ? supabaseAdmin.from('deportes').select('nombre').eq('id', equipo.deporte_id).single()
      : Promise.resolve({ data: null }),
    equipo.grado_id
      ? supabaseAdmin.from('grados').select('nombre, pais_asignado').eq('id', equipo.grado_id).single()
      : Promise.resolve({ data: null }),
  ])

  const g = grado as { nombre?: string; pais_asignado?: string | null } | null
  const gradoConPais = g?.nombre
    ? `${g.nombre}${g.pais_asignado ? ` · ${g.pais_asignado}` : ''}`
    : null
  const detalle = [deporte?.nombre, gradoConPais].filter(Boolean).join(' — ') || equipo.nombre_equipo

  await supabaseAdmin.from('notificaciones').insert([
    {
      rol_destino: 'administrador',
      tipo: 'inscripcion',
      titulo: 'Nueva inscripción de equipo',
      mensaje: `${equipo.nombre_equipo} (${detalle})`,
    },
    {
      usuario_destino: coordinadorId,
      tipo: 'inscripcion',
      titulo: 'Equipo inscrito correctamente',
      mensaje: `${equipo.nombre_equipo} quedó registrado en ${deporte?.nombre ?? 'el torneo'}${g?.pais_asignado ? ` representando a ${g.pais_asignado}` : ''}.`,
    },
  ])
}

// PUT /equipos/:id — actualizar equipo
app.put('/equipos/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para editar equipos.' })
  }

  const { data, error } = await supabaseAdmin
    .from('equipos')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// DELETE /equipos/:id — administrador o coordinador
app.delete('/equipos/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para eliminar equipos.' })
  }

  if (req.user?.rol === 'coordinador' && await inscripcionCerrada()) {
    return res.status(403).json({ error: 'El período de inscripciones ha cerrado. Ya no es posible eliminar equipos.' })
  }

  // Capturar los datos del equipo ANTES de borrarlo (para poder notificar después)
  const { data: equipo } = await supabaseAdmin
    .from('equipos')
    .select('id, nombre_equipo, grado_id, deporte_id')
    .eq('id', req.params.id)
    .single()

  const { error } = await supabaseAdmin.from('equipos').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })

  if (equipo) {
    notificarBaja(equipo, req.user!.rol ?? '')
      .catch(err => console.error('[notificaciones] Error al notificar baja:', err))
  }

  return res.json({ message: 'Equipo eliminado correctamente.' })
})

// ── Notificaciones: aviso de baja de equipo (al lado que NO ejecutó la acción) ──
async function notificarBaja(equipo: any, rolActor: string) {
  const [{ data: deporte }, { data: grado }] = await Promise.all([
    equipo.deporte_id
      ? supabaseAdmin.from('deportes').select('nombre').eq('id', equipo.deporte_id).single()
      : Promise.resolve({ data: null }),
    equipo.grado_id
      ? supabaseAdmin.from('grados').select('nombre, pais_asignado').eq('id', equipo.grado_id).single()
      : Promise.resolve({ data: null }),
  ])

  const g = grado as { nombre?: string; pais_asignado?: string | null } | null
  const detalle = [deporte?.nombre, g?.nombre, g?.pais_asignado].filter(Boolean).join(' — ') || ''

  if (rolActor === 'administrador') {
    // El admin dio de baja → avisar a los coordinadores del grado del equipo
    if (!equipo.grado_id) return
    const { data: coordinadores } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('rol', 'coordinador')
      .eq('grado_id', equipo.grado_id)

    if (!coordinadores?.length) return
    await supabaseAdmin.from('notificaciones').insert(
      coordinadores.map(c => ({
        usuario_destino: c.id,
        tipo: 'inscripcion',
        titulo: 'Tu equipo fue dado de baja',
        mensaje: `${equipo.nombre_equipo}${detalle ? ` (${detalle})` : ''} fue retirado del torneo por el administrador.`,
      }))
    )
  } else {
    // El coordinador se desinscribió → avisar al admin
    await supabaseAdmin.from('notificaciones').insert({
      rol_destino: 'administrador',
      tipo: 'inscripcion',
      titulo: 'Baja de equipo',
      mensaje: `${equipo.nombre_equipo}${detalle ? ` (${detalle})` : ''} se retiró del torneo.`,
    })
  }
}

app.listen(PORT, () => {
  console.log(`[Equipos Service] corriendo en http://localhost:${PORT}`)
})