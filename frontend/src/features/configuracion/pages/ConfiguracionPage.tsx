import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { Settings, Calendar, Trophy, Dumbbell, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getConfig, setConfig, type AppConfig } from '@/services/config.service'
import { getDeportes } from '@/services/deportes.service'
import { getAuthHeaders } from '@/services/auth.service'

interface SeccionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}

function Seccion({ icon, title, description, children }: SeccionProps) {
  return (
    <div className="p-6 border bg-surface border-border rounded-2xl">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex items-center justify-center border w-9 h-9 rounded-xl bg-base border-border shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-text">{title}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    staleTime: 5 * 60 * 1000,
  })

  const [draft, setDraft] = useState<Partial<AppConfig>>({})
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Deportes — límites editables
  type DeporteDraft = { max_participantes: number; min_participantes: number }
  const { data: deportes = [] } = useQuery({ queryKey: ['deportes'], queryFn: getDeportes, staleTime: 5 * 60 * 1000 })
  const [deportesDraft, setDeportesDraft] = useState<Record<string, DeporteDraft>>({})
  const [savingDeportes, setSavingDeportes] = useState(false)
  const [successDeportes, setSuccessDeportes] = useState(false)
  const [errorDeportes, setErrorDeportes] = useState<string | null>(null)

  useEffect(() => {
    if (deportes.length > 0) {
      const map: Record<string, DeporteDraft> = {}
      deportes.forEach(d => { map[d.id] = { max_participantes: d.max_participantes ?? 0, min_participantes: d.min_participantes ?? 0 } })
      setDeportesDraft(map)
    }
  }, [deportes])

  async function handleGuardarDeportes() {
    setSavingDeportes(true)
    setErrorDeportes(null)
    setSuccessDeportes(false)
    try {
      const headers = await getAuthHeaders()
      await Promise.all(
        deportes.map(d =>
          fetch(`/api/deportes/deportes/${d.id}`, {
            method: 'PUT', headers,
            body: JSON.stringify(deportesDraft[d.id]),
          }).then(async r => { if (!r.ok) { const j = await r.json(); throw new Error(j.error) } })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['deportes'] })
      setSuccessDeportes(true)
    } catch (e: unknown) {
      setErrorDeportes((e as Error).message)
    } finally {
      setSavingDeportes(false)
    }
  }

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  function set(key: keyof AppConfig, value: string | null) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSuccess(false)
    setError(null)
  }

  async function handleGuardar() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await setConfig(draft)
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setSuccess(true)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const hayDraft = JSON.stringify(draft) !== JSON.stringify(config)

  if (isLoading) {
    return (
      <MainLayout title="Configuración" subtitle="Parámetros generales del torneo">
        <div className="flex items-center justify-center gap-3 py-16 text-muted">
          <Loader2 size={20} className="animate-spin" /> Cargando configuración...
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Configuración" subtitle="Parámetros generales del torneo">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* ── Columna izquierda: 2/3 del espacio ── */}
        <div className="space-y-5 xl:col-span-2">

          {/* Torneo */}
          <Seccion
            icon={<Trophy size={17} className="text-primary" />}
            title="Datos del torneo"
            description="Nombre e identificación del evento"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted">Nombre del torneo</label>
                <input
                  type="text"
                  value={draft.nombre_torneo ?? ''}
                  onChange={e => set('nombre_torneo', e.target.value || null)}
                  placeholder="Ej: Olimpiadas Escolares Perú"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted">Año</label>
                <input
                  type="number"
                  value={draft.anio_torneo ?? ''}
                  onChange={e => set('anio_torneo', e.target.value || null)}
                  placeholder="Ej: 2026"
                  min="2020"
                  max="2099"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </Seccion>

          {/* Inscripciones */}
          <Seccion
            icon={<Calendar size={17} className="text-primary" />}
            title="Período de inscripciones"
            description="Define hasta cuándo los coordinadores pueden inscribir jugadores y equipos"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted">Fecha y hora límite</label>
              <div className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={draft.fecha_limite_inscripciones
                    ? draft.fecha_limite_inscripciones.slice(0, 16)
                    : ''}
                  onChange={e => set('fecha_limite_inscripciones', e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null)}
                  className="text-sm border border-border rounded-xl px-3 py-2.5 bg-base text-text outline-none focus:border-primary transition-colors"
                />
                {draft.fecha_limite_inscripciones && (
                  <button
                    onClick={() => set('fecha_limite_inscripciones', null)}
                    className="text-xs underline cursor-pointer text-muted hover:text-text"
                  >
                    Quitar límite
                  </button>
                )}
              </div>
              {draft.fecha_limite_inscripciones && new Date() > new Date(draft.fecha_limite_inscripciones) && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Esta fecha ya pasó — las inscripciones están cerradas.
                </p>
              )}
            </div>
          </Seccion>

          {/* Límites por deporte */}
          <Seccion
            icon={<Dumbbell size={17} className="text-primary" />}
            title="Límites de jugadores por deporte"
            description="Mínimo y máximo de jugadores permitidos en cada equipo según el deporte"
          >
            <div className="overflow-hidden border rounded-xl border-border">
              <table className="w-full">
                <thead className="border-b bg-base border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Deporte</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted">Mín. jugadores</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted">Máx. jugadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deportes.map(d => (
                    <tr key={d.id} className="hover:bg-base/50">
                      <td className="px-4 py-3 text-sm font-semibold text-text">{d.nombre}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={deportesDraft[d.id]?.min_participantes ?? ''}
                          onChange={e => setDeportesDraft(prev => ({ ...prev, [d.id]: { ...prev[d.id], min_participantes: Number(e.target.value) } }))}
                          className="w-20 text-center text-sm border border-border rounded-lg py-1.5 px-2 outline-none focus:border-primary transition-colors bg-surface text-text"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={deportesDraft[d.id]?.max_participantes ?? ''}
                          onChange={e => setDeportesDraft(prev => ({ ...prev, [d.id]: { ...prev[d.id], max_participantes: Number(e.target.value) } }))}
                          className="w-20 text-center text-sm border border-border rounded-lg py-1.5 px-2 outline-none focus:border-primary transition-colors bg-surface text-text"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorDeportes && (
              <div className="flex items-center gap-2 px-1 mt-3 text-xs text-red-600">
                <AlertTriangle size={13} /> {errorDeportes}
              </div>
            )}
            {successDeportes && (
              <div className="flex items-center gap-2 px-3 py-2 mt-3 text-xs border text-success bg-success/10 border-success/20 rounded-xl">
                <CheckCircle2 size={13} /> Límites actualizados correctamente
              </div>
            )}
            <button
              onClick={handleGuardarDeportes}
              disabled={savingDeportes}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {savingDeportes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingDeportes ? 'Guardando...' : 'Guardar límites'}
            </button>
          </Seccion>

        </div>

        {/* ── Columna derecha: resumen y guardar ── */}
        <div className="space-y-4">
          <div className="sticky p-5 border bg-surface border-border rounded-2xl top-4">
            <p className="mb-4 text-xs font-extrabold tracking-wider uppercase text-muted">Resumen actual</p>
            <div className="space-y-3">

              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted">Torneo</span>
                <span className="text-xs font-semibold text-right text-text">
                  {config?.nombre_torneo
                    ? `${config.nombre_torneo} ${config.anio_torneo ?? ''}`
                    : <span className="italic text-muted">Sin definir</span>}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted shrink-0">Inscripciones</span>
                {config?.fecha_limite_inscripciones ? (
                  <span className={`text-xs font-semibold ${
                    new Date() > new Date(config.fecha_limite_inscripciones) ? 'text-red-600' : 'text-success'
                  }`}>
                    {new Date() > new Date(config.fecha_limite_inscripciones) ? 'Cerradas' : 'Abiertas'}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-success">Abiertas</span>
                )}
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted shrink-0">Disciplinas</span>
                <span className="text-xs font-semibold text-text">{deportes.length} activas</span>
              </div>
            </div>

            <div className="pt-4 mt-5 space-y-3 border-t border-border">
              {error && (
                <div className="flex items-center gap-2 px-1 text-xs text-red-600">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs border text-success bg-success/10 border-success/20 rounded-xl">
                  <CheckCircle2 size={13} /> Configuración guardada
                </div>
              )}
              <button
                onClick={handleGuardar}
                disabled={saving || !hayDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  )
}