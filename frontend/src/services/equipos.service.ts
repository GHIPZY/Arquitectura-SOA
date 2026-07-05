import { getAuthHeaders } from './auth.service'

export interface EquipoDB {
  id: string
  nombre_equipo: string
  deporte_id: string
  grado_id: string
  estado: string
  descalificado?: boolean
  grados?: { id: string; nombre: string; pais_asignado: string | null; institucion_id: string | null }
  deportes?: { id: string; nombre: string; slug: string; categoria: string; max_participantes: number; min_participantes: number }
}

export async function getEquipos(params?: {
  id?: string
  deporte_id?: string
  grado_id?: string
  institucion_id?: string
}): Promise<EquipoDB[]> {
  const headers = await getAuthHeaders()
  const qs = new URLSearchParams()
  if (params?.id)            qs.set('id', params.id)
  if (params?.deporte_id)    qs.set('deporte_id', params.deporte_id)
  if (params?.grado_id)      qs.set('grado_id', params.grado_id)
  if (params?.institucion_id) qs.set('institucion_id', params.institucion_id)
  const res = await fetch(`/api/equipos/equipos?${qs}`, { headers })
  if (!res.ok) throw new Error('Error al cargar equipos')
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

export async function createEquipo(body: Record<string, unknown>): Promise<EquipoDB> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/equipos/equipos', { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al crear equipo')
  return json
}

export async function updateEquipo(id: string, body: Record<string, unknown>): Promise<EquipoDB> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/equipos/equipos/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al actualizar equipo')
  return json
}

export async function descalificarEquipo(id: string): Promise<{ ok: boolean; encuentros_afectados: number }> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/equipos/equipos/${id}/descalificar`, { method: 'POST', headers })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al descalificar equipo')
  return json
}

export async function deleteEquipo(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/equipos/equipos/${id}`, { method: 'DELETE', headers })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al eliminar equipo')
  }
}
