import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type Rol = 'administrador' | 'coordinador' | 'espectador'

export interface CurrentUser {
  id: string
  email: string
  nombre: string
  rol: Rol
  institucion: string | null
  iniciales: string
}

function makeIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ').filter(Boolean)
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return partes[0].slice(0, 2).toUpperCase()
}

const UserContext = createContext<{ user: CurrentUser | null; loading: boolean }>({
  user: null,
  loading: true,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setUser(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      const email = session.user.email ?? ''
      setUser({
        id: session.user.id,
        email,
        nombre: email.split('@')[0],
        rol: 'coordinador',
        institucion: null,
        iniciales: email.slice(0, 2).toUpperCase(),
      })
      setLoading(false)
      return
    }

    const nombre = (data.nombre as string | null) ?? session.user.email ?? 'Usuario'
    setUser({
      id: session.user.id,
      email: session.user.email ?? '',
      nombre,
      rol: data.rol as Rol,
      institucion: null,
      iniciales: makeIniciales(nombre),
    })
    setLoading(false)
  }

  useEffect(() => {
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) load()
      else { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(UserContext)
}
