/**
 * Identificador único (UUID v4) para intentos y turnos (ADR-007: el cliente
 * genera el id para que reintentar no duplique).
 *
 * `crypto.randomUUID()` solo existe en contextos seguros —HTTPS o localhost— y
 * desde Safari 15.4. Al abrir la app desde un celular por la dirección del
 * computador en la red (http://192.168…), o en una tableta con un navegador
 * viejo, no está: la llamada lanzaba un error y ninguna actividad podía
 * empezar. `getRandomValues` sí está disponible en esos casos.
 */
export function uuid(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-');
}
