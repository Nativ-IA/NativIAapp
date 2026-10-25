// Respuestas HTTP comunes a todos los módulos (application/problem+json).

export function forbidden(reply: any) {
  return reply.code(403).type('application/problem+json').send({
    type: 'https://nativia.edu.co/problems/forbidden',
    title: 'Sin permiso',
    status: 403,
  });
}

/** Respuesta de error con detalle legible para quien usa la pantalla. */
export function problem(reply: any, status: number, title: string, detail?: string) {
  return reply
    .code(status)
    .type('application/problem+json')
    .send({ title, status, ...(detail ? { detail } : {}) });
}
