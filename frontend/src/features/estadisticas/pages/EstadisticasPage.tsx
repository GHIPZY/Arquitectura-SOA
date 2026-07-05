import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { SkeletonRows } from '@/shared/components/Skeleton'
import { Medal } from 'lucide-react'
import { getDeportes } from '@/services/deportes.service'
import { getAuthHeaders } from '@/services/auth.service'
import { useCurrentUser } from '@/shared/context/UserContext'

const PAIS_IMGS = import.meta.glob('/src/assets/paises/*.webp', {
  eager: true, import: 'default',
}) as Record<string, string>
function getFlag(codigo: string | null | undefined) {
  if (!codigo) return null
  return PAIS_IMGS[`/src/assets/paises/${codigo.toLowerCase()}.webp`] ?? null
}

const DEPORTE_ICONS = import.meta.glob('/src/assets/icons/deporte/*.png', {
  eager: true, import: 'default',
}) as Record<string, string>
const FILE_MAP: Record<string, string> = {
  futbol: 'futbol', voley: 'voley', basquet: 'basquet',
  atletismo: 'atletismo', pingpong: 'tenismesa',
}
function getDeporteIcon(slug: string) {
  return DEPORTE_ICONS[`/src/assets/icons/deporte/${FILE_MAP[slug]}.png`] ?? null
}

const STAT_ICONS = import.meta.glob('/src/assets/icons/iconos generales/*.png', {
  eager: true, import: 'default',
}) as Record<string, string>
function getStatIcon(name: string) {
  return STAT_ICONS[`/src/assets/icons/iconos generales/${name}.png`] ?? null
}

const SCORE_LABEL: Record<string, { pts: string; icon: string | null; hasAsistencias: boolean }> = {
  futbol:    { pts: 'Goles',        icon: 'gol', hasAsistencias: true  },
  basquet:   { pts: 'Puntos',       icon: null,  hasAsistencias: true  },
  voley:     { pts: 'Puntos',       icon: null,  hasAsistencias: true  },
  atletismo: { pts: 'Posición',     icon: null,  hasAsistencias: false },
  pingpong:  { pts: 'Sets ganados', icon: null,  hasAsistencias: false },
}

interface FilaRanking {
  participante_id: string
  nombre: string
  posicion: string | null
  grado: string
  pais: string | null
  pts: number
  asistencias: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
  pj: number
}

