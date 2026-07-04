import { getAuthHeaders } from './auth.service'

export interface AtletismoParticipante {
  id: string
  nombre_completo: string
  posicion: string | null
  equipos: {
    grados: { nombre: string; pais_asignado: string | null } | null
  } | null
}

export interface AtletismoResultado {
  id: string
  prueba: string
  participante_id: string
  posicion_final: number
  puntos: number
  participantes: {
    nombre_completo: string
    equipos: { grados: { nombre: string; pais_asignado: string | null } | null } | null
  } | null
}

export interface AtletismoSorteo {
  id: string
  prueba: string
  carril: number
  participante_id: string
  participantes: {
    nombre_completo: string
    posicion: string | null
    equipos: { grados: { nombre: string; pais_asignado: string | null } | null } | null
  } | null
}

export async function getAtletismoSorteo(prueba?: string): Promise<AtletismoSorteo[]> {
  const headers = await getAuthHeaders()
  const url = prueba
    ? `/api/estadisticas/atletismo/sorteo?prueba=${encodeURIComponent(prueba)}`
    : '/api/estadisticas/atletismo/sorteo'
  const res = await fetch(url, { headers })
  if (!res.ok) return []
  return res.json()
}

export async function generarAtletismoSorteo(): Promise<{ total: number; pruebas: number; omitidas: { prueba: string; inscritos: number }[] }> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/estadisticas/atletismo/sorteo/generar', {
    method: 'POST',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al generar sorteo.')
  }
  return res.json()
}

export async function eliminarAtletismoSorteo(): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/estadisticas/atletismo/sorteo', { method: 'DELETE', headers })
  if (!res.ok) throw new Error('Error al eliminar sorteo.')
}

export async function getAtletismoParticipantes(prueba: string): Promise<AtletismoParticipante[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/estadisticas/atletismo/participantes?prueba=${encodeURIComponent(prueba)}`, { headers })
  if (!res.ok) return []
  return res.json()
}

export async function getAtletismoResultados(prueba?: string): Promise<AtletismoResultado[]> {
  const headers = await getAuthHeaders()
  const url = prueba
    ? `/api/estadisticas/atletismo/resultados?prueba=${encodeURIComponent(prueba)}`
    : '/api/estadisticas/atletismo/resultados'
  const res = await fetch(url, { headers })
  if (!res.ok) return []
  return res.json()
}

export async function deleteAtletismoResultado(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/estadisticas/atletismo/resultados/${id}`, { method: 'DELETE', headers })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error al eliminar resultado')
}

export async function saveAtletismoResultados(resultados: {
  prueba: string
  participante_id: string
  posicion_final: number
  puntos: number
}[]): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/estadisticas/atletismo/resultados', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultados }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al guardar resultados.')
  }
}
