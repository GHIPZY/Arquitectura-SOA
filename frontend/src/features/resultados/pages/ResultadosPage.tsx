import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import {
  ClipboardList, ChevronDown, Loader2, Save, CheckCircle2,
  AlertTriangle, Users, Trophy, Trash2,
} from 'lucide-react'
import { useCurrentUser } from '@/shared/context/UserContext'
import { getAuthHeaders } from '@/services/auth.service'

// Imágenes .webp de banderas
const PAIS_IMGS = import.meta.glob('/src/assets/paises/*.webp', {
  eager: true, import: 'default',
}) as Record<string, string>

// Iconos generales
const STAT_ICONS = import.meta.glob('/src/assets/icons/iconos generales/*.png', {
  eager: true, import: 'default',
}) as Record<string, string>

function StatIcon({ name }: { name: string }) {
  const src = STAT_ICONS[`/src/assets/icons/iconos generales/${name}.png`]
  if (!src) return null
  return <img src={src} alt={name} className="w-6 h-6 object-contain inline-block" />
}

function getFlag(codigo: string | null | undefined) {
  if (!codigo) return null
  return PAIS_IMGS[`/src/assets/paises/${codigo.toLowerCase()}.webp`] ?? null
}

async function getGradosPaises(): Promise<{ pais: string; codigo: string }[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/instituciones/paises-disponibles', { headers })
  if (!res.ok) return []
  return res.json()
}

