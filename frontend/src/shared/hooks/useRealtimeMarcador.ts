import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

//React escucha directo a Supabase vía WebSocket SOLO para recibir
//notificaciones de cambio (no para leer/escribir datos).
export function useRealtimeMarcador(onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('espectador-marcador')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tabla_posiciones' }, () => onChange())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
