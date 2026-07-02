import { Deporte, DEPORTE_LABELS, DEPORTE_ICONS } from '../types';

interface SportsSelectorProps {
  selected: Deporte;
  onSelect: (deporte: Deporte) => void;
  cupos: Record<Deporte, { usados: number; total: number }>;
}

export function SportsSelector({
  selected,
  onSelect,
  cupos,
}: SportsSelectorProps) {
  const deportes: Deporte[] = [
    'futbol',
    'voley',
    'basquet',
    'pingpong',
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-outline-variant/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-surface-container-low border-b border-outline-variant/20">
        <h3 className="text-lg font-bold text-primary">
          Deportes
        </h3>

        <p className="text-sm text-on-surface-variant mt-1">
          Seleccione una disciplina deportiva
        </p>
      </div>

      {/* Lista */}
      <div className="p-3 flex flex-col gap-2">
        {deportes.map((deporte) => {
          const isSelected = selected === deporte;

          const usados = cupos[deporte].usados;
          const total = cupos[deporte].total;

          const porcentaje = (usados / total) * 100;

          return (
            <button
              key={deporte}
              type="button"
              onClick={() => onSelect(deporte)}
              className={`
                relative
                overflow-hidden
                rounded-2xl
                p-4
                transition-all
                duration-300
                border
                group
                text-left
                hover:-translate-y-1
                hover:shadow-md
                ${
                  isSelected
                    ? `
                      bg-secondary/10
                      border-secondary/20
                      ring-2
                      ring-secondary/20
                      shadow-sm
                    `
                    : `
                      bg-white
                      border-outline-variant/20
                      hover:bg-surface-container-low
                    `
                }
              `}
            >
              {/* Glow decorativo */}
              {isSelected && (
                <div
                  className="
                    absolute
                    inset-0
                    bg-linear-to-r
                    from-secondary/5
                    to-transparent
                    pointer-events-none
                  "
                />
              )}

              {/* Contenido */}
              <div className="relative flex items-center justify-between">
                {/* Icono + texto */}
                <div className="flex items-center">
                  <div
                    className={`
                      w-12
                      h-12
                      rounded-xl
                      flex
                      items-center
                      justify-center
                      mr-4
                      transition-all
                      ${
                        isSelected
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {DEPORTE_ICONS[deporte]}
                    </span>
                  </div>

                  <div>
                    <p
                      className={`
                        font-bold
                        text-sm
                        ${
                          isSelected
                            ? 'text-secondary'
                            : 'text-on-surface'
                        }
                      `}
                    >
                      {DEPORTE_LABELS[deporte]}
                    </p>

                    <p className="text-xs text-on-surface-variant mt-1">
                      {usados} inscritos de {total} cupos
                    </p>
                  </div>
                </div>

                {/* Badge */}
                <div
                  className={`
                    px-3
                    py-1.5
                    rounded-full
                    text-xs
                    font-bold
                    transition-all
                    ${
                      isSelected
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }
                  `}
                >
                  {usados}/{total}
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="relative mt-4">
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className={`
                      h-full
                      rounded-full
                      transition-all
                      duration-500
                      ${
                        porcentaje >= 100
                          ? 'bg-red-500'
                          : porcentaje >= 70
                          ? 'bg-yellow-500'
                          : 'bg-secondary'
                      }
                    `}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>

              {/* Indicador seleccionado */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    check_circle
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}