import { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Trophy, Target, LogIn } from 'lucide-react'
import { getConfig } from '@/services/config.service'

interface PublicLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

const NAV = [
  { to: '/publico/encuentros', label: 'Encuentros', icon: CalendarDays },
  { to: '/publico/posiciones', label: 'Posiciones', icon: Trophy },
  { to: '/publico/goleadores', label: 'Anotadores', icon: Target },
]

export function PublicLayout({ children, title, subtitle }: PublicLayoutProps) {
  const { data: config } = useQuery({
    queryKey: ['config-public'],
    queryFn: getConfig,
    staleTime: 10 * 60 * 1000,
  })

  const nombreTorneo = config?.nombre_torneo
    ? `${config.nombre_torneo}${config.anio_torneo ? ` ${config.anio_torneo}` : ''}`
    : 'Olimpiadas Perú 2026'

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header público */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-bold text-text">{nombreTorneo}</p>
            <p className="text-xs text-muted">Resultados en vivo</p>
          </div>
          <nav className="flex gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive ? 'bg-accent text-white' : 'text-muted hover:bg-base'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-muted hover:bg-base transition-colors border border-border ml-2"
            >
              <LogIn size={16} />
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  )
}
