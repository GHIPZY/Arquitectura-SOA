import { useState, useMemo, useRef } from 'react'
import { X, Check, Dices } from 'lucide-react'
import { BanderaPais } from './BanderaPais'
import { supabase } from '@/lib/supabase'

interface Country {
  id: string       // ISO code (e.g. 'BR', 'PE')
  name: string     // Display name (e.g. 'Brasil')
  code: string     // 3-letter code (e.g. 'BRA')
  color: string    // Accent color for glows & confetti
}

const COUNTRIES: Country[] = [
  { id: 'BR', name: 'Brasil', code: 'BRA', color: '#22C55E' },
  { id: 'AR', name: 'Argentina', code: 'ARG', color: '#38BDF8' },
  { id: 'FR', name: 'Francia', code: 'FRA', color: '#2563EB' },
  { id: 'DE', name: 'Alemania', code: 'GER', color: '#FBBF24' },
  { id: 'ES', name: 'España', code: 'ESP', color: '#EF4444' },
  { id: 'IT', name: 'Italia', code: 'ITA', color: '#10B981' },
  { id: 'PT', name: 'Portugal', code: 'POR', color: '#DC2626' },
  { id: 'UY', name: 'Uruguay', code: 'URU', color: '#60A5FA' },
  { id: 'CO', name: 'Colombia', code: 'COL', color: '#F59E0B' },
  { id: 'CL', name: 'Chile', code: 'CHI', color: '#EF4444' },
  { id: 'PE', name: 'Perú', code: 'PER', color: '#D91023' },
]

const ITEM_H = 90

interface SorteoStageProps {
  onClose: () => void
  onConfirm: (pais: { pais: string; codigo: string; nombre: string }) => void
  currentCountry?: { pais: string; codigo: string } | null
}

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  dur: number
  rot: number
  size: number
  color: string
  shape: 'rect' | 'circle'
}

