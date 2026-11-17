import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from './ui';
import { Icon } from './Icon';
import type { TutorTurn } from '../lib/api';

export interface ChatMessage {
  role: 'tutor' | 'estudiante';
  content: string;
  source?: TutorTurn['source'];
}

export function LLMChat({
  messages,
  avatarKey,
  thinking,
  choices,
  degraded,
  offline,
  onSend,
  onChoose,
  footer,
  visible = true,
}: {
  messages: ChatMessage[];
  avatarKey: string;
  thinking: boolean;
  /** Presentes solo en modo degradado: sin LLM no hay comprensión de texto
   *  libre, y ofrecer un campo abierto que nadie interpreta sería peor que no
   *  ofrecerlo (ADR-005). */
  choices?: Array<{ key: string; label: string }>;
  /** El tutor está sirviendo el árbol pregrabado, por la razón que sea. */
  degraded: boolean;
  /** El dispositivo NO tiene red. Es la única causa de degradación que se le
   *  explica al niño; las otras (presupuesto, modo demostración) son asunto
   *  del docente. */
  offline: boolean;
  onSend: (text: string) => void;
  onChoose: (key: string, label: string) => void;
  /** Acción extra bajo el campo de respuesta (la pone la pantalla). */
  footer?: ReactNode;
  /** Falso mientras la conversación está en una pestaña oculta. Al volver a
   *  mostrarse baja sola hasta el último mensaje. */
  visible?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thinking, visible]);

  const showComposer = !degraded && (!choices || choices.length === 0);

  return (
    <div className="flex h-full flex-col">
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4"
        role="log"
        aria-live="polite"
        aria-label="Tu conversación con el tutor"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 sm:gap-3 ${m.role === 'estudiante' ? 'flex-row-reverse' : ''}`}
          >
            <div className="shrink-0">
              {m.role === 'tutor' ? (
                <Avatar avatarKey="nati" size="sm" label="tutor Nati" />
              ) : (
                <Avatar avatarKey={avatarKey} size="sm" label="tú" />
              )}
            </div>
            {/* Nati habla en cian de marca, no en verde de eje: es la misma voz
                desde cualquier pantalla, y así el niño la distingue de sus
                propios mensajes y del color del eje en el que está. */}
            <p
              className={`min-w-0 max-w-[82%] break-words px-4 py-3 text-body ${
                m.role === 'tutor'
                  ? 'rounded-lg rounded-tl-sm bg-brand-soft text-ink'
                  : 'rounded-lg rounded-tr-sm bg-surf text-ink'
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-3">
            <Avatar avatarKey="nati" size="sm" label="tutor Nati" />
            <span
              className="flex gap-1.5 rounded-lg rounded-tl-sm bg-brand-soft px-4 py-4"
              aria-label="El tutor está pensando"
            >
              <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
              <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
              <span className="thinking-dot h-2 w-2 rounded-full bg-brand" />
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Es lo último de la pantalla: se aparta de la barra de inicio de iOS. */}
      <div className="shrink-0 space-y-3 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {choices && choices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <button
                key={c.key}
                onClick={() => onChoose(c.key, c.label)}
                disabled={thinking}
                className="min-h-touch rounded-md border-2 border-brand px-4 py-1.5 text-left text-body font-semibold text-brand transition-colors hover:bg-brand-soft active:bg-brand-soft disabled:opacity-50"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {showComposer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text || thinking) return;
              onSend(text);
              setDraft('');
            }}
            className="flex gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Escribe tu respuesta
            </label>
            <input
              id="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              // 300 caracteres: evita pegar el enunciado completo para que el
              // modelo lo resuelva.
              maxLength={300}
              placeholder="Escribe aquí…"
              disabled={thinking}
              autoComplete="off"
              enterKeyHint="send"
              className="min-h-touch-lg min-w-0 flex-1 rounded-md border-2 border-line px-4 text-body transition-colors focus:border-brand"
            />
            <button
              type="submit"
              disabled={thinking || draft.trim().length === 0}
              className="flex min-h-touch-lg min-w-touch shrink-0 items-center justify-center rounded-md bg-brand px-4 text-white sm:px-5 transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
              aria-label="Enviar"
            >
              <Icon name="send" size={22} />
            </button>
          </form>
        )}

        {offline && (!choices || choices.length === 0) && (
          <p className="text-small text-ink-2">
            El tutor necesita internet para conversar contigo. Tu avance está guardado.
          </p>
        )}

        {footer}
      </div>
    </div>
  );
}
