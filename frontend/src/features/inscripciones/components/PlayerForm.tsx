import { useState } from 'react';
import { Deportista, DEPORTE_LIMITE_JUGADORES, Deporte } from '../types';

interface PlayerFormProps {
  paisSeleccionado: string;
  deporte: Deporte;
  deportistas: Deportista[];
  onAgregar: (jugador: Omit<Deportista, 'id' | 'equipoId' | 'activo'>) => void;
  onEliminar: (id: string) => void;
  onEditar: (jugador: Deportista) => void;
}

export function PlayerForm({
  paisSeleccionado,
  deporte,
  deportistas,
  onAgregar,
  onEliminar,
  onEditar,
}: PlayerFormProps) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [tallaCamiseta, setTallaCamiseta] = useState<'S' | 'M' | 'L' | 'XL'>('M');

  const limite = DEPORTE_LIMITE_JUGADORES[deporte];
  const disponibles = limite - deportistas.length;

  const dniValido = /^\d{8}$/.test(dni);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) return;
    if (!dniValido) return;
    if (disponibles <= 0) return;

    const dniDuplicado = deportistas.some((j) => j.dni === dni);

    if (dniDuplicado) {
      alert('El DNI ya está registrado.');
      return;
    }

    onAgregar({
      nombre: nombre.trim(),
      dni,
      sexo,
      tallaCamiseta,
    });

    setNombre('');
    setDni('');
    setSexo('M');
    setTallaCamiseta('M');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-outline-variant/20 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-surface-container-low border-b border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">
            Formulario de Jugadores
          </h3>

          <p className="text-sm text-on-surface-variant mt-1">
            País seleccionado:{' '}
            <span className="font-semibold text-secondary">
              {paisSeleccionado}
            </span>
          </p>
        </div>

        <div
          className={`
            flex items-center
            px-4 py-2
            rounded-full
            text-xs
            font-bold
            shadow-sm
            ${
              disponibles > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }
          `}
        >
          <span
            className={`
              w-2 h-2 rounded-full mr-2
              ${disponibles > 0 ? 'bg-green-500' : 'bg-red-500'}
            `}
          />

          Cupos Disponibles:
          <span className="ml-1">
            {disponibles.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Formulario */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Nombre Completo
              </label>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-sm">
                  person
                </span>

                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={disponibles <= 0}
                  className="
                    w-full
                    pl-10
                    pr-4
                    py-3
                    rounded-xl
                    border
                    border-outline-variant
                    bg-white
                    transition-all
                    focus:outline-none
                    focus:ring-2
                    focus:ring-secondary/20
                    focus:border-secondary
                    focus:shadow-md
                  "
                />
              </div>
            </div>

            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                DNI
              </label>

              <input
                type="text"
                placeholder="8 dígitos"
                value={dni}
                maxLength={8}
                disabled={disponibles <= 0}
                onChange={(e) =>
                  setDni(e.target.value.replace(/\D/g, ''))
                }
                className={`
                  w-full
                  px-4
                  py-3
                  rounded-xl
                  border
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:shadow-md
                  ${
                    dni.length > 0 && !dniValido
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-outline-variant focus:ring-secondary/20 focus:border-secondary'
                  }
                `}
              />

              {dni.length > 0 && !dniValido && (
                <p className="text-xs text-red-500 mt-1">
                  El DNI debe tener 8 números.
                </p>
              )}
            </div>

            {/* Sexo */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Sexo
              </label>

              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as 'M' | 'F')}
                disabled={disponibles <= 0}
                className="
                  w-full
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-white
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:ring-secondary/20
                  focus:border-secondary
                "
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            {/* Talla */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Talla
              </label>

              <select
                value={tallaCamiseta}
                onChange={(e) =>
                  setTallaCamiseta(
                    e.target.value as 'S' | 'M' | 'L' | 'XL'
                  )
                }
                disabled={disponibles <= 0}
                className="
                  w-full
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-outline-variant
                  bg-white
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:ring-secondary/20
                  focus:border-secondary
                "
              >
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>

            {/* Botón */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  disponibles <= 0 ||
                  !nombre.trim() ||
                  !dniValido
                }
                className="
                  w-full
                  py-3
                  rounded-xl
                  bg-secondary
                  text-on-secondary
                  font-bold
                  shadow-md
                  transition-all
                  duration-300
                  hover:scale-[1.02]
                  hover:shadow-lg
                  active:scale-95
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                Agregar
              </button>
            </div>
          </div>
        </form>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  Nombre
                </th>

                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  DNI
                </th>

                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  Sexo
                </th>

                <th className="px-4 py-4 text-center text-xs uppercase tracking-wider text-on-surface-variant">
                  Talla
                </th>

                <th className="px-4 py-4 text-right text-xs uppercase tracking-wider text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {deportistas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-on-surface-variant"
                  >
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-4xl opacity-40 mb-2">
                        groups
                      </span>

                      No hay jugadores registrados
                    </div>
                  </td>
                </tr>
              ) : (
                deportistas.map((jugador) => (
                  <tr
                    key={jugador.id}
                    className="
                      border-t
                      border-outline-variant/10
                      hover:bg-surface-container-low
                      transition-colors
                    "
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div
                          className="
                            w-10
                            h-10
                            rounded-full
                            bg-secondary-container
                            text-on-secondary-container
                            flex
                            items-center
                            justify-center
                            font-bold
                            text-sm
                            mr-3
                          "
                        >
                          {getInitials(jugador.nombre)}
                        </div>

                        <span className="font-semibold">
                          {jugador.nombre}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {jugador.dni}
                    </td>

                    <td className="px-4 py-4">
                      {jugador.sexo === 'M'
                        ? 'Masculino'
                        : 'Femenino'}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className="
                          px-3
                          py-1
                          rounded-full
                          bg-surface-container-highest
                          text-xs
                          font-bold
                        "
                      >
                        {jugador.tallaCamiseta}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onEditar(jugador)}
                        className="
                          p-2
                          rounded-lg
                          hover:bg-secondary/10
                          hover:text-secondary
                          transition-all
                        "
                      >
                        <span className="material-symbols-outlined text-lg">
                          edit
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEliminar(jugador.id)}
                        className="
                          p-2
                          rounded-lg
                          hover:bg-red-100
                          hover:text-red-600
                          transition-all
                        "
                      >
                        <span className="material-symbols-outlined text-lg">
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-outline-variant/20 pt-6">
          <p className="text-sm text-on-surface-variant flex items-center">
            <span className="material-symbols-outlined text-sm mr-2">
              info
            </span>

            Debe registrar al menos 7 jugadores para validar el equipo.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              className="
                px-6
                py-3
                rounded-xl
                border
                border-outline-variant
                font-semibold
                transition-all
                hover:bg-surface-container-low
              "
            >
              Cancelar
            </button>

            <button
              type="button"
              className="
                px-8
                py-3
                rounded-xl
                bg-primary
                text-on-primary
                font-bold
                shadow-md
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:shadow-lg
                active:scale-95
              "
            >
              Guardar Inscripción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}