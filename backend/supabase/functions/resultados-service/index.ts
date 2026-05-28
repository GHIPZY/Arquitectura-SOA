import { handleCors, json } from '../_shared/cors.ts'
import { getSupabaseClient, requireAuth } from '../_shared/auth.ts'

export default {
  fetch: async (req: Request): Promise<Response> => {
    const cors = handleCors(req)
    if (cors) return cors

    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth

    const supabase = getSupabaseClient(req)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const deporteId = url.searchParams.get('deporte_id')

    // GET — listar encuentros y resultados
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('encuentros')
          .select(`
            *,
            deportes ( id, nombre ),
            equipo_local:equipos!equipo_local_id ( id, nombre_equipo, instituciones ( nombre, pais_asignado ) ),
            equipo_visitante:equipos!equipo_visitante_id ( id, nombre_equipo, instituciones ( nombre, pais_asignado ) ),
            resultados ( puntos_local, puntos_visitante )
          `)
          .eq('id', id)
          .single()

        if (error) return json({ error: error.message }, 404)
        return json(data)
      }

      let query = supabase
        .from('encuentros')
        .select(`
          *,
          deportes ( id, nombre ),
          equipo_local:equipos!equipo_local_id ( id, nombre_equipo, instituciones ( nombre, pais_asignado ) ),
          equipo_visitante:equipos!equipo_visitante_id ( id, nombre_equipo, instituciones ( nombre, pais_asignado ) ),
          resultados ( puntos_local, puntos_visitante )
        `)
        .order('fecha_hora', { ascending: true })

      if (deporteId) query = query.eq('deporte_id', deporteId)

      const { data, error } = await query
      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    // POST — registrar resultado (solo administrador)
    if (req.method === 'POST') {
      if (auth.rol !== 'administrador') {
        return json({ error: 'Solo administradores pueden registrar resultados.' }, 403)
      }

      const { encuentro_id, puntos_local, puntos_visitante } = await req.json()

      if (!encuentro_id || puntos_local === undefined || puntos_visitante === undefined) {
        return json({ error: 'encuentro_id, puntos_local y puntos_visitante son requeridos.' }, 400)
      }

      const { data, error } = await supabase
        .from('resultados')
        .insert({ encuentro_id, puntos_local, puntos_visitante, registrado_por: auth.userId })
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data, 201)
    }

    // GET tabla de posiciones
    if (req.method === 'GET' && url.searchParams.get('vista') === 'posiciones') {
      const { data, error } = await supabase
        .from('tabla_posiciones')
        .select(`
          *,
          equipos ( nombre_equipo, instituciones ( nombre, pais_asignado ) ),
          deportes ( nombre )
        `)
        .order('puntos_totales', { ascending: false })

      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    return json({ error: 'Método no permitido.' }, 405)
  },
}
