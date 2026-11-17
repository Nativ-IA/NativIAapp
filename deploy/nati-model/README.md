# Modelo propio de Nati en Cloud Run

Nati (modo ayudante) corre sobre **Qwen3.5-2B + LoRA**, ajustado con
`nati_dataset.jsonl` (ver `docs/15-nati-modelo-propio.md`). Este servicio lo
sirve con [llama.cpp](https://github.com/ggml-org/llama.cpp) en CPU, con una
API compatible con OpenAI. La API de NativIA lo consume por `NATI_MODEL_URL`.

## 1. Exportar el modelo (Colab)

En `entrenar_nati_lora.ipynb`, celda 12, con `True`:

```python
model.save_pretrained_gguf("nati_gguf", tokenizer, quantization_method = "q4_k_m")
```

Sale `nati_gguf/*.q4_k_m.gguf` (~1,5 GB). Descárgalo desde el panel Archivos.

## 2. Subirlo a Cloud Storage

```bash
PROJECT=$(gcloud config get-value project)
REGION=us-central1
gsutil mb -l $REGION gs://$PROJECT-nati-models || true
gsutil cp nati_gguf/*.q4_k_m.gguf gs://$PROJECT-nati-models/nati/nati-q4_k_m.gguf
```

## 3. Desplegar el servidor

```bash
cd deploy/nati-model
gcloud run deploy nati-model \
  --source . --region $REGION \
  --cpu 4 --memory 8Gi \
  --min-instances 1 --max-instances 2 \
  --concurrency 2 --timeout 120 \
  --no-allow-unauthenticated \
  --set-env-vars MODEL_GCS_URI=gs://$PROJECT-nati-models/nati/nati-q4_k_m.gguf

# Permiso de lectura del bucket a la cuenta del servicio:
SA=$(gcloud run services describe nati-model --region $REGION --format 'value(spec.template.spec.serviceAccountName)')
gsutil iam ch serviceAccount:${SA:-$(gcloud projects describe $PROJECT --format 'value(projectNumber)')-compute@developer.gserviceaccount.com}:objectViewer gs://$PROJECT-nati-models
```

`--min-instances 1` evita el arranque en frío (descargar 1,5 GB y cargar el
modelo tarda ~1 min). Con 4 vCPU el modelo responde en 3–8 s. Para la demo
alcanza; para un piloto real conviene una GPU (L4) o un modelo más chico.

## 4. Conectar la API de NativIA

La forma más simple es que la API llame al servicio con su propia identidad.
En Cloud Run, la API ya tiene cuenta de servicio; dale el rol `run.invoker`
sobre `nati-model` y pasa la URL:

```bash
NATI_URL=$(gcloud run services describe nati-model --region $REGION --format 'value(status.url)')
gcloud run services add-iam-policy-binding nati-model --region $REGION \
  --member serviceAccount:<cuenta-de-servicio-de-la-api> --role roles/run.invoker
gcloud run services update nativia --region $REGION \
  --update-env-vars NATI_MODEL_URL=$NATI_URL
```

Nota: con `--no-allow-unauthenticated` la API debe mandar un token de
identidad de Google en `Authorization`. La versión actual de
`nati-provider.ts` manda `NATI_MODEL_API_KEY` como Bearer; para la demo
puedes desplegar con `--allow-unauthenticated` y `LLAMA_API_KEY=<clave larga>`
y poner esa misma clave en `NATI_MODEL_API_KEY`. Para producción, cambiar el
proveedor a token de identidad (una llamada al servidor de metadatos).

## 5. Probar

```bash
curl -s $NATI_URL/v1/chat/completions -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $LLAMA_API_KEY" -d '{
  "model":"nati","temperature":0.3,"max_tokens":120,
  "chat_template_kwargs":{"enable_thinking":false},
  "messages":[{"role":"system","content":"<NATI_HELPER_SYSTEM_PROMPT>"},
              {"role":"user","content":"eres una persona?"}]}'
```

El system prompt tiene que ser **exactamente** `NATI_HELPER_SYSTEM_PROMPT`
(`packages/content/src/nati.ts`): es el del entrenamiento.
