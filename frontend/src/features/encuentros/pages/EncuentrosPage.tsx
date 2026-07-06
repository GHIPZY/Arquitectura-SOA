import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { ChevronDown, Pencil, Check, X, Loader2 } from 'lucide-react'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { SkeletonRows } from '@/shared/components/Skeleton'
import { getEncuentros, type EncuentroDB } from '@/services/encuentros.service'
import { getAtletismoSorteo } from '@/services/atletismo.service'
import { getDeportes } from '@/services/deportes.service'
import { getAuthHeaders } from '@/services/auth.service'
import { updateEncuentro } from '@/services/admin.service'
import { useCurrentUser } from '@/shared/context/UserContext'

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

import deportesIcon from '@/assets/icons/slide/deportes.png'
import programadosIcon from '@/assets/icons/slide/programdos.png'
import playIcon from '@/assets/icons/slide/play.png'
import finalizadoIcon from '@/assets/icons/slide/finalizado.png'
import postergadoIcon from '@/assets/icons/slide/postergado.png'

type Estado = 'programado' | 'en_curso' | 'finalizado' | 'postergado'

const ESTADOS = [
  { key: 'todos',      label: 'Todos los estados' },
  { key: 'programado', label: 'Programado'        },
  { key: 'en_curso',   label: 'En curso'           },
  { key: 'finalizado', label: 'Finalizado'         },
  { key: 'postergado', label: 'Postergado'         },
]

const ESTADO_CFG: Record<Estado, { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-info/10 text-info border border-info/20'          },
  en_curso:   { label: 'En curso',   cls: 'bg-success/10 text-success border border-success/20' },
  finalizado: { label: 'Finalizado', cls: 'bg-gray-100 text-gray-500 border border-gray-200'    },
  postergado: { label: 'Postergado', cls: 'bg-warning/10 text-warning border border-warning/20' },
}

const COUNTER_CFG: { key: Estado; label: string; icon: string; cls: string }[] = [
  { key: 'programado', label: 'Programados', icon: programadosIcon, cls: 'text-info'    },
  { key: 'en_curso',   label: 'En curso',    icon: playIcon,        cls: 'text-success' },
  { key: 'finalizado', label: 'Finalizados', icon: finalizadoIcon,  cls: 'text-muted'   },
  { key: 'postergado', label: 'Postergados', icon: postergadoIcon,  cls: 'text-warning' },
]

function formatFecha(iso: string) {
  const d = new Date(iso)
  return {
    dia:  d.getDate().toString(),
    mes:  d.toLocaleString('es-PE', { month: 'short' }).toUpperCase(),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  }
}

function toLocalInput(iso: string): string {
  // Siempre mostrar en hora peruana (UTC-5), independiente del TZ del navegador
  const d = new Date(iso)
  const peru = new Date(d.getTime() - 5 * 60 * 60 * 1000)
  return peru.toISOString().slice(0, 16)
}

