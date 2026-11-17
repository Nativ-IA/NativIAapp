// =============================================================================
// Código QR de la aplicación (/qr).
//
// Para proyectar en el salón o pasar por chat: el QR lleva a la portada de
// ESTA misma dirección, sea cual sea —la demo en la nube, el enlace público de
// `pnpm demo:movil` o la dirección del computador en la red—. No hay nada que
// configurar: se calcula con la dirección desde la que se abrió la página.
//
// El código se dibuja en el dispositivo (qrcode-generator, sin red): no se le
// envía la dirección a ningún servicio externo de códigos QR.
// =============================================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import qrcode from 'qrcode-generator';
import { Mark } from '../components/Logo';
import { Icon } from '../components/Icon';

/** Margen en blanco alrededor del código, en módulos. El estándar pide 4:
 *  con menos, algunas cámaras no lo reconocen. */
const QUIET = 4;
const INK = '#16202B';

function useQr(text: string) {
  return useMemo(() => {
    // Nivel M: tolera un 15 % de daño (reflejos del proyector, una foto
    // torcida) sin volver el código más denso de lo necesario.
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return { n, d, isDark: (r: number, c: number) => qr.isDark(r, c) };
  }, [text]);
}

const action =
  'flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-line bg-white px-4 text-small font-semibold text-ink transition-colors hover:border-ink-3 active:bg-surf';

export function QrPage() {
  const url = `${window.location.origin}/`;
  const qr = useQr(url);
  const [copied, setCopied] = useState(false);

  const host = window.location.hostname;
  const soloEsteEquipo = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Sin HTTPS no hay portapapeles: el texto queda seleccionable en pantalla.
      setCopied(false);
    }
  }

  function download() {
    const size = 1024;
    const total = qr.n + QUIET * 2;
    const cell = Math.floor(size / total);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = cell * total;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = INK;
    for (let r = 0; r < qr.n; r++) {
      for (let c = 0; c < qr.n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + QUIET) * cell, (r + QUIET) * cell, cell, cell);
      }
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nativia-qr.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }

  return (
    <div className="screen pb-safe flex flex-col bg-surf">
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3">
            <Mark className="h-10 w-10 shrink-0 text-brand" />
            <p className="text-h1 font-extrabold tracking-tight text-ink">
              Nativ<span className="text-brand">IA</span>
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-line bg-white px-4 py-6 text-center sm:px-6 sm:py-7">
            <h1 className="text-h2 font-bold">Abre NativIA en tu celular</h1>
            <p className="mt-1 text-body text-ink-2">
              Apunta la cámara a este código y toca el enlace que aparece.
            </p>

            {/* Blanco puro y tinta casi negra: es el contraste que las cámaras
                leen mejor, también desde el fondo del salón. */}
            <div className="mx-auto mt-5 w-full max-w-[340px] rounded-md border border-line bg-white p-1">
              <svg
                viewBox={`${-QUIET} ${-QUIET} ${qr.n + QUIET * 2} ${qr.n + QUIET * 2}`}
                className="block h-auto w-full"
                shapeRendering="crispEdges"
                role="img"
                aria-label={`Código QR que abre ${url}`}
              >
                <rect
                  x={-QUIET}
                  y={-QUIET}
                  width={qr.n + QUIET * 2}
                  height={qr.n + QUIET * 2}
                  fill="#fff"
                />
                <path d={qr.d} fill={INK} />
              </svg>
            </div>

            <p className="mt-4 select-all break-all font-mono text-small font-semibold text-ink">
              {url}
            </p>

            {soloEsteEquipo && (
              <p
                role="note"
                className="mt-4 flex items-start gap-2 rounded-md border-2 border-warn bg-eje-c-soft p-3 text-left text-small"
              >
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>
                  Abriste esta página con <strong>localhost</strong>: este código solo funciona en
                  este computador. Ábrela con el enlace público o con la dirección de la red para
                  que sirva en otros dispositivos.
                </span>
              </p>
            )}

            {/* Celular: un botón por fila, a todo lo ancho. Desde tableta: dos
                columnas, y «Compartir» —que solo existe donde el sistema lo
                ofrece— ocupa la fila de abajo. */}
            <div className="mt-5 grid gap-2 sm:grid-cols-2 print:hidden">
              <button type="button" onClick={copy} className={action}>
                <Icon name={copied ? 'check' : 'copy'} size={18} />
                {copied ? 'Enlace copiado' : 'Copiar enlace'}
              </button>
              <button type="button" onClick={download} className={action}>
                <Icon name="download" size={18} />
                Descargar QR
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={() => {
                    navigator
                      .share({ title: 'NativIA', text: 'Abre NativIA en tu celular', url })
                      .catch(() => {});
                  }}
                  className={`${action} sm:col-span-2`}
                >
                  <Icon name="share" size={18} />
                  Compartir
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 text-center print:hidden">
            <Link
              to="/"
              className="inline-flex min-h-touch items-center gap-1.5 rounded-sm px-3 text-small font-semibold text-ink-2 hover:bg-white"
            >
              <Icon name="arrow-left" size={18} />
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
