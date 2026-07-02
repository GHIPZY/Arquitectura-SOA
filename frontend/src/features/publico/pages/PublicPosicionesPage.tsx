import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { PublicLayout } from '@/layouts/PublicLayout'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { getPosiciones, type PosicionDB } from '@/services/resultados.service'
import { getDeportesPublic } from '@/services/deportes.service'
import { useRealtimeMarcador } from '@/shared/hooks/useRealtimeMarcador'

const COLS = [
  { key: 'partidos_jugados', label: 'PJ' },
  { key: 'ganados',          label: 'G'  },
  { key: 'empatados',        label: 'E'  },
  { key: 'perdidos',         label: 'P'  },
  { key: 'puntos_favor',     label: 'PF' },
  { key: 'puntos_contra',    label: 'PC' },
  { key: 'diferencia',       label: 'DIF' },
] as const

export function PublicPosicionesPage() {
  const [deporteId, setDeporteId] = useState('todos')

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes-public'],
    queryFn: getDeportesPublic,
    staleTime: 10 * 60 * 1000,
  })

  const { data: posiciones = [], isLoading, refetch } = useQuery<PosicionDB[]>({
    queryKey: ['posiciones-public', deporteId],
    queryFn: () => getPosiciones(deporteId !== 'todos' ? deporteId : undefined),
  })

  useRealtimeMarcador(() => { refetch() })

  return (
    <PublicLayout title="Tabla de posiciones" subtitle="Clasificación actualizada en tiempo real">

      {/* Selector de deporte */}
      <div className="mb-5">
        <div className="relative inline-block">
          <select
            value={deporteId}
            onChange={e => setDeporteId(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent transition-colors min-w-50"
          >
            <option value="todos">Todos los deportes</option>
            {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted">Cargando posiciones...</div>
        ) : posiciones.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay posiciones registradas.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Equipo</th>
                {COLS.map(c => (
                  <th key={c.key} className="text-center px-3 py-3 text-xs font-semibold text-muted">{c.label}</th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posiciones.map((p, i) => {
                const codigo = p.equipos?.grados?.pais_asignado ?? ''
                const nombre = p.equipos?.nombre_equipo ?? '—'
                return (
                  <tr key={p.equipo_id} className="hover:bg-base/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {codigo && <BanderaPais codigo={codigo} />}
                        <span className="text-sm font-bold text-text">{nombre.toUpperCase()}</span>
                      </div>
                    </td>
                    {COLS.map(c => (
                      <td key={c.key} className="px-3 py-3 text-center text-sm text-text">{p[c.key]}</td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm font-bold text-primary">{p.puntos_totales}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </PublicLayout>
  )
}
