import { getAuthHeaders } from './auth.service'

export interface PaisInfo {
  pais: string
  codigo: string
  nombre?: string
}

export async function getPaisesDisponibles(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) throw new Error('Error al obtener países disponibles')
  return res.json()
}

export async function getPaisActual(): Promise<{ pais: PaisInfo | null }> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/pais-actual', { headers })
  if (!res.ok) throw new Error('Error al obtener país actual')
  return res.json()
}

export async function asignarPais(): Promise<{ asignado: boolean; pais: PaisInfo }> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/asignar-pais', { method: 'POST', headers })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al asignar país')
  return json
}
