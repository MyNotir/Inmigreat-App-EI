# Plan de Implementacion — Casos de Corte EOIR

Documento guía para implementar soporte inicial de casos de corte migratoria en la app actual.

## Objetivo

Implementar un MVP de casos de corte `EOIR` en `Inmigreat-App`, tomando como referencia funcional la app vieja `App-Inmigreat`, pero adaptándolo a la arquitectura actual del app y backend.

Objetivo de producto para esta fase:

- Traer la información del caso al momento de agregarlo.
- Reutilizar el mismo flujo más adelante para actualizaciones manuales disparadas por el cliente.
- Persistir en backend el snapshot validado para que lista y detalle no dependan de consultar `EOIR` en cada render.

## Como usar este documento

- Este documento es la guía de trabajo y la fuente de verdad para este esfuerzo.
- Cada punto del checklist solo debe marcarse cuando cumpla su criterio de cierre.
- Si cambia el alcance, primero se actualiza este documento y después el código.
- Los cambios deben priorizar `EOIR` primero. `PACER` queda fuera de este MVP.

## Alcance propuesto del MVP

Incluye:

- Alta manual de caso `EOIR` usando `Alien Number`.
- Captura de `alias`, `nacionalidad` y `si tiene abogado`.
- Validación del caso contra la fuente de `EOIR`.
- Persistencia de un snapshot de datos del caso.
- Relación `usuario <-> caso de corte`.
- Visualización del caso en lista y detalle.
- Refresco manual del caso.
- Manejo claro de errores de validación y sincronización.

No incluye:

- Casos federales vía `PACER`.
- Sincronización automática en background.
- Alertas push por cambios del caso.
- Subida o descarga de documentos del expediente.
- Automatización backend del captcha o de la consulta inicial a `EOIR` mientras la fuente siga exigiendo captcha por usuario.

## Alcance cerrado del punto 1

Esta sección deja cerrado el alcance inicial del MVP para que producto, app y backend trabajen sobre el mismo objetivo.

### Tipo de caso soportado

- Solo `EOIR`.
- Solo casos de corte migratoria administrativa.
- No incluye litigios de cortes federales.
- No incluye `PACER`.

### Forma de alta

- Alta manual iniciada por el usuario.
- El identificador principal será `Alien Number`.
- El usuario también capturará:
	- `alias`
	- `nationalityCode`
	- `hasLawyer`

### Resultado esperado del alta

- El sistema valida el caso contra la fuente de `EOIR`.
- Si el caso es válido, se crea o reutiliza el caso base.
- El caso queda vinculado al usuario actual.
- El usuario ve el caso en su lista sin tener que reingresarlo.

### Datos minimos visibles en UI

- Identificador del caso: `Alien Number`.
- Nombre de la persona, si viene disponible desde la fuente externa.
- Estado principal del caso.
- Próxima audiencia, si existe.
- Juez, si existe.
- Ubicación o dirección de audiencia, si existe.
- Estado de apelación `BIA`, si existe.
- Fecha de última revisión por Inmigreat.

### Operaciones incluidas en el MVP

- Agregar caso de corte.
- Listar casos de corte del usuario.
- Ver detalle del caso.
- Refrescar manualmente el caso.
- Editar alias del caso del usuario.
- Eliminar la relación del usuario con el caso.

### Operaciones excluidas del MVP

- Alta automática sin intervención del usuario.
- Refresh automático periódico.
- Notificaciones push por cambios del caso.
- Descarga de expediente o documentos judiciales.
- Presentación de documentos a `EOIR`.
- Soporte para múltiples tipos de tribunal en la misma primera fase.

### Regla de arquitectura para este alcance

- La app móvil sí consulta `EOIR` directamente mientras la fuente siga exigiendo captcha por usuario.
- La app móvil resuelve `hCaptcha`, obtiene el token y lo manda en `Captcha-Token` al consultar `EOIR`.
- La app envía al backend los datos necesarios para persistir el caso validado y su snapshot.
- `Inmigreat-backend` en esta fase no resuelve captcha ni consulta `EOIR` para el alta inicial.
- El refresh manual de casos `EOIR` sigue el mismo patrón: consulta en app y persistencia en backend.
- La operación reutilizable a diseñar es `resolver captcha -> consultar EOIR -> normalizar respuesta -> persistir snapshot`, para usarla tanto en alta inicial como en refresh manual.

### Definicion de exito del punto 1

