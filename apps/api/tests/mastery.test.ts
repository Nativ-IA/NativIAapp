import { describe, it, expect } from 'vitest';
import { bktUpdate, toLevel, DEFAULT_BKT } from '../src/modules/aprendizaje/mastery.js';

describe('Bayesian Knowledge Tracing', () => {
  it('un acierto aumenta la probabilidad de dominio', () => {
    expect(bktUpdate(0.25, true, DEFAULT_BKT)).toBeGreaterThan(0.25);
  });

  it('un fallo la reduce respecto del acierto', () => {
    const conAcierto = bktUpdate(0.5, true, DEFAULT_BKT);
    const conFallo = bktUpdate(0.5, false, DEFAULT_BKT);
    expect(conFallo).toBeLessThan(conAcierto);
  });

  it('se mantiene siempre dentro de [0, 1]', () => {
    let p = 0.25;
    for (let i = 0; i < 40; i++) {
      p = bktUpdate(p, i % 3 !== 0, DEFAULT_BKT);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('converge hacia arriba con aciertos sostenidos', () => {
    let p = 0.25;
    for (let i = 0; i < 8; i++) p = bktUpdate(p, true, DEFAULT_BKT);
    expect(p).toBeGreaterThan(0.9);
  });
});

describe('nivel mostrado al docente', () => {
  // Regla no negociable: pintar «necesita apoyo» a partir de una sola evidencia
  // produce un diagnóstico falso que el docente puede llevar a una reunión con
  // la familia (docs/10-teacher-dashboard-spec.md §4.2).
  it('con una sola oportunidad el nivel es "sin datos", no "necesita apoyo"', () => {
    expect(toLevel(0.1, 1)).toBe('sin_datos');
    expect(toLevel(0.95, 1)).toBe('sin_datos');
  });

  it('exige 3 oportunidades para declarar dominio', () => {
    expect(toLevel(0.9, 2)).toBe('va_en_camino');
    expect(toLevel(0.9, 3)).toBe('lo_maneja_bien');
  });

  it('clasifica los tres niveles con evidencia suficiente', () => {
    expect(toLevel(0.2, 4)).toBe('necesita_apoyo');
    expect(toLevel(0.6, 4)).toBe('va_en_camino');
    expect(toLevel(0.85, 4)).toBe('lo_maneja_bien');
  });
});
