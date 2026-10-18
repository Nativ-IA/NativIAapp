# 09 · Plan de seguridad, privacidad y DPIA

**Ámbito:** tratamiento de datos personales de **menores de edad entre 8 y 11 años** en instituciones
educativas de Bogotá D.C.

> ⚠ **Este documento no es un concepto jurídico.** Es un plan técnico y organizacional redactado por
> el equipo de producto para ser **revisado y validado por asesoría legal especializada** en
> protección de datos en Colombia. Todo lo marcado `[VERIFICAR CON ASESORÍA]` debe contrastarse
> contra la norma vigente y la doctrina de la Superintendencia de Industria y Comercio antes del
> piloto. Ninguna afirmación normativa de este documento debe usarse como sustento legal por sí sola.

---

## 1. Por qué este documento existe antes que el producto

El tratamiento de datos de menores tiene una particularidad que cambia el diseño entero: la Ley 1581
de 2012 lo somete a un estándar reforzado, y el consentimiento **no lo otorga el titular**, sino su
representante legal. Un producto que trata datos de menores y resuelve la privacidad al final ya
tomó, sin saberlo, decenas de decisiones irreversibles.

En NativIA, tres decisiones de arquitectura son consecuencia directa de este documento y no de un
criterio técnico:

1. El esquema de datos **no tiene campos** para dirección, teléfono, correo del menor, fotografía,
   documento de identidad ni fecha de nacimiento. No es que no se usen: **no existen**.
2. El cliente nunca habla con el LLM (ADR-004). Sin proxy no hay moderación, ni registro, ni
   posibilidad real de responder por lo que un modelo le dijo a un niño.
3. La rectoría no accede a datos individuales. Un permiso que existe termina usándose.

---

## 2. Inventario de datos personales

### 2.1 Datos tratados

| Dato | Titular | Categoría | Finalidad | Base | Retención |
|---|---|---|---|---|---|
| Nombre y apellido | Menor | Personal | Identificación en el curso | Autorización del representante | Vigencia + 2 años |
| Grado y curso | Menor | Personal | Asignación de ruta pedagógica | Autorización | Vigencia + 2 años |
| Avatar (clave) | Menor | Personal | Identificación visual | Autorización | Vigencia + 2 años |
| Hash del PIN gráfico | Menor | Personal | Autenticación | Autorización | Vigencia |
| Preferencias de accesibilidad | Menor | **Sensible** `[VERIFICAR CON ASESORÍA]` | Adaptación de la interfaz | Autorización expresa reforzada | Vigencia |
| Respuestas a actividades | Menor | Personal | Retroalimentación y progreso | Autorización | Vigencia + 2 años |
| **Turnos de diálogo con el tutor** | Menor | **Personal, alto riesgo** | Supervisión pedagógica y seguridad | Autorización | Vigencia + 2 años |
| **Respuestas metacognitivas** | Menor | **Personal, alto riesgo** | Acompañamiento docente | Autorización | Vigencia + 2 años |
| Métricas de dominio | Menor | Personal | Diagnóstico pedagógico | Autorización | Vigencia + 2 años |
| Alertas de riesgo | Menor | **Sensible** | Protección del menor | Autorización + interés superior del NNA | Según protocolo institucional |
| Nombre y correo institucional | Docente | Personal | Autenticación | Relación laboral / autorización | Vigencia |
| Registros de auditoría | Docente | Personal | Trazabilidad y control | Deber legal de seguridad | 5 años `[VERIFICAR]` |
| Referencia del acudiente | Acudiente | Personal | Prueba del consentimiento | Deber legal | Vigencia + 5 años `[VERIFICAR]` |

### 2.2 Datos deliberadamente NO tratados

Dirección · teléfono del menor · correo del menor · fotografía o video del menor · documento de
identidad del menor · fecha de nacimiento exacta · datos biométricos · datos de salud · etnia ·
religión · orientación sexual · datos de geolocalización · contactos · identificadores publicitarios.

