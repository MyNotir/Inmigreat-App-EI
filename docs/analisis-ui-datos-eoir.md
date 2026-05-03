# Analisis UI y Datos EOIR

Documento de trabajo para alinear la experiencia de casos de corte en `Inmigreat-App` con la app vieja `App-Inmigreat`, sin arrastrar el payload crudo completo a la UI.

## Objetivo

- Entender como la app vieja transformaba el response de `EOIR` en una experiencia legible.
- Identificar que datos relevantes ya existen en el payload persistido pero todavia no se muestran en la app nueva.
- Definir una transformacion recomendada desde `rawResponse` hacia un modelo UI estable.

## Fuentes revisadas

App vieja:

- `App-Inmigreat/components/dashboard/court-case-status.tsx`
- `App-Inmigreat/app/(tabs)/index.tsx`
- `App-Inmigreat/src/graphql/queries.js`

App nueva:

- `Inmigreat-App/src/types/case.ts`
- `Inmigreat-App/src/services/cases.ts`
- `Inmigreat-App/src/screens/CaseDetailScreen.tsx`
- `Inmigreat-App/src/components/cases/CaseCard.tsx`

Referencias externas revisadas:

- `https://www.justice.gov/eoir/eoir-case-information`
- `https://www.justice.gov/eoir/check-case-status`
- `https://acis.eoir.justice.gov/en/`
- resultados públicos indexados sobre `EOIR` y plazos de briefs ante `BIA`

## 1. Como se veia la app vieja

La app vieja no intentaba mostrar todos los campos del response de `EOIR`. En su lugar hacia dos cosas importantes:

- construia una `status card` compacta para dashboard
- abria un modal de detalle dividido por bloques funcionales

### 1.1 Card resumida en dashboard

La card de `court-case-status.tsx` seguia esta estructura:

1. Header con:
   - titulo principal: normalmente `dataAlienName`
   - subtitulo contextual: juez, estado general o texto de espera
   - acciones compactas: refresh, editar nacionalidad, eliminar
2. Bloque principal dinamico:
   - si habia audiencia futura, mostraba fecha y hora
   - si no habia audiencia, mostraba una frase interpretada del estado del caso
3. Bloque secundario:
   - direccion del tribunal si habia audiencia
   - fecha de decision si el caso estaba completado
   - ultima actualizacion en los demas casos
4. Boton expandir:
   - abria un modal con detalle mas rico

### 1.2 Regla visual principal

La vieja UI imponia una prioridad clara sobre el payload:

1. `hasHearing`
2. `hasAppeal`
3. `hasComplete`
4. fallback pendiente

En terminos de producto, el mensaje dominante del caso no era "todo el payload", sino esta pregunta:

- `¿tiene una audiencia proxima?`
- si no, `¿esta en apelacion?`
- si no, `¿ya hubo decision final?`
- si no, `¿sigue pendiente?`

Esa jerarquia hacia que la card fuera legible incluso con un response muy ruidoso.

### 1.3 Modal de detalle

El modal expandido en la vieja app se dividia en tres secciones:

1. `Next hearing information`
2. `Court decision and motion information`
3. `BIA case information`

Cada bloque hacia fallback explicito cuando no habia datos.

## 2. Que datos mostraba realmente la app vieja

La app vieja persistia un payload amplio, pero solo promovia a UI estos grupos.

### 2.1 Audiencia

Campos usados visualmente:

- `scheduleAdjDate`
- `scheduleAdjTime`
- `scheduleIJ_Name`
- `scheduleHearingLocationAddress`
- `scheduleContactAddress`
- `proceedingHearingLocationAddress`
- `proceedingContactAddress`

Transformacion vieja:

- `scheduleAdjDate` determinaba si habia audiencia futura
- la direccion se resolvia con fallback entre schedule y proceeding
- el juez se resolvia con fallback entre schedule y proceeding
- cuando `ContactAddress` o `CaseContactInfo` traian telefono embebido, conviene separarlo en `address + phone` para no mezclar ambos en una sola fila de UI

### 2.2 Decision o estado del proceeding

