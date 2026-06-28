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
