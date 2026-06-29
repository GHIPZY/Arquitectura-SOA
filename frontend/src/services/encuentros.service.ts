import { getAuthHeaders } from './auth.service'

export interface EncuentroDB {
  id: string
  fecha_hora: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'postergado'
  deportes: { id: string; nombre: string } | null
  equipo_local: { id: string; nombre_equipo: string; grados: { nombre: string; pais_asignado: string } | null } | null
  equipo_visitante: { id: string; nombre_equipo: string; grados: { nombre: string; pais_asignado: string } | null } | null
  resultados: { encuentro_id: string; puntos_local: number; puntos_visitante: number }[] | null
}

export interface EncuentroStats {
  total: number
  programado: number
  en_curso: number
  finalizado: number
  postergado: number
}

export async function getEncuentros(params?: { deporte_id?: string; estado?: string }): Promise<EncuentroDB[]> {
  const headers = await getAuthHeaders()
  const qs = new URLSearchParams()
  if (params?.deporte_id) qs.set('deporte_id', params.deporte_id)
  if (params?.estado)     qs.set('estado', params.estado)
  const res = await fetch(`/api/encuentros/encuentros?${qs}`, { headers })
  if (!res.ok) throw new Error('Error al cargar encuentros')
  return res.json()
}

// Lectura pública (espectador sin login)
export async function getEncuentrosPublic(params?: { deporte_id?: string; estado?: string }): Promise<EncuentroDB[]> {
  const qs = new URLSearchParams()
  if (params?.deporte_id) qs.set('deporte_id', params.deporte_id)
  if (params?.estado)     qs.set('estado', params.estado)
  const res = await fetch(`/api/encuentros/public/encuentros?${qs}`)
  if (!res.ok) throw new Error('Error al cargar encuentros')
  return res.json()
}

export async function getEncuentrosHoy(): Promise<EncuentroDB[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/encuentros/hoy', { headers })
  if (!res.ok) throw new Error('Error al cargar encuentros de hoy')
  return res.json()
}

export async function getEncuentrosStats(): Promise<EncuentroStats> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/encuentros/stats', { headers })
  if (!res.ok) throw new Error('Error al cargar estadísticas')
  return res.json()
}