Campos usados visualmente:

- `proceedingDecisionCode`
- `proceedingCompDate`

Transformacion vieja:

- el codigo se convertia a una frase legible, no se mostraba el raw code
- `T` se interpretaba como terminacion del procedimiento
- `U` y `X` se agrupaban como descarte o dismissal
- `R` se trataba como grant de solicitud
- cualquier otro valor se reducia a una frase generica de decision administrativa

### 2.3 Apelacion BIA

Campos usados visualmente:

- `appealFiledDate`
- `appealAlienBriefFiled`
- `appealDHSBriefDue`
- `appealBIADecision`
- `appealBIADecisionDate`
- `dataAppealFiled`
- `dataCaseAppealExists`

Transformacion vieja:

- `appealFiledDate` servia como fecha principal del bloque BIA
- `appealAlienBriefFiled` se mostraba como estado del brief del no ciudadano
- `appealDHSBriefDue` se mostraba como estado del brief de DHS
- `appealBIADecision` se interpretaba a texto si coincidía con ciertos codigos conocidos

### 2.4 Metadatos generales

Campos usados visualmente:

- `alienNumber`
- `dataAlienName`
- `updatedAt`
- `courtNationality`
- `courtNationalityCode`

La nacionalidad era editable porque formaba parte del contexto necesario para volver a consultar `EOIR`.

## 3. Shape completo del payload viejo

El modelo viejo `CourtCaseNew` conservaba muchos mas datos que los mostrados en la UI.

### 3.1 Identidad y caso base

- `alienNumber`
- `dataAlienName`
- `dataCaseID`
- `dataValidAlienNumber`
- `courtNationality`
- `courtNationalityCode`
- `courtLawyer`

### 3.2 Resumen general `Data`

- `dataAppealDecisionString`
- `dataAppealFiled`
- `dataCaseAppealExists`
- `dataCaseContactInfo`
- `dataCaseDecisionString`
- `dataClockStatus`
- `dataDocketDate`
- `dataElapsedDays`
- `dataLatestCalType`
- `dataLatestHearingDate`
- `dataLatestHearingTime`
- `dataMTRDecisionString`
- `dataMTR_BIA_Appeal`
- `dataMTR_BIA_Type`
- `dataOSC_Date`
- `dataPendingAtBIA`
- `dataReopenDecisionString`
- `dataReopenExists`

### 3.3 Appeal

- `appealAlienBriefDue`
- `appealAlienBriefFiled`
- `appealAppealType`
- `appealBIADecision`
- `appealBIADecisionDate`
- `appealDHSBriefDue`
- `appealDHSBriefFiled`
- `appealFiledDate`

### 3.4 Proceeding

- `proceedingBaseCityCode`
- `proceedingBatteredSpouse`
- `proceedingCaseType`
- `proceedingCompDate`
- `proceedingContactAddress`
- `proceedingDateAppealDue`
- `proceedingDecisionCode`
- `proceedingGeneration`
- `proceedingHearingLocationAddress`
- `proceedingHearingLocationCode`
- `proceedingIJCode`
- `proceedingIJName`
- `proceedingOtherComp`
- `proceedingOtherReceived1`
- `proceedingOtherReceived2`
- `proceedingReleaseInfo`
- `proceedingSubgeneration`

### 3.5 Schedule

- `scheduleAdjDate`
- `scheduleAdjTime`
- `scheduleCalType`
- `scheduleContactAddress`
- `scheduleHearingLocationAddress`
- `scheduleHearingLocationCode`
- `scheduleHearingMedium`
- `scheduleIJ_Code`
- `scheduleIJ_Name`
- `scheduleProceedingID`
- `scheduleScheduleType`

### 3.6 MTR y Reopen

- `mtrMTRAppealFiledDate`
- `mtrMTRDecision`
- `mtrMTRDecisionDate`
- `reopenCompDate`
- `reopenDecision`
- `reopenMotionReceivedDate`

## 4. Hallazgos externos sobre el significado de los datos

### 4.1 Lo que ACIS promete oficialmente

Segun `EOIR Case Information` y `Check Case Status`:

- `ACIS` solo muestra informacion basica del caso
- no necesariamente muestra todo el universo del expediente
- la informacion es para conveniencia, no sustituye notificaciones oficiales
- muestra solo el caso primario y, si hubo mas de uno, el mas reciente para ese `A-Number`
- una nueva audiencia no aparece hasta que la corte fija efectivamente esa fecha

Implicacion de producto:

- la app no debe presentar el estado EOIR como definitivo en terminos legales
- siempre conviene mostrar que la fuente oficial siguen siendo los notices del tribunal o la `BIA`

### 4.2 Significado practico de los campos de appeal

Los resultados oficiales indexados sobre `BIA briefing deadlines` dejan claro que:

- existen hitos separados para el brief del no ciudadano y para el brief de `DHS`
- esos hitos pueden tener fecha limite y fecha de presentacion
- la apelacion no es solo `si/no`; tiene una linea de tiempo propia

Implicacion de producto:

- `appealAlienBriefDue`
- `appealAlienBriefFiled`
- `appealDHSBriefDue`
- `appealDHSBriefFiled`

no deberian quedarse ocultos en `rawData`; son datos relevantes para una persona que tiene su caso en apelacion.

### 4.3 Significado practico de `MTR` y `Reopen`

Por naming juridico y convencion de EOIR:

- `MTR` apunta a `Motion to Reopen` o `Motion to Reconsider`, segun el contexto del sistema
- `reopen*` representa directamente el estado de una mocion de reapertura
- los campos de decision y fechas asociados son hitos procesales, no solo auditoria tecnica

Implicacion de producto:

- si el caso tiene `MTR` o `reopen`, eso debe elevarse a un bloque propio o al menos a una subseccion dentro de `Proceeding`

### 4.4 Significado practico de `clock status`

Aunque `ACIS` no lo explica en detalle en la portada, el nombre del campo y su uso en contexto de asilo apuntan al `asylum/EAD clock`, es decir, la señal operativa relacionada con el conteo que puede impactar elegibilidad para autorizacion de empleo.

Implicacion de producto:

- `dataClockStatus` no deberia ser solo dato tecnico
- para ciertos usuarios puede ser mas importante que el texto generico de estado
- hace falta copy muy cuidadoso para no prometer interpretacion legal automatica

## 5. Gap actual en la app nueva

Hoy la app nueva ya persiste `rawData`, pero su parser solo consume:

- `normalizedResult`
- `appInput`

Eso significa que los datos ricos de:

- `rawResponse.Data`
- `rawResponse.Appeal`
- `rawResponse.Proceeding`
- `rawResponse.Schedule`
- `rawResponse.MTR`
- `rawResponse.Reopen`

practicamente no estan transformados a modelo UI.

Consecuencia:

- la app nueva ya puede mostrar audiencia, proceeding y BIA en forma minima
- pero todavia no iguala la lectura operativa de la app vieja
- el payload importante existe, pero esta subutilizado

## 6. Datos que si son importantes para subir a UI

### 6.1 Prioridad alta

- `scheduleAdjDate`
- `scheduleAdjTime`
- `scheduleHearingMedium`
- `scheduleScheduleType`
- `scheduleIJ_Name`
- `scheduleHearingLocationAddress`
- `proceedingDecisionCode`
- `proceedingCompDate`
- `proceedingDateAppealDue`
- `appealFiledDate`
- `appealAppealType`
- `appealBIADecision`
- `appealBIADecisionDate`
- `appealAlienBriefDue`
- `appealAlienBriefFiled`
- `appealDHSBriefDue`
- `appealDHSBriefFiled`
- `dataPendingAtBIA`

### 6.2 Prioridad media

- `dataClockStatus`
- `dataElapsedDays`
- `dataDocketDate`
- `dataLatestCalType`
- `mtrMTRDecision`
- `mtrMTRDecisionDate`
- `mtrMTRAppealFiledDate`
- `reopenDecision`
- `reopenCompDate`
- `reopenMotionReceivedDate`

### 6.3 Mantener en raw por ahora

