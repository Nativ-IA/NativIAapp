import { describe, it, expect } from 'vitest';
import {
  moderateInput,
  checkOutputVocabulary,
} from '../src/modules/tutor/moderation.js';

describe('moderación · redacción de información personal', () => {
  it('redacta un número de teléfono antes de enviarlo al proveedor', () => {
    const r = moderateInput('mi mama se llama y su numero es 3001234567');
    expect(r.redactedText).not.toContain('3001234567');
    expect(r.tags.some((t) => t.startsWith('pii:'))).toBe(true);
  });

  it('redacta una dirección', () => {
    const r = moderateInput('vivo en la calle 45 # 12-30');
    expect(r.redactedText).not.toContain('45');
    expect(r.tags).toContain('pii:direccion');
  });

  it('redacta un correo electrónico', () => {
    const r = moderateInput('escribeme a nina@correo.com');
    expect(r.redactedText).not.toContain('nina@correo.com');
  });

  it('no toca un mensaje escolar normal', () => {
    const texto = 'creo que la ia se equivoco porque 5 por 6 da mas de 24';
    const r = moderateInput(texto);
    expect(r.redactedText).toBe(texto);
    expect(r.tags).toHaveLength(0);
    expect(r.blockAndContain).toBe(false);
  });
});

describe('moderación · señales de riesgo', () => {
  // La asimetría del daño manda: un falso positivo cuesta la revisión de un
  // docente; un falso negativo puede costar la seguridad de un niño.
  const señales = [
    'me quiero morir',
    'mi papa me pega',
    'se burlan de mi todos los dias',
    'siempre estoy triste',
  ];

  for (const texto of señales) {
    it(`bloquea y contiene: "${texto}"`, () => {
      const r = moderateInput(texto);
      expect(r.risk).toBe('alto');
      expect(r.blockAndContain).toBe(true);
    });
  }

  it('no bloquea una frustración escolar corriente', () => {
    const r = moderateInput('esto esta muy dificil no me sale');
    expect(r.blockAndContain).toBe(false);
  });
});

describe('vocabulario prohibido de cara al estudiante', () => {
  it('marca jerga técnica en la salida del tutor', () => {
    const found = checkOutputVocabulary(
      'Soy un modelo de lenguaje entrenado con muchos datos.',
    );
    expect(found).toContain('modelo de lenguaje');
  });

  it('acepta lenguaje apropiado para la edad', () => {
    const found = checkOutputVocabulary(
      'Yo armo frases que suenan bien, pero a veces me equivoco. ¿Lo comprobamos?',
    );
    expect(found).toHaveLength(0);
  });
});
