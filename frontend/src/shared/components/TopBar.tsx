import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TopBarProps {
  title: string
  subtitle?: string
  extra?: React.ReactNode
}

export function TopBar({ title, subtitle, extra }: TopBarProps) {
  const [fechaLimite, setFechaLimite] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'fecha_limite_inscripcion')
        .single()

      if (data?.valor) {
        const d = new Date(data.valor)
        const dia = d.getDate().toString().padStart(2, '0')
        const mes = d.toLocaleString('es-PE', { month: 'short' }).toUpperCase()
        const anio = d.getFullYear()
        const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        setFechaLimite(`${dia} ${mes} ${anio} - ${hora}`)
      }
    }
    fetchConfig()
  }, [])

  return (
    <header className="h-auto px-6 py-4 bg-surface border-b border-border flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {extra}
        {fechaLimite && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0">
              <Calendar size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-subtle leading-none">
                Fecha límite de inscripción
              </span>
              <span className="text-xs font-bold text-text leading-none mt-1">
                {fechaLimite}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
