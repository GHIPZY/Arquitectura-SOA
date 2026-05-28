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

    // GET — listar deportes o uno específico
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('deportes')
          .select('*')
          .eq('id', id)
          .single()

        if (error) return json({ error: error.message }, 404)
        return json(data)
      }

      const { data, error } = await supabase
        .from('deportes')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    // POST — crear deporte (solo administrador)
    if (req.method === 'POST') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden crear deportes.' }, 403)

      const body = await req.json()
      const { data, error } = await supabase
        .from('deportes')
        .insert(body)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data, 201)
    }

    // PUT — actualizar deporte (solo administrador)
    if (req.method === 'PUT') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden editar deportes.' }, 403)
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const body = await req.json()
      const { data, error } = await supabase
        .from('deportes')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data)
    }

    return json({ error: 'Método no permitido.' }, 405)
  },
}
