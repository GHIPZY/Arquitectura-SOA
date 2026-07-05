export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-300 ${className}`} />
}

/**
 * Filas fantasma genéricas para listas/tablas en carga.
 * avatar: círculo o cuadrado al inicio (foto, bandera, icono)
 * cols: cantidad de celdas cortas alineadas a la derecha
 */
export function SkeletonRows({
  rows = 5,
  avatar = false,
  cols = 3,
}: {
  rows?: number
  avatar?: boolean
  cols?: number
}) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {avatar && <Skeleton className="w-8 h-8 shrink-0" />}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 w-14" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
