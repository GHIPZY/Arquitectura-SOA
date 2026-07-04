# Arquitectura-SOA

Sistema de gestión deportiva (encuentros, equipos, participantes, resultados, estadísticas, atletismo) construido con una arquitectura orientada a servicios (SOA): un frontend único que consume varios servicios independientes, cada uno respaldado por Supabase (PostgreSQL + Auth).

## Estructura del repo

```
Arquitectura-SOA/
├── frontend/                  # React + TypeScript + Vite + Tailwind
└── backend/
    ├── services/
    │   ├── deportes-service/      # puerto 3005
    │   ├── encuentros-service/    # puerto 3008
    │   ├── equipos-service/       # puerto 3006
    │   ├── estadisticas-service/  # puerto 3010
    │   ├── instituciones-service/ # puerto 3004
    │   ├── participantes-service/ # puerto 3007
    │   └── resultados-service/    # puerto 3009
    ├── shared/                # código común a todos los servicios (middleware de auth, cliente Supabase)
    └── supabase/
        ├── config.toml
        └── functions/login/   # Edge Function: login (autenticación real)
```

Cada servicio es una app Express independiente con su propio `package.json`, `tsconfig.json` y `.env`. El backend es un monorepo gestionado con **pnpm workspaces** (`backend/pnpm-workspace.yaml`).

## Requisitos previos

- Node.js 20+
- [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`)
- Acceso al proyecto de Supabase del equipo (URL + claves, se piden al responsable del proyecto — **no se suben al repo**)

## 1. Clonar y configurar variables de entorno

```bash
git clone <url-del-repo>
cd Arquitectura-SOA
```

Cada servicio necesita su propio `.env` en `backend/services/<nombre>/.env` (están en `.gitignore`, no vienen en el repo). Pide las claves al equipo y crea uno por servicio con este formato:

```env
PORT=<puerto-del-servicio>       # ver tabla de puertos arriba
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
```

El frontend también necesita `frontend/.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

> La `SUPABASE_SERVICE_ROLE_KEY` es secreta: solo va en los `.env` del backend, nunca en el frontend ni en commits.

## 2. Instalar dependencias

**Backend** (instala todos los servicios del workspace de una vez):

```bash
cd backend
pnpm install
```

**Frontend**:

```bash
cd frontend
pnpm install
```

## 3. Levantar el entorno de desarrollo

Cada servicio se levanta por separado. Desde `backend/services/<nombre>/`:

```bash
pnpm dev
```

Para no abrir 7 terminales a mano, desde `backend/` puedes levantar todos con:

```bash
pnpm --parallel --filter "./services/*" dev
```

**Frontend** (en otra terminal):

```bash
cd frontend
pnpm dev
```

El frontend corre en `http://localhost:5173` y proxea `/api/<recurso>` al puerto correspondiente (ver `frontend/vite.config.ts`):

| Ruta frontend        | Servicio                | Puerto |
|-----------------------|--------------------------|--------|
| `/api/instituciones`  | instituciones-service    | 3004   |
| `/api/deportes`       | deportes-service         | 3005   |
| `/api/equipos`        | equipos-service          | 3006   |
| `/api/participantes`  | participantes-service    | 3007   |
| `/api/encuentros`     | encuentros-service       | 3008   |
| `/api/resultados`     | resultados-service       | 3009   |
| `/api/estadisticas`   | estadisticas-service     | 3010   |

La autenticación (login) se resuelve mediante la Supabase Edge Function en `backend/supabase/functions/login`, no por un servicio Express propio.

## 4. Build de producción

```bash
# cada servicio
cd backend/services/<nombre> && pnpm build && pnpm start

# frontend
cd frontend && pnpm build && pnpm preview
```

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
- **Backend**: Node.js, Express, TypeScript, arquitectura orientada a servicios (SOA)
- **Base de datos / Auth**: Supabase (PostgreSQL + Auth)