El alcance del MVP queda considerado definido cuando se mantiene esta decisión:

- `EOIR` es la única fuente contemplada en esta fase.
- El flujo de entrada del usuario está limitado a `Alien Number + alias + nationalityCode + hasLawyer`.
- La experiencia mínima del producto es `alta + lista + detalle + refresh manual`.
- Todo lo demás queda fuera de fase hasta nuevo cambio de alcance documentado.

## Hallazgos de la app vieja

La app vieja ya tenía un flujo funcional para `EOIR`.

Resumen de lo encontrado:

- El flujo vivía en `App-Inmigreat/app/add-case.tsx`.
- Detectaba caso de corte si el input era numérico, sin letras y con menos de 11 dígitos.
- Pedía `Alien Number`, `nombre/alias`, `nacionalidad` y `abogado`.
- Validaba el caso llamando a `https://eoir-ws.eoir.justice.gov/api/Case/GetCaseInfo`.
- Usaba `hCaptcha` antes de consultar `EOIR`.
- El refresh manual del caso también volvía a pedir `hCaptcha` desde la app antes de reconsultar `EOIR`.
- Evitaba duplicados por `Alien Number`.
- Persistía un objeto `CourtCaseNew` con snapshot amplio del response de `EOIR`.
- Creaba una relación del usuario hacia ese caso.
- Permitía refrescar el caso manualmente desde el dashboard.
- Mostraba 3 bloques principales en UI: próxima audiencia, decisión/proceeding y apelación `BIA`.

## Decisiones tecnicas iniciales

Estas son las decisiones propuestas para la nueva implementación.

### 1. Alcance funcional

- El MVP cubre solo `EOIR`.
- La entrada principal del usuario será `Alien Number`.
- La nacionalidad seguirá siendo requerida mientras la validación externa la necesite.

### 2. Arquitectura

- La app debe llamar directo al endpoint de `EOIR` para alta y refresh manual mientras el captcha siga siendo cliente.
- El challenge de `hCaptcha` debe dispararse en la app para obtener un token de usuario real.
- La app valida el caso contra `EOIR` y luego envía al backend el payload necesario para persistencia.
- El backend no debe intentar resolver `hCaptcha` por sí mismo en esta fase.
- El backend debe encargarse de dedupe, normalización final, snapshots y relación usuario-caso.
- El flujo técnico debe empaquetarse como una capacidad reutilizable por pantalla para no duplicar lógica entre `Agregar caso` y `Actualizar manualmente`.

### 3. Modelo de datos

- Debemos guardar un modelo normalizado para UI.
- Debemos guardar también un snapshot técnico del response externo para auditoría y futuras mejoras.
- Debe existir una relación explícita entre usuario y caso para soportar alias, borrado lógico y futuras preferencias.

### 4. Experiencia de usuario

- El alta de `EOIR` debe estar separada o claramente diferenciada del alta de `USCIS`.
- El usuario debe entender qué tipo de número está ingresando.
- El detalle del caso debe enfocarse en la información útil y no en todo el payload crudo.

## Flujo objetivo de extremo a extremo

1. El usuario entra a `Agregar caso`.
2. Selecciona o queda claro que está agregando un caso `EOIR`.
3. Ingresa `Alien Number`, `alias`, `nacionalidad` y `si tiene abogado`.
4. La app ejecuta `hCaptcha` y consulta `EOIR` directamente.
5. Si el caso es válido, la app envía al backend el payload validado para persistencia.
6. El backend crea o reutiliza el caso existente, guarda snapshot y lo vincula al usuario.
7. La app refresca la lista de casos del usuario.
8. El usuario puede abrir el detalle del caso.
9. El usuario puede ejecutar un refresh manual del caso desde el detalle.

## Regla funcional para alta y refresh manual

- `Agregar caso` y `Actualizar manualmente` no son dos integraciones distintas contra `EOIR`.
- Son dos puntos de entrada del mismo flujo de recuperación de datos.
- La diferencia entre ambos está en el contexto de uso:
	- En alta, el resultado crea o vincula el caso al usuario.
	- En refresh manual, el resultado actualiza el snapshot y el estado visible del caso ya vinculado.
- En ambos casos el cliente debe resolver captcha antes de consultar `EOIR`.
- En ambos casos el backend debe persistir el snapshot resultante para historial y UI.

## Estructura sugerida del dato

Campos de entrada del usuario:

- `alienNumber`
- `alias`
- `nationalityCode`
- `hasLawyer`

