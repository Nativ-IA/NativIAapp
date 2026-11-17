// =============================================================================
// Nati, modo ayudante: lo que el modelo propio NO puede garantizar solo.
//
// Origen: en el primer entrenamiento, ante «me llamo Sofia Martinez y mi clave
// del juego es gatito123», el modelo respondió «Gracias por darme tu nombre y
// tu clave». Estas pruebas vuelven ese fallo un build roto, sin depender del
// modelo: la respuesta fija sale de la moderación, antes de cualquier llamada.
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// El servicio de Nati no toca la base, pero llega a ella por tutor/index.ts
// (que exporta las rutas). Aquí no hay motor de Prisma: se sustituye.
vi.mock('../src/shared/db.js', () => ({ db: {}, dbGlobal: {}, activeInstitutionId: () => 'x' }));

process.env.JWT_SECRET ??= 'secreto-de-prueba-0123456789';
process.env.DATABASE_URL = 'postgresql://prueba:prueba@localhost:5432/prueba';

const { moderateInput, checkOutputVocabulary } = await import('../src/modules/tutor/moderation.js');
const { handleNatiMessage, checkRecipe, faqReply, natiDeps } = await import(
  '../src/modules/nati/service.js'
);
const { NATI_PASSWORD_REPLY, NATI_PII_REPLY, NATI_UNSURE_REPLY } = await import('@nativia/content');

describe('moderación · contraseñas', () => {
  for (const texto of [
    'me llamo Sofia Martinez y mi clave del juego es gatito123',
    'mi contraseña de free fire es tigre2015',
    'contraseña: dragon123',
    'mi pass es juanes2014',
  ]) {
    it(`redacta: "${texto}"`, () => {
      const r = moderateInput(texto);
      expect(r.tags).toContain('pii:contrasena');
      expect(r.redactedText).not.toMatch(/gatito123|tigre2015|dragon123|juanes2014/);
    });
  }

  it('no confunde una pregunta sobre contraseñas con una contraseña', () => {
    const r = moderateInput('como hago una contraseña segura');
    expect(r.tags).not.toContain('pii:contrasena');
  });
});

describe('vocabulario · modo ayudante', () => {
  it('permite «prompt» en el modo ayudante y lo marca en el tutor', () => {
    const texto = 'Un prompt es el mensaje que le escribes a una IA.';
    expect(checkOutputVocabulary(texto, 'ayudante')).toHaveLength(0);
    expect(checkOutputVocabulary(texto, 'tutor')).toContain('prompt');
  });
});

function fakeModel(replies: string[]) {
  let i = 0;
  return {
    available: true,
    complete: async () => ({
      text: replies[Math.min(i++, replies.length - 1)],
      model: 'fake',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
    }),
    classify: async () => 'normal',
  };
}

function fakeVerifier(verdicts: string[]) {
  let i = 0;
  return {
    available: true,
    complete: async () => {
      throw new Error('no se usa');
    },
    classify: async () => verdicts[Math.min(i++, verdicts.length - 1)],
  };
}

describe('Nati · pipeline', () => {
  beforeEach(() => {
    natiDeps.ownModel = null;
    natiDeps.verifierAvailable = () => true;
  });

  it('una contraseña nunca llega a ningún modelo', async () => {
    let llamadas = 0;
    natiDeps.ownModel = {
      ...fakeModel(['x']),
      complete: async () => {
        llamadas++;
        throw new Error('no debía llamarse');
      },
    };
    const r = await handleNatiMessage({
      message: 'me llamo Sofia Martinez y mi clave del juego es gatito123',
      history: [],
    });
    expect(llamadas).toBe(0);
    expect(r.source).toBe('safety');
    expect(r.content).toBe(NATI_PASSWORD_REPLY);
    expect(r.content).not.toContain('Sofia');
  });

  it('un teléfono tampoco', async () => {
    natiDeps.ownModel = fakeModel(['lo que sea']);
    const r = await handleNatiMessage({ message: 'mi numero es 3124567890', history: [] });
    expect(r.source).toBe('safety');
    expect(r.content).toBe(NATI_PII_REPLY);
  });

  it('muestra la respuesta del modelo cuando el verificador la aprueba', async () => {
    natiDeps.ownModel = fakeModel(['Soy una IA y me puedo equivocar.']);
    natiDeps.verifier = fakeVerifier(['aprobada']);
    const r = await handleNatiMessage({ message: 'eres humano?', history: [] });
    expect(r.source).toBe('own_model');
    expect(r.rejected).toBe(0);
  });

  it('reintenta una vez si el verificador rechaza, y luego responde con el mensaje fijo', async () => {
    natiDeps.ownModel = fakeModel(['Gracias por darme tu clave.', 'Otra respuesta mala.']);
    natiDeps.verifier = fakeVerifier(['rechazada', 'rechazada']);
    const r = await handleNatiMessage({ message: 'hola', history: [] });
    expect(r.rejected).toBe(2);
    expect(r.source).toBe('unsure');
    expect(r.content).toBe(NATI_UNSURE_REPLY);
    expect(r.suggestAskTeacher).toBe(true);
  });

  it('acepta la segunda respuesta si la primera fue rechazada', async () => {
    natiDeps.ownModel = fakeModel(['mala', 'buena']);
    natiDeps.verifier = fakeVerifier(['rechazada', 'aprobada']);
    const r = await handleNatiMessage({ message: 'hola', history: [] });
    expect(r.content).toBe('buena');
    expect(r.rejected).toBe(1);
  });

  it('si el verificador está caído, no muestra la respuesta del modelo', async () => {
    natiDeps.ownModel = fakeModel(['algo']);
    natiDeps.verifier = {
      ...fakeVerifier([]),
      classify: async () => {
        throw new Error('caído');
      },
    };
    const r = await handleNatiMessage({ message: 'hola', history: [] });
    expect(r.source).toBe('unsure');
  });

  it('sin modelo propio responde desde las preguntas frecuentes', async () => {
    const r = await handleNatiMessage({ message: '¿Tú eres una persona?', history: [] });
    expect(r.source).toBe('faq');
    expect(r.content).toMatch(/inteligencia artificial/);
  });

  it('un riesgo alto se contiene igual que en el tutor', async () => {
    natiDeps.ownModel = fakeModel(['x']);
    const r = await handleNatiMessage({ message: 'me quiero morir', history: [] });
    expect(r.source).toBe('safety');
    expect(r.suggestAskTeacher).toBe(true);
  });
});

describe('Nati · receta de la buena pregunta', () => {
  it('una palabra suelta no tiene ningún ingrediente', () => {
    const r = checkRecipe('planetas');
    expect(r.que).toBe(false);
    expect(r.para_quien).toBe(false);
    expect(r.como).toBe(false);
  });

  it('reconoce las tres partes', () => {
    const r = checkRecipe(
      'Explícame los planetas para un estudiante de cuarto, en una lista de tres puntos',
    );
    expect(r).toMatchObject({ que: true, para_quien: true, como: true });
  });

  it('las preguntas frecuentes siempre devuelven algo', () => {
    expect(faqReply('asdfgh')).toBeTruthy();
    expect(faqReply('como le pregunto bien a una ia')).toMatch(/qué quieres/);
  });
});
