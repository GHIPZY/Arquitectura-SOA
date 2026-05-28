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

// GET /participantes?equipo_id=&id= — listar participantes
app.get('/participantes', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id, equipo_id } = req.query as Record<string, string>

  if (!id && !equipo_id) {
    return res.status(400).json({ error: 'Se requiere equipo_id o id.' })
  }

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('participantes')
      .select('id, nombre_completo, posicion, activo, created_at, equipo_id')
      .eq('id', id)
      .single()
    if (error) return res.status(404).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .select('id, nombre_completo, posicion, activo, created_at, equipo_id')
    .eq('equipo_id', equipo_id)
    .eq('activo', true)
    .order('nombre_completo')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// POST /participantes — crear participante
app.post('/participantes', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador', 'coordinador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para registrar participantes.' })
  }

  const { equipo_id, nombre_completo, dni, posicion } = req.body

  if (!equipo_id || !nombre_completo || !dni) {
    return res.status(400).json({ error: 'equipo_id, nombre_completo y dni son requeridos.' })
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

  const body = { ...req.body }
  delete body.dni_encriptado

  const { data, error } = await supabaseAdmin
    .from('participantes')
    .update(body)
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
