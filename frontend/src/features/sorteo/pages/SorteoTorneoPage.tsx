import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import {
  Loader2, Shuffle, RefreshCw, AlertTriangle, CheckCircle2,
  Calendar, ChevronDown, Users, Trash2,
} from 'lucide-react'
import { getDeportes } from '@/services/deportes.service'
import { getEquipos, type EquipoDB } from '@/services/equipos.service'
import { getEncuentros, type EncuentroDB } from '@/services/encuentros.service'
import { generarTorneo, regenerarTorneo, eliminarSorteo } from '@/services/admin.service'
import { getAuthHeaders } from '@/services/auth.service'
import {
  getAtletismoSorteo, generarAtletismoSorteo, eliminarAtletismoSorteo,
  type AtletismoSorteo,
} from '@/services/atletismo.service'

// ── Assets ────────────────────────────────────────────────────────────────────
const PAIS_IMGS = import.meta.glob('/src/assets/paises/*.webp', {
  eager: true, import: 'default',
}) as Record<string, string>

function getFlag(codigo: string | null | undefined) {
  if (!codigo) return null
  return PAIS_IMGS[`/src/assets/paises/${codigo.toLowerCase()}.webp`] ?? null
}

const DEPORTE_ICONS = import.meta.glob('/src/assets/icons/deporte/*.png', {
  eager: true, import: 'default',
}) as Record<string, string>
const FILE_MAP: Record<string, string> = {
  futbol: 'futbol', voley: 'voley', basquet: 'basquet',
  atletismo: 'atletismo', pingpong: 'tenismesa',
}
function getDeporteIcon(slug: string) {
  return DEPORTE_ICONS[`/src/assets/icons/deporte/${FILE_MAP[slug]}.png`] ?? null
}

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })
    + ' · ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

const ESTADO_CLS: Record<string, string> = {
  programado: 'bg-info/10 text-info border border-info/20',
  en_curso:   'bg-success/10 text-success border border-success/20',
  finalizado: 'bg-gray-100 text-gray-500 border border-gray-200',
  postergado: 'bg-warning/10 text-warning border border-warning/20',
}

