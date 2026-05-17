const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '#' },
  { icon: 'how_to_reg', label: 'Inscripciones', href: '#', active: true },
  { icon: 'groups', label: 'Equipos', href: '#' },
  { icon: 'sports_soccer', label: 'Partidos', href: '#' },
  { icon: 'leaderboard', label: 'Resultados', href: '#' },
  { icon: 'table_chart', label: 'Tabla', href: '#' },
  { icon: 'insights', label: 'Estadísticas', href: '#' },
];

const bottomNavItems = [
  { icon: 'settings', label: 'Configuración', href: '#' },
  { icon: 'logout', label: 'Cerrar Sesión', href: '#' },
];

export function Sidebar() {
  return (
    <aside
      className="
        fixed
        left-0
        top-0
        z-40
        w-64
        h-screen
        flex
        flex-col
        bg-primary-container
        border-r
        border-outline-variant/20
        shadow-xl
        backdrop-blur-xl
      "
    >
      {/* Logo */}
      <div className="px-6 py-8 border-b border-outline-variant/10">
        <div className="flex items-center">
          <div
            className="
              w-12
              h-12
              rounded-2xl
              bg-secondary
              text-on-secondary
              flex
              items-center
              justify-center
              shadow-md
              mr-4
            "
          >
            <span className="material-symbols-outlined text-2xl">
              emoji_events
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-on-primary">
              Olimpiadas Perú
            </h1>

            <p className="text-sm text-on-primary-container opacity-70">
              Admin Console
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`
                group
                relative
                flex
                items-center
                px-4
                py-3
                rounded-2xl
                transition-all
                duration-300
                overflow-hidden
                ${
                  item.active
                    ? `
                      bg-secondary
                      text-on-secondary
                      shadow-md
                    `
                    : `
                      text-on-primary-container
                      hover:bg-on-primary-container/10
                      hover:text-on-primary
                    `
                }
              `}
            >
              {/* Indicador lateral */}
              {item.active && (
                <div
                  className="
                    absolute
                    left-0
                    top-2
                    bottom-2
                    w-1
                    rounded-r-full
                    bg-white
                  "
                />
              )}

              {/* Icono */}
              <span
                className="
                  material-symbols-outlined
                  text-[22px]
                  mr-4
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                {item.icon}
              </span>

              {/* Texto */}
              <span className="font-medium text-sm">
                {item.label}
              </span>
            </a>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="mt-6 pt-6 border-t border-outline-variant/10 space-y-1">
          {bottomNavItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="
                flex
                items-center
                px-4
                py-3
                rounded-2xl
                text-on-primary-container
                transition-all
                duration-300
                hover:bg-on-primary-container/10
                hover:text-on-primary
                group
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[22px]
                  mr-4
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                {item.icon}
              </span>

              <span className="font-medium text-sm">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-outline-variant/10">
        <button
          className="
            w-full
            py-4
            rounded-2xl
            bg-secondary
            text-on-secondary
            font-bold
            shadow-lg
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:shadow-xl
            active:scale-95
          "
        >
          Ruleta de Países
        </button>

        {/* Usuario */}
        <div className="mt-4 flex items-center px-2">
          <div
            className="
              w-10
              h-10
              rounded-full
              bg-secondary-container
              flex
              items-center
              justify-center
              font-bold
              text-on-secondary-container
              mr-3
            "
          >
            PB
          </div>

          <div>
            <p className="text-sm font-semibold text-on-primary">
              Pierre
            </p>

            <p className="text-xs text-on-primary-container opacity-70">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}