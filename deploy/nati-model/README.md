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
# Permiso de lectura del bucket a la cuenta del servicio (antes de desplegar):
NUM=$(gcloud projects describe $PROJECT --format 'value(projectNumber)')
gcloud storage buckets add-iam-policy-binding gs://$PROJECT-nati-models \
  --member serviceAccount:$NUM-compute@developer.gserviceaccount.com --role roles/storage.objectViewer

KEY=$(openssl rand -hex 24); echo $KEY > ~/nati-key.txt
gcloud run deploy nati-model \
  --source . --region $REGION \
  --cpu 4 --memory 8Gi --cpu-boost \
  --min-instances 0 --max-instances 1 \
  --concurrency 2 --timeout 120 \
  --allow-unauthenticated \
  --startup-probe httpGet.path=/health,periodSeconds=10,failureThreshold=24,timeoutSeconds=5 \
  --set-env-vars MODEL_GCS_URI=gs://$PROJECT-nati-models/nati/nati-q4_k_m.gguf,LLAMA_API_KEY=$KEY
```

**La sonda de arranque es obligatoria.** llama-server abre el puerto antes de
terminar de cargar el modelo y responde 503 «Loading model». Sin la sonda,
Cloud Run da la instancia por lista y, entre peticiones, casi no le da CPU: el
modelo no termina de cargar nunca. Con la sonda en `/health`, Cloud Run espera
con CPU completa hasta que el modelo está cargado.

`--min-instances 0` no cobra mientras nadie lo usa, pero la primera pregunta
tras un rato quieto tarda ~1 min (descarga y carga). El día de la demo:
`gcloud run services update nati-model --region $REGION --min-instances 1`, y
después volver a 0. Con 4 vCPU el modelo responde en ~8 s. Para un piloto real
conviene una GPU (L4) o un modelo más chico.

## 4. Conectar la API de NativIA, con verificador

El servicio queda público, pero protegido por `LLAMA_API_KEY`: sin la clave
responde 401. La API la manda en `NATI_MODEL_API_KEY`.

**Nunca conectes el modelo sin verificador.** El verificador revisa cada
respuesta antes de mostrarla. Con Gemini en Vertex AI no hace falta clave (usa
la identidad del servicio) y en la prueba gratuita de Google Cloud sale de los
créditos:

```bash
gcloud services enable aiplatform.googleapis.com
gcloud projects add-iam-policy-binding $PROJECT \
  --member serviceAccount:$NUM-compute@developer.gserviceaccount.com --role roles/aiplatform.user

NATI_URL=$(gcloud run services describe nati-model --region $REGION --format 'value(status.url)')
gcloud run services update nativia --region $REGION --update-env-vars \
  "NATI_MODEL_URL=$NATI_URL,NATI_MODEL_API_KEY=$(cat ~/nati-key.txt),NATI_VERIFIER=vertex,VERTEX_PROJECT=$PROJECT"
```

El tutor del eje B no cambia: sigue con `MOCK_LLM` como esté. Para usar Claude
Haiku como verificador en vez de Gemini: `NATI_VERIFIER=anthropic`,
`MOCK_LLM=false` y `ANTHROPIC_API_KEY`.

Para producción, mejor `--no-allow-unauthenticated` en `nati-model` y que la
API mande un token de identidad de Google en vez de la clave.

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