export function SorteoStage({ onClose, onConfirm, currentCountry }: SorteoStageProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'spinning' | 'revealed'>(
    currentCountry ? 'revealed' : 'idle'
  )
  const [result, setResult] = useState<Country | null>(() => {
    if (currentCountry) {
      return COUNTRIES.find(c => c.id === currentCountry.codigo) || {
        id: currentCountry.codigo,
        name: currentCountry.pais,
        code: currentCountry.codigo,
        color: '#D91023'
      }
    }
    return null
  })
  const [error, setError] = useState<string | null>(null)
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const trackRef = useRef<HTMLDivElement>(null)

  // Repetir el listado para poder hacer scroll largo y fluido
  const reelList = useMemo(() => {
    const list: Country[] = []
    for (let i = 0; i < 8; i++) {
      list.push(...COUNTRIES)
    }
    return list
  }, [])

  const spin = async () => {
    if (phase === 'loading' || phase === 'spinning') return
    setPhase('loading')
    setError(null)
    setConfetti([])
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/instituciones/asignar-pais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      
      const data = await res.json()

      if (!res.ok || !data.pais) {
        setPhase('idle')
        setError(data.error || 'Error al asignar el país. Por favor, intenta de nuevo.')
        return
      }

      const rawResult = data.pais as { pais: string; codigo: string; nombre: string }
      
      const targetCountry = COUNTRIES.find(c => c.id === rawResult.codigo) || {
        id: rawResult.codigo,
        name: rawResult.pais,
        code: rawResult.codigo,
        color: '#D91023',
      }

      setPhase('spinning')

      // Aterrizar en la 7ma iteración del carrete
      const targetIndex = (reelList.length - COUNTRIES.length) + reelList.findIndex(c => c.id === targetCountry.id)
      const finalY = -(targetIndex * ITEM_H) + 50 // Centrado en la línea media del visor de 190px (offset = 50px)

      const track = trackRef.current
      if (!track) {
        setResult(targetCountry)
        setPhase('revealed')
        return
      }

      // Reiniciar posición inicial del carrete
      track.style.transition = 'none'
      track.style.transform = 'translateY(50px)'
      // Forzar reflow
      void track.offsetHeight

      // Iniciar transición cinemática
      track.style.transition = 'transform 4200ms cubic-bezier(0.22, 1, 0.36, 1)'
      track.style.transform = `translateY(${finalY}px)`

      setTimeout(() => {
        setResult(targetCountry)
        setPhase('revealed')
        
        // Estallido de confeti temático
        const pieces = Array.from({ length: 80 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 400,
          dur: 2200 + Math.random() * 1800,
          rot: Math.random() * 360,
          size: 6 + Math.random() * 10,
          color: ['#FBBF24', '#D91023', '#3B82F6', '#22C55E', targetCountry.color][Math.floor(Math.random() * 5)],
          shape: (Math.random() > 0.5 ? 'rect' : 'circle') as 'rect' | 'circle',
        }))
        setConfetti(pieces)
        setTimeout(() => setConfetti([]), 5000)
      }, 4300)

    } catch (err) {
      setPhase('idle')
      setError('Error de conexión con el servidor. Verifica tu internet e intenta de nuevo.')
    }
  }

  const handleConfirm = () => {
    if (result) {
      onConfirm({
        pais: result.name,
        codigo: result.id,
        nombre: result.name
      })
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_220ms_ease-out]" 
        role="dialog"
      >
        {/* Contenedor Modal */}
        <div className="relative w-full max-w-[460px] bg-white rounded-[32px] border border-neutral-100 p-8 shadow-2xl flex flex-col items-center overflow-hidden animate-[revealIn_320ms_cubic-bezier(0.16,1,0.3,1)]">
          
          {/* Botón cerrar */}
          <button 
            className="absolute top-5 right-5 w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100/80 transition-all flex items-center justify-center cursor-pointer z-20" 
            onClick={onClose}
            aria-label="Cerrar sorteo"
          >
            <X size={18} />
          </button>

          {/* Cabecera */}
          <div className="text-center relative z-10 mb-8 w-full">
            <div className="text-amber-600 font-extrabold text-[10px] uppercase tracking-[0.3em] mb-1.5 animate-[fadeUp_500ms_100ms_backwards]">
              Olimpiadas Perú · 2026
            </div>
            <h2 className="text-slate-800 text-3xl font-black uppercase tracking-tight leading-none mb-3 animate-[fadeUp_500ms_200ms_backwards]">
              Sorteo de País
            </h2>
            {phase !== 'revealed' ? (
              <p className="text-neutral-500 text-xs md:text-sm leading-relaxed max-w-sm mx-auto animate-[fadeUp_500ms_300ms_backwards]">
                Inicia el sorteo para asignar oficialmente el país que representará a tu grado en todas las disciplinas.
              </p>
            ) : (
              <p className="text-neutral-500 text-xs md:text-sm leading-relaxed max-w-sm mx-auto animate-[fadeUp_500ms_300ms_backwards]">
                ¡Tu grado representará oficialmente a este país en todas las competencias!
              </p>
            )}
          </div>

          {/* Carrete / Visor */}
          {phase !== 'revealed' && (
            <div className="w-full flex flex-col items-center mb-8 relative z-10 animate-[fadeUp_600ms_400ms_backwards]">
              
              {/* Carrete visor */}
              <div className="w-full max-w-[360px] h-[190px] relative overflow-hidden bg-neutral-50/50 rounded-[20px] border border-neutral-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.03)]">
                {/* Degradados de desvanecimiento superior/inferior */}
                <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-neutral-50/90 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-neutral-50/90 to-transparent pointer-events-none z-10" />
                
                {/* Línea guía de centrado */}
                <div className="absolute inset-x-0 top-[50px] h-[90px] border-y border-amber-500/25 bg-amber-500/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.02)] pointer-events-none z-10" />

                {/* Riel con banderas */}
                <div 
                  ref={trackRef} 
                  className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
                  style={{ transform: 'translateY(50px)' }}
                >
                  {reelList.map((c, i) => (
                    <div key={i} className="h-[90px] flex items-center justify-start gap-5 pl-16 pr-6">
                      <BanderaPais codigo={c.id} className="w-10 h-10 object-contain rounded-lg border border-neutral-200/60 shadow-sm bg-white p-0.5" />
                      <span className="font-mono text-xs text-neutral-400 font-semibold tracking-wider w-10 text-center">{c.code}</span>
                      <span className="font-bold text-xl text-slate-800 tracking-tight truncate max-w-[150px]">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Acciones para Girar */}
          {phase !== 'revealed' && (
            <div className="flex flex-col items-center gap-4 w-full relative z-10 animate-[fadeUp_600ms_450ms_backwards]">
              {error && (
                <div className="text-red-600 text-xs font-semibold max-w-sm text-center bg-red-50 border border-red-200 px-4 py-2 rounded-lg mb-1">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3 w-full max-w-[320px] justify-center mt-2">
                <button 
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:shadow-none text-slate-900 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:scale-102 active:scale-98 transition-all cursor-pointer"
                  onClick={spin}
                  disabled={phase === 'loading' || phase === 'spinning'}
                >
                  {phase === 'loading' || phase === 'spinning' ? (
                    <>
                      <span className="spinner-dot border-t-slate-900" />
                      Sorteando...
                    </>
                  ) : (
                    <>
                      <Dices size={14} />
                      Girar Ruleta
                    </>
                  )}
                </button>

                <button 
                  className="flex-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Resultado y Confirmación */}
          {phase === 'revealed' && result && (
            <div className="flex flex-col items-center relative z-10 w-full animate-[revealIn_600ms_cubic-bezier(0.16,1,0.3,1)]">
              <div className="mb-6 relative">
                <BanderaPais 
                  codigo={result.id} 
                  className="w-[240px] h-[240px] object-contain rounded-2xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative z-10 bg-white p-4" 
                />
              </div>

              <h3 className="text-slate-800 text-4xl font-black uppercase tracking-tight mb-2 text-center">
                {result.name}
              </h3>

              <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px] uppercase tracking-widest mb-8 bg-neutral-50 border border-neutral-200/60 px-4 py-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <span>Código: <strong className="text-amber-600 font-bold">{result.code}</strong></span>
                <span className="text-neutral-300">•</span>
                <span>Fecha: <strong className="text-neutral-600 font-bold">{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</strong></span>
              </div>

              <button 
                className="w-full max-w-[320px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-100 transition-all duration-200 cursor-pointer"
                onClick={handleConfirm}
              >
                <Check size={14} />
                Confirmar y continuar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Capa de Confeti */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {confetti.map(p => (
            <div
              key={p.id}
              className="absolute w-2 h-3.5 top-[-20px] animate-[confettiFall_linear_forwards]"
              style={{
                left: `${p.left}%`,
                width: p.shape === 'circle' ? p.size : p.size * 0.7,
                height: p.size,
                background: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : 1,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.dur}ms`,
                transform: `rotate(${p.rot}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Estilos dinámicos para animaciones especiales */}
      <style>{`
        .spinner-dot {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: inherit;
          border-radius: 50%;
          animation: spin-anim 700ms linear infinite;
          display: inline-block;
        }
        @keyframes spin-anim { to { transform: rotate(360deg); } }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes revealIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes confettiFall {
          to { transform: translateY(105vh) rotate(720deg); }
        }
      `}</style>
    </>
  )
}