> **Esta lista es un compromiso de arquitectura verificable.** Existe una prueba en CI que falla si
> aparece en el esquema Prisma un campo con nombre coincidente con esta lista. La minimización
> declarada en un documento se erosiona; la que rompe el build, no.

### 2.3 Dos datos que merecen atención especial

**Preferencias de accesibilidad.** Que un estudiante active el modo dislexia puede revelar una
condición de aprendizaje. `[VERIFICAR CON ASESORÍA]` si eso constituye dato sensible bajo el Art. 5
de la Ley 1581 (dato relativo a la salud). Tratamiento adoptado por precaución: se maneja **como si
lo fuera** — visible solo para el propio estudiante y el docente titular, nunca en exportaciones ni
en agregados, y con autorización expresa diferenciada en el texto de consentimiento.

**Turnos de diálogo.** Es el dato de mayor riesgo del sistema: texto libre escrito por un niño, que
puede contener cualquier cosa —incluida información que el sistema pidió no compartir— y que además
se transmite a un tercero (el proveedor de LLM). Todas las salvaguardas de §5 y §6 existen por este
dato.

---

## 3. Marco normativo aplicable

| Norma | Qué exige (síntesis del equipo, sujeta a validación) | Cómo responde NativIA |
|---|---|---|
| **Ley 1581 de 2012, Art. 7** | Régimen especial para datos de niños, niñas y adolescentes; el tratamiento debe respetar sus derechos prevalentes y responder a su interés superior | Consentimiento del representante previo y verificable; minimización extrema; sin publicidad ni monetización; sin perfilamiento comercial |
| **Ley 1581, Art. 4** | Principios: legalidad, finalidad, libertad, veracidad, transparencia, acceso restringido, seguridad, confidencialidad | Matriz de cumplimiento en §4 |
| **Ley 1581, Art. 8** | Derechos del titular: conocer, actualizar, rectificar, revocar, solicitar prueba de la autorización | Endpoints de `/privacy`; panel de transparencia infantil; portal del acudiente |
| **Ley 1581, Art. 9 y 12** | Autorización previa e informada; aviso de privacidad | `ConsentRecord` versionado; texto en lenguaje llano + versión ilustrada para el menor |
| **Ley 1581, Art. 17** | Deberes del responsable: seguridad, confidencialidad, atención de consultas y reclamos | §7 y §8 |
| **Ley 1581, Art. 25 / Decreto reglamentario** | Registro Nacional de Bases de Datos ante la SIC | `[VERIFICAR CON ASESORÍA]` aplicabilidad y umbrales al momento del piloto |
| **Decreto 1377 de 2013** (compilado en Decreto 1074 de 2015) `[VERIFICAR]` | Reglamenta autorización, aviso de privacidad, políticas de tratamiento y transferencias internacionales | Política de tratamiento publicada; cláusulas contractuales con el proveedor de LLM |
| **Ley 1098 de 2006 (Código de Infancia y Adolescencia)** | Interés superior del NNA; deber de denuncia ante vulneración de derechos | Protocolo de alerta de riesgo (§6.4), parametrizado por institución |
| **Lineamientos MinTIC / MinEducación** | `[VERIFICAR CON ASESORÍA]` — políticas vigentes sobre uso de IA en entornos educativos | Revisión previa al piloto |

> **Nota de honestidad metodológica:** la columna «qué exige» es una síntesis operativa hecha por el
> equipo de producto para poder diseñar. No sustituye la lectura de la norma ni un concepto legal.

---

## 4. Matriz de cumplimiento de principios (Art. 4)

