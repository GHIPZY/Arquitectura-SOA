import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json } from './cors.ts'

export function getSupabaseClient(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  )
}

export function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

export async function requireAuth(req: Request): Promise<{ userId: string; rol: string } | Response> {
  const client = getSupabaseClient(req)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    return json({ error: 'No autorizado.' }, 401)
  }

  const admin = getAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    return json({ error: 'Usuario no registrado en el sistema.' }, 403)
  }

  return { userId: user.id, rol: usuario.rol }
}
