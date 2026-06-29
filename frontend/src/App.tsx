import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage }      from './features/auth/pages/LoginPage'
import { DashboardPage }  from './features/dashboard/pages/DashboardPage'
import { EquiposPage }    from './features/equipos/pages/EquiposPage'
import { EncuentrosPage } from './features/encuentros/pages/EncuentrosPage'
import { PublicEncuentrosPage } from './features/publico/pages/PublicEncuentrosPage'
import { PublicPosicionesPage } from './features/publico/pages/PublicPosicionesPage'
import { PublicGoleadoresPage } from './features/publico/pages/PublicGoleadoresPage'

function App() {
  return (
    <Routes>
      <Route path="/"           element={<Navigate to="/login" replace />} />
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/admin"      element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"  element={<DashboardPage />} />
      <Route path="/equipos"    element={<EquiposPage />} />
      <Route path="/encuentros" element={<EncuentrosPage />} />
      <Route path="/inscripciones" element={<Navigate to="/equipos" replace />} />

      {/* Vista pública — espectador sin login */}
      <Route path="/publico"            element={<Navigate to="/publico/encuentros" replace />} />
      <Route path="/publico/encuentros" element={<PublicEncuentrosPage />} />
      <Route path="/publico/posiciones" element={<PublicPosicionesPage />} />
      <Route path="/publico/goleadores" element={<PublicGoleadoresPage />} />
    </Routes>
  )
}

export default App
