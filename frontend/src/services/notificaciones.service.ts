import { getAuthHeaders } from './auth.service'

export interface NotificacionDB {
  id: string
  created_at: string
  tipo: 'resultado' | 'inscripcion' | 'encuentro'
  titulo: string
  mensaje: string
  leida: boolean
  rol_destino: string | null
  usuario_destino: string | null
}

export async function getNotificaciones(): Promise<NotificacionDB[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/notificaciones/notificaciones', { headers })
  if (!res.ok) return []   // servicio caído o sin configurar: campanita vacía, no rompe la app
  return res.json()
}

export async function marcarLeida(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  await fetch(`/api/notificaciones/notificaciones/${id}/leida`, { method: 'PUT', headers })
}

export async function marcarTodasLeidas(): Promise<void> {
  const headers = await getAuthHeaders()
  await fetch('/api/notificaciones/notificaciones/leidas', { method: 'PUT', headers })
}
