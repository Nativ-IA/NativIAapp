# 15 · Nati, modelo propio (modo ayudante)

## Qué es

Nati tiene dos modos (ver `apps/api/src/modules/nati/README.md`):

| Modo | Dónde | Modelo |
|---|---|---|
| Tutora | dentro de una actividad del eje B | Claude (proveedor externo), nunca da la respuesta |
| Ayudante | panel fijo en todas las pantallas; taller B3 | **Qwen3.5-2B + LoRA, propio**, con verificador externo delante |

El modelo propio se ajustó con LoRA (Unsloth, Colab T4) sobre `ml/nati_dataset.jsonl`.
Base: Qwen3.5-2B (Alibaba, Apache 2.0, marzo de 2026).

## Resultados de las tres corridas (noviembre de 2026)

| Versión | Ejemplos | Épocas | Pérdida val. final | Observación |
|---|---|---|---|---|
| v1 | 125 | 3 | 1,94 | Aprende el tono; falla en seguridad (agradece una clave) |
| v2 | 226 | 3 | 1,82 (mín. 1,78 en ép. 2) | Arregla «estafa de skins»; la 3.ª época ya memoriza |
| v3 | 226 | 2 | 1,80 | Sin sobreajuste; contenido crítico sigue inestable |

Lo que el LoRA sí garantiza: tono (frases cortas, sin viñetas ni emojis, se presenta como IA).
Lo que NO garantiza: criterio de seguridad en cada respuesta. Un modelo de 2B a veces
repite datos personales, dice que «no guarda» lo que le escriben, o da consejos inútiles
para detectar audios falsos.

## Por eso la arquitectura es

```
niño → moderación determinística → [dato personal o riesgo: respuesta fija, sin modelo]
     → modelo propio → verificador (Haiku, temp 0, ve mensaje + respuesta)
     → aprobada: se muestra · rechazada: un reintento · rechazada otra vez: mensaje fijo
     → sin modelo o caído: preguntas frecuentes pregrabadas
```

Cada rechazo del verificador queda en `audit_log` (`mensaje_nati`): es la lista de
ejemplos que faltan en el dataset para la siguiente versión.

## Para mejorar el modelo

1. Más ejemplos de los casos que falla (300–500 en total), sobre todo datos
   personales en medio de una pregunta normal, estafas y audios falsos.
2. Reentrenar con 2 épocas (`ml/entrenar_nati_lora.ipynb`).
3. Comparar con las 8 preguntas de prueba del notebook, que NO están en el dataset.
4. Si hay GPU de pago: Qwen3.5-4B (no cabe en la T4 gratuita en float32).

## Vocabulario

En el modo ayudante se permiten «prompt» y «entrenamiento» (decisión del equipo, 16-11-2026):
es justamente lo que las actividades B2 y B3 enseñan. En el modo tutora siguen prohibidas.
