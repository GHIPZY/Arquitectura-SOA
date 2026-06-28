import { getAuthHeaders } from './auth.service'

export interface ParticipanteDB {
  id: string
  nombre_completo: string
  dni: string
  posicion: string | null
  activo: boolean
  equipo_id: string
  created_at: string
}

export async function getParticipantes(params: { equipo_id?: string; id?: string }): Promise<ParticipanteDB[]> {
  const headers = await getAuthHeaders()
  const qs = new URLSearchParams()
  if (params.equipo_id) qs.set('equipo_id', params.equipo_id)
  if (params.id)        qs.set('id', params.id)
  const res = await fetch(`/api/participantes/participantes?${qs}`, { headers })
  if (!res.ok) throw new Error('Error al cargar participantes')
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

export async function getParticipantesCount(): Promise<number> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/participantes/participantes/count', { headers })
  if (!res.ok) throw new Error('Error al cargar conteo de participantes')
  const data = await res.json()
  return data.total as number
}

export async function createParticipante(body: Record<string, unknown>): Promise<{ id: string }> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/participantes/participantes', { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al crear participante')
  return json
}

export async function updateParticipante(
  id: string,
  body: { nombre_completo?: string; posicion?: string; activo?: boolean }
): Promise<ParticipanteDB> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/participantes/participantes/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al actualizar participante')
  return json
}

export async function deleteParticipante(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  await fetch(`/api/participantes/participantes/${id}`, { method: 'DELETE', headers })
}
