import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Lock, X, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { SkeletonRows } from '@/shared/components/Skeleton'
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
  const [encuentroModal, setEncuentroModal] = useState<EncuentroDB | null>(null)

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
          <SkeletonRows rows={6} avatar cols={3} />
        ) : encuentros.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay encuentros registrados.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                {['Fecha y Hora', 'Local', 'vs', 'Visitante', 'Deporte', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {encuentros.map(e => {
                const { dia, mes, hora } = formatFecha(e.fecha_hora)
                const codigoL  = e.equipo_local?.grados?.pais_asignado ?? ''
                const codigoV  = e.equipo_visitante?.grados?.pais_asignado ?? ''
                const nombreL  = e.equipo_local?.nombre_equipo ?? '—'
                const nombreV  = e.equipo_visitante?.nombre_equipo ?? '—'
                const finalizado = e.estado === 'finalizado'
                return (
                  <tr
                    key={e.id}
                    onClick={finalizado ? () => setEncuentroModal(e) : undefined}
                    title={finalizado ? 'Ver resultado' : undefined}
                    className={`transition-colors ${finalizado ? 'cursor-pointer hover:bg-base' : 'hover:bg-base/50'}`}
                  >
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
                      <span className="text-xs text-muted">vs</span>
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
                    <td className="px-4 py-3 w-8">
                      {finalizado && <ChevronRight size={16} className="text-muted" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: invita a iniciar sesión para ver el resultado */}
      {encuentroModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEncuentroModal(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={ev => ev.stopPropagation()}
          >
            {/* Encabezado con los equipos */}
            <div className="bg-base px-6 py-5 border-b border-border relative">
              <button
                onClick={() => setEncuentroModal(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:bg-surface transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center mb-3">
                {encuentroModal.deportes?.nombre ?? 'Encuentro'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  {encuentroModal.equipo_local?.grados?.pais_asignado && (
                    <BanderaPais codigo={encuentroModal.equipo_local.grados.pais_asignado} size="md" />
                  )}
                  <span className="text-[11px] font-bold text-text text-center leading-tight">
                    {encuentroModal.equipo_local?.grados?.nombre ?? '—'}
                  </span>
                </div>
                <span className="text-xs font-bold text-muted shrink-0">vs</span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  {encuentroModal.equipo_visitante?.grados?.pais_asignado && (
                    <BanderaPais codigo={encuentroModal.equipo_visitante.grados.pais_asignado} size="md" />
                  )}
                  <span className="text-[11px] font-bold text-text text-center leading-tight">
                    {encuentroModal.equipo_visitante?.grados?.nombre ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-6 py-6 text-center space-y-3">
              <div className="mx-auto w-11 h-11 rounded-full bg-base border border-border flex items-center justify-center">
                <Lock size={18} className="text-muted" />
              </div>
              <p className="text-sm font-bold text-text">Resultado disponible al iniciar sesión</p>
              <p className="text-xs text-muted leading-relaxed">
                Para ver el marcador y las estadísticas de este encuentro, ingresa con tu cuenta de espectador.
                Si eres estudiante y aún no tienes una, pídesela al coordinador de tu grado.
              </p>
            </div>

            {/* Acciones */}
            <div className="px-6 pb-6 space-y-2">
              <Link
                to={`/login?next=${encodeURIComponent(`/resultados?encuentro=${encuentroModal.id}`)}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors"
              >
                <LogIn size={15} />
                Iniciar sesión
              </Link>
              <button
                onClick={() => setEncuentroModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-muted hover:bg-base transition-colors cursor-pointer"
              >
                Seguir viendo el calendario
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
