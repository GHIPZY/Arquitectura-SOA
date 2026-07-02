import { Pais } from "../types";

interface CountriesListProps {
  paises: Pais[];
  selectedPais: string | null;
  onSelect: (pais: string) => void;
  onNewPais: () => void;
  titulo: string;
}

export function CountriesList({
  paises,
  selectedPais,
  onSelect,
  onNewPais,
  titulo,
}: CountriesListProps) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg text-primary">
          {titulo}
        </h3>

        <button
          className="
            flex items-center
            text-sm
            font-semibold
            text-secondary
            px-3
            py-1.5
            rounded-full
            transition-all
            duration-300
            hover:bg-secondary/10
            hover:text-primary
          "
        >
          Ver todos
          <span className="material-symbols-outlined text-base ml-1">
            chevron_right
          </span>
        </button>
      </div>

      {/* Lista */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {paises.map((pais) => {
          const isSelected = selectedPais === pais.nombre;

          return (
            <div
              key={pais.nombre}
              onClick={() => onSelect(pais.nombre)}
              className={`
                shrink-0
                w-52
                p-4
                rounded-2xl
                cursor-pointer
                transition-all
                duration-300
                border
                hover:-translate-y-1
                hover:shadow-lg
                ${
                  isSelected
                    ? `
                      bg-secondary/10
                      border-secondary/30
                      ring-2
                      ring-secondary/30
                      shadow-md
                      scale-[1.02]
                    `
                    : `
                      bg-surface
                      border-outline-variant/30
                      hover:bg-surface-container-low
                    `
                }
              `}
            >
              {/* Sede */}
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.2em]
                  text-on-surface-variant
                "
              >
                {pais.sede}
              </p>

              {/* País */}
              <div className="flex items-center mt-2">
                <span className="text-2xl mr-2">
                  {pais.bandera}
                </span>

                <p className="font-bold text-on-surface truncate">
                  {pais.nombre}
                </p>
              </div>

              {/* Jugadores */}
              <div className="mt-4 flex items-center justify-between">
                <div
                  className="
                    flex items-center
                    text-xs
                    text-on-surface-variant
                  "
                >
                  <span className="material-symbols-outlined text-sm mr-1">
                    person
                  </span>

                  {pais.jugadores} jugadores
                </div>

                {isSelected && (
                  <span
                    className="
                      material-symbols-outlined
                      text-secondary
                      text-lg
                    "
                  >
                    check_circle
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Nuevo País */}
        <div
          onClick={onNewPais}
          className="
            shrink-0
            w-44
            rounded-2xl
            border-2
            border-dashed
            border-outline-variant
            flex
            items-center
            justify-center
            cursor-pointer
            transition-all
            duration-300
            hover:bg-secondary/5
            hover:border-secondary
            hover:-translate-y-1
          "
        >
          <div className="text-center">
            <div
              className="
                w-12
                h-12
                mx-auto
                rounded-full
                bg-secondary/10
                flex
                items-center
                justify-center
              "
            >
              <span className="material-symbols-outlined text-secondary">
                add
              </span>
            </div>

            <p className="text-sm font-semibold text-on-surface mt-3">
              Nuevo País
            </p>

            <p className="text-xs text-on-surface-variant mt-1">
              Agregar selección
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}