import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<div className="p-8">Olimpiadas Perú - Frontend</div>} />
      </Routes>
    </div>
  )
}

export default App