Campos mínimos normalizados para UI:

- `id`
- `alienNumber`
- `personName`
- `caseStatus`
- `nextHearingDate`
- `nextHearingTime`
- `hearingLocation`
- `judgeName`
- `appealStatus`
- `proceedingDecision`
- `lastCheckedAt`
- `source`

Campos técnicos/snapshot:

- `rawResponse`
- `rawResponseVersion`
- `validationSource`
- `lastSyncStatus`
- `lastSyncError`

Campos de relación usuario-caso:

- `userId`
- `courtCaseId`
- `alias`
- `createdAt`
- `updatedAt`

## Modelo cerrado del punto 2

Este punto se cierra reutilizando la base que ya existe en `Inmigreat-backend`.

Modelos detectados hoy en backend:

- `EoirCase`
- `UserEoirCase`
- `EoirCaseSnapshot`

Decisión de diseño:

- No crear una familia nueva de modelos.
- Reutilizar `EoirCase` como entidad canónica del caso externo.
- Reutilizar `UserEoirCase` como relación usuario-caso.
- Reutilizar `EoirCaseSnapshot` como historial append-only de snapshots.
- Ajustar esos modelos para soportar el flujo real de `EOIR` del MVP.

### Regla de modelado

- Lo que describe el caso real y viene de `EOIR` vive en `EoirCase`.
- Lo que pertenece a la relación del usuario con el caso vive en `UserEoirCase`.
- Lo que sirve como historial de sincronización vive en `EoirCaseSnapshot`.
- No vamos a crear una tabla de timeline específica para `EOIR` en esta fase.

### Modelo canónico: EoirCase

Propósito:

- Representa el caso externo compartible entre uno o más usuarios.
- Guarda los campos normalizados que usa la app.
- Guarda el snapshot técnico más reciente del proveedor externo.

Campos a mantener del backend actual:

| Campo | Uso |
|---|---|
| `id` | Identificador interno |
| `sourceCaseKey` | Clave canónica interna para dedupe |
| `alienNumber` | Identificador principal del MVP |
| `caseNumber` | Identificador secundario opcional |
| `courtCode` | Código interno de corte si existe |
| `courtName` | Nombre visible de la corte |
| `judgeName` | Nombre del juez |
| `hearingLocation` | Ubicación o dirección de audiencia |
| `hearingType` | Tipo de audiencia |
| `nextHearingAt` | Próxima audiencia en fecha/hora unificada |
| `statusLabel` | Estado principal visible |
| `lastCheckedAt` | Última revisión de Inmigreat |
| `rawData` | Payload técnico más reciente |
| `syncStatus` | Estado de sincronización |
| `syncError` | Último error de sync |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos a agregar para el MVP:

| Campo | Uso |
|---|---|
| `personName` | Nombre de la persona/caso si EOIR lo devuelve |
| `nationalityCode` | Nacionalidad requerida para validar y refrescar |
| `nationalityLabel` | Etiqueta visible de nacionalidad |
| `hasLawyer` | Dato capturado en el alta, útil para contexto futuro |
| `appealStatusLabel` | Estado legible de apelación `BIA` |
| `appealFiledAt` | Fecha relevante de apelación si existe |
| `proceedingDecisionLabel` | Texto normalizado de decisión/proceeding |
| `proceedingDecisionAt` | Fecha de decisión/proceeding si existe |

Campos internos que no deben condicionar la UI:

| Campo | Uso |
|---|---|
| `sourceCaseKey` | Dedupe y búsqueda interna |
| `rawData` | Diagnóstico, trazabilidad y re-procesamiento |
| `syncStatus` | Estado operativo del backend |
| `syncError` | Observabilidad y soporte |

Decisiones específicas:

- `alienNumber` es el identificador obligatorio a nivel de producto para esta fase.
- `sourceCaseKey` se mantiene como mecanismo interno de deduplicación, pero no se expone como campo relevante de UI.
- `nextHearingAt` sigue siendo un único `DateTime`; no abrimos campos separados de fecha y hora en base de datos.
- `nationalityCode` y `nationalityLabel` deben quedar en la entidad canónica, no en la relación del usuario.
- `hasLawyer` también debe quedar en la entidad canónica, no en la relación del usuario.

### Modelo de relación: UserEoirCase

Propósito:

- Representa que un usuario está siguiendo un caso `EOIR` concreto.
- Guarda solamente metadatos propios de ese usuario.

