import { describe, it, expect } from 'vitest'
import { normalizeEncuentros } from './encuentros.service'

// Bug real que ocurrió en el proyecto: Supabase devuelve `resultados` como
// OBJETO cuando la relación es 1-a-1, pero el código espera un ARRAY.
// Sin esta normalización, los marcadores no se mostraban en ninguna vista.
describe('normalizeEncuentros', () => {
  const base = {
    id: 'e1',
    fecha_hora: '2026-07-10T15:00:00Z',
    estado: 'finalizado',
    deportes: null,
    equipo_local: null,
    equipo_visitante: null,
  }

  it('convierte resultados-objeto (relación 1-a-1 de Supabase) en array', () => {
    const entrada = [{ ...base, resultados: { encuentro_id: 'e1', puntos_local: 3, puntos_visitante: 2 } }]
    const salida = normalizeEncuentros(entrada)
    expect(Array.isArray(salida[0].resultados)).toBe(true)
    expect(salida[0].resultados![0].puntos_local).toBe(3)
  })

  it('deja pasar resultados que ya vienen como array', () => {
    const entrada = [{ ...base, resultados: [{ encuentro_id: 'e1', puntos_local: 1, puntos_visitante: 0 }] }]
    const salida = normalizeEncuentros(entrada)
    expect(salida[0].resultados).toHaveLength(1)
    expect(salida[0].resultados![0].puntos_visitante).toBe(0)
  })

  it('convierte resultados null (partido sin marcador) en array vacío', () => {
    const entrada = [{ ...base, resultados: null }]
    const salida = normalizeEncuentros(entrada)
    expect(salida[0].resultados).toEqual([])
  })

  it('no altera el resto de los campos del encuentro', () => {
    const entrada = [{ ...base, resultados: null }]
    const salida = normalizeEncuentros(entrada)
    expect(salida[0].id).toBe('e1')
    expect(salida[0].estado).toBe('finalizado')
  })
})
