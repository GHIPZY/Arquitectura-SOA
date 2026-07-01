import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from '@/shared/context/UserContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,   // no recargar al volver a la pestaña
      refetchOnReconnect: false,     // no recargar al reconectar red
      retry: 1,                      // solo 1 reintento en caso de error
      staleTime: 30_000,             // datos frescos por 30s por defecto
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <App />
      </UserProvider>
    </QueryClientProvider>
  </BrowserRouter>,
)