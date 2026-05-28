import 'dotenv/config'
import express, { Response } from 'express'
import cors from 'cors'
import { requireAuth, AuthenticatedRequest, supabaseAdmin } from '@deportes/shared'

const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(express.json())

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'instituciones-service' })
})

// POST /asignar-pais — asigna un país aleatorio a la institución del coordinador autenticado
app.post('/asignar-pais', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado. Falta identificación del usuario.' })
    }

    // 1. Obtener el institucion_id del usuario/coordinador
    const { data: usuario, error: errUser } = await supabaseAdmin
      .from('usuarios')
      .select('institucion_id')
      .eq('id', userId)
      .single()

    if (errUser || !usuario?.institucion_id) {
      return res.status(404).json({ error: 'No se encontró la institución asociada al usuario.' })
    }

    // 2. Verificar si la institución ya tiene un país asignado
    const { data: inst } = await supabaseAdmin
      .from('instituciones')
      .select('pais_asignado')
      .eq('id', usuario.institucion_id)
      .single()

    if (inst?.pais_asignado) {
      // Si ya tiene un país asignado, retornar los datos completos del país desde 'grados_paises'
      const { data: gp, error: errGp } = await supabaseAdmin
        .from('grados_paises')
        .select('pais, codigo, nombre')
        .eq('pais', inst.pais_asignado)
        .single()

      if (errGp || !gp) {
        // Si no se encuentra en grados_paises, devolver al menos la asignación básica
        return res.json({
          asignado: true,
          pais: { pais: inst.pais_asignado, codigo: '', nombre: inst.pais_asignado }
        })
      }

      return res.json({ asignado: true, pais: gp })
    }

    // 3. Ejecutar la transacción de asignación atómica usando el procedimiento RPC 'asignar_pais_aleatorio'
    const { data, error: errRpc } = await supabaseAdmin.rpc('asignar_pais_aleatorio', {
      p_institucion_id: usuario.institucion_id,
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
