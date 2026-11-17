import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApp } from '../lib/store';
import { Button, ReadAloudButton } from '../components/ui';
import { Mark, CLAIM_ESTUDIANTE } from '../components/Logo';

// Sin O/0, I/1/l, S/5: caracteres sin ambigüedad visual para un lector en
// desarrollo.
const ALLOWED = /^[A-HJ-NP-RT-Za-hj-np-rt-z2-46-9]*$/;

/** Dispositivo que se maneja con el dedo (celular o tableta). */
const COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

export function JoinPage() {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const setJoinCode = useApp((s) => s.setJoinCode);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.get(`/auth/classroom/${code.toUpperCase()}`);
      setJoinCode(code.toUpperCase());
      nav('/quien-eres');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : 'No pudimos entrar. Intenta otra vez.',
      );
    } finally {
      setLoading(false);
    }
  }

  const speech =
    'NativIA. Aprende a pensar con la IA. Escribe el código que te dio tu profe.';

  return (
    <div className="flex screen pb-safe flex-col bg-surf">
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* El brote a tamaño grande es lo primero que se ve, antes del nombre:
              el producto entero cabe en ese gesto — aquí la IA no entrega
              respuestas, hace crecer preguntas. */}
          <div className="flex flex-col items-center text-center">
            <Mark className="h-20 w-20 text-brand" />
            <p className="mt-3 text-display font-extrabold tracking-tight text-ink">
              Nativ<span className="text-brand">IA</span>
            </p>
            <p className="mt-1 text-body text-ink-2">{CLAIM_ESTUDIANTE}</p>
          </div>

          <form
            onSubmit={submit}
            className="mt-8 rounded-lg border border-line bg-white px-4 py-6 sm:px-6 sm:py-7"
          >
            <label htmlFor="code" className="block text-center text-body-lg font-semibold">
              Escribe el código que te dio tu profe
            </label>

            {/* Cuatro casillas, una por letra, porque el código tiene exactamente
                cuatro y así el niño ve cuántas le faltan sin contar.
                Debajo hay UN SOLO campo real y transparente: así el teclado, el
                pegado y el lector de pantalla siguen funcionando como en
                cualquier formulario. Las casillas son puro dibujo. */}
            <div className="relative mt-5">
              <input
                id="code"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  if (v.length <= 4 && ALLOWED.test(v)) setCode(v);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                // En táctil el foco automático abre el teclado antes de que el
                // niño haya visto la pantalla y le tapa la mitad. Ahí el campo
                // se enfoca cuando toca las casillas.
                autoFocus={!COARSE_POINTER}
                inputMode="text"
                maxLength={4}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute inset-0 z-10 w-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none"
                aria-describedby={error ? 'code-error' : undefined}
              />
              {/* El indicador de foco es la casilla activa, no un recuadro
                  alrededor del grupo: encerrar las cuatro en una caja negra
                  señalaba el sitio equivocado y tapaba el dibujo. */}
              <div aria-hidden className="pointer-events-none flex justify-center gap-2 sm:gap-3">
                {[0, 1, 2, 3].map((i) => {
                  const filled = Boolean(code[i]);
                  const active = focused && i === code.length;
                  return (
                    <span
                      key={i}
                      // Cuatro casillas de 60 px más sus espacios no caben en
                      // un celular de 320–360 px de ancho: se salían de la
                      // tarjeta. En celular bajan a 52 px.
                      className={`flex h-16 w-[52px] items-center justify-center rounded-md border-2 text-h1 font-extrabold transition-colors sm:h-[72px] sm:w-[60px] ${
                        active
                          ? 'border-brand bg-white outline outline-[3px] outline-offset-2 outline-brand'
                          : filled
                            ? 'border-brand bg-brand-soft text-ink'
                            : 'border-dashed border-line bg-white'
                      }`}
                    >
                      {code[i] ?? ''}
                    </span>
                  );
                })}
              </div>
            </div>

            {error && (
              <p id="code-error" role="alert" className="mt-4 text-center text-body text-alert">
                {error}
              </p>
            )}

            <div className="mt-6">
              <Button full type="submit" disabled={code.length !== 4 || loading}>
                {loading ? 'Buscando…' : 'Entrar'}
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <ReadAloudButton text={speech} />
            <Link
              to="/profe"
              className="flex min-h-touch items-center rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
            >
              Soy profe
            </Link>
            {/* Para proyectar en el salón: abre un QR que lleva a esta página. */}
            <Link
              to="/qr"
              className="flex min-h-touch items-center rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
            >
              Código QR
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
