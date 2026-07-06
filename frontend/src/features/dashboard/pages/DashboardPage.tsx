import { MainLayout } from '@/layouts/MainLayout'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/shared/context/UserContext'
import { getEncuentrosHoy } from '@/services/encuentros.service'
import { getEquipos } from '@/services/equipos.service'
import { getParticipantesCount } from '@/services/participantes.service'
import { getConfig } from '@/services/config.service'
import { getPaisesDisponibles } from '@/services/instituciones.service'
import { BanderaPais } from '@/shared/components/BanderaPais'

import equipoIcon from '@/assets/icons/slide/equipo.png'
import participantesIcon from '@/assets/icons/slide/participantes.png'
import totalIcon from '@/assets/icons/slide/total.png'
import registroIcon from '@/assets/icons/slide/registro.png'

const ESTADO_CLS: Record<string, string> = {
  programado: 'bg-info/10 text-info',
  en_curso:   'bg-success/10 text-success',
  finalizado: 'bg-gray-100 text-gray-500',
  postergado: 'bg-warning/10 text-warning',
}

const ESTADO_LABEL: Record<string, string> = {
  programado: 'Prog.',
  en_curso:   'LIVE',
  finalizado: 'FIN',
  postergado: 'Post.',
}

export function DashboardPage() {
  const { user } = useCurrentUser()

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-count'],
    queryFn: () => getEquipos(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: participantes = 0 } = useQuery({
    queryKey: ['participantes-count'],
    queryFn: getParticipantesCount,
    staleTime: 5 * 60 * 1000,
  })

  const { data: encuentrosHoy = [] } = useQuery({
    queryKey: ['encuentros-hoy'],
    queryFn: getEncuentrosHoy,
    staleTime: 2 * 60 * 1000,
  })

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    staleTime: 5 * 60 * 1000,
  })

  const inscripcionesAbiertas = !config?.fecha_limite_inscripciones
    || new Date() < new Date(config.fecha_limite_inscripciones)

  const { data: paisesDisponibles = [] } = useQuery({
    queryKey: ['paises-disponibles'],
    queryFn: getPaisesDisponibles,
    staleTime: 30 * 60 * 1000,
  })

  const codigoMap: Record<string, string> = {}
  paisesDisponibles.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const torneoFinalizado = !!config?.fecha_fin_torneo && new Date() > new Date(config.fecha_fin_torneo)

  const stats = [
    { label: 'Equipos registrados', value: equipos.length,       icon: registroIcon      },
    { label: 'Participantes',        value: participantes,        icon: participantesIcon },
    { label: 'Encuentros hoy',       value: encuentrosHoy.length, icon: totalIcon         },
    { label: 'Estado del torneo',    value: torneoFinalizado ? 'Finalizado' : 'Activo', icon: 'status_dot' },
  ]

  return (
    <MainLayout title={`Bienvenido${user ? ', ' + user.nombre : ''}`} subtitle={`Panel de control del torneo ${config?.nombre_torneo ?? ''} ${config?.anio_torneo ?? ''}`.trim()}>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              {icon === 'status_dot' ? (
                <span className="relative flex h-3.5 w-3.5">
                  {!torneoFinalizado && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${torneoFinalizado ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                </span>
              ) : (
                <img src={icon} alt={label} className="w-11 h-11 object-contain" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{value ?? '—'}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cuerpo principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Encuentros de hoy — ocupa 2 columnas */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-text">Encuentros de hoy</p>
            <Link to="/encuentros" className="flex items-center gap-1 text-xs text-info hover:underline">
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {encuentrosHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted">
              <Calendar size={32} className="opacity-30" />
              <p className="text-sm">No hay encuentros programados para hoy.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-base border-b border-border">
                <tr>
                  {['Hora', 'Estado', 'Local', 'Resultado', 'Visitante', 'Deporte'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {encuentrosHoy.map(e => {
                  const hora      = new Date(e.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  const resultado = e.resultados?.[0] ?? null
                  const nombreL   = e.equipo_local?.grados?.nombre ?? '—'
                  const nombreV   = e.equipo_visitante?.grados?.nombre ?? '—'
                  const paisL     = e.equipo_local?.grados?.pais_asignado ?? null
                  const paisV     = e.equipo_visitante?.grados?.pais_asignado ?? null
                  const codigoL   = paisL ? (codigoMap[paisL] ?? '') : ''
                  const codigoV   = paisV ? (codigoMap[paisV] ?? '') : ''
                  return (
                    <tr key={e.id} className="hover:bg-base/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted font-medium">{hora}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_CLS[e.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ESTADO_LABEL[e.estado] ?? e.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {codigoL && <BanderaPais codigo={codigoL} size="sm" />}
                          <span className="text-xs font-semibold text-text">{nombreL}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-text text-center">
                        {resultado ? `${resultado.puntos_local} - ${resultado.puntos_visitante}` : 'vs'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {codigoV && <BanderaPais codigo={codigoV} size="sm" />}
                          <span className="text-xs font-semibold text-text">{nombreV}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{e.deportes?.nombre ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Accesos rápidos — 1 columna */}
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-text mb-3">Accesos rápidos</p>
            <div className="space-y-2">
              <Link to={user?.rol === 'administrador' ? '/equipos-admin' : '/equipos'}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <img src={equipoIcon} alt="Equipos" className="w-5 h-5 object-contain" />
                  <div>
                    <p className="text-xs font-semibold text-text">
                      {user?.rol === 'administrador' ? 'Equipos inscritos' : 'Mis Equipos'}
                    </p>
                    <p className="text-[10px] text-muted">
                      {user?.rol === 'administrador' ? 'Ver y gestionar equipos' : 'Registrar jugadores'}
                    </p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-muted group-hover:text-primary transition-colors" />
              </Link>
              <Link to="/encuentros"
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-info hover:bg-info/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <img src={totalIcon} alt="Encuentros" className="w-5 h-5 object-contain" />
                  <div>
                    <p className="text-xs font-semibold text-text">Encuentros</p>
                    <p className="text-[10px] text-muted">Ver calendario</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-muted group-hover:text-info transition-colors" />
              </Link>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-text mb-3">Estado del torneo</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Evento</span>
                <span className="text-xs font-medium text-text">{config?.nombre_torneo ?? '—'} {config?.anio_torneo ?? ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Inscripciones</span>
                {inscripcionesAbiertas ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                    Abiertas
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-error inline-block" />
                    Cerradas
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Tu rol</span>
                <span className="text-xs font-medium text-text capitalize">{user?.rol ?? '—'}</span>
              </div>
              {user?.rol === 'coordinador' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Tu grado</span>
                  <span className="text-xs font-medium text-text">{user.grado ?? '—'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  )
}