| Principio | Requisito | Implementación | Evidencia verificable |
|---|---|---|---|
| **Legalidad** | Tratamiento sujeto a la ley | Política de tratamiento publicada y versionada | Documento firmado |
| **Finalidad** | Finalidad legítima, informada al titular | Cada dato del inventario §2.1 declara su finalidad | Inventario auditable |
| **Libertad** | Consentimiento previo, expreso e informado | Cuenta bloqueada hasta `ConsentRecord` vigente | Prueba automatizada US-09 |
| **Veracidad** | Datos completos, exactos, actualizables | Endpoints de rectificación; el docente corrige nombre y curso | `/privacy/export` |
| **Transparencia** | El titular puede conocer qué se trata | **Panel de transparencia infantil** + portal del acudiente | Pantalla 10 |
| **Acceso restringido** | Solo quien deba, y no en internet abierto | Permisos por rol + asignación vigente; sin acceso de rectoría a lo individual | Pruebas de contrato rol × endpoint |
| **Seguridad** | Medidas técnicas y administrativas | §7 | Registro de pruebas |
| **Confidencialidad** | Obligación incluso terminado el vínculo | Cláusulas en contratos de docentes y proveedores | Contratos |

---

## 5. Transferencia a terceros: el proveedor de LLM

Es el punto de mayor exposición del sistema y merece tratamiento explícito.

### 5.1 Qué sale y qué no

| Sale | No sale |
|---|---|
| Texto del turno escrito por el estudiante | Nombre, apellido, curso, institución |
| Contexto pedagógico de la actividad | Cualquier identificador persistente del menor |
| Identificador seudónimo del intento, rotatorio | Correo, dirección, teléfono, imagen |
| — | Historial acumulado entre actividades |

**El contexto enviado se limita al diálogo de la actividad en curso.** No se envía historial entre
actividades ni perfil del estudiante. Además de reducir el riesgo, reduce el costo por token — las
dos razones apuntan en la misma dirección.

### 5.2 Condiciones contractuales exigidas al proveedor

Requisitos innegociables. Un proveedor que no los cumpla **queda excluido**, aunque sea mejor o más
barato:

1. **No entrenamiento con los datos enviados.**
2. **Retención cero o mínima documentada** de las peticiones.
3. **Acuerdo de tratamiento de datos** que reconozca al proveedor como Encargado y a la institución o
   al operador como Responsable. `[VERIFICAR CON ASESORÍA]` la asignación exacta de roles: es una de
   las preguntas jurídicas abiertas más relevantes del proyecto.
4. **Cláusulas de transferencia internacional** conforme al régimen colombiano. `[VERIFICAR]` si
   aplica el mecanismo de país con nivel adecuado, o si se requiere autorización de la SIC o
   cláusulas contractuales específicas.
5. **Notificación de incidentes** en plazo contractual definido.
6. **Derecho de auditoría** o, en su defecto, certificaciones de seguridad vigentes.

### 5.3 Riesgo residual, declarado

Aun con todo lo anterior, **un niño puede escribir su nombre completo, el de su colegio o algo
personal en el campo de texto libre, y ese texto se transmite antes de que ningún filtro humano lo
vea.** Es un riesgo que no se elimina, solo se reduce:

- Detector de PII en la moderación de entrada (nombres propios, cifras largas, direcciones,
  teléfonos), que **redacta antes de enviar** al proveedor.
- El system prompt instruye al tutor a no solicitar nunca información personal.
- Actividad del Eje D dedicada específicamente a qué no compartir con un chatbot: el propio currículo
  es una medida de mitigación.
- Alerta al docente cuando se detecta revelación de información personal.
- Límite de 300 caracteres por turno.

**Riesgo residual: medio.** Se declara explícitamente en el DPIA en lugar de darse por resuelto.

---

## 6. Evaluación de impacto (DPIA)

### 6.1 Necesidad y proporcionalidad

| Pregunta | Respuesta |
|---|---|
| ¿Es necesario tratar estos datos para la finalidad? | Sí para nombre, curso y trabajo del estudiante. **El diálogo con el tutor es el caso a justificar**: sin registro no hay supervisión docente ni posibilidad de detectar daño |
| ¿Existe alternativa menos invasiva? | Se evaluó no almacenar los diálogos y guardar solo métricas agregadas. **Descartada**: elimina la capacidad de detectar señales de riesgo y de que el docente comprenda el razonamiento del niño, que son el núcleo de la propuesta pedagógica |
| ¿Es proporcional? | Sí, condicionado a: acceso restringido al docente a cargo, auditoría de cada consulta, transparencia hacia el propio menor y retención acotada |
| ¿El menor lo sabe? | Sí. La pantalla 10 le dice explícitamente que su docente puede leer sus conversaciones, **antes** de que lo descubra por su cuenta |

