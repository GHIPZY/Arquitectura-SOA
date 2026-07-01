import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3003

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'participantes-service' })
})

// GET /participantes/count — total de participantes activos
app.get('/participantes/count', requireAuth as any, async (_req: AuthenticatedRequest, res: Response) => {
  const { count, error } = await supabaseAdmin
    .from('participantes')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ total: count ?? 0 })
})

// GET /participantes?equipo_id=&id= — listar participantes
app.get('/participantes', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id, equipo_id } = req.query as Record<string, string>

  if (!id && !equipo_id) {
    return res.status(400).json({ error: 'Se requiere equipo_id o id.' })
  }

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('participantes')
      .select('id, nombre_completo, dni, posicion, activo, created_at, equipo_id')
      .eq('id', id)
      .single()
    if (error) return res.status(404).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .select('id, nombre_completo, dni, posicion, activo, created_at, equipo_id')
    .eq('equipo_id', equipo_id)
    .eq('activo', true)
    .order('nombre_completo')

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

// POST /participantes — crear participante
app.post('/participantes', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para registrar participantes.' })
  }

  if (req.user?.rol === 'coordinador' && await inscripcionCerrada()) {
    return res.status(403).json({ error: 'El período de inscripciones ha cerrado. Ya no es posible agregar jugadores.' })
  }

  const { equipo_id, nombre_completo, dni, posicion } = req.body

  if (!equipo_id || !nombre_completo || !dni) {
    return res.status(400).json({ error: 'equipo_id, nombre_completo y dni son requeridos.' })
  }

  // Obtener el deporte del equipo actual
  const { data: equipo, error: eqError } = await supabaseAdmin
    .from('equipos')
    .select('deporte_id')
    .eq('id', equipo_id)
    .single()

  if (eqError || !equipo) {
    return res.status(400).json({ error: 'Equipo no encontrado.' })
  }

  // Verificar que el DNI no esté ya en otro equipo del mismo deporte
  const { data: duplicado } = await supabaseAdmin
    .from('participantes')
    .select('id, equipos!inner(deporte_id)')
    .eq('dni', dni)
    .eq('activo', true)
    .eq('equipos.deporte_id', equipo.deporte_id)
    .maybeSingle()

  if (duplicado) {
    return res.status(409).json({ error: 'Este estudiante (DNI) ya está registrado en otro equipo para este deporte.' })
  }

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .insert({
      equipo_id,
      nombre_completo,
      dni,
      posicion: posicion ?? null,
      activo: true,
    })
    .select('id')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json({ id: data.id })
})

// PUT /participantes/:id — actualizar nombre y posición (DNI no editable)
app.put('/participantes/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para editar participantes.' })
  }

  const allowed: Record<string, unknown> = {}
  if (req.body.nombre_completo !== undefined) allowed.nombre_completo = req.body.nombre_completo
  if (req.body.posicion       !== undefined) allowed.posicion        = req.body.posicion
  if (req.body.activo         !== undefined) allowed.activo          = req.body.activo

  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos actualizables.' })
  }

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .update(allowed)
    .eq('id', req.params.id)
    .select('id, nombre_completo, posicion, activo')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.json(data)
})

// DELETE /participantes/:id — soft delete
app.delete('/participantes/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para eliminar participantes.' })
  }

  if (req.user?.rol === 'coordinador' && await inscripcionCerrada()) {
    return res.status(403).json({ error: 'El período de inscripciones ha cerrado. Ya no es posible eliminar jugadores.' })
  }

  const { error } = await supabaseAdmin
    .from('participantes')
    .update({ activo: false })
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Participante eliminado correctamente.' })
})

app.listen(PORT, () => {
  console.log(`[Participantes Service] corriendo en http://localhost:${PORT}`)
})