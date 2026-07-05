import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronDown, Trophy, Lock } from 'lucide-react'
import { PublicLayout } from '@/layouts/PublicLayout'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { SkeletonRows } from '@/shared/components/Skeleton'
import { getPosiciones, type PosicionDB } from '@/services/resultados.service'
import { getDeportesPublic } from '@/services/deportes.service'
import { useRealtimeMarcador } from '@/shared/hooks/useRealtimeMarcador'

const COLS = ['PJ', 'G', 'E', 'P', 'PF', 'PC', 'DIF']

/** Celda numérica oculta: barra borrosa que insinúa el dato sin revelarlo */
function CeldaOculta() {
  return <div className="mx-auto h-3.5 w-7 rounded bg-slate-200 blur-[2px]" />
}

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
          <SkeletonRows rows={6} avatar cols={7} />
        ) : posiciones.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay posiciones registradas.</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-base border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Equipo</th>
                  {COLS.map(c => (
                    <th key={c} className="text-center px-3 py-3 text-xs font-semibold text-muted">{c}</th>
                  ))}
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posiciones.map((p, i) => {
                  const codigo = p.equipos?.grados?.pais_asignado ?? ''
                  const nombre = p.equipos?.nombre_equipo ?? '—'
                  const medalCls = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : 'text-amber-600'
                  return (
                    <tr key={p.equipo_id} className="hover:bg-base/50 transition-colors">
                      <td className="px-4 py-3">
                        {i < 3
                          ? <Trophy size={15} className={medalCls} />
                          : <span className="text-sm font-bold text-muted">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {codigo && <BanderaPais codigo={codigo} />}
                          <span className="text-sm font-bold text-text">{nombre.toUpperCase()}</span>
                        </div>
                      </td>
                      {COLS.map(c => (
                        <td key={c} className="px-3 py-3 text-center"><CeldaOculta /></td>
                      ))}
                      <td className="px-4 py-3 text-center"><CeldaOculta /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Invitación a iniciar sesión */}
            <div className="px-4 py-3 border-t border-border bg-base flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Lock size={12} />
                Los puntos y estadísticas completas son visibles al iniciar sesión
              </p>
              <Link to="/login" className="text-xs font-bold text-accent hover:underline">
                Iniciar sesión →
              </Link>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  )
}