### 6.2 Matriz de riesgos

Probabilidad e impacto en escala 1–5. Riesgo = P × I.

| # | Riesgo | P | I | R | Mitigación | Residual |
|---|---|---|---|---|---|---|
| **P1** | Un menor revela información personal en el texto libre | 4 | 4 | **16** | Detector de PII con redacción previa al envío; system prompt; currículo del Eje D; alerta docente; límite de 300 caracteres | 8 |
| **P2** | El LLM produce contenido inapropiado para un menor | 3 | 5 | **15** | Moderación de entrada y salida; temperatura baja; system prompt restrictivo; evals en CI; degradación a árbol pregrabado | 5 |
| **P3** | Suplantación entre compañeros del mismo curso | 4 | 3 | **12** | PIN gráfico; vigencia acotada del código de curso; auditoría de ingresos anómalos | 6 |
| **P4** | Acceso indebido de un adulto a conversaciones de menores | 3 | 5 | **15** | Permisos por asignación vigente; auditoría de cada consulta; sin acceso de rectoría; motivo obligatorio para coordinación | 5 |
| **P5** | Señal de riesgo (autolesión, abuso) no detectada o mal gestionada | 3 | 5 | **15** | Clasificador + alerta < 5 min; protocolo institucional parametrizado; alertas críticas no auto-descartables | 9 |
| **P6** | Uso de los datos con fines distintos (evaluación docente, disciplina) | 3 | 4 | **12** | El panel no expone métricas de desempeño docente; política explícita; auditoría | 6 |
| **P7** | Fuga de datos por vulnerabilidad técnica | 2 | 5 | **10** | Cifrado, gestión de secretos, dependencias auditadas, pentest previo al piloto | 4 |
| **P8** | Consentimiento inválido por mecanismo inadecuado | 4 | 4 | **16** | `[SUPUESTO]` **Riesgo abierto principal.** Flujo parametrizable a la espera del concepto jurídico | **16 — sin mitigar** |
| **P9** | Retención más allá de lo necesario | 3 | 3 | **9** | Trabajo programado de anonimización a 2 años; borrado por revocación | 4 |
| **P10** | Transferencia internacional sin base adecuada | 3 | 4 | **12** | Cláusulas contractuales; `[VERIFICAR]` régimen aplicable | 6 |
| **P11** | Sesgo del modelo que refuerza estereotipos ante los niños | 4 | 3 | **12** | Contenido curado y revisado; el Eje D convierte el sesgo en objeto de estudio; evals específicas | 6 |
| **P12** | El menor confunde al tutor con una persona | 3 | 3 | **9** | `AIDisclosure` obligatorio; avatar no humano; el tutor se declara IA al inicio de cada diálogo | 4 |

> **P8 es el único riesgo alto sin mitigar del proyecto.** No es un descuido: el mecanismo de
> consentimiento verificable está pendiente de concepto jurídico. **El piloto no puede iniciar con P8
> abierto.** Es la primera petición del resumen ejecutivo por esta razón.

### 6.3 Decisiones tomadas por el DPIA

| Decisión | Origen |
|---|---|
| Las respuestas correctas de las actividades de clasificación viajan al cliente | Requisito offline (E-05). **Tensión declarada**, ver abajo |
| Sin fotografía del menor; avatares de fauna ilustrada | P1, minimización |
| Sin historial entre actividades enviado al LLM | P1, P2 |
| Rectoría sin acceso a datos individuales (permanente) | P4, P6 |
| Motivo obligatorio y auditoría reforzada para coordinación | P4 — negarlo provocaría que se sortee compartiendo credenciales |
| Sin métricas de desempeño docente en el panel | P6 |
| Panel de transparencia infantil | Principio de transparencia; equilibra P4 |
| Prueba en CI contra campos prohibidos en el esquema | Minimización verificable |
| Límite de 300 caracteres por turno | P1 |

