# =============================================================================
# Imagen de la demo de NativIA para Cloud Run.
#
# Compila el front, crea una base SQLite limpia con los datos de demostración y
# arranca la API, que en producción sirve también el front (una sola URL).
#
# Cloud Run no conserva lo que se escribe en disco: cada instancia nueva arranca
# con esta misma base limpia. Para una demo eso es bueno; para datos reales no
# sirve (ver docs/04-technical-architecture.md, objetivo PostgreSQL).
# Desplegar SIEMPRE con --max-instances 1: dos instancias tendrían dos bases
# distintas y los datos cambiarían según a cuál llegue cada petición.
# =============================================================================

FROM node:22-bookworm-slim

# Prisma necesita OpenSSL para detectar la plataforma y cargar su motor.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# pnpm en la versión fijada en package.json (packageManager), vía corepack.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Base de demostración, creada desde el esquema y el seed en cada build.
ENV DATABASE_URL="file:./nativia.db"
WORKDIR /app/packages/db
RUN rm -f nativia.db \
 && pnpm exec prisma db push --schema=./schema.prisma --skip-generate \
 && pnpm exec prisma generate --schema=./schema.prisma \
 && pnpm exec tsx src/seed.ts

WORKDIR /app
RUN pnpm --filter @nativia/web build

ENV NODE_ENV=production
# Cloud Run define PORT (8080 por defecto) y config.ts lo lee.
EXPOSE 8080
WORKDIR /app/apps/api
CMD ["node", "--import", "tsx", "src/server.ts"]
