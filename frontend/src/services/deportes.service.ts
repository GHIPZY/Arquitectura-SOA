import { getAuthHeaders } from './auth.service'

export interface DeporteDB {
  id: string
  nombre: string
  slug: string
  categoria: string
  max_participantes: number
  min_participantes: number
  activo: boolean
}

export async function getDeportes(): Promise<DeporteDB[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/deportes/deportes', { headers })
  if (!res.ok) throw new Error('Error al cargar deportes')
  return res.json()
}

// Lectura pública (espectador sin login)
export async function getDeportesPublic(): Promise<DeporteDB[]> {
  const res = await fetch('/api/deportes/public/deportes')
  if (!res.ok) throw new Error('Error al cargar deportes')
  return res.json()
}
