// =============================================================================
// B2 · «Arma tu pregunta»
// 4.º · Lenguaje · Eje B · constructor_instrucciones
//
// Enseña la «receta de la buena pregunta» con bloques:
//   1. Qué quiero   2. Para quién o para qué   3. Cómo lo quiero   4. Revisar
//
// Funciona SIN red y SIN tokens: cada combinación de bloques tiene una
// respuesta preparada y revisada (ADR-008). Primero se muestra la respuesta a
// la pregunta vaga, para que el niño vea la diferencia por sí mismo.
//
// Lo que «dijo la IA» se muestra siempre dentro de AIDisclosure.
// =============================================================================

import type { Activity, PromptBuilderPayload } from '../types.js';

const payload: PromptBuilderPayload = {
  intro:
    'Una IA responde según cómo le preguntes. Vas a armar la misma pregunta de dos formas y a comparar.',
  slots: {
    que: [
      { key: 'volcanes', label: 'Explícame los volcanes' },
      { key: 'reciclar', label: 'Dime cómo reciclar en casa' },
    ],
    para_quien: [
      { key: 'cuarto', label: 'para un estudiante de cuarto' },
      { key: 'hermanito', label: 'para mi hermanito de 6 años' },
      { key: 'cartelera', label: 'para una cartelera del salón' },
    ],
    como: [
      { key: 'lista', label: 'en una lista de tres puntos' },
      { key: 'cuento', label: 'como un cuento corto' },
      { key: 'ejemplo', label: 'en dos frases y con un ejemplo' },
    ],
  },

  vagueAnswers: {
    volcanes:
      'Los volcanes son estructuras geológicas formadas por la acumulación de material magmático expulsado a través de fisuras de la litosfera. Se clasifican según su morfología y su tipo de erupción: efusiva, explosiva, estromboliana, pliniana…',
    reciclar:
      'El reciclaje es el proceso de transformación de residuos en nuevos productos mediante cadenas de valorización. Depende de la normativa municipal, los códigos de resinas plásticas (PET, HDPE, PVC, LDPE, PP, PS) y la infraestructura de separación en la fuente…',
  },

  fullAnswers: {
    'volcanes|cuarto|lista':
      '1. Un volcán es una montaña con un hueco por donde sale roca derretida, llamada lava.\n2. La lava viene de muy adentro de la Tierra, donde hace muchísimo calor.\n3. En Colombia hay volcanes, como el Galeras y el Nevado del Ruiz.',
    'volcanes|cuarto|cuento':
      'Debajo de una montaña vivía una roca tan caliente que se había vuelto líquida. Un día empujó hacia arriba, encontró un hueco y salió: así nació una erupción. Cuando la lava se enfrió, la montaña quedó un poquito más alta.',
    'volcanes|cuarto|ejemplo':
      'Un volcán es una montaña con un hueco por donde sale roca derretida, que se llama lava. Por ejemplo, el Nevado del Ruiz, en Colombia, es un volcán que a veces bota ceniza.',
    'volcanes|hermanito|lista':
      '1. Un volcán es una montaña que a veces escupe fuego.\n2. Ese fuego es roca caliente que se vuelve líquida.\n3. Cuando sale, se enfría y se vuelve piedra otra vez.',
    'volcanes|hermanito|cuento':
      'Había una montaña que tenía la barriga llena de sopa de piedras muy, muy caliente. Un día la sopa se le salió por la punta y bajó despacito por los lados. Cuando se enfrió, se volvió piedra. ¡Esa montaña era un volcán!',
    'volcanes|hermanito|ejemplo':
      'Un volcán es una montaña que a veces escupe roca caliente y líquida. Es como cuando una olla de sopa hierve y se sale por los lados, pero con piedras.',
    'volcanes|cartelera|lista':
      '• VOLCÁN: montaña con un hueco por donde sale lava.\n• LAVA: roca derretida que viene de adentro de la Tierra.\n• EN COLOMBIA: Galeras, Nevado del Ruiz y Puracé.',
    'volcanes|cartelera|cuento':
      'Título: «La montaña que respira fuego». Muy abajo, la roca está tan caliente que se derrite. Sube por un túnel, sale por la punta de la montaña y baja como un río brillante. Al enfriarse, se vuelve piedra nueva.',
    'volcanes|cartelera|ejemplo':
      'Un volcán es una montaña con un hueco por donde sale roca derretida llamada lava. Ejemplo: el Nevado del Ruiz, en Colombia, es un volcán activo.',
    'reciclar|cuarto|lista':
      '1. Separa la basura: papel y cartón, plástico y vidrio, y lo que se daña (cáscaras, restos de comida).\n2. Enjuaga los envases antes de botarlos, para que no huelan.\n3. Aplasta las botellas y las cajas para que ocupen menos espacio.',
    'reciclar|cuarto|cuento':
      'Sara tenía una botella vacía y pensó botarla. Pero la enjuagó, la aplastó y la puso en la caneca blanca. Semanas después, esa botella se convirtió en parte de una silla nueva. Sara nunca volvió a ver una botella igual.',
    'reciclar|cuarto|ejemplo':
      'Reciclar en casa es separar lo que se puede usar otra vez, como papel, plástico y vidrio, de lo que se daña. Por ejemplo, una botella de gaseosa va limpia y aplastada en la caneca de reciclaje, no con las cáscaras.',
    'reciclar|hermanito|lista':
      '1. El papel y el cartón van juntos.\n2. Las botellas van limpias en otra caneca.\n3. Las cáscaras de fruta van con la basura que se daña.',
    'reciclar|hermanito|cuento':
      'La botella Tita no quería ir a la basura. «¡Yo puedo ser otra cosa!», gritó. Un niño la oyó, la lavó y la puso en la caneca de reciclar. Tita se fue de viaje y volvió convertida en una pelota.',
    'reciclar|hermanito|ejemplo':
      'Reciclar es poner cada cosa en su caneca para que la usen otra vez. Por ejemplo, la botella de jugo va limpia en la caneca de reciclar, y la cáscara de banano en la otra.',
    'reciclar|cartelera|lista':
      '• PAPEL Y CARTÓN: secos y sin grasa.\n• PLÁSTICO Y VIDRIO: limpios y aplastados.\n• RESTOS DE COMIDA: aparte, porque se dañan.',
    'reciclar|cartelera|cuento':
      'Título: «El viaje de una botella». Una botella vacía fue lavada, aplastada y puesta en la caneca correcta. Viajó en un camión, la derritieron y volvió al colegio convertida en un pupitre.',
    'reciclar|cartelera|ejemplo':
      'Reciclar en casa es separar papel, plástico y vidrio de los restos de comida. Ejemplo: una botella limpia y aplastada va a la caneca de reciclaje; las cáscaras, a la de basura que se daña.',
  },

  checkQuestions: {
    volcanes: {
      question: 'La IA nombró volcanes de Colombia. ¿Cómo podrías comprobar si de verdad existen?',
      options: [
        { key: 'atlas', label: 'Buscarlos en el atlas o preguntarle a mi profe', isCorrect: true },
        { key: 'ia', label: 'Preguntarle otra vez a la misma IA', isCorrect: false },
        { key: 'creer', label: 'No hace falta, la IA siempre sabe', isCorrect: false },
      ],
      explanation:
        'La IA a veces inventa nombres con mucha seguridad. Comprobar en un libro, un mapa o con tu profe es la parte de la receta que nadie puede hacer por ti.',
    },
    reciclar: {
      question: 'La IA dijo en qué caneca va cada cosa. ¿Cómo sabes si eso aplica en tu casa o tu colegio?',
      options: [
        { key: 'canecas', label: 'Mirar las canecas de mi colegio y preguntar en casa', isCorrect: true },
        { key: 'ia', label: 'Preguntarle otra vez a la misma IA', isCorrect: false },
        { key: 'creer', label: 'No hace falta, la IA siempre sabe', isCorrect: false },
      ],
      explanation:
        'Las reglas de reciclaje cambian según el lugar. La IA no conoce tu colegio: la comprobación la haces tú mirando las canecas de verdad.',
    },
  },

  closing:
    'La misma IA respondió distinto porque tú preguntaste distinto. Qué quiero, para quién, cómo lo quiero, y después revisar: esa es la receta.',
};

export const b2ArmaTuPregunta: Activity = {
  slug: 'arma-tu-pregunta',
  title: 'Arma tu pregunta',
  axisCode: 'B',
  subject: 'lenguaje',
  grade: 4,
  kind: 'constructor_instrucciones',
  orderIndex: 2,
  estimatedMinutes: 10,
  pisaCompetence: 'LEN.producir',
  dbaReference: 'LEN.4.3', // [VERIFICAR — DBA]
  bloomLevel: 'aplicar',
  payload,
  reviewedBy: 'equipo-pedagogico-prototipo',
  isPublished: true,
};