function FlagImg({ codigo, size = 'md' }: { codigo: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const src = getFlag(codigo)
  const cls = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'
  if (src) return <img src={src} alt={codigo ?? ''} className={`${cls} rounded-md object-cover border border-border shadow-sm shrink-0`} />
  return <div className={`${cls} rounded-md bg-base border border-border flex items-center justify-center text-lg shrink-0`}>🏳️</div>
}
import { getEncuentros, type EncuentroDB } from '@/services/encuentros.service'
import { getDeportes } from '@/services/deportes.service'
import { getParticipantes, type ParticipanteDB } from '@/services/participantes.service'
import { upsertResultado, getResultado, deleteResultado } from '@/services/resultados.service'
import {
  getEstadisticasEncuentro,
  guardarEstadisticasBulk,
  updateEncuentro,
  type EstadisticaJugador,
} from '@/services/admin.service'
import { getAtletismoResultados } from '@/services/atletismo.service'

// ─── Config por deporte ────────────────────────────────────────────────────

type StatField = 'puntos' | 'asistencias' | 'tarjetas_amarillas' | 'tarjetas_rojas'

interface StatColConfig {
  field:             StatField
  label:             string
  icon?:             string       // Nombre del archivo en iconos generales (sin .png)
  sumDebeIgualMarcador?: boolean
}

interface DeporteConfig {
  scoreLabel:      string
  cols:            StatColConfig[]
  pingpongMode?:   boolean  // enfrentamientos 1v1, marcador automático
  noEmpate?:       boolean  // no se permite empate (ej: básquet)
}

const DEPORTE_CONFIG: Record<string, DeporteConfig> = {
  futbol: {
    scoreLabel: 'Goles',
    cols: [
      { field: 'puntos',             label: 'Goles',       icon: 'gol',      sumDebeIgualMarcador: true },
      { field: 'asistencias',        label: 'Asistencias'                    },
      { field: 'tarjetas_amarillas', label: 'Amarilla',    icon: 'amarilla'  },
      { field: 'tarjetas_rojas',     label: 'Roja',        icon: 'roja'      },
    ],
  },
  basquet: {
    scoreLabel: 'Puntos',
    noEmpate: true,
    cols: [
      { field: 'puntos',      label: 'Puntos', sumDebeIgualMarcador: true },
      { field: 'asistencias', label: 'Asistencias' },
    ],
  },
  voley: {
    scoreLabel: 'Sets',
    cols: [
      { field: 'puntos',      label: 'Puntos' },
      { field: 'asistencias', label: 'Aces'   },
    ],
  },
  atletismo: {
    scoreLabel: 'Posición',
    cols: [
      { field: 'puntos', label: 'Posición' },
    ],
  },
  pingpong: {
    scoreLabel: 'Partidos',
    pingpongMode: true,
    cols: [
      { field: 'puntos', label: 'Sets' },
    ],
  },
}

const DEFAULT_CONFIG: DeporteConfig = {
  scoreLabel: 'Puntos',
  cols: [
    { field: 'puntos',      label: 'Puntos'      },
    { field: 'asistencias', label: 'Asistencias' },
  ],
}

const PRUEBAS_ATLETISMO = [
  'Velocista 100m', 'Velocista 200m', 'Velocista 400m', 'Fondista',
  'Saltador de Altura', 'Saltador de Longitud', 'Lanzador', 'Marchista',
]
// ─── Tipos ─────────────────────────────────────────────────────────────────

type TabEquipo = 'local' | 'visitante'

type StatRow = {
  participante_id: string
  nombre: string
  posicion: string | null
  puntos: number
  asistencias: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
}

const ESTADOS_FILTRO = [
  { key: 'todos',      label: 'Todos' },
  { key: 'programado', label: 'Programado' },
  { key: 'en_curso',   label: 'En curso' },
  { key: 'finalizado', label: 'Finalizado' },
  { key: 'postergado', label: 'Postergado' },
]

const ESTADO_CFG: Record<string, { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  en_curso:   { label: 'En curso',   cls: 'bg-green-50 text-green-700 border-green-200' },
  finalizado: { label: 'Finalizado', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  postergado: { label: 'Postergado', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return {
    dia:  d.getDate().toString().padStart(2, '0'),
    mes:  d.toLocaleString('es-PE', { month: 'short' }).toUpperCase(),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── Sub-componente: Panel de un encuentro seleccionado ─────────────────────

function PanelEncuentro({
  encuentro,
  isAdmin,
  onClose,
  codigoMap,
}: {
  encuentro: EncuentroDB
  isAdmin: boolean
  onClose: () => void
  codigoMap: Record<string, string>
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabEquipo>('local')
  const resultadoInicial = encuentro.resultados?.[0] ?? null
  const [puntosLocal, setPuntosLocal]       = useState(resultadoInicial ? String(resultadoInicial.puntos_local) : '')
  const [puntosVisitante, setPuntosVisitante] = useState(resultadoInicial ? String(resultadoInicial.puntos_visitante) : '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [statsRows, setStatsRows] = useState<Record<string, StatRow>>({})
  const [estadoEncuentro, setEstadoEncuentro] = useState(encuentro.estado)
  const [eliminandoResultado, setEliminandoResultado] = useState(false)
  const [confirmarElimResultado, setConfirmarElimResultado] = useState(false)

  // initialData evita el flash de 0 al abrir; staleTime 0 refresca igual en background
  const { data: resultadoExistente } = useQuery({
    queryKey: ['resultado', encuentro.id],
    queryFn: () => getResultado(encuentro.id),
    staleTime: 0,
    initialData: encuentro.resultados?.[0] ?? undefined,
  })

  // Si el fetch trae datos más frescos que el prop, actualiza los inputs
  useEffect(() => {
    if (resultadoExistente) {
      setPuntosLocal(String(resultadoExistente.puntos_local))
      setPuntosVisitante(String(resultadoExistente.puntos_visitante))
    }
  }, [resultadoExistente])

  // Jugadores del equipo local
  const { data: jugadoresLocal = [], isLoading: loadingL } = useQuery<ParticipanteDB[]>({
    queryKey: ['jugadores', encuentro.equipo_local?.id],
    queryFn: () => getParticipantes({ equipo_id: encuentro.equipo_local!.id }),
    enabled: !!encuentro.equipo_local?.id,
  })

  // Jugadores del equipo visitante
  const { data: jugadoresVisitante = [], isLoading: loadingV } = useQuery<ParticipanteDB[]>({
    queryKey: ['jugadores', encuentro.equipo_visitante?.id],
    queryFn: () => getParticipantes({ equipo_id: encuentro.equipo_visitante!.id }),
    enabled: !!encuentro.equipo_visitante?.id,
  })

  // Estadísticas existentes — staleTime 0 para siempre refrescar al abrir
  const { data: estadisticasData } = useQuery<EstadisticaJugador[]>({
    queryKey: ['estadisticas', encuentro.id],
    queryFn: () => getEstadisticasEncuentro(encuentro.id),
    staleTime: 0,
  })

  // useEffect en lugar de onSuccess: se ejecuta tanto con caché como con fetch nuevo
  useEffect(() => {
    if (!estadisticasData?.length) return
    const map: Record<string, StatRow> = {}
    estadisticasData.forEach(s => {
      map[s.participante_id] = {
        participante_id:    s.participante_id,
        nombre:             s.participantes?.nombre_completo ?? '',
        posicion:           s.participantes?.posicion ?? null,
        puntos:             s.puntos,
        asistencias:        s.asistencias,
        tarjetas_amarillas: s.tarjetas_amarillas,
        tarjetas_rojas:     s.tarjetas_rojas,
      }
    })
    setStatsRows(map)
  }, [estadisticasData])

  const jugadores = tab === 'local' ? jugadoresLocal : jugadoresVisitante
  const loading   = tab === 'local' ? loadingL : loadingV

  const slug      = encuentro.deportes?.slug ?? ''
  const sportCfg  = DEPORTE_CONFIG[slug] ?? DEFAULT_CONFIG
  const isPingPong = sportCfg.pingpongMode ?? false

  // Marcador auto-calculado para ping pong: gana quien tenga más sets en su enfrentamiento 1v1
  const ppScoreLocal = isPingPong
    ? jugadoresLocal.filter((j, i) => (statsRows[j.id]?.puntos ?? 0) > (statsRows[jugadoresVisitante[i]?.id]?.puntos ?? 0)).length
    : null
  const ppScoreVisitante = isPingPong
    ? jugadoresVisitante.filter((j, i) => (statsRows[j.id]?.puntos ?? 0) > (statsRows[jugadoresLocal[i]?.id]?.puntos ?? 0)).length
    : null

  function updateStat(jugadorId: string, field: keyof Omit<StatRow, 'participante_id' | 'nombre' | 'posicion'>, value: number) {
    setStatsRows(prev => ({
      ...prev,
      [jugadorId]: {
        ...{ participante_id: jugadorId, nombre: '', posicion: null, puntos: 0, asistencias: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0 },
        ...prev[jugadorId],
        [field]: Math.max(0, value),
      },
    }))
  }

  // ── Guardar resultado + estadísticas (acción única) ────────────────────
  async function handleGuardar() {
    // Validar que el partido ya haya comenzado
    if (encuentro.fecha_hora && new Date() < new Date(encuentro.fecha_hora)) {
      const fechaLegible = new Date(encuentro.fecha_hora).toLocaleString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      setError(`El partido aún no ha comenzado. Está programado para el ${fechaLegible}. Cambia la fecha del encuentro si deseas registrar resultados antes.`)
      return
    }

    let pl: number, pv: number

    if (isPingPong) {
      // Validar cada enfrentamiento 1v1: uno debe llegar a 3, el otro 0-2
      for (let i = 0; i < jugadoresLocal.length; i++) {
        const jL = jugadoresLocal[i]
        const jV = jugadoresVisitante[i]
        if (!jL || !jV) continue
        const sL = statsRows[jL.id]?.puntos ?? 0
        const sV = statsRows[jV.id]?.puntos ?? 0
        const valido = (sL === 3 && sV < 3) || (sV === 3 && sL < 3)
        if (!valido) {
          setError(
            `Partido ${i + 1} — ${jL.nombre_completo} vs ${jV.nombre_completo}: ` +
            `resultado inválido (${sL}-${sV}). Uno debe ganar exactamente 3 sets, el otro entre 0 y 2.`
          )
          return
        }
      }
      pl = ppScoreLocal!
      pv = ppScoreVisitante!
    } else {
      pl = parseInt(puntosLocal)
      pv = parseInt(puntosVisitante)
      if (isNaN(pl) || isNaN(pv) || pl < 0 || pv < 0) {
        setError('Ingresa puntajes válidos (números ≥ 0).')
        return
      }

      if (sportCfg.noEmpate && pl === pv) {
        setError('En básquet no puede haber empate. Revisa el marcador.')
        return
      }

      // Validar coherencia puntos individuales vs marcador
      const colConSuma = sportCfg.cols.find(c => c.sumDebeIgualMarcador)
      if (colConSuma) {
        const sumaLocal     = jugadoresLocal.reduce((s, j)     => s + (statsRows[j.id]?.[colConSuma.field] ?? 0), 0)
        const sumaVisitante = jugadoresVisitante.reduce((s, j) => s + (statsRows[j.id]?.[colConSuma.field] ?? 0), 0)
        const labelCol      = colConSuma.label.replace(/[^\w\s]/g, '').trim()
        if (sumaLocal !== pl) {
          setError(`${labelCol} del equipo local no coinciden. Marcador: ${pl}, suma jugadores: ${sumaLocal}.`)
          return
        }
        if (sumaVisitante !== pv) {
          setError(`${labelCol} del equipo visitante no coinciden. Marcador: ${pv}, suma jugadores: ${sumaVisitante}.`)
          return
        }
      }
    }

    setGuardando(true)
    setError(null)
    setSuccess(false)
    try {
      await upsertResultado({ encuentro_id: encuentro.id, puntos_local: pl, puntos_visitante: pv })

      if (estadoEncuentro !== 'finalizado') {
        await updateEncuentro(encuentro.id, { estado: 'finalizado' })
        setEstadoEncuentro('finalizado')
      }

      const todosJugadores = [...jugadoresLocal, ...jugadoresVisitante]
      if (todosJugadores.length > 0) {
        const payload = todosJugadores.map(j => ({
          encuentro_id:       encuentro.id,
          participante_id:    j.id,
          puntos:             statsRows[j.id]?.puntos             ?? 0,
          asistencias:        statsRows[j.id]?.asistencias        ?? 0,
          tarjetas_amarillas: statsRows[j.id]?.tarjetas_amarillas ?? 0,
          tarjetas_rojas:     statsRows[j.id]?.tarjetas_rojas     ?? 0,
        }))
        await guardarEstadisticasBulk(payload)
      }

      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      queryClient.invalidateQueries({ queryKey: ['resultado', encuentro.id] })
      queryClient.invalidateQueries({ queryKey: ['estadisticas', encuentro.id] })
      queryClient.invalidateQueries({ queryKey: ['clasificacion'] })
      setSuccess(true)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminarResultado() {
    setConfirmarElimResultado(false)
    setEliminandoResultado(true)
    setError(null)
    try {
      await deleteResultado(encuentro.id)
      setPuntosLocal('')
      setPuntosVisitante('')
      setSuccess(false)
      queryClient.invalidateQueries({ queryKey: ['encuentros'] })
      queryClient.invalidateQueries({ queryKey: ['resultado', encuentro.id] })
      queryClient.invalidateQueries({ queryKey: ['clasificacion'] })
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setEliminandoResultado(false)
    }
  }

  const paisL      = encuentro.equipo_local?.grados?.pais_asignado ?? null
  const paisV      = encuentro.equipo_visitante?.grados?.pais_asignado ?? null
  const codigoL   = paisL ? codigoMap[paisL] ?? null : null
  const codigoV   = paisV ? codigoMap[paisV] ?? null : null
  const gradoL    = encuentro.equipo_local?.grados?.nombre  ?? '—'
  const gradoV    = encuentro.equipo_visitante?.grados?.nombre ?? '—'
  const estadoCfg = ESTADO_CFG[estadoEncuentro] ?? ESTADO_CFG.programado

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-border shadow-2xl my-6 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-base flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Local */}
            <div className="flex items-center gap-2.5">
              <FlagImg codigo={codigoL} size="lg" />
              <div>
                <p className="text-[10px] text-muted font-medium">Local</p>
                <p className="text-sm font-bold text-text leading-tight">{gradoL}</p>
                {paisL && <p className="text-[10px] text-muted">{paisL}</p>}
              </div>
            </div>

            {/* Centro */}
            <div className="flex flex-col items-center flex-1">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${estadoCfg.cls}`}>
                {estadoCfg.label}
              </span>
              {encuentro.deportes && (
                <span className="text-[10px] text-muted mt-0.5">{encuentro.deportes.nombre}</span>
              )}
            </div>

            {/* Visitante */}
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <FlagImg codigo={codigoV} size="lg" />
              <div className="text-right">
                <p className="text-[10px] text-muted font-medium">Visitante</p>
                <p className="text-sm font-bold text-text leading-tight">{gradoV}</p>
                {paisV && <p className="text-[10px] text-muted">{paisV}</p>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted hover:text-text hover:bg-neutral-100 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Resultado ────────────────────────────────────────────────── */}
          {isAdmin && (
            <div className="bg-base rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-text">Resultado del Partido</h3>
                {resultadoExistente && (
                  <span className="text-[10px] font-bold bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full">
                    Ya registrado
                  </span>
                )}
                {isPingPong && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                    Calculado automáticamente
                  </span>
                )}
                {resultadoExistente && !confirmarElimResultado && (
                  <button
                    onClick={() => setConfirmarElimResultado(true)}
                    className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Eliminar resultado
                  </button>
                )}
              </div>

              {confirmarElimResultado && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-4 mb-4 space-y-3">
                  <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={15} />¿Eliminar el resultado registrado de este partido?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEliminarResultado}
                      disabled={eliminandoResultado}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-60"
                    >
                      {eliminandoResultado ? <Loader2 size={13} className="animate-spin" /> : null}
                      {eliminandoResultado ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button
                      onClick={() => setConfirmarElimResultado(false)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {isPingPong ? (
                <div className="flex items-center justify-center gap-10 py-2">
                  <div className="text-center">
                    <p className="text-[11px] text-muted mb-1">{gradoL} — Partidos ganados</p>
                    <p className="text-5xl font-black text-primary">{ppScoreLocal ?? 0}</p>
                  </div>
                  <span className="text-3xl font-black text-muted">–</span>
                  <div className="text-center">
                    <p className="text-[11px] text-muted mb-1">{gradoV} — Partidos ganados</p>
                    <p className="text-5xl font-black text-primary">{ppScoreVisitante ?? 0}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-muted block mb-1">
                      {gradoL} — {sportCfg.scoreLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={puntosLocal}
                      onChange={e => { setPuntosLocal(e.target.value.replace(/\D/g, '')); setSuccess(false) }}
                      onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                      placeholder="0"
                      className="w-full text-center text-2xl font-black text-text border border-border rounded-xl py-3 outline-none focus:border-primary transition-colors bg-surface"
                    />
                  </div>
                  <span className="text-2xl font-black text-muted mb-0 mt-5">–</span>
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-muted block mb-1">
                      {gradoV} — {sportCfg.scoreLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={puntosVisitante}
                      onChange={e => { setPuntosVisitante(e.target.value.replace(/\D/g, '')); setSuccess(false) }}
                      onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                      placeholder="0"
                      className="w-full text-center text-2xl font-black text-text border border-border rounded-xl py-3 outline-none focus:border-primary transition-colors bg-surface"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Estadísticas individuales ─────────────────────────────── */}
          {isAdmin && (
            <div className="bg-base rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                <Users size={15} className="text-primary" />
                <h3 className="text-sm font-bold text-text">
                  {isPingPong ? 'Enfrentamientos individuales' : 'Estadísticas por Jugador'}
                </h3>
                {isPingPong && (
                  <span className="text-[10px] text-muted ml-1">— Mejor de 5 sets (llegar a 3)</span>
                )}
              </div>

              {isPingPong ? (
                /* ── Tabla de enfrentamientos 1v1 (ping pong) ── */
                loadingL || loadingV ? (
                  <div className="flex items-center gap-3 py-8 justify-center text-muted">
                    <Loader2 size={15} className="animate-spin" /> Cargando jugadores...
                  </div>
                ) : jugadoresLocal.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">No hay jugadores registrados.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{gradoL}</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-primary">Sets</th>
                          <th className="text-center px-3 py-2.5 text-xs font-bold text-muted w-8">vs</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-primary">Sets</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted">{gradoV}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {jugadoresLocal.map((jL, i) => {
                          const jV  = jugadoresVisitante[i]
                          if (!jV) return null
                          const sL  = statsRows[jL.id]?.puntos ?? 0
                          const sV  = statsRows[jV.id]?.puntos  ?? 0
                          const ganL = sL > sV
                          const ganV = sV > sL
                          const invalido = sL > 0 || sV > 0
                            ? !((sL === 3 && sV < 3) || (sV === 3 && sL < 3))
                            : false
                          return (
                            <tr key={jL.id} className={`transition-colors ${invalido ? 'bg-red-50/50' : 'hover:bg-surface/60'}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {ganL && <span className="text-success font-black text-sm">✓</span>}
                                  <span className={`text-xs font-semibold ${ganL ? 'text-text' : ganV ? 'text-muted' : 'text-text'}`}>
                                    {jL.nombre_completo}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number" min="0" max="3" value={sL}
                                  onChange={e => updateStat(jL.id, 'puntos', Math.min(3, parseInt(e.target.value) || 0))}
                                  onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                                  className={`w-14 text-center text-sm font-black border rounded-lg py-1.5 px-1 outline-none transition-colors bg-surface ${
                                    ganL ? 'border-success text-success' : invalido ? 'border-red-400 text-red-500' : 'border-border text-text focus:border-primary'
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-3 text-center text-xs font-bold text-muted">vs</td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number" min="0" max="3" value={sV}
                                  onChange={e => updateStat(jV.id, 'puntos', Math.min(3, parseInt(e.target.value) || 0))}
                                  onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                                  className={`w-14 text-center text-sm font-black border rounded-lg py-1.5 px-1 outline-none transition-colors bg-surface ${
                                    ganV ? 'border-success text-success' : invalido ? 'border-red-400 text-red-500' : 'border-border text-text focus:border-primary'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className={`text-xs font-semibold ${ganV ? 'text-text' : ganL ? 'text-muted' : 'text-text'}`}>
                                    {jV.nombre_completo}
                                  </span>
                                  {ganV && <span className="text-success font-black text-sm">✓</span>}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-muted text-center py-2 border-t border-border">
                      Válido: 3-0 · 3-1 · 3-2 · 2-3 · 1-3 · 0-3 &nbsp;|&nbsp; Inválido: 3-3 · 2-2 · 4-1 · etc.
                    </p>
                  </div>
                )
              ) : (
                /* ── Tabs + tabla normal (otros deportes) ── */
                <>
                  <div className="flex border-b border-border">
                    {(['local', 'visitante'] as TabEquipo[]).map(t => {
                      const isLocal  = t === 'local'
                      const codigo   = isLocal ? codigoL : codigoV
                      const pais     = isLocal ? paisL : paisV
                      const active   = tab === t
                      const jugList  = isLocal ? jugadoresLocal : jugadoresVisitante
                      const colSuma  = sportCfg.cols.find(c => c.sumDebeIgualMarcador)
                      const sumaGoles  = colSuma ? jugList.reduce((s, j) => s + (statsRows[j.id]?.[colSuma.field] ?? 0), 0) : null
                      const marcador   = isLocal ? resultadoExistente?.puntos_local : resultadoExistente?.puntos_visitante
                      const coherente  = sumaGoles !== null && marcador !== undefined ? sumaGoles === marcador : null
                      return (
                        <button key={t} onClick={() => setTab(t)}
                          className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                            active ? 'border-b-2 border-primary bg-primary/5' : 'text-muted hover:text-text'
                          }`}
                        >
                          <FlagImg codigo={codigo} size="sm" />
                          <span className={active ? 'text-primary' : 'text-muted'}>
                            {pais ?? (isLocal ? 'Local' : 'Visitante')}
                          </span>
                          {sumaGoles !== null && marcador !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              coherente ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {sumaGoles}/{marcador} ⚽
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {loading ? (
                    <div className="flex items-center gap-3 py-8 justify-center text-muted">
                      <Loader2 size={15} className="animate-spin" /> Cargando jugadores...
                    </div>
                  ) : jugadores.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted">No hay jugadores registrados en este equipo.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-150">
                        <thead className="bg-surface border-b border-border">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Jugador</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Posición</th>
                            {sportCfg.cols.map(col => (
                              <th key={col.field} className="text-center px-3 py-2.5 text-xs font-semibold text-primary" title={col.label}>
                                {col.icon ? <StatIcon name={col.icon} /> : col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {jugadores.map(j => {
                            const row = statsRows[j.id]
                            return (
                              <tr key={j.id} className="hover:bg-surface/60 transition-colors">
                                <td className="px-4 py-2.5 text-xs font-semibold text-text">{j.nombre_completo}</td>
                                <td className="px-4 py-2.5 text-xs text-muted">
                                  <span className="bg-neutral-100 border border-neutral-200/50 px-2 py-0.5 rounded text-[10px] font-medium">
                                    {j.posicion || '—'}
                                  </span>
                                </td>
                                {sportCfg.cols.map(col => (
                                  <td key={col.field} className="px-3 py-2.5 text-center">
                                    <input
                                      type="number" min="0"
                                      value={row?.[col.field] ?? 0}
                                      onChange={e => updateStat(j.id, col.field, parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                      onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                                      className="w-14 text-center text-sm font-bold border border-border rounded-lg py-1 px-1 outline-none focus:border-primary transition-colors bg-surface text-text"
                                    />
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Botón único + feedback ────────────────────────────────── */}
          {isAdmin && (
            <div className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 px-3 py-2.5 rounded-lg">
                  <CheckCircle2 size={13} /> Partido guardado correctamente
                </div>
              )}
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-60"
              >
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {guardando ? 'Guardando...' : 'Guardar partido'}
              </button>
            </div>
          )}

          {/* Modo solo lectura para no-admin */}
          {!isAdmin && (
            <div className="space-y-5">
              {/* Marcador */}
              <div className="bg-base rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-text">Resultado</h3>
                  {resultadoExistente
                    ? <span className="text-[10px] font-bold bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full">Finalizado</span>
                    : <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">Sin resultado aún</span>
                  }
                </div>
                {resultadoExistente ? (
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-[11px] text-muted mb-1">{gradoL}</p>
                      <p className="text-5xl font-black text-text">{resultadoExistente.puntos_local}</p>
                    </div>
                    <span className="text-3xl font-black text-muted">–</span>
                    <div className="text-center">
                      <p className="text-[11px] text-muted mb-1">{gradoV}</p>
                      <p className="text-5xl font-black text-text">{resultadoExistente.puntos_visitante}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted py-4">El administrador aún no ha registrado el resultado.</p>
                )}
              </div>

              {/* Estadísticas por jugador (solo lectura) */}
              {estadisticasData && estadisticasData.length > 0 && (
                <div className="bg-base rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                    <Users size={15} className="text-primary" />
                    <h3 className="text-sm font-bold text-text">Estadísticas por Jugador</h3>
                  </div>

                  <div className="flex border-b border-border">
                    {(['local', 'visitante'] as TabEquipo[]).map(t => {
                      const isLocal = t === 'local'
                      const codigo  = isLocal ? codigoL : codigoV
                      const pais    = isLocal ? paisL : paisV
                      return (
                        <button key={t} onClick={() => setTab(t)}
                          className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                            tab === t ? 'border-b-2 border-primary bg-primary/5' : 'text-muted hover:text-text'
                          }`}
                        >
                          <FlagImg codigo={codigo} size="sm" />
                          <span className={tab === t ? 'text-primary' : 'text-muted'}>{pais ?? (isLocal ? 'Local' : 'Visitante')}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Jugador</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Posición</th>
                          {sportCfg.cols.map(col => (
                            <th key={col.field} className="text-center px-3 py-2.5 text-xs font-semibold text-primary" title={col.label}>
                              {col.icon ? <StatIcon name={col.icon} /> : col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(tab === 'local' ? jugadoresLocal : jugadoresVisitante).map(j => {
                          const row = statsRows[j.id]
                          return (
                            <tr key={j.id} className="hover:bg-surface/60 transition-colors">
                              <td className="px-4 py-2.5 text-xs font-semibold text-text">{j.nombre_completo}</td>
                              <td className="px-4 py-2.5 text-xs text-muted">
                                <span className="bg-neutral-100 border border-neutral-200/50 px-2 py-0.5 rounded text-[10px] font-medium">
                                  {j.posicion || '—'}
                                </span>
                              </td>
                              {sportCfg.cols.map(col => (
                                <td key={col.field} className="px-3 py-2.5 text-center text-sm font-bold text-text">
                                  {row?.[col.field] ?? 0}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────

export function ResultadosPage() {
  const { user } = useCurrentUser()
  const isAdmin = user?.rol === 'administrador'
  const navigate = useNavigate()

  const [deporteId, setDeporteId]         = useState('todos')
  const [estadoFiltro, setEstadoFiltro]   = useState('todos')
  const [encuentroSel, setEncuentroSel]   = useState<EncuentroDB | null>(null)

  const { data: gradosPaises = [] } = useQuery({
    queryKey: ['grados-paises'],
    queryFn: getGradosPaises,
    staleTime: 60 * 60 * 1000,
  })
  const codigoMap: Record<string, string> = {}
  gradosPaises.forEach(gp => { codigoMap[gp.pais] = gp.codigo })

  const { data: deportes = [] } = useQuery({
    queryKey: ['deportes'],
    queryFn: getDeportes,
    staleTime: 10 * 60 * 1000,
  })

  const deporteSeleccionado = deportes.find(d => d.id === deporteId)
  const esAtletismo = deporteSeleccionado?.slug === 'atletismo'

  // Resultados de atletismo por prueba para mostrar estado (con/sin resultado)
  const { data: atletismoResultados = [] } = useQuery({
    queryKey: ['atletismo-resultados-todos'],
    queryFn: () => getAtletismoResultados(),
    enabled: esAtletismo,
    staleTime: 30_000,
  })
  const pruebasConResultado = new Set(atletismoResultados.map(r => r.prueba))
  const pruebasFiltradas = PRUEBAS_ATLETISMO.filter(prueba => {
    const tieneResultado = pruebasConResultado.has(prueba)
    if (estadoFiltro === 'todos') return true
    if (estadoFiltro === 'finalizado') return tieneResultado
    return !tieneResultado
  })

  const { data: encuentros = [], isLoading } = useQuery<EncuentroDB[]>({
    queryKey: ['encuentros', deporteId, estadoFiltro],
    queryFn: () => getEncuentros({
      deporte_id: deporteId   !== 'todos' ? deporteId   : undefined,
      estado:     estadoFiltro !== 'todos' ? estadoFiltro : undefined,
    }),
    staleTime: 30_000,
  })

  return (
    <MainLayout
      title="Resultados y Estadísticas"
      subtitle={isAdmin ? "Registra los resultados y estadísticas individuales de cada encuentro" : "Consulta los marcadores y estadísticas de cada encuentro"}
    >
      {/* Panel del encuentro seleccionado */}
      {encuentroSel && (
        <PanelEncuentro
          encuentro={encuentroSel}
          isAdmin={isAdmin}
          onClose={() => setEncuentroSel(null)}
          codigoMap={codigoMap}
        />
      )}

      <div className="space-y-5">

        {/* Filtros */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted">Deporte</p>
            <div className="relative">
              <select
                value={deporteId}
                onChange={e => setDeporteId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-base border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-48"
              >
                <option value="todos">Todos los deportes</option>
                {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted">Estado</p>
            <div className="relative">
              <select
                value={estadoFiltro}
                onChange={e => setEstadoFiltro(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-base border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors min-w-40"
              >
                {ESTADOS_FILTRO.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="ml-auto text-xs text-muted">
            {esAtletismo
              ? `${pruebasFiltradas.length} prueba${pruebasFiltradas.length !== 1 ? 's' : ''}`
              : (isLoading ? 'Cargando...' : `${encuentros.length} encuentro${encuentros.length !== 1 ? 's' : ''}`)}
          </div>
        </div>

        {/* Vista atletismo */}
        {esAtletismo && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-sm font-semibold text-text">Pruebas de atletismo</p>
              </div>
              {pruebasFiltradas.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList size={32} className="mx-auto text-muted/30 mb-3" />
                  <p className="text-sm text-muted">No hay pruebas con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pruebasFiltradas.map(prueba => {
                    const tieneResultado = pruebasConResultado.has(prueba)
                    return (
                      <div key={prueba}>
                        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-base/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-text">{prueba}</p>
                            {tieneResultado
                              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Finalizado</span>
                              : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">Pendiente</span>
                            }
                          </div>
                          <button
                            onClick={() => navigate(`/atletismo?prueba=${encodeURIComponent(prueba)}`)}
                            className="px-4 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                          >
                            Gestionar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de encuentros */}
        {!esAtletismo && (<div className="bg-surface border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center gap-3 py-16 justify-center text-muted">
              <Loader2 size={20} className="animate-spin" /> Cargando encuentros...
            </div>
          ) : encuentros.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList size={32} className="mx-auto text-muted/30 mb-3" />
              <p className="text-sm text-muted">No hay encuentros con los filtros seleccionados.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-base border-b border-border">
                <tr>
                  {['Fecha', 'Local', 'Resultado', 'Visitante', 'Deporte', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {encuentros.map(enc => {
                  const fecha = enc.fecha_hora ? formatFecha(enc.fecha_hora) : null
                  const { dia, mes, hora } = fecha ?? { dia: '—', mes: '—', hora: '—' }
                  const resultado = enc.resultados?.[0] ?? null
                  const paisL2    = enc.equipo_local?.grados?.pais_asignado ?? null
                  const paisV2    = enc.equipo_visitante?.grados?.pais_asignado ?? null
                  const codigoL   = paisL2 ? codigoMap[paisL2] ?? null : null
                  const codigoV   = paisV2 ? codigoMap[paisV2] ?? null : null
                  const gradoL    = enc.equipo_local?.grados?.nombre  ?? '—'
                  const gradoV    = enc.equipo_visitante?.grados?.nombre ?? '—'
                  const cfg       = ESTADO_CFG[enc.estado] ?? ESTADO_CFG.programado

                  return (
                    <tr key={enc.id} className="hover:bg-base/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-text">{dia}</p>
                        <p className="text-xs text-muted">{mes} · {hora}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FlagImg codigo={codigoL} size="sm" />
                          <span className="text-xs font-bold text-text">{gradoL}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {resultado ? (
                          <span className="text-sm font-black text-text tabular-nums">
                            {resultado.puntos_local} — {resultado.puntos_visitante}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">vs</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FlagImg codigo={codigoV} size="sm" />
                          <span className="text-xs font-bold text-text">{gradoV}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted">{enc.deportes?.nombre ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEncuentroSel(enc)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
                        >
                          {isAdmin ? 'Gestionar' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>)}

      </div>
    </MainLayout>
  )
}