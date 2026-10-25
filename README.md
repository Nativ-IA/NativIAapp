# NativIA — Alfabetización en IA para primaria (SABER 5 · Bogotá D.C.)

> **NativIA** — *nativos de IA*. Es la primera generación que nace con la IA ya puesta; «nativo»
> apunta también a lo propio, lo local, lo situado. El símbolo es **una semilla que pregunta**: un
> brote cuyo tallo se curva hasta volverse un signo de interrogación. El tutor con el que conversa el
> niño se llama **Nati** y es ese brote. Identidad completa en `docs/03-design-system.md` §11.

Prototipo de aplicación educativa para desarrollar **alfabetización crítica en IA** en estudiantes de
3.º a 5.º de primaria (8–11 años), alineada con competencias **PISA** y **DBA** del MEN, orientada a
cerrar brechas medidas por **Pruebas SABER 5**.

---

## Estado del proyecto

**Demo en la nube, solo con datos sintéticos.** La app corre en Google Cloud Run y la base en
Neon (Postgres). Sirve para mostrar el producto a potenciales clientes; no es un despliegue de
producción. La arquitectura de producción está *documentada* (para sustentación ante el Distrito)
pero **no implementada**; ver `docs/04-technical-architecture.md`.

---

## Mapa de entregables

| # | Entregable | Ruta | Fase |
|---|---|---|---|
| 00 | Resumen ejecutivo | `docs/00-executive-summary.md` | 1 |
| 01 | PRD (user stories, MoSCoW) | `docs/01-product-requirements-document.md` | 1 |
| 02 | Arquitectura de información + wireframes | `docs/02-information-architecture.md` | 2 |
| 03 | Design system y accesibilidad | `docs/03-design-system.md` | 2 |
| 04 | Arquitectura técnica (C4 + ADRs) | `docs/04-technical-architecture.md` | 3 |
| 05 | Esquema de base de datos | `packages/db/schema.prisma` | 3 |
| — | Contenido pedagógico versionado (ADR-008) | `packages/content/` | 4 |
| 06 | Especificación de API (OpenAPI 3.1) | `docs/06-api-specification.yaml` | 3 |
| 07 | Biblioteca de system prompts + evals | `docs/07-llm-prompts-library.md` | 4 |
| 08 | Blueprint de contenido (12 actividades) | `docs/08-content-blueprint.md` | 4 |
| 09 | Plan de seguridad, privacidad y DPIA | `docs/09-security-privacy-plan.md` | 3 |
| 10 | Especificación del panel docente | `docs/10-teacher-dashboard-spec.md` | 2 |
| 11 | Alcance MVP y roadmap | `docs/11-mvp-scope-and-roadmap.md` | 5 |
| 12 | Scaffolding frontend (PWA) | `apps/web/` | 5 |
| 13 | Scaffolding backend (API) | `apps/api/` | 5 |
| 14 | Marco de evaluación de impacto | `docs/14-evaluation-framework.md` | 1 |

---

## Convenciones de los documentos

- `[SUPUESTO]` — decisión tomada sin confirmación del cliente; debe validarse antes de producción.
- `[DATO A VERIFICAR]` — cifra o hecho que **no debe citarse públicamente** hasta contrastarlo con
  la fuente primaria. Este proyecto **no inventa estadísticas**: los placeholders son deliberados.
- `[DIFERIDO]` — fuera del alcance del prototipo local; pertenece a la arquitectura objetivo.
- Cada documento cierra con `<self_critique>`: las 3 debilidades principales y su mitigación.

---

## Decisiones fundacionales (respuestas del cliente, 2026-09-08)

1. **Despliegue:** localhost únicamente. Prototipo, sin presupuesto.
2. **Integraciones distritales (SIMAT/SGA/SSO):** ninguna por ahora; se diseñan puertos hexagonales.
3. **Consentimiento parental:** sin definición jurídica. Se implementa el flujo híbrido
   (certificación institucional + ratificación/revocación del acudiente) marcado como `[SUPUESTO]`.
4. **Offline:** ejes A, C y D completamente offline; eje B degrada a árboles socráticos pregrabados
   cuando no hay red; el tutor LLM en vivo requiere conexión.

## Corrección técnica sobre el stack propuesto

El brief especificaba «Claude Sonnet 4.6» como LLM primario. Ese modelo no existe. Modelos vigentes:
familia Claude 5 (`claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`) y `claude-haiku-4-5-20251001`.

**Asignación adoptada** (justificada en ADR-006):

