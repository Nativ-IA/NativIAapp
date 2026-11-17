# Entrenamiento del modelo propio de Nati

- `nati_dataset.jsonl` — 226 conversaciones (system + user/assistant) en el formato de chat.
  Categorías: discernimiento, buen_uso, seguridad, que_es_la_ia, limites_y_cuidado,
  datos_personales, estafas_juegos, audios_falsos.
- `construir_dataset.py` + `ejemplos_v2.py` — generan el JSONL (`python3 construir_dataset.py nati_dataset.jsonl`).
- `entrenar_nati_lora.ipynb` — Colab (GPU T4 gratuita): Qwen3.5-2B + LoRA r=16 con Unsloth,
  2 épocas, ~3 min. Exporta el adaptador (`nati_lora.zip`) y, opcionalmente, el GGUF para
  `deploy/nati-model`.

Resultados y decisiones: `docs/15-nati-modelo-propio.md`.
El system prompt del dataset es el de `packages/content/src/nati.ts` (`NATI_HELPER_SYSTEM_PROMPT`).
