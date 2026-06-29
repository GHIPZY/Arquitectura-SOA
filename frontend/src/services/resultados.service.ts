import { getAuthHeaders } from './auth.service'

export interface ResultadoDB {
  encuentro_id: string
  puntos_local: number
  puntos_visitante: number
}

export async function getResultado(encuentro_id: string): Promise<ResultadoDB | null> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/resultados/resultados?encuentro_id=${encuentro_id}`, { headers })
  if (!res.ok) throw new Error('Error al cargar resultado')
  return res.json()
}

export async function upsertResultado(body: ResultadoDB): Promise<ResultadoDB> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/resultados/resultados', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al guardar resultado')
  return json
}

// ─── Lectura pública (espectador sin login) ───

export interface PosicionDB {
  equipo_id: string
  deporte_id: string
  partidos_jugados: number
  ganados: number
  empatados: number
  perdidos: number
  puntos_totales: number
  puntos_favor: number
  puntos_contra: number
  diferencia: number
  equipos?: { id: string; nombre_equipo: string; grados: { nombre: string; pais_asignado: string | null } | null } | null
}

export interface GoleadorDB {
  deporte_id: string
  participante_id: string
  nombre_completo: string
  equipo_id: string
  total_puntos: number
  total_asistencias: number
}

export async function getPosiciones(deporte_id?: string): Promise<PosicionDB[]> {
  const qs = new URLSearchParams()
  if (deporte_id) qs.set('deporte_id', deporte_id)
  const res = await fetch(`/api/resultados/public/posiciones?${qs}`)
  if (!res.ok) throw new Error('Error al cargar posiciones')
  return res.json()
}

export async function getGoleadores(deporte_id?: string): Promise<GoleadorDB[]> {
  const qs = new URLSearchParams()
  if (deporte_id) qs.set('deporte_id', deporte_id)
  const res = await fetch(`/api/resultados/public/goleadores?${qs}`)
  if (!res.ok) throw new Error('Error al cargar goleadores')
  return res.json()
}
