import { getAuthHeaders } from './auth.service'

export interface AppConfig {
  fecha_limite_inscripciones: string | null
  nombre_torneo:              string | null
  anio_torneo:                string | null
  limite_deportes_grado:      string | null
}

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch('/api/encuentros/config')
  if (!res.ok) return {
    fecha_limite_inscripciones: null,
    nombre_torneo: null,
    anio_torneo: null,
    limite_deportes_grado: null,
  }
  return res.json()
}

export async function setConfig(values: Partial<AppConfig>): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/config', {
    method: 'PUT',
    headers,
    body: JSON.stringify(values),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al guardar configuración')
  }
}

// Mantener compatibilidad con código existente
export async function setFechaLimite(fecha: string | null): Promise<void> {
  return setConfig({ fecha_limite_inscripciones: fecha })
}