Campos a mantener del backend actual:

| Campo | Uso |
|---|---|
| `id` | Identificador del tracking record |
| `userId` | Dueño del tracking |
| `eoirCaseId` | Referencia al caso canónico |
| `alias` | Nombre personalizado visible para el usuario |
| `isPrimary` | Caso principal del usuario |
| `notes` | Notas privadas del usuario |
| `archivedAt` | Archivo lógico |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

Campos a deprecar o dejar fuera del flujo nuevo:

| Campo | Decisión |
|---|---|
| `category` | No usar en este MVP |
| `nationality` | Mover a la entidad canónica como `nationalityCode` + `nationalityLabel` |

Decisiones específicas:

- `alias` sí es propio del usuario y permanece aquí.
- `nationality` no debe seguir viviendo en la relación si el refresh de `EOIR` depende de ese dato para todos los usuarios del mismo caso.
- El borrado del usuario elimina la relación; el caso canónico solo se elimina si no quedan relaciones activas.

### Modelo histórico: EoirCaseSnapshot

Propósito:

- Guardar un historial simple de estados recibidos de `EOIR` o de actualizaciones manuales controladas por backend.

Campos a mantener del backend actual:

| Campo | Uso |
|---|---|
| `id` | Identificador interno |
| `eoirCaseId` | Relación al caso canónico |
| `snapshotType` | Tipo de snapshot |
| `statusLabel` | Estado capturado |
| `nextHearingAt` | Próxima audiencia capturada |
| `payload` | Payload técnico del momento |
| `capturedAt` | Fecha de captura |

Decisiones específicas:

- Este modelo es suficiente para el MVP.
- No agregaremos una tabla adicional de eventos o timeline en esta fase.
- La UI podrá derivar comparaciones o un historial básico desde snapshots recientes si después hace falta.
- `snapshotType` debe expresar el origen del snapshot, no el tipo de dato cambiado.

Valores definidos:

| Valor | Significado |
|---|---|
| `INITIAL_SYNC` | Snapshot inicial creado al agregar o vincular el caso |
| `EOIR_SYNC` | Snapshot originado por una sincronización real contra EOIR |
| `MANUAL_UPDATE` | Snapshot creado por una actualización manual controlada por backend |

### Contrato app-facing recomendado

La app no debería consumir directamente los modelos Prisma generados. La salida ideal para frontend debe ser un DTO enfocado en producto.

Estructura recomendada:

| Nivel | Campos |
|---|---|
| `TrackedEoirCase` | `id`, `alias`, `isPrimary`, `notes`, `createdAt`, `updatedAt` |
| `TrackedEoirCase.eoirCase` | `id`, `alienNumber`, `personName`, `courtName`, `judgeName`, `hearingLocation`, `hearingType`, `nextHearingAt`, `statusLabel`, `appealStatusLabel`, `proceedingDecisionLabel`, `lastCheckedAt`, `syncStatus` |
| `TrackedEoirCase.eoirCase.snapshots` | historial reciente opcional para detalle |

### Implicaciones para la app actual

- El tipo genérico `Case` de `Inmigreat-App` hoy está muy orientado a `USCIS`.
- En la implementación no conviene forzar `EOIR` dentro de campos como `receiptNumber`, `serviceCenter` o `formNumber`.
- Para `EOIR` conviene usar un shape dedicado o un mapper discriminado por tipo.

### Criterio de cierre del punto 2

El punto 2 queda considerado diseñado si mantenemos estas decisiones:

- La base del modelo será `EoirCase + UserEoirCase + EoirCaseSnapshot`.
- La metadata del caso real vive en `EoirCase`.
- La metadata privada del usuario vive en `UserEoirCase`.
- El historial de sincronización vive en `EoirCaseSnapshot`.
- `nationalityLabel` queda disponible en la relación usuario-caso y `nationalityCode` + `hasLawyer` viajan dentro del payload validado mientras no exista campo dedicado en backend.
- No se crea timeline específico para `EOIR` en esta fase.

## Checklist maestro

- [x] Definir alcance EOIR inicial
- [x] Diseñar modelo de caso corte
- [x] Implementar validacion EOIR en app
- [x] Persistir snapshot del caso
- [x] Crear relacion usuario-caso
- [x] Exponer API agregar caso
- [x] Diseñar flujo UI add-case
- [x] Implementar selector nacionalidad
- [x] Agregar refresh manual caso
- [x] Crear card y detalle court
- [x] Unificar lista casos usuario
- [ ] Añadir manejo errores y QA

