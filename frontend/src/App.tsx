import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { LoginPage }         from './features/auth/pages/LoginPage'
import { DashboardPage }     from './features/dashboard/pages/DashboardPage'
import { EquiposPage }       from './features/equipos/pages/EquiposPage'
import { EncuentrosPage }    from './features/encuentros/pages/EncuentrosPage'
import { SorteoTorneoPage }  from './features/sorteo/pages/SorteoTorneoPage'
import { ResultadosPage }    from './features/resultados/pages/ResultadosPage'
import { PerfilPage }           from './features/perfil/pages/PerfilPage'
import { ConfiguracionPage }    from './features/configuracion/pages/ConfiguracionPage'
import { UsuariosPage }         from './features/usuarios/pages/UsuariosPage'
import { PosicionesPage }      from './features/posiciones/pages/PosicionesPage'
import { EstadisticasPage }   from './features/estadisticas/pages/EstadisticasPage'
import { AtletismoPage }      from './features/atletismo/pages/AtletismoPage'
import { useCurrentUser }    from './shared/context/UserContext'
import { PublicEncuentrosPage } from './features/publico/pages/PublicEncuentrosPage'
import { PublicPosicionesPage } from './features/publico/pages/PublicPosicionesPage'
import { PublicGoleadoresPage } from './features/publico/pages/PublicGoleadoresPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCurrentUser()
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-base">
      <Loader2 size={28} className="animate-spin text-muted" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RolGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useCurrentUser()
  if (!user) return null
  if (!roles.includes(user.rol)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/"              element={<Navigate to="/login" replace />} />
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/admin"         element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"     element={<AuthGuard><DashboardPage /></AuthGuard>} />
      <Route path="/equipos"       element={<AuthGuard><RolGuard roles={['coordinador']}><EquiposPage /></RolGuard></AuthGuard>} />
      <Route path="/encuentros"    element={<AuthGuard><EncuentrosPage /></AuthGuard>} />
      <Route path="/inscripciones" element={<Navigate to="/equipos" replace />} />
      <Route path="/sorteo"        element={<AuthGuard><RolGuard roles={['administrador']}><SorteoTorneoPage /></RolGuard></AuthGuard>} />
      <Route path="/resultados"    element={<AuthGuard><RolGuard roles={['administrador', 'coordinador', 'espectador']}><ResultadosPage /></RolGuard></AuthGuard>} />
      <Route path="/perfil"        element={<AuthGuard><PerfilPage /></AuthGuard>} />
      <Route path="/configuracion" element={<AuthGuard><RolGuard roles={['administrador']}><ConfiguracionPage /></RolGuard></AuthGuard>} />
      <Route path="/usuarios"      element={<AuthGuard><RolGuard roles={['administrador']}><UsuariosPage /></RolGuard></AuthGuard>} />
      <Route path="/posiciones"    element={<AuthGuard><PosicionesPage /></AuthGuard>} />
      <Route path="/estadisticas"  element={<AuthGuard><EstadisticasPage /></AuthGuard>} />
      <Route path="/atletismo"     element={<AuthGuard><AtletismoPage /></AuthGuard>} />
      {/* Vista pública — espectador sin login */}
      <Route path="/publico"            element={<Navigate to="/publico/encuentros" replace />} />
      <Route path="/publico/encuentros" element={<PublicEncuentrosPage />} />
      <Route path="/publico/posiciones" element={<PublicPosicionesPage />} />
      <Route path="/publico/goleadores" element={<PublicGoleadoresPage />} />
    </Routes>
  )
}

export default App