#### Nota sobre las respuestas de las actividades de clasificación

Los ejes A, C y D deben funcionar **completos sin conexión**, y eso obliga a que la corrección ocurra
en el dispositivo: sin red no hay a quién preguntarle si la respuesta es correcta. Por tanto
`isSynthetic` y `validSignals` viajan al cliente y **un estudiante con curiosidad técnica puede
leerlas en las herramientas del navegador**.

Se acepta, y se declara, por tres razones:

1. Sin ellas no hay modo offline, que es la restricción más dura del aula real.
2. En los ejes C y D, **acertar no cuenta para el dominio sin una justificación válida** (US-02).
   Espiar el booleano no entrega la señal que se pide justificar.
3. Un intento resuelto sin justificación queda visible para el docente.

**El tutor socrático es distinto:** ahí la respuesta nunca sale del servidor (ADR-004), porque no hay
corrección local que dependa de ella. La regla no es «ocultar todo», es «ocultar lo que no necesita
estar en el dispositivo».

### 6.4 Protocolo de alerta de riesgo

Flujo en `docs/10-teacher-dashboard-spec.md` §5.3. Reglas de privacidad que lo gobiernan:

1. **Al menor nunca se le comunica que fue «reportado».** Recibe una respuesta contenedora que lo
   orienta hacia un adulto de confianza. Informarle activaría ocultamiento y agravaría el riesgo.
2. **Ningún dato del incidente sale del sistema hacia terceros.** El escalamiento ocurre dentro de la
   institución, por sus canales.
3. **El contenido sensible no se muestra en listados**; requiere apertura deliberada. La pantalla del
   docente puede estar proyectada en el salón.
4. **`[SUPUESTO — BLOQUEANTE]`** La ruta de escalamiento a orientación escolar se parametriza por
   institución y debe alinearse con su manual de convivencia y con la ruta de atención de la SED. El
   sistema no puede definirla por su cuenta.

---

## 7. Medidas de seguridad

### 7.1 Estado real: prototipo vs objetivo

| Medida | Objetivo | Prototipo local | Brecha |
|---|---|---|---|
| TLS 1.3 en tránsito | ✅ | ❌ `http://localhost` | Solo aceptable porque no hay datos reales |
| Cifrado en reposo AES-256 | ✅ | ❌ SQLite sin cifrar | Bloqueante para producción |
| Contraseñas con `argon2id` | ✅ | ✅ | — |
| Gestión de secretos | Gestor dedicado | `.env` fuera de control de versiones | Bloqueante para producción |
| Rate limiting | ✅ | ✅ en memoria | — |
| Auditoría inmutable | Trigger de BD | Capa de aplicación | Documentada en el esquema |
| Respaldos cifrados con rotación | ✅ | ❌ | Bloqueante para producción |
| Segregación de entornos | ✅ | N/A | — |
| MFA para docentes | Obligatorio | Opcional | Bloqueante para producción |
| Pentest | Anual + previo al piloto | ❌ | Bloqueante para el piloto |
| Análisis de dependencias | En CI | ✅ | — |

> **Ningún dato real de un menor puede ingresar al prototipo.** Los datos de demostración son
> sintéticos y generados por `seed`. Esta regla está escrita en el `README` y es la primera del
> protocolo operativo.

### 7.2 Controles de acceso

