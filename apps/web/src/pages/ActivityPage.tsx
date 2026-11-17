// =============================================================================
// Pantalla de actividad. Despacha según el TIPO de actividad:
//
//   tutor_socratico   → Eje B · diálogo en vivo con Nati (o árbol pregrabado)
//   comparacion       → Eje A · el niño predice, luego compara con la máquina
//   clasificacion     → Ejes A y C · ¿real o hecho por IA? con justificación
//   dilema_ramificado → Eje D · elegir, ver consecuencias, argumentar
//   constructor_instrucciones → Eje B · armar una pregunta con bloques (sin red)
//   taller_instrucciones      → Eje B · escribir la pregunta y que Nati la revise
//
// Los tres últimos se corrigen en el dispositivo: funcionan sin conexión y sin
// consumir un solo token. Solo el Eje B necesita red.
//
// Flujo común: intro → actividad → cierre metacognitivo (obligatorio) → resultado.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type ActivityDetail, type TutorTurn, type TutorPayloadDTO } from '../lib/api';
import { useApp } from '../lib/store';
import { uuid } from '../lib/uuid';
import { StudentShell } from '../components/AppShell';
import { AIDisclosure } from '../components/AIDisclosure';
import { LLMChat, type ChatMessage } from '../components/LLMChat';
import { MetacognitionPrompt } from '../components/MetacognitionPrompt';
import { Button, ErrorState, Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { Emblem } from '../components/Emblem';
import {
  ComparisonActivity,
  type ComparisonPayload,
} from '../components/activities/ComparisonActivity';
import {
  ClassificationActivity,
  type ClassificationPayload,
} from '../components/activities/ClassificationActivity';
import { DilemmaActivity, type DilemmaPayload } from '../components/activities/DilemmaActivity';
import {
  PromptBuilderActivity,
  type PromptBuilderPayload,
} from '../components/activities/PromptBuilderActivity';
import {
  PromptWorkshopActivity,
  type PromptWorkshopPayload,
} from '../components/activities/PromptWorkshopActivity';

type Stage = 'intro' | 'dialogo' | 'metacognicion' | 'resultado';

/** Fila de «lo que hiciste bien». La marca es una palomita dibujada, no el
 *  carácter ✔: ese carácter no existe en muchas fuentes y el navegador lo
 *  sustituye por otra —de otro peso y otro color— rompiendo la lista. */
function Did({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1 text-ok">
        <Icon name="check" size={18} />
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Resultado de la actividad, sea cual sea su tipo. Es lo que se envía al
 *  cerrar el intento y lo que alimenta el dominio (BKT). */
interface Outcome {
  isCorrect: boolean;
  hintsUsed: number;
  hasValidJustification: boolean;
  /** North Star Metric (ISVI): el estudiante enunció y registró un método
   *  PROPIO de comprobación. Definición estricta en docs/14 §5.1.
   *
   *  NO se usa para ninguna otra cosa. Reutilizarla como bandera genérica de
   *  «hizo algo bien» convertiría la métrica principal del piloto en ruido. */
  independentVerification: boolean;
  /** Señal del eje D, contabilizada aparte. No es verificación. */
  changedMind?: boolean;
  note?: string;
}

const SUBJECT: Record<string, { icon: IconName; label: string }> = {
  matematicas: { icon: 'calculator', label: 'Matemáticas' },
  lenguaje: { icon: 'book', label: 'Lenguaje' },
  ciencias: { icon: 'flask', label: 'Ciencias' },
};

export function ActivityPage() {
  const { activityId = '' } = useParams();
  const nav = useNavigate();
  const student = useApp((s) => s.student);
  const online = useApp((s) => s.online);

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('intro');

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [choices, setChoices] = useState<TutorTurn['choices']>(undefined);
  const [thinking, setThinking] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [turns, setTurns] = useState(0);

  // En celular y en tableta vertical el problema y la conversación no caben
  // lado a lado: van en dos pestañas. Se empieza por el problema, que hay que
  // leer antes de conversar.
  const [tab, setTab] = useState<'problema' | 'chat'>('problema');
  const verifRef = useRef<HTMLTextAreaElement>(null);

  // Widget «Mi comprobación»: produce la North Star Metric (ISVI). Visible
  // desde el primer segundo, no al final — sugiere la conducta antes de que
  // el tutor la pida.
  const [verification, setVerification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [badges, setBadges] = useState<Array<{ name: string; description: string }>>([]);

  // Lo que produjo la actividad, sea del tipo que sea.
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const isTutor = activity?.kind === 'tutor_socratico';

  useEffect(() => {
    api
      .get<ActivityDetail>(`/activities/${activityId}`)
      .then(setActivity)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Algo falló.'));
  }, [activityId]);

  const start = useCallback(async () => {
    if (!activity) return;
    try {
      const attempt = await api.post<{ id: string }>(
        `/activities/${activity.id}/attempts`,
        { clientAttemptId: uuid(), mode: navigator.onLine ? 'online' : 'degradado_sin_red' },
      );
      setAttemptId(attempt.id);
      setStage('dialogo');
      if (activity.kind === 'tutor_socratico') {
        setMessages([
          {
            role: 'tutor',
            content: `Hola${student ? ` ${student.firstName}` : ''}. Mira lo que dijo la IA. ¿Tú qué opinas?`,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'No pudimos empezar.');
    }
  }, [activity, student]);

  /** Las actividades sin tutor se corrigen aquí, en el dispositivo, y pasan
   *  directo al cierre metacognitivo. */
  function finishLocal(o: Outcome) {
    setOutcome(o);
    setStage('metacognicion');
  }

  async function sendTurn(text: string, choiceKey?: string) {
    if (!attemptId) return;
    setMessages((m) => [...m, { role: 'estudiante', content: text }]);
    setChoices(undefined);
    setThinking(true);
    try {
      const turn = await api.post<TutorTurn>('/tutor/turn', {
        attemptId,
        clientTurnId: uuid(),
        message: text,
        choiceKey,
      });
      setMessages((m) => [...m, { role: 'tutor', content: turn.content, source: turn.source }]);
      setChoices(turn.choices);
      setDegraded(turn.source === 'fallback_tree');
      setTurns((t) => t + 1);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'tutor',
          content:
            e instanceof ApiError
              ? e.detail
              : 'Algo falló, pero tu avance está guardado. Intenta otra vez.',
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function complete(meta: { text: string; scaffoldTags: string[] }) {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      // En el tutor el resultado se deriva del diálogo; en las demás lo trae
      // el propio componente de actividad.
      const result: Outcome = isTutor
        ? {
            isCorrect: true,
            hintsUsed: degraded ? 1 : 0,
            hasValidJustification: verification.trim().length > 0,
            independentVerification: verification.trim().length > 0,
            note: verification.trim() || undefined,
          }
        : (outcome ?? {
            isCorrect: false,
            hintsUsed: 0,
            hasValidJustification: false,
            independentVerification: false,
          });

      const res = await api.post<{ badgesEarned: Array<{ name: string; description: string }> }>(
        `/attempts/${attemptId}/complete`,
        {
          isCorrect: result.isCorrect,
          hintsUsed: result.hintsUsed,
          hasValidJustification: result.hasValidJustification,
          independentVerification: result.independentVerification,
          verificationNote: result.note,
          metacognition: {
            inputMode: meta.text ? 'texto' : 'opcion_andamiaje',
            text: meta.text,
            scaffoldTags: meta.scaffoldTags,
          },
        },
      );
      setBadges(res.badgesEarned ?? []);
      setStage('resultado');
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'No pudimos guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !activity) return <ErrorState message={error} onRetry={() => nav('/mapa')} />;

  if (!activity) {
    return (
      <StudentShell back="/mapa">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:p-8">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40" />
        </div>
      </StudentShell>
    );
  }

  const payload = activity.payload as TutorPayloadDTO;
  const axis = activity.axisCode.toLowerCase() as 'a' | 'b' | 'c' | 'd';

  // ── Intro: fija la expectativa ANTES de empezar ────────────────────────────
  // La causa principal de frustración con un tutor socrático es esperar una
  // respuesta que nunca llega. Esta pantalla existe para eliminarla — y por eso
  // el aviso cambia según el tipo: prometer un tutor donde no lo hay produce la
  // misma frustración, al revés.
  if (stage === 'intro') {
    const heads: Record<string, { title: string; body: string }> = {
      tutor_socratico: {
        title: 'El tutor NO te va a dar la respuesta.',
        body: 'Te va a hacer preguntas para que la encuentres tú.',
      },
      comparacion: {
        title: 'Primero respondes tú, después ves qué dijo la máquina.',
        body: 'La idea es comparar, no copiar.',
      },
      clasificacion: {
        title: 'Vas a decidir qué es real y qué lo hizo una IA.',
        body: 'Cada vez que decidas, cuéntanos en qué te fijaste.',
      },
      dilema_ramificado: {
        title: 'Aquí no hay una única respuesta correcta.',
        body: 'Vas a elegir y después vas a ver qué pasa en cada camino.',
      },
      constructor_instrucciones: {
        title: 'La IA responde según cómo le preguntes.',
        body: 'Vas a armar la misma pregunta de dos formas y a comparar.',
      },
      taller_instrucciones: {
        title: 'Nati no va a escribir la pregunta por ti.',
        body: 'Tú la escribes y ella te dice qué le falta.',
      },
    };
    const head = heads[activity.kind] ?? heads.tutor_socratico;

    return (
      <StudentShell
        back="/mapa"
        readAloudText={`${activity.title}. ${head.title} ${head.body}`}
      >
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-center sm:p-8">
          <div className="flex justify-center">
            <Emblem axis={activity.axisCode as 'A' | 'B' | 'C' | 'D'} size={64} />
          </div>

          <div>
            <h1 className="text-h1 font-bold">{activity.title}</h1>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-body text-ink-2">
              <span className="flex items-center gap-1.5">
                <Icon name={SUBJECT[activity.subject]?.icon ?? 'book'} size={18} />
                {SUBJECT[activity.subject]?.label ?? activity.subject}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={18} />
                {activity.estimatedMinutes} min
              </span>
            </p>
          </div>

          {/* Este aviso lo escribe la aplicación, NO un modelo. Antes se pintaba
              con el color y el icono `ai`, que están reservados para marcar
              salida de máquina (§7.3): usarlos aquí gastaba la única señal
              ética del producto en un texto que no la necesitaba. */}
          <div className="rounded-lg border-2 border-brand bg-brand-soft p-4 text-left sm:p-5">
            <p className="text-body-lg font-bold">{head.title}</p>
            <p className="mt-1.5 text-body">{head.body}</p>
          </div>

          <Button axis={axis} full onClick={start}>
            Empezar
          </Button>
        </div>
      </StudentShell>
    );
  }

  // ── Actividades sin tutor: se corrigen en el dispositivo ───────────────────
  if (stage === 'dialogo' && !isTutor) {
    return (
      <StudentShell back="/mapa" title={activity.title} attemptId={attemptId ?? undefined}>
        {activity.kind === 'constructor_instrucciones' && (
          <PromptBuilderActivity
            payload={activity.payload as unknown as PromptBuilderPayload}
            onFinish={({ checkedCorrectly }) =>
              finishLocal({
                isCorrect: true,
                hintsUsed: checkedCorrectly ? 0 : 1,
                // Justificó al elegir cómo comprobar lo que dijo la IA.
                hasValidJustification: checkedCorrectly,
                independentVerification: false,
              })
            }
          />
        )}

        {activity.kind === 'taller_instrucciones' && (
          <PromptWorkshopActivity
            payload={activity.payload as unknown as PromptWorkshopPayload}
            onFinish={({ completed, total, reviews }) =>
              finishLocal({
                isCorrect: completed >= Math.ceil(total / 2),
                hintsUsed: Math.max(0, reviews - total),
                hasValidJustification: completed > 0,
                independentVerification: false,
              })
            }
          />
        )}
        {activity.kind === 'comparacion' && (
          <ComparisonActivity
            payload={activity.payload as unknown as ComparisonPayload}
            onFinish={({ correct, total }) =>
              finishLocal({
                isCorrect: correct >= Math.ceil(total / 2),
                hintsUsed: 0,
                // En el eje A no se exige justificación por señal: la
                // comparación misma es la evidencia.
                hasValidJustification: true,
                independentVerification: false,
              })
            }
          />
        )}

        {activity.kind === 'clasificacion' && (
          <ClassificationActivity
            payload={activity.payload as unknown as ClassificationPayload}
            onFinish={({ correct, total, hintsUsed, validJustifications }) =>
              finishLocal({
                isCorrect:
                  correct >= ((activity.payload as unknown as ClassificationPayload).minCorrect ?? Math.ceil(total / 2)),
                hintsUsed,
                // Regla US-02: un acierto sin señal válida no cuenta para el
                // dominio. Aquí es donde se decide.
                hasValidJustification: validJustifications >= Math.ceil(total / 2),
                independentVerification: false,
              })
            }
          />
        )}

        {activity.kind === 'dilema_ramificado' && (
          <DilemmaActivity
            payload={activity.payload as unknown as DilemmaPayload}
            onFinish={({ argument, changedMind }) =>
              finishLocal({
                // Un dilema no se acierta. Se registra que argumentó.
                isCorrect: argument.length > 0,
                hintsUsed: 0,
                hasValidJustification: argument.length >= 15,
                // Falso siempre: aquí no hay comprobación de una afirmación.
                independentVerification: false,
                changedMind: changedMind === true,
                note: argument,
              })
            }
          />
        )}
      </StudentShell>
    );
  }

  // ── Diálogo ────────────────────────────────────────────────────────────────
  if (stage === 'dialogo') {
    const TABS = [
      { key: 'problema', label: 'El problema', icon: 'book' },
      { key: 'chat', label: 'Tu conversación', icon: 'message' },
    ] as const;

    return (
      <StudentShell
        back="/mapa"
        title={activity.title}
        attemptId={attemptId ?? undefined}
        hideBottomBar
        fill
        readAloudText={`${payload.problem}. La IA respondió: ${payload.aiAnswer}`}
      >
        {/* Desde 1024 px: dos columnas, el problema fijo a la izquierda y la
            conversación a la derecha.

            Por debajo no caben juntos. Apilados, el problema se quedaba con
            toda la pantalla y a la conversación le quedaba una franja de un
            dedo de alto, así que van en dos pestañas que ocupan la pantalla
            completa, cada una con su propio scroll. */}
        <div className="flex h-full flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
          <div
            role="tablist"
            aria-label="Partes de la actividad"
            className="flex shrink-0 border-b border-line lg:hidden"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex min-h-touch flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] px-1 text-small font-bold transition-colors sm:gap-2 ${
                  tab === t.key ? 'border-brand text-brand' : 'border-transparent text-ink-2'
                }`}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
          </div>

          {/* El problema queda fijo: el niño no debe hacer scroll para recordar
              el enunciado. La carga cognitiva va al razonamiento. */}
          <section
            id="panel-problema"
            role="tabpanel"
            aria-labelledby="tab-problema"
            className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 lg:block lg:border-r lg:border-line ${
              tab === 'problema' ? '' : 'hidden'
            }`}
          >
            <h2 className="hidden text-small font-bold text-ink-3 lg:block">El problema</h2>
            <p className="prose-block whitespace-pre-line text-body-lg">{payload.problem}</p>

            <AIDisclosure>{payload.aiAnswer}</AIDisclosure>

            {/* Solo con pestañas: el paso a la conversación tiene que verse sin
                que el niño descubra que la otra pestaña existe. */}
            <div className="lg:hidden">
              <Button axis={axis} full onClick={() => setTab('chat')}>
                {turns === 0 ? 'Conversar con el tutor' : 'Volver a la conversación'}
              </Button>
            </div>

            <div>
              <label
                htmlFor="verif"
                className="flex items-center gap-2 text-body font-semibold"
              >
                <Icon name="pen" size={18} />
                Mi comprobación
              </label>
              <p className="mb-2 text-small text-ink-2">
                Escribe cómo lo comprobaste tú, sin la IA.
              </p>
              <textarea
                id="verif"
                ref={verifRef}
                value={verification}
                onChange={(e) => setVerification(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Yo lo comprobé…"
                className="w-full rounded-md border-2 border-line p-3 text-body transition-colors focus:border-brand"
              />
            </div>

            <Button
              variant="secondary"
              full
              disabled={turns < 2}
              disabledReason={
                turns < 2 ? 'Conversa un poco más con el tutor antes de terminar.' : undefined
              }
              onClick={() => setStage('metacognicion')}
            >
              Terminar la actividad
            </Button>
          </section>

          <section
            id="panel-chat"
            role="tabpanel"
            aria-labelledby="tab-chat"
            className={`min-h-0 flex-1 flex-col lg:flex ${tab === 'chat' ? 'flex' : 'hidden'}`}
          >
            <h2 className="hidden border-b border-line px-6 py-3 text-small font-bold text-ink-3 lg:block">
              Tu conversación
              {/* La causa de la degradación importa. El tutor puede estar
                  sirviendo el árbol pregrabado por falta de red, por
                  presupuesto agotado o por modo demostración; solo la primera
                  se le cuenta al niño. Decirle «sin internet» cuando sí hay
                  conexión es mentirle. */}
              {!online && (
                <span className="ml-2 font-normal normal-case text-ink-3">· sin internet</span>
              )}
            </h2>
            <div className="min-h-0 flex-1">
              <LLMChat
                messages={messages}
                avatarKey={student?.avatarKey ?? 'nati'}
                thinking={thinking}
                choices={choices}
                degraded={degraded}
                offline={!online}
                onSend={(t) => sendTurn(t)}
                onChoose={(key, label) => sendTurn(label, key)}
                visible={tab === 'chat'}
                footer={
                  // Con pestañas, «Terminar» vive en la otra, junto a «Mi
                  // comprobación». Este botón lleva allá en vez de terminar
                  // desde aquí: si se pudiera cerrar la actividad sin pasar por
                  // la comprobación, casi nadie la escribiría, y es justo la
                  // conducta que la actividad busca.
                  turns >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('problema');
                        requestAnimationFrame(() => {
                          verifRef.current?.scrollIntoView({ block: 'center' });
                          verifRef.current?.focus({ preventScroll: true });
                        });
                      }}
                      className="flex min-h-touch w-full items-center justify-center gap-2 rounded-md border-2 border-line bg-white px-4 text-body font-semibold text-ink active:bg-surf lg:hidden"
                    >
                      <Icon name="pen" size={18} />
                      Escribir mi comprobación
                    </button>
                  )
                }
              />
            </div>
          </section>
        </div>
      </StudentShell>
    );
  }

  // ── Cierre metacognitivo — obligatorio ─────────────────────────────────────
  if (stage === 'metacognicion') {
    return (
      <StudentShell hideBottomBar>
        <MetacognitionPrompt
          question={activity.metacognition.question}
          scaffolds={activity.metacognition.scaffolds}
          onSubmit={complete}
          submitting={submitting}
        />
      </StudentShell>
    );
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  // Retroalimentación sobre PROCESOS, no resultados: es la diferencia entre
  // reforzar mentalidad de crecimiento y reforzar la búsqueda de la respuesta
  // correcta, que es el hábito que este producto combate.
  return (
    <StudentShell hideBottomBar readAloudText="Lo lograste.">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-center sm:p-8">
        {/* El sello del eje, no una medalla: lo que se celebra es haber
            trabajado en «Detective de IA», no haber ganado un premio. */}
        <div className="seal-in flex justify-center">
          <Emblem axis={activity.axisCode as 'A' | 'B' | 'C' | 'D'} size={88} />
        </div>
        <h1 className="text-h1 font-bold">¡Lo lograste!</h1>

        {badges.map((b) => (
          <div
            key={b.name}
            className="flex items-center gap-3 rounded-lg border-2 border-eje-b bg-eje-b-soft p-4 text-left sm:gap-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-eje-b">
              <Icon name="award" size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-body-lg font-bold text-eje-b">Nuevo logro: {b.name}</p>
              <p className="text-body text-ink-2">{b.description}</p>
            </div>
          </div>
        ))}

        <div className="space-y-2 text-left">
          <h2 className="text-body font-bold">Lo que hiciste bien</h2>
          <ul className="space-y-1.5 text-body text-ink-2">
            {isTutor && <Did>No aceptaste la respuesta de la IA sin revisarla</Did>}
            {isTutor && verification.trim() && (
              <Did>Encontraste una forma de comprobarlo tú mismo</Did>
            )}
            {activity.kind === 'comparacion' && (
              <Did>Diste tu respuesta antes de ver la de la máquina</Did>
            )}
            {activity.kind === 'clasificacion' && (
              <>
                <Did>Miraste con cuidado antes de decidir</Did>
                {outcome?.hasValidJustification && (
                  <Did>Explicaste en qué señal te fijaste</Did>
                )}
              </>
            )}
            {activity.kind === 'dilema_ramificado' && (
              <>
                <Did>Tomaste una decisión y la argumentaste</Did>
                {outcome?.changedMind && <Did>Cambiaste de idea al ver las consecuencias</Did>}
              </>
            )}
            {activity.kind === 'constructor_instrucciones' && (
              <>
                <Did>Viste que la misma IA responde distinto según la pregunta</Did>
                {outcome?.hasValidJustification && <Did>Supiste cómo comprobar lo que dijo</Did>}
              </>
            )}
            {activity.kind === 'taller_instrucciones' && (
              <>
                <Did>Escribiste tus propias instrucciones</Did>
                {outcome?.isCorrect && <Did>Les pusiste los tres ingredientes</Did>}
              </>
            )}
          </ul>

          <h2 className="pt-4 text-body font-bold">Para la próxima</h2>
          <p className="text-body text-ink-2">
            {isTutor && 'Intenta explicar con tus palabras por qué estaba mal.'}
            {activity.kind === 'comparacion' &&
              'Fíjate en qué se apoya la máquina para adivinar.'}
            {activity.kind === 'clasificacion' &&
              'Ninguna señal funciona sola: busca dos.'}
            {activity.kind === 'dilema_ramificado' &&
              'Piensa a quién le afecta tu decisión, además de a ti.'}
            {activity.kind === 'constructor_instrucciones' &&
              'Antes de preguntarle a una IA, piensa para quién y cómo lo quieres.'}
            {activity.kind === 'taller_instrucciones' &&
              'Después de pedir, revisa: ese ingrediente es solo tuyo.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button axis={axis} variant="secondary" full="mobile" onClick={() => nav('/mapa')}>
            Volver al mapa
          </Button>
          <Button axis={axis} full="mobile" onClick={() => nav(`/eje/${activity.axisCode}`)}>
            Siguiente actividad
          </Button>
        </div>
      </div>
    </StudentShell>
  );
}
