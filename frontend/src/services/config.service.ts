import { getAuthHeaders } from './auth.service'

export interface AppConfig {
  fecha_limite_inscripciones: string | null
  fecha_fin_torneo:           string | null
  nombre_torneo:              string | null
  anio_torneo:                string | null
  limite_deportes_grado:      string | null
  sets_pingpong:              string | null   // '3' o '5' (mejor de N sets); default 5
}

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch('/api/encuentros/config')
  if (!res.ok) return {
    fecha_limite_inscripciones: null,
    fecha_fin_torneo: null,
    nombre_torneo: null,
    anio_torneo: null,
    limite_deportes_grado: null,
    sets_pingpong: null,
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

// Reinicia el torneo: limpia encuentros/resultados/estadísticas y rehabilita descalificados
export async function reiniciarTorneo(): Promise<{ ok: boolean; equipos_rehabilitados: number }> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/encuentros/torneo/reiniciar', {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirmar: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error al reiniciar el torneo')
  return json
}