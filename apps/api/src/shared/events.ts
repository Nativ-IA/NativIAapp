// =============================================================================
// Eventos internos entre módulos.
//
// Cuando un módulo necesita reaccionar a lo que pasó en otro (p. ej. analítica
// recalcula alertas cuando aprendizaje cierra un intento), no lee las tablas
// del otro: escucha su evento. El día que un módulo salga a servicio propio,
// este bus se reemplaza por Pub/Sub sin cambiar a quien publica ni a quien
// escucha.
//
// Todavía no hay publicadores: hoy analítica lee directamente las tablas de
// aprendizaje y tutor (deuda anotada en modules/README.md). Este es el lugar
// donde se resuelve.
// =============================================================================

import { EventEmitter } from 'node:events';

/** Catálogo de eventos. Cada evento es un hecho ya ocurrido, en pasado. */
export interface DomainEvents {
  'aprendizaje.intento_completado': {
    attemptId: string;
    studentProfileId: string;
    activityId: string;
    isCorrect: boolean | null;
  };
  'tutor.riesgo_detectado': {
    interactionId: string;
    studentProfileId: string;
    classroomId: string;
  };
}

const bus = new EventEmitter();

export function publish<K extends keyof DomainEvents>(name: K, payload: DomainEvents[K]) {
  bus.emit(name, payload);
}

export function subscribe<K extends keyof DomainEvents>(
  name: K,
  handler: (payload: DomainEvents[K]) => void | Promise<void>,
) {
  bus.on(name, handler);
}