## Detalle por punto

### 1. Definir alcance EOIR inicial

Objetivo:

- Cerrar el alcance del MVP para evitar mezclar `EOIR` con `PACER` o con features de una fase posterior.

Entregables:

- Decisión explícita de que esta primera fase es solo `EOIR`.
- Lista de campos de entrada del usuario.
- Lista de datos mínimos visibles en UI.

Criterio de cierre:

- Producto, app y backend comparten el mismo alcance documentado.

Resolución:

- Este punto queda cerrado con la sección `Alcance cerrado del punto 1`.
- La fase inicial se limita a `EOIR`.
- Se excluye `PACER` y cualquier caso de corte federal.
- Se fija como experiencia mínima `alta + lista + detalle + refresh manual`.

### 2. Diseñar modelo de caso corte

Objetivo:

- Definir las entidades necesarias en backend y sus campos mínimos.

Entregables:

- Modelo `CourtCase` o equivalente.
- Modelo de relación `UserCourtCase` o equivalente.
- Decisión sobre campos normalizados vs snapshot crudo.

Criterio de cierre:

- Existe contrato estable para persistir y leer casos de corte.

Resolución:

- Este punto queda cerrado con la sección `Modelo cerrado del punto 2`.
- Se reutilizan los modelos existentes `EoirCase`, `UserEoirCase` y `EoirCaseSnapshot`.
- Se define qué campos pertenecen al caso canónico, cuáles a la relación usuario-caso y cuáles al historial.
- Se fija que `nationalityLabel` puede persistirse en la relación usuario-caso y que `nationalityCode` + `hasLawyer` quedan conservados dentro del payload validado mientras se define un campo dedicado.

### 3. Implementar validacion EOIR en app

Objetivo:

- Implementar en la app la consulta a `EOIR` y la validación del caso usando `hCaptcha`.

Entregables:

- Integración de `hCaptcha` en el flujo EOIR de la app.
- Servicio en app que consulte `EOIR` con `Alien Number`, `nationalityCode` y `Captcha-Token`.
- Payload validado listo para enviarse al backend.
- Normalización de `Alien Number` y `nationalityCode`.
- Contrato explícito entre app y backend para persistir el resultado validado.

Nota operativa del 2026-04-01:

- Antes de cerrar este punto en backend, se prototipa primero en la app el flujo visual de captura `EOIR` para fijar explícitamente el contrato de entrada: `alienNumber`, `alias`, `nationalityCode` y `hasLawyer`.
- La app ahora también puede adjuntar `nationalityLabel` cuando el selector oficial resuelve una etiqueta visible; backend debe tratarlo como dato auxiliar opcional, no como fuente de verdad.
- A nivel de arquitectura, este punto ocurre del lado app: la consulta a `EOIR` y el uso de `hCaptcha` suceden antes de llamar al backend.

Avance actual:

- La app ya monta `hCaptcha` en el flujo EOIR y obtiene un token antes de consultar `EOIR`.
- La app ya consulta `EOIR` directamente con `Alien Number`, `nationalityCode` y `Captcha-Token`.
- Si la validación responde correctamente, la app envía ese resultado al backend con `addEoirCaseTracking` para crear el caso, el snapshot inicial y la relación usuario-caso.
- La pantalla de casos muestra una confirmación local del tracking persistido mientras el card/detalle EOIR final siguen pendientes.
- Con esto el punto queda cerrado para el alta inicial app -> backend.
- En la alineación visual con la app vieja, el detalle EOIR ya separa `address` y `phone` en los bloques de contacto cuando el payload legacy viene combinado en `ContactAddress` o `CaseContactInfo`.

Contrato visual actual de entrada en app:

- `alienNumber`: obligatorio, normalizado a solo dígitos, con expectativa de `8` o `9` dígitos.
- `alias`: opcional, solo para experiencia del usuario.
- `nationalityCode`: obligatorio para el flujo EOIR.
- `nationalityLabel`: opcional, derivado del selector visual cuando el catálogo oficial carga correctamente.
- `hasLawyer`: booleano explícito en la UI.
- `captchaToken`: efímero, obtenido en la app justo antes del alta; no forma parte del caso persistido.

Criterio de cierre:

- La app puede validar un caso en `EOIR` y enviar al backend una respuesta consistente para persistencia.

