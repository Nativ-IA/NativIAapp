// =============================================================================
// Actividades de los ejes A, C y D.
//
// Las tres funcionan SIN CONSUMIR UN SOLO TOKEN y sin conexión: validación
// determinística en el cliente y contenido curado. Es la decisión que hace
// viable el techo de USD $2 por estudiante-mes.
//
// Fichas completas en docs/08-content-blueprint.md.
// =============================================================================

import type {
  Activity,
  ComparisonPayload,
  ClassificationPayload,
  DilemmaPayload,
} from '../types.js';

// ── A1 · La máquina que adivina ──────────────────────────────────────────────

const a1Payload: ComparisonPayload = {
  intro:
    'Vas a competir con una máquina. Los dos van a adivinar qué número sigue.',
  rounds: [
    {
      id: 'ronda1',
      prompt: '2, 4, 6, 8, ¿qué número sigue?',
      aiAnswer: '10',
      truth: '10',
      question: '¿La máquina acertó?',
      options: [
        { key: 'si', label: 'Sí, acertó', isCorrect: true },
        { key: 'no', label: 'No, se equivocó', isCorrect: false },
      ],
      explanation:
        'Acertó. La máquina miró que los números iban de dos en dos y siguió ese camino.',
    },
    {
      id: 'ronda2',
      prompt: '2, 4, 6, 9, 11, 13, ¿qué número sigue?',
      aiAnswer: '15',
      truth: '16',
      question: '¿Por qué crees que la máquina se equivocó?',
      options: [
        {
          key: 'cambio',
          label: 'Porque el patrón cambió y ella siguió el de antes',
          isCorrect: true,
        },
        { key: 'tonta', label: 'Porque la máquina es tonta', isCorrect: false },
        { key: 'danada', label: 'Porque está dañada', isCorrect: false },
        { key: 'azar', label: 'Porque adivinó al azar', isCorrect: false },
      ],
      explanation:
        'La máquina mira lo que pasó antes para adivinar lo que sigue. Aquí el camino cambió a mitad, y ella siguió el viejo.',
    },
  ],
  closing:
    'La máquina adivina mirando lo que pasó antes. Cuando algo cambia, se equivoca. Por eso tú la revisas.',
};

export const a1MaquinaAdivina: Activity = {
  slug: 'la-maquina-que-adivina',
  title: 'La máquina que adivina',
  axisCode: 'A',
  subject: 'matematicas',
  grade: 3,
  kind: 'comparacion',
  orderIndex: 1,
  estimatedMinutes: 8,
  pisaCompetence: 'MAT.formular',
  dbaReference: 'MAT.3.2', // [VERIFICAR — DBA]
  bloomLevel: 'comprender',
  payload: a1Payload,
  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};

// ── C3 · El animal que no existe ─────────────────────────────────────────────

// IMPORTANTE — por qué esta versión es de texto y no de imágenes.
//
// La ficha original (docs/08 §C3) pedía seis animales CON IMAGEN y enseñaba
// señales visuales: manos deformadas, iluminación inconsistente, texturas
// repetidas, fondos que se disuelven. Esas señales son inaplicables sobre un
// párrafo: preguntarle a un niño si «la luz no coincide» en un texto no enseña
// nada, lo confunde.
//
// Las imágenes están bloqueadas por producción de activos, no por código
// (ver docs/08 §C3, «Producción de activos»). Mientras tanto, esta versión
// enseña la mitad TEXTUAL de la competencia, que es coherente y verificable:
// afirmaciones imposibles, hábitats que no corresponden, mezclas absurdas.
//
// El componente ya soporta `mediaUrl`; añadir las imágenes será un cambio de
// contenido, no de código. Y una prueba impide volver a declarar señales
// visuales sin imágenes.
const c3Payload: ClassificationPayload = {
  signalKind: 'texto',
  prompt:
    'Aquí hay seis fichas de animales. Algunas dicen cosas ciertas y otras las inventó una IA. Léelas con cuidado: ¿cuáles son cuáles?',
  signals: [
    { key: 'imposible', label: 'Dice algo que no puede ser cierto' },
    { key: 'habitat', label: 'Dice que vive donde ese animal no vive' },
    { key: 'mezcla', label: 'Mezcla cosas que no van juntas' },
    { key: 'vago', label: 'Suena bonito pero no dice nada concreto' },
    { key: 'nunca_oido', label: 'Nunca he oído hablar de ese animal' },
  ],
  items: [
    {
      id: 'oso',
      content:
        'Oso de anteojos. Vive en los bosques de montaña de los Andes colombianos. Come plantas, frutas y a veces insectos.',
      isSynthetic: false,
      hints: ['Mira si lo que dice coincide con lo que sabes de los Andes.'],
      validSignals: [],
    },
    {
      id: 'condor',
      content:
        'Cóndor de los Andes. Es una de las aves voladoras más grandes del mundo. Planea aprovechando las corrientes de aire.',
      isSynthetic: false,
      hints: ['Fíjate si algo de esta descripción es imposible.'],
      validSignals: [],
    },
    {
      id: 'delfin',
      content:
        'Delfín rosado. Vive en los ríos de la Amazonía y la Orinoquía. Su color rosado se nota más cuando es adulto.',
      isSynthetic: false,
      hints: ['Piensa si has oído hablar de este animal.'],
      validSignals: [],
    },
    {
      id: 'rana',
      content:
        'Rana dorada. Vive en el Pacífico colombiano. Su piel tiene una sustancia que la protege de otros animales.',
      isSynthetic: false,
      hints: ['Revisa si el lugar donde vive tiene sentido.'],
      validSignals: [],
    },
    {
      id: 'inventado',
      content:
        'Zorro andino de cresta azul. Habita en los páramos por encima de los 5.000 metros. Sus ocho garras retráctiles le permiten trepar rocas heladas durante la noche polar colombiana.',
      isSynthetic: true,
      hints: [
        'Cuenta las garras. ¿Es normal ese número en un zorro?',
        'En Colombia no hay noche polar. Revisa esa parte.',
      ],
      validSignals: ['imposible', 'habitat', 'nunca_oido'],
    },
    {
      // El animal SÍ existe; lo falso es lo que se dice de él. Es la lección
      // más importante de la actividad y la más explotada en desinformación:
      // que el sujeto sea real no hace real la afirmación.
      id: 'animal_real_texto_falso',
      content:
        'Colibrí. Esta ave migra cada invierno desde Colombia hasta la Antártida, donde pasa tres meses alimentándose de peces pequeños.',
      isSynthetic: true,
      hints: [
        'Este animal sí existe. Pero lee con cuidado lo que dice de él.',
        '¿Un colibrí come peces? ¿Llega hasta la Antártida?',
      ],
      validSignals: ['imposible', 'habitat', 'mezcla'],
    },
  ],
  minCorrect: 5,
};

