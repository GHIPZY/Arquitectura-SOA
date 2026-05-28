import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/layouts/MainLayout'
import { Info, Pencil, Trash2, UserPlus, Users, ChevronDown, Dices, Loader2, Save } from 'lucide-react'
import { BanderaPais } from '@/shared/components/BanderaPais'
import { SorteoStage } from '@/shared/components/SorteoStage'
import { DadosAnimation } from '@/shared/components/DadosAnimation'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/shared/context/UserContext'

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const DEPORTES = [
  { key: 'futbol',    label: 'Fútbol',        emoji: '⚽', min: 11, max: 18 },
  { key: 'voley',     label: 'Vóley',         emoji: '🏐', min: 6,  max: 12 },
  { key: 'basquet',   label: 'Básquetbol',    emoji: '🏀', min: 8,  max: 15 },
  { key: 'atletismo', label: 'Atletismo',     emoji: '🏃', min: 1,  max: 6  },
  { key: 'pingpong',  label: 'Tenis de Mesa', emoji: '🏓', min: 2,  max: 4  },
]

const POSICIONES_POR_DEPORTE: Record<string, string[]> = {
  futbol:    ['Arquero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo', 'Mediocampista Defensivo', 'Mediocampista Central', 'Mediocampista Ofensivo', 'Extremo Derecho', 'Extremo Izquierdo', 'Delantero Centro', 'Segunda Punta'],
  voley:     ['Colocador', 'Opuesto', 'Central', 'Receptor Derecho', 'Receptor Izquierdo', 'Libero'],
  basquet:   ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
  atletismo: ['Velocista 100m', 'Velocista 200m', 'Velocista 400m', 'Fondista', 'Saltador de Altura', 'Saltador de Longitud', 'Lanzador', 'Marchista'],
  pingpong:  ['Jugador'],
}


const DEPORTE_ICONS = import.meta.glob('/src/assets/icons/deporte/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function getDeporteIcon(key: string): string | undefined {
  const fileMap: Record<string, string> = {
    futbol: 'futbol', voley: 'voley', basquet: 'basquet',
    atletismo: 'atletismo', pingpong: 'tenismesa',
  }
  return DEPORTE_ICONS[`/src/assets/icons/deporte/${fileMap[key]}.png`]
}

const API = {
  deportes:      '/api/deportes',
  equipos:       '/api/equipos',
  participantes: '/api/participantes',
}

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

type Jugador     = { id: string; nombre: string; dni: string; posicion: string }
type EquipoLocal = { deporteKey: string; equipoId: string | null; jugadores: Jugador[] }

type PageData = {
  paisAsignado:  { pais: string; codigo: string } | null
  institucionId: string | null
  deportesDB:    Record<string, string>   // deporteKey → UUID en BD
  equipos:       EquipoLocal[]
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function matchDeporteKey(nombre: string): string | null {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('futbol') || n.includes('football') || n.includes('soccer')) return 'futbol'
  if (n.includes('voley') || n.includes('volleyball'))                          return 'voley'
  if (n.includes('basquet') || n.includes('basketball'))                        return 'basquet'
  if (n.includes('atletismo') || n.includes('athletics'))                       return 'atletismo'
  if (n.includes('tenis') || n.includes('ping') || n.includes('mesa'))         return 'pingpong'
  return null
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
  }
}

// ─────────────────────────────────────────────
// Fetch principal (fuera del componente para estabilidad)
// ─────────────────────────────────────────────

