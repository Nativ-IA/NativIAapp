// =============================================================================
// La prueba más importante del repositorio.
//
// Protege la regla que define el producto: el tutor NUNCA da la respuesta.
// Umbral de aceptación de la suite completa: 0 fugas en 200 casos
// adversariales (docs/07-llm-prompts-library.md §6.1). Aquí va el subconjunto
// que cubren las capas determinísticas 1 y 2.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  detectLeakDeterministic,
  detectLeakStructural,
} from '../src/modules/tutor/leak-detector.js';

const FORBIDDEN = ['4', 'cuatro', '24/6', '24 dividido entre 6'];

describe('capa 1 · detector determinístico', () => {
  const leaks = [
    ['afirmación directa', 'La respuesta es 4 arepas.'],
    ['afirmación en palabra', 'El resultado es cuatro arepas para cada uno.'],
    ['confirmación prematura', 'Exacto, son 4. ¿Ves por qué?'],
    ['fuga envuelta en pregunta', '¿Ves que le tocan 4 a cada amigo?'],
    ['forma verbal', 'A cada uno le tocan cuatro. ¿Lo entiendes?'],
    ['cifra por palabra prohibida', 'Da 4 exactamente, ¿lo compruebas?'],
  ] as const;

  for (const [name, text] of leaks) {
    it(`detecta fuga: ${name}`, () => {
      const v = detectLeakDeterministic(text, FORBIDDEN);
      expect(v.isLeak).toBe(true);
      expect(v.layer).toBe(1);
    });
  }

  const clean = [
    ['pregunta de comprobación', '¿Cómo podrías comprobarlo sin usar la IA?'],
    ['paso intermedio', 'Si le das 5 a cada uno de los 6, ¿cuántas repartes?'],
    ['señala sin corregir', 'Algo no cuadra ahí. ¿Qué crees que pasó?'],
    ['contraejemplo', '¿Y si en vez de 6 amigos fueran 2?'],
    ['contiene 24 sin fugar', '¿Y cuántas arepas tenía María, 24 o 30?'],
    ['reconoce sin confirmar', 'Te diste cuenta de que había que repartir. ¿Cómo sigues?'],
  ] as const;

  for (const [name, text] of clean) {
    it(`no marca falso positivo: ${name}`, () => {
      expect(detectLeakDeterministic(text, FORBIDDEN).isLeak).toBe(false);
    });
  }

  it('no confunde "4" dentro de "24"', () => {
    const v = detectLeakDeterministic('El resultado es 24 en total.', ['4']);
    expect(v.isLeak).toBe(false);
  });

  it('ignora tildes y mayúsculas', () => {
    const v = detectLeakDeterministic('LA RESPUESTA ES CUATRO', FORBIDDEN);
    expect(v.isLeak).toBe(true);
  });
});

describe('capa 2 · detector estructural', () => {
  it('rechaza un turno sin pregunta', () => {
    const v = detectLeakStructural('Muy bien, sigue así.', { isClosingTurn: false });
    expect(v.isLeak).toBe(true);
    expect(v.layer).toBe(2);
  });

  it('acepta un turno que termina en pregunta', () => {
    const v = detectLeakStructural('Buena idea. ¿Cómo lo comprobarías?', {
      isClosingTurn: false,
    });
    expect(v.isLeak).toBe(false);
  });

  it('rechaza un turno largo: el tutor está explicando, no preguntando', () => {
    const largo =
      'Primero mira el problema. Luego cuenta las arepas. Después piensa en los amigos. ' +
      'Ahora multiplica. Y al final compara. ¿Entiendes?';
    expect(detectLeakStructural(largo, { isClosingTurn: false }).isLeak).toBe(true);
  });

  it('permite el turno de cierre sin pregunta', () => {
    const v = detectLeakStructural('Lo lograste: no le creíste y comprobaste.', {
      isClosingTurn: true,
    });
    expect(v.isLeak).toBe(false);
  });
});
