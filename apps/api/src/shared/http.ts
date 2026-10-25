// Respuestas HTTP comunes a todos los módulos (application/problem+json).

export function forbidden(reply: any) {
  return reply.code(403).type('application/problem+json').send({
    type: 'https://nativia.edu.co/problems/forbidden',
    title: 'Sin permiso',
    status: 403,
  });
}