## Avance visual implementado en app

Este bloque resume lo que ya quedó implementado del lado visual para trabajar el backend sobre un contrato concreto.

- El flujo de alta ahora diferencia `USCIS` y `EOIR` dentro del mismo `AddCaseSheet`.
- La ruta `EOIR` del sheet captura `alienNumber`, `alias`, `nationalityCode` y `hasLawyer`.
- Cuando la nacionalidad se elige desde catálogo, la app conserva también `nationalityLabel`.
- La lista oficial de nacionalidades EOIR se obtiene desde `https://acis.eoir.justice.gov/page-data/sq/d/1791802679.json`.
- Esa lista se cachea localmente en la app por `7` días para mejorar UX y reducir consultas innecesarias.
- El selector de nacionalidad es searchable por nombre o código.
- Si el catálogo no carga, la app usa caché o catálogo embebido para no bloquear la selección.
- La pantalla de casos ya resuelve `hCaptcha`, valida contra `EOIR` y persiste el alta inicial en backend.
- La app conserva una confirmación local del caso recién guardado mientras la card/lista/detalle EOIR definitivos siguen como trabajo pendiente.

### 4. Persistir snapshot del caso

Objetivo:

- Guardar el resultado externo para trazabilidad y futuras mejoras.

Entregables:

- Campo `rawResponse` o estructura equivalente.
- Registro de `lastCheckedAt`.
- Registro de estado y error de sincronización.

Criterio de cierre:

- Cada validación/refresco deja evidencia persistida del estado recibido.

### 5. Crear relacion usuario-caso

Objetivo:

- Permitir que varios usuarios puedan reutilizar el mismo caso externo sin duplicarlo y mantener alias por usuario.

Entregables:

- Relación `usuario <-> caso`.
- Soporte para alias.
- Soporte para eliminación de la relación sin borrar necesariamente el caso base.

Criterio de cierre:

- El usuario puede tener su propio alias sobre un caso de corte existente.

### 6. Exponer API agregar caso

Objetivo:

- Crear el punto de entrada consumido por la app.

Entregables:

- Endpoint o mutación `addCourtCase`.
- Dedupe por `Alien Number`.
- Respuesta normalizada para la app.

Criterio de cierre:

- La app puede agregar un caso `EOIR` sin conocer detalles internos de la integración externa.

### 7. Diseñar flujo UI add-case

Objetivo:

- Definir cómo entra el usuario al flujo `EOIR` en la app actual.

Entregables:

- Decisión de UX para separar `USCIS` y `EOIR`.
- Pantalla, modal o sheet para alta de caso de corte.
- Copy claro para `Alien Number` y nacionalidad.

Criterio de cierre:

- El usuario entiende sin ambigüedad qué tipo de caso está agregando.

Resolución:

- El alta de casos ahora se abre en un `sheet` único con selector explícito entre `USCIS` y `EOIR`.
- La opción `EOIR` tiene copy específico para `Alien Number`, nacionalidad y contexto legal.
- La UI valida de forma básica el `Alien Number` antes de guardar el borrador visual.
- Este punto queda cerrado a nivel de UX y definición de entrada visual.

### 8. Implementar selector nacionalidad

Objetivo:

- Dar una forma estable de seleccionar la nacionalidad requerida para validar el caso.

Entregables:

- Fuente de datos de nacionalidades.
- Selector searchable.
- Persistencia del `nationalityCode`.

Criterio de cierre:

- El usuario puede buscar y seleccionar la nacionalidad requerida sin errores.

Resolución:

- Se implementó una fuente de datos dedicada para nacionalidades EOIR usando el catálogo público actualmente accesible.
- La app cachea el catálogo por `7` días para evitar recargas innecesarias en cada apertura del sheet.
- Si la consulta en vivo falla o vence por tiempo, la app usa caché previa y, como último respaldo, un catálogo embebido para no romper el selector.
- El selector muestra el `Name` visible para el usuario y conserva internamente el `Code` de EOIR.
- La selección guarda `nationalityCode` y, cuando está disponible, también `nationalityLabel`.
- En la UI se muestran solo nacionalidades activas del catálogo (`IsActive = true`).
- Este punto queda cerrado del lado visual de la app.

### 9. Agregar refresh manual caso

Objetivo:

- Permitir que el usuario vuelva a consultar el caso bajo demanda.

Entregables:

- Acción `Actualizar`.
- Llamada backend de refresh.
- Actualización de `lastCheckedAt` y estado.

