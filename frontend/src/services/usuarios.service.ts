import { getAuthHeaders } from './auth.service'

export interface UsuarioAdmin {
  id:          string
  nombre:      string
  email:       string
  rol:         'coordinador' | 'espectador'
  grado:       string | null
  pais:        string | null
  pais_codigo: string | null
}

export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/usuarios', { headers })
  if (!res.ok) throw new Error('Error al cargar usuarios')
  return res.json()
}

export async function crearUsuario(data: {
  nombre: string; email: string; password: string
  rol: string; grado_id?: string | null; institucion_id?: string | null
}): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/usuarios', {
    method: 'POST', headers, body: JSON.stringify(data),
  })
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error al crear usuario') }
}

export async function eliminarUsuario(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/encuentros/usuarios/${id}`, { method: 'DELETE', headers })
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error al eliminar usuario') }
}