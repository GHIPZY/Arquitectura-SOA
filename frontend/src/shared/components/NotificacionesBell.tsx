import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Trophy, Users, Calendar, CheckCheck, Check } from 'lucide-react'
import {
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  type NotificacionDB,
} from '@/services/notificaciones.service'

const TIPO_ICON: Record<string, React.ReactNode> = {
  resultado:   <Trophy size={14} className="text-primary" />,
  inscripcion: <Users size={14} className="text-success" />,
  encuentro:   <Calendar size={14} className="text-info" />,
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} día${d !== 1 ? 's' : ''}`
}

export function NotificacionesBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [shaking, setShaking] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: notificaciones = [] } = useQuery<NotificacionDB[]>({
    queryKey: ['notificaciones'],
    queryFn: getNotificaciones,
    staleTime: 60_000,
  })

  const noLeidas = notificaciones.filter(n => !n.leida).length

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleBellClick() {
    setOpen(v => !v)
    // Vibración de la campana: reinicia la animación en cada clic
    setShaking(false)
    requestAnimationFrame(() => setShaking(true))
  }

  async function handleMarcarTodas() {
    await marcarTodasLeidas()
    queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
  }

  async function handleClickNotificacion(n: NotificacionDB) {
    if (!n.leida) {
      await marcarLeida(n.id)
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg text-muted hover:text-text hover:bg-base transition-colors cursor-pointer"
        title="Notificaciones"
      >
        <span className={`block ${shaking ? 'animate-bell-shake' : ''}`} onAnimationEnd={() => setShaking(false)}>
          <Bell size={18} />
        </span>
        {/* Badge: se encoge suavemente al quedar en cero */}
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center transition-all duration-200 ${
            noLeidas > 0 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}
        >
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 origin-top-right animate-dropdown-in">
          {/* Piquito que ancla el panel a la campanita */}
          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-surface border-l border-t border-border rotate-45" />
          <div className="relative rounded-xl overflow-hidden">
            {/* Encabezado: entra justo después de que el panel termina de abrirse */}
            <div
              className="px-4 py-3 border-b border-border flex items-center justify-between animate-stagger-in"
              style={{ animationDelay: '0.16s' }}
            >
              <p className="text-xs font-bold text-text uppercase tracking-wide">Notificaciones</p>
              {noLeidas > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <CheckCheck size={12} />
                  Marcar leídas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="py-10 text-center animate-stagger-in" style={{ animationDelay: '0.2s' }}>
                  <Bell size={24} className="mx-auto text-muted/30 mb-2" />
                  <p className="text-xs text-muted">No tienes notificaciones.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notificaciones.map((n, i) => (
                    <button
                      key={n.id}
                      onClick={() => handleClickNotificacion(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer animate-stagger-in ${
                        n.leida ? 'hover:bg-base/50' : 'bg-primary/3 hover:bg-base'
                      }`}
                      style={{ animationDelay: `${0.2 + Math.min(i, 8) * 0.045}s` }}
                    >
                      <div className="w-7 h-7 rounded-full bg-base border border-border flex items-center justify-center shrink-0 mt-0.5">
                        {TIPO_ICON[n.tipo] ?? <Bell size={14} className="text-muted" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs leading-tight ${n.leida ? 'font-semibold text-muted' : 'font-bold text-text'}`}>
                          {n.titulo}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5 leading-snug">{n.mensaje}</p>
                        <p className="text-[10px] text-subtle mt-1 flex items-center gap-1">
                          {tiempoRelativo(n.created_at)}
                          {n.leida && (
                            <span className="flex items-center gap-0.5 text-success">
                              · <Check size={10} /> leída
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Punto rojo: se encoge al marcarse como leída */}
                      <span
                        className={`w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5 ml-auto transition-all duration-200 ${
                          n.leida ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
