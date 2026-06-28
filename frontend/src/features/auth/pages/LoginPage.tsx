import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import loginBg from '@/assets/login/login-bg.webp'
import logo from '@/assets/login/logo.webp'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login`
const MAX_INTENTOS = 5

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [intentosUsados, setIntentosUsados] = useState(0)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown cuando está bloqueado
  useEffect(() => {
    if (!bloqueadoHasta) return

    function tick() {
      const diff = bloqueadoHasta!.getTime() - Date.now()
      if (diff <= 0) {
        setBloqueadoHasta(null)
        setIntentosUsados(0)
        setCountdown('')
        if (timerRef.current) clearInterval(timerRef.current)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [bloqueadoHasta])

  const bloqueado = bloqueadoHasta !== null && bloqueadoHasta > new Date()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueado) return
    setLoading(true)
    setErrorMsg(null)

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.bloqueado_hasta) {
        setBloqueadoHasta(new Date(data.bloqueado_hasta))
      }
      if (data.intentos_usados !== undefined) {
        setIntentosUsados(data.intentos_usados)
      }
      if (data.error === 'credenciales') {
        setErrorMsg('Email o contraseña incorrectos.')
      }
      setLoading(false)
      return
    }

    await supabase.auth.setSession(data.session)

    switch (data.rol) {
      case 'administrador': navigate('/dashboard'); break
      case 'coordinador': navigate('/equipos'); break
      case 'espectador': navigate('/encuentros'); break
      default: navigate('/dashboard')
    }

    setLoading(false)
  }

  const intentosRestantes = MAX_INTENTOS - intentosUsados

  return (
    <div className="bg-gray-100 font-sans h-screen w-full overflow-hidden flex flex-col lg:flex-row">

      {/* Panel izquierdo */}
      <aside className="w-full lg:w-130 xl:w-145 h-full bg-white flex flex-col justify-between relative z-10 shadow-2xl shrink-0">
        <div className="grow flex flex-col items-center justify-center px-8 sm:px-12 py-10 w-full max-w-md mx-auto">

          {/* Logo */}
          <div className="mb-10 w-48 h-48 flex items-center justify-center">
            <img
              src={logo}
              alt="Olimpiadas Perú Logo"
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Formulario */}
          <form className="w-full space-y-4" onSubmit={handleLogin}>

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Usuario / Email"
                disabled={bloqueado}
                autoComplete="username"
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-sm text-gray-800 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {/* Contraseña */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" fillRule="evenodd" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                disabled={bloqueado}
                autoComplete="current-password"
                className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-sm text-gray-800 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

            {/* Indicador de intentos */}
            {intentosUsados > 0 && !bloqueado && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Intentos de acceso</span>
                  <span className={intentosRestantes <= 1 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                    {intentosRestantes} restante{intentosRestantes !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: MAX_INTENTOS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < intentosUsados ? 'bg-red-500' : 'bg-gray-200'
                        }`}
                    />
                  ))}
                </div>
                {errorMsg && (
                  <p className="text-xs text-red-600">{errorMsg}</p>
                )}
              </div>
            )}

            {/* Mensaje de bloqueo con countdown */}
            {bloqueado && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center space-y-2">
                <div className="flex justify-center">
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-700">Acceso bloqueado</p>
                <p className="text-xs text-red-600">Demasiados intentos fallidos. Intente nuevamente en:</p>
                <p className="text-2xl font-bold text-red-700 tabular-nums">{countdown}</p>
              </div>
            )}

            {/* Error simple (antes del primer intento fallido) */}
            {errorMsg && intentosUsados === 0 && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading || bloqueado}
              className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-colors uppercase tracking-wider mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'INGRESANDO...' : bloqueado ? 'BLOQUEADO' : 'INGRESAR AL CAMPO'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="py-6 px-8 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">Olimpiadas Perú 2026</p>
        </div>

        {/* Curva SVG */}
        <div className="hidden lg:block absolute top-0 right-0 translate-x-[98%] h-full w-24 pointer-events-none z-20">
          <svg className="h-full w-full fill-white" preserveAspectRatio="none" viewBox="0 0 100 1000">
            <path d="M0,0 C80,300 120,600 0,1000 L0,0 Z" />
          </svg>
        </div>
      </aside>

      {/* Panel derecho */}
      <main className="hidden lg:block flex-1 relative bg-gray-900 overflow-hidden">
        <img
          src={loginBg}
          alt="Estadio iluminado de noche"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#0a1526] via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-0 left-0 w-full p-12 pb-16 flex flex-col items-start pl-24 xl:pl-32">
          <div className="w-24 h-24 mb-4 flex items-center justify-center opacity-90 grayscale brightness-200 contrast-200">
            <img
              src={logo}
              alt="Olimpiadas Perú Logo"
              className="w-full h-auto object-contain"
            />
          </div>
          <h1 className="text-white text-3xl xl:text-4xl font-bold tracking-wide italic drop-shadow-lg">
            "La plataforma oficial de tus olimpiadas"
          </h1>
        </div>
      </main>
    </div>
  )
}
