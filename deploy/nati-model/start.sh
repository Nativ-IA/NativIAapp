#!/bin/sh
set -eu

mkdir -p "$(dirname "$MODEL_PATH")"

if [ ! -f "$MODEL_PATH" ]; then
  if [ -z "$MODEL_GCS_URI" ]; then
    echo "Falta MODEL_GCS_URI (gs://bucket/ruta/al/modelo.gguf)" >&2
    exit 1
  fi
  # Token de la cuenta de servicio de Cloud Run, sin instalar gcloud.
  TOKEN=$(curl -sS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  BUCKET=$(echo "$MODEL_GCS_URI" | sed -n 's#gs://\([^/]*\)/.*#\1#p')
  OBJECT=$(echo "$MODEL_GCS_URI" | sed -n 's#gs://[^/]*/\(.*\)#\1#p' | sed 's#/#%2F#g')
  echo "Descargando $MODEL_GCS_URI …"
  curl -sS -f -H "Authorization: Bearer $TOKEN" \
    "https://storage.googleapis.com/storage/v1/b/$BUCKET/o/$OBJECT?alt=media" \
    -o "$MODEL_PATH"
fi

API_KEY_FLAG=""
[ -n "$LLAMA_API_KEY" ] && API_KEY_FLAG="--api-key $LLAMA_API_KEY"

# -c: contexto; -np: peticiones en paralelo; --jinja: plantilla de chat de Qwen.
exec /app/llama-server \
  --model "$MODEL_PATH" \
  --host 0.0.0.0 --port "$PORT" \
  --alias nati \
  -c 2048 -np 2 \
  --jinja \
  $API_KEY_FLAG
