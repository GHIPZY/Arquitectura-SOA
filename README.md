# Arquitectura-SOA

Plataforma de gestión de un torneo deportivo (Olimpiadas Perú 2026) construida
con una arquitectura orientada a servicios (SOA).

## Estructura

- **`backend/services/`** — microservicios Node/Express, uno por dominio
  (deportes, equipos, participantes, instituciones, encuentros, resultados).
  Cada uno corre en su propio puerto y accede a Supabase con `service_role`.
- **`frontend/`** — SPA en React + Vite. Consume los microservicios vía la
  capa `src/services/` (un módulo por dominio). El proxy de Vite (`vite.config.ts`)
  mapea `/api/<dominio>` a cada microservicio.

## Principio de la arquitectura

> El frontend **no** accede a la base de datos directamente. Toda lectura y
> escritura de datos de negocio pasa por los microservicios. La única
> excepción es `supabase.auth` (manejo del token de sesión en el navegador),
> que no consulta datos y es correcto en cualquier SOA con Supabase Auth.

## Decisión: Realtime (resultados en vivo)

Para los marcadores en vivo hay una **ruptura controlada y deliberada** del
principio anterior. Está implementada en
[`frontend/src/shared/hooks/useRealtimeMarcador.ts`](frontend/src/shared/hooks/useRealtimeMarcador.ts).

**Qué hace:** cuando el administrador registra un marcador, Supabase Realtime
notifica al navegador por WebSocket. React **no lee el dato del evento**; usa
la notificación solo como señal para volver a pedir los datos al microservicio.

```
Realtime  ->  NOTIFICA  (solo "algo cambió")
Backend   ->  SIRVE     (el dato real, vía /api/.../public/*)
```

**¿Por qué no se movió el Realtime al backend?** Se evaluó esa alternativa
(que el microservicio se suscriba a Supabase y reenvíe los cambios al navegador
por su propio canal). Conclusión:

- El "tiempo real sin recarga" exige una conexión persistente
  (WebSocket o SSE) abierta **desde el navegador** hacia algún servidor. Eso
  es inevitable: moverla al backend solo cambia el destino del socket
  (Supabase → microservicio propio), no lo elimina.
- Hacerlo en el backend obligaría a Express a sostener **N conexiones
  persistentes** (una por espectador), con reconexión, heartbeats y
  problemas de escalado entre instancias.
- El beneficio (que React nunca toque Supabase) es sobre todo de pureza
  arquitectónica y no justifica esa complejidad para este proyecto.

Por eso se mantiene el patrón **"Realtime notifica, backend sirve"**: es la
opción recomendada por la documentación de Supabase y conserva los datos
dentro del SOA, aceptando una única conexión de *notificación* directa.

> Nota: las lecturas REST de la vista pública (espectador sin login) sí pasan
> por el backend mediante endpoints `GET /public/*` sin autenticación. El
> WebSocket de Realtime es solo el canal de aviso.

## Puesta en marcha

Cada microservicio tiene su `.env` con `PORT` + credenciales de Supabase
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Los puertos
deben coincidir con el proxy de `frontend/vite.config.ts`:

| Servicio       | Puerto |
|----------------|--------|
| instituciones  | 3004   |
| deportes       | 3005   |
| equipos        | 3006   |
| participantes  | 3007   |
| encuentros     | 3008   |
| resultados     | 3009   |

