import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { getConfig } from '@/services/config.service'
import { NotificacionesBell } from './NotificacionesBell'

interface TopBarProps {
  title: string
  subtitle?: string
  extra?: React.ReactNode
}

export function TopBar({ title, subtitle, extra }: TopBarProps) {
  const [fechaLimite, setFechaLimite] = useState<string | null>(null)

  useEffect(() => {
    getConfig().then(config => {
      if (config.fecha_limite_inscripciones) {
        const d = new Date(config.fecha_limite_inscripciones)
        const dia  = d.getDate().toString().padStart(2, '0')
        const mes  = d.toLocaleString('es-PE', { month: 'short' }).toUpperCase()
        const anio = d.getFullYear()
        const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        setFechaLimite(`${dia} ${mes} ${anio} - ${hora}`)
      }
    })
  }, [])

  return (
    <header className="flex items-center justify-between h-auto gap-4 px-6 py-4 border-b bg-surface border-border">
      <div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <NotificacionesBell />
        {extra}
        {fechaLimite && (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 shrink-0">
              <Calendar size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-subtle leading-none">
                Fecha límite de inscripción
              </span>
              <span className="mt-1 text-xs font-bold leading-none text-text">
                {fechaLimite}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}