| Función | Modelo | Razón |
|---|---|---|
| Tutor socrático (eje B) | `claude-sonnet-5` | Calidad pedagógica y adherencia a system prompts largos |
| Clasificador de intención, pre/post-filtro, generación de alertas docentes | `claude-haiku-4-5-20251001` | ~10× más barato; crítico para el techo de USD $2/estudiante-mes |
| Autoría de contenido curricular (offline, equipo pedagógico) | `claude-opus-5` | No corre en producción; se usa para producir el banco de actividades |

---

## Arranque

### Requisitos

- Node.js 20 o superior y pnpm 9 (`npm install -g pnpm@9`).
- Acceso al proyecto de Neon del equipo (la base es Lakebase Postgres en Neon, ADR-002). No hace
  falta instalar Postgres ni Docker: cada quien trabaja contra una rama de Neon.

### Puesta en marcha

```powershell
Copy-Item .env.example .env    # y pega las dos cadenas de tu rama de Neon (dev)
pnpm install
pnpm db:migrate                # aplica las migraciones a tu rama
pnpm db:seed                   # deja la demo limpia (borra y vuelve a crear los datos sintéticos)
pnpm dev                       # API en :3000, PWA en :5173
```

Para cambiar el esquema: editar `packages/db/schema.prisma` y correr
`pnpm db:migrate --name que-cambia`. Eso crea la migración en `packages/db/migrations/`, que se sube
al repo junto con el cambio.

### Credenciales de la demo

| Rol | Acceso |
|---|---|
| Estudiante | Código de curso **`4B7K`** → elige tu avatar → PIN gráfico 🐦 🫓 ⛰️ |
| Docente | `docente@demo.local` / `demo1234` |
| Estudiante, otro colegio | Código **`7HWM`**, mismo PIN |
| Docente, otro colegio | `docente2@demo.local` / `demo1234` |

Hay dos colegios de demostración para mostrar el multi-colegio: cada docente ve solo su curso y cada
código lleva solo a los estudiantes de su colegio.

Dos estudiantes están configurados a propósito para demostrar reglas del sistema:
**Elena M.** no puede entrar (sin autorización del acudiente) y **Mateo R.** tiene el presupuesto de
tokens agotado, así que su tutor arranca en modo degradado.

### Sobre la API key

`MOCK_LLM=true` (valor por defecto) hace que el tutor responda desde los **árboles socráticos
pregrabados** — los mismos que sirven al modo offline. **Toda la aplicación es demostrable sin API
key, sin conexión y sin gasto de tokens.** Para probar el tutor con el modelo real, poner
`MOCK_LLM=false` y una `ANTHROPIC_API_KEY` válida.

### Pruebas

```powershell
pnpm test          # pruebas unitarias del backend
pnpm check:palette # verifica la paleta del design system (requiere Python)
```

`pnpm test` incluye la prueba que protege la regla central del producto: que ni el tutor ni los
árboles pregrabados puedan revelar la respuesta.

---

## Despliegue de la demo (Google Cloud Run)

Un solo servicio: la API sirve también el front compilado. La base es la rama `production` de Neon;
la imagen no la crea ni la migra.

**1. Migraciones y datos de demo** (desde un PC del equipo, con `.env.neon-production`):

```powershell
pnpm db:deploy:production      # aplica las migraciones pendientes
pnpm demo:reset:production     # opcional: deja la demo limpia
```

**2. Despliegue** (desde Cloud Shell). La cadena de Neon con pooler vive en Secret Manager como
`nativia-database-url`:

```bash
git clone https://github.com/Nativ-IA/NativIAapp.git && cd NativIAapp

gcloud run deploy nativia --source . --region us-east1 \
  --allow-unauthenticated --max-instances 1 --memory 1Gi \
  --update-secrets DATABASE_URL=nativia-database-url:latest \
  --update-env-vars "MOCK_LLM=true,JWT_SECRET=$(openssl rand -hex 24)"
```

`--max-instances 1` mientras el límite de peticiones viva en memoria (con más instancias, cada una
tendría su propio contador).

**Apagar y prender** la demo sin borrar nada:

```bash
gcloud run services update nativia --region us-east1 --ingress internal   # apagar
gcloud run services update nativia --region us-east1 --ingress all        # prender
```

Para encender el tutor con el modelo real:

```bash
gcloud run services update nativia --region us-east1 \
  --update-env-vars "MOCK_LLM=false,ANTHROPIC_API_KEY=sk-ant-...,TUTOR_MODEL=claude-sonnet-5-5,CLASSIFIER_MODEL=claude-haiku-5-5"
```

---

## Regla operativa innegociable

**Ningún dato real de un menor entra a este prototipo.** No hay TLS, no hay cifrado en reposo, no hay
gestión de secretos y no se ha hecho un pentest. Todos los datos de demostración son sintéticos y los
nombres son inventados. Ver `docs/09-security-privacy-plan.md` §7.1.
