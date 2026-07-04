import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, Trophy, Target } from 'lucide-react'

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
  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header público */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-base font-bold text-text">Olimpiadas Perú 2026</p>
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
