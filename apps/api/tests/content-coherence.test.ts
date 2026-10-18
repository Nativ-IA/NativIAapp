// =============================================================================
// Coherencia entre lo que una actividad PIDE JUZGAR y lo que MUESTRA.
//
// Origen: la actividad C3 «El animal que no existe» enseñaba señales visuales
// —«la luz no coincide», «hay texturas que se repiten»— sobre fichas que solo
// tenían texto. Un niño no puede juzgar la iluminación de un párrafo.
//
// El fallo no se veía en ninguna prueba porque el contenido era válido y la
// interfaz lo renderizaba sin error: simplemente no tenía sentido. Estas
// pruebas convierten ese sinsentido en un build roto.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { ACTIVITIES } from '@nativia/content';
import type { ClassificationPayload } from '@nativia/content';

const clasificaciones = ACTIVITIES.filter((a) => a.kind === 'clasificacion');

describe('actividades de clasificación', () => {
  it('declaran sobre qué se juzga', () => {
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      expect(['texto', 'imagen', 'mixto'], `${a.slug}`).toContain(p.signalKind);
    }
  });

  it('si piden juzgar imágenes, TODOS los ítems traen imagen', () => {
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      if (p.signalKind === 'texto') continue;
      for (const item of p.items) {
        expect(
          item.mediaUrl,
          `${a.slug}/${item.id}: signalKind="${p.signalKind}" exige mediaUrl`,
        ).toBeTruthy();
      }
    }
  });

  it('las de solo texto no enseñan señales visuales', () => {
    // Vocabulario que solo tiene sentido mirando una imagen.
    const VISUAL = /\b(luz|ilumina|textura|fondo|imagen|foto|se ven|dedos|manos|patas|borros)/i;
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      if (p.signalKind !== 'texto') continue;
      for (const s of p.signals) {
        expect(
          VISUAL.test(s.label),
          `${a.slug}: la señal "${s.label}" es visual, pero la actividad es de solo texto`,
        ).toBe(false);
      }
    }
  });

  it('cada señal marcada como válida existe en la lista de señales', () => {
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      const keys = new Set(p.signals.map((s) => s.key));
      for (const item of p.items) {
        for (const v of item.validSignals) {
          expect(keys.has(v), `${a.slug}/${item.id}: señal "${v}" no está en la lista`).toBe(true);
        }
      }
    }
  });

  it('todo ítem sintético declara al menos una señal que lo delata', () => {
    // Sin esto, la regla US-02 (acertar sin justificación no cuenta para el
    // dominio) sería inaplicable: no habría justificación válida posible.
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      for (const item of p.items.filter((i) => i.isSynthetic)) {
        expect(
          item.validSignals.length,
          `${a.slug}/${item.id}: sintético sin señal que lo justifique`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('hay al menos un ítem de cada clase y se puede alcanzar minCorrect', () => {
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      expect(p.items.some((i) => i.isSynthetic), `${a.slug} sin ítems sintéticos`).toBe(true);
      expect(p.items.some((i) => !i.isSynthetic), `${a.slug} sin ítems reales`).toBe(true);
      expect(p.minCorrect, `${a.slug}: minCorrect inalcanzable`).toBeLessThanOrEqual(
        p.items.length,
      );
    }
  });

  it('todo ítem ofrece al menos una pista', () => {
    for (const a of clasificaciones) {
      const p = a.payload as ClassificationPayload;
      for (const item of p.items) {
        expect(item.hints.length, `${a.slug}/${item.id} sin pistas`).toBeGreaterThan(0);
      }
    }
  });
});

describe('higiene de marca en el contenido', () => {
  it('ninguna actividad confunde el nombre del producto con un animal', () => {
    // Un renombre global sustituyó «Colibrí» (el ave de la ficha) por el
    // nombre del producto y produjo el texto «NativIA. Esta ave migra…».
    // El contenido de cara a un menor no puede tener ese tipo de basura.
    const json = JSON.stringify(ACTIVITIES);
    expect(json).not.toMatch(/NativIA\.\s*Esta ave/);
    expect(json, 'el nombre del producto no debe aparecer dentro del contenido')
      .not.toMatch(/"[^"]*\bNativIA\b[^"]*"/);
  });
});