async function fetchPageData(userId: string): Promise<PageData> {
  // 1. Institución del usuario
  const { data: usr } = await supabase
    .from('usuarios').select('institucion_id').eq('id', userId).single()
  if (!usr?.institucion_id) {
    return { paisAsignado: null, institucionId: null, deportesDB: {}, equipos: [] }
  }
  const instId = usr.institucion_id as string

  // 2. Todo en paralelo: país, deportes, equipos
  const hdr = await authHeaders()
  const [instRes, depsRes, equiposRes] = await Promise.all([
    supabase.from('instituciones').select('pais_asignado').eq('id', instId).single(),
    fetch(API.deportes + '/deportes', { headers: hdr }).then(r => r.ok ? r.json() : []).catch(() => []),
    supabase.from('equipos').select('id, deporte_id, deportes(nombre)').eq('institucion_id', instId),
  ])

  // País
  let paisAsignado: PageData['paisAsignado'] = null
  if (instRes.data?.pais_asignado) {
    const { data: gp } = await supabase
      .from('grados_paises').select('pais, codigo').eq('pais', instRes.data.pais_asignado).single()
    if (gp) paisAsignado = gp as { pais: string; codigo: string }
  }

  // Deportes map
  const deportesDB: Record<string, string> = {}
  ;(depsRes as { id: string; nombre: string }[]).forEach(d => {
    const key = matchDeporteKey(d.nombre)
    if (key) deportesDB[key] = d.id
  })

  // Equipos + participantes en paralelo
  const equiposData = equiposRes.data ?? []
  const equipos: EquipoLocal[] = await Promise.all(
    equiposData
      .map(async (eq: { id: string; deporte_id: string; deportes: unknown }) => {
        const dep = eq.deportes as { nombre: string } | null
        const key = matchDeporteKey(dep?.nombre ?? '')
        if (!key) return null

        const { data: parts } = await supabase
          .from('participantes')
          .select('id, nombre_completo, dni, posicion')
          .eq('equipo_id', eq.id)
          .eq('activo', true)
          .order('nombre_completo')

        const jugadores: Jugador[] = (parts ?? []).map((p: { id: string; nombre_completo: string; dni: string; posicion: string }) => ({
          id: p.id,
          nombre: p.nombre_completo,
          dni: p.dni ?? '',
          posicion: p.posicion ?? '',
        }))

        return { deporteKey: key, equipoId: eq.id, jugadores }
      })
  ).then(r => r.filter((e) => e !== null) as EquipoLocal[])

  return { paisAsignado, institucionId: instId, deportesDB, equipos }
}

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────

