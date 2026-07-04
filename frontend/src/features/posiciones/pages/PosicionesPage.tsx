import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { Loader2, Trophy } from 'lucide-react'
import { getDeportes } from '@/services/deportes.service'
import { getAuthHeaders } from '@/services/auth.service'
import { useCurrentUser } from '@/shared/context/UserContext'
import { getAtletismoResultados } from '@/services/atletismo.service'

const PAIS_IMGS = import.meta.glob('/src/assets/paises/*.webp', {
  eager: true, import: 'default',
}) as Record<string, string>

function getFlag(codigo: string | null | undefined) {
  if (!codigo) return null
  return PAIS_IMGS[`/src/assets/paises/${codigo.toLowerCase()}.webp`] ?? null
}

interface FilaClasificacion {
  equipo_id: string
  grado: string
  pais: string | null
  pj: number; g: number; e: number; p: number
  gf: number; gc: number; dif: number; pts: number
}

async function getClasificacion(deporte_id: string): Promise<FilaClasificacion[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/encuentros/encuentros/clasificacion?deporte_id=${deporte_id}`, { headers })
  if (!res.ok) throw new Error('Error al cargar clasificación')
  return res.json()
}

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

const DEPORTE_ICONS = import.meta.glob('/src/assets/icons/deporte/*.png', {
  eager: true, import: 'default',
}) as Record<string, string>
const FILE_MAP: Record<string, string> = {
  futbol: 'futbol', voley: 'voley', basquet: 'basquet',
  atletismo: 'atletismo', pingpong: 'tenismesa',
}

const SCORE_LABEL: Record<string, string> = {
  futbol:    'Goles',
  basquet:   'Puntos',
  voley:     'Sets',
  atletismo: 'Puntos',
  pingpong:  'Puntos',
}
function getDeporteIcon(slug: string) {
  return DEPORTE_ICONS[`/src/assets/icons/deporte/${FILE_MAP[slug]}.png`] ?? null
}

export function PosicionesPage() {
  const { user } = useCurrentUser()
  const [deporteId, setDeporteId] = useState('')

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if ((deportes as any[]).length > 0 && !deporteId) setDeporteId((deportes as any[])[0].id)
  }, [deportes])

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })

  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const { data: tabla = [], isLoading } = useQuery<FilaClasificacion[]>({
    queryKey: ['clasificacion', deporteId],
    queryFn: () => getClasificacion(deporteId),
    enabled: !!deporteId,
    staleTime: 0,
  })

  const deporteActual = (deportes as any[]).find(d => d.id === deporteId)
  const scoreLabel    = deporteActual ? (SCORE_LABEL[deporteActual.slug] ?? 'Puntos') : 'Puntos'
  const esAtletismo   = deporteActual?.slug === 'atletismo'

  const { data: atletismoResultados = [] } = useQuery({
    queryKey: ['atletismo-resultados-todos'],
    queryFn: () => getAtletismoResultados(),
    enabled: esAtletismo,
    staleTime: 30_000,
  })

  const atletismoTabla = (() => {
    const map: Record<string, { grado: string; pais: string | null; pts: number }> = {}
    atletismoResultados.forEach(r => {
      const grado = r.participantes?.equipos?.grados?.nombre ?? '—'
      const pais  = r.participantes?.equipos?.grados?.pais_asignado ?? null
      if (!map[grado]) map[grado] = { grado, pais, pts: 0 }
      map[grado].pts += r.puntos
    })
    return Object.values(map).sort((a, b) => b.pts - a.pts)
  })()

  return (
    <MainLayout
      title="Tabla de Posiciones"
      subtitle="Clasificación actualizada de cada deporte — G=3pts, E=1pt, P=0pts"
    >
      <div className="space-y-5">

        {/* Selector de deporte */}
        <div className="flex flex-wrap gap-2">
          {(deportes as any[]).map(d => {
            const icon   = getDeporteIcon(d.slug)
            const activo = d.id === deporteId
            return (
              <button
                key={d.id}
                onClick={() => setDeporteId(d.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                  activo
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-surface text-muted hover:border-neutral-300 hover:text-text'
                }`}
              >
                {icon && <img src={icon} alt={d.nombre} className="w-5 h-5 object-contain" />}
                {d.nombre}
              </button>
            )
          })}
        </div>

        {/* Tabla */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {deporteActual && (
            <div className="px-6 py-4 border-b border-border bg-base flex items-center gap-3">
              {getDeporteIcon(deporteActual.slug) && (
                <img src={getDeporteIcon(deporteActual.slug)!} alt={deporteActual.nombre} className="w-5 h-5 object-contain" />
              )}
              <p className="text-sm font-bold text-text">{deporteActual.nombre}</p>
            </div>
          )}

          {esAtletismo ? (
            atletismoTabla.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted">No hay resultados de atletismo registrados aún.</div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-base border-b border-border">
                    <tr>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Grado</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary">Pts totales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {atletismoTabla.map((fila, i) => {
                      const codigo = fila.pais ? codigoMap[fila.pais] : null
                      const flag   = getFlag(codigo)
                      const medalCls = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : ''
                      return (
                        <tr key={fila.grado} className="hover:bg-base/50 transition-colors">
                          <td className="px-4 py-3 text-center">
                            {i < 3
                              ? <Trophy size={15} className={medalCls} />
                              : <span className="text-xs font-bold text-muted">{i + 1}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {flag
                                ? <img src={flag} alt={fila.pais ?? ''} className="w-8 h-8 rounded-md object-cover border border-border shrink-0" />
                                : <div className="w-8 h-8 rounded-md bg-base border border-border flex items-center justify-center text-sm shrink-0">🏳️</div>}
                              <div>
                                <p className="text-sm font-bold text-text">{fila.grado}</p>
                                {fila.pais && <p className="text-[10px] text-muted">{fila.pais}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-black text-primary">{fila.pts}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-3 border-t border-border bg-base text-[10px] text-muted">
                  Puntos acumulados de todas las pruebas — 1°=5pts · 2°=3pts · 3°=2pts · 4°=1pt
                </div>
              </>
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted">
              <Loader2 size={20} className="animate-spin" /> Calculando posiciones...
            </div>
          ) : !deporteId ? (
            <div className="py-16 text-center text-sm text-muted">Selecciona un deporte.</div>
          ) : tabla.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No hay resultados registrados para este deporte aún.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-base border-b border-border">
                  <tr>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Equipo</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted">PJ</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-green-600">G</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted">E</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-red-500">P</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted" title={`${scoreLabel} a favor`}>AF</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted" title={`${scoreLabel} en contra`}>AC</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted">Dif</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-primary">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tabla.map((fila, i) => {
                    const codigo     = fila.pais ? codigoMap[fila.pais] : null
                    const flag       = getFlag(codigo)
                    const esmiEquipo = user?.rol === 'coordinador' && user.grado === fila.grado
                    const medalCls   = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : ''

                    return (
                      <tr
                        key={fila.equipo_id}
                        className={`transition-colors ${esmiEquipo ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-base/50'}`}
                      >
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <Trophy size={15} className={medalCls} />
                            : <span className="text-xs font-bold text-muted">{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {flag
                              ? <img src={flag} alt={fila.pais ?? ''} className="w-8 h-8 rounded-md object-cover border border-border shrink-0" />
                              : <div className="w-8 h-8 rounded-md bg-base border border-border flex items-center justify-center text-sm shrink-0">🏳️</div>
                            }
                            <div>
                              <p className={`text-sm font-bold leading-tight ${esmiEquipo ? 'text-primary' : 'text-text'}`}>{fila.grado}</p>
                              {fila.pais && <p className="text-[10px] text-muted">{fila.pais}</p>}
                            </div>
                            {esmiEquipo && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full ml-1">
                                Tu equipo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-muted">{fila.pj}</td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-green-600">{fila.g}</td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-muted">{fila.e}</td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-red-500">{fila.p}</td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-muted">{fila.gf}</td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-muted">{fila.gc}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-bold ${fila.dif > 0 ? 'text-green-600' : fila.dif < 0 ? 'text-red-500' : 'text-muted'}`}>
                            {fila.dif > 0 ? `+${fila.dif}` : fila.dif}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-black text-primary">{fila.pts}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Leyenda */}
              <div className="px-6 py-3 border-t border-border bg-base flex flex-wrap gap-4 text-[10px] text-muted">
                <span><strong>PJ</strong> Jugados</span>
                <span><strong className="text-green-600">G</strong> Ganados (3pts)</span>
                <span><strong>E</strong> Empatados (1pt)</span>
                <span><strong className="text-red-500">P</strong> Perdidos (0pts)</span>
                <span><strong>AF/AC</strong> {scoreLabel} a favor / en contra</span>
                <span><strong>Dif</strong> Diferencia</span>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}