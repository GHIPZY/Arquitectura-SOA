import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { PublicLayout } from '@/layouts/PublicLayout'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { getEncuentrosPublic, type EncuentroDB } from '@/services/encuentros.service'
import { getDeportesPublic } from '@/services/deportes.service'
import { useRealtimeMarcador } from '@/shared/hooks/useRealtimeMarcador'

type Estado = 'programado' | 'en_curso' | 'finalizado' | 'postergado'

const ESTADO_CFG: Record<Estado, { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-info/10 text-info border border-info/20' },
  en_curso:   { label: 'En curso',   cls: 'bg-success/10 text-success border border-success/20' },
  finalizado: { label: 'Finalizado', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  postergado: { label: 'Postergado', cls: 'bg-warning/10 text-warning border border-warning/20' },
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return {
    dia:  d.getDate().toString(),
    mes:  d.toLocaleString('es-PE', { month: 'short' }).toUpperCase(),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function PublicEncuentrosPage() {
  const [deporteId, setDeporteId] = useState('todos')

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes-public'],
    queryFn: getDeportesPublic,
    staleTime: 10 * 60 * 1000,
  })

  const { data: encuentros = [], isLoading, refetch } = useQuery<EncuentroDB[]>({
    queryKey: ['encuentros-public', deporteId],
    queryFn: () => getEncuentrosPublic({ deporte_id: deporteId !== 'todos' ? deporteId : undefined }),
  })

  useRealtimeMarcador(() => { refetch() })

  return (
    <PublicLayout title="Calendario de encuentros" subtitle="Resultados que se actualizan en tiempo real">

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
                const resultado = e.resultados?.[0] ?? null
                const codigoL  = e.equipo_local?.grados?.pais_asignado ?? ''
                const codigoV  = e.equipo_visitante?.grados?.pais_asignado ?? ''
                const nombreL  = e.equipo_local?.nombre_equipo ?? '—'
                const nombreV  = e.equipo_visitante?.nombre_equipo ?? '—'
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
    </PublicLayout>
  )
}
