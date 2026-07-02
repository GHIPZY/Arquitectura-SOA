import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { PublicLayout } from '@/layouts/PublicLayout'
import { getGoleadores, type GoleadorDB } from '@/services/resultados.service'
import { getDeportesPublic } from '@/services/deportes.service'
import { useRealtimeMarcador } from '@/shared/hooks/useRealtimeMarcador'

export function PublicGoleadoresPage() {
  const [deporteId, setDeporteId] = useState('todos')

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes-public'],
    queryFn: getDeportesPublic,
    staleTime: 10 * 60 * 1000,
  })

  const { data: goleadores = [], isLoading, refetch } = useQuery<GoleadorDB[]>({
    queryKey: ['goleadores-public', deporteId],
    queryFn: () => getGoleadores(deporteId !== 'todos' ? deporteId : undefined),
  })

  // El ranking depende de estadisticas_jugador; refrescamos también ante
  // cambios en resultados (un encuentro finalizado suele traer nuevas stats).
  useRealtimeMarcador(() => { refetch() })

  return (
    <PublicLayout title="Ranking de anotadores" subtitle="Máximos anotadores del torneo">

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
          <div className="py-16 text-center text-sm text-muted">Cargando ranking...</div>
        ) : goleadores.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay anotadores registrados.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Jugador</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Asist.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {goleadores.map((g, i) => (
                <tr key={g.participante_id} className="hover:bg-base/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-muted">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-bold text-text">{g.nombre_completo}</td>
                  <td className="px-4 py-3 text-center text-sm text-text">{g.total_asistencias}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-primary">{g.total_puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PublicLayout>
  )
}
