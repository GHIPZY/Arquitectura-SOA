import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Calendar, LogOut, User, ChevronDown, Trophy, ClipboardList, Settings, Users, BarChart2, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser, type Rol } from '@/shared/context/UserContext'
import logo from '@/assets/login/logo.webp'

import inicioIcon from '@/assets/icons/slide/inicio.png'
import equipoIcon from '@/assets/icons/slide/equipo.png'

const NAV_ITEMS: { icon: React.ElementType | string; label: string; to: string; roles: Rol[] }[] = [
  { icon: inicioIcon,    label: 'Inicio',      to: '/dashboard',   roles: ['administrador', 'coordinador'] },
  { icon: equipoIcon,    label: 'Mis Equipos', to: '/equipos',     roles: ['coordinador'] },
  { icon: Calendar,      label: 'Encuentros',  to: '/encuentros',  roles: ['administrador', 'coordinador', 'espectador'] },
  { icon: Trophy,        label: 'Sorteo',      to: '/sorteo',      roles: ['administrador'] },
  { icon: ClipboardList, label: 'Resultados',  to: '/resultados',  roles: ['administrador', 'coordinador', 'espectador'] },
  { icon: Users,         label: 'Usuarios',    to: '/usuarios',    roles: ['administrador'] },
  { icon: BarChart2,     label: 'Posiciones',   to: '/posiciones',   roles: ['administrador', 'coordinador', 'espectador'] },
  { icon: TrendingUp,   label: 'Estadísticas', to: '/estadisticas', roles: ['administrador', 'coordinador', 'espectador'] },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const items = user
    ? NAV_ITEMS.filter(item => item.roles.includes(user.rol))
    : []

  // Cierra al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch { /* sesión ya expirada */ }
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-40 w-56 h-screen flex flex-col bg-sidebar border-r border-slate-300">

      {/* Logo */}
      <div className="px-5 py-5 flex flex-col items-center border-b border-slate-300">
        <img src={logo} alt="Olimpiadas Perú Logo" className="w-32 h-auto object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ icon, label, to }) => {
          const Icon = icon
          const isPng = typeof Icon === 'string'
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isPng ? (
                    <img
                      src={Icon as string}
                      alt={label}
                      className={`w-4 h-4 object-contain transition-all ${
                        isActive ? 'brightness-0 invert' : 'opacity-70 group-hover:opacity-100'
                      }`}
                    />
                  ) : (
                    <Icon size={16} className={isActive ? 'text-white' : 'text-sidebar-text group-hover:text-slate-900'} />
                  )}
                  {label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Usuario con dropdown */}
      <div ref={ref} className="p-3 border-t border-slate-300 relative">

        {/* Dropdown — aparece arriba */}
        <div className={`absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-border overflow-hidden transition-all duration-200 ease-out origin-bottom ${
          open ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-y-95 translate-y-2 pointer-events-none'
        }`}>
          {/* Info usuario */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text truncate">{user?.nombre ?? '...'}</p>
            <p className="text-[10px] text-muted capitalize">{user?.rol ?? ''}</p>
            {user?.rol === 'coordinador' && user.grado && (
              <p className="text-[10px] text-primary font-semibold mt-0.5">{user.grado}</p>
            )}
          </div>
          {/* Opciones */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { navigate('/perfil'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text hover:bg-base transition-colors cursor-pointer"
            >
              <User size={14} /> Mi perfil
            </button>
            {user?.rol === 'administrador' && (
              <button
                onClick={() => { navigate('/configuracion'); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text hover:bg-base transition-colors cursor-pointer"
              >
                <Settings size={14} /> Configuración
              </button>
            )}
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>

        {/* Botón toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.iniciales ?? '??'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-slate-900 text-xs font-semibold truncate">{user?.nombre ?? '...'}</p>
            <p className="text-sidebar-text text-[10px] capitalize truncate">
              {user?.rol === 'coordinador' && user.grado ? user.grado : (user?.rol ?? '')}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-sidebar-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </aside>
  )
}