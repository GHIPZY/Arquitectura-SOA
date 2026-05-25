import { Routes, Route } from 'react-router-dom'
import { InscripcionesPage } from './features/inscripciones/pages/InscripcionesPage'
import { LoginPage } from './features/auth/pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inscripciones" element={<InscripcionesPage />} />
    </Routes>
  )
}

export default App