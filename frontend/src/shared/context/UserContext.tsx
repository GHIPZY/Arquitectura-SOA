import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type Rol = 'administrador' | 'coordinador' | 'espectador'

export interface CurrentUser {
  id: string
  email: string
  nombre: string
  rol: Rol
  institucion_id: string | null
  grado_id: string | null
  grado: string | null
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
  // Ref para saber si ya tenemos usuario sin depender del closure
  const userRef = useRef<CurrentUser | null>(null)

  function applyUser(u: CurrentUser | null) {
    userRef.current = u
    setUser(u)
  }

  async function fetchUser(showLoading: boolean) {
    if (showLoading) setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      applyUser(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, rol, grado_id, institucion_id, grados(nombre)')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      const email = session.user.email ?? ''
      applyUser({
        id: session.user.id,
        email,
        nombre: email.split('@')[0],
        rol: 'coordinador',
        institucion_id: null,
        grado_id: null,
        grado: null,
        iniciales: email.slice(0, 2).toUpperCase(),
      })
    } else {
      const nombre = (data.nombre as string | null) ?? session.user.email ?? 'Usuario'
      const gradoData = data.grados as unknown as { nombre: string } | null
      applyUser({
        id: session.user.id,
        email: session.user.email ?? '',
        nombre,
        rol: data.rol as Rol,
        institucion_id: (data.institucion_id as string | null) ?? null,
        grado_id: (data.grado_id as string | null) ?? null,
        grado: gradoData?.nombre ?? null,
        iniciales: makeIniciales(nombre),
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchUser(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        applyUser(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' && !userRef.current) {
        // Solo muestra spinner en login real (cuando no había usuario)
        fetchUser(true)
      } else {
        // SIGNED_IN con usuario ya cargado, TOKEN_REFRESHED, etc. → siempre silencioso
        fetchUser(false)
      }
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
