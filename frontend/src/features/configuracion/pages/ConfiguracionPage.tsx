import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { Calendar, Trophy, Dumbbell, Save, Loader2, CheckCircle2, AlertTriangle, Table2 } from 'lucide-react'
import { getConfig, setConfig, type AppConfig } from '@/services/config.service'
import { Skeleton } from '@/shared/components/Skeleton'
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

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    staleTime: 5 * 60 * 1000,
  })

  const [draft, setDraft] = useState<Partial<AppConfig>>({})
  const [savingTorneo, setSavingTorneo]           = useState(false)
  const [successTorneo, setSuccessTorneo]         = useState(false)
  const [errorTorneo, setErrorTorneo]             = useState<string | null>(null)
  const [savingInscr, setSavingInscr]             = useState(false)
  const [successInscr, setSuccessInscr]           = useState(false)
  const [errorInscr, setErrorInscr]               = useState<string | null>(null)
  const [savingSets, setSavingSets]               = useState(false)
  const [successSets, setSuccessSets]             = useState(false)
  const [errorSets, setErrorSets]                 = useState<string | null>(null)

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
    setSuccessTorneo(false)
    setSuccessInscr(false)
    setSuccessSets(false)
  }

  async function handleGuardarSets() {
    setSavingSets(true)
    setErrorSets(null)
    setSuccessSets(false)
    try {
      await setConfig(draft)
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setSuccessSets(true)
    } catch (e: unknown) {
      setErrorSets((e as Error).message)
    } finally {
      setSavingSets(false)
    }
  }

  async function handleGuardarTorneo() {
    setSavingTorneo(true)
    setErrorTorneo(null)
    setSuccessTorneo(false)
    try {
      await setConfig(draft)
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setSuccessTorneo(true)
    } catch (e: unknown) {
      setErrorTorneo((e as Error).message)
    } finally {
      setSavingTorneo(false)
    }
  }

  async function handleGuardarInscripciones() {
    setSavingInscr(true)
    setErrorInscr(null)
    setSuccessInscr(false)
    try {
      await setConfig(draft)
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setSuccessInscr(true)
    } catch (e: unknown) {
      setErrorInscr((e as Error).message)
    } finally {
      setSavingInscr(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout title="Configuración" subtitle="Parámetros generales del torneo">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 border bg-surface border-border rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-56" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-9 w-28" />
              </div>
            ))}
          </div>
          <div className="p-5 border bg-surface border-border rounded-2xl h-fit space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
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
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleGuardarTorneo}
                disabled={savingTorneo}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {savingTorneo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingTorneo ? 'Guardando...' : 'Guardar'}
              </button>
              {errorTorneo && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />{errorTorneo}</p>}
              {successTorneo && <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={12} />Guardado</p>}
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
                    ? toLocalInput(draft.fecha_limite_inscripciones)
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
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleGuardarInscripciones}
                disabled={savingInscr}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {savingInscr ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingInscr ? 'Guardando...' : 'Guardar'}
              </button>
              {errorInscr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />{errorInscr}</p>}
              {successInscr && <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={12} />Guardado</p>}
            </div>
          </Seccion>

          {/* Formato tenis de mesa */}
          <Seccion
            icon={<Table2 size={17} className="text-primary" />}
            title="Formato de tenis de mesa"
            description="Cantidad de sets por enfrentamiento individual (solo aplica a tenis de mesa)"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted">Sets por partido</label>
              <select
                value={draft.sets_pingpong ?? '5'}
                onChange={e => set('sets_pingpong', e.target.value === '5' ? null : e.target.value)}
                className="px-3 py-2.5 text-sm border border-border rounded-xl bg-base text-text outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="3">Mejor de 3 — gana quien llega a 2 sets</option>
                <option value="5">Mejor de 5 — gana quien llega a 3 sets (estándar)</option>
              </select>
              <p className="text-[11px] text-muted">
                Afecta la validación al registrar resultados de tenis de mesa. Los resultados ya guardados no se modifican.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleGuardarSets}
                disabled={savingSets}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {savingSets ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingSets ? 'Guardando...' : 'Guardar'}
              </button>
              {errorSets && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />{errorSets}</p>}
              {successSets && <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={12} />Guardado</p>}
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

          </div>
        </div>

      </div>
    </MainLayout>
  )
}