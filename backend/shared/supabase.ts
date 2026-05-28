import { createClient } from '@supabase/supabase-js'


const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Falta la variable de entorno SUPABASE_URL')
}

// Cliente administrador (bypassea RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Función para obtener un cliente de Supabase bajo el contexto/token del usuario (respeta RLS)
export function getSupabaseUserClient(token: string) {
  return createClient(supabaseUrl!, supabaseAnonKey || '', {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
