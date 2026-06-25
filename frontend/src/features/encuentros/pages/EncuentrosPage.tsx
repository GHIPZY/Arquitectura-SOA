import { useState, useEffect } from 'react'
import { MainLayout } from '@/layouts/MainLayout'
import { ChevronDown } from 'lucide-react'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { supabase } from '@/lib/supabase'

import deportesIcon from '@/assets/icons/slide/deportes.png'
import programadosIcon from '@/assets/icons/slide/programdos.png'
import playIcon from '@/assets/icons/slide/play.png'
import finalizadoIcon from '@/assets/icons/slide/finalizado.png'
import postergadoIcon from '@/assets/icons/slide/postergado.png'

type Estado = 'programado' | 'en_curso' | 'finalizado' | 'postergado'

interface Encuentro {
  id: string
  fecha_hora: string
  estado: Estado
  deportes: { nombre: string } | null
  equipo_local: { nombre_equipo: string; grados: { nombre: string; pais_asignado: string } | null } | null
  equipo_visitante: { nombre_equipo: string; grados: { nombre: string; pais_asignado: string } | null } | null
  resultado: { puntos_local: number; puntos_visitante: number } | null
}

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
  { key: 'finalizado', label: 'Finalizados', icon: finalizadoIcon,   cls: 'text-muted'   },
  { key: 'postergado', label: 'Postergados', icon: postergadoIcon,   cls: 'text-warning' },
]

function formatFecha(iso: string) {
  const d = new Date(iso)
  return {
    dia: d.getDate().toString(),
    mes: d.toLocaleString('es-PE', { month: 'short' }).toUpperCase(),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function EncuentrosPage() {
  const [encuentros, setEncuentros] = useState<Encuentro[]>([])
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([])
  const [deporteId, setDeporteId] = useState<string>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDeportes() {
      const { data } = await supabase.from('deportes').select('id, nombre').order('nombre')
      if (data) setDeportes(data)
    }
    fetchDeportes()
  }, [])

  useEffect(() => {
    async function fetchEncuentros() {
      setLoading(true)

      let query = supabase
        .from('encuentros')
        .select('id, fecha_hora, estado, deporte_id, equipo_local_id, equipo_visitante_id')
        .order('fecha_hora', { ascending: true })

      if (deporteId !== 'todos') query = query.eq('deporte_id', deporteId)
      if (estadoFiltro !== 'todos') query = query.eq('estado', estadoFiltro)

      const { data: encuentrosRaw } = await query
      const rows = encuentrosRaw ?? []
      if (rows.length === 0) { setEncuentros([]); setLoading(false); return }

      // IDs únicos para fetches paralelos
      const equipoIds = [...new Set([
        ...rows.map((e: { equipo_local_id: string }) => e.equipo_local_id),
        ...rows.map((e: { equipo_visitante_id: string }) => e.equipo_visitante_id),
      ].filter(Boolean))]
      const deporteIds = [...new Set(rows.map((e: { deporte_id: string }) => e.deporte_id).filter(Boolean))]
      const encuentroIds = rows.map((e: { id: string }) => e.id)

      const [equiposRes, deportesRes, resultadosRes] = await Promise.all([
        equipoIds.length > 0
          ? supabase.from('equipos').select('id, nombre_equipo, grados ( nombre, pais_asignado )').in('id', equipoIds)
          : Promise.resolve({ data: [] }),
        deporteIds.length > 0
          ? supabase.from('deportes').select('id, nombre').in('id', deporteIds)
          : Promise.resolve({ data: [] }),
        supabase.from('resultados').select('encuentro_id, puntos_local, puntos_visitante').in('encuentro_id', encuentroIds),
      ])

      const equiposMap: Record<string, { nombre_equipo: string; grados: { nombre: string; pais_asignado: string } | null }> = {}
      for (const eq of (equiposRes.data ?? []) as any[]) {
        equiposMap[eq.id] = {
          nombre_equipo: eq.nombre_equipo,
          grados: eq.grados ?? null,
        }
      }

      const deportesMap: Record<string, string> = {}
      for (const d of deportesRes.data ?? []) deportesMap[d.id] = d.nombre

      const resultadosMap: Record<string, { puntos_local: number; puntos_visitante: number }> = {}
      for (const r of resultadosRes.data ?? []) resultadosMap[r.encuentro_id] = r

      setEncuentros(rows.map((e: any) => ({
        id: e.id,
        fecha_hora: e.fecha_hora,
        estado: e.estado,
        deportes: e.deporte_id ? { nombre: deportesMap[e.deporte_id] ?? '' } : null,
        equipo_local:     e.equipo_local_id     ? (equiposMap[e.equipo_local_id]     ?? null) : null,
        equipo_visitante: e.equipo_visitante_id ? (equiposMap[e.equipo_visitante_id] ?? null) : null,
        resultado: resultadosMap[e.id] ?? null,
      })) as Encuentro[])

      setLoading(false)
    }
    fetchEncuentros()
  }, [deporteId, estadoFiltro])

  const conteos = COUNTER_CFG.reduce((acc, { key }) => {
    acc[key] = encuentros.filter(e => e.estado === key).length
    return acc
  }, {} as Record<Estado, number>)

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
              className="appearance-none pl-10 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-[200px]"
            >
              <option value="todos">Todos los deportes</option>
              {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <img
              src={deportesIcon}
              alt="Deporte"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain"
            />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted">2. Filtro (opcional)</p>
          <div className="relative">
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="appearance-none px-3 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-[180px]"
            >
              {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {COUNTER_CFG.map(({ key, label, icon, cls }) => (
          <div key={key} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img src={icon} alt={label} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-xs text-muted">{label}</p>
              <p className={`text-2xl font-bold ${cls}`}>{conteos[key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Cargando encuentros...</div>
        ) : encuentros.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay encuentros registrados.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                {['Fecha y Hora', 'Local', 'vs', 'Visitante', 'Deporte', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {encuentros.map(e => {
                const { dia, mes, hora } = formatFecha(e.fecha_hora)
                const resultado = e.resultado
                const codigoL = e.equipo_local?.grados?.pais_asignado ?? ''
                const codigoV = e.equipo_visitante?.grados?.pais_asignado ?? ''
                const nombreL = e.equipo_local?.nombre_equipo ?? '—'
                const nombreV = e.equipo_visitante?.nombre_equipo ?? '—'
                return (
                  <tr key={e.id} className="hover:bg-base/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-text">{dia}</p>
                      <p className="text-xs text-muted">{mes} · {hora}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {codigoL && <BanderaPais codigo={codigoL} />}
                        <span className="text-sm font-bold text-text">{nombreL.toUpperCase()}</span>
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
                        <span className="text-sm font-bold text-text">{nombreV.toUpperCase()}</span>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  )
}
