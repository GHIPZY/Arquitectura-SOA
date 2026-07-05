import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin, sendMail } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3009

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resultados-service' })
})

// ── Notificaciones: al registrar un resultado, avisar a coordinadores (in-app +
// correo) y a espectadores (in-app). Corre en segundo plano: si falla, el
// registro del resultado no se ve afectado.
async function notificarResultado(encuentro_id: string, puntos_local: number, puntos_visitante: number) {
  const { data: enc } = await supabaseAdmin
    .from('encuentros')
    .select(`
      id, deportes(nombre),
      equipo_local:equipos!equipo_local_id(nombre_equipo, grado_id),
      equipo_visitante:equipos!equipo_visitante_id(nombre_equipo, grado_id)
    `)
    .eq('id', encuentro_id)
    .single() as { data: any }

  if (!enc) return

  const deporte = enc.deportes?.nombre ?? 'Deporte'
  const nombreL = enc.equipo_local?.nombre_equipo ?? 'Local'
  const nombreV = enc.equipo_visitante?.nombre_equipo ?? 'Visitante'
  const marcador = `${nombreL} ${puntos_local} - ${puntos_visitante} ${nombreV}`

  // Coordinadores de los grados de ambos equipos → notificación dirigida
  const gradoIds = [enc.equipo_local?.grado_id, enc.equipo_visitante?.grado_id].filter(Boolean)
  const { data: coordinadores } = gradoIds.length
    ? await supabaseAdmin
        .from('usuarios')
        .select('id, email, nombre')
        .eq('rol', 'coordinador')
        .in('grado_id', gradoIds)
    : { data: [] }

  const notificaciones = [
    // Broadcast a espectadores
    {
      rol_destino: 'espectador',
      tipo: 'resultado',
      titulo: `Nuevo resultado en ${deporte}`,
      mensaje: marcador,
    },
    // Dirigidas a cada coordinador involucrado
    ...(coordinadores ?? []).map(c => ({
      usuario_destino: c.id,
      tipo: 'resultado',
      titulo: 'Tu equipo jugó',
      mensaje: `${deporte}: ${marcador}`,
    })),
  ]

  await supabaseAdmin.from('notificaciones').insert(notificaciones)

  // Correo a los coordinadores (canal complementario)
  const emails = (coordinadores ?? []).map(c => c.email).filter(Boolean)
  if (emails.length > 0) {
    await sendMail({
      to: emails,
      subject: `Resultado registrado — ${marcador}`,
      html: `
        <h2>⚽ Resultado registrado</h2>
        <p><strong>${deporte}</strong></p>
        <p style="font-size:20px;font-weight:bold">${marcador}</p>
        <p>Ingresa a la plataforma para ver las estadísticas completas del encuentro.</p>
      `,
    })
  }
}

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
    .upsert(
      { encuentro_id, puntos_local, puntos_visitante, registrado_por: req.user!.id },
      { onConflict: 'encuentro_id' }
    )
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // Marcar el encuentro como finalizado
  await supabaseAdmin.from('encuentros').update({ estado: 'finalizado' }).eq('id', encuentro_id)

  // Notificar en segundo plano (no bloquea la respuesta)
  notificarResultado(encuentro_id, puntos_local, puntos_visitante)
    .catch(err => console.error('[notificaciones] Error al notificar resultado:', err))

  return res.status(201).json(data)
})

// DELETE /resultados/:encuentro_id — elimina el resultado de un encuentro
app.delete('/resultados/:encuentro_id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!['administrador'].includes(req.user?.rol ?? '')) {
    return res.status(403).json({ error: 'Sin permisos para eliminar resultados.' })
  }

  const { error } = await supabaseAdmin
    .from('resultados')
    .delete()
    .eq('encuentro_id', req.params.encuentro_id)

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Resultado eliminado correctamente.' })
})

app.listen(PORT, () => {
  console.log(`[Resultados Service] corriendo en http://localhost:${PORT}`)
})
