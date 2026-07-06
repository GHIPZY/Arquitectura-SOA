# Pruebas del proyecto

Cinco tipos de prueba con herramientas distintas, cubriendo pruebas aplicadas,
de rendimiento y automatización.

| # | Tipo | Herramienta | Dónde vive | Requiere |
|---|------|-------------|------------|----------|
| 1 | Unitarias | Vitest | `frontend/src/**/*.test.ts` | nada (corre solo) |
| 2 | API + seguridad | Postman / Newman | `pruebas/postman/` | backend corriendo |
| 3 | Carga / rendimiento | Apache JMeter | `pruebas/jmeter/` | backend corriendo |
| 4 | Auditoría frontend | Lighthouse (Chrome) | reporte en `pruebas/lighthouse/` | build de producción |
| 5 | CI — automatización | GitHub Actions | `.github/workflows/pruebas.yml` | push a GitHub |

---

## 1. Vitest — pruebas unitarias

Prueban lógica de negocio real que ya causó bugs en el proyecto:
la normalización de resultados de Supabase (objeto vs array) y el mapeo
de países a banderas (nombre en español vs código ISO).

```bash
cd frontend
pnpm test          # corre la suite completa
pnpm test:watch    # modo interactivo mientras desarrollas
```

Resultado esperado: `Tests 8 passed (8)`.

## 2. Postman — pruebas de API y seguridad RBAC

Colección con 9 peticiones y 14 aserciones en 3 grupos:
disponibilidad (health checks), endpoints públicos, y seguridad
(los endpoints protegidos DEBEN responder 401 sin token).

**Con interfaz** (para la demo): abrir Postman → Import →
`pruebas/postman/olimpiadas-api.postman_collection.json` → Run collection.

**Por consola** (automatizado con Newman):

```bash
# con el backend corriendo (pnpm dev desde backend/)
npx newman run pruebas/postman/olimpiadas-api.postman_collection.json
```

Resultado esperado: `assertions: 14 executed, 0 failed`.

## 3. JMeter — prueba de carga

Simula **50 espectadores concurrentes** consultando la tabla de posiciones
20 veces cada uno (1,000 peticiones) contra `resultados-service`.

1. Descargar JMeter (gratis): https://jmeter.apache.org/download_jmeter.cgi
2. Abrir `pruebas/jmeter/carga-posiciones.jmx`
3. Con el backend corriendo, presionar ▶ (Start)
4. Ver **Aggregate Report**: throughput (req/s), latencia media, p90/p99, % de error

También por consola (sin GUI, genera reporte HTML):

```bash
jmeter -n -t pruebas/jmeter/carga-posiciones.jmx -l resultados.jtl -e -o reporte-html
```

Las cifras del Aggregate Report van directo al PPT como evidencia de rendimiento.

## 4. Lighthouse — auditoría del frontend

Integrado en Chrome. Auditar siempre el **build de producción** (no el dev server):

```bash
cd frontend
pnpm build
pnpm preview        # sirve la versión optimizada en http://localhost:4173
```

Luego: Chrome en incógnito → `http://localhost:4173/publico/encuentros` →
F12 → pestaña Lighthouse → Analyze. Exportar el reporte HTML a
`pruebas/lighthouse/` como evidencia.

## 5. GitHub Actions — integración continua

En cada push a `main` o `feature/auth-login`, GitHub ejecuta automáticamente:

- **Frontend**: los 8 tests de Vitest + verificación de tipos de TypeScript
- **Backend**: compilación del paquete compartido + verificación de tipos de los 8 microservicios

Evidencia: pestaña **Actions** del repositorio en GitHub (cada push muestra
el resultado ✓/✗). Si alguien sube código que rompe un test o un tipo,
el push queda marcado en rojo — nadie tiene que acordarse de correr nada.
