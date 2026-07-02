import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { ChevronDown, Save, Trophy, Loader2 } from 'lucide-react'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { useCurrentUser } from '@/shared/context/UserContext'
import {
  getAtletismoParticipantes,
  getAtletismoResultados,
  saveAtletismoResultados,
} from '@/services/atletismo.service'
import { getAuthHeaders } from '@/services/auth.service'

const PRUEBAS = [
  'Velocista 100m',
  'Velocista 200m',
  'Velocista 400m',
  'Fondista',
  'Saltador de Altura',
  'Saltador de Longitud',
  'Lanzador',
  'Marchista',
]

const PUNTOS: Record<number, number> = { 1: 5, 2: 3, 3: 2, 4: 1 }
function calcPuntos(pos: number) { return PUNTOS[pos] ?? 0 }

async function getGradosPaises() {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json() as Promise<{ pais: string; codigo: string }[]>
}

export function AtletismoPage() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const isAdmin = user?.rol === 'administrador'

  const [prueba, setPrueba] = useState('')
  const [posiciones, setPosiciones] = useState<Record<string, number | ''>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })
  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const { data: participantes = [], isLoading: loadingP } = useQuery({
    queryKey: ['atletismo-participantes', prueba],
    queryFn: () => getAtletismoParticipantes(prueba),
    enabled: !!prueba,
    staleTime: 5 * 60 * 1000,
  })

  const { data: resultadosPrueba = [] } = useQuery({
    queryKey: ['atletismo-resultados', prueba],
    queryFn: () => getAtletismoResultados(prueba),
    enabled: !!prueba,
  })

  useEffect(() => {
    const map: Record<string, number | ''> = {}
    resultadosPrueba.forEach(r => { map[r.participante_id] = r.posicion_final })
    setPosiciones(map)
  }, [resultadosPrueba])

  // Resumen general: puntos por grado en todas las pruebas
  const { data: todosResultados = [] } = useQuery({
    queryKey: ['atletismo-resultados-todos'],
    queryFn: () => getAtletismoResultados(),
    staleTime: 2 * 60 * 1000,
  })

  const resumenGrados: Record<string, { grado: string; pais: string | null; puntos: number }> = {}
  todosResultados.forEach(r => {
    const grado = r.participantes?.equipos?.grados?.nombre ?? '—'
    const pais  = r.participantes?.equipos?.grados?.pais_asignado ?? null
    if (!resumenGrados[grado]) resumenGrados[grado] = { grado, pais, puntos: 0 }
    resumenGrados[grado].puntos += r.puntos
  })
  const resumenOrdenado = Object.values(resumenGrados).sort((a, b) => b.puntos - a.puntos)

  function setPosicion(participanteId: string, val: number | '') {
    setPosiciones(prev => ({ ...prev, [participanteId]: val }))
    setSuccess(false)
    setError(null)
  }

  async function handleGuardar() {
    if (!prueba) return

    const asignadas = Object.entries(posiciones).filter(([, v]) => v !== '')
    const valores = asignadas.map(([, v]) => v as number)
    const unicos = new Set(valores)
    if (unicos.size !== valores.length) {
      setError('Dos atletas no pueden tener la misma posición.')
      return
    }

    const payload = asignadas.map(([participante_id, posicion_final]) => ({
      prueba,
      participante_id,
      posicion_final: posicion_final as number,
      puntos: calcPuntos(posicion_final as number),
    }))

    setGuardando(true)
    setError(null)
    try {
      await saveAtletismoResultados(payload)
      queryClient.invalidateQueries({ queryKey: ['atletismo-resultados', prueba] })
      queryClient.invalidateQueries({ queryKey: ['atletismo-resultados-todos'] })
      setSuccess(true)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const posicionesOcupadas = new Set(
    Object.entries(posiciones)
      .filter(([, v]) => v !== '')
      .map(([, v]) => v as number)
  )

  return (
    <MainLayout title="Atletismo" subtitle="Registro de posiciones y puntos por prueba">

      {/* Resumen general */}
      {resumenOrdenado.length > 0 && (
        <div className="mb-5 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Trophy size={15} className="text-warning" />
            <p className="text-sm font-semibold text-text">Puntaje general por grado</p>
          </div>
          <div className="divide-y divide-border">
            {resumenOrdenado.map((g, i) => {
              const codigo = g.pais ? (codigoMap[g.pais] ?? '') : ''
              return (
                <div key={g.grado} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 text-xs font-bold text-muted text-center">{i + 1}°</span>
                  {codigo && <BanderaPais codigo={codigo} />}
                  <span className="flex-1 text-sm font-semibold text-text">{g.grado}</span>
                  <span className="text-lg font-black text-primary">{g.puntos} pts</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selector de prueba */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted mb-1.5">Selecciona la prueba</p>
        <div className="relative inline-block">
          <select
            value={prueba}
            onChange={e => { setPrueba(e.target.value); setPosiciones({}); setSuccess(false); setError(null) }}
            className="appearance-none pl-4 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-56"
          >
            <option value="">— Elige una prueba —</option>
            {PRUEBAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Tabla de atletas */}
      {prueba && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-text">{prueba}</p>
            <p className="text-xs text-muted">1°=5pts · 2°=3pts · 3°=2pts · 4°=1pt</p>
          </div>

          {loadingP ? (
            <div className="py-12 text-center text-sm text-muted">Cargando atletas...</div>
          ) : participantes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              No hay atletas registrados para esta prueba.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-base border-b border-border">
                  <tr>
                    {['Atleta', 'Grado', 'País', 'Posición', 'Puntos'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {participantes.map(p => {
                    const grado  = p.equipos?.grados?.nombre       ?? '—'
                    const pais   = p.equipos?.grados?.pais_asignado ?? null
                    const codigo = pais ? (codigoMap[pais] ?? '') : ''
                    const pos    = posiciones[p.id] ?? ''
                    const pts    = pos !== '' ? calcPuntos(pos as number) : null

                    return (
                      <tr key={p.id} className="hover:bg-base/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-text">{p.nombre_completo}</td>
                        <td className="px-4 py-3 text-sm text-muted">{grado}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {codigo && <BanderaPais codigo={codigo} />}
                            {pais && <span className="text-xs text-muted">{pais}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={pos}
                                onChange={e => setPosicion(p.id, e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="appearance-none pl-3 pr-7 py-1.5 bg-base border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors"
                              >
                                <option value="">—</option>
                                {Array.from({ length: participantes.length }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n} disabled={posicionesOcupadas.has(n) && posiciones[p.id] !== n}>
                                    {n}°
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-sm text-text">{pos !== '' ? `${pos}°` : '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {pts !== null ? (
                            <span className="text-sm font-bold text-primary">{pts} pts</span>
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {isAdmin && (
                <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                  <div>
                    {error   && <p className="text-xs text-red-500">{error}</p>}
                    {success && <p className="text-xs text-success">Guardado correctamente.</p>}
                  </div>
                  <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar posiciones
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </MainLayout>
  )
}