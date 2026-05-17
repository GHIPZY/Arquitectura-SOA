const navLinks = [
  { label: 'Dashboard', href: '#' },
  { label: 'Inscripciones', href: '#', active: true },
  { label: 'Equipos', href: '#' },
];

export function TopBar() {
  return (
    <header
      className="
        sticky
        top-0
        z-30
        w-full
        border-b
        border-outline-variant/10
        bg-surface/80
        backdrop-blur-xl
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          px-6
          py-4
        "
      >
        {/* IZQUIERDA */}
        <div className="flex items-center gap-8">
          {/* Navegación */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`
                  relative
                  px-4
                  py-2
                  rounded-xl
                  text-sm
                  font-semibold
                  transition-all
                  duration-300
                  ${
                    link.active
                      ? `
                        bg-secondary/10
                        text-secondary
                      `
                      : `
                        text-on-surface-variant
                        hover:text-on-surface
                        hover:bg-surface-container-low
                      `
                  }
                `}
              >
                {link.label}

                {/* Línea activa */}
                {link.active && (
                  <div
                    className="
                      absolute
                      left-3
                      right-3
                      -bottom-1
                      h-0.5
                      rounded-full
                      bg-secondary
                    "
                  />
                )}
              </a>
            ))}
          </nav>
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-3">
          {/* Buscador */}
          <div className="relative hidden lg:block">
            <span
              className="
                material-symbols-outlined
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-on-surface-variant
                text-[20px]
              "
            >
              search
            </span>

            <input
              type="text"
              placeholder="Buscar equipos, jugadores..."
              className="
                w-72
                pl-12
                pr-4
                py-3
                rounded-2xl
                border
                border-outline-variant/20
                bg-surface-container-low
                text-sm
                transition-all
                duration-300
                outline-none
                focus:ring-4
                focus:ring-secondary/10
                focus:border-secondary/20
                focus:bg-white
              "
            />
          </div>

          {/* Notificaciones */}
          <button
            className="
              relative
              w-11
              h-11
              rounded-2xl
              flex
              items-center
              justify-center
              bg-surface-container-low
              hover:bg-secondary/10
              transition-all
              duration-300
              group
            "
          >
            <span
              className="
                material-symbols-outlined
                text-on-surface-variant
                group-hover:text-secondary
              "
            >
              notifications
            </span>

            {/* Indicador */}
            <span
              className="
                absolute
                top-2
                right-2
                w-2.5
                h-2.5
                rounded-full
                bg-red-500
              "
            />
          </button>

          {/* Calendario */}
          <button
            className="
              w-11
              h-11
              rounded-2xl
              flex
              items-center
              justify-center
              bg-surface-container-low
              hover:bg-secondary/10
              transition-all
              duration-300
              group
            "
          >
            <span
              className="
                material-symbols-outlined
                text-on-surface-variant
                group-hover:text-secondary
              "
            >
              calendar_today
            </span>
          </button>

          {/* Usuario */}
          <button
            className="
              flex
              items-center
              gap-3
              pl-2
              pr-3
              py-2
              rounded-2xl
              hover:bg-surface-container-low
              transition-all
              duration-300
            "
          >
            {/* Avatar */}
            <div
              className="
                w-11
                h-11
                rounded-full
                overflow-hidden
                border-2
                border-secondary/20
                shadow-sm
              "
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvoJ1l8yeR8JolEnkH3MWEcATdUpe73pCjw3bNdxwU-F9G2H4_AEbtjEMLE73QgT4blqMl3GTCfvss08jrxsEBo6Fu0UQe6DTGvc6MjQ5WES-8JGjNPTbtqEHEZ1T4lgLo43oOhrb2SEMYcWxNDIdtwvTD8uRwL6ZJeERUqbZTCG1VCRqPJPCQJyZh8OlXhqAk7D9g1l5V4cGAWS0P8WGIpqnEkdv2h_vO9nX7zo7EjhxFZMzbydhMs9nQm4g7MgRH_3DhpFUvYX0"
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="hidden xl:block text-left">
              <p className="text-sm font-semibold text-on-surface">
                Pierre Bustamante
              </p>

              <p className="text-xs text-on-surface-variant">
                Administrador
              </p>
            </div>

            <span
              className="
                hidden
                xl:block
                material-symbols-outlined
                text-on-surface-variant
                text-[20px]
              "
            >
              expand_more
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}