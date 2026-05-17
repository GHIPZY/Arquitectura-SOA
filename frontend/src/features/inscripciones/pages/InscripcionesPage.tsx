import { useState } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { SportsSelector } from '../components/SportsSelector';
import { CountriesList } from '../components/CountriesList';
import { PlayerForm } from '../components/PlayerForm';
import { StatsCards } from '../components/StatsCards';
import { AlertBanner } from '../components/AlertBanner';
import { Deporte, Deportista, DEPORTE_LABELS } from '../types';

const paisesData = [
  { nombre: 'Perú', sede: 'Sede Lima', jugadores: 11, bandera: '🇵🇪' },
  { nombre: 'Brasil', sede: 'Sede Arequipa', jugadores: 9, bandera: '🇧🇷' },
  { nombre: 'Argentina', sede: 'Sede Cusco', jugadores: 8, bandera: '🇦🇷' },
];

export function InscripcionesPage() {
  const [selectedDeporte, setSelectedDeporte] = useState<Deporte>('futbol');
  const [selectedPais, setSelectedPais] = useState<string | null>(null);
  const [deportistas, setDeportistas] = useState<Deportista[]>([
    {
      id: '1',
      nombre: 'Ricardo Carranza',
      dni: '45678912',
      sexo: 'M',
      tallaCamiseta: 'M',
      equipoId: '1',
      activo: true,
    },
    {
      id: '2',
      nombre: 'Andrea Sanchez',
      dni: '70123456',
      sexo: 'F',
      tallaCamiseta: 'S',
      equipoId: '1',
      activo: true,
    },
    {
      id: '3',
      nombre: 'Luis Mendoza',
      dni: '12345678',
      sexo: 'M',
      tallaCamiseta: 'L',
      equipoId: '1',
      activo: true,
    },
  ]);

  const cupos = {
    futbol: { usados: 12, total: 16 },
    voley: { usados: 8, total: 8 },
    basquet: { usados: 4, total: 12 },
    pingpong: { usados: 24, total: 32 },
  };

  const handleAgregarJugador = (jugador: Omit<Deportista, 'id' | 'equipoId' | 'activo'>) => {
    const nuevoJugador: Deportista = {
      ...jugador,
      id: Date.now().toString(),
      equipoId: '1',
      activo: true,
    };
    setDeportistas([...deportistas, nuevoJugador]);
  };

  const handleEliminarJugador = (id: string) => {
    setDeportistas(deportistas.filter((d) => d.id !== id));
  };

  const handleEditarJugador = (jugador: Deportista) => {
    console.log('Editar jugador:', jugador);
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-primary">
              Módulo de Inscripciones
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Gestión centralizada de equipos y deportistas para la temporada 2024.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 transition-all flex items-center font-label-md text-label-md">
              <span className="material-symbols-outlined mr-2">add_circle</span>
              Nuevo Equipo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <SportsSelector
              selected={selectedDeporte}
              onSelect={setSelectedDeporte}
              cupos={cupos}
            />
            <AlertBanner diasRestantes={2} />
          </div>

          <div className="lg:col-span-9 space-y-6">
            <CountriesList
              paises={paisesData}
              selectedPais={selectedPais}
              onSelect={setSelectedPais}
              onNewPais={() => {}}
              titulo={`Países Registrados - ${DEPORTE_LABELS[selectedDeporte]}`}
            />

            <PlayerForm
              paisSeleccionado={selectedPais || 'Sin seleccionar'}
              deporte={selectedDeporte}
              deportistas={deportistas}
              onAgregar={handleAgregarJugador}
              onEliminar={handleEliminarJugador}
              onEditar={handleEditarJugador}
            />
          </div>
        </div>

        <StatsCards
          totalEquipos={48}
          variationEquipos="+12%"
          totalJugadores={512}
          variationJugadores="+5%"
          pagosValidados="85%"
          diasInicio={14}
        />
      </div>
    </MainLayout>
  );
}