async function getRanking(deporte_id: string): Promise<FilaRanking[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/estadisticas/estadisticas/ranking?deporte_id=${deporte_id}`, { headers })
  if (!res.ok) throw new Error('Error al cargar ranking')
  return res.json()
}

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

type TabRanking = 'anotadores' | 'asistidores'
const MEDAL_CLS = ['text-yellow-400', 'text-slate-400', 'text-amber-600']

export function EstadisticasPage() {
  const { user }                  = useCurrentUser()
  const esCoordinador             = user?.rol === 'coordinador'
  const [deporteId, setDeporteId] = useState('')
  const [tab, setTab]             = useState<TabRanking>('anotadores')

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
    onSuccess: (data: any[]) => {
      if (data.length > 0 && !deporteId) setDeporteId(data[0].id)
    },
  } as any)

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })
  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const { data: ranking = [], isLoading } = useQuery<FilaRanking[]>({
    queryKey: ['ranking', deporteId],
    queryFn: () => getRanking(deporteId),
    enabled: !!deporteId,
    staleTime: 0,
  })

  const deporteActual = (deportes as any[]).find(d => d.id === deporteId)
  const slugActual    = deporteActual?.slug ?? ''
  const scoreCfg      = SCORE_LABEL[slugActual] ?? { pts: 'Puntos', icon: null, hasAsistencias: true }
  const esFutbol      = slugActual === 'futbol'

  // Si el deporte no tiene asistencias y el tab activo es asistidores, forzar anotadores
  const tabActivo: TabRanking = !scoreCfg.hasAsistencias && tab === 'asistidores' ? 'anotadores' : tab

  const rankingFiltrado = esCoordinador && user?.grado
    ? ranking.filter(f => f.grado === user.grado)
    : ranking

  const lista = [...rankingFiltrado].sort((a, b) =>
    tabActivo === 'anotadores'
      ? b.pts - a.pts || b.asistencias - a.asistencias
      : b.asistencias - a.asistencias || b.pts - a.pts
  )

  const golIcon    = scoreCfg.icon ? getStatIcon(scoreCfg.icon) : null
  const amarillaIcon = getStatIcon('amarilla')
  const rojaIcon     = getStatIcon('roja')

  return (
    <MainLayout
      title="Estadísticas"
      subtitle={esCoordinador ? `Estadísticas de tu equipo — ${user?.grado ?? ''}` : 'Ranking de jugadores destacados por deporte'}
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
            <div className="border-b border-border">
              <div className="px-6 py-3 bg-base flex items-center gap-3">
                {getDeporteIcon(slugActual) && (
                  <img src={getDeporteIcon(slugActual)!} alt={deporteActual.nombre} className="w-5 h-5 object-contain" />
                )}
                <p className="text-sm font-bold text-text">{deporteActual.nombre}</p>
              </div>
              {/* Tabs */}
              <div className="flex">
                {([
                  { key: 'anotadores'  as TabRanking, label: `Máximos ${scoreCfg.pts}`, icon: golIcon, show: true },
                  { key: 'asistidores' as TabRanking, label: 'Asistencias',              icon: null,    show: scoreCfg.hasAsistencias },
                ]).filter(t => t.show).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                      tabActivo === t.key
                        ? 'border-b-2 border-primary bg-primary/5 text-primary'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {t.icon && <img src={t.icon} alt={t.label} className="w-5 h-5 object-contain" />}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <SkeletonRows rows={6} avatar cols={3} />
          ) : !deporteId ? (
            <div className="py-16 text-center text-sm text-muted">Selecciona un deporte.</div>
          ) : lista.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No hay estadísticas registradas para este deporte aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-base border-b border-border">
                  <tr>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Jugador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Grado / País</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Posición</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-primary" title={scoreCfg.pts}>
                      {golIcon ? <img src={golIcon} alt={scoreCfg.pts} className="w-5 h-5 object-contain mx-auto" /> : scoreCfg.pts}
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted">Asist.</th>
                    {esFutbol && (
                      <>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-muted" title="Amarillas">
                          {amarillaIcon ? <img src={amarillaIcon} alt="Amarilla" className="w-5 h-5 object-contain mx-auto" /> : '🟨'}
                        </th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-muted" title="Rojas">
                          {rojaIcon ? <img src={rojaIcon} alt="Roja" className="w-5 h-5 object-contain mx-auto" /> : '🟥'}
                        </th>
                      </>
                    )}
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted">PJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((fila, i) => {
                    const codigo = fila.pais ? codigoMap[fila.pais] : null
                    const flag   = getFlag(codigo)
                    return (
                      <tr key={fila.participante_id} className="hover:bg-base/50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <Medal size={15} className={MEDAL_CLS[i]} />
                            : <span className="text-xs font-bold text-muted">{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-text">{fila.nombre}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {flag
                              ? <img src={flag} alt={fila.pais ?? ''} className="w-7 h-7 rounded object-cover border border-border shrink-0" />
                              : <div className="w-7 h-7 rounded bg-base border border-border flex items-center justify-center text-xs shrink-0">🏳️</div>
                            }
                            <div>
                              <p className="text-xs font-semibold text-text leading-tight">{fila.grado}</p>
                              {fila.pais && <p className="text-[10px] text-muted">{fila.pais}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] bg-neutral-100 border border-neutral-200/50 px-2 py-0.5 rounded font-medium text-muted">
                            {fila.posicion || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-sm font-black text-primary">{fila.pts}</td>
                        <td className="px-3 py-3 text-center text-sm font-semibold text-muted">{fila.asistencias}</td>
                        {esFutbol && (
                          <>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-muted">{fila.tarjetas_amarillas}</td>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-muted">{fila.tarjetas_rojas}</td>
                          </>
                        )}
                        <td className="px-3 py-3 text-center text-xs font-semibold text-muted">{fila.pj}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
