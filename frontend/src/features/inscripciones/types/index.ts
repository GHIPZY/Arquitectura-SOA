
// TIPOS BASE


export type Deporte =
  | 'futbol'
  | 'voley'
  | 'basquet'
  | 'pingpong';

export type Sexo = 'M' | 'F';

export type Talla = 'S' | 'M' | 'L' | 'XL';

export type EstadoRegistro =
  | 'activo'
  | 'inactivo'
  | 'pendiente';



// INTERFACES


export interface Pais {
  nombre: string;
  sede: string;
  jugadores: number;
  bandera: string;
}

export interface Deportista {
  id: string;
  nombre: string;
  dni: string;
  sexo: Sexo;
  tallaCamiseta: Talla;
  equipoId: string;
  activo: boolean;
}

export interface Equipo {
  id: string;

  nombre: string;
  pais: string;
  sede: string;

  deporte: Deporte;

  deportistas: Deportista[];

  estado: EstadoRegistro;
}

export interface InscripcionStatus {
  estado: 'abierta' | 'cerrada' | 'pendiente';

  fechaCierre: string;
}



// CONFIGURACIONES

export const DEPORTE_LIMITE_JUGADORES: Record<
  Deporte,
  number
> = {
  futbol: 11,
  voley: 10,
  basquet: 10,
  pingpong: 2,
};

export const DEPORTE_LABELS: Record<
  Deporte,
  string
> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basquet: 'Básquet',
  pingpong: 'Ping Pong',
};

export const DEPORTE_ICONS: Record<
  Deporte,
  string
> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basquet: 'sports_basketball',
  pingpong: 'sports_tennis',
};



// OPCIONES REUTILIZABLES


export const SEXO_OPTIONS: Sexo[] = [
  'M',
  'F',
];

export const TALLA_OPTIONS: Talla[] = [
  'S',
  'M',
  'L',
  'XL',
];

export const DEPORTES: Deporte[] = [
  'futbol',
  'voley',
  'basquet',
  'pingpong',
];