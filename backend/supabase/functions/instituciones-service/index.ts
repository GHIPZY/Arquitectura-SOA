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

    // GET — listar instituciones o una específica
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('instituciones')
          .select('*')
          .eq('id', id)
          .single()

        if (error) return json({ error: error.message }, 404)
        return json(data)
      }

      const { data, error } = await supabase
        .from('instituciones')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) return json({ error: error.message }, 500)
      return json(data)
    }

    // POST — crear institución (solo administrador)
    if (req.method === 'POST') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden crear instituciones.' }, 403)

      const body = await req.json()
      const { data, error } = await supabase
        .from('instituciones')
        .insert(body)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data, 201)
    }

    // PUT — actualizar institución (solo administrador)
    if (req.method === 'PUT') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden editar instituciones.' }, 403)
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const body = await req.json()
      const { data, error } = await supabase
        .from('instituciones')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json(data)
    }

    // DELETE — desactivar institución (solo administrador)
    if (req.method === 'DELETE') {
      if (auth.rol !== 'administrador') return json({ error: 'Solo administradores pueden eliminar instituciones.' }, 403)
      if (!id) return json({ error: 'Se requiere el parámetro id.' }, 400)

      const { error } = await supabase
        .from('instituciones')
        .update({ activo: false })
        .eq('id', id)

      if (error) return json({ error: error.message }, 400)
      return json({ message: 'Institución desactivada correctamente.' })
    }

    return json({ error: 'Método no permitido.' }, 405)
  },
}
