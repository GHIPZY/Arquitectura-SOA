import { handleCors, json } from '../_shared/cors.ts'
import { getAdminClient, requireAuth } from '../_shared/auth.ts'

export default {
  fetch: async (req: Request): Promise<Response> => {
    const cors = handleCors(req)
    if (cors) return cors

    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth

    // Usamos admin para llamar fn_crear_participante (encripta DNI)
    const supabase = getAdminClient()
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const equipoId = url.searchParams.get('equipo_id')

    // GET — listar participantes de un equipo
    if (req.method === 'GET') {
      if (!equipoId && !id) return json({ error: 'Se requiere equipo_id o id.' }, 400)

      if (id) {
        const { data, error } = await supabase
          .from('participantes')
          .select('id, nombre_completo, posicion, activo, created_at, equipo_id')
          .eq('id', id)
          .single()

        if (error) return json({ error: error.message }, 404)
        return json(data)
      }

      const { data, error } = await supabase
        .from('participantes')
        .select('id, nombre_completo, posicion, activo, created_at, equipo_id')
        .eq('equipo_id', equipoId!)
        .eq('activo', true)
        .order('nombre_completo')

      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    // POST — crear participante con DNI encriptado via función BD
    if (req.method === 'POST') {
      if (!['administrador', 'coordinador'].includes(auth.rol)) {
        return json({ error: 'Sin permisos para registrar participantes.' }, 403)
      }

      const { equipo_id, nombre_completo, dni, posicion } = await req.json()

      if (!equipo_id || !nombre_completo || !dni) {
        return json({ error: 'equipo_id, nombre_completo y dni son requeridos.' }, 400)
      }

      const { data, error } = await supabase.rpc('fn_crear_participante', {
        p_equipo_id: equipo_id,
        p_nombre: nombre_completo,
        p_dni: dni,
        p_posicion: posicion ?? null,
      })

      if (error) return json({ error: error.message }, 400)
      return json({ id: data }, 201)
    }

    // PUT — actualizar participante
    if (req.method === 'PUT') {
      if (!['administrador', 'coordinador'].includes(auth.rol)) {
        return json({ error: 'Sin permisos para editar participantes.' }, 403)
      }
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const body = await req.json()
      // No permitir actualizar DNI encriptado directamente
      delete body.dni_encriptado

      const { data, error } = await supabase
        .from('participantes')
        .update(body)
        .eq('id', id)
        .select('id, nombre_completo, posicion, activo')
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data)
    }

    // DELETE — desactivar participante
    if (req.method === 'DELETE') {
      if (!['administrador', 'coordinador'].includes(auth.rol)) {
        return json({ error: 'Sin permisos para eliminar participantes.' }, 403)
      }
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const { error } = await supabase
        .from('participantes')
        .update({ activo: false })
        .eq('id', id)

      if (error) return json({ error: error.message }, 400)
      return json({ message: 'Participante eliminado correctamente.' })
    }

    return json({ error: 'Método no permitido.' }, 405)
  },
}
