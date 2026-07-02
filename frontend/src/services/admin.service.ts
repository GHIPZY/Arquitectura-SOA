import { getAuthHeaders } from './auth.service'
import type { EncuentroDB } from './encuentros.service'

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface EstadisticaJugador {
  id: string
  encuentro_id: string
  participante_id: string
  puntos: number
  asistencias: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
  created_at: string
  participantes?: {
    id: string
    nombre_completo: string
    posicion: string | null
    equipo_id: string
  } | null
}

export interface GenerarTorneoResult {
  total: number
  encuentros: EncuentroDB[]
}

// ─── Encuentros (escritura admin) ──────────────────────────────────────────

export async function generarTorneo(deporte_id: string): Promise<GenerarTorneoResult> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/encuentros/generar-torneo', {
    method: 'POST',
    headers,
    body: JSON.stringify({ deporte_id }),
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'Error al generar el torneo'), { code: json.code })
  return json
}

export async function regenerarTorneo(deporte_id: string): Promise<GenerarTorneoResult> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/encuentros/regenerar-torneo', {
    method: 'POST',
    headers,
    body: JSON.stringify({ deporte_id, confirmar: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al regenerar el torneo')
  return json
}

export async function eliminarSorteo(deporte_id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/encuentros/encuentros/deporte/${deporte_id}`, { method: 'DELETE', headers })
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error al eliminar sorteo') }
}

export async function updateEncuentro(
  id: string,
  body: { fecha_hora?: string; estado?: string }
): Promise<EncuentroDB> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/encuentros/encuentros/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al actualizar encuentro')
  return json
}

export async function deleteEncuentro(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/encuentros/encuentros/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al eliminar encuentro')
  }
}

// ─── Estadísticas de jugadores ─────────────────────────────────────────────

export async function getEstadisticasEncuentro(encuentro_id: string): Promise<EstadisticaJugador[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/estadisticas/estadisticas?encuentro_id=${encuentro_id}`, { headers })
  if (!res.ok) throw new Error('Error al cargar estadísticas')
  return res.json()
}

export async function guardarEstadisticasBulk(
  estadisticas: {
    encuentro_id: string
    participante_id: string
    puntos: number
    asistencias: number
    tarjetas_amarillas: number
    tarjetas_rojas: number
  }[]
): Promise<EstadisticaJugador[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/estadisticas/estadisticas/bulk', {
    method: 'POST',
    headers,
    body: JSON.stringify({ estadisticas }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al guardar estadísticas')
  return json
}