| Rol | Agregados | Progreso individual | Transcripciones | Alertas 🔴 |
|---|---|---|---|---|
| `student` | Solo lo propio | Solo lo propio | Solo lo propio | — |
| `teacher` (titular) | Su curso | Su curso | Su curso | Resolver |
| `teacher` (apoyo) | Su curso | Su curso | **No** | Ver |
| `orientacion` | Su institución | Con protocolo | Con protocolo y motivo | Resolver |
| `coordinator` | Su institución | **Solo con motivo y auditoría reforzada** | **Solo con motivo y auditoría reforzada** | Ver |
| `admin` | Técnico | **No** | **No** | **No** |

> **El rol `admin` es técnico y no ve contenido de menores.** Un administrador que puede leer
> conversaciones de niños es una superficie de riesgo sin contrapartida pedagógica.

### 7.3 Plan de respuesta a incidentes

| Fase | Plazo | Acción |
|---|---|---|
| Detección | Continuo | Alertas de seguridad; canal de reporte |
| Contención | < 2 h | Aislar, revocar credenciales, congelar acceso |
| Evaluación | < 12 h | Alcance, datos afectados, número de menores |
| Notificación a la SIC | Según norma `[VERIFICAR]` | Reporte conforme al procedimiento vigente |
| Notificación a instituciones y acudientes | < 72 h | Comunicación en lenguaje llano; qué pasó, qué datos, qué hacer |
| Remediación | Según severidad | Corrección y verificación |
| Post-mortem | < 10 días | Sin señalamiento de personas; con acciones y responsables |

**Compromiso de comunicación:** ante un incidente que afecte datos de menores, se notifica a las
familias **aunque la norma no lo exija con ese alcance**. La confianza de un acudiente no se recupera
con un mínimo legal.

---

## 8. Derechos de los titulares

| Derecho | Mecanismo | Plazo |
|---|---|---|
| Conocer | Panel de transparencia infantil + portal del acudiente + `/privacy/export` | Inmediato |
| Actualizar / rectificar | Solicitud al docente titular o a la institución | 5 días hábiles `[VERIFICAR]` |
| Revocar la autorización | Portal del acudiente o solicitud a la institución | **< 24 h** para desactivar |
| Suprimir (derecho al olvido) | `/privacy/erasure-requests` | < 24 h para programar; ejecución en 24 h |
| Prueba de la autorización | `ConsentRecord` con evidencia y versión | 5 días hábiles |
| Presentar reclamo | Canal de contacto publicado; luego SIC | Según norma |

### Alcance del borrado

**Se elimina:** perfil, nombre, avatar, PIN, turnos de diálogo, respuestas metacognitivas, respuestas
a actividades, intentos, eventos, alertas asociadas.
**Se conserva:** agregados anonimizados no reversibles (conteos por curso, dominio agregado por eje)
y el registro en `audit_log` del hecho del borrado —no de su contenido.

> **El compromiso de irreversibilidad es técnico, no declarativo:** los agregados no conservan
> identificadores ni combinaciones de atributos que permitan reidentificar a un estudiante dentro de
> un curso de ~30. Cuando un agregado se calcula sobre menos de 5 estudiantes, **no se publica**.

---

## 9. Gobierno del proyecto

| Rol | Responsabilidad | Estado |
|---|---|---|
| Responsable del tratamiento | `[VERIFICAR CON ASESORÍA]` ¿la institución educativa, la SED o el operador? Decisión jurídica pendiente con consecuencias contractuales | **Abierto** |
| Encargado | Operador de la plataforma; proveedor de LLM como sub-encargado | Por formalizar |
| Oficial de protección de datos | Punto de contacto para consultas y reclamos | Por designar |
| Comité de ética del proyecto | Aprueba ítems trampa, contenido sensible y el protocolo de riesgo | Por conformar |
| Revisor pedagógico | Aprueba todo contenido que ve un menor (ADR-008) | Por designar |

---

## 10. Requisitos bloqueantes antes del piloto

Lista de verificación. **Ninguno es opcional.**

