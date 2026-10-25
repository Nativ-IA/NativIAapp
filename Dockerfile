# =============================================================================
# Imagen de NativIA para Cloud Run.
#
# Compila el front y arranca la API, que en producción sirve también el front
# (una sola URL). La base de datos vive en Neon: la imagen no la crea ni la
# migra. DATABASE_URL llega en tiempo de ejecución desde Secret Manager.
#
# Migraciones y datos de demo se aplican aparte, desde un PC del equipo:
#   pnpm db:deploy:production    → migraciones en la rama production de Neon
#   pnpm demo:reset:production   → deja la demo limpia
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

# El cliente de Prisma se genera sin conectarse a la base: la URL de aquí es
# de relleno y no queda en la imagen.
RUN cd packages/db \
 && DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm exec prisma generate --schema=./schema.prisma

RUN pnpm --filter @nativia/web build

ENV NODE_ENV=production
# Cloud Run define PORT (8080 por defecto) y config.ts lo lee.
EXPOSE 8080
WORKDIR /app/apps/api
CMD ["node", "--import", "tsx", "src/server.ts"]
