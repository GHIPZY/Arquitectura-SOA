import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { SkeletonRows } from '@/shared/components/Skeleton'
import {
  UserPlus, Trash2, Loader2, AlertTriangle, CheckCircle2,
  Eye, EyeOff, GraduationCap, ShieldCheck, Users,
} from 'lucide-react'

const PAIS_IMGS = import.meta.glob('/src/assets/paises/*.webp', {
  eager: true, import: 'default',
}) as Record<string, string>

function getFlag(codigo: string) {
  return PAIS_IMGS[`/src/assets/paises/${codigo.toLowerCase()}.webp`] ?? null
}
import { getUsuarios, crearUsuario, eliminarUsuario } from '@/services/usuarios.service'

// Reutilizamos el endpoint de grados via deportes-service si existe, si no los leemos de usuarios
async function getGrados() {
  const { getAuthHeaders } = await import('@/services/auth.service')
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/grados', { headers })
  if (!res.ok) return []
  return res.json() as Promise<{ id: string; nombre: string; pais_asignado: string | null }[]>
}

const ROL_CFG: Record<string, { label: string; cls: string }> = {
  coordinador: { label: 'Coordinador', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  espectador:  { label: 'Espectador',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}


export function UsuariosPage() {
  const queryClient = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios-admin'],
    queryFn: getUsuarios,
    staleTime: 60_000,
  })

  const { data: grados = [] } = useQuery({
    queryKey: ['grados-admin'],
    queryFn: getGrados,
    staleTime: 10 * 60 * 1000,
  })

  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [showPass, setShowPass]     = useState(false)

  const [form, setForm] = useState({
    nombre: '', email: '', password: '',
    rol: 'coordinador', grado_id: '',
  })

  function resetForm() {
    setForm({ nombre: '', email: '', password: '', rol: 'coordinador', grado_id: '' })
    setErrorMsg(null)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!form.nombre || !form.email || !form.password) {
      setErrorMsg('Completa todos los campos requeridos.')
      return
    }
    if (form.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setSaving(true)
    try {
      await crearUsuario({
        nombre:   form.nombre,
        email:    form.email,
        password: form.password,
        rol:      form.rol,
        grado_id: form.grado_id || null,
      })
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] })
      setSuccessMsg(`Cuenta de ${form.rol} creada correctamente.`)
      resetForm()
      setShowForm(false)
    } catch (e: unknown) {
      setErrorMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar(id: string) {
    setDeleting(true)
    try {
      await eliminarUsuario(id)
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] })
      setConfirmDel(null)
    } catch (e: unknown) {
      setErrorMsg((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const coordinadores = usuarios.filter(u => u.rol === 'coordinador')
  const espectadores  = usuarios.filter(u => u.rol === 'espectador')

  // Grados que ya tienen coordinador asignado
  const gradosOcupados = new Set(
    coordinadores.map(u => u.grado).filter(Boolean)
  )
  const gradosDisponibles = grados.filter(g => !gradosOcupados.has(g.nombre))

  return (
    <MainLayout title="Gestión de acceso" subtitle="Crea y administra las cuentas de coordinadores y espectadores">
      <div className="space-y-5">

        {/* Mensajes globales */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm border text-success bg-success/10 border-success/20 rounded-xl">
            <CheckCircle2 size={15} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 px-1 text-sm text-red-600">
            <AlertTriangle size={15} /> {errorMsg}
          </div>
        )}

        {/* Header con botón crear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Users size={14} /> {coordinadores.length} coordinadores</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> {espectadores.length} espectadores</span>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); resetForm(); setSuccessMsg(null) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <UserPlus size={15} /> Nueva cuenta
          </button>
        </div>

        {/* Formulario de creación */}
        {showForm && (
          <div className="p-6 border bg-surface border-border rounded-2xl">
            <p className="mb-4 text-sm font-bold text-text">Nueva cuenta de acceso</p>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Nombre completo *</label>
                  <input
                    type="text" value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Correo electrónico *</label>
                  <input
                    type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Contraseña inicial *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pr-10 px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-muted hover:text-text">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted">Rol *</label>
                  <select
                    value={form.rol}
                    onChange={e => setForm(p => ({ ...p, rol: e.target.value, grado_id: '' }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                  >
                    <option value="coordinador">Coordinador</option>
                    <option value="espectador">Espectador</option>
                  </select>
                </div>
                {form.rol === 'coordinador' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted">Grado asignado</label>
                    <select
                      value={form.grado_id}
                      onChange={e => setForm(p => ({ ...p, grado_id: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Sin asignar</option>
                      {gradosDisponibles.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre}{g.pais_asignado ? ` — ${g.pais_asignado}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 px-1 text-xs text-red-600">
                  <AlertTriangle size={13} /> {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {saving ? 'Creando...' : 'Crear cuenta'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                  className="px-5 py-2.5 border border-border text-sm text-muted rounded-xl hover:text-text hover:border-neutral-400 transition-all cursor-pointer">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="overflow-hidden border bg-surface border-border rounded-2xl">
          {isLoading ? (
            <SkeletonRows rows={5} avatar cols={4} />
          ) : usuarios.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-muted/30" />
              <p className="text-sm text-muted">No hay usuarios registrados aún.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-base border-border">
                <tr>
                  {['Nombre', 'Correo', 'Rol', 'Grado', 'País asignado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-left text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuarios.map(u => (
                  <tr key={u.id} className="transition-colors hover:bg-base/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {u.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-text">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${ROL_CFG[u.rol]?.cls}`}>
                        {ROL_CFG[u.rol]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.grado ? (
                        <div className="flex items-center gap-1.5 text-xs text-text">
                          <GraduationCap size={13} className="text-muted" /> {u.grado}
                        </div>
                      ) : <span className="text-xs italic text-muted">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.pais ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-text">
                          {u.pais_codigo && getFlag(u.pais_codigo)
                            ? <img src={getFlag(u.pais_codigo)!} alt={u.pais} className="object-cover w-5 h-5 rounded-sm shrink-0" />
                            : <span className="text-base">🌍</span>
                          }
                          {u.pais}
                        </div>
                      ) : <span className="text-xs italic text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {confirmDel === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">¿Eliminar?</span>
                          <button onClick={() => handleEliminar(u.id)} disabled={deleting}
                            className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer disabled:opacity-50">
                            {deleting ? '...' : 'Sí'}
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            className="text-[11px] font-bold px-2 py-0.5 rounded bg-base border border-border text-muted hover:text-text cursor-pointer">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDel(u.id)} title="Eliminar cuenta"
                          className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </MainLayout>
  )
}