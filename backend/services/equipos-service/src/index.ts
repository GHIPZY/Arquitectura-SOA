import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'equipos-service' })
})

// GET /equipos — lista equipos con filtros opcionales
app.get('/equipos', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id, deporte_id, institucion_id } = req.query as Record<string, string>

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('equipos')
      .select('*, instituciones(id, nombre, pais_asignado, logo_url), deportes(id, nombre, categoria, max_participantes)')
      .eq('id', id)
      .single()
    if (error) return res.status(404).json({ error: error.message })
    return res.json(data)
  }

  let query = supabaseAdmin
    .from('equipos')
    .select('*, instituciones(id, nombre, pais_asignado, logo_url), deportes(id, nombre, categoria, max_participantes)')
    .order('created_at', { ascending: false })

  if (deporte_id)    query = query.eq('deporte_id', deporte_id)
  if (institucion_id) query = query.eq('institucion_id', institucion_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// POST /equipos — crear equipo (coordinador o administrador)
app.post('/equipos', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para crear equipos.' })
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
  return res.status(201).json(data)
})

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

  const { error } = await supabaseAdmin.from('equipos').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Equipo eliminado correctamente.' })
})

app.listen(PORT, () => {
  console.log(`[Equipos Service] corriendo en http://localhost:${PORT}`)
})
