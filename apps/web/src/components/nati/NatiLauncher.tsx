// =============================================================================
// Nati — botón fijo y panel de conversación del asistente (modo ayudante).
//
// Está montado en StudentShell, así que aparece en todas las pantallas del
// estudiante. Dentro de una actividad del eje B se oculta: ahí Nati ya está
// en modo tutora, y abrir el panel sería un atajo a la respuesta.
//
// Preguntas sugeridas en botones: a los 8–9 años escribir cuesta. Las
// respuestas vienen del modelo propio con verificador delante, o de las
// preguntas frecuentes pregrabadas si no hay modelo. Diseño y reglas:
// apps/api/src/modules/nati/README.md.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ApiError, type NatiConfig, type NatiReply } from '../../lib/api';
import { useApp } from '../../lib/store';
import { NatiMark } from '../Emblem';
import { Icon } from '../Icon';
import { Avatar } from '../ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  source?: NatiReply['source'];
}

const HELLO =
  'Hola. Soy Nati, una inteligencia artificial: un programa, no una persona. A veces me equivoco. ¿Qué quieres saber?';

export function NatiLauncher() {
  const student = useApp((s) => s.student);
  const online = useApp((s) => s.online);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<NatiConfig | null>(null);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: HELLO }]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Dentro de una actividad, el tutor manda. El botón se esconde.
  const inActivity = /^\/actividad\//.test(location.pathname);

  useEffect(() => {
    if (!open || cfg || !student) return;
    api.get<NatiConfig>('/nati/config').then(setCfg).catch(() => {});
  }, [open, cfg, student]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thinking]);

  if (!student || inActivity) return null;

  async function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    setMessages((m) => [...m, { role: 'user', content: t }]);
    setDraft('');
    setThinking(true);
    try {
      const history = messages
        .slice(-6)
        .filter((m) => m.content !== HELLO)
        .map((m) => ({ role: m.role, content: m.content }));
      const r = await api.post<NatiReply>('/nati/message', { message: t, history });
      setMessages((m) => [...m, { role: 'assistant', content: r.content, source: r.source }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            e instanceof ApiError && e.code === 'offline'
              ? 'Sin internet no puedo responderte. Prueba más tarde o pregúntale a tu profe.'
              : 'Se me enredaron las ideas. Inténtalo otra vez o pregúntale a tu profe.',
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* Botón fijo: la carita de Nati. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nati-panel"
        aria-label={open ? 'Cerrar a Nati' : 'Hablar con Nati'}
        className="fixed bottom-20 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand bg-white shadow-lg transition-transform hover:scale-105"
      >
        <NatiMark size={44} />
      </button>

      {open && (
        <section
          id="nati-panel"
          role="dialog"
          aria-label="Conversación con Nati"
          className="fixed bottom-40 right-4 z-40 flex h-[min(32rem,calc(100vh-12rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border-2 border-brand bg-white shadow-xl"
        >
          <header className="flex items-center gap-2 border-b border-line bg-brand-soft px-4 py-2.5">
            <NatiMark size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-body font-bold">Nati</p>
              {/* La señal ética del producto: es una máquina, siempre. */}
              <p className="text-micro text-ink-2">Soy una IA. Me puedo equivocar.</p>
            </div>
            {!online && (
              <span className="flex items-center gap-1 text-micro text-ink-3">
                <Icon name="wifi-off" size={14} /> sin conexión
              </span>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="flex min-h-touch min-w-touch items-center justify-center rounded-sm text-ink-2 hover:bg-white"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0">
                  {m.role === 'assistant' ? (
                    <Avatar avatarKey="nati" size="sm" label="Nati" />
                  ) : (
                    <Avatar avatarKey={student.avatarKey} size="sm" label="tú" />
                  )}
                </div>
                <p
                  className={`max-w-[85%] whitespace-pre-line px-3 py-2 text-body ${
                    m.role === 'assistant'
                      ? 'rounded-lg rounded-tl-sm bg-brand-soft'
                      : 'rounded-lg rounded-tr-sm bg-surf'
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2">
                <Avatar avatarKey="nati" size="sm" label="Nati" />
                <span className="flex gap-1.5 rounded-lg rounded-tl-sm bg-brand-soft px-3 py-3" aria-label="Nati está pensando">
                  <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
                  <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
                  <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="space-y-2 border-t border-line p-3">
            {cfg && messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5">
                {cfg.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={thinking}
                    className="min-h-touch rounded-md border-2 border-brand px-3 text-small font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex gap-2"
            >
              <label htmlFor="nati-input" className="sr-only">
                Pregúntale a Nati
              </label>
              <input
                id="nati-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={300}
                placeholder="Pregúntale a Nati…"
                disabled={thinking}
                className="min-h-touch flex-1 rounded-md border-2 border-line px-3 text-body focus:border-brand"
              />
              <button
                type="submit"
                disabled={thinking || draft.trim().length === 0}
                aria-label="Enviar"
                className="flex min-h-touch min-w-touch items-center justify-center rounded-md bg-brand px-4 text-white disabled:opacity-50"
              >
                <Icon name="send" size={20} />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
