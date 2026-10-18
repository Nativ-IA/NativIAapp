// =============================================================================
// El árbol pregrabado sirve a tres cosas a la vez: modo offline, presupuesto
// agotado y MOCK_LLM. Si el árbol filtra la respuesta, las tres rutas fallan
// al mismo tiempo — y ninguna pasa por el detector de fuga del LLM.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { ACTIVITIES, findActivity } from '@nativia/content';
import { detectLeakDeterministic } from '../src/modules/tutor/leak-detector.js';

describe('árboles socráticos pregrabados', () => {
  const conTutor = ACTIVITIES.filter((a) => a.kind === 'tutor_socratico');

  it('toda actividad con tutor tiene su árbol de respaldo (ADR-005)', () => {
    expect(conTutor.length).toBeGreaterThan(0);
    for (const a of conTutor) {
      expect(a.fallbackTree, `${a.slug} sin árbol`).toBeDefined();
      expect(a.forbiddenAnswers?.length, `${a.slug} sin forbiddenAnswers`).toBeGreaterThan(0);
    }
  });

  it('ningún nodo del árbol revela la respuesta', () => {
    for (const a of conTutor) {
      const forbidden = a.forbiddenAnswers ?? [];
      for (const node of Object.values(a.fallbackTree!.nodes)) {
        const verdict = detectLeakDeterministic(node.say, forbidden);
        expect(verdict.isLeak, `${a.slug}/${node.id}: ${verdict.reason}`).toBe(false);

        for (const choice of node.choices ?? []) {
          const cv = detectLeakDeterministic(choice.label, forbidden);
          expect(cv.isLeak, `${a.slug}/${node.id}/${choice.key}`).toBe(false);
        }
      }
    }
  });

  it('todo destino de una opción existe', () => {
    for (const a of conTutor) {
      const tree = a.fallbackTree!;
      expect(tree.nodes[tree.rootId], `${a.slug}: raíz inexistente`).toBeDefined();
      for (const node of Object.values(tree.nodes)) {
        for (const choice of node.choices ?? []) {
          expect(tree.nodes[choice.next], `${a.slug}: ${node.id} → ${choice.next}`).toBeDefined();
        }
      }
    }
  });

  it('todo nodo es alcanzable desde la raíz', () => {
    for (const a of conTutor) {
      const tree = a.fallbackTree!;
      const seen = new Set<string>();
      const stack = [tree.rootId];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const c of tree.nodes[id]?.choices ?? []) stack.push(c.next);
      }
      const huerfanos = Object.keys(tree.nodes).filter((id) => !seen.has(id));
      expect(huerfanos, `${a.slug}: nodos inalcanzables`).toHaveLength(0);
    }
  });

  it('todo camino puede terminar: existe al menos un nodo de éxito', () => {
    for (const a of conTutor) {
      const terminales = Object.values(a.fallbackTree!.nodes).filter((n) => n.isSuccess);
      expect(terminales.length, `${a.slug} sin nodo de cierre`).toBeGreaterThan(0);
    }
  });

  it('el árbol de B1 lleva a la comprobación sin dar el resultado', () => {
    const b1 = findActivity('el-repartidor-confundido')!;
    const raiz = b1.fallbackTree!.nodes[b1.fallbackTree!.rootId];
    expect(raiz.say).toContain('?');
    expect(raiz.choices?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('trazabilidad pedagógica del contenido', () => {
  it('toda actividad declara competencia PISA, DBA y nivel Bloom', () => {
    for (const a of ACTIVITIES) {
      expect(a.pisaCompetence, `${a.slug}`).toBeTruthy();
      expect(a.dbaReference, `${a.slug}`).toBeTruthy();
      expect(a.bloomLevel, `${a.slug}`).toBeTruthy();
    }
  });

  it('ninguna actividad se publica sin revisor humano (salvaguarda ética 7)', () => {
    for (const a of ACTIVITIES) {
      if (a.isPublished) {
        expect(a.reviewedBy, `${a.slug} publicada sin revisor`).toBeTruthy();
      }
    }
  });
});
