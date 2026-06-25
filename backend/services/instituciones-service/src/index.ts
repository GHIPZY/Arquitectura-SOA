import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(express.json())


app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'instituciones-service' })
})


app.post('/asignar-pais', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado. Falta identificación del usuario.' })
    }

   
    const { data: usuario, error: errUser } = await supabaseAdmin
      .from('usuarios')
      .select('grado_id')
      .eq('id', userId)
      .single()

    if (errUser || !usuario?.grado_id) {
      return res.status(404).json({ error: 'No se encontró el grado asociado al usuario.' })
    }

    // Verificar si el grado ya tiene un país asignado
    const { data: grado } = await supabaseAdmin
      .from('grados')
      .select('pais_asignado')
      .eq('id', usuario.grado_id)
      .single()

    if (grado?.pais_asignado) {
      const { data: gp, error: errGp } = await supabaseAdmin
        .from('grados_paises')
        .select('pais, codigo, nombre')
        .eq('pais', grado.pais_asignado)
        .single()

      if (errGp || !gp) {
        return res.json({
          asignado: true,
          pais: { pais: grado.pais_asignado, codigo: '', nombre: grado.pais_asignado }
        })
      }

      return res.json({ asignado: true, pais: gp })
    }

    // Ejecutar la asignación atómica de país al grado
    const { data, error: errRpc } = await supabaseAdmin.rpc('asignar_pais_aleatorio', {
      p_grado_id: usuario.grado_id,
    })

    if (errRpc || !data || data.length === 0) {
      return res.status(409).json({ error: errRpc?.message || 'No hay países disponibles para asignar.' })
    }

    // Retornar el país asignado
    return res.json({ asignado: false, pais: data[0] })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error interno al procesar la asignación de país.' })
  }
})

app.listen(PORT, () => {
  console.log(`[Instituciones Service] corriendo en http://localhost:${PORT}`)
})