- `proceedingGeneration`
- `proceedingSubgeneration`
- `proceedingOtherComp`
- `proceedingOtherReceived1`
- `proceedingOtherReceived2`
- `proceedingBaseCityCode`
- `proceedingIJCode`
- `scheduleIJ_Code`
- `scheduleProceedingID`

Estos campos pueden servir para debug, soporte o enriquecimiento futuro, pero no tienen valor claro de primera linea para producto si no existe un catalogo que los traduzca.

## 7. Transformacion recomendada para la app nueva

La app nueva deberia derivar un shape intermedio desde `rawData.rawResponse`.

### 7.1 Nuevos grupos dentro de `EoirCaseInfo`

#### Hearing

- `nextHearingDate`
- `nextHearingTime`
- `hearingType`
- `hearingMedium`
- `judgeName`
- `hearingLocation`
- `contactAddress`

#### Proceeding

- `proceedingDecisionCode`
- `proceedingDecisionLabel`
- `proceedingCompletedAt`
- `appealDueAt`
- `caseDecisionSummary`

#### Appeal BIA

- `appealFiledAt`
- `appealType`
- `appealDecisionCode`
- `appealDecisionLabel`
- `appealDecisionAt`
- `alienBriefDueAt`
- `alienBriefFiledAt`
- `dhsBriefDueAt`
- `dhsBriefFiledAt`
- `pendingAtBia`

#### Motions

- `mtrDecisionLabel`
- `mtrDecisionAt`
- `mtrAppealFiledAt`
- `reopenExists`
- `reopenDecisionLabel`
- `reopenDecisionAt`
- `reopenMotionReceivedAt`

#### Operational

- `clockStatus`
- `docketDate`
- `elapsedDays`
- `latestCalendarType`

## 8. Estructura visual recomendada para esta app

### 8.1 Lista

La card de lista deberia seguir una logica parecida a la vieja, pero adaptada al lenguaje visual nuevo:

1. Encabezado:
   - `personName`
   - `A-Number`
   - badge de sync
2. Bloque dominante:
   - audiencia proxima si existe
   - si no, decision o apelacion dominante
3. Sublinea:
   - juez y corte
   - o ultima revision si no hay audiencia

La lista no necesita mostrar `MTR`, `reopen` o briefs completos; basta con reflejar el estado dominante.

### 8.2 Detalle

El detalle deberia crecer a cinco bloques:

1. `Seguimiento`
2. `Proxima audiencia`
3. `Proceeding`
4. `Apelacion BIA`
5. `Motions y señales operativas`

Ese quinto bloque es el que hoy falta para alcanzar la profundidad de la app vieja y aprovechar mejor el payload.

## 9. Recomendacion de implementacion

### Paso 1

Expandir `parseEoirRawPayload()` en `src/services/cases.ts` para leer tambien `rawResponse`.

### Paso 2

Extender `EoirCaseInfo` en `src/types/case.ts` con grupos de hearing, proceeding, appeal y motions.

### Paso 3

Agregar tablas de traduccion para:

- codigos de decision del proceeding
- codigos de decision de `BIA`
- tipos de audiencia o calendar type cuando aplique

### Paso 4

Actualizar `CaseDetailScreen` para mostrar:

- deadlines de briefs
- pending at BIA
- motion to reopen o reconsider
- clock status y docket date cuando existan

### Paso 5

Mantener una advertencia discreta:

- `La informacion viene de EOIR/ACIS y puede no reflejar avisos emitidos recientemente. Los documentos oficiales del tribunal siguen siendo la fuente principal.`

## 10. Conclusion

La app vieja no era mejor porque mostrara mas campos; era mejor porque interpretaba el payload crudo en pocas preguntas utiles:

- `cuando es la proxima audiencia`
- `quien lleva el caso`
- `si ya hubo una decision`
- `si la apelacion esta viva y en que etapa`

La app nueva ya tiene la persistencia correcta. El siguiente salto de calidad no es pedir mas datos al backend, sino transformar mejor `rawData.rawResponse` y promover a UI los grupos que la vieja app ya habia identificado como utiles.