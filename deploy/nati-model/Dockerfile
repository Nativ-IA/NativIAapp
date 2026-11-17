# =============================================================================
# Servidor del MODELO PROPIO de Nati (Qwen3.5-2B + LoRA, fusionado, GGUF q4_k_m).
#
# llama-server expone una API compatible con OpenAI en /v1/chat/completions.
# Corre en CPU: en Cloud Run no hace falta GPU para un modelo de 2B en 4 bits.
# El archivo GGUF NO va en la imagen (pesa ~1,5 GB): se descarga al arrancar
# desde Cloud Storage, con la identidad del servicio. Ver README.md.
# =============================================================================

FROM ghcr.io/ggml-org/llama.cpp:server

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV PORT=8080
# Ruta del GGUF en Cloud Storage: gs://<bucket>/nati/nati-q4_k_m.gguf
ENV MODEL_GCS_URI=""
ENV MODEL_PATH=/models/nati.gguf
# Clave opcional: si se define, llama-server exige Authorization: Bearer.
ENV LLAMA_API_KEY=""

EXPOSE 8080
ENTRYPOINT ["/start.sh"]
