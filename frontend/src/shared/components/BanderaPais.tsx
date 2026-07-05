/**
 * Muestra la bandera de un país usando archivos png en /assets/icons/paises/.
 * El código ISO-2 se mapea al nombre del archivo correspondiente.
 * Si el archivo no existe, muestra el emoji como fallback.
 */

const CODE_TO_FILE: Record<string, string> = {
  br: 'brasil',
  ar: 'argentina',
  fr: 'francia',
  de: 'alemania',
  es: 'españa',
  it: 'italia',
  pt: 'portugal',
  uy: 'uruguay',
  co: 'colombia',
  cl: 'chile',
  pe: 'peru',
}

// Las vistas públicas reciben el nombre del país (pais_asignado), no el ISO-2
const NAME_TO_CODE: Record<string, string> = {
  brasil: 'br',
  argentina: 'ar',
  francia: 'fr',
  alemania: 'de',
  'españa': 'es',
  espana: 'es',
  italia: 'it',
  portugal: 'pt',
  uruguay: 'uy',
  colombia: 'co',
  chile: 'cl',
  'perú': 'pe',
  peru: 'pe',
}

function toCode(codigo: string): string | null {
  const lower = codigo.toLowerCase().trim()
  if (lower.length === 2) return lower
  return NAME_TO_CODE[lower] ?? null
}

const FLAGS = import.meta.glob('/src/assets/icons/paises/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function getSrc(codigo: string): string | null {
  const code = toCode(codigo)
  const name = code ? CODE_TO_FILE[code] : undefined
  if (!name) return null
  const key = `/src/assets/icons/paises/${name}.png`
  return FLAGS[key] ?? null
}

function flagEmoji(codigo: string): string {
  const code = toCode(codigo)
  if (!code) return '🏳️'
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  )
}

interface BanderaPaisProps {
  codigo: string          // ISO-2, ej: "BR", "PE"
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<string, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function BanderaPais({ codigo, className = '', size }: BanderaPaisProps) {
  const src = getSrc(codigo)

  const hasWidth = /\bw-/.test(className)
  const hasHeight = /\bh-/.test(className)
  const sizeCls = (hasWidth || hasHeight) ? '' : (SIZE[size || 'sm'] || '')

  const hasObjectFit = /\bobject-/.test(className)
  const objectCls = hasObjectFit ? '' : 'object-contain'

  const cls = `${sizeCls} rounded-sm ${objectCls} shrink-0 ${className}`

  if (src) {
    return <img src={src} alt={codigo} className={cls} />
  }

  // Fallback emoji mientras no haya webp
  return (
    <span
      className={`${sizeCls || SIZE[size || 'sm']} flex items-center justify-center text-base leading-none shrink-0 ${className}`}
    >
      {flagEmoji(codigo)}
    </span>
  )
}
