import { Routes, Route } from 'react-router-dom'
import { InscripcionesPage } from './features/inscripciones/pages/InscripcionesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<InscripcionesPage />} />
      <Route path="/inscripciones" element={<InscripcionesPage />} />
    </Routes>
  )
}

export default App