export function EncuentrosPage() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const isAdmin = user?.rol === 'administrador'

  const [deporteId, setDeporteId]     = useState('todos')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  // Edición de fecha (solo admin)
  const [editandoId, setEditandoId]   = useState<string | null>(null)
  const [nuevaFecha, setNuevaFecha]   = useState('')
  const [guardando, setGuardando]     = useState(false)

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
  })

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })

  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const deporteActual = deportes.find(d => d.id === deporteId)
  const esAtletismo = deporteActual?.slug === 'atletismo'

  const { data: encuentros = [], isLoading } = useQuery<EncuentroDB[]>({
    queryKey: ['encuentros', deporteId, estadoFiltro],
    queryFn: () => getEncuentros({
      deporte_id: deporteId !== 'todos' ? deporteId : undefined,
      estado:     estadoFiltro !== 'todos' ? estadoFiltro : undefined,
    }),
    enabled: !esAtletismo,
    // el cron del backend actualiza estados cada 60s; refrescar al mismo ritmo
    refetchInterval: 60_000,
  })

  // Atletismo no tiene encuentros: se muestran sus pruebas con carriles sorteados
  const { data: carriles = [] } = useQuery({
    queryKey: ['atletismo-sorteo'],
    queryFn: () => getAtletismoSorteo(),
    enabled: esAtletismo,
    staleTime: 60_000,
  })

  const pruebasAgrupadas = carriles.reduce((acc, c) => {
    if (!acc[c.prueba]) acc[c.prueba] = []
    acc[c.prueba].push(c)
    return acc
  }, {} as Record<string, typeof carriles>)

  const conteos = COUNTER_CFG.reduce((acc, { key }) => {
    acc[key] = encuentros.filter(e => e.estado === key).length
    return acc
  }, {} as Record<Estado, number>)

  function iniciarEdicion(e: EncuentroDB) {
    setEditandoId(e.id)
    setNuevaFecha(toLocalInput(e.fecha_hora))
  }

  async function guardarFecha() {
    if (!editandoId || !nuevaFecha) return
    setGuardando(true)
    try {
      // nuevaFecha viene del input (hora peruana UTC-5) → convertir a UTC explícitamente
      // Al cambiar la fecha, resetear a programado (puede haber quedado en_curso prematuramente)
      await updateEncuentro(editandoId, {
        fecha_hora: new Date(nuevaFecha + '-05:00').toISOString(),
        estado: 'programado',
      })
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      queryClient.invalidateQueries({ queryKey: ['encuentros-hoy'] })
      setEditandoId(null)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MainLayout title="Consulta de Encuentros" subtitle="Consulta todos los encuentros programados del torneo">

      {/* Filtros */}
      <div className="flex items-end gap-6 mb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted">1. Selecciona el deporte</p>
          <div className="relative">
            <select
              value={deporteId}
              onChange={e => setDeporteId(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-50"
            >
              <option value="todos">Todos los deportes</option>
              {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <img src={deportesIcon} alt="Deporte" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted">2. Filtro (opcional)</p>
          <div className="relative">
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="appearance-none px-3 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-45"
            >
              {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Vista atletismo: pruebas con carriles sorteados (no hay encuentros) */}
      {esAtletismo && (
        <div className="space-y-4">
          {Object.keys(pruebasAgrupadas).length === 0 ? (
            <div className="bg-surface border border-border rounded-xl py-16 text-center px-6">
              <p className="text-sm font-bold text-text mb-1">Atletismo compite por pruebas individuales</p>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Aquí verás las pruebas con sus atletas y carriles. El sorteo de carriles se genera
                automáticamente al cerrar las inscripciones (o desde la sección Sorteo).
              </p>
            </div>
          ) : (
            Object.entries(pruebasAgrupadas).map(([prueba, atletas]) => (
              <div key={prueba} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-base flex items-center justify-between">
                  <p className="text-sm font-bold text-text">{prueba}</p>
                  <span className="text-xs text-muted">{atletas.length} atleta{atletas.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-border">
                  {[...atletas].sort((a, b) => a.carril - b.carril).map(a => {
                    const pais   = a.participantes?.equipos?.grados?.pais_asignado ?? null
                    const codigo = pais ? (codigoMap[pais] ?? '') : ''
                    return (
                      <div key={`${prueba}-${a.participante_id}`} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="w-14 text-[11px] font-bold text-primary shrink-0">Carril {a.carril}</span>
                        {codigo && <BanderaPais codigo={codigo} />}
                        <span className="text-sm font-semibold text-text">{a.participantes?.nombre_completo ?? '—'}</span>
                        <span className="text-xs text-muted ml-auto">
                          {a.participantes?.equipos?.grados?.nombre ?? ''}{pais ? ` · ${pais}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contadores */}
      {!esAtletismo && (
      <div className="grid grid-cols-4 gap-3 mb-5">
        {COUNTER_CFG.map(({ key, label, icon, cls }) => (
          <div key={key} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src={icon} alt={label} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-xs text-muted">{label}</p>
              <p className={`text-2xl font-bold ${cls}`}>{conteos[key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Tabla */}
      {!esAtletismo && (
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <SkeletonRows rows={6} avatar cols={4} />
        ) : encuentros.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay encuentros registrados.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                {['Fecha y Hora', 'Local', 'vs', 'Visitante', 'Deporte', 'Estado', ...(isAdmin ? [''] : [])].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {encuentros.map(e => {
                const { dia, mes, hora } = formatFecha(e.fecha_hora)
                const resultado = e.resultados?.[0] ?? null
                const paisL    = e.equipo_local?.grados?.pais_asignado ?? null
                const paisV    = e.equipo_visitante?.grados?.pais_asignado ?? null
                const codigoL  = paisL ? (codigoMap[paisL] ?? '') : ''
                const codigoV  = paisV ? (codigoMap[paisV] ?? '') : ''
                const gradoL   = e.equipo_local?.grados?.nombre  ?? e.equipo_local?.nombre_equipo  ?? '—'
                const gradoV   = e.equipo_visitante?.grados?.nombre ?? e.equipo_visitante?.nombre_equipo ?? '—'
                const editando = editandoId === e.id

                return (
                  <tr key={e.id} className="hover:bg-base/50 transition-colors">
                    <td className="px-4 py-3">
                      {editando ? (
                        <input
                          type="datetime-local"
                          value={nuevaFecha}
                          onChange={ev => setNuevaFecha(ev.target.value)}
                          className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-text outline-none focus:border-primary"
                        />
                      ) : (
                        <>
                          <p className="text-sm font-bold text-text">{dia}</p>
                          <p className="text-xs text-muted">{mes} · {hora}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {codigoL && <BanderaPais codigo={codigoL} />}
                        <div>
                          <p className="text-sm font-bold text-text leading-tight">{gradoL}</p>
                          {paisL && <p className="text-[10px] text-muted">{paisL}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {resultado ? (
                        <span className="text-sm font-bold text-text">{resultado.puntos_local} - {resultado.puntos_visitante}</span>
                      ) : (
                        <span className="text-xs text-muted">vs</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {codigoV && <BanderaPais codigo={codigoV} />}
                        <div>
                          <p className="text-sm font-bold text-text leading-tight">{gradoV}</p>
                          {paisV && <p className="text-[10px] text-muted">{paisV}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted">{e.deportes?.nombre ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_CFG[e.estado].cls}`}>
                        {ESTADO_CFG[e.estado].label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {editando ? (
                          <div className="flex items-center gap-1">
                            <button onClick={guardarFecha} disabled={guardando}
                              className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer">
                              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button onClick={() => setEditandoId(null)}
                              className="p-1.5 rounded-lg text-muted hover:bg-base transition-colors cursor-pointer">
                              <X size={13} />
                            </button>
                          </div>
                        ) : e.estado === 'finalizado' ? (
                          <span className="p-1.5 text-muted/30" title="No se puede editar la fecha de un encuentro finalizado">
                            <Pencil size={13} />
                          </span>
                        ) : (
                          <button onClick={() => iniciarEdicion(e)}
                            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-base transition-colors cursor-pointer">
                            <Pencil size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      )}
    </MainLayout>
  )
}
