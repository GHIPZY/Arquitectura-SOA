interface AlertBannerProps {
  diasRestantes: number;
}

export function AlertBanner({ diasRestantes }: AlertBannerProps) {
  return (
    <div className="
      bg-error-container
      border border-error/20
      rounded-2xl
      p-4
      shadow-md
      flex items-start gap-3
      transition-all duration-300
      hover:scale-[1.01]
    ">
      <div className="bg-error/10 p-2 rounded-full">
        <span className="material-symbols-outlined text-error text-xl">
          warning
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-on-error-container">
          Cierre de Inscripciones
        </h3>

        <p className="
          text-sm
          text-on-error-container/80
          mt-1
          leading-relaxed
        ">
          Faltan solo <strong>{diasRestantes} días</strong> para el cierre del
          registro de jugadores de Fútbol. Asegúrese de completar todos los
          campos obligatorios.
        </p>
      </div>
    </div>
  );
}