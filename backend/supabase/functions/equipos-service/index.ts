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
    const institucionId = url.searchParams.get('institucion_id')

    // GET — listar equipos con filtros opcionales
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('equipos')
          .select(`
            *,
            instituciones ( id, nombre, pais_asignado, logo_url ),
            deportes ( id, nombre, categoria, max_participantes )
          `)
          .eq('id', id)
          .single()

        if (error) return json({ error: error.message }, 404)
        return json(data)
      }

      let query = supabase
        .from('equipos')
        .select(`
          *,
          instituciones ( id, nombre, pais_asignado, logo_url ),
          deportes ( id, nombre, categoria, max_participantes )
        `)
        .order('created_at', { ascending: false })

      if (deporteId) query = query.eq('deporte_id', deporteId)
      if (institucionId) query = query.eq('institucion_id', institucionId)

      const { data, error } = await query
      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    // POST — crear equipo (administrador o coordinador)
    if (req.method === 'POST') {
      if (!['administrador', 'coordinador'].includes(auth.rol)) {
        return json({ error: 'Sin permisos para crear equipos.' }, 403)
      }

      const body = await req.json()
      const { data, error } = await supabase
        .from('equipos')
        .insert(body)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data, 201)
    }

    // PUT — actualizar estado del equipo
    if (req.method === 'PUT') {
      if (!['administrador', 'coordinador'].includes(auth.rol)) {
        return json({ error: 'Sin permisos para editar equipos.' }, 403)
      }
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const body = await req.json()
      const { data, error } = await supabase
        .from('equipos')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data)
    }

    // DELETE — solo administrador
    if (req.method === 'DELETE') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden eliminar equipos.' }, 403)
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const { error } = await supabase.from('equipos').delete().eq('id', id)
      if (error) return json({ error: error.message }, 400)
      return json({ message: 'Equipo eliminado correctamente.' })
    }

    return json({ error: 'Método no permitido.' }, 405)
  },
}