export function EquiposPage() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const queryKey = ['equipos-data', user?.id]

  const { data, isLoading } = useQuery<PageData>({
    queryKey,
    queryFn: () => fetchPageData(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Shorthand para actualizar el caché (persiste entre navegaciones)
  function patchData(patch: Partial<PageData>) {
    queryClient.setQueryData<PageData>(queryKey, old => old ? { ...old, ...patch } : old)
  }
  function patchEquipos(updater: (eq: EquipoLocal[]) => EquipoLocal[]) {
    queryClient.setQueryData<PageData>(queryKey, old =>
      old ? { ...old, equipos: updater(old.equipos) } : old
    )
  }

  const paisAsignado  = data?.paisAsignado  ?? null
  const institucionId = data?.institucionId ?? null
  const deportesDB    = data?.deportesDB    ?? {}
  const equipos       = data?.equipos       ?? []

  // ── Selección pendiente (local, no persiste hasta "Guardar") ──
  const [deportesPendientes, setDeportesPendientes] = useState<string[] | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true
      setDeportesPendientes(data.equipos.map(e => e.deporteKey))
    }
  }, [data])

  const deportesPend    = deportesPendientes ?? []
  const deportesEnBD    = equipos.map(e => e.deporteKey)
  const deportesAgregados  = deportesPend.filter(k => !deportesEnBD.includes(k))
  const deportesEliminados = deportesEnBD.filter(k => !deportesPend.includes(k))
  const hasCambios = deportesAgregados.length > 0 || deportesEliminados.length > 0

  // UI state (no necesita persistir)
  const [showRuleta, setShowRuleta] = useState(false)
  const [expandido, setExpandido]   = useState<string | null>(null)
  const [guardando, setGuardando]   = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)  // jugador id

  const [showForm, setShowForm]   = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nombre, setNombre]       = useState('')
  const [dni, setDni]             = useState('')
  const [posicion, setPosicion]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  // ── Sorteo ──────────────────────────────────
  function onPaisAsignado(pais: { pais: string; codigo: string; nombre: string }) {
    patchData({ paisAsignado: { pais: pais.pais, codigo: pais.codigo } })
    setShowRuleta(false)
  }

  // ── Selección de deporte (solo local, sin red) ──────────────
  function toggleDeporte(key: string) {
    if (!paisAsignado) { setShowRuleta(true); return }
    const yaSeleccionado = deportesPend.includes(key)
    setDeportesPendientes(yaSeleccionado
      ? deportesPend.filter(k => k !== key)
      : [...deportesPend, key]
    )
    if (!yaSeleccionado) setExpandido(key)
    else {
      if (expandido === key) setExpandido(null)
      if (showForm === key)  { resetForm(); setShowForm(null) }
    }
  }

  // ── Guardar selección de deportes ───────────
  async function guardarSeleccion() {
    if (!institucionId) return
    setGuardando(true)
    const hdr = await authHeaders()

    // Refrescar deportesDB si está vacío
    let currentDeportesDB = { ...deportesDB }
    if (Object.keys(currentDeportesDB).length === 0) {
      try {
        const res = await fetch(API.deportes + '/deportes', { headers: hdr })
        if (res.ok) {
          const deps = await res.json() as { id: string; nombre: string }[]
          currentDeportesDB = {}
          for (const d of deps) {
            const k = matchDeporteKey(d.nombre)
            if (k) currentDeportesDB[k] = d.id
          }
          patchData({ deportesDB: currentDeportesDB })
        }
      } catch { /* silencioso */ }
    }

    // Crear equipos nuevos
    for (const key of deportesAgregados) {
      const deporte = DEPORTES.find(d => d.key === key)!
      const deporteIdEnBD = currentDeportesDB[key]
      if (!deporteIdEnBD) continue
      try {
        const res = await fetch(API.equipos + '/equipos', {
          method: 'POST', headers: hdr,
          body: JSON.stringify({
            deporte_id:     deporteIdEnBD,
            institucion_id: institucionId,
            nombre_equipo:  `Equipo ${deporte.label} - ${user?.nombre ?? 'Institución'}`,
            estado:         'inscrito',
          }),
        })
        const json = await res.json()
        if (res.ok && json.id) {
          patchEquipos(old =>
            old.some(e => e.deporteKey === key)
              ? old
              : [...old, { deporteKey: key, equipoId: json.id, jugadores: [] }]
          )
        }
      } catch { /* silencioso */ }
    }

    // Eliminar equipos removidos
    for (const key of deportesEliminados) {
      const equipo = equipos.find(e => e.deporteKey === key)
      if (!equipo?.equipoId) {
        patchEquipos(old => old.filter(e => e.deporteKey !== key))
        continue
      }
      try {
        await fetch(`${API.equipos}/equipos/${equipo.equipoId}`, { method: 'DELETE', headers: hdr })
        patchEquipos(old => old.filter(e => e.deporteKey !== key))
      } catch { /* silencioso */ }
    }

    setGuardando(false)
  }

  function getEquipo(key: string): EquipoLocal {
    return equipos.find(e => e.deporteKey === key) ?? { deporteKey: key, equipoId: null, jugadores: [] }
  }

  // ── Form helpers ──────────────────────────────
  function resetForm() {
    setNombre(''); setDni(''); setPosicion(''); setEditingId(null); setFormError('')
  }
  function abrirFormNuevo(deporteKey: string) {
    resetForm()
    setPosicion(POSICIONES_POR_DEPORTE[deporteKey]?.[0] ?? '')
    setShowForm(deporteKey)
  }
  function iniciarEdicion(deporteKey: string, j: Jugador) {
    setEditingId(j.id); setNombre(j.nombre); setDni(j.dni); setPosicion(j.posicion)
    setFormError(''); setShowForm(deporteKey)
  }

  // ── Guardar jugador ───────────────────────────
  async function guardarJugador(deporteKey: string) {
    if (!nombre.trim())                   { setFormError('El nombre completo es requerido.'); return }
    if (!/^\d{8}$/.test(dni))             { setFormError('El DNI debe tener exactamente 8 dígitos.'); return }
    if (!posicion)                                 { setFormError('Selecciona una posición.'); return }

    setFormError(''); setSaving(true)
    const equipo = getEquipo(deporteKey)

    try {
      const headers = await authHeaders()

      if (editingId) {
        const res = await fetch(`${API.participantes}/participantes/${editingId}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ nombre_completo: nombre.trim(), dni, posicion }),
        })
        if (!res.ok) throw new Error((await res.json()).error)

        patchEquipos(old => old.map(e =>
          e.deporteKey !== deporteKey ? e : {
            ...e,
            jugadores: e.jugadores.map(j =>
              j.id === editingId ? { ...j, nombre: nombre.trim(), dni, posicion } : j
            ),
          }
        ))
      } else {
        if (!equipo.equipoId) { setFormError('No se pudo registrar el equipo. Deselecciona el deporte e inténtalo de nuevo.'); return }
        if (equipo.jugadores.some(j => j.dni === dni)) { setFormError('Ya existe un jugador con ese DNI.'); return }

        const res = await fetch(API.participantes + '/participantes', {
          method: 'POST', headers,
          body: JSON.stringify({ equipo_id: equipo.equipoId, nombre_completo: nombre.trim(), dni, posicion }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const { id } = await res.json()

        patchEquipos(old => old.map(e =>
          e.deporteKey !== deporteKey ? e : {
            ...e,
            jugadores: [...e.jugadores, { id, nombre: nombre.trim(), dni, posicion }],
          }
        ))
      }

      resetForm(); setShowForm(null)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar jugador ──────────────────────────
  async function eliminarJugador(deporteKey: string, id: string) {
    patchEquipos(old => old.map(e =>
      e.deporteKey !== deporteKey ? e : { ...e, jugadores: e.jugadores.filter(j => j.id !== id) }
    ))
    try {
      const headers = await authHeaders()
      await fetch(`${API.participantes}/participantes/${id}`, { method: 'DELETE', headers })
    } catch { /* silencioso */ }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <MainLayout
      title="Registro de Equipo y Participantes"
      subtitle="Selecciona los deportes y registra a los jugadores de tu grado"
    >
      {showRuleta && (
        <SorteoStage
          onClose={() => setShowRuleta(false)}
          onConfirm={onPaisAsignado}
          currentCountry={paisAsignado}
        />
      )}

      <div className="space-y-6">

        {/* BANNER país */}
        {isLoading ? (
          <div className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />
        ) : paisAsignado ? (
          <div className="bg-white rounded-2xl border border-neutral-200 py-6 px-7 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <BanderaPais codigo={paisAsignado.codigo} className="w-14 h-14 object-contain rounded-xl border border-neutral-200/60 shadow-sm bg-white p-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Representación Oficial</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-200/40">Confirmado ✓</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{paisAsignado.pais}</h3>
              </div>
            </div>
            <button onClick={() => setShowRuleta(true)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 px-4 py-3 rounded-xl shadow-sm">
              <Dices size={14} /> Ver Detalles del Sorteo
            </button>
          </div>
        ) : (
          <div onClick={() => setShowRuleta(true)}
            className="bg-white rounded-2xl border border-neutral-200 py-6 px-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm hover:shadow-md hover:border-amber-400/60 transition-all duration-300 cursor-pointer">
            <div className="flex items-start gap-5">
              <DadosAnimation className="w-20 h-20 flex-shrink-0 -mt-1.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Sorteo Pendiente</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Sorteo de País Oficial</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                  Debes realizar el sorteo antes de inscribir deportes.
                </p>
              </div>
            </div>
            <button className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer flex-shrink-0 shadow-[0_4px_12px_rgba(245,158,11,0.15)]">
              <Dices size={14} /> Sortear País
            </button>
          </div>
        )}

        {/* PASO 1 — Deportes */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">1. Selección de Deportes</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Marca las disciplinas en las que participará tu institución. Puedes inscribirte en múltiples disciplinas (se habilitará un formulario para cada una).
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-muted">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando datos…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {DEPORTES.map(d => {
                const activo = deportesPend.includes(d.key)
                const icon   = getDeporteIcon(d.key)
                return (
                  <button key={d.key} onClick={() => toggleDeporte(d.key)}
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer group text-center ${
                      activo ? 'border-primary bg-primary/[0.01] shadow-[0_4px_12px_rgba(30,58,138,0.04)]'
                             : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-sm'
                    }`}
                  >
                    {activo && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black">✓</span>
                      </div>
                    )}
                    <div className="w-16 h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      {icon ? <img src={icon} alt={d.label} className="w-14 h-14 object-contain" /> : <span className="text-3xl">{d.emoji}</span>}
                    </div>
                    <div>
                      <p className={`text-sm font-bold tracking-tight ${activo ? 'text-primary' : 'text-slate-800'}`}>{d.label}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Mín: {d.min} · Máx: {d.max}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* La información de inscripción se integró directamente en el subtítulo superior para un diseño más limpio */}

          {/* Footer de guardar selección */}
          {hasCambios && (
            <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-end gap-4 animate-[fadeIn_300ms_ease-out]">
              <div className="flex items-center gap-2 text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium">Tienes cambios sin guardar en la selección de deportes.</span>
              </div>
              <button
                onClick={guardarSeleccion}
                disabled={guardando}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer"
              >
                {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {guardando ? 'Guardando…' : 'Guardar selección'}
              </button>
            </div>
          )}
        </div>

        {/* PASO 2 — Equipos e integrantes */}
        {deportesPend.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text">2. Equipos e integrantes</h2>

            {deportesPend.map((key: string) => {
              const deporte  = DEPORTES.find(d => d.key === key)!
              const equipo   = getEquipo(key)
              const abierto  = expandido === key
              const { jugadores } = equipo
              const valido   = jugadores.length >= deporte.min && jugadores.length <= deporte.max
              const posicionesDeporte = POSICIONES_POR_DEPORTE[key] ?? []

              return (
                <div key={key} className="bg-surface rounded-xl border border-border overflow-hidden">

                  {/* Cabecera */}
                  <button onClick={() => setExpandido(abierto ? null : key)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-base/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      {paisAsignado
                        ? <BanderaPais codigo={paisAsignado.codigo} size="md" className="rounded border border-neutral-200/60 bg-white p-0.5" />
                        : <span className="text-2xl">🏳️</span>}
                      <div className="text-left">
                        <div className="flex items-center gap-2.5">
                          {getDeporteIcon(key)
                            ? <img src={getDeporteIcon(key)} alt={deporte.label} className="w-5 h-5 object-contain flex-shrink-0" />
                            : <span className="text-base">{deporte.emoji}</span>}
                          <p className="text-sm font-extrabold text-slate-800 tracking-tight">
                            {deporte.label}
                            <span className="ml-2 text-xs font-semibold text-neutral-400">({jugadores.length} / {deporte.max})</span>
                          </p>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {paisAsignado ? `Representando a ${paisAsignado.pais}` : 'País pendiente'} · {user?.nombre ?? 'Mi grado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${valido ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className="text-xs font-bold text-slate-600">{valido ? 'Listo' : 'En formación'}</span>
                      </div>
                      <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Panel expandible */}
                  {abierto && (
                    <div className="border-t border-border px-5 pb-5 pt-4">

                      {/* Estado vacío / Aviso de guardado */}
                      {jugadores.length === 0 && showForm !== key ? (
                        <div className="text-center py-10 px-4 border border-dashed border-neutral-200 rounded-xl mb-4 bg-neutral-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="text-neutral-300 w-7 h-7" />
                            <p className="text-xs font-bold text-slate-800">Aún no hay jugadores registrados</p>
                            {!equipo.equipoId ? (
                              <p className="text-[11px] text-neutral-400 max-w-xs leading-normal">
                                Guarda la selección de deportes en el paso anterior para habilitar el registro de jugadores.
                              </p>
                            ) : (
                              <p className="text-[11px] text-neutral-400 max-w-xs leading-normal">
                                Haz clic en el botón de abajo para registrar el primer integrante.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : jugadores.length > 0 ? (
                        <div className="border border-border rounded-lg overflow-hidden mb-3">
                          <table className="w-full">
                            <thead className="bg-base">
                              <tr className="border-b border-border">
                                {['#', 'Nombre Completo', 'DNI', 'Posición', 'Acciones'].map(h => (
                                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {jugadores.map((j, i) => (
                                <tr key={j.id} className={`transition-colors ${editingId === j.id ? 'bg-primary/5' : 'hover:bg-base/50'}`}>
                                  <td className="px-4 py-2.5 text-xs text-muted">{i + 1}</td>
                                  <td className="px-4 py-2.5 text-sm font-medium text-text">{j.nombre}</td>
                                  <td className="px-4 py-2.5 text-sm text-muted font-mono tracking-wide">{j.dni}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100/70 border border-slate-200/40 px-2.5 py-0.5 rounded-md">
                                      {j.posicion || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {confirmDelete === j.id ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-600 font-medium">¿Eliminar?</span>
                                        <button onClick={() => { eliminarJugador(key, j.id); setConfirmDelete(null) }}
                                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer">
                                          Sí
                                        </button>
                                        <button onClick={() => setConfirmDelete(null)}
                                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer">
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => iniciarEdicion(key, j)} title="Editar"
                                          className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer">
                                          <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setConfirmDelete(j.id)} title="Eliminar"
                                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {/* Formulario */}
                      {showForm === key && (
                        <div className="border border-border rounded-lg p-4 bg-base mb-3">
                          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">
                            {editingId ? 'Editar jugador' : 'Nuevo jugador'}
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-medium text-muted block mb-1">Nombre completo</label>
                              <input value={nombre}
                                onChange={e => setNombre(e.target.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]/g, ''))}
                                placeholder="Ej: Carlos Mendoza"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors bg-surface" />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted block mb-1">DNI</label>
                              <input
                                value={dni}
                                onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                disabled={false}
                                placeholder="8 dígitos"
                                maxLength={8}
                                inputMode="numeric"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted block mb-1">Posición</label>
                              <select value={posicion} onChange={e => setPosicion(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text outline-none focus:border-primary transition-colors bg-surface">
                                {posicionesDeporte.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </div>

                          {formError && (
                            <p className="mt-2 text-xs text-accent flex items-center gap-1.5">
                              <Info size={12} /> {formError}
                            </p>
                          )}

                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { resetForm(); setShowForm(null) }}
                              className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-text transition-colors cursor-pointer">
                              Cancelar
                            </button>
                            <button onClick={() => guardarJugador(key)} disabled={saving}
                              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2">
                              {saving && <Loader2 size={13} className="animate-spin" />}
                              {editingId ? 'Guardar cambios' : 'Guardar jugador'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botón agregar */}
                      {showForm !== key && (
                        <button onClick={() => abrirFormNuevo(key)} disabled={!equipo.equipoId || jugadores.length >= deporte.max}
                          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                          <UserPlus size={15} /> Agregar jugador
                        </button>
                      )}

                      {/* Requisitos de cantidad de jugadores */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 text-neutral-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${jugadores.length < deporte.min ? 'bg-amber-500' : 'bg-green-500'}`} />
                          <span className="text-[11px] font-medium">Requisito de la disciplina: Mínimo {deporte.min} y Máximo {deporte.max} jugadores.</span>
                        </div>
                        <span className={`text-[11px] font-bold ${
                          jugadores.length < deporte.min ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          Registrados: {jugadores.length} de {deporte.max}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
