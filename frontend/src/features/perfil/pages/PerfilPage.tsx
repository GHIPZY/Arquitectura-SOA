import { useState } from 'react'
import { MainLayout } from '@/layouts/MainLayout'
import { User, Mail, GraduationCap, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { GrUserAdmin } from 'react-icons/gr'
import { getAuthHeaders } from '@/services/auth.service'
import { useCurrentUser } from '@/shared/context/UserContext'

export function PerfilPage() {
  const { user } = useCurrentUser()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  async function handleChangePassword() {
    setError(null)
    setSuccess(false)
    if (!currentPassword) { setError('Ingresa tu contraseña actual.'); return }
    if (newPassword.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/encuentros/me/password', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ passwordActual: currentPassword, passwordNueva: newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al actualizar contraseña')
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const ROL_LABEL: Record<string, string> = {
    administrador: 'Administrador',
    coordinador:   'Coordinador',
    espectador:    'Espectador',
  }

  return (
    <MainLayout title="Mi perfil" subtitle="Información de tu cuenta y configuración de seguridad">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* ── Columna izquierda: tarjeta de identidad ── */}
        <div className="space-y-4 xl:col-span-1">

          {/* Avatar + nombre */}
          <div className="flex flex-col items-center gap-3 p-6 text-center border bg-surface border-border rounded-2xl">
            <div className="flex items-center justify-center w-20 h-20 text-2xl font-black text-white bg-red-600 rounded-full">
              {user?.iniciales ?? '??'}
            </div>
            <div>
              <p className="text-lg font-bold text-text">{user?.nombre}</p>
              <p className="text-sm capitalize text-muted">{ROL_LABEL[user?.rol ?? ''] ?? user?.rol}</p>
              {user?.grado && (
                <span className="inline-block mt-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-0.5 rounded-full">
                  {user.grado}
                </span>
              )}
            </div>
          </div>

          {/* Datos de la cuenta */}
          <div className="p-5 space-y-3 border bg-surface border-border rounded-2xl">
            <p className="text-[11px] font-extrabold text-muted uppercase tracking-wider mb-1">Datos de la cuenta</p>

            <div className="flex items-start gap-3 p-3 border bg-base rounded-xl border-border">
              <User size={15} className="text-muted shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">Nombre completo</p>
                <p className="text-sm font-semibold truncate text-text">{user?.nombre}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border bg-base rounded-xl border-border">
              <Mail size={15} className="text-muted shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">Correo electrónico</p>
                <p className="text-sm font-semibold truncate text-text">{user?.email}</p>
              </div>
            </div>

            {user?.grado && (
              <div className="flex items-start gap-3 p-3 border bg-base rounded-xl border-border">
                <GraduationCap size={15} className="text-muted shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted">Grado asignado</p>
                  <p className="text-sm font-semibold text-text">{user.grado}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 border bg-base rounded-xl border-border">
              <GrUserAdmin className="text-muted shrink-0 mt-0.5" size={15} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">Rol en el sistema</p>
                <p className="text-sm font-semibold capitalize text-text">{ROL_LABEL[user?.rol ?? ''] ?? user?.rol}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: seguridad ── */}
        <div className="space-y-4 xl:col-span-2">

          <div className="p-6 border bg-surface border-border rounded-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 shrink-0">
                <Lock size={17} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">Cambiar contraseña</p>
                <p className="text-xs text-muted">Elige una contraseña segura de al menos 6 caracteres.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted">Contraseña actual</label>
                <div className="relative">
                  <Lock size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Tu contraseña actual"
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setSuccess(false); setError(null) }}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Nueva contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setSuccess(false); setError(null) }}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setSuccess(false); setError(null) }}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador de fuerza */}
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${
                    newPassword.length >= n * 3
                      ? n <= 1 ? 'bg-red-400' : n <= 2 ? 'bg-amber-400' : n <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                      : 'bg-border'
                  }`} />
                ))}
                <span className="text-[10px] text-muted ml-1">
                  {newPassword.length < 4 ? 'Muy corta' : newPassword.length < 7 ? 'Débil' : newPassword.length < 10 ? 'Moderada' : 'Fuerte'}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-1 py-1 mt-4 text-xs text-red-600">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            {success && (
              <div className="mt-4 flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 px-3 py-2.5 rounded-xl">
                <CheckCircle2 size={13} /> Contraseña actualizada correctamente.
              </div>
            )}

            <div className="mt-5">
              <button
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>

          {/* Info de solo lectura — nota */}
          <div className="p-5 border bg-base border-border rounded-2xl">
            <p className="text-xs leading-relaxed text-muted">
              <span className="font-semibold text-text">Nota:</span> El nombre, correo y grado asignado son administrados por el organizador del torneo. Si necesitas actualizar algún dato, comunícate con el administrador.
            </p>
          </div>
        </div>

      </div>
    </MainLayout>
  )
}