import { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { SportsSelector } from '../components/SportsSelector';
import { CountriesList } from '../components/CountriesList';
import { PlayerForm } from '../components/PlayerForm';
import { StatsCards } from '../components/StatsCards';
import { AlertBanner } from '../components/AlertBanner';
import { Deporte, DEPORTE_LABELS } from '../types';
import { getDeportes } from '@/services/deportes.service';
import { getEquipos } from '@/services/equipos.service';
import { getParticipantes } from '@/services/participantes.service';
import { useCurrentUser } from '@/shared/context/UserContext';

export function InscripcionesPage() {
  const { user } = useCurrentUser();
  const [selectedDeporte, setSelectedDeporte] = useState<Deporte>('futbol');
  const [selectedPais, setSelectedPais] = useState<string | null>(null);
  const [cupos, setCupos] = useState<Record<string, { usados: number; total: number }>>({});
  const [totalEquipos, setTotalEquipos] = useState(0);
  const [totalJugadores, setTotalJugadores] = useState(0);

  useEffect(() => {
    if (!user?.grado_id) return;
    async function cargar() {
      const [deportes, equipos] = await Promise.all([
        getDeportes().catch(() => []),
        getEquipos({ grado_id: user!.grado_id! }).catch(() => []),
      ]);

      setTotalEquipos(equipos.length);

      const nuevoCupos: Record<string, { usados: number; total: number }> = {};
      let totalParts = 0;

      await Promise.all(
        equipos.map(async eq => {
          const deporte = deportes.find(d => d.id === eq.deporte_id);
          if (!deporte) return;
          const parts = await getParticipantes({ equipo_id: eq.id }).catch(() => []);
          const key = deporte.nombre.toLowerCase().includes('futbol') ? 'futbol'
            : deporte.nombre.toLowerCase().includes('voley') ? 'voley'
            : deporte.nombre.toLowerCase().includes('basquet') ? 'basquet'
            : deporte.nombre.toLowerCase().includes('tenis') || deporte.nombre.toLowerCase().includes('ping') ? 'pingpong'
            : null;
          if (key) {
            nuevoCupos[key] = { usados: parts.length, total: deporte.max_participantes };
          }
          totalParts += parts.length;
        })
      );

      setCupos(nuevoCupos);
      setTotalJugadores(totalParts);
    }
    cargar();
  }, [user?.grado_id]);

  return (
    <MainLayout title="Inscripciones">
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
              paises={[]}
              selectedPais={selectedPais}
              onSelect={setSelectedPais}
              onNewPais={() => {}}
              titulo={`Países Registrados - ${DEPORTE_LABELS[selectedDeporte]}`}
            />

            <PlayerForm
              paisSeleccionado={selectedPais || 'Sin seleccionar'}
              deporte={selectedDeporte}
              deportistas={[]}
              onAgregar={() => {}}
              onEliminar={() => {}}
              onEditar={() => {}}
            />
          </div>
        </div>

        <StatsCards
          totalEquipos={totalEquipos}
          variationEquipos=""
          totalJugadores={totalJugadores}
          variationJugadores=""
          pagosValidados="—"
          diasInicio={0}
        />
      </div>
    </MainLayout>
  );
}
