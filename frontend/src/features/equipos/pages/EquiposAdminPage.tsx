import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { ChevronDown, Ban, Loader2, AlertTriangle, ShieldX } from 'lucide-react'
import { getEquipos, descalificarEquipo, type EquipoDB } from '@/services/equipos.service'
import descalificarIcon from '@/assets/icons/iconos generales/descalificar.png'
import { getDeportes } from '@/services/deportes.service'
import { getAuthHeaders } from '@/services/auth.service'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { SkeletonRows } from '@/shared/components/Skeleton'

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

export function EquiposAdminPage() {
  const queryClient = useQueryClient()
  const [deporteId, setDeporteId] = useState('todos')
  const [confirmando, setConfirmando] = useState<EquipoDB | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
  })

  const { data: equipos = [], isLoading } = useQuery<EquipoDB[]>({
    queryKey: ['equipos-admin', deporteId],
    queryFn: () => getEquipos(deporteId !== 'todos' ? { deporte_id: deporteId } : undefined),
  })

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })
  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  async function handleDescalificar() {
    if (!confirmando) return
    setProcesando(true)
    setError(null)
    try {
      await descalificarEquipo(confirmando.id)
      queryClient.invalidateQueries({ queryKey: ['equipos-admin'] })
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      setConfirmando(null)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <MainLayout title="Gestión de Equipos" subtitle="Todos los equipos inscritos en el torneo">

      {/* Filtro por deporte */}
      <div className="mb-5">
        <div className="relative inline-block">
          <select
            value={deporteId}
            onChange={e => setDeporteId(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-50"
          >
            <option value="todos">Todos los deportes</option>
            {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Tabla de equipos */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <SkeletonRows rows={6} avatar cols={3} />
        ) : equipos.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No hay equipos inscritos.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-base border-b border-border">
              <tr>
                {['Equipo', 'Deporte', 'Grado', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {equipos.map(e => (
                <tr key={e.id} className={`transition-colors ${e.descalificado ? 'opacity-70' : 'hover:bg-base/50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {e.grados?.pais_asignado && codigoMap[e.grados.pais_asignado] && (
                        <BanderaPais codigo={codigoMap[e.grados.pais_asignado]} />
                      )}
                      <span className="text-sm font-bold text-text">{e.nombre_equipo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{e.deportes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {e.grados?.nombre ?? '—'}
                    {e.grados?.pais_asignado && <span className="text-subtle"> · {e.grados.pais_asignado}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {e.descalificado ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                        <ShieldX size={13} /> Descalificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" /> Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!e.descalificado && (
                      <button
                        onClick={() => { setConfirmando(e); setError(null) }}
                        className="text-xs font-semibold text-muted hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Descalificar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !procesando && setConfirmando(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={ev => ev.stopPropagation()}
          >
            <div className="mx-auto w-16 h-16 flex items-center justify-center">
              <img src={descalificarIcon} alt="Descalificar" className="w-12 h-12 object-contain" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-text">¿Descalificar a {confirmando.nombre_equipo}?</p>
              <p className="text-xs text-muted leading-relaxed">
                Esta acción <strong>no se puede deshacer</strong>: se anularán las estadísticas de sus jugadores
                y todos sus encuentros se resolverán por walkover a favor de los rivales.
                Se notificará al coordinador y a los espectadores.
              </p>
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1.5 justify-center">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={handleDescalificar}
                disabled={procesando}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {procesando ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                {procesando ? 'Descalificando...' : 'Sí, descalificar'}
              </button>
              <button
                onClick={() => setConfirmando(null)}
                disabled={procesando}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-muted hover:bg-base transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