- [ ] Concepto jurídico sobre el mecanismo de consentimiento verificable (riesgo P8)
- [ ] Definición del Responsable del tratamiento
- [ ] Contrato con el proveedor de LLM con las 6 cláusulas de §5.2
- [ ] Política de tratamiento publicada y aviso de privacidad en lenguaje llano
- [ ] Versión ilustrada del aviso, comprensible para un niño de 3.º
- [ ] Protocolo de riesgo alineado con la ruta de atención de la SED y con cada manual de convivencia
- [ ] Comité de ética conformado y con reglamento
- [ ] Pentest ejecutado y hallazgos críticos cerrados
- [ ] Cifrado en reposo, gestión de secretos, respaldos y MFA en producción
- [ ] Registro Nacional de Bases de Datos, si aplica `[VERIFICAR]`
- [ ] Prueba en CI de campos prohibidos, activa y en verde
- [ ] Formación en protección de datos para los docentes participantes

---

<self_critique>

**Debilidad 1 — El documento asume una figura de Responsable del tratamiento que no está definida, y
de esa indefinición cuelga casi todo lo demás.**
Quién es el Responsable —la institución educativa, la Secretaría de Educación o el operador de la
plataforma— determina quién recaba el consentimiento, quién responde ante la SIC, quién notifica un
incidente, quién firma el contrato con el proveedor de LLM y bajo qué figura se hace la transferencia
internacional. El documento diseña controles detallados sobre un cimiento que reconoce como abierto
en §9, lo que significa que una parte de esos controles podría estar asignada a la entidad
equivocada.
*Mitigación:* elevar la definición del Responsable a la primera pregunta del concepto jurídico, por
encima incluso del mecanismo de consentimiento, y preparar dos versiones del modelo de gobierno —una
con la institución como Responsable y el operador como Encargado, otra con el operador como
Responsable— para poder ejecutar la que resulte aplicable sin rediseñar el plan completo.

**Debilidad 2 — La mitigación del riesgo P1 depende de un detector de PII que no existe y que es
notoriamente difícil en español informal infantil.**
Se afirma que la información personal se redacta antes de enviarla al proveedor, y esa afirmación
sostiene la reducción de P1 de 16 a 8. Pero detectar nombres propios en texto escrito por un niño de
9 años —sin mayúsculas, con errores ortográficos, con apodos y con nombres de barrios y colegios
locales— es un problema abierto, y un detector mediocre produce dos daños simultáneos: deja pasar
datos reales y mutila texto legítimo, degradando el diálogo pedagógico.
*Mitigación:* construir el detector antes de fijar el riesgo residual y medirlo sobre un corpus real
de escritura infantil colombiana, reportando sensibilidad y falsos positivos por separado; hasta
tener esa medición, mantener P1 en 16 y no en 8. Complementar con una medida que no depende de
ningún clasificador: no enviar al proveedor ningún turno del estudiante **antes** de que la
moderación determinística revise patrones de alto riesgo (secuencias numéricas largas, formatos de
teléfono y de dirección), y aceptar el falso positivo en ese subconjunto acotado.

**Debilidad 3 — El plan trata la retención de los diálogos como un parámetro y no como el problema
ético que es.**
Se fija «vigencia + 2 años» para los turnos de diálogo y las respuestas metacognitivas con la misma
naturalidad que para el grado y el curso, sin justificar por qué el registro íntegro de lo que un
niño de 9 años le escribió a una máquina debe conservarse dos años después de que dejó de usar la
plataforma. La finalidad declarada —supervisión docente— se agota al terminar el año escolar; la
finalidad de investigación no está declarada como base de tratamiento en el inventario. Es el tipo de
decisión que se justifica por comodidad analítica y se descubre indefendible en una auditoría.
*Mitigación:* separar la retención por finalidad — conservar los turnos íntegros solo mientras dure
el año escolar y el período de acompañamiento pedagógico, y a partir de ahí conservar únicamente
métricas derivadas y una muestra seudonimizada con consentimiento específico y diferenciado para
investigación; declarar esa finalidad de investigación de forma explícita en el consentimiento, con
opción de negarla sin perder acceso al producto.

</self_critique>
