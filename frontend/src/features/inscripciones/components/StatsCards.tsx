interface StatsCardsProps {
  totalEquipos: number;
  variationEquipos: string;
  totalJugadores: number;
  variationJugadores: string;
  pagosValidados: string;
  diasInicio: number;
}

export function StatsCards({
  totalEquipos,
  variationEquipos,
  totalJugadores,
  variationJugadores,
  pagosValidados,
  diasInicio,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Equipos',
      value: totalEquipos,
      variation: variationEquipos,
      icon: 'groups',
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
      badge: 'text-green-700 bg-green-100',
    },
    {
      title: 'Jugadores Registrados',
      value: totalJugadores,
      variation: variationJugadores,
      icon: 'person',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'text-green-700 bg-green-100',
    },
    {
      title: 'Pagos Validados',
      value: pagosValidados,
      variation: 'Pendientes',
      icon: 'payments',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-700',
      badge: 'text-yellow-700 bg-yellow-100',
    },
    {
      title: 'Días para el Inicio',
      value: diasInicio,
      variation: 'Alerta',
      icon: 'schedule',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badge: 'text-red-600 bg-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="
            relative
            overflow-hidden
            bg-white
            rounded-2xl
            border
            border-outline-variant/20
            shadow-sm
            p-6
            transition-all
            duration-300
            hover:-translate-y-1
            hover:shadow-lg
            group
          "
        >
          {/* Glow decorativo */}
          <div
            className="
              absolute
              inset-0
              opacity-0
              group-hover:opacity-100
              transition-opacity
              duration-300
              bg-linear-to-br
              from-secondary/5
              to-transparent
              pointer-events-none
            "
          />

          {/* Header */}
          <div className="relative flex items-start justify-between">
            {/* Icono */}
            <div
              className={`
                w-14
                h-14
                rounded-2xl
                flex
                items-center
                justify-center
                ${stat.iconBg}
              `}
            >
              <span
                className={`
                  material-symbols-outlined
                  text-2xl
                  ${stat.iconColor}
                `}
              >
                {stat.icon}
              </span>
            </div>

            {/* Badge */}
            <span
              className={`
                px-3
                py-1
                rounded-full
                text-[11px]
                font-bold
                ${stat.badge}
              `}
            >
              {stat.variation}
            </span>
          </div>

          {/* Contenido */}
          <div className="relative mt-5">
            <p className="text-sm font-medium text-on-surface-variant">
              {stat.title}
            </p>

            <div className="flex items-end justify-between mt-2">
              <h2 className="text-4xl font-bold text-primary tracking-tight">
                {stat.value}
              </h2>

              <div className="flex items-center text-green-600 text-sm font-semibold">
                <span className="material-symbols-outlined text-base mr-1">
                  trending_up
                </span>

                {stat.title !== 'Pagos Validados' &&
                  stat.title !== 'Días para el Inicio' &&
                  stat.variation}
              </div>
            </div>
          </div>

          {/* Línea decorativa inferior */}
          <div
            className="
              absolute
              bottom-0
              left-0
              w-full
              h-1
              bg-linear-to-r
              from-secondary
              to-primary
              opacity-70
            "
          />
        </div>
      ))}
    </div>
  );
}