// ── Componente ────────────────────────────────────────────────────────────────
export function SorteoTorneoPage() {
  const queryClient = useQueryClient()
  const [deporteId, setDeporteId]         = useState('')
  const [expandido, setExpandido]         = useState<string | null>(null)
  const [generando, setGenerando]         = useState(false)
  const [regenerando, setRegenerando]     = useState(false)
  const [confirmarRegen, setConfirmarRegen]       = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando]               = useState(false)
  const [error, setError]                         = useState<string | null>(null)
  const [success, setSuccess]                     = useState<string | null>(null)

  // Atletismo sorteo state
  const [generandoAtl, setGenerandoAtl]           = useState(false)
  const [eliminandoAtl, setEliminandoAtl]         = useState(false)
  const [confirmarElimAtl, setConfirmarElimAtl]   = useState(false)
  const [omitidas, setOmitidas]                   = useState<{ prueba: string; inscritos: number }[]>([])

  const { data: deportes = [], isLoading: loadingDep } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
  })

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })

  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const { data: equipos = [], isLoading: loadingEq } = useQuery<EquipoDB[]>({
    queryKey: ['equipos-sorteo', deporteId],
    queryFn: () => getEquipos({ deporte_id: deporteId }),
    enabled: !!deporteId,
    staleTime: 0,
  })

  const { data: encuentros = [], isLoading: loadingEnc } = useQuery<EncuentroDB[]>({
    queryKey: ['encuentros', deporteId, 'todos'],
    queryFn: () => getEncuentros({ deporte_id: deporteId }),
    enabled: !!deporteId,
    staleTime: 0,
  })

  function seleccionar(id: string) {
    setDeporteId(id)
    setExpandido(id)
    setError(null)
    setSuccess(null)
    setConfirmarRegen(false)
  }

  async function handleGenerar() {
    setGenerando(true); setError(null); setSuccess(null)
    try {
      const result = await generarTorneo(deporteId)
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      setSuccess(`${result.total} encuentros generados correctamente.`)
    } catch (e: unknown) {
      const err = e as Error & { code?: string }
      setError(err.code === 'YA_EXISTE'
        ? 'Ya existen encuentros. Usa "Regenerar torneo" para reemplazarlos.'
        : err.message)
    } finally { setGenerando(false) }
  }

  async function handleEliminar() {
    setEliminando(true); setError(null); setSuccess(null); setConfirmarEliminar(false)
    try {
      await eliminarSorteo(deporteId)
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      setSuccess('Sorteo eliminado. Ya puedes generar uno nuevo.')
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally { setEliminando(false) }
  }

  async function handleRegenerar() {
    setRegenerando(true); setError(null); setSuccess(null); setConfirmarRegen(false)
    try {
      const result = await regenerarTorneo(deporteId)
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      setSuccess(`${result.total} encuentros regenerados correctamente.`)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally { setRegenerando(false) }
  }

  const deporte      = deportes.find(d => d.id === deporteId)
  const esAtletismo  = deporte?.slug === 'atletismo'
  const abierto      = expandido === deporteId && !!deporteId
  const puedeGenerar = equipos.length >= 2

  const { data: atletismoSorteo = [], refetch: refetchSorteo } = useQuery<AtletismoSorteo[]>({
    queryKey: ['atletismo-sorteo'],
    queryFn: () => getAtletismoSorteo(),
    enabled: esAtletismo,
    staleTime: 0,
  })

  // Agrupar carriles por prueba
  const sorteoByPrueba: Record<string, AtletismoSorteo[]> = {}
  atletismoSorteo.forEach(s => {
    if (!sorteoByPrueba[s.prueba]) sorteoByPrueba[s.prueba] = []
    sorteoByPrueba[s.prueba].push(s)
  })
  const tieneSorteoAtl = atletismoSorteo.length > 0

  async function handleGenerarAtl() {
    setGenerandoAtl(true); setError(null); setSuccess(null); setOmitidas([])
    try {
      const r = await generarAtletismoSorteo()
      await refetchSorteo()
      setOmitidas(r.omitidas ?? [])
      if (r.pruebas > 0) {
        setSuccess(`Sorteo generado: ${r.total} atletas en ${r.pruebas} prueba${r.pruebas !== 1 ? 's' : ''}.`)
      } else {
        setError('Ninguna prueba tiene suficientes atletas (mínimo 2).')
      }
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setGenerandoAtl(false) }
  }

  async function handleEliminarAtl() {
    setEliminandoAtl(true); setError(null); setSuccess(null); setConfirmarElimAtl(false)
    try {
      await eliminarAtletismoSorteo()
      await refetchSorteo()
      setSuccess('Sorteo de carriles eliminado.')
    } catch (e: unknown) { setError((e as Error).message) }
    finally { setEliminandoAtl(false) }
  }

  return (
    <MainLayout
      title="Sorteo de Torneo"
      subtitle="Genera los encuentros automáticamente por deporte en formato round-robin"
    >
      <div className="space-y-6">

        {/* ── Paso 1 — Selección de deporte ── */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-extrabold uppercase tracking-tight text-slate-800">1. Selecciona un deporte</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Elige el deporte para ver los equipos inscritos y generar los encuentros.</p>
          </div>

          {loadingDep ? (
            <div className="flex items-center justify-center py-10 gap-3 text-muted">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando deportes…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {deportes.map(d => {
                const activo = d.id === deporteId
                const icon   = getDeporteIcon(d.slug)
                return (
                  <button
                    key={d.id}
                    onClick={() => seleccionar(d.id)}
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer group text-center ${
                      activo
                        ? 'border-primary bg-primary/1 shadow-[0_4px_12px_rgba(30,58,138,0.04)]'
                        : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-sm'
                    }`}
                  >
                    {activo && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black">✓</span>
                      </div>
                    )}
                    <div className="w-16 h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      {icon
                        ? <img src={icon} alt={d.nombre} className="w-14 h-14 object-contain" />
                        : <span className="text-3xl">🏅</span>
                      }
                    </div>
                    <p className={`text-sm font-bold tracking-tight ${activo ? 'text-primary' : 'text-slate-800'}`}>
                      {d.nombre}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Paso 2 — Equipos inscritos + Generar ── */}
        {deporteId && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text">2. Equipos inscritos y generación</h2>

            <div className="bg-surface rounded-xl border border-border overflow-hidden">

              {/* Cabecera expandible */}
              <button
                onClick={() => setExpandido(abierto ? null : deporteId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-base/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {deporte && getDeporteIcon(deporte.slug)
                    ? <img src={getDeporteIcon(deporte.slug)!} alt={deporte.nombre} className="w-8 h-8 object-contain" />
                    : <span className="text-2xl">🏅</span>
                  }
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-slate-800 tracking-tight">
                      {deporte?.nombre}
                      <span className="ml-2 text-xs font-semibold text-neutral-400">
                        ({loadingEq ? '…' : equipos.length} equipos inscritos)
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {encuentros.length > 0 ? `${encuentros.length} encuentros generados` : 'Sin encuentros aún'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${puedeGenerar ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-xs font-bold text-slate-600">
                      {puedeGenerar ? 'Listo para sortear' : 'Equipos insuficientes'}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Panel */}
              {abierto && esAtletismo && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                  <p className="text-xs text-muted">
                    El sorteo de atletismo asigna el <strong>carril de salida</strong> a cada atleta por prueba de forma aleatoria.
                  </p>

                  {error   && <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg"><AlertTriangle size={13} />{error}</div>}
                  {success && <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 px-3 py-2.5 rounded-lg"><CheckCircle2 size={13} />{success}</div>}
                  {omitidas.length > 0 && (
                    <div className="border border-border rounded-lg px-4 py-3 space-y-1.5">
                      <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Pruebas omitidas — mínimo 2 atletas requeridos:
                      </p>
                      {omitidas.map(o => (
                        <p key={o.prueba} className="text-xs text-muted pl-5">
                          · <span className="font-semibold text-text">{o.prueba}</span> — {o.inscritos === 0 ? 'sin atletas inscritos' : `solo ${o.inscritos} inscrito`}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleGenerarAtl}
                      disabled={generandoAtl}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {generandoAtl ? <Loader2 size={15} className="animate-spin" /> : <Shuffle size={15} />}
                      {tieneSorteoAtl ? 'Regenerar sorteo' : 'Generar sorteo de carriles'}
                    </button>
                    {tieneSorteoAtl && !confirmarElimAtl && (
                      <button
                        onClick={() => setConfirmarElimAtl(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-red-300 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 size={15} /> Eliminar sorteo
                      </button>
                    )}
                  </div>

                  {confirmarElimAtl && (
                    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={15} />¿Eliminar sorteo de carriles?</p>
                      <div className="flex gap-2">
                        <button onClick={handleEliminarAtl} disabled={eliminandoAtl}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-60">
                          {eliminandoAtl ? <Loader2 size={13} className="animate-spin" /> : null}
                          {eliminandoAtl ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                        <button onClick={() => setConfirmarElimAtl(false)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold cursor-pointer">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {tieneSorteoAtl && (
                    <div className="space-y-4">
                      {Object.entries(sorteoByPrueba).map(([prueba, atletas]) => (
                        <div key={prueba} className="border border-border rounded-lg overflow-hidden">
                          <div className="px-4 py-2.5 bg-base border-b border-border">
                            <p className="text-xs font-bold text-text">{prueba}</p>
                          </div>
                          <table className="w-full">
                            <thead className="bg-surface border-b border-border">
                              <tr>
                                {['Carril', 'Atleta', 'Grado'].map(h => (
                                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {atletas.map(a => {
                                const pais   = a.participantes?.equipos?.grados?.pais_asignado ?? null
                                const codigo = pais ? (codigoMap[pais] ?? '') : ''
                                const flag   = getFlag(codigo)
                                const grado  = a.participantes?.equipos?.grados?.nombre ?? '—'
                                return (
                                  <tr key={a.id} className="hover:bg-base/40 transition-colors">
                                    <td className="px-4 py-2.5">
                                      <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">{a.carril}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm font-semibold text-text">{a.participantes?.nombre_completo ?? '—'}</td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-2">
                                        {flag && <img src={flag} alt={pais ?? ''} className="w-5 h-5 rounded object-cover border border-border" />}
                                        <span className="text-xs text-muted">{grado}</span>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {abierto && !esAtletismo && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">

                  {/* Equipos inscritos */}
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                      Equipos inscritos
                    </p>

                    {loadingEq ? (
                      <div className="flex items-center gap-2 py-4 text-muted text-sm">
                        <Loader2 size={16} className="animate-spin" /> Cargando equipos…
                      </div>
                    ) : equipos.length === 0 ? (
                      <div className="text-center py-8 px-4 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                        <Users size={24} className="mx-auto text-neutral-300 mb-2" />
                        <p className="text-xs font-bold text-slate-800">No hay equipos inscritos</p>
                        <p className="text-[11px] text-neutral-400 mt-1">Los coordinadores deben inscribir sus equipos primero.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {equipos.map(eq => {
                          const pais   = eq.grados?.pais_asignado ?? null
                          const codigo = pais ? (codigoMap[pais] ?? '') : ''
                          const flag   = getFlag(codigo)
                          const grado  = eq.grados?.nombre ?? eq.nombre_equipo ?? '—'
                          return (
                            <div
                              key={eq.id}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-green-200 bg-green-50"
                            >
                              {flag
                                ? <img src={flag} alt={pais ?? ''} className="w-8 h-8 rounded-md object-cover border border-green-200 shrink-0" />
                                : <div className="w-8 h-8 rounded-md bg-white border border-green-200 flex items-center justify-center text-sm shrink-0">🏳️</div>
                              }
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-green-800 truncate">{grado}</p>
                                {pais && <p className="text-[10px] text-green-600 truncate">{pais}</p>}
                              </div>
                              <span className="ml-auto shrink-0 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                                <span className="text-[9px] font-black">✓</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                      <AlertTriangle size={13} /> {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 px-3 py-2.5 rounded-lg">
                      <CheckCircle2 size={13} /> {success}
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {encuentros.length === 0 ? (
                      <button
                        onClick={handleGenerar}
                        disabled={generando || !puedeGenerar}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {generando ? <Loader2 size={15} className="animate-spin" /> : <Shuffle size={15} />}
                        {generando ? 'Generando…' : 'Generar torneo'}
                      </button>
                    ) : (
                      <>
                        {!confirmarRegen && !confirmarEliminar && (
                          <button
                            onClick={() => setConfirmarRegen(true)}
                            disabled={regenerando}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <RefreshCw size={15} />
                            Regenerar torneo
                          </button>
                        )}
                        {!confirmarEliminar && !confirmarRegen && (
                          <button
                            onClick={() => setConfirmarEliminar(true)}
                            disabled={eliminando}
                            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-red-300 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all cursor-pointer"
                          >
                            {eliminando ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            Eliminar sorteo
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Confirmación regenerar */}
                  {confirmarRegen && (
                    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={15} />
                        <p className="text-sm font-bold">¿Estás seguro?</p>
                      </div>
                      <p className="text-xs text-red-600">
                        Se eliminarán todos los encuentros de <strong>{deporte?.nombre}</strong> y se generarán nuevos. Esta acción no se puede deshacer.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRegenerar}
                          disabled={regenerando}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {regenerando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          {regenerando ? 'Regenerando…' : 'Sí, regenerar'}
                        </button>
                        <button
                          onClick={() => setConfirmarRegen(false)}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmación eliminar */}
                  {confirmarEliminar && (
                    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={15} />
                        <p className="text-sm font-bold">¿Eliminar todos los encuentros?</p>
                      </div>
                      <p className="text-xs text-red-600">
                        Se eliminarán todos los encuentros de <strong>{deporte?.nombre}</strong>. Podrás generar un nuevo sorteo desde cero.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEliminar}
                          disabled={eliminando}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {eliminando ? <Loader2 size={13} className="animate-spin" /> : null}
                          {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar(false)}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabla de encuentros */}
                  {encuentros.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-primary" />
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Calendario generado</p>
                      </div>
                      {loadingEnc ? (
                        <div className="flex items-center gap-2 py-4 text-muted text-sm">
                          <Loader2 size={16} className="animate-spin" /> Cargando encuentros…
                        </div>
                      ) : (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-base border-b border-border">
                              <tr>
                                {['#', 'Fecha', 'Local', 'vs', 'Visitante', 'Estado'].map(h => (
                                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {encuentros.map((e, i) => {
                                const paisL  = e.equipo_local?.grados?.pais_asignado ?? null
                                const paisV  = e.equipo_visitante?.grados?.pais_asignado ?? null
                                const codL   = paisL ? (codigoMap[paisL] ?? '') : ''
                                const codV   = paisV ? (codigoMap[paisV] ?? '') : ''
                                const flagL  = getFlag(codL)
                                const flagV  = getFlag(codV)
                                const gradoL = e.equipo_local?.grados?.nombre  ?? e.equipo_local?.nombre_equipo  ?? '—'
                                const gradoV = e.equipo_visitante?.grados?.nombre ?? e.equipo_visitante?.nombre_equipo ?? '—'
                                return (
                                  <tr key={e.id} className="hover:bg-base/50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-muted">{i + 1}</td>
                                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                                      {e.fecha_hora ? formatFecha(e.fecha_hora) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {flagL
                                          ? <img src={flagL} alt={paisL ?? ''} className="w-6 h-6 rounded object-cover border border-border" />
                                          : <div className="w-6 h-6 rounded bg-base border border-border flex items-center justify-center text-xs">🏳️</div>
                                        }
                                        <div>
                                          <p className="text-xs font-semibold text-text">{gradoL}</p>
                                          {paisL && <p className="text-[10px] text-muted">{paisL}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold text-muted text-center">vs</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {flagV
                                          ? <img src={flagV} alt={paisV ?? ''} className="w-6 h-6 rounded object-cover border border-border" />
                                          : <div className="w-6 h-6 rounded bg-base border border-border flex items-center justify-center text-xs">🏳️</div>
                                        }
                                        <div>
                                          <p className="text-xs font-semibold text-text">{gradoV}</p>
                                          {paisV && <p className="text-[10px] text-muted">{paisV}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTADO_CLS[e.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                                        {e.estado}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  )
}