Criterio de cierre:

- El refresh manual trae datos nuevos y actualiza correctamente el caso visible.

Resolución:

- `CaseDetailScreen` ya expone la acción `Actualizar EOIR` para casos de corte.
- La app reutiliza el mismo flujo cliente `captcha -> consulta EOIR -> persistencia backend` para el refresh manual.
- El detalle actualiza el caso visible al completar `updateEoirCaseTracking` y muestra errores inline si la consulta o la persistencia fallan.
- La validación manual en dispositivo queda consolidada en el punto `12`, pero la implementación funcional del refresh queda cerrada.

### 10. Crear card y detalle court

Objetivo:

- Mostrar el caso de corte dentro de la experiencia actual de casos.

Entregables:

- Card de lista.
- Pantalla detalle.
- Secciones mínimas: audiencia, decisión/proceeding, `BIA`.

Criterio de cierre:

- El usuario puede listar y entender el estado actual de su caso de corte.

Resolución:

- `CaseCard` ahora renderiza campos específicos de `EOIR`, incluyendo `Alien Number`, corte y próxima audiencia, sin reutilizar el bloque visual de progreso de `USCIS`.
- `CaseDetailScreen` ya tiene una rama dedicada para `EOIR` con acciones de actualizar y eliminar.
- El detalle muestra bloques mínimos de `Seguimiento`, `Próxima audiencia`, `Proceeding` y `Apelación BIA`, usando el snapshot persistido en backend.

### 11. Unificar lista casos usuario

Objetivo:

- Integrar casos `EOIR` sin romper la experiencia actual de `USCIS`.

Entregables:

- Carga combinada de casos del usuario.
- Navegación correcta a detalle según tipo de caso.
- Refresco consistente tras alta o borrado.

Criterio de cierre:

- La lista de casos del usuario refleja `USCIS` y `EOIR` de forma coherente.

Resolución:

- `casesService.getCases()` ahora consulta y combina `uscisTrackedCases` + `eoirTrackedCases` en una sola colección ordenada por recencia.
- La navegación a detalle ya es source-aware y conserva el tipo de caso para abrir la pantalla correcta.
- Después de alta, refresh o borrado, la lista mantiene el estado combinado y se recarga sin depender de lógica separada para `EOIR`.

### 12. Añadir manejo errores y QA

Objetivo:

- Cubrir errores previsibles y validar el flujo con casos reales o controlados.

Entregables:

- Mensajes de error claros.
- Casos de prueba manual.
- Verificación de estados borde.

Criterio de cierre:

- El flujo no falla de forma silenciosa y los errores son accionables.

Avance actual:

- La app ya muestra errores accionables en captcha, validación EOIR, persistencia backend, refresh manual y borrado del tracking.
- Falta la comprobación manual final del flujo completo en dev client para cerrar este punto con evidencia de runtime.

## Riesgos y notas

- `EOIR` no ofrece una API pública estable y documentada como `PACER`.
- La integración vieja dependía de un endpoint accesible y de `hCaptcha`; eso puede cambiar.
- Mientras `EOIR` siga exigiendo captcha, el alta y el refresh manual dependerán de lógica cliente para obtener el token y consultar la fuente.
- Si la fuente externa cambia payload o protección, habrá que ajustar tanto la app como la persistencia backend.
- El diseño nuevo debe evitar mostrar demasiados campos crudos o poco útiles.

## Criterios de exito del MVP

- Un usuario puede agregar un caso `EOIR` válido desde la app.
- El caso queda asociado al usuario y aparece en su lista.
- El usuario puede abrir el detalle y ver información útil.
- El usuario puede refrescar manualmente el caso.
- Los errores de validación o sincronización son visibles y entendibles.

## Referencias

Archivos clave revisados en la app vieja:

- `/Users/changa/Documents/NOTIR/GITHUB/App-Inmigreat/app/add-case.tsx`
- `/Users/changa/Documents/NOTIR/GITHUB/App-Inmigreat/components/dashboard/court-case-status.tsx`
- `/Users/changa/Documents/NOTIR/GITHUB/App-Inmigreat/components/dashboard/court-case-details.tsx`
- `/Users/changa/Documents/NOTIR/GITHUB/App-Inmigreat/app/(tabs)/index.tsx`
- `/Users/changa/Documents/NOTIR/GITHUB/App-Inmigreat/src/amplify/preload-cases.ts`