export const c3AnimalNoExiste: Activity = {
  slug: 'el-animal-que-no-existe',
  title: 'El animal que no existe',
  axisCode: 'C',
  subject: 'ciencias',
  grade: 4,
  kind: 'clasificacion',
  orderIndex: 1,
  estimatedMinutes: 10,
  pisaCompetence: 'CIE.explicar_fenomenos',
  dbaReference: 'CIE.4.3', // [VERIFICAR — DBA]
  bloomLevel: 'analizar',
  payload: c3Payload,
  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};

// ── D1 · La tarea de mi hermanita ────────────────────────────────────────────

const d1Payload: DilemmaPayload = {
  situation:
    'Tu hermanita de 2.º tiene que escribir un cuento para mañana. Está llorando porque no se le ocurre nada. Tú sabes usar la IA.',
  question: '¿Qué haces?',
  options: [
    {
      key: 'A',
      label: 'Le pido a la IA que escriba el cuento y se lo doy.',
      consequence:
        'Al día siguiente la profesora le pregunta cómo se le ocurrió esa idea. Tu hermanita se queda callada. No sabe qué responder.',
      followUp: '¿Qué aprendió tu hermanita hoy?',
    },
    {
      key: 'B',
      label: 'Le pido ideas a la IA y ella escribe con sus palabras.',
      consequence:
        'Le cuesta y demora, pero termina un cuento suyo. Cuando la profesora pregunta, ella cuenta de dónde salió la idea y cómo la cambió.',
      followUp: '¿En qué se diferencia esto de la primera opción?',
    },
    {
      key: 'C',
      label: 'La ayudo yo, sin usar la IA.',
      consequence:
        'Se demoran más y se les hace tarde, pero ella escribe su cuento y tú entiendes qué le costaba.',
      followUp: '¿Es muy distinto de la opción B? ¿Por qué?',
    },
    {
      key: 'D',
      label: 'Le digo que le pregunte a la profe mañana.',
      consequence:
        'Llega sin tarea. La profesora se sienta con ella y la ayuda a empezar. Le va bien, pero pasó la noche angustiada.',
      followUp: '¿Fue justo con ella?',
    },
  ],
  closing:
    'No hay una única respuesta correcta. Ahora que viste qué pasó en cada camino: ¿cambiarías tu decisión?',
};

export const d1TareaHermanita: Activity = {
  slug: 'la-tarea-de-mi-hermanita',
  title: 'La tarea de mi hermanita',
  axisCode: 'D',
  subject: 'matematicas',
  grade: 4,
  kind: 'dilema_ramificado',
  orderIndex: 1,
  estimatedMinutes: 12,
  pisaCompetence: 'MAT.formular',
  dbaReference: 'CIU.4.1', // [VERIFICAR — DBA]
  bloomLevel: 'evaluar',
  payload: d1Payload,
  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};
