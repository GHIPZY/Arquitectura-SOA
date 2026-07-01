import { useState } from 'react'
import { X, User, Mail, GraduationCap, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/shared/context/UserContext'

interface Props {
  onClose: () => void
}

export function ProfileModal({ onClose }: Props) {
  const { user } = useCurrentUser()

  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]               = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [loading, setLoading]               = useState(false)
  const [success, setSuccess]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  async function handleChangePassword() {
    setError(null)
    setSuccess(false)
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden border shadow-2xl bg-surface rounded-2xl border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-sm font-bold text-white bg-red-600 rounded-full w-9 h-9 shrink-0">
              {user?.iniciales ?? '??'}
            </div>
            <div>
              <p className="text-sm font-bold text-text">{user?.nombre}</p>
              <p className="text-[11px] text-muted capitalize">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg cursor-pointer hover:bg-base text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Info de solo lectura */}
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold text-muted uppercase tracking-wider">Información</p>

            <div className="flex items-center gap-3 p-3 border bg-base rounded-xl border-border">
              <User size={15} className="text-muted shrink-0" />
              <div>
                <p className="text-[10px] text-muted">Nombre completo</p>
                <p className="text-sm font-semibold text-text">{user?.nombre}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border bg-base rounded-xl border-border">
              <Mail size={15} className="text-muted shrink-0" />
              <div>
                <p className="text-[10px] text-muted">Correo electrónico</p>
                <p className="text-sm font-semibold text-text">{user?.email}</p>
              </div>
            </div>

            {user?.grado && (
              <div className="flex items-center gap-3 p-3 border bg-base rounded-xl border-border">
                <GraduationCap size={15} className="text-muted shrink-0" />
                <div>
                  <p className="text-[10px] text-muted">Grado asignado</p>
                  <p className="text-sm font-semibold text-text">{user.grado}</p>
                </div>
              </div>
            )}
          </div>

          {/* Cambio de contraseña */}
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold text-muted uppercase tracking-wider">Cambiar contraseña</p>

            <div className="relative">
              <Lock size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setSuccess(false); setError(null) }}
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-xl bg-surface text-text outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setSuccess(false); setError(null) }}
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-xl bg-surface text-text outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg bg-red-50">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg text-success bg-success/10 border-success/20">
                <CheckCircle2 size={13} /> Contraseña actualizada correctamente.
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}